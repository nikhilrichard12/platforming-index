import { loadSurvey, loadVoltaraData } from "@/lib/voltaraData.server";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  // Read on the server; the client gets the parsed data, never the files.
  return <DashboardClient data={loadVoltaraData()} survey={loadSurvey()} />;
}
