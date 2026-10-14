# LexForge™

**ARC-LXF-001 | Archer Chain Analytics | ISC: 102237785**

> *Sovereignty // Integrity // Inexorabilis*

LexForge™ renders jurisdiction- and language-specific legal document templates, fingerprints **every** output with AcerbE™ (hard gate), records the delivery in an append-only, hash-chained audit log, serves the stamped files through signed expiring links, and anchors each delivery on the XRP Ledger.

---

## Document Matrix

| Axis | Count | Values |
|------|-------|--------|
| Document Types | 19 | SLA, MSA, NDA, ICA, EUA, TOS, PP, RPA, LOI, MOU, IP, ESA, PSA, DPA, WA, LIC, PAR, CES, INV |
| Jurisdictions | 7 | CA, US, EU, UK, BR, AE, SG |
| Languages | 7 | EN, FR, DE, PT, ES, AR, ZH |
| **Template slots** | **931** | 19 × 7 × 7 |

A slot only sells if its template is **populated**. A file under `MIN_TEMPLATE_BYTES` (default 400) is an empty stub and is refused at delivery time (`422 TEMPLATE_NOT_POPULATED`). Check coverage with `node scripts/validateTemplates.js --by-jurisdiction`.

## What is actually sellable (sell-gate)

`node scripts/validateTemplates.js` prints **Sellable now**. As of this commit: **115 of 931** slots.

| Slot | Status | Why |
|---|---|---|
| EN × 16 documents × 7 jurisdictions | sellable | generated English text, jurisdiction rules applied (thin, ~2.5 KB; counsel review required) |
| CA/EN × all 19 documents | sellable | hand-written, full-length |
| FR / DE / PT / ES / AR / ZH (any) | **refused** `422 TEMPLATE_NOT_SELLABLE` | the files are English copies with a changed `Language:` label, not translations |
| PSA / CES / INV outside CA | **refused** | generated as Professional Services / Consulting / Investment agreements, not Product Sale / Cease & Desist / Invoice |

The gate runs before AcerbE is called. Change it with `SELLABLE_LANGUAGES` and `RESTRICTED_DOCUMENTS` once real translations or correct generators exist.
`ALLOW_EN_FALLBACK` now defaults to `false` — a buyer who asked for Arabic must not silently receive English.

---

## Pipeline

```
RaPaX™ ──POST /webhook/lexforge (HMAC over raw body)──▶ LexForge™
   1. validate request (ids, codes, variables)             → 400 / 401 / 503
   2. idempotency: same transaction + same request         → replay (new links, no re-stamp)
                   same transaction + different request    → 409
   3. render ALL documents (EN fallback if locale missing) → 422 on stub / unresolved (strict)
   4. validate renders (non-empty, disclaimer, no {{raw}}) → 422
   5. AcerbE™ /fingerprint on EVERY document               → 502 (fail-closed, nothing delivered)
   6. bundle zip of the stamped files + MANIFEST.json
   7. append SUCCESS row to the audit log (SHA-256 chained)  ← before any link leaves the process
   8. signed, expiring download links returned to RaPaX™
   9. XRPL anchor (async queue, retried) → GET /status/:txid shows PENDING → ANCHORED
```

Any failure before step 7 deletes every file produced in that attempt and appends a `FAILED` audit row. A later retry of the same `transaction_id` is recorded as `attempt 2`.

**Co-location requirement.** AcerbE™'s `/fingerprint` takes a *file path* and returns a *file path*, so LexForge™ and AcerbE™ must share a filesystem (same container or same machine). `deploy/start.sh` runs both; AcerbE™ listens on loopback only.

---

## API

### `POST /webhook/lexforge`

```
Content-Type: application/json
x-rapax-signature: sha256=<hex HMAC-SHA256(RAPAX_WEBHOOK_SECRET, raw request body)>
```

```json
{
  "transaction_id": "TXN-20261014-ABC123",
  "buyer_wallet": "rXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "jurisdiction": "CA",
  "language": "EN",
  "document_codes": ["NDA", "TOS"],
  "variables": { "DISCLOSING_PARTY_NAME": "Acme Corp", "RECEIVING_PARTY_NAME": "Example Inc" }
}
```

