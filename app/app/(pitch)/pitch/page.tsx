import {
  loadInterfaces,
  loadMatcherEval,
  loadSurvey,
  loadVoltaraData,
} from "@/lib/voltaraData.server";
import { loadSources } from "@/lib/sources.server";
import { computeIndex } from "@/lib/index";
import {
  ALIGNMENT,
  AlignmentDecision,
  applyAlignment,
  computeRings,
} from "@/lib/alignment";
import { FUNCTIONS } from "@/lib/roles";
import PitchDeck from "@/components/pitch/PitchDeck";

/**
 * The deck reads the same files the dashboard does, on the server, and the
 * client gets the parsed result. Nothing on a screen is typed in: the two
 * index scores either side of screen 6 are both computed here by
 * lib/index.ts, the second one from the survey after the two decisions have
 * been applied to it.
 */
export default function PitchPage() {
  const data = loadVoltaraData();
  const survey = loadSurvey();
  const sources = loadSources().sources;
  const rows = (id: string) => sources.find((s) => s.id === id)?.rows ?? null;

  /**
   * The two decisions screen 6 records. The owner is the one the most
   * functions already name, read from the survey rather than chosen here; the
   * target is the first option the alignment card offers.
   */
  const before = computeIndex(data, survey, []);
  const ownerChoice = before.working.ownerTop?.owner ?? ALIGNMENT.ownership.options[0];
  const targetChoice = ALIGNMENT.measured.options[0];

  const at = "recorded on screen 6";
  const decisions: AlignmentDecision[] = [
    {
      id: "pitch-ownership",
      at,
      question: "ownership",
      choice: ownerChoice,
      source: "dashboard",
    },
    {
      id: "pitch-measured",
      at,
      question: "measured",
      choice: targetChoice,
      source: "dashboard",
    },
  ];

  const decidedSurvey = applyAlignment(survey, decisions);
  const after = computeIndex(data, decidedSurvey, []);

  const ringsBefore = computeRings(survey.questions, FUNCTIONS, []);
  const ringsAfter = computeRings(decidedSurvey.questions, FUNCTIONS, [
    "ownership",
    "measured",
  ]);

  return (
    <PitchDeck
      bundle={{
        data,
        before,
        after,
        ringsBefore,
        ringsAfter,
        ownerChoice,
        targetChoice,
        bomLines: rows("plm"),
        purchaseOrders: rows("erp_spend"),
        products: rows("product_master"),
        interfaces: loadInterfaces(),
        matcherEval: loadMatcherEval(),
      }}
    />
  );
}
