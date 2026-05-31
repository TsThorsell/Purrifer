# PRD: Engångsmigrering via AI-Preprocess till Purrifer

## 1. Produktöversikt

### 1.1 Namn
- `Purrifer One-Time Bootstrap Pipeline`

### 1.2 Syfte
Bygga ett säkert, lokalt och spårbart engångsflöde som tar råfiler (PDF, bilder, CSV/XLSX, mail-exporter), låter en AI-baserad preprocess normalisera datat enligt ett fördefinierat recept, och importerar resultatet till Purrifer med minimal manuell hantering.

### 1.3 Problem
Manuell fil-för-fil-import är orimligt tidskrävande för historisk grunddata. Samtidigt saknas API-access till externa system. Vi behöver därför en filbaserad engångsmigrering som ändå ger hög datakvalitet och full spårbarhet.

## 2. Mål och avgränsning

### 2.1 Mål
- Minska manuellt arbete med minst 70% jämfört med ren manuell import.
- Importera historisk grunddata från filer till Purrifer på ett kontrollerat sätt.
- Säkerställa spårbarhet från råfil till slutobjekt (`Dokument`, `Verifikat`, `Leverantörsfaktura`, `Betalhändelse`, `Åtagande`/`Ärende` där relevant).
- Möjliggöra manuell granskning endast för avvikelser/låg konfidens.
- Designa importkontraktet så samma format kan återanvändas senare för löpande importflöden.

### 2.2 Icke-mål
- Ingen liveintegration mot bank/mail API.
- Ingen full autonom bokföring utan mänsklig kontroll.
- Ingen mobil eller cloud-first drift.
- Ingen total ersättning av ordinarie ingestflöden för framtida löpande data i denna fas.

## 3. Användare
- Primärt: huvudanvändaren av Purrifer (single-user first).
- Sekundärt: stödperson som hjälper vid granskning av avvikelser.

## 4. Domänram (ordlista)
Flödet måste använda befintlig domänvokabulär konsekvent:
- `Entitet`, `Konto`, `Dokument`, `Verifikat`, `Leverantörsfaktura`, `Betalhändelse`, `Transaktionsunderlag`, `Åtagande`, `Ärende`, `Avvikelseärende`.

## 5. Lösningsöversikt

Lösningen består av fyra steg:
1. **Råzonsinsamling**: filer samlas lokalt i källmappar.
2. **AI-preprocess (offline)**: råfiler tolkas och normaliseras till canonical importformat.
3. **Stage-import i Purrifer**: schema- och kvalitetsvalidering, dedupe, referenskontroll.
4. **Commit-import i Purrifer**: godkända poster skrivs till skarpa objekt; avvikelser går till granskningskö.

## 6. Funktionella krav

### 6.1 Råzonsinsamling
- Användaren ska kunna ange en eller flera lokala källmappar.
- Varje fil ska få källmetadata (källa, upptäcktstid, filtyp, hash).
- Identiska filer ska kunna identifieras via hash för dedupe.

### 6.2 Canonical importkontrakt
AI-preprocess ska skriva till ett versionssatt canonical format med separata record-typer för:
- `document_record`
- `payment_event_record`
- `supplier_invoice_record`
- `voucher_link_record`
- `entity_reference_record` / `account_reference_record` (vid behov)

Varje record ska innehålla:
- `source_file_id`
- `record_id`
- domänfält
- `confidence_score` (0-1)
- `review_flags[]`
- `extraction_notes`

### 6.3 Kontraktsåteranvändning (framtida löpande import)
Importkontraktet ska designas som en stabil produktionsyta, inte en engångsartefakt.

Krav för återanvändning:
- Versionsfält (`schema_version`) är obligatoriskt på batch- och recordnivå.
- Bakåtkompatibla ändringar ska stödjas (nya frivilliga fält får inte bryta äldre importer).
- Okända fält ska kunna ignoreras säkert vid import.
- Record-typer och fältnamn ska följa domänordlistan och vara långsiktigt stabila.
- `source_system`, `source_exported_at` och `ingest_batch_id` ska finnas för framtida fler-källsflöden.
- Kontraktsvalidering ska vara fristående så samma valideringsregler kan användas i både engångs- och löpande import.

### 6.4 AI-preprocess
- Ska kunna köras batchvis offline/lokalt.
- Ska följa ett fördefinierat recept per filtyp/källa.
- Ska aldrig skriva direkt till Purrifers skarpa datalager.
- Ska markera osäkra tolkningar med flaggor, inte gissa tyst.

