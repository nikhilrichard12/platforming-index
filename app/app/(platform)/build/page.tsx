import { loadSurvey, loadVoltaraData } from "@/lib/voltaraData.server";
import BuildClient from "@/components/build/BuildClient";

export default function BuildPage() {
  // Read on the server; the client assembles the prompt from the parsed data.
  return <BuildClient data={loadVoltaraData()} survey={loadSurvey()} />;
}
