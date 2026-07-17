from pydantic import BaseModel

# Papéis que o LLM pode inferir para cada falante. "Indeterminado" cobre trechos
# em que o contexto não permite atribuir um papel com segurança.
ROLES = [
    "Investigador",
    "Piloto",
    "Copiloto",
    "Testemunha",
    "Controlador",
    "Mecânico",
    "Indeterminado",
]


class Speaker(BaseModel):
    id: str                      # rótulo agrupado pelo LLM (ex.: "S1")
    role: str                    # um de ROLES
    confidence: int              # 0–100
    reason: str                  # justificativa curta da inferência


class Turn(BaseModel):
    start: float                 # segundos (timestamp do Whisper)
    end: float
    speaker: str                 # id do Speaker
    role: str
    text: str


class KeyFact(BaseModel):
    time: str                    # "MM:SS" — âncora temporal do fato
    fact: str


class TerminologyItem(BaseModel):
    term: str
    note: str                    # explicação / fraseologia correta


class StressMarker(BaseModel):
    start: float
    end: float
    level: str                   # "baixo" | "medio" | "alto"
    reason: str


class TranscriptAnalysis(BaseModel):
    speakers: list[Speaker] = []
    turns: list[Turn] = []
    summary: str = ""
    key_facts: list[KeyFact] = []
    terminology: list[TerminologyItem] = []
    stress: list[StressMarker] = []


class TranscriptionResponse(BaseModel):
    text: str                    # transcrição completa (encoding corrigido)
    language: str
    duration: float
    analysis: TranscriptAnalysis
