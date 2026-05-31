# Taggsystem

Det här dokumentet beskriver hur taggar ska fungera i appen.

Målet är att taggar ska ge flexibilitet och snabbare återfinning, utan att ersätta den strukturerade datamodellen.

## Grundprincip

Taggar är ett `komplement`, inte en ersättning, för:

- entitet
- åtagande
- ärende
- dokumenttyp
- status
- verifikatstatus
- innehavstyp

Om något kan uttryckas tydligt i datamodellen ska det i första hand göras där. Taggar används för det som är tvärgående, tillfälligt eller personligt användbart.

## Vad taggar ska användas till

Taggar ska främst användas för:

- teman
- fokusområden
- tillfälliga arbetsmarkeringar
- tvärgående grupperingar
- sökspår

Exempel:

- `deklaration`
- `pension`
- `lantbruk`
- `Lunar`
- `uppfoljning`
- `att-kolla`
- `arsbokslut`
- `forsakring`

## Vad taggar inte ska användas till

Taggar ska inte användas som ersättning för:

- vilken entitet något hör till
- om något är leverantörsfaktura eller dokument
- om något är betalt eller obetalt
- om något är avvikelse eller normalt
- om något tillhör ett visst konto eller innehav när detta redan finns som relation

Exempel på sådant som inte bör bli taggar:

- `Iaculis`
- `Tofuba`
- `obetald`
- `verifikat`
- `fastighet`

De hör hemma i modellen, inte i tagglistan.

## Objekt som kan taggas

I v1 ska taggar kunna kopplas till:

- entiteter
- åtaganden
- ärenden
- leverantörsfakturor
- betalhändelser
- dokument
- verifikat
- innehav
- händelser
- noteringar

## Två typer av taggar

För att hålla ordning rekommenderas två typer av taggar:

- `systemtaggar`
- `användartaggar`

### Systemtaggar

Systemtaggar skapas eller föreslås av appen och används när vi vill ha konsekvent märkning över flera objekt.

Exempel:

- `ocr-osaker`
- `saknar-matchning`
- `kraver-granskning`
- `inkomplett-underlag`

Systemtaggar ska vara begränsade, tydliga och helst komma från en fast lista.

### Användartaggar

Användartaggar är fria taggar som du själv sätter.

Exempel:

- `pension`
- `Lunar`
- `lantbruk`
- `viktigt`
- `kolla-senare`

De ger flexibilitet utan att vi behöver bygga ett specialfält för varje behov.

## Namnstandard för taggar

För att taggar ska bli lättare att läsa och söka på använder vi dessa regler:

- små bokstäver som standard
- bindestreck i stället för mellanslag
- undvik specialtecken om det inte verkligen behövs
- håll dem korta och begripliga

Bra exempel:

- `pension`
- `lantbruk`
- `att-kolla`
- `arsbokslut`

Mindre bra exempel:

- `Pension?`
- `Saker jag kanske ska se over`
- `LANTBRUK!!!`

## Tagghierarki

I v1 ska taggar vara `platta`, inte hierarkiska.

Det betyder:

- ingen understruktur som `investering/onoterat/Lunar`
- ingen mappkansla
- varje tagg står för sig själv

Om behovet uppstår senare kan vi lägga till relationer mellan taggar, men vi börjar enkelt.

## Taggförslag

Appen ska kunna föreslå taggar baserat på:

- tidigare historik
- entitet
- innehav
- leverantör
- dokumenttyp
- sökord i dokument eller notering

Förslag ska alltid kunna justeras manuellt.

## Sökning och filtrering

Taggar ska vara fullt sökbara och användbara som filter.

Det betyder att du ska kunna:

- söka på en tagg i mastersearch
- filtrera centrala vyer på en eller flera taggar
- se vilka objekt som delar samma tagg

Taggar ska fungera bra ihop med annan filtrering, till exempel:

- entitet + tagg
- datumintervall + tagg
- innehav + tagg
- dokumenttyp + tagg

## Flera taggar på samma objekt

Ett objekt ska kunna ha flera taggar samtidigt.

Exempel:

- `pension`
- `Lunar`
- `uppfoljning`

Det här gör att samma objekt kan hittas från flera perspektiv utan att vi behöver duplicera data.

## Tagglistan ska hållas ren

Appen bör hjälpa till att hålla taggsystemet begripligt.

Det innebär att v1 bör kunna:

- visa befintliga taggar när du börjar skriva
- varna för nästan dubbla taggar
- visa hur många objekt som använder en tagg
- låta dig slå ihop två taggar senare om det behövs

Exempel:

Om både `pension` och `pensioner` råkar finnas ska systemet kunna hjälpa dig att välja en av dem.

## Rekommenderad första uppsättning systemtaggar

I v1 kan vi börja med en liten fast uppsättning systemtaggar:

- `kraver-granskning`
- `ocr-osaker`
- `saknar-matchning`
- `inkomplett-underlag`
- `aterkommande`
- `for-sen`

De här taggarna ska inte ersätta status, men de hjälper med filtrering och arbetsfokus.

## Rekommenderad första uppsättning användartaggar

Det här är rimliga exempel utifrån era behov:

- `pension`
- `lantbruk`
- `Lunar`
- `forsakring`
- `deklaration`
- `prognos`
- `uppfoljning`

Det är bara exempel. Användartaggar ska vara fria.

## Designprincip för användargränssnittet

Taggar ska visas diskret men tydligt:

- nära objektets metadata
- i filtreringspaneler
- i mastersearch

Taggar ska inte dominera samma ytor som status, belopp eller datum. De är stöd för återfinning och fokus, inte primär affärslogik.

## Sammanfattning

Taggsystemet i v1 ska vara:

- enkelt
- sökbart
- flexibelt
- platt
- lätt att hålla rent

Och viktigast av allt:

Taggar ska hjälpa dig hitta, gruppera och fokusera, men de ska inte bära den grundläggande strukturen i systemet.

