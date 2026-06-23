import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import KNOWLEDGE_COLLECTIONS
from app.database import AsyncSessionLocal
from app.models.report import Report, ReportSection, ReportSubsection
from app.services.llm_service import llm_service
from app.services.vector_service import vector_service

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """Você é SAPAER-AI, assistente especializado em redação de relatórios de investigação aeronáutica do sistema SIPAER/CENIPA.

Seu papel é preencher seções específicas de relatórios (RFA, ROCA, RAI, Minuta) com base nos dados da ocorrência fornecidos e em trechos de relatórios similares como referência.

## REGRAS DE GERAÇÃO

- Escreva exclusivamente o conteúdo da seção solicitada, sem repetir o título
- Use linguagem técnica impessoal e objetiva, conforme padrão COMAER/SIPAER
- Para campos com dados insuficientes, escreva "A verificar" ou "Não informado"
- Não especule sobre responsabilização; foque em fatos e análise técnica
- Baseie-se nos dados da ocorrência e nos exemplos de relatórios similares fornecidos
- Cite normas aplicáveis quando pertinente (NSCA 3-6, MCA 3-3, RBAC, Anexo 13 OACI)

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
            "Para campos não informados, use 'A verificar'."
        )
    if any(k in c for k in ["sistema de aplicação", "produto", "dosagem"]):
        return (
            "Descreva o sistema de aplicação aeroagrícola utilizado, produtos e dosagens. "
            "Para campos não informados, indique 'A verificar'."
        )
    if any(k in c for k in ["habilitação agr", "hab agr"]):
        return (
            "Descreva a habilitação do piloto para operações aeroagrícolas. "
            "Liste os requisitos verificados e pendentes conforme RBAC 61 e RBAC 137."
        )
    if any(k in c for k in ["piloto", "tripulação", "piloto em comando"]):
        return (
            "Estruture o espaço de preenchimento dos dados do piloto em comando. "
            "Liste os campos obrigatórios: licença, habilitações, horas totais de voo, "
            "horas no tipo/modelo, validade do CMA e condição física declarada. "
            "Para dados não informados, use 'A verificar'."
        )
    if any(k in c for k in ["meteorológic", "condições atmosféricas", "condições do tempo"]):
        return (
            "Descreva as condições meteorológicas na área e horário da ocorrência. "
            "Indique: visibilidade, teto, vento, temperatura e fenômenos significativos. "
            "Se dados não disponíveis, indique cada campo como 'A verificar'."
        )
    if "descrição detalhada" in c or ("narrativa" in c and "sequência" not in c):
        return (
            "Redija uma narrativa detalhada da ocorrência em linguagem técnica impessoal. "
            "Descreva o contexto operacional, o voo ou operação em andamento e "
            "os eventos que culminaram na ocorrência. Use verbos no passado."
        )
    if "sequência de eventos" in c:
        return (
            "Apresente a sequência cronológica de eventos que levou à ocorrência. "
            "Organize em lista numerada com marcações temporais quando disponíveis. "
            "Cada item deve ser um fato objetivo, sem análise ou interpretação."
        )
    if any(k in c for k in ["operação agrícola", "operação aeroagrícola"]):
        return (
            "Descreva a operação aeroagrícola em andamento: tipo de trabalho, cultura, "
            "área de operação, fase da operação e condições do terreno no momento da ocorrência."
        )
    if any(k in c for k in ["fator human", "fatores human"]):
        return (
            "Analise os fatores humanos utilizando o framework HFACS. "
            "Avalie cada nível: atos inseguros (erros e violações), pré-condições dos atos inseguros "
            "(estado do operador, práticas pessoais, ambiente), supervisão insegura e "
            "influências organizacionais. Justifique com base nos dados disponíveis. "
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
    if "causa provável" in c:
        return (
            "Redija a causa provável da ocorrência em um único parágrafo objetivo. "
            "Formato: 'A ocorrência foi causada por [causa principal], evidenciada por [evidências]. "
            "Contribuíram para a ocorrência [fatores contribuintes].' "
            "Siga o padrão da NSCA 3-6 e do Anexo 13 OACI."
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
            "Elabore recomendações de segurança operacional em lista numerada. "
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
            "e à aeronave resultantes da ocorrência. Para campos não informados, use 'A verificar'."
        )

    return (
        f"Preencha a seção '{sub_title}' do relatório SIPAER com base nos dados da ocorrência "
        "e nos exemplos de relatórios similares fornecidos. "
        "Use linguagem técnica impessoal e objetiva. Seja específico e factual."
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

    # ── 3. Vector search: sipaer_relatorios_finais ─────────────────────────────
    rag_context = ""
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
                reranked = await llm_service.rerank(occurrence_summary[:600], docs, top_n=5)
                top_docs = [docs[r["index"]] for r in reranked]
                rag_context = "\n\n---\n\n".join(top_docs)
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

        for section in report.sections:
            for subsection in section.subsections:
                instruction = _get_instruction(section.title, subsection.title)

                user_prompt = (
                    f"{occurrence_summary}\n\n"
                    f"SEÇÃO A PREENCHER: {section.title} > {subsection.title}\n\n"
                    f"INSTRUÇÃO: {instruction}"
                )

                try:
                    content = await llm_service.chat_completion(
                        [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user_prompt},
                        ]
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
