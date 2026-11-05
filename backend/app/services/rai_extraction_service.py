"""Pré-preenchimento do RAI a partir de documentos de apoio.

Fluxo (por análise):
1. cada documento é dividido em janelas de até ~45 mil caracteres;
2. para cada janela, o LLM devolve SÓ os campos que encontrou, com o trecho literal
   de onde tirou cada valor (JSON);
3. o trecho é conferido contra o texto do documento — se não estiver lá, o valor é
   descartado (o modelo inventou);
4. valores são normalizados para o tipo do campo (data ISO, HH:MM, opção válida…);
5. os resultados de todos os documentos são combinados; valores divergentes viram
   **conflito** para o investigador escolher;
6. um último pedido redige o Histórico a partir dos fatos de cada documento.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import unicodedata
from dataclasses import dataclass, field

from app.services.llm_service import llm_service
from app.services.rai_schema import CORE_FIELDS, RAI_SECTIONS, field_index

logger = logging.getLogger(__name__)

WINDOW_CHARS = 45_000
WINDOW_OVERLAP = 1_500
CONCURRENCY = 3
MODEL = "gpt-oss-120b"


# ── Normalização ──────────────────────────────────────────────────────────────

_DASHES = re.compile(r"[‐‑‒–—―−]")


def _norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", str(text))
    text = "".join(c for c in text if not unicodedata.combining(c))
    # O modelo troca travessões/hífens (— – ‑) entre si ao citar: trata todos como "-".
    text = _DASHES.sub("-", text)
    text = re.sub(r"[\"'“”‘’`´]", "", text.lower())
    return re.sub(r"\s+", " ", text).strip()


def quote_in_text(quote: str, haystack_norm: str) -> bool:
    """O trecho citado está no documento? Tolerante a acentos, caixa, aspas e espaços."""
    q = _norm(quote)
    if len(q) < 3:
        return False
    if q in haystack_norm:
        return True
    # Citações longas: aceita se o começo e o fim existirem (o modelo às vezes "cola" linhas).
    if len(q) > 80:
        return q[:50] in haystack_norm and q[-30:] in haystack_norm
    return False


def _match_option(value: str, options: list[str]) -> str | None:
    v = _norm(value)
    if not v:
        return None
    for opt in options:
        if _norm(opt) == v:
            return opt
    # Opções com código ("TOF — Decolagem"): aceita só o código ou o texto completo.
    for opt in options:
        if " — " not in opt:
            continue
        code, _, label = opt.partition(" — ")
        if v in (_norm(code), _norm(label)) or v.startswith(_norm(code) + " "):
            return opt
    return None


_MONTHS = {"jan": 1, "fev": 2, "mar": 3, "abr": 4, "mai": 5, "jun": 6, "jul": 7, "ago": 8,
           "set": 9, "out": 10, "nov": 11, "dez": 12}


def _to_date(value: str) -> str | None:
    s = str(value).strip()
    if m := re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", s):
        y, mo, d = map(int, m.groups())
    elif m := re.fullmatch(r"(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})", s):
        d, mo, y = map(int, m.groups())
        y += 2000 if y < 100 else 0
    elif m := re.fullmatch(r"(\d{1,2})\s*([a-zA-Zç]{3})[a-zA-Zç]*\s*(\d{4})", _norm(s).replace(" de ", " ")):
        d, mon, y = int(m.group(1)), m.group(2), int(m.group(3))
        mo = _MONTHS.get(mon[:3])
        if not mo:
            return None
    else:
        return None
    if not (1 <= mo <= 12 and 1 <= d <= 31 and 1900 <= y <= 2100):
        return None
    return f"{y:04d}-{mo:02d}-{d:02d}"


def _to_time(value: str) -> str | None:
    m = re.search(r"(\d{1,2})\s*[:hH]\s*(\d{2})?", str(value))
    if not m:
        return None
    h, mi = int(m.group(1)), int(m.group(2) or 0)
    if h > 23 or mi > 59:
        return None
    return f"{h:02d}:{mi:02d}"


def _to_number(value) -> str | None:
    if isinstance(value, (int, float)):
        return str(int(value)) if float(value).is_integer() else str(value)
    s = str(value).strip()
    m = re.search(r"-?\d[\d.,]*", s)
    if not m:
        return None
    num = m.group(0)
    if "," in num and "." in num:  # 1.234,5 → 1234.5
        num = num.replace(".", "").replace(",", ".")
    elif "," in num:
        num = num.replace(",", ".")
    elif num.count(".") > 1 or re.fullmatch(r"\d{1,3}(\.\d{3})+", num):
        num = num.replace(".", "")
    try:
        f = float(num)
    except ValueError:
        return None
    return str(int(f)) if f.is_integer() else str(f)


def normalize_value(fdef: dict, value):
    """Converte o valor para o formato do campo. None = descartar."""
    t = fdef["type"]
    if value is None or value == "" or value == []:
        return None
    if t == "multi":
        items = value if isinstance(value, list) else re.split(r"[;,]", str(value))
        out = []
        for it in items:
            opt = _match_option(str(it), fdef.get("options", []))
            if opt and opt not in out:
                out.append(opt)
        return out or None
    if isinstance(value, (list, dict)):
        value = ", ".join(map(str, value)) if isinstance(value, list) else json.dumps(value, ensure_ascii=False)
    s = str(value).strip()
    if not s or _norm(s) in {"null", "none", "n/a", "nao informado", "nao consta", "desconhecido?"}:
        return None
    if t in ("select", "yesno"):
        return _match_option(s, fdef.get("options", []))
    if t == "date":
        return _to_date(s)
    if t == "time":
        return _to_time(s)
    if t == "number":
        return _to_number(s)
    return s[:4000]


# ── Catálogo para o prompt ────────────────────────────────────────────────────

def _describe(fid: str, fdef: dict) -> str:
    t = fdef["type"]
    desc = f"- {fid} — {fdef['label']} [{t}"
    if fdef.get("options"):
        desc += ": " + " | ".join(fdef["options"])
    desc += "]"
    if fdef.get("hint"):
        desc += f" ({fdef['hint']})"
    return desc


def build_catalog() -> str:
    lines = ["## CAMPOS SIMPLES (use em \"campos\")", "### Dados principais"]
    lines += [_describe(f"core.{fd['id']}", fd) for fd in CORE_FIELDS]
    list_lines: list[str] = []
    for sec in RAI_SECTIONS:
        simple = [fd for fd in sec["fields"] if fd["type"] != "list"]
        if simple:
            lines.append(f"### {sec['number']}. {sec['title']}")
            lines += [_describe(fd["id"], fd) for fd in simple]
        for fd in sec["fields"]:
            if fd["type"] == "list":
                list_lines.append(f"- {fd['id']} — {fd['label']} (cada item tem os subcampos):")
                list_lines += ["    " + _describe(sub["id"], sub) for sub in fd["fields"]]
    lines += ["", "## LISTAS (use em \"listas\")"] + list_lines
    return "\n".join(lines)


_SYSTEM = """Você extrai dados objetivos de documentos de investigação de ocorrências aeronáuticas
(SIPAER/CENIPA) para pré-preencher o Registro de Ação Inicial (RAI).

