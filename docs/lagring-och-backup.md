# Lagring och backup

Det här dokumentet beskriver skillnaden mellan appens interna lagring och den backupmapp som användaren väljer.

Målet är att skilja på:

- `intern dokumentstore` för stabil drift
- `backupmapp` för mänsklig läsbarhet och återställning

## Två olika lagringssyften

Appen ska ha två olika lagringsperspektiv:

- `intern lagring`
- `backup/exportlagring`

De ska inte optimeras för samma sak.

## Intern dokumentstore

Den interna dokumentstoren är appens egen, lokala lagring av originalunderlag.

Den ska optimeras för:

- stabilitet
- robust referenshantering
- snabb åtkomst
- säker koppling till databas och index

Den interna dokumentstoren behöver inte vara särskilt människoläsbar i Explorer.

Den ska vara:

- apphanterad
- stabil över tid
- oberoende av var originalfilen råkade ligga vid import

Det betyder att appen kopierar in originaldokument till sin egen lagring.

## Backupmapp

Backupmappen är något annat än intern lagring.

Den ska optimeras för:

- mänsklig läsbarhet
- enkel bläddring i Explorer
- tydlig koppling mellan underlag och metadata
- återställning och extern granskning

Backupmappen väljs av användaren.

## Namnstandard i backupmappen

För backupfiler ska vi använda låst namnstandard med objekttypsprefix och löpnummer.

Exempel:

- `V000123_UL.pdf`
- `V000123_MD.md`

Det betyder:

- `V` = verifikat
- `UL` = underlag
- `MD` = metadata

Filnamnen ska sortera intill varandra i Explorer.

Samma princip ska senare kunna användas för andra objekttyper:

- `F######` = leverantörsfaktura
- `D######` = dokument
- eventuellt fler prefix senare

## Vad som ska ligga i backupmappen

För varje verifikat ska backupen minst kunna innehålla:

- originalunderlag
- metadata i Markdown

Exempel:

- `V000123_UL.pdf`
- `V000123_MD.md`

Om underlaget är bild eller mailfil gäller samma princip:

- `V000123_UL.png`
- `V000123_MD.md`

## Viktig designprincip

Den interna dokumentstoren och backupmappen behöver inte ha samma filnamn eller mappstruktur.

Det viktiga är:

- att appen håller stabil intern referens
- att backupen är läsbar för människa
- att det finns tydlig koppling mellan intern data och backupfiler

## Sammanfattning

Vi låser följande:

- intern dokumentstore är apphanterad och maskinvänlig
- backupmappen är användarvald och människoläsbar
- backupfiler för verifikat ska följa standarden `V######_UL` och `V######_MD`
- objekt-id:n är globala per objekttyp

