import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import KNOWLEDGE_COLLECTIONS
from app.database import AsyncSessionLocal
from app.models.report import Report, ReportSection, ReportSubsection
from app.services.llm_service import llm_service
from app.services.rai_schema import rai_summary
from app.services.report_docs_service import document_excerpts, has_documents, index_report_documents
from app.services.vector_service import vector_service

logger = logging.getLogger(__name__)

# Temperatura baixa reduz a tendência do modelo a "enriquecer" a narrativa com fatos plausíveis.
GENERATION_TEMPERATURE = 0.2

_SYSTEM_PROMPT = """Você é SAPAER-AI, assistente especializado em redação de relatórios de investigação aeronáutica do sistema SIPAER/CENIPA.

Seu papel é preencher seções específicas de relatórios (RF, SUMA, RAI, Minuta) com base nos dados da ocorrência fornecidos e em trechos de relatórios similares como referência.

## REGRA ZERO — NÃO INVENTAR FATOS

Este é um documento oficial de investigação. Todo fato escrito precisa estar
nas FONTES DO CASO (abaixo). Em especial, é PROIBIDO:
- completar a sequência de eventos com etapas plausíveis que não foram
  relatadas (ex.: "completou o padrão de aplicação", "iniciou o retorno");
- afirmar AUSÊNCIA de algo sem que a fonte diga isso explicitamente
  ("não foram identificados indícios de fadiga", "não havia obstáculos",
  "não houve outros danos", "o piloto estava apto") — ausência de informação
  não é informação de ausência;
- estimar valores (horas, distâncias, altitudes, velocidades, pesos,
  condições meteorológicas) ou deduzi-los de casos parecidos;
- atribuir causas, intenções, estados físicos ou emocionais não registrados.

Quando faltar o dado, escreva o que é conhecido e marque a lacuna com
<strong>[A verificar: o que falta]</strong>. Uma seção curta e correta é
melhor que uma seção completa com suposições.

## REGRAS DE GERAÇÃO

- Escreva exclusivamente o conteúdo da seção solicitada, sem repetir o
  título
- Use linguagem técnica impessoal e objetiva, conforme padrão COMAER/SIPAER
- Não especule sobre responsabilização; foque em fatos e análise técnica
- Em RF, SUMA e Minuta NÃO identifique pessoas pelo nome (use "o piloto",
  "o mecânico", "a testemunha"), conforme o Anexo 13 da OACI. Nomes só
  aparecem no RAI, nos campos de pessoal envolvido
- Cite normas aplicáveis quando pertinente (NSCA 3-6, MCA 3-3, RBAC,
  Anexo 13 OACI), apenas quando diretamente relacionadas ao conteúdo da
  seção
- Ajuste profundidade e formalidade conforme o tipo de documento: RF exige
  desenvolvimento técnico completo; SUMA é sintético (parágrafo-resumo);
  RAI e Minuta seguem o nível de detalhe indicado no pedido

## HIERARQUIA DE FONTES (regra crítica)

- FONTES DO CASO (as únicas fontes de fatos desta ocorrência):
  1. DADOS DA OCORRÊNCIA — revisados pelo investigador; prevalecem em caso
     de divergência;
  2. TRECHOS DOS DOCUMENTOS DA INVESTIGAÇÃO, quando fornecidos (notificações,
     depoimentos, cadernetas, laudos). Ao usar um fato de depoimento, deixe
     claro que é relato ("segundo o mecânico…"). Se divergirem dos DADOS DA
     OCORRÊNCIA, use os DADOS e sinalize [A verificar: divergência …].
- Os RELATÓRIOS SIMILARES servem apenas para dois fins:
  (a) referência de estrutura, terminologia e profundidade técnica esperada
      na seção;
  (b) precedentes de fatores contribuintes e recomendações de segurança já
      emitidas em casos análogos, para consistência do sistema.
- NUNCA transfira um fato específico (data, matrícula, nome, coordenada,
  número de horas, condição meteorológica etc.) de um relatório similar
  para o relatório sendo gerado. Se um dado não está nas FONTES DO CASO,
  ele é desconhecido para este caso, mesmo que apareça em um caso parecido.
- Não copie frases ou trechos literais dos relatórios similares. Use-os
  para calibrar tom e estrutura; a redação deve ser original para o caso
  atual.

## SEÇÃO: RECOMENDAÇÕES DE SEGURANÇA (quando aplicável)

- Antes de propor uma nova recomendação, verifique se algum dos relatórios
  similares já contém RECOMENDAÇÕES DE SEGURANÇA para o mesmo fator contribuinte
- Se houver precedente, referencie-o e mantenha coerência com a
  recomendação já emitida, em vez de propor uma redação divergente para o
  mesmo problema

## QUANDO OS DADOS NÃO SUSTENTAM A SEÇÃO

Se os dados da ocorrência fornecidos forem insuficientes para redigir a
seção com o nível de detalhe exigido pelo tipo de documento, gere o texto
possível com o que há disponível e sinalize explicitamente, entre
colchetes, os pontos que exigem complementação pelo investigador — nunca
preencha a lacuna com inferência.

## FORMATO DE SAÍDA

Formate a resposta em HTML simples usando apenas:
- <p> para parágrafos
- <strong> para termos importantes ou campos em destaque
- <ul> e <li> para listas
- <br> para quebras de linha dentro de parágrafos

NÃO use: cabeçalhos (h1/h2/h3/h4), tabelas, divs, spans ou outros elementos HTML.
NÃO inclua o título da seção na resposta — apenas o conteúdo."""


