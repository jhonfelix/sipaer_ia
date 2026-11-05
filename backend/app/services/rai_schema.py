"""Esquema dos campos do RAI (Registro de Ação Inicial), baseado no modelo RAI_0126.docx.

Fonte única para:
- o formulário da etapa "Dados" do assistente de relatórios (renderizado pelo frontend);
- o catálogo de campos que a IA preenche a partir dos documentos anexados;
- o resumo enviado à geração do relatório.

`CORE_FIELDS` são os campos que já existiam no formulário (chaves do `OccFormData` do
frontend). As seções do RAI (`RAI_SECTIONS`) complementam esses campos — o que já está no
núcleo (data, hora, matrícula, histórico…) não é repetido nelas.

Tipos de campo: text, textarea, number, date (AAAA-MM-DD), time (HH:MM), select, multi,
yesno (Sim/Não/Desconhecido) e list (grupo repetível de subcampos, ex.: tripulantes).
"""
from __future__ import annotations

YESNO = ["Sim", "Não", "Desconhecido"]


def f(fid: str, label: str, type_: str = "text", options: list[str] | None = None,
      hint: str = "", fields: list[dict] | None = None) -> dict:
    d: dict = {"id": fid, "label": label, "type": type_}
    if options:
        d["options"] = options
    if hint:
        d["hint"] = hint
    if fields:
        d["fields"] = fields
    return d


# ── Campos do núcleo (formulário existente) ──────────────────────────────────

