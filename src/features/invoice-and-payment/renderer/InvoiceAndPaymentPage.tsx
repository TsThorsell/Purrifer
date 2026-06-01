import { useEffect, useMemo, useState } from "react";
import type { InvoiceMatchHistoryFilter, InvoiceSummary, PaymentEventSummary, PaymentMatchHistory } from "../contracts";
import {
  Actions,
  Button,
  EmptyState,
  Field,
  FieldGrid,
  Page,
  PageHeader,
  Panel,
  SplitLayout,
  Stack,
  StatusPill
} from "../../../renderer/components/Ui";

const invoiceStatuses = ["", "unpaid", "partly-paid", "paid"] as const;
const historyActions = [
  "",
  "invoice-created",
  "payment-created",
  "match-created",
  "deviation-acknowledged"
] as const;

interface InvoiceAndPaymentPageProps {
  initialInvoiceId?: string;
  initialPaymentId?: string;
}

function isDeviation(value: InvoiceSummary["deviation"]): value is "overpaid" | "underpaid" {
  return value === "overpaid" || value === "underpaid";
}

export function InvoiceAndPaymentPage({
  initialInvoiceId,
  initialPaymentId
}: InvoiceAndPaymentPageProps) {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [payments, setPayments] = useState<PaymentEventSummary[]>([]);
  const [history, setHistory] = useState<PaymentMatchHistory[]>([]);
  const [entityFilter, setEntityFilter] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<(typeof invoiceStatuses)[number]>("");

  const [entitySearch, setEntitySearch] = useState("");
  const [entityQuery, setEntityQuery] = useState("");

  const [entityId, setEntityId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [grossAmount, setGrossAmount] = useState("0");
  const [netAmount, setNetAmount] = useState("0");
  const [vatAmount, setVatAmount] = useState("0");

  const [paymentEntityId, setPaymentEntityId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const paymentMethods = ["bank", "swish", "card", "internal-transfer", "manual"];
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]>("bank");

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [matchAmount, setMatchAmount] = useState("");
  const [matchNote, setMatchNote] = useState("");

  const [historyQuery, setHistoryQuery] = useState("");
  const [historyActionFilter, setHistoryActionFilter] = useState<(typeof historyActions)[number]>("");
  const [deviationNote, setDeviationNote] = useState("");

  const [error, setError] = useState<string | null>(null);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.invoiceId === selectedInvoiceId) ?? null,
    [invoices, selectedInvoiceId]
  );
  const selectedPayment = useMemo(
    () => payments.find((payment) => payment.paymentId === selectedPaymentId) ?? null,
    [payments, selectedPaymentId]
  );

  const deviationItems = useMemo(() => invoices.filter((item) => isDeviation(item.deviation)), [invoices]);

  async function refresh(preferredInvoiceId?: string, preferredPaymentId?: string) {
    try {
      const [nextInvoices, nextPayments, nextHistory] = await Promise.all([
        window.purrifer.invoiceAndPayment.listInvoices({
          entityId: entityFilter || undefined,
          status: invoiceStatusFilter || undefined,
          query: entityQuery || undefined
        }),
        window.purrifer.invoiceAndPayment.listPaymentEvents({
          entityId: paymentEntityId || entityFilter || undefined
        }),
        window.purrifer.invoiceAndPayment.listInvoicePaymentHistory({
          ...(entityFilter ? { entityId: entityFilter } : {}),
          ...(historyActionFilter ? { action: historyActionFilter } : {}),
          ...(historyQuery ? { query: historyQuery } : {})
        } as InvoiceMatchHistoryFilter)
      ]);

      setInvoices(nextInvoices);
      setPayments(nextPayments);
      setHistory(nextHistory);

      setSelectedInvoiceId((current) => {
        if (preferredInvoiceId && nextInvoices.some((invoice) => invoice.invoiceId === preferredInvoiceId)) {
          return preferredInvoiceId;
        }
        if (current && nextInvoices.some((invoice) => invoice.invoiceId === current)) {
          return current;
        }
        return nextInvoices[0]?.invoiceId ?? null;
      });

      setSelectedPaymentId((current) => {
        if (preferredPaymentId && nextPayments.some((payment) => payment.paymentId === preferredPaymentId)) {
          return preferredPaymentId;
        }
        if (current && nextPayments.some((payment) => payment.paymentId === current)) {
          return current;
        }
        return nextPayments[0]?.paymentId ?? null;
      });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa faktura- och betalningsdata.");
      setInvoices([]);
      setPayments([]);
      setHistory([]);
    }
  }

  useEffect(() => {
    void refresh(initialInvoiceId, initialPaymentId);
  }, [entityFilter, entityQuery, invoiceStatusFilter, paymentEntityId, historyActionFilter, historyQuery, initialInvoiceId, initialPaymentId]);

  useEffect(() => {
    if (selectedInvoice && selectedPayment && !matchAmount) {
      const suggested =
        Math.max(selectedInvoice.outstandingAmount, 0) > 0
          ? Math.min(selectedInvoice.outstandingAmount, selectedPayment.unallocatedAmount)
          : Math.min(selectedPayment.unallocatedAmount, 1);
      setMatchAmount(String(suggested));
    }
  }, [selectedInvoice, selectedPayment, matchAmount]);

  async function createInvoice() {
    setError(null);
    try {
      await window.purrifer.invoiceAndPayment.createInvoiceDraft({
        entityId,
        supplierName: supplierName.trim(),
        grossAmount: Number(grossAmount),
        netAmount: Number(netAmount),
        vatAmount: Number(vatAmount)
      });
      setSupplierName("");
      setGrossAmount("0");
      setNetAmount("0");
      setVatAmount("0");
      await refresh();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa faktura.");
    }
  }

  async function createPayment() {
    setError(null);
    try {
      await window.purrifer.invoiceAndPayment.createPaymentEvent({
        entityId: paymentEntityId,
        amount: Number(paymentAmount),
        paymentMethod,
        paymentDate
      });
      setPaymentAmount("0");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      await refresh();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa betalning.");
    }
  }

  async function createMatch() {
    setError(null);
    if (!selectedInvoiceId || !selectedPaymentId) {
      setError("Välj både faktura och betalning innan matchning.");
      return;
    }
    try {
      await window.purrifer.invoiceAndPayment.matchPaymentToInvoice({
        invoiceId: selectedInvoiceId,
        paymentId: selectedPaymentId,
        amount: Number(matchAmount),
        actor: "operator",
        note: matchNote.trim() || undefined
      });
      setMatchAmount("");
      setMatchNote("");
      await refresh(initialInvoiceId, initialPaymentId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte matcha betalning.");
    }
  }

  async function acknowledgeDeviation(invoiceId: string) {
    setError(null);
    if (!deviationNote.trim()) {
      setError("Notering krävs när en avvikelse bekräftas.");
      return;
    }

    try {
      await window.purrifer.invoiceAndPayment.acknowledgeInvoiceDeviation({
        invoiceId,
        note: deviationNote,
        actor: "operator"
      });
      setDeviationNote("");
      await refresh();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte bekräfta avvikelse.");
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Invoice and Payment"
        title="Fakturor, betalningar och matchning"
        description="Matcherar fordran och betalning med persistenta status- och händelseloggar."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <SplitLayout>
        <Panel title="Ny faktura">
          <FieldGrid>
            <Field label="Entitet">
              <input
                className="ui-input"
                value={entityId}
                onChange={(event) => setEntityId(event.target.value)}
              />
            </Field>
            <Field label="Leverantör">
              <input
                className="ui-input"
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
              />
            </Field>
            <Field label="Brutto">
              <input
                className="ui-input"
                value={grossAmount}
                onChange={(event) => setGrossAmount(event.target.value)}
              />
            </Field>
            <Field label="Netto">
              <input className="ui-input" value={netAmount} onChange={(event) => setNetAmount(event.target.value)} />
            </Field>
            <Field label="Moms">
              <input className="ui-input" value={vatAmount} onChange={(event) => setVatAmount(event.target.value)} />
            </Field>
            <Actions>
              <Button onClick={() => void createInvoice()}>Skapa faktura</Button>
            </Actions>
          </FieldGrid>
        </Panel>

        <Panel title="Ny betalning">
          <FieldGrid>
            <Field label="Entitet">
              <input
                className="ui-input"
                value={paymentEntityId}
                onChange={(event) => setPaymentEntityId(event.target.value)}
              />
            </Field>
            <Field label="Belopp">
              <input
                className="ui-input"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
              />
            </Field>
            <Field label="Metod">
              <select
                className="ui-input"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as (typeof paymentMethods)[number])}
              >
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Datum">
              <input
                className="ui-input"
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
            </Field>
            <Actions>
              <Button tone="secondary" onClick={() => void createPayment()}>
                Skapa betalning
              </Button>
            </Actions>
          </FieldGrid>
        </Panel>
      </SplitLayout>

      <SplitLayout>
        <Panel
          title="Filter"
          subtitle="Filtrera invoice-läge för översikten"
          actions={
            <Button tone="secondary" onClick={() => void refresh()}>
              Uppdatera
            </Button>
          }
        >
          <FieldGrid>
            <Field label="Entitet">
              <input
                className="ui-input"
                value={entityFilter}
                onChange={(event) => setEntityFilter(event.target.value)}
              />
            </Field>
            <Field label="Status">
              <select
                className="ui-input"
                value={invoiceStatusFilter}
                onChange={(event) => setInvoiceStatusFilter(event.target.value as (typeof invoiceStatuses)[number])}
              >
                <option value="">Alla</option>
                <option value="unpaid">Ej betald</option>
                <option value="partly-paid">Delvis betald</option>
                <option value="paid">Betald</option>
              </select>
            </Field>
            <Field label="Sök faktura/entitet">
              <input
                className="ui-input"
                value={entityQuery}
                onChange={(event) => setEntityQuery(event.target.value)}
              />
            </Field>
          </FieldGrid>
        </Panel>

        <Panel title="Matchning">
          <FieldGrid>
            <Field label="Faktura">
              <select
                className="ui-input"
                value={selectedInvoiceId ?? ""}
                onChange={(event) => setSelectedInvoiceId(event.target.value || null)}
              >
                <option value="">Välj faktura</option>
                {invoices.map((invoice) => (
                  <option key={invoice.invoiceId} value={invoice.invoiceId}>
                    {invoice.invoiceId} · {invoice.supplierName} · {invoice.status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Betalning">
              <select
                className="ui-input"
                value={selectedPaymentId ?? ""}
                onChange={(event) => setSelectedPaymentId(event.target.value || null)}
              >
                <option value="">Välj betalning</option>
                {payments.map((payment) => (
                  <option key={payment.paymentId} value={payment.paymentId}>
                    {payment.paymentId} · {payment.amount} · kvar {payment.unallocatedAmount}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Belopp">
              <input
                className="ui-input"
                value={matchAmount}
                onChange={(event) => setMatchAmount(event.target.value)}
              />
            </Field>
            <Field label="Anteckning (valfritt)">
              <input
                className="ui-input"
                value={matchNote}
                onChange={(event) => setMatchNote(event.target.value)}
                placeholder="Skäl för matchning"
              />
            </Field>
            <Actions>
              <Button tone="secondary" onClick={() => void createMatch()} disabled={!selectedInvoiceId || !selectedPaymentId}>
                Koppla betalning till faktura
              </Button>
            </Actions>
          </FieldGrid>
          {selectedInvoice ? (
            <p className="ui-muted">
              Vald faktura status: <strong>{selectedInvoice.status}</strong> · täckning: {selectedInvoice.matchedAmount} / {selectedInvoice.grossAmount}
            </p>
          ) : null}
          {selectedPayment ? <p className="ui-muted">Vald betalning kvar: {selectedPayment.unallocatedAmount}</p> : null}
        </Panel>
      </SplitLayout>

      <SplitLayout>
        <Panel title="Fakturor" status={<StatusPill>{invoices.length}</StatusPill>}>
          {invoices.length === 0 ? (
            <EmptyState>Inga fakturor hittades.</EmptyState>
          ) : (
            <Stack>
              {invoices.map((invoice) => (
                <button
                  key={invoice.invoiceId}
                  type="button"
                  className={invoice.invoiceId === selectedInvoiceId ? "ui-card selectable selected" : "ui-card selectable"}
                  onClick={() => setSelectedInvoiceId(invoice.invoiceId)}
                >
                  <div className="ui-card__header">
                    <div className="ui-card__title-block">
                      <h4>{invoice.supplierName}</h4>
                      <p className="ui-muted">
                        {invoice.invoiceId} · {invoice.entityId}
                      </p>
                    </div>
                    <div className="ui-card__meta">
                      <StatusPill>{invoice.status}</StatusPill>
                    </div>
                  </div>
                  <p>
                    Belopp: {invoice.grossAmount} · Matchad: {invoice.matchedAmount} · Rest: {invoice.outstandingAmount}
                  </p>
                  {invoice.deviation !== "none" ? (
                    <p>
                      Avvikelse: {invoice.deviation} ({invoice.deviationAmount})
                    </p>
                  ) : null}
                </button>
              ))}
            </Stack>
          )}
        </Panel>

        <Panel title="Betalningar" status={<StatusPill>{payments.length}</StatusPill>}>
          {payments.length === 0 ? (
            <EmptyState>Inga betalningar hittades.</EmptyState>
          ) : (
            <Stack>
              {payments.map((payment) => (
                <article key={payment.paymentId} className="ui-card">
                  <div className="ui-card__header">
                    <div className="ui-card__title-block">
                      <h4>{payment.paymentId}</h4>
                      <p className="ui-muted">{payment.paymentMethod}</p>
                    </div>
                    <div className="ui-card__meta">
                      <StatusPill tone={payment.unallocatedAmount > 0 ? "warning" : "success"}>
                        Kvar: {payment.unallocatedAmount}
                      </StatusPill>
                    </div>
                  </div>
                  <p>
                    Entitet: {payment.entityId} · Totalt: {payment.amount} · Matchad: {payment.allocatedAmount}
                  </p>
                </article>
              ))}
            </Stack>
          )}
        </Panel>
      </SplitLayout>

      <SplitLayout>
        <Panel
          title="Avvikelsefall"
          status={<StatusPill>{deviationItems.length}</StatusPill>}
          actions={
            <Button tone="secondary" onClick={() => void refresh()}>
              Uppdatera
            </Button>
          }
        >
          {deviationItems.length === 0 ? (
            <EmptyState>Inga avvikelsefall just nu.</EmptyState>
          ) : (
            <Stack>
              {deviationItems.map((invoice) => (
                <article key={invoice.invoiceId} className="ui-card">
                  <h4>{invoice.invoiceId}</h4>
                  <p>
                    {invoice.deviation === "underpaid"
                      ? `Underbetalning med ${invoice.deviationAmount}`
                      : `Överbetalning med ${invoice.deviationAmount}`}
                  </p>
                  <p className="ui-muted">Rest: {invoice.outstandingAmount}</p>
                  <Button
                    tone="secondary"
                    onClick={() => {
                      setSelectedInvoiceId(invoice.invoiceId);
                    }}
                  >
                    Välj i matchningspanel
                  </Button>
                  <Actions>
                    <Button
                      tone="primary"
                      onClick={() => void acknowledgeDeviation(invoice.invoiceId)}
                    >
                      Bekräfta avvikelse
                    </Button>
                  </Actions>
                </article>
              ))}
            </Stack>
          )}
        </Panel>

        <Panel
          title="Avvikelseanteckning"
          status={<StatusPill>{historyActionFilter ? historyActionFilter : "alla"}</StatusPill>}
        >
          <FieldGrid>
            <Field label="Händelsehistorik filter (text)">
              <input className="ui-input" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} />
            </Field>
            <Field label="Typ">
              <select
                className="ui-input"
                value={historyActionFilter}
                onChange={(event) => setHistoryActionFilter(event.target.value as (typeof historyActions)[number])}
              >
                <option value="">Alla</option>
                {historyActions.slice(1).map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notering för bekräftelse">
              <textarea className="ui-input" value={deviationNote} onChange={(event) => setDeviationNote(event.target.value)} rows={3} />
            </Field>
          </FieldGrid>
        </Panel>
      </SplitLayout>

      <Panel title="Händelselogg" status={<StatusPill>{history.length}</StatusPill>}>
        {history.length === 0 ? (
          <EmptyState>Ingen logg tillgänglig.</EmptyState>
        ) : (
          <Stack>
            {history.map((item) => (
              <article key={item.historyId} className="ui-card">
                <div className="ui-card__header">
                  <div className="ui-card__title-block">
                    <h4>{item.action}</h4>
                    <p className="ui-muted">{item.actor}</p>
                  </div>
                  <div className="ui-card__meta">
                    <StatusPill>{item.createdAt}</StatusPill>
                  </div>
                </div>
                <p>
                  Faktura: {item.invoiceId || "-"} · Betalning: {item.paymentId || "-"}
                </p>
                <p>Belopp: {item.amount ?? 0}</p>
                {item.beforeStatus || item.afterStatus ? (
                  <p>
                    {item.beforeStatus ?? "-"}→{item.afterStatus ?? "-"}
                  </p>
                ) : null}
                {item.reasonCode ? <p>Orsak: {item.reasonCode}</p> : null}
                {item.note ? <p className="ui-muted">{item.note}</p> : null}
              </article>
            ))}
          </Stack>
        )}
      </Panel>
    </Page>
  );
}