def build_occurrence_summary(occurrence: dict) -> str:
    """Format occurrence dict as a structured text for embedding and prompts."""
    lines = ["DADOS DA OCORRÊNCIA:"]

    if v := occurrence.get("sumaNumber"):
        lines.append(f"- Número SUMA: {v}")
    if v := occurrence.get("date"):
        lines.append(f"- Data: {v}")
    if v := occurrence.get("time"):
        lines.append(f"- Hora: {v} UTC")
    if v := occurrence.get("classification"):
        lines.append(f"- Classificação: {v}")
    if v := occurrence.get("occurrenceType"):
        lines.append(f"- Tipo de Ocorrência: {v}")
    if v := occurrence.get("municipality"):
        uf = occurrence.get("uf", "")
        lines.append(f"- Município/UF: {v}/{uf}" if uf else f"- Município: {v}")
    if v := occurrence.get("aerodrome"):
        lines.append(f"- Aeródromo: {v}")
    if coords := occurrence.get("coordinates"):
        lat = coords.get("lat", "")
        lon = coords.get("lon", "")
        if lat or lon:
            lines.append(f"- Coordenadas: {lat} / {lon}")
    if v := occurrence.get("investigationUnit"):
        lines.append(f"- Unidade de Investigação: {v}")
    if v := occurrence.get("investigator"):
        lines.append(f"- Investigador: {v}")
    if v := occurrence.get("flightPhase"):
        lines.append(f"- Fase do Voo: {v}")

    weather = occurrence.get("weather") or {}
    weather_parts = [p for p in [weather.get("condition"), weather.get("description")] if p]
    if weather_parts:
        lines.append(f"- Condição Meteorológica: {' — '.join(weather_parts)}")

    obstacle = occurrence.get("obstacle") or {}
    obstacle_parts = [p for p in [obstacle.get("type"), obstacle.get("description")] if p]
    if obstacle_parts:
        lines.append(f"- Obstáculos: {' — '.join(obstacle_parts)}")

    aircraft = occurrence.get("aircraft", {})
    if aircraft:
        lines.append("")
        lines.append("AERONAVE:")
        if v := aircraft.get("registration"):
            lines.append(f"- Matrícula: {v}")
        if v := aircraft.get("manufacturer"):
            lines.append(f"- Fabricante: {v}")
        if v := aircraft.get("model"):
            lines.append(f"- Modelo: {v}")
        if v := aircraft.get("operator"):
            lines.append(f"- Operador: {v}")
        if v := aircraft.get("operation"):
            lines.append(f"- Tipo de Operação: {v}")
        if v := aircraft.get("damage"):
            lines.append(f"- Danos à Aeronave: {v}")

    persons = occurrence.get("persons", {})
    if persons:
        crew = persons.get("crew", {})
        crew_parts = []
        if crew.get("fatal"): crew_parts.append(f"{crew['fatal']} fatal(is)")
        if crew.get("serious"): crew_parts.append(f"{crew['serious']} grave(s)")
        if crew.get("minor"): crew_parts.append(f"{crew['minor']} leve(s)")
        if crew_parts:
            lines.append(f"- Tripulação ferida: {', '.join(crew_parts)}")

        pax = persons.get("passengers", {})
        pax_parts = []
        if pax.get("fatal"): pax_parts.append(f"{pax['fatal']} fatal(is)")
        if pax.get("serious"): pax_parts.append(f"{pax['serious']} grave(s)")
        if pax.get("minor"): pax_parts.append(f"{pax['minor']} leve(s)")
        if pax_parts:
            lines.append(f"- Passageiros feridos: {', '.join(pax_parts)}")

        third = persons.get("thirdParty", {})
        third_parts = []
        if third.get("fatal"): third_parts.append(f"{third['fatal']} fatal(is)")
        if third.get("serious"): third_parts.append(f"{third['serious']} grave(s)")
        if third.get("minor"): third_parts.append(f"{third['minor']} leve(s)")
        if third_parts:
            lines.append(f"- Terceiros feridos: {', '.join(third_parts)}")

    if occurrence.get("isAgricultural"):
        lines.append("- Operação Aeroagrícola: SIM")

    doc_type = occurrence.get("docType", "")
    scope = occurrence.get("scope", "")
    if doc_type:
        lines.append(f"- Tipo de Documento: {doc_type}")
    if scope:
        lines.append(f"- Escopo: {scope}")

    if v := occurrence.get("narrative"):
        lines.append("")
        lines.append("HISTÓRICO DA OCORRÊNCIA (relato do investigador):")
        lines.append(v)

    if rai := rai_summary(occurrence.get("rai")):
        lines.append("")
        lines.append("DADOS DO REGISTRO DE AÇÃO INICIAL (RAI):")
        lines.append(rai)

    return "\n".join(lines)


