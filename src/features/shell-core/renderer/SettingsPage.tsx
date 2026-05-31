const sections = [
  "Allmänt",
  "Backup",
  "Dokumenttolkning",
  "Mailimport",
  "Kategorier och taggar",
  "Regler och mallar",
  "Exporter och rapporter",
  "Applås"
];

export function SettingsPage() {
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Shell Core</p>
          <h2>Inställningar</h2>
          <p className="muted">
            Detta är en skalvy för de styrparametrar som senare slices ska fylla med faktisk funktionalitet.
          </p>
        </div>
      </header>

      <section className="panel-grid">
        {sections.map((section) => (
          <article key={section} className="panel-card">
            <h3>{section}</h3>
            <p>Denna sektion är reserverad för framtida inställningar inom samma standardiserade layout.</p>
          </article>
        ))}
      </section>
    </section>
  );
}
