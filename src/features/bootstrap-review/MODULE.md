# bootstrap-review

## Ansvar

`bootstrap-review` hanterar review queue for stage-records med status `needs-review`, inklusive bulk actions och explicit stod for `inkomplett men accepterad`.

## Agda ytor

- lista av actionabla records med reason flags
- bulk approve/reject/accepted-incomplete
- persisterade manuella beslut som gor records commit-eligible

## Tillatna beroenden

- bootstrap-stage
- shared storage

## Tester

- `tests/architecture/bootstrap-review-queue.test.mjs`