`document_code` (single string) is still accepted. `transaction_id` must match `[A-Za-z0-9._-]{1,64}`. `variables` keys are `A-Z0-9_`, values string/number ≤ 2000 chars. `TRANSACTION_ID`, `BUYER_WALLET`, `JURISDICTION`, `LANGUAGE`, `DOCUMENT_TITLE` and `ISSUED_BY` are set by LexForge™ and cannot be overridden. `EFFECTIVE_DATE` may be overridden (`YYYY-MM-DD`).

**200**

```json
{
  "delivered": true,
  "replayed": false,
  "transaction_id": "TXN-20261014-ABC123",
  "fingerprint_id": "…first document…",
  "download_url": "/download/<token>",
  "documents": [{ "document_code": "NDA", "filename": "…", "sha256": "sha256:…", "fingerprint_id": "…",
                  "language_used": "EN", "language_fallback": false, "unresolved_fields": [], "download_url": "/download/<token>" }],
  "bundle": { "filename": "…_LexForge_bundle.zip", "sha256": "sha256:…", "download_url": "/download/<token>" },
  "expires_in": 3600,
  "xrpl_anchor": "PENDING",
  "xrpl_tx_hash": null
}
```

`xrpl_anchor` is `PENDING`, `ANCHORED` or `DISABLED`. `download_url` is the bundle when several documents were requested.

**Errors** — `{ "delivered": false, "code": "...", "error": "..." }`

| HTTP | code | Meaning |
|------|------|---------|
| 400 | — | Invalid body / ids / codes / variables |
| 401 / 503 | — | Bad signature / no secret configured |
| 409 | `TRANSACTION_CONFLICT` | `transaction_id` already delivered with different parameters |
| 413 | — | Body over 256 KB |
| 422 | `TEMPLATE_NOT_POPULATED`, `TEMPLATE_NOT_FOUND`, `UNRESOLVED_PLACEHOLDERS`, `VALIDATION_FAILED` | Nothing delivered |
| 502 | `ACERBE_FAILED` | Fingerprint gate failed — nothing delivered |
| 500 | `INTERNAL`, `DELIVERED_FILES_MISSING` | See audit log |

### `GET /download/:token`
Signed, expiring (`DOWNLOAD_LINK_TTL`) link to a **stamped** file. `404` tampered/unknown, `410` expired.

### `GET /status/:txid`
Header `x-rapax-signature: sha256=<HMAC(secret, "GET /status/<txid>")>`. Returns status, fingerprints and XRPL anchor state.

### `GET /health` · `GET /ready`
`/health` is liveness. `/ready` is `200` only when the audit DB, AcerbE™ (with real keys), templates and secrets are all OK, and reports XRPL backlog and template coverage.

---

## Setup

### Requirements
Node ≥ 22.13 (built-in `node:sqlite`, no native build step — works on Termux/ARM64). Python 3.9+ with `cryptography Pillow pikepdf lxml` for AcerbE™.

### Local / Termux

```bash
pkg install nodejs python          # Termux
npm ci
cp .env.example .env               # fill every secret; generate with: openssl rand -hex 32
npm test                           # 19 pipeline tests (mock AcerbE) — no Python needed
ACERBE_DIR=/path/to/acerbe npm run test:integration   # real AcerbE engine
```

Run both services together: `bash deploy/start.sh` (needs `DATA_DIR`, `ACERBE_API_KEY`, `ACERBE_SECRET_KEY`, `ACERBE_REGISTRY_KEY`, `RAPAX_WEBHOOK_SECRET`, `DOWNLOAD_SIGNING_SECRET` in the environment; AcerbE sources in `./acerbe` or `ACERBE_SRC`). On Android, long-running processes need `termux-wake-lock` and battery optimisation disabled for Termux.

### Railway (Dockerfile)
1. Deploy from a **private** repo that contains `acerbe/` (`acerbe_engine.py`, hardened `server.py`, `requirements.txt`). Never put the AcerbE™ engine in a public repo.
2. Attach a **volume** mounted at `/data` and set `DATA_DIR=/data/lexforge`. Without it the audit log, delivered files **and the AcerbE™ forensic registry** are wiped on every redeploy.
3. Set the variables from `.env.example`, plus `ACERBE_SECRET_KEY` (≥32 chars) and `ACERBE_REGISTRY_KEY` (≥16 chars). Back these keys up: without them the registry cannot identify a pirated copy.
4. Health-check path: `/ready`. RaPaX™ calls LexForge™ over Railway private networking with the shared webhook secret.

