# Slice-arkitektur

Det här dokumentet beskriver hur appen ska utvecklas som en `modulär monolit med hårda dockningskontrakt`.

Målet är att ny funktionalitet ska kunna byggas som små, isolerade slices utan att utvecklaren behöver förstå hela systemet.

Detta gäller både mänskliga utvecklare och AI-assistenter.

## Kärnidé

Bygg inte features "inne i appen" som osorterade tillägg i kärnan.

Docka features till appen via:

- små slices
- registrerade manifest
- moduldocs
- hårda interface
- ägda filer
- ägda tester
- begränsade beroenden
- gemensamt designsystem

## Kontextbudget är ett förstaklasskrav

Arkitekturen ska skydda utvecklarens kontext.

En utvecklare eller AI ska i normalfallet kunna lösa en uppgift genom att läsa:

- moduldoc för aktuell slice
- manifestpost för aktuell slice
- slicens ägda filer
- relevanta tester
- eventuellt ett litet kontraktsdokument

Om mer än så krävs är slicen sannolikt:

- för bred
- för otydlig
- för hårt kopplad

## Stabil kärna

Kärnan ska vara liten, stabil och medvetet tråkig.

Kärnan äger:

- appstart
- routing eller registrering
- gemensam layout och navigation
- designsystem
- gemensamma datakontrakt
- persistens- och integrationsgränser
- modulmanifest
- arkitekturtester

Featurekod ska inte smyga in i kärnan utan stark anledning.

## Vad en slice är

En `slice` är en avgränsad funktionsmodul.

Varje slice ska ha:

- namn
- tydligt ansvar
- ägda routes eller entrypoints
- ägda services, actions eller viewmodels
- ägda komponenter, templates eller statiska resurser
- ägda tester
- tillåtna beroenden
- dokumenterat public interface

En slice får inte ändra andra slices om det inte uttryckligen ingår i uppdraget.

## Manifest

Varje slice ska vara registrerad i ett manifest.

Manifestet ska vara den formella sanningskällan för:

- vilka filer slicen äger
- vilka tester som verifierar slicen
- vilka beroenden slicen får ha
- vilken moduldoc som beskriver slicen
- om slicen är tillräckligt isolerad för att räknas som redo

Om en ny fil skapas ska manifestet uppdateras.

## Moduldoc

Varje slice ska ha en moduldoc.

Moduldocen ska kort beskriva:

- vad slicen ansvarar för
- vilka ytor den äger
- vilka angränsande system den får använda
- vilka tester som ska köras
- viktiga begränsningar

Utvecklare och AI ska börja där, inte i hela kodbasen.

## Tunna adaptrar

Routes, controllers, handlers eller liknande adaptrar ska vara tunna.

De får bara:

- läsa input
- göra enkel validering
- öppna eller stänga request-scope eller transaktion
- anropa service, action eller viewmodel
- returnera response eller rendering

Affärslogik, integrationslogik och dataformning ska inte bo i adaptrarna.

## Lagerindelning

Oavsett stack ska logik ligga i rätt lager.

### Domain

Rena begrepp, regler och typer.

### Repositories

Persistens, queries och writes.

### Services eller actions

Användarfall och arbetsflöden.

### View models eller read models

Data formad för UI.

### Routes eller controllers

Tunna adaptrar.

### UI eller templates

Rendering och interaktion.

### Client scripts

Endast UI-beteende, inte sanningslogik.

## UI är inte sanningslager

UI får inte:

- läsa databas direkt
- anropa externa system direkt
- tolka rå providerdata direkt
- skapa parallella datamodeller
- duplicera affärsregler

UI ska få färdigformade view models från backend eller applagret.

## Integrationer bakom adaptergränser

Externa system ska ligga bakom integrations- eller providergränser.

Featurekod ska inte direkt känna till detaljer om:

- autentisering
- HTTP-format
- tokenlagring
- externa API-fält
- filsystemskanning
- synkflöden

Sådant ska gå via definierade providers eller services.

## Begripligt dataflöde

Normal läsning ska följa:

`extern källa -> provider eller sync -> lokal lagring eller read model -> service eller view model -> UI`

Normal skrivning ska följa:

`UI-åtgärd -> route eller controller -> service eller action -> repo eller provider -> lokal state eller resultat -> UI`

Undvik genvägar mellan UI och externa system.

## Designsystemet är centralt

Utseendet ska styras av ett gemensamt designsystem.

Det ska inkludera:

- tokens
- standardiserade komponenter
- paneler
- knappar
- tabeller
- formulär
- modaler
- navigation
- rubriknivåer
- spacing

Feature-CSS eller feature-styling får bara lägga till små, lokala regler. Den får inte skapa ett nytt visuellt språk.

## Inga breda refaktorer under slicearbete

När man arbetar i en slice gäller:

- ändra bara ägda filer
- gör inga opportunistiska städningar
- flytta inte stora filer utan separat plan
- ändra inte public interface utan uppdaterad moduldoc och tester
- kör bara relevanta slicetester plus arkitekturkontrakt

## Arkitekturtester

Systemet ska ha arkitekturtester som verifierar sådant som:

- att slices bara importerar tillåtna beroenden
- att kärnan inte drar in featurelogik
- att manifest och moduldocs finns där de ska
- att public interface respekteras

Detta är viktigt för att hålla systemet dockningsbart över tid.

## Definition of done för slice-arbete

En ändring är klar först när:

- ändringen är begränsad till rätt slice
- manifestet stämmer
- moduldocen stämmer om kontraktet ändrats
- adaptrar är tunna
- logik ligger i rätt lager
- UI följer designstandarden
- relevanta slicetester är gröna
- arkitekturtester är gröna
- ingen oavsiktlig förändring har gjorts i andra slices

## Konsekvens för teknikval

Vilken stack vi än väljer måste den stödja:

- tydlig kärna
- tydliga slicegränser
- manifestregistrering
- moduldocs
- arkitekturtester
- gemensamt designsystem
- låg kontext per tillägg

Det här ska påverka både:

- mappstruktur
- modulindelning
- teststrategi
- pluginmodell
- UI-komposition

