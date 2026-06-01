# Bootstrap pipeline-registry (PP-026)

## Syfte

Definiera bootstrapdomänens körning som en första klassens, versionsstyrd registrering:
- vilka bootstrap-slices som ingår,
- vilka kontrakt varje modul erbjuder,
- och vilka ordnade beroenden som krävs.

Den centrala manifesten ligger i:
- `src/app/registry/bootstrapPipelineRegistry.json`
- valideringslogik i `src/app/registry/bootstrapPipelineRegistry.ts`.

## Innehåll i en registry-post

Varje post i `bootstrapPipelineRegistry.json` måste innehålla:

- `sliceId`
- `displayName`
- `moduleDocPath`
- `ownedAreas`
- `navigationRoutes`
- `contracts`
- `dependsOn`

`contracts` är den avtalade kontraktytan för modulen (API- och kanalavtal i textform).

## Onboarding: lägga till en bootstrapmodul

1. Lägg till manifest för modulen i feature-katalogen om det saknas:
   - `src/features/<new-module>/slice.manifest.ts`
2. Lägg till en post i `src/app/registry/bootstrapPipelineRegistry.json` med alla fält ovan.
3. Placera modulen i en konsekvent pipeline-ordning i listan.
4. Lägg till alla beroenden i `dependsOn`.
5. Kontrollera kontraktsnamnen (`contracts`) för att spegla `contracts.ts` och IPC-kanaler.
6. Se till att den har korrekta route-host och preload/main-host om den exponerar UI eller IPC.
7. Kör riktade arkitekturtester (se nedan) och verifiera ingen varning/fel i loggar.

## Onboarding: ta bort en bootstrapmodul

1. Ta bort modulen från `bootstrapPipelineRegistry.json`.
2. Ta bort alla beroenden mot modulen från andra poster (`dependsOn`).
3. Om modulen saknar route kan den vara avlastad från route-delen; annars ta bort route-hosten.
4. Kontrollera att inga beroende- eller onboardingsteg i UI/hoster använder den borttagna modulen.

## Körning och validering

- Vid app-start kallas valideringen från både:
  - `src/main/index.ts`
  - `src/preload/index.ts`
- Vid valideringsfel kastas ett startup-blockerande fel (strikt läge i normal miljö, testläge tillåter inte blockering).
- Arkitekturtester i `tests/architecture` verifierar:
  - att pipelinekontraktet innehåller alla bootstrapmoduler,
  - att dependencykedjor är explicit registrerade,
  - och att huvudprocess/`preload` laddar valideringen.
