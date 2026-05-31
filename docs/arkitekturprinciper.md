# Arkitekturprinciper

Det här dokumentet beskriver de övergripande tekniska principerna för appen.

Målet är att appen ska vara:

- lokal först
- lätt att vidareutveckla
- uppdelad i tydliga moduler
- möjlig att utoka med nya funktioner utan att hela systemet behöver förstås
- visuellt konsekvent

## Grundprincip

Ny funktionalitet ska i stor utsträckning kunna byggas som `tillägg` mot `hårt definierade interface`.

Det betyder att en utvecklare som bygger ett nytt tillägg inte ska behöva förstå hela appens interna struktur, databas eller alla andra funktioner.

Målet är att minska:

- kognitiv belastning
- beroenden mellan moduler
- risken att kontextutrymmet tar slut vid vidareutveckling
- risken att nya funktioner skapar oväntade sidoeffekter

## Modulär utbyggnad

Appen ska designas så att ny funktionalitet i möjligaste mån kan dockas in som en separat modul eller plugin.

En modul ska normalt få tillgång till:

- tydligt avgränsade datatyper
- väldefinierade kommandon
- väldefinierade query-interface
- definierade UI-ytor där modulen får rendera innehåll

En modul ska normalt inte:

- läsa hela databasen fritt
- kringgå domänregler
- skriva direkt till andra modulers interna tillstånd
- skapa eget visuellt språk

## Tydliga interface

Varje större del av systemet bör ha ett tydligt kontrakt.

Exempel på sådana kontrakt:

- skapa eller uppdatera dokument
- skapa eller uppdatera verifikat
- tolka underlag
- klassificera objekt
- registrera betalhändelse
- skapa händelse i tidslinje
- läsa rapportdata
- leverera backupdata

Gränssnitten ska vara:

- små
- väldokumenterade
- stabila över tid
- testbara

## Domänkärna och tillägg

Systemet bör delas upp i:

- `domänkärna`
- `tilläggsmoduler`

### Domänkärnan

Domänkärnan ska äga:

- entiteter
- åtaganden
- ärenden
- dokument
- verifikat
- leverantörsfakturor
- betalhändelser
- innehav
- lån
- tidslinjer
- sökindex
- regelmotor
- revisionslogg

### Tilläggsmoduler

Tilläggsmoduler ska bygga ovanpå domänkärnan.

Exempel:

- särskild importör för viss excelform
- visualisering för viss innehavstyp
- extra analysrapport
- ny dokumenttolkare
- särskild budgetvy
- export till visst format

## UI-standardisering

Appen ska ha en hårt styrd visuell standard.

Det betyder att moduler inte ska få uppfinna egna mönster för:

- färger
- typsnitt
- mellanrum
- knappar
- formulärfält
- tabeller
- kort
- filtreringspaneler
- modalrutor
- statusindikatorer

I stället ska appen ha ett tydligt designsystem eller komponentbibliotek som alla tillägg måste använda.

## Designsystemets roll

Designsystemet ska innehålla:

- standardkomponenter
- standardlayout
- standardtypografi
- standardfärger
- standardikoner om sådana används
- standardbeteenden för tabeller, grafer, dokumentvisning och filter

Det ska vara enkelt att bygga nytt, men svårt att bygga visuellt inkonsekvent.

## Tillåtna utbyggnadspunkter

Exempel på platser där moduler senare bör kunna dockas in:

- ny post i landningsytans översikter
- ny detaljpanel för entitet eller innehav
- ny importkälla
- ny rapport
- ny tidslinjevy
- ny klassificeringshjälp
- ny exportfunktion

## Teknikvalets konsekvens

Den exakta implementationen beror på vald teknikstack.

Men oavsett teknik ska följande principer gälla:

- tydlig separation mellan domän och gränssnitt
- väldefinierade interface mellan moduler
- gemensamt designsystem
- tydliga regler för vad ett tillägg får läsa, skriva och visa

## Praktisk målsättning för v1

I v1 behöver vi inte bygga ett fullständigt plugin-ekosystem.

Men vi bör bygga så att det senare går att införa.

Det betyder att v1 redan från början bör:

- ha tydliga domänmoduler
- ha tydliga servicegränssnitt
- ha återanvändbara UI-komponenter
- undvika hård koppling mellan alla delar

## Sammanfattning

Arkitekturen ska hjälpa utveckling, inte bara körning.

Det viktigaste är:

- liten kontext per funktion
- tydliga kontrakt
- stabil kärna
- utbyggbar struktur
- hård UI-standardisering

## Slice-arkitektur

För vidareutveckling ska appen följa en `slice-baserad modulär monolit`.

Det betyder att nya funktioner i möjligaste mån inte byggs direkt "inne i appen" som osorterade delar av kärnan, utan dockas in som:

- små
- registrerade
- isolerade
- testbara
- dokumenterade slices

Detta beskrivs mer detaljerat i `slice-arkitekturen`.