CORE_FIELDS: list[dict] = [
    f("number", "Número da ocorrência (SIPAER)"),
    f("date", "Data da ocorrência", "date"),
    f("time", "Hora da ocorrência (UTC)", "time",
      hint="hora do acidente/incidente — não confundir com hora de decolagem"),
    f("classification", "Classificação", "select", ["ACIDENTE", "INCIDENTE_GRAVE", "INCIDENTE"]),
    f("occurrenceType", "Tipo de ocorrência (CICTT)", "select",
      ["LOC-G", "LOC-I", "RE", "CFIT", "MAC", "GCOL", "F-NI", "FUEL", "SCF-NP", "SCF-PP",
       "BIRD", "TURB", "WSTRW", "UNK"]),
    f("aerodrome", "Aeródromo ou local da ocorrência"),
    f("coordLat", "Latitude", hint="formato 17°28'45\"S"),
    f("coordLon", "Longitude", hint="formato 052°44'58\"W"),
    f("invUnit", "Órgão investigador", "select",
      ["CENIPA", "SERIPA I", "SERIPA II", "SERIPA III", "SERIPA IV", "SERIPA V", "SERIPA VI", "SERIPA VII"]),
    f("municipality", "Município"),
    f("uf", "UF", "select",
      ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB",
       "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]),
    f("flightPhase", "Fase do voo", "select",
      ["Estacionado / Preparação para o voo", "Táxi", "Decolagem", "Subida Inicial", "Subida",
       "Cruzeiro", "Aplicação Agrícola (Voo Baixo)", "Manobra", "Descida", "Aproximação",
       "Arremetida", "Pouso", "Rolagem Após Pouso", "Indeterminada"]),
    f("weatherCondition", "Condição meteorológica", "select",
      ["VMC — Condições Visuais", "IMC — Condições por Instrumentos", "Marginal / Em Deterioração",
       "Não Determinada"]),
    f("weatherDescription", "Descrição meteorológica", "textarea"),
    f("obstacleType", "Obstáculo envolvido", "select",
      ["Nenhum", "Fios/Cabos de Energia", "Árvores/Vegetação", "Edificações/Construções",
       "Torres/Antenas", "Cercas", "Terreno Irregular/Aclive", "Animais na Pista ou Área",
       "Outra Aeronave", "Outros"]),
    f("obstacleDescription", "Descrição do obstáculo", "textarea"),
    f("acRegistration", "Matrícula da aeronave", hint="ex.: PR-AAM"),
    f("acManufacturer", "Fabricante da aeronave"),
    f("acModel", "Modelo da aeronave"),
    f("acOperator", "Operador da aeronave"),
    f("acOperation", "Tipo de operação", "select",
      ["AEROAGRICOLA", "INSTRUCAO", "PRIVADA", "TAXI_AEREO", "SAE", "REGULAR", "OUTRO"],
      hint="operação aeroagrícola (inclusive SAE-AG) = AEROAGRICOLA; SAE só para os demais serviços aéreos especializados"),
    f("acDamage", "Danos à aeronave", "select", ["NENHUM", "LEVE", "SUBSTANCIAL", "DESTRUÍDA"]),
    f("crewFatal", "Tripulantes — lesões fatais", "number"),
    f("crewSerious", "Tripulantes — lesões graves", "number"),
    f("crewMinor", "Tripulantes — lesões leves", "number"),
    f("crewNone", "Tripulantes — ilesos", "number"),
    f("paxFatal", "Passageiros — lesões fatais", "number"),
    f("paxSerious", "Passageiros — lesões graves", "number"),
    f("paxMinor", "Passageiros — lesões leves", "number"),
    f("paxNone", "Passageiros — ilesos", "number"),
    f("thirdFatal", "Terceiros — lesões fatais", "number"),
    f("thirdSerious", "Terceiros — lesões graves", "number"),
    f("thirdMinor", "Terceiros — lesões leves", "number"),
]

# ── Seções do RAI ────────────────────────────────────────────────────────────

_CMA = ["Válido", "Vencido", "Desconhecido", "Não possui"]
_CADERNETA = ["Atualizada", "Não atualizada", "Desconhecido"]
_ATUACAO = ["Eficiente", "Desnecessária", "Deficiente"]
_RECUPERACAO = ["Intacto", "Parcialmente destruído", "Destruído pelo impacto",
                "Destruído pelo fogo", "Não recuperado"]

RAI_SECTIONS: list[dict] = [
    {
        "id": "gerais", "number": 2, "title": "Informações gerais da ocorrência",
        "note": "Data, hora, local, classificação e coordenadas ficam nos campos principais acima.",
        "fields": [
            f("gerais.hora_local", "Hora local", "time"),
            f("gerais.periodo", "Período", "select", ["Dia", "Noite"]),
            f("gerais.acao_inicial_por", "Ação inicial realizada por"),
            f("gerais.tempo_ate_acao_inicial", "Tempo entre a ocorrência e o início da ação inicial"),
            f("gerais.outras_aeronaves", "Outras aeronaves envolvidas", "yesno", YESNO),
            f("gerais.outras_matriculas", "Matrículas e operadores das outras aeronaves"),
            f("gerais.plano_voo", "Plano de voo", "select",
              ["IFR (I)", "VFR (V)", "IFR/VFR (Y)", "VFR/IFR (Z)", "Notificação", "Nenhum"]),
            f("gerais.rota_de", "Rota — de (origem)"),
            f("gerais.rota_para", "Rota — para (destino)"),
            f("gerais.alternativa", "Alternativa"),
            f("gerais.distancia_nm", "Distância (NM)", "number"),
            f("gerais.velocidade_kt", "Velocidade (kt)", "number"),
            f("gerais.tempo_previsto", "Tempo previsto de voo"),
            f("gerais.tempo_realizado", "Tempo de voo realizado"),
            f("gerais.fase_mca", "Fase de operação (MCA 3-6)", "select",
              ["STD — Estacionária", "PBT — Push-back/Reboque", "TXI — Táxi", "TOF — Decolagem",
               "ENR — Em rota", "MNV — Manobra", "APR — Aproximação", "LDG — Pouso",
               "PIM — Pós-impacto", "EMG — Descida de emergência", "UND — Descida não controlada",
               "UNK — Desconhecido"]),
            f("gerais.subfase", "Subfase de operação", hint="ex.: corrida de decolagem, subida inicial"),
            f("gerais.comentarios", "Comentários", "textarea"),
        ],
    },
    {
        "id": "pessoal", "number": 3, "title": "Pessoal envolvido",
        "fields": [
            f("pessoal.pessoas", "Pessoas envolvidas", "list", fields=[
                f("condicao", "Condição", "select", ["PIL", "COPIL", "TRIP", "PAX", "TERC"]),
                f("nome", "Nome"),
                f("contato", "Endereço ou empresa / telefone"),
                f("lesoes", "Lesões", "select", ["FAT", "GRV", "LEV", "ILE", "DES"]),
                f("posicao", "Posição na aeronave", hint="ex.: CAE, CAD, F (fora da aeronave)"),
            ]),
        ],
    },
    {
        "id": "tripulantes", "number": 4, "title": "Informações operacionais sobre os tripulantes",
        "fields": [
            f("tripulantes.lista", "Tripulantes", "list", fields=[
                f("funcao", "Função a bordo", hint="ex.: Piloto em comando, Copiloto"),
                f("nome", "Nome / qualificação operacional"),
                f("idade", "Idade", "number"),
                f("nos_comandos", "Estava nos comandos no momento da ocorrência", "yesno", YESNO),
                f("escola_formacao", "Escola de formação"),
                f("ano_formacao", "Ano de formação", "number"),
                f("ultimo_cheque_data", "Último cheque operacional — data", "date"),
                f("ultimo_cheque_tipo", "Último cheque — tipo", "select", ["Inicial", "Final", "Recheque"]),
                f("ultimo_cheque_checador", "Último cheque — checador"),
                f("cma", "Certificado Médico Aeronáutico (CMA)", "select", _CMA),
                f("cma_validade", "Validade do CMA", "date"),
                f("habilitacao_ifr", "Habilitação IFR", "select", _CMA),
                f("licencas", "Licenças", "multi",
                  ["Aluno piloto", "Piloto privado", "Piloto comercial", "Piloto de linha aérea",
                   "Tripulação múltipla", "Planador", "Balão livre", "Aeronave leve esportiva", "Outros"]),
                f("codigo_anac", "Código ANAC (CANAC)"),
                f("habilitacoes", "Habilitações (tipo e validade)", "textarea"),
                f("fonte_experiencia", "Fonte da informação de experiência", "select",
                  ["O próprio", "Caderneta individual de voo (CIV)", "Declaradas por terceiros"]),
                f("horas_totais", "Horas totais (todos os tipos)", "number"),
                f("horas_no_modelo", "Horas no modelo", "number"),
                f("horas_24h", "Horas nas últimas 24 h", "number"),
                f("horas_48h", "Horas nas últimas 48 h", "number"),
                f("horas_30d", "Horas nos últimos 30 dias", "number"),
                f("horas_90d", "Horas nos últimos 90 dias", "number"),
                f("horas_instrumento", "Horas de voo por instrumentos", "number"),
                f("experiencia_tipo_voo", "Possuía experiência no tipo de voo", "yesno", YESNO),
                f("ja_pousou_localidade", "Já havia pousado na localidade", "yesno", YESNO),
                f("modelos_voados", "Modelos de aeronaves voadas"),
                f("vinculo_operador", "Relação empregatícia com o operador", "select",
                  ["Sim", "Não", "O piloto é o operador"]),
                f("obs", "Observações", "textarea"),
            ]),
        ],
    },
    {
        "id": "aeronave", "number": 5, "title": "Informações sobre a aeronave",
        "note": "Matrícula, fabricante, modelo, operador, operação e danos ficam nos campos principais.",
        "fields": [
            f("aeronave.tipo", "Tipo (vide manual)"),
            f("aeronave.ano_fabricacao", "Ano de fabricação", "number"),
            f("aeronave.numero_serie", "Número de série"),
            f("aeronave.cap_trip", "Capacidade máxima — tripulantes", "number"),
            f("aeronave.cap_pax", "Capacidade máxima — passageiros", "number"),
            f("aeronave.trem_pouso", "Trem de pouso", "multi",
              ["Fixo", "Retrátil", "Triciclo", "Convencional", "Rodas", "Flutuadores", "Anfíbio", "Esquis"]),
            f("aeronave.categoria", "Categoria de registro", hint="ex.: SAE-AG, TPP, PRI"),
            f("aeronave.ca_situacao", "Certificado de Aeronavegabilidade (CA)", "select",
              ["Válido", "Suspenso", "Cancelado", "Desconhecido"]),
            f("aeronave.ca_expedicao", "CA — expedido em", "date"),
            f("aeronave.cad_celula", "Caderneta de célula", "select", _CADERNETA),
            f("aeronave.cad_motor", "Caderneta(s) de motor", "select", _CADERNETA),
            f("aeronave.cad_helice", "Caderneta(s) de hélice", "select", _CADERNETA),
            f("aeronave.ultima_inspecao_tipo", "Última inspeção — tipo", hint="ex.: 100 h, IAM"),
            f("aeronave.ultima_inspecao_oficina", "Última inspeção — oficina"),
            f("aeronave.ultima_inspecao_data", "Última inspeção — data", "date"),
            f("aeronave.horas_apos_inspecao", "Horas após a última inspeção", "number"),
            f("aeronave.ultima_revisao_tipo", "Última revisão geral — tipo"),
            f("aeronave.ultima_revisao_oficina", "Última revisão geral — oficina"),
            f("aeronave.ultima_revisao_data", "Última revisão geral — data", "date"),
            f("aeronave.horas_apos_revisao", "Horas após a última revisão geral", "number"),
            f("aeronave.oficina_certificada", "Oficina certificada para o tipo (CHE)", "yesno", YESNO),
            f("aeronave.horas_totais", "Horas totais da aeronave", "number"),
            f("aeronave.observacoes_diario", "Observações do diário de bordo / relatório de voo", "textarea"),
            f("aeronave.motor", "Motor(es) — marca, modelo, nº de série, horas totais / após revisão / após inspeção", "textarea"),
            f("aeronave.helice", "Hélice(s) — marca, modelo, nº de série, horas", "textarea"),
            f("aeronave.equipamentos", "Equipamentos e sistemas disponíveis", "multi",
              ["VHF COM", "HF COM", "UHF COM", "VOR", "ADF", "DME", "ILS", "GPS", "Rádio altímetro",
               "Transponder", "TCAS", "GPWS/EGPWS", "Piloto automático", "Diretor de voo",
               "Radar meteorológico", "Duplo comando", "Sistema de oxigênio", "Proteção contra gelo",
               "Proteção contra fogo / extintor"]),
            f("aeronave.peso_decolagem", "Peso de decolagem (kg)", "number"),
            f("aeronave.peso_acidente", "Peso no momento da ocorrência (kg)", "number"),
            f("aeronave.combustivel", "Combustível remanescente nos tanques"),
            f("aeronave.peso_dentro_limites", "Peso dentro dos limites", "yesno", YESNO),
            f("aeronave.cg", "Posição do CG", "select",
              ["Dentro dos limites", "Excedendo limite dianteiro", "Excedendo limite traseiro", "Desconhecido"]),
            f("aeronave.comentarios_peso", "Cálculos, distribuição e amarração da carga", "textarea"),
        ],
    },
    {
        "id": "auxilios", "number": 6, "title": "Auxílios à navegação / comunicação",
        "fields": [
            f("auxilios.disponiveis", "Auxílios disponíveis (aeródromo ou rota)", "multi",
              ["ATIS/DATIS", "Vigilância radar", "Vetoração radar", "RNAV/GNSS", "STAR", "SID",
               "ILS", "VOR", "NDB", "DME", "PAR", "Biruta", "Sistema de iluminação"]),
            f("auxilios.utilizados", "Auxílios utilizados", "textarea"),
            f("auxilios.comunicacoes", "Comunicações bilaterais", "select",
              ["Estabelecidas e satisfatórias", "Estabelecidas e insatisfatórias", "Não estabelecidas",
               "Não aplicável"]),
            f("auxilios.ultimo_contato", "Último contato estabelecido", "select",
              ["ACC", "APP", "TWR", "AFIS", "Outra aeronave", "Companhia", "Tática", "Nenhum"]),
            f("auxilios.gravacoes", "Gravações de comunicações", "select",
              ["Disponíveis", "Disponíveis parcialmente", "Indisponíveis"]),
            f("auxilios.comentarios", "Comentários", "textarea"),
        ],
    },
    {
        "id": "aerodromo", "number": 7, "title": "Informações sobre o aeródromo",
        "note": "O nome do aeródromo fica nos campos principais.",
        "fields": [
            f("aerodromo.indicador", "Indicador de localidade (ICAO)", hint="ex.: SBGO"),
            f("aerodromo.compativel", "Compatível com o tipo de aeronave", "yesno", YESNO),
            f("aerodromo.dimensoes", "Dimensões da pista ou área de pouso", hint="ex.: 1.200 x 30 m"),
            f("aerodromo.direcao", "Direção da pista (cabeceiras)", hint="ex.: 15/33"),
            f("aerodromo.coordenadas", "Coordenadas do aeródromo"),
            f("aerodromo.numero_pistas", "Número de pistas", "number"),
            f("aerodromo.elevacao", "Elevação (ft)", "number"),
            f("aerodromo.administracao", "Categoria", "select",
              ["Privado", "Público", "Militar", "Público/Militar", "Privado/Público", "Público/Restrito"]),
            f("aerodromo.cadastro", "Situação cadastral", "select",
              ["Homologado", "Registrado", "Clandestino", "Área de pouso eventual",
               "Área de pouso para uso aeroagrícola"]),
            f("aerodromo.operador", "Operador do aeródromo"),
            f("aerodromo.tipo_operacao", "Tipo de operação permitida", "select",
              ["VFR", "VFR diurna", "IFR", "IFR diurna", "VFR/IFR", "VFR/IFR diurna"]),
            f("aerodromo.piso", "Tipo de piso", "select",
              ["Asfalto", "Concreto", "Grama", "Terra", "Cascalho", "Piçarra", "Saibro", "Areia",
               "Argila", "Barro", "Macadame", "Aço", "Água", "Outro"]),
            f("aerodromo.estado_superficie", "Estado da superfície da pista", "multi",
              ["Seca", "Molhada", "Alagada", "Regular", "Irregular", "Lisa", "Estriada", "Porosa",
               "Esburacada", "Escorregadia", "Depósito de borracha", "Vegetação > 15 cm"]),
            f("aerodromo.dificuldades", "Dificuldades no táxi, decolagem e pouso", "multi",
              ["Nenhuma", "Valas", "Buracos", "Pedras", "Postes", "Fios", "Antenas", "Construção",
               "Vegetação", "Animais", "Veículo", "Pedestres", "Cargas", "Elevações",
               "Demarcação fraca", "Sem demarcação"]),
            f("aerodromo.prolongamento", "Prolongamento das pistas", "multi",
              ["Desobstruído", "Obstruído", "Adequado", "Inadequado", "Superfície macia/água",
               "Superfície irregular"]),
            f("aerodromo.controle_trafego", "Controle de tráfego aéreo", "select",
              ["Operando", "Não operando", "Inexistente"]),
            f("aerodromo.plem", "Plano de emergência (PLEM)", "select", ["Existente", "Inexistente"]),
            f("aerodromo.plem_atuacao", "Atuação do PLEM", "select", _ATUACAO),
            f("aerodromo.comentarios", "Comentários", "textarea"),
        ],
    },
    {
        "id": "meteo", "number": 8, "title": "Informações meteorológicas",
        "note": "A condição meteorológica geral fica nos campos principais.",
        "fields": [
            f("meteo.origem", "Origem da informação", "multi", ["Serviço meteorológico", "Piloto", "Observador"]),
            f("meteo.info_disponivel", "Havia informações meteorológicas disponíveis ao piloto", "yesno", YESNO),
            f("meteo.info_usada", "As informações foram usadas", "yesno", YESNO),
            f("meteo.vento", "Vento — direção e velocidade", hint="ex.: 120°/08 kt"),
            f("meteo.vento_caracteristica", "Vento — característica", "select",
              ["Contínuo", "Rajadas", "Turbilhonado", "Desconhecido"]),
            f("meteo.visibilidade", "Visibilidade", hint="ex.: acima de 10 km"),
            f("meteo.restricoes_visibilidade", "Restrições à visibilidade", "multi",
              ["Nenhuma", "Névoa úmida", "Névoa seca", "Nevoeiro", "Chuva", "Fumaça"]),
            f("meteo.nuvens", "Nebulosidade (tipos, cobertura e base)", hint="ex.: 3/8 CU a 3.000 ft"),
            f("meteo.temperatura", "Temperatura (°C)", "number"),
            f("meteo.periodo_dia", "Período do dia", "select",
              ["Alvorecer", "Dia", "Crepúsculo", "Noite com luar", "Noite escura"]),
            f("meteo.voo_instrumentos", "Piloto voando por instrumentos na hora da ocorrência", "yesno", YESNO),
            f("meteo.windshear", "Wind shear", "select", ["Não", "Fraco", "Moderado", "Forte", "Desconhecido"]),
            f("meteo.turbulencia", "Turbulência", "select", ["Não", "Leve", "Moderada", "Forte", "Desconhecido"]),
            f("meteo.gelo", "Formação de gelo", "select", ["Não", "Sim", "Desconhecido"]),
            f("meteo.metar_taf", "METAR / TAF / outros dados", "textarea"),
            f("meteo.comentarios", "Comentários", "textarea"),
        ],
    },
    {
        "id": "ambiente", "number": 9, "title": "Ambiente operacional",
        "fields": [
            f("ambiente.fatores", "Fatores do ambiente operacional presentes", "multi",
              ["Forças acelerativas em voo", "Forças acelerativas (impacto)", "Descompressão", "Vibração",
               "Má iluminação da cabine", "Nível de ruído na cabine", "Ofuscamento", "Fumaça", "Calor",
               "Frio", "Má iluminação da pista", "Pressurização da cabine", "Choque com o ar",
               "Má visibilidade", "Iluminação de outras aeronaves", "Interferência do equipamento pessoal",
               "Fauna", "Outros"]),
            f("ambiente.altitude_cabine", "Altitude da cabine na emergência (ft)", "number"),
            f("ambiente.altitude_real", "Altitude real na emergência (ft)", "number"),
            f("ambiente.visibilidade", "Condições atmosféricas de visibilidade", "select",
              ["Satisfatórias", "Marginais", "Desconhecidas"]),
            f("ambiente.horizonte", "Condições do horizonte", "select", ["Definido", "Indefinido", "Desconhecido"]),
            f("ambiente.comentarios", "Comentários", "textarea"),
        ],
    },
    {
        "id": "croqui", "number": 10, "title": "Croqui",
        "fields": [
            f("croqui.descricao", "Descrição do croqui",
              "textarea", hint="Trajetória, posição da aeronave, observadores e dados da pista (o desenho é anexado à parte)."),
        ],
    },
    {
        "id": "destrocos", "number": 11, "title": "Situação dos destroços",
        "fields": [
            f("destrocos.localizacao", "Localização", "select",
              ["Em aeródromo ou área de operação", "Fora de aeródromo ou área de operação"]),
            f("destrocos.local", "Coordenadas ou descrição do local"),
            f("destrocos.descricao_local", "Descrição do local", "multi",
              ["Montanha", "Colina", "Cidade", "Selva", "Clareira", "Cultivado", "Rio", "Lago", "Mar",
               "Alagado", "Praia", "Estrada", "Descampado"]),
            f("destrocos.superficie", "Tipo de superfície", "multi",
              ["Firme", "Irregular", "Pantanosa", "Edificada", "Água", "Pavimentada", "Arenosa", "Arborizada"]),
            f("destrocos.impactos_anteriores", "Impactos anteriores", "multi",
              ["Nenhum", "Fio", "Cerca", "Poste", "Árvore", "Aeronave", "Ave", "Veículo", "Construção",
               "Pedestre", "Animal", "Equipamento", "Elevação"]),
            f("destrocos.fogo", "Ocorrência de fogo", "select",
              ["Não", "Em voo", "No solo", "Antes do impacto", "Depois do impacto"]),
            f("destrocos.movimentados", "Destroços movimentados antes da ação inicial", "yesno", YESNO),
            f("destrocos.distribuicao", "Distribuição dos destroços", "select",
              ["Linear", "Leque", "Circular", "Concentrada", "Dispersa"]),
            f("destrocos.primeiro_impacto", "Primeiro impacto (altura do ponto e ângulo da trajetória)"),
            f("destrocos.atitude", "Atitude no impacto e posição após a parada", "textarea"),
            f("destrocos.trens_flapes", "Posição dos trens, flapes e compensadores", "textarea"),
            f("destrocos.combustivel_seletoras", "Seletoras de combustível", "textarea"),
            f("destrocos.comandos_interruptores", "Posição de manetes, comandos e interruptores", "textarea"),
            f("destrocos.instrumentos", "Indicações dos instrumentos", "textarea"),
            f("destrocos.disjuntores", "Disjuntores desarmados", "textarea"),
            f("destrocos.danos_componentes", "Danos por componente (asas, motor, hélice, fuselagem…)", "textarea"),
            f("destrocos.comentarios", "Comentários", "textarea"),
        ],
    },
    {
        "id": "fotografias", "number": 12, "title": "Fotografias",
        "fields": [
            f("fotografias.legendas", "Legendas das fotografias", "textarea",
              hint="Uma legenda por linha (as imagens são anexadas à parte)."),
        ],
    },
    {
        "id": "fogo", "number": 13, "title": "Dados sobre fogo",
        "fields": [
            f("fogo.inicio_momento", "Início do fogo", "select",
              ["Não houve fogo", "Em voo", "No impacto", "Após o impacto", "Durante reabastecimento", "Indeterminado"]),
            f("fogo.indicios", "Indícios de fogo", "multi", ["Alarme", "Instrumentos", "Cheiro", "Visão", "Explosão"]),
            f("fogo.danos", "Danos por fogo", "select", ["Nenhum", "0% - 25%", "26% - 50%", "51% - 75%", "76% - 100%"]),
            f("fogo.alarme", "Sistema de alarme de fogo/superaquecimento", "select",
              ["Funcionou como previsto", "Não funcionou", "Funcionou inadequadamente", "Não instalado", "Desconhecido"]),
            f("fogo.local_inicio", "Local de início do fogo", "multi",
              ["Motores", "Cabine de pilotagem", "Cabine de passageiros", "Asa", "APU", "Freios", "Pneus",
               "Bateria", "Bagagem", "Alojamento do trem", "Seção de cauda", "Aviônicos", "Sistema de oxigênio"]),
            f("fogo.material", "Material combustível", "multi",
              ["Combustível", "Óleo do motor", "Fluido hidráulico", "Óleo de transmissão", "Estofamento",
               "Carga", "Isolamento elétrico", "Isolamento acústico", "Explosivos", "Indeterminado"]),
            f("fogo.ignicao", "Fonte de ignição", "multi",
              ["Escapamento", "Curto-circuito", "Fagulha/fricção", "Fagulha elétrica", "Estática", "Raio",
               "Atrito com o solo", "Fumo a bordo", "Explosivos", "Tubulação", "Carga"]),
            f("fogo.servico_contraincendio", "Serviço contraincêndio", "multi", ["Do aeroporto", "Do município"]),
            f("fogo.atuacao_sci", "Atuação do serviço contraincêndio", "select", _ATUACAO),
            f("fogo.comentarios", "Comentários", "textarea"),
        ],
    },
    {
        "id": "seguranca", "number": 14, "title": "Equipamentos e sistemas de segurança pessoal",
        "fields": [
            f("seguranca.cintos_tripulacao", "Cintos/suspensórios da tripulação utilizados", "yesno", YESNO),
            f("seguranca.cintos_passageiros", "Cintos dos passageiros utilizados", "yesno", YESNO),
            f("seguranca.capacete", "Capacete utilizado", "yesno", YESNO),
            f("seguranca.falhas", "Equipamentos que falharam ou contribuíram para lesões", "textarea"),
            f("seguranca.contribuicao", "Contribuição dos equipamentos (minimizaram ou produziram lesões)", "textarea"),
        ],
    },
    {
        "id": "abandono", "number": 15, "title": "Abandono da aeronave e sobrevivência",
        "fields": [
            f("abandono.meios_evacuacao", "Meios de evacuação utilizados", "multi",
              ["Portas principais", "Saídas de emergência", "Janelas", "Escorregadeiras", "Cordas",
               "Partes destruídas no impacto", "Cortes feitos intencionalmente"]),
            f("abandono.meios_eficazes", "Os meios utilizados foram eficazes", "yesno", YESNO),
            f("abandono.obstrucoes", "Obstruções ao abandono", "multi",
              ["Bagagem de mão", "Carga", "Pânico", "Fogo", "Desmoronamento da cabine",
               "Saída obstruída por fora", "Orientações erradas", "Passageiros sem briefing"]),
            f("abandono.equip_selva", "Equipamento de sobrevivência na selva a bordo", "yesno", YESNO),
            f("abandono.equip_mar", "Equipamento de sobrevivência no mar a bordo", "yesno", YESNO),
            f("abandono.kit_primeiros_socorros", "Kit de primeiros socorros a bordo", "yesno", YESNO),
            f("abandono.problemas", "Problemas encontrados na sobrevivência", "multi",
              ["Incapacitado por ferimento", "Sede ou fome", "Falta de treinamento", "Traje inadequado",
               "Falta de equipamento de sinalização", "Topografia", "Animais", "Pânico", "Fadiga"]),
            f("abandono.lesoes_decorrentes", "Houve lesões graves ou mortes em decorrência da evacuação/sobrevivência", "yesno", YESNO),
            f("abandono.aeronave_desmontada", "A aeronave teve de ser destruída ou desmontada", "yesno", YESNO),
            f("abandono.abandono_em_voo", "Abandono em voo (ejeção/paraquedas), se houve", "textarea"),
            f("abandono.descricao", "Como a evacuação ou a sobrevivência contribuíram para agravar a ocorrência", "textarea"),
        ],
    },
    {
        "id": "sar", "number": 16, "title": "Busca e salvamento",
        "fields": [
            f("sar.encontrada_por", "Aeronave encontrada por", "multi",
              ["SAR", "Particulares", "Polícia", "Exército", "Marinha", "Corpo de Bombeiros", "Outros"]),
            f("sar.meios_busca", "Meios de busca", "multi", ["Aéreos", "Terrestres", "Navais", "SARSAT"]),
            f("sar.metodo_localizacao", "Método de localização", "multi",
              ["VHF", "UHF", "ELT", "Visual/destroços", "Visual/fumaça", "Visual/espelho", "Visual/pirotécnico", "Outros"]),
            f("sar.tempo_notificacao", "Tempo da ocorrência à notificação ao SALVAERO"),
            f("sar.tempo_localizacao", "Tempo da ocorrência à localização"),
            f("sar.tempo_encerramento", "Tempo da ocorrência ao encerramento da busca"),
            f("sar.elt_ativacao", "ELT — ativação", "select",
              ["Automática", "Manual", "Não ativado", "Inexistente", "Não funcionou"]),
            f("sar.elt_problemas", "ELT — problemas", "multi",
              ["Danificado no impacto", "Danificado por fogo", "Submerso", "Manutenção inadequada",
               "G insuficiente para ativação", "Antena quebrada", "Instalação incorreta", "Interferências"]),
            f("sar.elt_modelo", "ELT — fabricante e modelo"),
            f("sar.dificuldades", "Dificuldades no salvamento", "multi",
              ["Comunicações", "Meteorologia", "Má visibilidade", "Fogo/explosão", "Veículo de salvamento inadequado",
               "Inexistência de veículo de salvamento", "Atuação deficiente da equipe", "Atuação deficiente da coordenação",
               "Facilidades médicas inadequadas", "Falta de equipamento de salvamento"]),
            f("sar.comentarios", "Comentários", "textarea"),
        ],
    },
    {
        "id": "gravadores", "number": 17, "title": "Gravadores de voo",
        "fields": [
            f("gravadores.fdr_existente", "FDR existente", "yesno", YESNO),
            f("gravadores.fdr_recuperacao", "FDR — recuperação", "select", _RECUPERACAO),
            f("gravadores.fdr_funcionamento", "FDR — funcionamento", "select", ["Adequado", "Inadequado", "Desligado"]),
            f("gravadores.cvr_existente", "CVR existente", "yesno", YESNO),
            f("gravadores.cvr_recuperacao", "CVR — recuperação", "select", _RECUPERACAO),
            f("gravadores.cvr_funcionamento", "CVR — funcionamento", "select", ["Adequado", "Inadequado", "Desligado"]),
            f("gravadores.outros", "Outros registros de dados (GPS, EFIS, celular, câmeras)", "textarea"),
            f("gravadores.descricao", "Condições das gravações, transcrições e resultado da interpretação", "textarea"),
        ],
    },
    {
        "id": "eventos", "number": 18, "title": "Eventos",
        "fields": [
            f("eventos.circunstancias", "Circunstâncias anormais evidenciadas", "textarea",
              hint="Uma por linha, contribuindo ou não para o resultado (os códigos da taxonomia são marcados à parte)."),
        ],
    },
    {
        "id": "adicionais", "number": 19, "title": "Informações adicionais",
        "fields": [f("adicionais.texto", "Informações adicionais", "textarea")],
    },
    {
        "id": "administrativas", "number": 20, "title": "Informações administrativas",
        "fields": [
            f("administrativas.componentes_laudo", "Envio de componente para laudo técnico (CENIPA 06)", "textarea",
              hint="Componente, tipo de exame e data de envio."),
        ],
    },
    {
        "id": "criticas", "number": 21, "title": "Críticas ao material de apoio à investigação",
        "fields": [f("criticas.texto", "Críticas e sugestões", "textarea")],
    },
    {
        "id": "comissao", "number": 22, "title": "Comissão de investigação",
        "fields": [
            f("comissao.membros", "Membros da comissão", "list", fields=[
                f("funcao", "Função", "select",
                  ["Investigador encarregado", "Encarregado do fator operacional", "Encarregado do fator humano",
                   "Encarregado do fator material", "Membro"]),
                f("nome", "Nome, posto / OM"),
                f("numero_sipaer", "Número SIPAER"),
            ]),
        ],
    },
]


def all_rai_fields() -> list[dict]:
    return [fld for sec in RAI_SECTIONS for fld in sec["fields"]]


def field_index() -> dict[str, dict]:
    """id → definição, para núcleo (prefixo `core.`) e RAI."""
    idx = {f"core.{fld['id']}": fld for fld in CORE_FIELDS}
    idx.update({fld["id"]: fld for fld in all_rai_fields()})
    return idx


def schema_payload() -> dict:
    return {"core": CORE_FIELDS, "sections": RAI_SECTIONS}


def _fmt(v) -> str:
    if isinstance(v, list):
        return ", ".join(str(x) for x in v if str(x).strip())
    return str(v).strip()


def rai_summary(rai: dict | None) -> str:
    """Texto legível dos campos do RAI preenchidos — usado no prompt da geração."""
    if not rai:
        return ""
    values = rai.get("values") or {}
    lists = rai.get("lists") or {}
    lines: list[str] = []
    for sec in RAI_SECTIONS:
        sec_lines: list[str] = []
        for fld in sec["fields"]:
            if fld["type"] == "list":
                items = lists.get(fld["id"]) or []
                for n, item in enumerate(items, 1):
                    parts = [
                        f"{sub['label']}: {_fmt(item.get(sub['id']))}"
                        for sub in fld["fields"]
                        if _fmt(item.get(sub["id"], ""))
                    ]
                    if parts:
                        sec_lines.append(f"- {fld['label']} {n}: " + "; ".join(parts))
            else:
                val = _fmt(values.get(fld["id"], ""))
                if val:
                    sec_lines.append(f"- {fld['label']}: {val}")
        if sec_lines:
            lines.append(f"{sec['number']}. {sec['title']}")
            lines.extend(sec_lines)
    return "\n".join(lines)