### 6.5 Stage-import i Purrifer
- Validera schema och obligatoriska fält.
- Validera referenser mot kända `Entitet`/`Konto` när sådana krävs.
- Köra dedupe på recordnivå och dokumenthash.
- Skapa importstatus per record:
  - `ready`
  - `needs-review`
  - `rejected`

### 6.6 Granskningsyta
- Visa endast records som kräver manuell åtgärd.
- Tillåt bulk-beslut för liknande poster.
- Tillåt korrigering och godkännande.
- Tillåt markering `inkomplett men accepterad` där det är affärsmässigt rimligt.

### 6.7 Commit-import
- Endast `ready` och manuellt godkända records får committas.
- Commit ska skapa/uppdatera relevanta domänobjekt.
- Skapa länkar i beviskedjan (`Dokument` -> `Verifikat` -> relaterade objekt) när data finns.

### 6.8 Spårbarhet och audit
- För varje committat objekt ska det finnas spår till:
  - råfil
  - preprocess-record
  - eventuell manuell korrigering
  - commit-tid

## 7. Icke-funktionella krav

### 7.1 Lokal-först
- Hela pipeline ska kunna köras utan internetkoppling efter att verktyg är installerade.

### 7.2 Prestanda
- Batch på minst 5 000 records ska kunna preprocessas och stage-valideras utan appkrasch.

### 7.3 Robusthet
- Enskilda felaktiga records får inte stoppa hela batchen.
- Pipeline ska vara återstartbar utan dubbelimport av redan committade records.

### 7.4 Säkerhet
- Ingen extern API-åtkomst krävs.
- Rådata och mellanformat ska lagras lokalt.

## 8. Beslutade implementationprinciper
- Tvåstegsimport (`stage` -> `commit`) är obligatorisk.
- AI används för extraktion/förslag, aldrig för tyst slutbeslut.
- Review prioriterar avvikelser framför full manuell genomgång.
- Canonical format ska vara versionssatt från start (`schema_version`).

## 9. User stories
1. As a user, I want to import entire folders of historical files, so that I avoid file-by-file handling.
2. As a user, I want AI to pre-structure records, so that I only review uncertain cases.
3. As a user, I want strict validation before commit, so that bad records do not pollute core data.
4. As a user, I want dedupe protection, so that duplicate files and records are not imported twice.
5. As a user, I want traceability from source file to final object, so that I can trust auditability.
6. As a user, I want batch approve/edit actions, so that I can resolve migration queues quickly.
7. As a user, I want commit to create linked domain objects, so that Purrifer starts with usable operational data.
8. As a user, I want the same import contract to work for future recurring imports, so that we avoid one-off migration logic.

## 10. Acceptanskriterier
- En full testbatch kan köras från råfiler till committade objekt utan manuell handpåläggning på records med hög konfidens.
- Minst 70% av records hamnar i `ready` utan manuell korrigering (mål för första körningen).
- Alla `needs-review` records är synliga i granskningsyta med tydlig orsak.
- Stickprov visar spårbarhet i hela kedjan för committade records.
- Ingen dubbelimport vid omkörning av samma batch.
- Samma kontraktsvaliderare kan användas oförändrat för en senare löpande importbatch.

## 11. Teststrategi
- Kontraktstester för canonical schema.
- Kompatibilitetstester för versionshantering (nuvarande schema + äldre schema-version).
- Valideringstester för stage-regler.
- Integrations-/beteendetester för stage->commit.
- Regressionssmoke för att säkerställa att befintliga slices inte bryts.
- Kvalitetsmätning: precision/recall-liknande indikatorer på AI-preprocess mot manuellt facit-stickprov.

## 12. Risker och mitigering
- **Risk:** Felklassificering av AI i stor batch.
  - **Mitigering:** Confidence + review flags + stage gate.
- **Risk:** Svag kategorimappning tidigt.
  - **Mitigering:** Regelpaket och manuell override i review.
- **Risk:** För hög manuell kö.
  - **Mitigering:** Bulk actions + regelreplay + förbättrat preprocess-recept.
- **Risk:** Engångskontrakt blir teknisk återvändsgränd.
  - **Mitigering:** Versionssatt, bakåtkompatibelt canonical kontrakt med återanvändbar validering.

## 13. Utrullning
1. Pilotbatch (1 källa, begränsat datumintervall).
2. Justera recept/regler efter pilotutfall.
3. Full engångsmigrering källa för källa.
4. Post-migration avstämning och stängning av migreringskö.
5. Verifiera att samma kontrakt kan användas på en ny liten “löpande” testbatch.

## 14. Out of scope (denna PRD)
- Löpande realtidsintegration med banker/mail.
- Avancerad fulltext-rankning eller autonoma beslut utan review.
- Full bokföringsmotor.
