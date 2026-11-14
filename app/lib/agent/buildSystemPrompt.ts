import { UserProfile } from "../types";
import { getRoleConfig } from "../roles";
import { roleViewFor } from "../roleViews";
import { PRODUCT_MASTER, VoltaraData, px, usd } from "../voltaraData";
import { SurveyFile, applyOwnAnswers, isSplit } from "../survey";
import { Rule, reasonLabel } from "../rules";

export interface PromptSection {
  id: string;
  heading: string;
  body: string;
  source: string;
}

export function buildSystemPrompt(
  profile: UserProfile,
  data: VoltaraData,
  survey: SurveyFile,
  rules: Rule[] = []
): string {
  return buildPromptSections(profile, data, survey, rules)
    .map((s) => `## ${s.heading}\n${s.body}`)
    .join("\n\n");
}

/**
 * One compact line per part, as in the reference prototype's context():
 * name | counts | gap | spend :: part number (products, "description as written",
 * average unit price, supplier, [purchase order tag]); ...
 */
function partsTable(data: VoltaraData): string {
  return data.byGap
    .map(
      (g) =>
        `${g.name} | ${g.rows.length} part numbers | ${g.products} products | ${g.suppliers} suppliers | yearly gap $${g.gap} | yearly spend $${g.spend} :: ` +
        g.rows
          .map(
            (r) =>
              `${r.pn} (${r.products.join("+")}, "${r.desc}", ${px(r.price)}, ${r.supplier}, [${r.po}])`
          )
          .join("; ")
    )
    .join("\n");
}

/** The alignment view's own numbers, so the assistant and the screen agree. */
function surveyLines(survey: SurveyFile, profile: UserProfile): string {
  const { questions, you } = applyOwnAnswers(survey, profile);
  const rows = questions.map((q) => {
    const answers = survey.functions
      .map((f) => `${f}${f === you ? " (this user)" : ""}: ${q.answers[f]}`)
      .join("; ");
    return `  - "${q.text}" ${isSplit(q, survey.functions) ? "Split" : "Agreed gap"}. ${answers}. Decision to make: ${q.decision}`;
  });
  return [
    `Survey answers by function [survey] (sample responses, except this user's own function):`,
    ...rows,
  ].join("\n");
}

