import {
  loadMatcherEval,
  loadMatcherGrouping,
  loadReviewQueue,
  loadSurvey,
  loadVoltaraData,
} from "@/lib/voltaraData.server";
import { loadSources } from "@/lib/sources.server";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  // Read on the server; the client gets the parsed data, never the files.
  const data = loadVoltaraData();
  const sources = loadSources().sources;
  const purchaseOrders = sources.find((s) => s.id === "erp_spend")?.rows ?? null;

  // The measured index says what it was measured from.
  const basis = [
    `${data.summary.partNumbers.toLocaleString("en-US")} part numbers`,
    purchaseOrders
      ? `${purchaseOrders.toLocaleString("en-US")} purchase orders`
      : null,
  ]
    .filter(Boolean)
    .join(" and ");

  return (
    <DashboardClient
      data={data}
      survey={loadSurvey()}
      evaluation={loadMatcherEval()}
      grouping={loadMatcherGrouping()}
      reviewQueue={loadReviewQueue()}
      basis={`From ${basis}.`}
    />
  );
}
