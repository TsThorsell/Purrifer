# Förenklad kontoplan för appen

Det här dokumentet beskriver en förenklad kontoplan för appen.

Målet är inte att ersätta en full bokföringskontoplan, utan att ge appen en begriplig och bokföringsnära struktur för:

- kassabok eller transaktionsjournal
- balansöversikt per entitet
- resultatliknande periodvy per entitet
- klassificering av inkomster och kostnader
- koppling mellan dokument, fakturor, betalhändelser och uppföljning

## Källgrund

Den här förenklingen bygger på aktuell svensk BAS-struktur per den 31 maj 2026:

- `BAS 2026` för vanliga företag
- `BAS 2018 för K1` för enskilda näringsidkare som upprättar förenklat årsbokslut

Appen ska alltså vara `BAS-inspirerad`, inte en exakt kopia av hela standardkontoplanen.

Källor:

- [BAS kontoplaner](https://www.bas.se/kontoplaner/)
- [Kontoplanens uppbyggnad och användning](https://www.bas.se/kontoplaner/kontoplanens-uppbyggnad-och-anvandning/)
- [Skapa en egen kontoplan](https://www.bas.se/kontoplaner/skapa-en-egen-kontoplan/)

## Designprincip

Vi använder tre nivåer:

- `kontoklass`
- `huvudgrupp`
- `appkategori`

Det gör att appen kan vara:

- enkel att förstå
- tillräckligt nära bokföring
- flexibel nog för privat ekonomi, bolag, enskild verksamhet och fastigheter

## Viktig avgränsning

För `privat ekonomi` finns ingen formell svensk BAS-kontoplan på samma sätt som för företag.

För privatdelen använder appen därför en `BAS-liknande struktur` för att få jämförbarhet, men den ska inte tolkas som formell redovisning.

För `AB` och `enskild näringsverksamhet` ska strukturen ligga närmare BAS.

## Övergripande kontoklasser i appen

Vi använder samma huvudlogik som BAS:

- `1 Tillgångar`
- `2 Eget kapital och skulder`
- `3 Inkomster och intäkter`
- `4 Direkta kostnader och anskaffningar`
- `5-6 Övriga externa kostnader`
- `7 Personalkostnader och avskrivningsliknande kostnader vid behov`
- `8 Finansiella poster och interna justeringar`

Appen behöver inte visa kontoklassnummer överallt, men modellen i botten ska följa denna struktur.

## Förenklad kontoplan för AB och liknande bolag

Det här spåret passar främst `Iaculis AB`.

### Klass 1 Tillgångar

- `10 Immateriella och materiella anläggningstillgångar`
  - appkategori: anläggningstillgångar
  - exempel: större inventarier, maskiner, förbättringsutgifter
- `11 Fastigheter och mark`
  - appkategori: fastighetsinnehav
  - exempel: fastighet, mark, byggnadskomponenter
- `13 Finansiella anläggningstillgångar`
  - appkategori: långsiktiga investeringar
  - exempel: onoterade aktier, långfristiga fordringar
- `14 Lager och pågående arbeten`
  - appkategori: lager eller projektbundet innehåll
- `15 Kundfordringar och andra fordringar`
  - appkategori: fordringar
- `16 Skattekonto och momsrelaterade poster`
  - appkategori: skatt och moms
- `17 Förutbetalda kostnader och upplupna intäkter`
  - appkategori: periodiseringar
- `18 Kortfristiga placeringar`
  - appkategori: kortfristiga investeringar
- `19 Kassa och bank`
  - appkategori: likvida medel

### Klass 2 Eget kapital och skulder

- `20 Eget kapital`
  - appkategori: eget kapital
- `21 Obeskattade reserver`
  - appkategori: reserver
- `22 Avsättningar`
  - appkategori: avsättningar
- `23-24 Långfristiga skulder`
  - appkategori: banklån och andra långfristiga skulder
- `25 Skatteskulder`
  - appkategori: skatteskulder
- `26 Moms och andra indirekta skatter`
  - appkategori: moms och indirekta skatter
- `27 Personalens skatter och avgifter`
  - appkategori: personalskulder
- `28 Övriga kortfristiga skulder`
  - appkategori: övriga skulder
- `29 Upplupna kostnader och förutbetalda intäkter`
  - appkategori: periodiseringar skuldsida

### Klass 3 Inkomster och intäkter

- `30-34 Huvudintäkter`
  - appkategori: försäljning och verksamhetsintäkter
- `35 Fakturerade sidointäkter`
  - appkategori: sidointäkter
- `36 Hyres- och arrendeintäkter`
  - appkategori: fastighetsintäkter
- `37-39 Övriga intäkter`
  - appkategori: övriga rörelseintäkter

### Klass 4 Direkta kostnader och anskaffningar

- `40-45 Inköp av varor, material och direkta tjänster`
  - appkategori: direkta kostnader
- `46-49 Förändringar, legoarbete och övriga direkta kostnader`
  - appkategori: verksamhetsnära direkta kostnader

### Klass 5-6 Övriga externa kostnader

- `50 Lokalkostnader`
  - appkategori: lokal, hyror, fastighetsdrift
- `51-53 Fastighetsdrift, energi, reparation och underhåll`
  - appkategori: drift och underhåll
- `54 Förbrukningsinventarier och material`
  - appkategori: förbrukning
- `55 Reparation, service och underhåll övrigt`
  - appkategori: service och underhåll
- `56 Fordon och transport`
  - appkategori: fordon och resor
- `57 Frakter och transporter`
  - appkategori: transport
- `58 Resor`
  - appkategori: resor och logi
- `59 Reklam och representation`
  - appkategori: marknad
- `60 Övriga försäljningskostnader`
  - appkategori: försäljningskostnader
- `61 Kontorsmaterial, tele, porto och IT`
  - appkategori: administration och IT
- `62 Försäkringar och riskkostnader`
  - appkategori: försäkring
- `63 Företags- och förvaltningskostnader`
  - appkategori: administration
- `64 Förvaltnings- och konsultkostnader`
  - appkategori: rådgivning och tjänster
- `65 Övriga externa tjänster`
  - appkategori: externa tjänster
- `69 Övriga externa kostnader`
  - appkategori: övrigt externt

### Klass 7 Personalkostnader och avskrivningar

- `70-72 Löner och ersättningar`
  - appkategori: lön
- `73 Kostnadsersättningar och förmåner`
  - appkategori: förmåner och ersättningar
- `75 Sociala och andra avgifter`
  - appkategori: arbetsgivaravgifter
- `76 Övriga personalkostnader`
  - appkategori: personalövrigt
- `78 Avskrivningar`
  - appkategori: avskrivningar

### Klass 8 Finansiella poster

- `80 Resultat från andelar`
  - appkategori: andelsresultat
- `81-82 Finansiella intäkter`
  - appkategori: ränteintäkter och finansiella vinster
- `83-84 Finansiella kostnader`
  - appkategori: räntekostnader och finansiella kostnader
- `89 Skatt och årets resultatnära poster`
  - appkategori: skatt och resultatjustering

## Förenklad kontoplan för enskild näringsverksamhet

Det här spåret passar främst `Tofuba`, beroende på hur verksamheten faktiskt redovisas.

Principen ska följa BAS-strukturen men med enklare visning i appen.

### Balansnära grupper

- `anläggningstillgångar`
- `fastigheter och mark`
- `investeringar`
- `fordringar`
- `likvida medel`
- `egna insättningar`
- `egna uttag`
- `lån och andra skulder`
- `skatt och moms`

### Resultatnära grupper

- `försäljning och verksamhetsintäkter`
- `hyres- och arrendeintäkter`
- `direkta kostnader`
- `drift och underhåll`
- `försäkring`
- `administration och IT`
- `resor och fordon`
- `externa tjänster`
- `ränteintäkter`
- `räntekostnader`

### Särskilt viktigt i enskild verksamhet

Appen bör hålla isär:

- `egna insättningar`
- `egna uttag`
- `verksamhetens verkliga kostnader och intäkter`

Det här är avgörande för att inte blanda privat ekonomi och näringsverksamhet.

## Förenklad struktur för fastighetsrelaterade entiteter och innehav

Fastigheter är så viktiga i ert upplägg att appen bör ha särskilda kategorier ovanpå BAS-logiken.

### Tillgångar

- `fastighet`
- `mark`
- `förbättringsutgifter`
- `likvida medel kopplade till fastighet`

### Skulder

- `fastighetslån`
- `internlån`
- `leverantörsskulder`

### Intäkter

- `hyra`
- `arrende`
- `övriga fastighetsintäkter`

### Kostnader

- `el`
- `vatten`
- `värme`
- `försäkring`
- `underhåll`
- `reparation`
- `avgifter`
- `ränta`
- `fastighetsadministration`

## BAS-liknande struktur för privat ekonomi

Privatdelen ska inte låtsas vara formell bokföring, men samma struktur hjälper för kontroll och prognos.

### Tillgångar

- `bank`
- `depå`
- `ISK`
- `kapitalförsäkring`
- `fordringar`
- `fastigheter`

### Skulder

- `bolån`
- `övriga lån`
- `kreditkortsskulder`
- `interna lån`

### Inkomster

- `lön`
- `utdelning`
- `ränta`
- `hyra eller arrende`
- `övriga inflöden`

### Kostnader

- `boende`
- `försäkring`
- `el och drift`
- `mat och hushåll`
- `transport`
- `ränta`
- `investering och sparavgifter`
- `övrigt privat`

## Rekommenderade appkategorier för v1

Det här är de viktigaste kategorierna som användaren faktiskt bör se i gränssnittet.

### Balans och innehav

- `likvida medel`
- `investeringar`
- `fastigheter`
- `fordringar`
- `banklån`
- `interna lån`
- `skatt och moms`
- `övriga skulder`
- `nettoläge`

### Resultat och flöden

- `verksamhetsintäkter`
- `hyres- och arrendeintäkter`
- `övriga intäkter`
- `direkta kostnader`
- `drift och underhåll`
- `försäkring`
- `administration och IT`
- `resor och transport`
- `externa tjänster`
- `räntor och finansiella poster`
- `skatter och avgifter`

## Rekommenderad kategorihierarki i v1

I appen bör en post kunna klassificeras enligt:

- `klass`
- `huvudkategori`
- `underkategori`

Exempel:

- klass: `5-6 Övriga externa kostnader`
- huvudkategori: `Försäkring`
- underkategori: `Hemförsäkring`

Exempel:

- klass: `3 Inkomster och intäkter`
- huvudkategori: `Hyresintäkter`
- underkategori: `Bostadshus fastighet A`

## Hur kontoplanen ska användas i appen

Den förenklade kontoplanen ska användas för:

- förslag vid klassificering
- rapporter per entitet
- kassabok eller transaktionsjournal
- balansöversikt per entitet
- resultatliknande periodvy per entitet
- prognoser senare

Den ska inte användas som argument för att appen redan i v1 är ett fullständigt bokföringsprogram.

## Praktisk rekommendation för v1

I gränssnittet bör användaren oftast se:

- mänskligt läsbar kategori
- eventuellt underkategori

Inte hela BAS-numret direkt.

Men i modellen bör vi kunna spara:

- BAS-inspirerad klass
- huvudkategori
- underkategori
- eventuell mappning till faktiskt BAS-konto senare

## Nästa steg

Det här dokumentet bör senare brytas ut i:

- kategorier för privat ekonomi
- kategorier för AB
- kategorier för enskild verksamhet
- kategorier för fastigheter
- mappningstabeller mellan appkategori och faktisk bokföringskontostruktur