export function buildPromptSections(
  profile: UserProfile,
  data: VoltaraData,
  survey: SurveyFile,
  rules: Rule[] = []
): PromptSection[] {
  const roleCfg = profile.role ? getRoleConfig(profile.role) : null;
  const view = roleViewFor(profile.role);
  const s = data.summary;
  const idx = data.index;

  return [
    {
      id: "role_profile",
      heading: "ROLE AND PROFILE",
      body: [
        `Role: ${profile.role || "Not specified"}`,
        `Decision level: ${profile.decisionLevel || "Not specified"}`,
        `Products covered: ${profile.products.length > 0 ? profile.products.join(", ") : "All"}`,
        `Measured on: ${profile.metrics.length > 0 ? profile.metrics.join(", ") : "Not specified"}`,
        `This role cares about ${view.lens}`,
        roleCfg ? `Emphasis: ${roleCfg.emphasis}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      source: "Your survey: profile",
    },
    {
      id: "beliefs",
      heading: "BELIEFS",
      body: [
        `Customers need every variant (1=disagree, 5=agree): ${profile.customersNeedEveryVariant || "Not answered"}`,
        `Architecture ownership: ${profile.architectureOwner || "Not answered"}`,
        `Measured on complexity: ${profile.measuredOnComplexity || "Not answered"}`,
        `Team checks for existing parts before specifying new (1=never, 5=always): ${profile.checksForExistingPart || "Not answered"}`,
        `Biggest platforming blocker: ${profile.biggestBlocker || "Not answered"}`,
        profile.currentDecision ? `Decision in front of them: ${profile.currentDecision}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      source: "Your survey: beliefs",
    },
    {
      id: "company_data",
      heading: "COMPANY DATA",
      body: [
        `Company: ${data.company}. Period: ${data.period}.`,
        `Summary: ${s.partNumbers} part numbers describe ${s.realParts} real parts. ${s.sharedParts} parts are shared by 2 or more products, ${s.coreCandidates} by 5 or more (common core candidates), ${s.uniqueParts} are unique to one product. ${s.partNumbersReusedAcrossProducts} part numbers are already reused across products. Yearly parts spend $${s.yearlySpendUsd} (${usd(s.yearlySpendUsd)}). Yearly price gap on shared parts if every line paid the lowest price Voltara already pays: $${s.yearlyPriceGapUsd} (${usd(s.yearlyPriceGapUsd)}). ${s.needsReviewLines} battery cabinet lines say only "SEE DWG" and wait for engineering review. ${s.suppliers} suppliers; ${s.multiSupplierParts} parts have 2 or more suppliers. Sustaining engineering ${s.sustainingHoursPerYear} hours a year. Lead time ${s.leadTimeWeeksMin} to ${s.leadTimeWeeksMax} weeks.`,
        `Platforming Index: ${idx.score} of 100, ${idx.status}, equal weights. ${idx.dimensions.map((d) => `${d.name} ${d.score} (${d.basis}) [${d.source}]`).join("; ")}. Path: step 1 cut cost on current products (now), step 2 consolidate duplicate parts, step 3 common core plus modules for the next generation. Voltara is on step ${idx.step}.`,
        surveyLines(survey, profile),
        `Peer benchmark [kearney_survey]: ${survey.benchmark.text}`,
        `Products [product_master] (id, name, units per year, lead time weeks, sustaining engineering hours per year):`,
        PRODUCT_MASTER.map((p) => [p.id, p.name, p.units, p.leadWeeks, p.hours].join(", ")).join("\n"),
        `Parts (name | counts | gap | spend :: part number (product, description as written, average unit price, supplier, [purchase order tag])):`,
        partsTable(data),
      ].join("\n"),
      source: "data/derived/voltara_parts.json",
    },
    {
      id: "role_metrics",
      heading: "ROLE METRICS",
      body: roleCfg
        ? [
            `KPI focus order: ${roleCfg.kpiFocus.join(" > ")}`,
            `The four numbers on this user's dashboard:`,
            view.kpis(data).map((k) => `  - ${k.label}: ${k.value}`).join("\n"),
            `Lead questions for this role:`,
            view.suggested.map((q) => `  - ${q}`).join("\n"),
          ].join("\n")
        : "Role not set. No role-specific metrics loaded.",
      source: "app/lib/roleViews.ts",
    },
    {
      id: "rules_in_force",
      heading: "RULES IN FORCE",
      body:
        rules.length === 0
          ? "No rules yet. Nothing has been ruled out, so every suggestion stands on the data alone."
          : [
              "Each rule came from an engineer declining a suggested part and saying why. A rule outranks any reuse suggestion for its product. Never suggest reusing a part a rule blocks for that product; say what the rule is and offer another part.",
              ...rules.map(
                (r) =>
                  `  - ${r.scope.product}: ${r.appliesToPart} is ruled out. "${r.text}" (${reasonLabel(r.kind)}, set ${r.at.slice(0, 10)}) [rule ${r.id}]`
              ),
              "An exception does not lower the index score. Complexity a rule requires is not complexity anyone chose.",
            ].join("\n"),
      source: "data/derived/decisions.json",
    },
    {
      id: "rules",
      heading: "RULES",
      body: [
        '1. Answer the question first, in plain language for this role. At most 110 words. Short paragraphs or up to 4 bullets starting with "- ". No headings, no tables, no bold.',
        "2. Use only the DATA above. If the data cannot answer, say what is missing. Never invent a number.",
        "3. Put an evidence tag right after each number, copied exactly from the data: a purchase order tag like [PO450076], or [product_master], [survey], [kearney_survey]. Use at most 4 tags per answer.",
        "4. A matched part is a suggestion until engineering approves. A price gap is not booked savings. The index score is provisional. Say so when relevant.",
        "5. Label all Voltara data as sample data from a fictional company when the user asks what it is.",
        "6. Lead answers for this role with time to market, cost, and complexity, in the order set by ROLE METRICS. Platforming is the method, not the headline.",
        "7. Do not use em dashes.",
      ].join("\n"),
      source: "CLAUDE.md · docs/CONTEXT.md",
    },
    {
      id: "assumptions",
      heading: "ASSUMPTIONS",
      body: [
        `A1: Part groups come from voltara_answer_key.csv until the matcher exists. Every group is correct by construction, not matched, so matching accuracy is still unmeasured.`,
        `A2: The ${usd(s.yearlyPriceGapUsd)} yearly price gap is computed, not a stated fact: for each shared part, yearly spend above the lowest average price Voltara already pays for that part, summed across parts. It is a gap, not booked savings.`,
        `A3: Unit prices are average prices from voltara_spend_cube.csv. Each row carries one source purchase order; a part number bought many times shows its average.`,
        `A4: The Platforming Index score of ${idx.score} is provisional. Four dimensions, equal weights. ${idx.dimensions[3].name} scores ${idx.dimensions[3].score} as a midpoint because there is no data yet on new part numbers per year. There is no peer benchmark.`,
        `A5: Time to market is qualitative only. Lead time by product exists; no launch-to-ship data exists in the sample files.`,
        `A6: The ${s.needsReviewLines} "SEE DWG" lines are excluded from every figure above until engineering confirms them.`,
      ].join("\n"),
      source: "data/derived/voltara_parts.json",
    },
  ];
}
