# voucher-and-proof

## Ansvar

`voucher-and-proof` ager den forsta beviskedjan mellan sparat underlag och formella verifikat.

Slicen ansvarar for:

- verifikatobjekt
- verifieringsstatus
- skapande av verifikat fran dokument
- export av `UL/MD`-backup
- relationshantering mellan verifikat och dokument (huvudkälla + stödjande dokument)
- beviskedjor och statushistorik för dokumentflöden

## Agda ytor

- verifikatlisa
- verifikatdetaljer
- skapande av verifikat fran dokumentunderlag
- exportknappar och statusytor for verifikatbackup
- relationstabell för primary/supporting dokument
- visning av beviskedja och statushistorik

## Tillatna beroenden

- shell-core layout
- document-inbox via tydligt serviceinterface
- egna repositories, services och preload-kontrakt

## Tester

- `tests/architecture/slices.test.mjs`

## Begransningar

- ingen OCR-logik
- ingen fakturalogik
- ingen budget- eller rapportlogik
- ingen flersidig sammanslagning av flera underlag i samma export i denna forsta version