REGRAS OBRIGATÓRIAS
1. Extraia SOMENTE o que está escrito no documento. Nunca deduza, estime ou complete com
   conhecimento geral. Se o documento não informa, NÃO inclua o campo.
2. Para cada valor, copie em "trecho" a frase LITERAL do documento que comprova o valor
   (copie exatamente, sem resumir nem corrigir; até ~200 caracteres).
3. Use apenas os ids do catálogo. Em campos select/yesno/multi use exatamente uma das opções.
4. Datas em AAAA-MM-DD; horas em HH:MM. Se o documento indicar o fuso (UTC ou local),
   use core.time para UTC e gerais.hora_local para hora local.
5. "confianca": 0.0 a 1.0 — quão explícito o documento é sobre aquele valor.
6. Campos sobre o MOMENTO DA OCORRÊNCIA (core.flightPhase, core.time, gerais.fase_mca,
   gerais.subfase, core.obstacleType) referem-se ao instante do acidente/incidente, não a
   qualquer etapa citada. Ex.: "o mecânico acompanhou a decolagem" NÃO indica a fase da
   ocorrência; se a colisão ocorreu numa curva a baixa altura, a fase é a dessa curva.
7. Percorra o catálogo INTEIRO — dados de identificação (número de série, ano de fabricação,
   categoria, código ANAC, horas) costumam estar juntos na mesma linha do documento; extraia
   cada um no seu próprio campo.
8. Em listas, cada pessoa aparece UMA vez: junte num único item todos os dados da mesma
   pessoa e sempre preencha "nome" quando o documento o informar.
9. Em "fatos", escreva um resumo cronológico curto (até 10 linhas) apenas dos FATOS da
   ocorrência presentes neste documento (sequência do voo, eventos, consequências), sem
   análise nem causas. Se não houver fatos da ocorrência, deixe "".