> If the volume is not writable by the non-root `node` user, set `RAILWAY_RUN_UID=0`.

### Operations
```bash
npm run audit:verify                       # recompute both hash chains; exit 1 if altered
node scripts/validateTemplates.js --by-jurisdiction
```

---

## Template Variables

| Variable | Source |
|----------|--------|
| `{{TRANSACTION_ID}}`, `{{BUYER_WALLET}}`, `{{JURISDICTION}}`, `{{LANGUAGE}}`, `{{DOCUMENT_TITLE}}`, `{{ISSUED_BY}}` | Set by LexForge™ (locked) |
| `{{EFFECTIVE_DATE}}` | Today (UTC), overridable |
| `{{NAME\|default}}` | Value if supplied, otherwise the default |
| anything else | From `variables`. Missing → visible blank `[NAME: ________]` (`PLACEHOLDER_MODE=fill`, default) or `422` (`strict`). Unresolved names are returned in `unresolved_fields` and stored in the audit log. |

Templates live at `templates/{DOC_CODE}/{JURISDICTION}/{LANGUAGE}.md`.

---

## Document Registry

| Code | Document | Folder |
|------|----------|--------|
| SLA | Service Level Agreement | 01-SLA |
| MSA | Master Service Agreement | 02-MSA |
| NDA | Non-Disclosure Agreement | 03-NDA |
| ICA | Independent Contractor Agreement | 04-ICA |
| EUA | End User License Agreement | 05-EUA |
| TOS | Terms of Service | 06-TOS |
| PP | Privacy Policy | 07-PP |
| RPA | Revenue / Profit Share Agreement | 08-RPA |
| LOI | Letter of Intent | 09-LOI |
| MOU | Memorandum of Understanding | 10-MOU |
| IP | IP Assignment Agreement | 11-IP |
| ESA | Employment / Services Agreement | 12-ESA |
| PSA | Product / Software Sale Agreement | 13-PSA |
| DPA | Data Processing Agreement | 14-DPA |
| WA | Warranty Agreement | 15-WA |
| LIC | Software License Agreement | 16-LIC |
| PAR | Partnership Agreement | 17-PAR |
| CES | Cease & Desist Letter | 18-CES |
| INV | Invoice / Payment Terms | 19-INV |

---

## Jurisdiction Registry

| Code | Jurisdiction |
|------|--------------|
| CA | Canada (federal + Saskatchewan default) |
| US | United States (federal baseline) |
| EU | European Union (GDPR-compliant) |
| UK | United Kingdom (post-Brexit) |
| BR | Brazil (LGPD-compliant) |
| AE | United Arab Emirates (DIFC/ADGM-aware) |
| SG | Singapore (PDPA-compliant) |

---

## Security Notes

- HMAC webhook signature is verified over the **raw request bytes**; with no secret configured the endpoint refuses everything (fail-closed)
- AcerbE™ fingerprint is a mandatory hard gate — any failure blocks delivery and removes every file produced for that attempt
- Only **stamped** files are ever served, through signed, expiring tokens; the raw render is never reachable
- XRPL anchoring runs after the delivery commit, is queued and retried, and never un-delivers a document
- The buyer wallet is hashed before it is written to the public ledger
- No credentials in source code; all secrets via environment variables
- Structured logging only — zero `console.*` in production

---

## Legal Disclaimer

All documents generated by LexForge™ are AI-generated drafts only and do not constitute legal advice. Every rendered document carries a disclaimer to this effect. Users must obtain independent legal advice from a qualified lawyer before relying on any document.

---

## Ownership

```
Owner:    Neil Scott Archer
Business: Archer Chain Analytics (Sole Proprietor)
ISC:      102237785
CRA BN:   709110639
Address:  417 Avenue G S, 5th Ave N, Saskatoon, SK S7M 1V5
Email:    archerchainanalytics@gmail.com
Website:  mahihkan.com
```

(c) 2026 Neil Scott Archer / Archer Chain Analytics | ISC: 102237785

*Sovereignty // Integrity // Inexorabilis*
