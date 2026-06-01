# invoice-and-payment

## Ansvar

`invoice-and-payment` ager leverantorsfakturor, betalhandelser och matchning.

## Agda ytor

- fakturalista
- betalningslista
- matchningskommando

## Tillatna beroenden

- shell-core layout
- entity-registry read data
- voucher-and-proof referenser i senare steg

## Tester

- `tests/architecture/slices.test.mjs`
- `tests/architecture/route-host-coverage.test.mjs`
- `tests/architecture/invoice-and-payment-behavior.test.mjs`

## PP-015-noter

- Matchning mellan faktura och betalning loggas per händelse i `invoice_payment_activity_log`.
- Matchningar beräknar status deterministiskt (`unpaid`, `partly-paid`, `paid`) från summerad matchad mängd.
- Avvikelse-fall (`underpaid`, `overpaid`) exponeras via UI:anslutningsflöde med handlingsbara händelser.