def _get_instruction(section_title: str, sub_title: str) -> str:
    """Return a tailored generation instruction based on subsection title."""
    c = (section_title + " " + sub_title).lower()

    if "sinopse" in c or "descrição da ocorrência" in c:
        return (
            "Escreva uma sinopse factual e objetiva de 3 a 5 frases descrevendo a ocorrência. "
            "Inclua: data, local, tipo de aeronave, tipo de operação e resultado imediato. "
            "Use linguagem impessoal e tempo verbal no passado."
        )
    if "classificação" in c and "seção" not in c:
        return (
            "Indique a classificação SIPAER da ocorrência — ACIDENTE, INCIDENTE GRAVE ou INCIDENTE — "
            "e justifique em 2 a 3 frases com base nos dados fornecidos e nas definições da NSCA 3-6."
        )
    if any(k in c for k in ["identificação", "dados gerais", "aeronave envolvida"]):
        return (
            "Preencha os dados de identificação da aeronave usando as informações fornecidas. "
            "Formato: <p><strong>Campo:</strong> valor</p> para cada dado. "
            "Para campos não informados, use '[A verificar]'."
        )
    if any(k in c for k in ["sistema de aplicação", "produto", "dosagem"]):
        return (
            "Descreva o sistema de aplicação aeroagrícola, produtos e dosagens SOMENTE se "
            "constarem das fontes do caso. Para cada item não informado, indique '[A verificar]'."
        )
    if any(k in c for k in ["habilitação agr", "hab agr"]):
        return (
            "Descreva a habilitação do piloto para operações aeroagrícolas conforme as fontes do caso. "
            "Liste os requisitos do RBAC 61 e RBAC 137 e, para cada um, indique se as fontes "
            "comprovam o atendimento ou '[A verificar]'. Não presuma que um requisito foi cumprido."
        )
    if any(k in c for k in ["piloto", "tripulação", "piloto em comando"]):
        return (
            "Apresente os dados do piloto em comando: licença, habilitações, horas totais de voo, "
            "horas no tipo/modelo e validade do CMA, usando apenas as fontes do caso. "
            "Para dados não informados, use '[A verificar]'. Não escreva avaliações sobre "
            "aptidão, fadiga, estresse ou estado físico/psicológico, a menos que as fontes as registrem."
        )
    if any(k in c for k in ["meteorológic", "condições atmosféricas", "condições do tempo"]):
        return (
            "Descreva as condições meteorológicas na área e horário da ocorrência, com base "
            "exclusivamente nas fontes do caso (condição, descrição, METAR/TAF, depoimentos). "
            "Indique: visibilidade, teto, vento, temperatura e fenômenos significativos. "
            "Nunca estime valores; para cada item sem dado, indique '[A verificar]'."
        )
    if "fase do voo" in c or ("fase" in c and "voo" in c):
        return (
            "Indique a fase do voo em que ocorreu o evento, conforme as fontes do caso, e o que "
            "elas relatam sobre a aeronave nessa fase. Não acrescente manobras, altitudes ou "
            "procedimentos que não estejam nas fontes."
        )
    if "obstác" in c or "obstacul" in c:
        return (
            "Descreva o(s) obstáculo(s) envolvido(s) ou presentes na área da ocorrência, com "
            "base no tipo e na descrição informados nos dados da ocorrência. "
            "Indique a relação do obstáculo com a sequência de eventos, quando as fontes a descreverem. "
            "Só declare que não havia obstáculos se as fontes disserem isso; se não houver "
            "informação, escreva '[A verificar: obstáculos na área]'."
        )
    if "descrição detalhada" in c or ("narrativa" in c and "sequência" not in c):
        return (
            "Redija a narrativa da ocorrência em linguagem técnica impessoal, verbos no passado, "
            "com os eventos NA ORDEM e NA MEDIDA em que as fontes os relatam. Não preencha lacunas "
            "da sequência com etapas plausíveis: onde houver salto, registre "
            "'[A verificar: o que ocorreu entre X e Y]'."
        )
    if "sequência de eventos" in c:
        return (
            "Apresente a sequência cronológica de eventos que levou à ocorrência. "
            "Organize em lista numerada com marcações temporais quando disponíveis. "
            "Cada item deve ser um fato objetivo presente nas fontes do caso, sem análise, "
            "interpretação ou etapas intermediárias deduzidas."
        )
    if any(k in c for k in ["operação agrícola", "operação aeroagrícola"]):
        return (
            "Descreva a operação aeroagrícola em andamento (tipo de trabalho, cultura, área de "
            "operação, fase da operação e condições do terreno) apenas com o que consta das fontes "
            "do caso; marque cada item ausente como '[A verificar]'."
        )
    if any(k in c for k in ["fator human", "fatores human"]):
        return (
            "Analise os fatores humanos utilizando o framework HFACS. "
            "Avalie cada nível: atos inseguros (erros e violações), pré-condições dos atos inseguros "
            "(estado do operador, práticas pessoais, ambiente), supervisão insegura e "
            "influências organizacionais. Justifique cada ponto com um fato das fontes do caso; "
            "hipóteses devem ser apresentadas como hipóteses a investigar, nunca como constatação. "
            "Para fatores sem dados suficientes, indique 'Não apurado — a verificar'."
        )
    if any(k in c for k in ["fator material", "fatores material"]):
        return (
            "Analise os fatores materiais identificados. "
            "Avalie: condição de aeronavegabilidade, histórico de manutenção, "
            "possíveis falhas de componentes e equipamentos. "
            "Para fatores sem dados, indique 'Não apurado — a verificar'."
        )
    if any(k in c for k in ["fator operacional", "fatores operacional"]):
        return (
            "Analise os fatores operacionais. "
            "Avalie: planejamento da operação, procedimentos adotados, supervisão operacional, "
            "ambiente de trabalho e pressões organizacionais. "
            "Para fatores sem dados, indique 'Não apurado — a verificar'."
        )
    if any(k in c for k in ["fator ambiental", "fatores ambiental"]):
        return (
            "Analise os fatores ambientais. "
            "Avalie: condições meteorológicas, características do terreno, "
            "infraestrutura de apoio e condições do aeródromo ou área de operação. "
            "Para fatores sem dados, indique 'Não apurado — a verificar'."
        )
    if "análise" in c and "agrícol" in c:
        return (
            "Analise os aspectos específicos da operação aeroagrícola que podem ter contribuído "
            "para a ocorrência: procedimentos de pulverização, equipamentos de aplicação, "
            "condições do terreno agrícola e fatores de risco específicos da atividade."
        )
    # Seção "20. Conclusão" do template FULL_COMPLETE segue o formato real do
    # FORMRF do CENIPA (Fatos + Fatores Contribuintes com determinação), em vez
    # de "Causa Provável". Escopado pelo número da seção para não alterar o
    # comportamento dos demais templates (RF_SIMPLIFIED/RAI/MINUTA), que ainda
    # usam a subseção "Causa Provável".
    if "20. conclus" in c and "fatos" in c:
        return (
            "Liste os fatos apurados durante a investigação, em formato de lista "
            "objetiva com marcadores (a, b, c...), um fato por item, sem análise ou "
            "interpretação — apenas o que foi confirmado pelos dados da ocorrência "
            "fornecidos. Siga o padrão CENIPA (seção Conclusões > Fatos)."
        )
    if "20. conclus" in c and ("fator contribu" in c or "fatores contribu" in c):
        return (
            "Liste os fatores contribuintes identificados. Para cada fator: (1) nome "
            "objetivo do fator, (2) determinação — 'contribuiu', 'indeterminado' ou "
            "'não contribuiu' — e (3) uma justificativa de 1 a 3 frases com base nos "
            "dados da ocorrência. Formato: <p><strong>Nome do fator</strong> — "
            "determinação.</p><p>Justificativa.</p>. Não use categorias fixas "
            "(Humano/Material/Operacional/Ambiental) — nomeie o fator livremente, como "
            "no padrão do Relatório Final do CENIPA. Se não há dados suficientes, "
            "indique 'Não apurado — a verificar'."
        )
    if "outros danos" in c:
        return (
            "Descreva danos a terceiros, propriedades, infraestrutura ou ao meio "
            "ambiente resultantes da ocorrência, além dos danos à própria aeronave. "
            "Declare 'Não houve' apenas se as fontes informarem isso; sem informação, "
            "escreva '[A verificar: outros danos]'."
        )
    if "ações corretivas" in c or "preventivas adotadas" in c:
        return (
            "Descreva as ações corretivas ou preventivas já adotadas pelo operador, "
            "pela ANAC ou por outros envolvidos, em resposta a esta ocorrência, "
            "anteriormente à publicação deste relatório, conforme as fontes do caso. "
            "Se as fontes não registrarem ações, escreva 'Nada a relatar' seguido de "
            "'[A verificar com o operador]'."
        )
    if "causa provável" in c:
        return (
            "Redija a causa provável da ocorrência em um único parágrafo objetivo, SOMENTE se as "
            "fontes do caso trouxerem evidências que a sustentem. "
            "Formato: 'A ocorrência foi causada por [causa principal], evidenciada por [evidências]. "
            "Contribuíram para a ocorrência [fatores contribuintes].' "
            "Se as evidências forem insuficientes, escreva '[A determinar: causa provável pendente "
            "de análise]' e liste as evidências disponíveis. Siga a NSCA 3-6 e o Anexo 13 OACI."
        )
    if "fator contribu" in c:
        return (
            "Liste os fatores contribuintes identificados em formato de lista numerada. "
            "Para cada fator: indique a categoria (Humano / Material / Operacional / Ambiental) "
            "e uma frase objetiva descrevendo o fator. "
            "Se não há dados suficientes, indique: 'Não foi possível determinar fatores contribuintes "
            "com as informações disponíveis'."
        )
    if any(k in c for k in ["recomendação", "recomendações", "segurança operacional", "lista"]):
        return (
            "Elabore recomendações de segurança operacional em lista numerada, derivadas "
            "EXCLUSIVAMENTE de fatores apurados nas fontes do caso. Se nenhum fator foi apurado, "
            "escreva '[A definir pelo investigador após a análise]' em vez de recomendações genéricas. "
            "Para cada recomendação: (1) destinatário entre colchetes [FAB/ANAC/Operador/Piloto], "
            "(2) verbo de ação no imperativo, (3) ação específica e mensurável, "
            "(4) justificativa em uma frase. "
            "Exemplo: <p><strong>[ANAC]</strong> Revisar os requisitos de habilitação para "
            "operações aeroagrícolas em terreno irregular, considerando os fatores identificados "
            "nesta ocorrência.</p>"
        )
    if any(k in c for k in ["danos ao equipamento", "danos agr", "danos equip"]):
        return (
            "Descreva os danos ao equipamento agrícola (sistema de aplicação, hastes, bicos) "
            "e à aeronave conforme as fontes do caso. Para itens não informados, use '[A verificar]'."
        )

    return (
        f"Preencha a seção '{sub_title}' do relatório SIPAER usando somente as fontes do caso "
        "(dados da ocorrência e trechos dos documentos). Os relatórios similares servem apenas "
        "de modelo de estrutura e linguagem. Use linguagem técnica impessoal e objetiva. "
        "O que não constar das fontes deve ser marcado como '[A verificar]'."
    )


