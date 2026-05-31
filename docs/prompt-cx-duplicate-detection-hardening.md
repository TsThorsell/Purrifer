# Prompt till Cx: Duplicate Detection Hardening (Bootstrap Pipeline)

Du arbetar nu med ett smalt, fristående uppdrag i Purrifer.

## Kontext
- Engångsmigrering från blandade källor (CSV/XLSX, PDF/bilder, mail-exporter).
- Målet är **superb duplicate detection** innan stage/commit.
- Detta är en vertikal slice: data + API + UI + test.

Källor:
- `C:\Dev\Purrifer\docs\prd-one-time-bootstrap-pipeline.md`
- `C:\Dev\Purrifer\docs\bootstrap-pipeline-issues.md`

## Uppdrag
Implementera en robust dedupe-motor för bootstrapflödet med lagerindelad duplicate detection.

### Obligatoriska dedupe-lager
1. **Filnivå (raw ingest)**
- SHA-256 på filbytes som primär dedupe-signal.
- Markera `exact duplicate` inom batch och mellan batcher.
- Idempotens: om samma batch körs om, inga nya raw-poster för samma hash.

2. **Dokumentnivå (near-duplicate stöd)**
- Textfingerprint från extraherad text (normaliserad: lowercase, whitespace-normalisering, bort med trivial punctuation).
- För bild/PDF: enkel perceptual-lik signal (om full pHash är för tungt nu, börja med robust fallbackfingerprint och tydlig TODO-markering).
- Klassificera kandidat som `probable duplicate` när signaler är nära men inte exakta.

3. **Transaktionsnivå**
- Deterministisk transaktionsnyckel: datum + belopp + valuta + motpart/referens.
- Toleransfönster för datum (konfigurerbart default ±1 dag).
- Klassificera `exact` vs `probable` med tydlig regel.

4. **Objektnivå (faktura/betalning/verifikat där data finns)**
- Fakturasignatur: leverantör + fakturanummer + belopp + förfallodatum.
- Betalningssignatur: datum + belopp + mottagare + referens.
- Verifikatsignatur: kopplade underlag + beloppssignatur.

## Domänutfall (måste finnas)
Varje candidate ska få en av:
- `unique`
- `exact_duplicate`
- `probable_duplicate`

Och metadata:
- `duplicate_reason_codes[]`
- `matched_record_ids[]`
- `confidence_score` (för probable-fall)

## UI-krav
- I bootstrap-intake/review-ytan: visa dedupe-status per post.
- Visa varför posten markerats som duplikat (reason codes).
- Låt användaren filtrera på `exact/probable/unique`.

## API/kontrakt
- Utöka bootstrap-kontrakt med dedupe-resultatfält.
- Lägg till endpoint/anrop för att köra dedupe-analys på batch.
- Säkerställ bakåtkompatibilitet (nya fält får inte bryta äldre payloads).

## Scope-regler
### Får röras
- `src/features/bootstrap-intake/**`
- `src/app/shared/storage/SqliteDatabase.ts` (om migration behövs)
- `src/main/index.ts`
- `src/preload/index.ts`
- `src/renderer/types/purrifer.d.ts`
- relevanta tester under `tests/architecture/**`

### Får INTE röras
- `src/features/document-inbox/**`
- `src/features/document-review/**`
- `src/features/voucher-and-proof/**`
- `src/features/invoice-and-payment/**` (förutom read-only beroende vid signaturberäkning om absolut nödvändigt)
- `src/features/obligations-and-cases/**`
- `src/features/search-and-index/**`
- `src/features/reports-lite/**`
- `src/renderer/styles/**`

Ingen bred refaktor. Ingen redesign.

## Acceptanskriterier
1. Exakta filduplikat blockeras deterministiskt inom och mellan batcher.
2. Near-duplicate-fall hamnar i `probable_duplicate` med reason codes.
3. Transaktionsduplikat fångas med deterministisk nyckel + datumtolerans.
4. UI visar status + orsaker + filter på dedupe-klass.
5. Omkörning av samma batch är idempotent (ingen dubbelimport).

## Verifiering
Kör och redovisa:
- `C:\Program Files\nodejs\node.exe --test tests/architecture/*.test.mjs`
- Dev-smoke med logg (`scripts\dev.cmd`)
- Kontroll att inga regressioner återkommer:
  - `node:sqlite`
  - cache access denied
  - blank-window

Lägg till minst ett nytt beteendetest som verifierar:
- exact duplicate detection
- probable duplicate classification
- idempotent replay

## Slutrapport (obligatorisk)
1. Ändrade filer
2. Vad som ändrats per fil
3. Exakta kommandon
4. Testutfall
5. Kvarvarande risker
6. Bekräftelse att inga otillåtna moduler ändrats
