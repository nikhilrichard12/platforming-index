import {
  loadMatcherEval,
  loadMatcherGrouping,
  loadReviewQueue,
  loadSurvey,
  loadVoltaraData,
} from "@/lib/voltaraData.server";
import { loadSources } from "@/lib/sources.server";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { planNeeds } from "@/lib/planner.server";
import { SAMPLE_CONCEPT, splitNeeds, summarize } from "@/lib/plan";

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

  // The interface benchmark, measured on the sample concept. It sits beside
  // the four dimensions and is not part of the score.
  const plan = summarize(
    planNeeds(SAMPLE_CONCEPT.name, splitNeeds(SAMPLE_CONCEPT.description))
  );

  return (
    <DashboardClient
      data={data}
      survey={loadSurvey()}
      evaluation={loadMatcherEval()}
      grouping={loadMatcherGrouping()}
      reviewQueue={loadReviewQueue()}
      reuse={{
        concept: SAMPLE_CONCEPT.name,
        needs: plan.total,
        startFromSomethingBuilt: plan.onInterface + plan.onPart,
        onInterface: plan.onInterface,
        newThinking: plan.newThinking,
      }}
      basis={`From ${basis}.`}
    />
  );
}