Responda APENAS com JSON válido, sem markdown, neste formato:
{"campos":[{"id":"core.acRegistration","valor":"PR-AAM","trecho":"...","confianca":0.95}],
 "listas":[{"id":"tripulantes.lista","itens":[{"valores":{"nome":"...","horas_totais":"1200"},"trecho":"..."}]}],
 "fatos":"..."}"""


_CATALOG_CACHE: str | None = None


def _catalog() -> str:
    global _CATALOG_CACHE
    if _CATALOG_CACHE is None:
        _CATALOG_CACHE = build_catalog()
    return _CATALOG_CACHE


def _parse_json(raw: str) -> dict:
    s = raw.strip()
    s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s, flags=re.S)
    start, end = s.find("{"), s.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("resposta sem JSON")
    return json.loads(s[start : end + 1])


async def _ask(document_name: str, window: str, part: str) -> dict:
    user = (
        f"CATÁLOGO DE CAMPOS\n{_catalog()}\n\n"
        f"DOCUMENTO: {document_name}{part}\n<<<\n{window}\n>>>"
    )
    messages = [{"role": "system", "content": _SYSTEM}, {"role": "user", "content": user}]
    raw = await llm_service.chat_completion(messages, model=MODEL, temperature=0)
    try:
        return _parse_json(raw)
    except (ValueError, json.JSONDecodeError) as exc:
        messages += [
            {"role": "assistant", "content": raw[:2000]},
            {"role": "user", "content": f"Sua resposta não é JSON válido ({exc}). Responda somente o JSON."},
        ]
        return _parse_json(await llm_service.chat_completion(messages, model=MODEL, temperature=0))


# ── Combinação ────────────────────────────────────────────────────────────────

@dataclass
class Candidate:
    value: object
    filename: str
    quote: str
    confidence: float


@dataclass
class DocInput:
    id: int
    filename: str
    text: str


@dataclass
class Collected:
    scalars: dict[str, list[Candidate]] = field(default_factory=dict)
    lists: dict[str, list[tuple[dict, Candidate]]] = field(default_factory=dict)
    facts: list[tuple[str, str]] = field(default_factory=list)
    discarded: int = 0
    per_doc: dict[int, int] = field(default_factory=dict)


def _windows(text: str) -> list[str]:
    if len(text) <= WINDOW_CHARS:
        return [text]
    out, start = [], 0
    while start < len(text):
        out.append(text[start : start + WINDOW_CHARS])
        if start + WINDOW_CHARS >= len(text):
            break
        start += WINDOW_CHARS - WINDOW_OVERLAP
    return out


def _literal_in_text(ftype: str, raw, normalized, hay: str) -> bool:
    """O valor aparece no documento? Números aceitam separador de milhar ("4350" ↔ "4.350")."""
    if ftype in ("multi", "select", "yesno"):
        return False
    if ftype == "number":
        plain = re.sub(r"(?<=\d)[.,](?=\d{3}(?!\d))", "", hay)
        return re.search(rf"(?<![\d.,]){re.escape(str(normalized))}(?![\d])", plain) is not None
    if ftype == "date":
        return _norm(raw) in hay or any(
            _to_date(m.group(0)) == normalized for m in re.finditer(r"\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}", hay)
        )
    r = _norm(raw)
    return len(r) >= 2 and r in hay


def collect(doc: DocInput, data: dict, acc: Collected) -> None:
    """Valida a resposta do LLM para um documento e acumula os candidatos."""
    index = field_index()
    hay = _norm(doc.text)
    kept = 0

    for item in data.get("campos") or []:
        if not isinstance(item, dict):
            continue
        fid, quote = str(item.get("id", "")), str(item.get("trecho") or "")
        fdef = index.get(fid)
        if not fdef or fdef["type"] == "list":
            acc.discarded += 1
            continue
        if not quote_in_text(quote, hay):
            acc.discarded += 1
            continue
        value = normalize_value(fdef, item.get("valor"))
        if value is None:
            acc.discarded += 1
            continue
        conf = item.get("confianca")
        conf = float(conf) if isinstance(conf, (int, float)) else 0.6
        acc.scalars.setdefault(fid, []).append(Candidate(value, doc.filename, quote.strip()[:300], conf))
        kept += 1

    for lst in data.get("listas") or []:
        if not isinstance(lst, dict):
            continue
        fdef = index.get(str(lst.get("id", "")))
        if not fdef or fdef["type"] != "list":
            continue
        subdefs = {s["id"]: s for s in fdef["fields"]}
        for it in lst.get("itens") or []:
            if not isinstance(it, dict):
                continue
            quote = str(it.get("trecho") or "")
            quote_ok = quote_in_text(quote, hay)
            values = {}
            for k, v in (it.get("valores") or {}).items():
                if k not in subdefs or (nv := normalize_value(subdefs[k], v)) is None:
                    continue
                # Sem citação válida, só aceita valores que aparecem literalmente no texto.
                if not quote_ok and not _literal_in_text(subdefs[k]["type"], v, nv, hay):
                    continue
                values[k] = nv
            if not values:
                acc.discarded += 1
                continue
            if values:
                acc.lists.setdefault(fdef["id"], []).append(
                    (values, Candidate(None, doc.filename, quote.strip()[:300], 0.7))
                )
                kept += 1

    facts = str(data.get("fatos") or "").strip()
    if facts:
        acc.facts.append((doc.filename, facts))
    acc.per_doc[doc.id] = acc.per_doc.get(doc.id, 0) + kept


def _key(value) -> str:
    return _norm(json.dumps(value, ensure_ascii=False, sort_keys=True)) if isinstance(value, list) else _norm(value)


def merge(acc: Collected) -> dict:
    index = field_index()
    values: dict[str, object] = {}
    provenance: dict[str, dict] = {}
    conflicts = 0

    for fid, cands in acc.scalars.items():
        fdef = index[fid]
        if fdef["type"] == "multi":
            merged: list[str] = []
            for c in cands:
                merged += [v for v in c.value if v not in merged]
            values[fid] = [o for o in fdef.get("options", []) if o in merged]
            provenance[fid] = {"sources": [_src(c) for c in cands[:3]], "conflicts": []}
            continue
        if fdef["type"] == "textarea":
            seen, texts = set(), []
            for c in cands:
                if _key(c.value) not in seen:
                    seen.add(_key(c.value))
                    texts.append(str(c.value))
            values[fid] = "\n\n".join(texts)
            provenance[fid] = {"sources": [_src(c) for c in cands[:3]], "conflicts": []}
            continue
        groups: dict[str, list[Candidate]] = {}
        for c in cands:
            groups.setdefault(_key(c.value), []).append(c)
        ranked = sorted(groups.values(), key=lambda g: sum(c.confidence for c in g), reverse=True)
        best = ranked[0]
        values[fid] = best[0].value
        others = [
            {"value": g[0].value, "filename": g[0].filename, "quote": g[0].quote} for g in ranked[1:]
        ]
        if others:
            conflicts += 1
        provenance[fid] = {"sources": [_src(c) for c in best[:3]], "conflicts": others}

    lists: dict[str, list[dict]] = {}
    for fid, items in acc.lists.items():
        merged_items: list[dict] = []
        keys: list[str] = []
        sources: list[dict] = []
        nameless: list[dict] = []
        for vals, cand in items:
            k = _norm(vals.get("nome", ""))
            if not k:
                nameless.append(vals)
            elif k in keys:
                target = merged_items[keys.index(k)]
                for sk, sv in vals.items():
                    target.setdefault(sk, sv)
            else:
                keys.append(k)
                merged_items.append(dict(vals))
            sources.append(_src(cand))
        # Item sem nome: se só há uma pessoa identificada, é complemento dela
        # (ex.: {"funcao": "Piloto"} vindo de outro documento); senão, item próprio.
        for vals in nameless:
            if len(merged_items) == 1:
                for sk, sv in vals.items():
                    merged_items[0].setdefault(sk, sv)
            else:
                merged_items.append(dict(vals))
        lists[fid] = merged_items
        provenance[fid] = {"sources": sources[:5], "conflicts": []}

    return {"values": values, "lists": lists, "provenance": provenance, "conflicts": conflicts}


def _src(c: Candidate) -> dict:
    return {"filename": c.filename, "quote": c.quote, "confidence": round(c.confidence, 2)}


_HISTORY_SYSTEM = """Você redige a seção "1. HISTÓRICO" do Registro de Ação Inicial (RAI) do CENIPA.

