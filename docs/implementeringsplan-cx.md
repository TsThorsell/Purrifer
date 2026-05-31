# Implementeringsplan för Cx: Purrifer V1

## 1. Syfte
Den här planen styr Cx:s implementation så att vi levererar stabilt enligt projektets principer:
- lokal-först
- slice-baserad modulär monolit
- hårda kontrakt mellan lager
- React som UI-yta, inte sanningslager
- ingen bred refaktor utan uttryckligt uppdrag

## 2. Strategisk riktning
Vi implementerar i smala, beslutstäta uppdrag med tydliga gränser:
1. Fixa teknisk grund (SQLite/Electron-kompatibilitet).
2. Fortsätt med prioriterade slices enligt backlog.
3. Behåll strikt arkitekturdisciplin och testbarhet i varje steg.

## 3. Arkitekturregler (obligatoriska)
1. Renderer får inte prata direkt med databas, filsystem eller Python.
2. All bro till appkärnan går via preload-kontrakt.
3. Electron main äger lokala capabilities och Python-process.
4. Slice-ansvar hålls separerat; inga sidoutökningar i andra moduler.
5. `schema_version` är enda sanningskälla för DB-migreringar.
6. Ingen fallback till JSON som primär produktionslagring.

## 4. Nuvarande lägesbild
- Kärnslices finns: `shell-core`, `document-inbox`, `document-review`, `entity-registry`, `invoice-and-payment`, `voucher-and-proof`.
- Startup-felet från `node:sqlite` är hanterat via migration till `better-sqlite3` + native rebuild-rutin.
- Arkitekturtester passerar.

## 5. Genomförandeordning (nästa steg)
1. **Stabiliseringssteg efter SQLite-fix**
   - Säkerställ deterministisk native rebuild i dev-kedjan.
   - Dokumentera exakt körväg för miljöer där `npm run` är begränsat.

2. **Ny slice: obligations-and-cases**
   - Leverera kärnobjekt: åtagande, ärende, avvikelseärende, checklista.
   - Leverera statusflöden: nytt/utkast/väntar/klart/inkomplett accepterat/arkiverat.
   - Leverera regler för försenat/avvikande på v1-nivå.

3. **Ny slice: search-and-index**
   - Mastersearch över dokumenttext + metadata + nyckelfält.
   - Gruppindelade träffar per objekttyp.
   - Rebuild-index lokalt.

4. **Ny slice: reports-lite**
   - Minst: transaktionsjournal, balansöversikt, budget mot utfall.
   - Drilldown från rapport till underlag för minst ett flöde.

## 6. Smalt uppdragsformat för Cx (standard)
Varje uppdrag ska innehålla:
1. Mål
2. Slice/område
3. Filer att läsa
4. Filer som får röras
5. Filer som inte får röras
6. Krav
7. Tester/verifiering
8. Slutrapport

## 7. Kvalitetsgrindar per uppdrag
Ett uppdrag är inte klart förrän:
1. Endast tillåtna filer ändrade.
2. Inga otillåtna lagerbrott introducerade.
3. Relevanta tester är gröna.
4. Arkitekturtester är gröna.
5. Slutrapport är komplett och spårbar.

## 8. Teststrategi (v1)
Miniminivå per leverans:
- Arkitekturtester (`tests/architecture/*.test.mjs`)
- Slice-nära funktionstester där relevant
- Smoke i appen för berörda flöden

Vid kritiska kedjor (inbox → verifikat → faktura/betalning):
- Verifiera att data sparas korrekt i SQLite
- Verifiera att statusar uppdateras korrekt
- Verifiera att UI endast nyttjar kontrakt via preload

## 9. UI-strategi för projekthanteringskänsla
UI ska stödja operativ handling:
- Landningsyta med “att agera nu”, “försenat”, “saknar underlag”, “pågående jobb”, “deadlines”.
- Tydlig statuskodning och snabb drilldown till beviskedja.
- Konsistenta tabellmönster och filtermönster enligt gemensamt designsystem.
- Ingen redesign utan explicit uppdrag.

## 10. Risker och hantering
1. **Native ABI-friktion vid Electron-uppgradering**
   - Åtgärd: rebuild-rutin obligatorisk efter versionsbyte.

2. **Scope creep mellan slices**
   - Åtgärd: hårda “får/får inte röra”-listor i varje uppdrag.

3. **Arkitekturdrift över tid**
   - Åtgärd: arkitekturtester som gate i varje leverans.

## 11. Krav på slutrapport från Cx
Cx ska alltid rapportera:
1. Ändrade filer
2. Vad som ändrats per fil
3. Exakta kommandon + utfall
4. Kvarvarande risker
5. Bekräftelse att inga otillåtna moduler ändrats

## 12. Standard förbud (gäller alltid Cx)
- Ingen bred refaktor.
- Ingen redesign.
- Ingen ändring i andra moduler utan uttryckligt uppdrag.
- Ingen opportunistisk “städning” utanför scope.
