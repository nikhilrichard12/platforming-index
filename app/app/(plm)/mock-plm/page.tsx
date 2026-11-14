import { SAMPLE_CONCEPT } from "@/lib/plan";

export const metadata = {
  title: "VBS-30 Outdoor Battery Cabinet · Partsmith PLM",
};

/**
 * The backup demo page: a fictional PLM requirements record for a product
 * Voltara does not build. The panel reads this page the same way it reads any
 * other, which is the point of showing it on software we do not own.
 */
const NEEDS = SAMPLE_CONCEPT.description.split("\n");

const NOTES: Record<string, string> = {
  "Cabinet enclosure, outdoor rated, 50 kWh class": "IP55 minimum, pad mount",
  "Battery module, LFP, 5 kWh": "Six modules per cabinet",
  "Contactor, DC, 150 A": "Main isolation",
  "Busbar, copper, 200 A": "Tin plated",
  "IGBT module, half bridge, 1200 V 100 A": "Two per phase leg",
  "DC link capacitor, electrolytic, 470 uF 450 V": "Bank of four",
  "Gate driver board, isolated, 6 channel": "Reinforced isolation",
  "Control board with DSP": "Carries the cabinet firmware",
  "Current sensor, hall effect, 100 A": "One per phase",
  "Temperature sensor, NTC 10k": "Four points per cabinet",
  "Cooling fan, axial, 120 mm 24 VDC": "Two fans, redundant",
  "Fan guard, wire, 120 mm": "Finger safe",
  "Heatsink, extruded aluminum, 200 mm": "Natural convection backup",
  "Terminal block, 6 pole, 30 A": "Auxiliary wiring",
  "Bidirectional 30 kW power conversion module": "No existing equivalent",
  "Liquid cooling cold plate": "Option for hot climates",
  "Cellular 4G telemetry gateway": "Where ethernet is unavailable",
  "Anti-theft door intrusion switch": "Site security requirement",
};

export default function MockPlmPage() {
  return (
    <>
      <header className="pl-top">
        <div className="pl-brand">
          Partsmith<span> PLM</span>
        </div>
        <div className="pl-user">R. Mandal · Engineering</div>
      </header>

      <main className="pl-wrap">
        <p className="pl-crumb">Programs / StorLine / VBS-30</p>
        <h1 className="pl-title">VBS-30 Outdoor Battery Cabinet</h1>
        <p className="pl-meta">
          Product requirements, revision B · owner Engineering · status Draft
          <span className="pl-flag">Fictional sample record</span>
        </p>

        <section className="pl-card">
          <h2>Scope</h2>
          <p>
            A 30 kW outdoor battery cabinet for commercial sites, sitting
            between the existing StorLine 50 kWh cabinet and the ModuLine UPS
            range. Outdoor rated, pad mounted, serviceable from the front.
          </p>
          <p>
            This record lists what the cabinet needs. Part numbers are not
            assigned yet; sourcing decides those once engineering confirms
            fit.
          </p>
        </section>

        <section className="pl-card">
          <h2>What it needs</h2>
          <table className="pl-table">
            <thead>
              <tr>
                <th className="pl-id">Item</th>
                <th>Requirement</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {NEEDS.map((need, i) => (
                <tr key={need}>
                  <td className="pl-id">R-{String(i + 1).padStart(3, "0")}</td>
                  <td>{need}</td>
                  <td className="pl-sub">{NOTES[need] ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="pl-foot">
          Partsmith PLM is a fictional product used for a demonstration. Voltara
          Power Systems and the VBS-30 are fictional too, and so is every
          requirement on this page.
        </p>
      </main>
    </>
  );
}