Estilo (exemplo real):
"A aeronave decolou do Aeródromo Santa Genoveva (SBGO), Goiânia, GO, com destino ao Aeródromo
de Tefé (SBTF), AM, por volta das 11h45min (UTC), a fim de transportar carga e pessoal, com dois
pilotos e dez passageiros a bordo.
Com cerca de vinte minutos de voo, a aeronave apresentou oscilação na indicação da pressão do
óleo do motor. (...)
A aeronave teve danos leves.
Os ocupantes saíram ilesos."

Estrutura obrigatória:
1º parágrafo: "A aeronave decolou de/da <local>, <município>, <UF>, por volta das <hora> (UTC),
   a fim de <finalidade do voo>, com <ocupantes> a bordo." (omita o que não for informado)
Parágrafos seguintes: a sequência de eventos do voo até a ocorrência e a parada da aeronave.
Penúltimo: "A aeronave teve danos <leves/substanciais/destruída>."
Último: as lesões dos ocupantes (ex.: "O piloto sofreu lesões fatais.").

Regras:
- Use SOMENTE os fatos fornecidos; terceira pessoa, impessoal, pretérito.
- NÃO inclua manutenção, inspeções, certificados, licenças, experiência ou dados cadastrais —
  isso pertence a outras seções do RAI. Narre só o voo e suas consequências.
