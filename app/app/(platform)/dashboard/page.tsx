import path from "path";
import { loadSurvey, loadVoltaraData } from "@/lib/voltaraData.server";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  // Read on the server; the client gets the parsed data, never the files.
  // The agent config blocks need the real path to the built MCP server.
  const mcpServerPath = path.join(process.cwd(), "..", "mcp", "dist", "index.js");
  return (
    <DashboardClient
      data={loadVoltaraData()}
      survey={loadSurvey()}
      mcpServerPath={mcpServerPath}
    />
  );
}
