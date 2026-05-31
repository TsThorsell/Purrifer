# Post-v1 Issues (Vertical Slices)

Label for all issues: `ready-for-agent`

## Issue 1
**Title:** Innehavsgrund: Innehav + Händelse + Tidslinje (MVP)  
**Type:** AFK

### What to build
Inför en första vertikal slice för Innehav där användaren kan skapa och följa innehav via händelser i en tidslinje. Flödet ska vara lokalt, manuellt granskningsbart och spårbart från UI till lagring.

### Acceptance criteria
- Användaren kan skapa Innehav och lägga till Händelser med datum och belopp/värde.
- Tidslinje visas per Innehav och uppdateras konsekvent efter ändringar.
- Funktionaliteten är testad end-to-end via slice-kontrakt och verifierbar i UI.

### Blocked by
None - can start immediately

---

## Issue 2
**Title:** Kapitalflöden mellan Entiteter: interna lån, tillskott, överföringar  
**Type:** AFK

### What to build
Inför en vertikal slice för kapitalflöden mellan Entiteter med spårbara poster för interna lån, tillskott och interna överföringar, inklusive koppling till berörda Entiteter.

### Acceptance criteria
- Användaren kan registrera kapitalflöde mellan två Entiteter med typ och belopp.
- Flödena visas i entitetsnära översikt med tydlig motpart.
- Flöden kan återfinnas via sök/visning och är persistenta.

### Blocked by
Issue 1

---

## Issue 3
**Title:** Importer MVP för Transaktionsunderlag (CSV/XLSX) med validering  
**Type:** AFK

### What to build
Inför en vertikal importer-slice för Transaktionsunderlag (CSV/XLSX) med grundvalidering, felåterkoppling och lokalt sparat råunderlag för fortsatt granskning.

### Acceptance criteria
- Användaren kan importera CSV/XLSX och få validerad preview.
- Felaktiga rader flaggas tydligt utan att krascha flödet.
- Underlaget sparas lokalt och är tillgängligt för nästa granskningssteg.

### Blocked by
None - can start immediately

---

## Issue 4
**Title:** Importgranskning med manuell mappning till Entitet/Konto/objekttyp  
**Type:** AFK

### What to build
Inför ett granskningssteg där importerat Transaktionsunderlag mappas manuellt till Entitet, Konto och objekttyp innan commit, i linje med manuell-först-principen.

### Acceptance criteria
- Användaren kan mappa rader till Entitet/Konto/objekttyp innan commit.
- Commit skapar spårbara poster med mappningsmetadata.
- Omapning och korrigering kan göras utan att förlora råunderlaget.

### Blocked by
Issue 3

---

## Issue 5
**Title:** Avancerad Innehavsanalys v1.5 (investerat, anskaffningsvärde, senaste värdering, totalvärde)  
**Type:** AFK

### What to build
Inför en vertikal analys-slice för Innehav som visar nyckelmått: totalt investerat, genomsnittligt anskaffningsvärde (där relevant), senaste värdering och totalvärde.

### Acceptance criteria
- Användaren ser nyckelmått per Innehav med tydliga definitioner.
- Värden baseras på registrerade Händelser och tillgängligt underlag.
- Analysen är verifierbar via tester och UI utan dold automatisk logik.

### Blocked by
Issue 1, Issue 3, Issue 4

---

## Issue 6
**Title:** Pensionskalkyl Baslinje (antaganden + scenario per Entitet)  
**Type:** HITL

### What to build
Inför en första pensionskalkyl med explicita antaganden och scenario per Entitet. Antaganden ska vara synliga och godkännas manuellt.

### Acceptance criteria
- Användaren kan ange och spara antaganden för pensionsscenario.
- Resultat presenteras med tydlig osäkerhets-/antagandemarkering.
- HITL-granskning dokumenterar att antaganden och tolkning är godkända.

### Blocked by
Issue 5

---

## Issue 7
**Title:** What-if Scenario Motor (inkomst, uttag, avkastning, ränta)  
**Type:** HITL

### What to build
Inför en scenario-motor där användaren kan jämföra alternativa framtidsfall genom att ändra inkomst, uttag, avkastning och ränta.

### Acceptance criteria
- Användaren kan skapa minst två jämförbara scenarier.
- Skillnader mellan scenarier visas tydligt och spårbart.
- HITL-granskning bekräftar semantik och tolkning av scenarioresultat.

### Blocked by
Issue 6

---

## Issue 8
**Title:** Förfinad rapportering: export- och beslutsvyer för periodjämförelse  
**Type:** AFK

### What to build
Utöka rapportlagret med förfinade periodjämförelser och exportorienterade beslutsvyer som minskar kvarvarande Excel-beroende.

### Acceptance criteria
- Användaren kan jämföra perioder med tydliga differenser och markering av osäker data.
- Rapporter är exportvänliga och konsekventa med befintlig rapportmodell.
- Minst ett drilldown-flöde till underlag är verifierat.

### Blocked by
Issue 5, Issue 7

---

## Issue 9
**Title:** Integrationsadapter v1 (kontrollerat inflöde från e-post/bankkälla via adaptergräns)  
**Type:** HITL

### What to build
Inför en kontrollerad integrationsadapter för semi-automatiskt inflöde från extern källa (e-post/bank), bakom tydlig adaptergräns och med manuell godkännandeport.

### Acceptance criteria
- Inkommet material från adapter hamnar i kontrollerat granskningsflöde.
- Ingen direkt bypass av manuell granskning eller domänkontrakt.
- HITL-granskning bekräftar säkerhets- och transparensnivå innan aktivering.

### Blocked by
Issue 3, Issue 4
