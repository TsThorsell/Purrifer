# obligations-and-cases

## Ansvar

`obligations-and-cases` ager atagande-CRUD i v1 med grundstatus.

## Agda ytor

- lista for ataganden
- detaljvy for atagande
- skapa/uppdatera for atagande
- skapa ärenden från åtagande
- checklista i ärende
- avvikelsehantering (seed)

## Tillatna beroenden

- shell-core layout
- sqlite via main-services

## Tester

- `tests/architecture/slices.test.mjs`
- `tests/architecture/obligations-crud.test.mjs`

## Begransningar

- avvikelsegeneratorn är enkel och inte kopplad till notifieringar än
- ärende-status övergår inte automatiskt med avtalad arbetsflödeslogik

