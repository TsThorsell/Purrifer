import { Page, PageHeader, Panel } from "../../../renderer/components/Ui";

const sections = ["Allmänt", "Import", "Datakällor", "Backup", "Behörigheter"];

export function SettingsPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Shell Core"
        title="Inställningar"
        description="Detta är en skalvy för de styrparametrar som senare slices ska fylla med faktisk funktionalitet."
      />

      <section className="ui-panel-grid">
        {sections.map((section) => (
          <Panel key={section} title={section}>
            <p>Denna sektion är reserverad för framtida inställningar inom samma standardiserade layout.</p>
          </Panel>
        ))}
      </section>
    </Page>
  );
}