- Sem análise, causas, hipóteses, opiniões ou nomes de pessoas.
- Para hora, local, aeronave, danos e lesões, use os DADOS CONSOLIDADOS (eles já resolvem as
  divergências entre documentos); não use valores divergentes de um depoimento isolado.
Responda só o texto, sem título."""


async def write_history(facts: list[tuple[str, str]], consolidated: dict | None = None) -> str:
    if not facts:
        return ""
    body = "\n\n".join(f"[{name}]\n{text}" for name, text in facts)[:30_000]
    if consolidated:
        lines = [f"- {k}: {v}" for k, v in consolidated.items() if v not in (None, "", [])]
        body = "DADOS CONSOLIDADOS:\n" + "\n".join(lines) + "\n\nFATOS POR DOCUMENTO:\n" + body
    try:
        return (await llm_service.chat_completion(
            [{"role": "system", "content": _HISTORY_SYSTEM}, {"role": "user", "content": body}],
            model=MODEL, temperature=0.2,
        )).strip()
    except Exception:
        logger.exception("Falha ao redigir o histórico")
        return ""


async def analyze(docs: list[DocInput], progress) -> dict:
    """Executa a análise completa. `progress(done, total, label)` é aguardado a cada passo."""
    jobs: list[tuple[DocInput, str, int, int]] = []
    for d in docs:
        wins = _windows(d.text)
        jobs += [(d, w, i, len(wins)) for i, w in enumerate(wins)]
    total = len(jobs) + 1  # +1: redação do histórico
    acc = Collected()
    errors: list[str] = []
    done = 0
    sem = asyncio.Semaphore(CONCURRENCY)
    lock = asyncio.Lock()

    async def run(doc: DocInput, window: str, i: int, n: int) -> None:
        nonlocal done
        part = f" (parte {i + 1} de {n})" if n > 1 else ""
        async with sem:
            try:
                data = await _ask(doc.filename, window, part)
                # Valida trechos contra o documento inteiro (a citação pode cruzar janelas).
                collect(doc, data, acc)
            except Exception as exc:
                logger.warning("Extração falhou em %s%s: %s", doc.filename, part, exc)
                errors.append(f"{doc.filename}{part}: falha na análise")
        async with lock:
            done += 1
            await progress(done, total, f"{doc.filename}{part}")

    await asyncio.gather(*(run(*j) for j in jobs))

    await progress(done, total, "Redigindo o histórico")
    result = merge(acc)
    v = result["values"]
    consolidated = {
        "data": v.get("core.date"), "hora (UTC)": v.get("core.time"), "hora local": v.get("gerais.hora_local"),
        "local": v.get("core.aerodrome"), "município": v.get("core.municipality"), "UF": v.get("core.uf"),
        "aeronave": " ".join(str(v.get(k, "")) for k in ("core.acManufacturer", "core.acModel", "core.acRegistration")).strip(),
        "operação": v.get("core.acOperation"), "fase do voo": v.get("core.flightPhase"),
        "danos": v.get("core.acDamage"),
        "lesões tripulantes (fatal/grave/leve/ileso)": "/".join(str(v.get(f"core.crew{k}", "0")) for k in ("Fatal", "Serious", "Minor", "None")),
        "lesões passageiros (fatal/grave/leve/ileso)": "/".join(str(v.get(f"core.pax{k}", "0")) for k in ("Fatal", "Serious", "Minor", "None")),
    }
    history = await write_history(acc.facts, consolidated)
    if history:
        result["values"]["core.narrative"] = history
        result["provenance"]["core.narrative"] = {
            "sources": [{"filename": name, "quote": "", "confidence": None} for name, _ in acc.facts[:5]],
            "conflicts": [],
            "generated": True,
        }
    await progress(total, total, "Concluído")

    filled = len(result["values"]) + sum(len(v) for v in result["lists"].values())
    result["stats"] = {
        "filled": filled,
        "conflicts": result.pop("conflicts"),
        "discarded": acc.discarded,
        "errors": errors,
        "perDocument": {str(k): v for k, v in acc.per_doc.items()},
    }
    return result
