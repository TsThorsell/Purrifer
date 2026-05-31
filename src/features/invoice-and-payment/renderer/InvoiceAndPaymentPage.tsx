import { useEffect, useState } from "react";
import type { InvoiceSummary, PaymentEventSummary, PaymentMethod } from "../contracts";

const methods: PaymentMethod[] = ["bank", "swish", "card", "internal-transfer", "manual"];

export function InvoiceAndPaymentPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [payments, setPayments] = useState<PaymentEventSummary[]>([]);
  const [entityId, setEntityId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [grossAmount, setGrossAmount] = useState("0");
  const [netAmount, setNetAmount] = useState("0");
  const [vatAmount, setVatAmount] = useState("0");
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [invoiceList, paymentList] = await Promise.all([
      window.purrifer.invoiceAndPayment.listInvoices(),
      window.purrifer.invoiceAndPayment.listPaymentEvents()
    ]);
    setInvoices(invoiceList);
    setPayments(paymentList);
  }

  useEffect(() => {
    void refresh().catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "Kunde inte lasa fakturadata.")
    );
  }, []);

  async function createInvoice() {
    setError(null);
    try {
      await window.purrifer.invoiceAndPayment.createInvoiceDraft({
        entityId,
        supplierName,
        grossAmount: Number(grossAmount),
        netAmount: Number(netAmount),
        vatAmount: Number(vatAmount)
      });
      await refresh();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa faktura.");
    }
  }

  async function createPayment() {
    setError(null);
    try {
      await window.purrifer.invoiceAndPayment.createPaymentEvent({
        entityId,
        amount: Number(paymentAmount),
        paymentMethod,
        paymentDate
      });
      await refresh();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa betalning.");
    }
  }

  async function quickMatch(invoiceId: string, paymentId: string, amount: number) {
    setError(null);
    try {
      await window.purrifer.invoiceAndPayment.matchPaymentToInvoice(invoiceId, paymentId, amount);
      await refresh();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte matcha betalning.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Invoice and Payment</p>
          <h2>Fakturor, betalningar och matchning</h2>
        </div>
      </header>
      {error ? <div className="error-banner">{error}</div> : null}
      <section className="split-layout">
        <article className="panel-card">
          <h3>Ny faktura</h3>
          <div className="detail-grid">
            <div><p className="detail-label">Entity Id</p><input value={entityId} onChange={(e) => setEntityId(e.target.value)} /></div>
            <div><p className="detail-label">Leverantor</p><input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /></div>
            <div><p className="detail-label">Brutto</p><input value={grossAmount} onChange={(e) => setGrossAmount(e.target.value)} /></div>
            <div><p className="detail-label">Netto</p><input value={netAmount} onChange={(e) => setNetAmount(e.target.value)} /></div>
            <div><p className="detail-label">Moms</p><input value={vatAmount} onChange={(e) => setVatAmount(e.target.value)} /></div>
            <div className="detail-actions"><button className="primary-button" type="button" onClick={() => void createInvoice()}>Skapa</button></div>
          </div>
        </article>
        <article className="panel-card">
          <h3>Ny betalning</h3>
          <div className="detail-grid">
            <div><p className="detail-label">Entity Id</p><input value={entityId} onChange={(e) => setEntityId(e.target.value)} /></div>
            <div><p className="detail-label">Belopp</p><input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /></div>
            <div><p className="detail-label">Metod</p><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>{methods.map((m)=><option key={m} value={m}>{m}</option>)}</select></div>
            <div><p className="detail-label">Datum</p><input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
            <div className="detail-actions"><button className="secondary-button" type="button" onClick={() => void createPayment()}>Skapa</button></div>
          </div>
        </article>
      </section>
      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline"><h3>Fakturor</h3><span className="status-pill neutral">{invoices.length}</span></div>
          <div className="stacked-list">{invoices.map((invoice)=><article key={invoice.invoiceId} className="list-card"><h4>{invoice.supplierName}</h4><p className="muted">{invoice.invoiceId} · {invoice.entityId}</p><p>{invoice.grossAmount} ({invoice.status})</p></article>)}</div>
        </article>
        <article className="panel-card">
          <div className="panel-topline"><h3>Betalningar</h3><span className="status-pill neutral">{payments.length}</span></div>
          <div className="stacked-list">
            {payments.map((payment)=><article key={payment.paymentId} className="list-card"><h4>{payment.paymentMethod}</h4><p className="muted">{payment.paymentId} · {payment.entityId}</p><p>{payment.amount} · {payment.paymentDate}</p>{invoices[0] ? <button className="secondary-button" type="button" onClick={() => void quickMatch(invoices[0].invoiceId, payment.paymentId, payment.amount)}>Snabbmatcha mot senaste faktura</button> : null}</article>)}
          </div>
        </article>
      </section>
    </section>
  );
}