async def _set_status(report_id: int, status: str) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Report).where(Report.id == report_id))
        report = result.scalar_one_or_none()
        if report:
            report.generation_status = status
            await db.commit()


async def generate_report_sections(report_id: int, occurrence: dict) -> None:
    """
    Background task: sequentially generate content for every subsection
    of a report using RAG over sipaer_relatorios_finais.
    """
    try:
        await _run_generation(report_id, occurrence)
    except Exception:
        logger.exception("Generation failed for report %s", report_id)
        await _set_status(report_id, "failed")


async def _run_generation(report_id: int, occurrence: dict) -> None:
    async with AsyncSessionLocal() as db:
        # ── 1. Load report + sections ──────────────────────────────────────────
        result = await db.execute(
            select(Report)
            .where(Report.id == report_id)
            .options(selectinload(Report.sections).selectinload(ReportSection.subsections))
        )
        report = result.scalar_one_or_none()
        if not report:
            logger.warning("Report %s not found — generation aborted", report_id)
            return

        report.generation_status = "generating"
        report.generation_started_at = datetime.now(timezone.utc)
        await db.commit()

    # ── 2. Build occurrence summary ────────────────────────────────────────────
    occurrence_summary = build_occurrence_summary(occurrence)

    # ── 2b. Documentos de apoio anexados no assistente → Qdrant (por report_id) ─
    use_documents = False
    try:
        if await has_documents(report_id):
            indexed = await index_report_documents(report_id)
            use_documents = True
            logger.info("Report %s: %d trecho(s) de documentos de apoio indexados", report_id, indexed)
    except Exception:
        logger.warning("Falha ao indexar documentos do report %s — gerando sem eles", report_id)

    # ── 3. Vector search: sipaer_relatorios_finais ─────────────────────────────
    rag_context = ""
    sources: list[dict] = []
    try:
        query_vector = await llm_service.embed(occurrence_summary[:600])
        if query_vector:
            col = KNOWLEDGE_COLLECTIONS.get("relatorios_finais")
            hits = await vector_service.search(
                query_vector,
                collection_names=[col] if col else None,
                limit=8,
            )
            if hits:
                docs = [h.payload.get("text", "") for h in hits]
                try:
                    reranked = await llm_service.rerank(occurrence_summary[:600], docs, top_n=5)
                except Exception:
                    logger.warning(
                        "Reranker indisponível para report %s — usando ordem da busca vetorial",
                        report_id,
                    )
                    reranked = [
                        {"index": i, "relevance_score": None} for i in range(min(5, len(hits)))
                    ]
                top_docs = [docs[r["index"]] for r in reranked]
                rag_context = "\n\n---\n\n".join(top_docs)

                for r in reranked:
                    hit = hits[r["index"]]
                    payload = hit.payload or {}
                    sources.append({
                        "docId": payload.get("doc_id"),
                        "title": payload.get("title") or payload.get("source") or "Documento sem título",
                        "source": payload.get("source"),
                        "chunkIndex": payload.get("chunk_index"),
                        "relevanceScore": r.get("relevance_score"),
                        "vectorScore": getattr(hit, "score", None),
                        "excerpt": (payload.get("text") or "")[:400],
                    })
    except Exception:
        logger.warning("RAG search failed for report %s — generating without context", report_id)

    # ── 4. Build system prompt with optional RAG context ──────────────────────
    system = _SYSTEM_PROMPT
    if rag_context:
        system += (
            "\n\n## REFERÊNCIAS — trechos de relatórios SIPAER similares encontrados na base:\n"
            + rag_context
        )

    # ── 5. Generate each subsection sequentially ──────────────────────────────
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Report)
            .where(Report.id == report_id)
            .options(selectinload(Report.sections).selectinload(ReportSection.subsections))
        )
        report = result.scalar_one_or_none()
        if not report:
            return

        report.generation_sources = sources
        await db.commit()

        for section in report.sections:
            for subsection in section.subsections:
                instruction = _get_instruction(section.title, subsection.title)

                documents_block = ""
                if use_documents:
                    try:
                        excerpts = await document_excerpts(
                            report_id,
                            f"{section.title} — {subsection.title}\n{occurrence_summary[:500]}",
                        )
                    except Exception:
                        excerpts = []
                    if excerpts:
                        documents_block = (
                            "\n\nTRECHOS DOS DOCUMENTOS DA INVESTIGAÇÃO (fonte primária desta ocorrência — "
                            "use estes fatos; eles prevalecem sobre os relatórios similares de referência, "
                            "que servem só de modelo de redação):\n"
                            + "\n\n".join(f"[{e['filename']}]\n{e['text']}" for e in excerpts)
                        )

                user_prompt = (
                    f"{occurrence_summary}{documents_block}\n\n"
                    f"SEÇÃO A PREENCHER: {section.title} > {subsection.title}\n\n"
                    f"INSTRUÇÃO: {instruction}\n\n"
                    "LEMBRETE: escreva apenas fatos presentes nos DADOS DA OCORRÊNCIA e nos TRECHOS DOS "
                    "DOCUMENTOS acima. Não complete lacunas, não afirme ausências não relatadas e não "
                    "estime valores — marque com [A verificar: …]."
                )

                try:
                    content = await llm_service.chat_completion(
                        [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user_prompt},
                        ],
                        temperature=GENERATION_TEMPERATURE,
                    )
                except Exception:
                    logger.warning(
                        "LLM call failed for subsection %s — skipping", subsection.id
                    )
                    continue

                # Wrap plain text in <p> if LLM didn't return HTML
                if content and not content.strip().startswith("<"):
                    content = "".join(
                        f"<p>{line}</p>" for line in content.splitlines() if line.strip()
                    )

                sub_result = await db.execute(
                    select(ReportSubsection).where(ReportSubsection.id == subsection.id)
                )
                sub_row = sub_result.scalar_one_or_none()
                if sub_row:
                    sub_row.content = content
                    await db.commit()

        # ── 6. Mark done ───────────────────────────────────────────────────────
        rep_result = await db.execute(select(Report).where(Report.id == report_id))
        rep_row = rep_result.scalar_one_or_none()
        if rep_row:
            rep_row.generation_status = "done"
            await db.commit()

    logger.info("Report %s generation completed", report_id)
