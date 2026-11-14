import { UserProfile } from "../types";
import { VOLTARA_STATS } from "../voltaraStats";
import { getRoleConfig } from "../roles";

export interface PromptSection {
  id: string;
  heading: string;
  body: string;
  source: string;
}

export function buildSystemPrompt(profile: UserProfile): string {
  return buildPromptSections(profile)
    .map((s) => `## ${s.heading}\n${s.body}`)
    .join("\n\n");
}

export function buildPromptSections(profile: UserProfile): PromptSection[] {
  const roleCfg = profile.role ? getRoleConfig(profile.role) : null;
  const stats = VOLTARA_STATS;

  const sections: PromptSection[] = [
    {
      id: "role_profile",
      heading: "ROLE AND PROFILE",
      body: [
        `Role: ${profile.role || "Not specified"}`,
        `Decision level: ${profile.decisionLevel || "Not specified"}`,
        `Products covered: ${profile.products.length > 0 ? profile.products.join(", ") : "All"}`,
        `Measured on: ${profile.metrics.length > 0 ? profile.metrics.join(", ") : "Not specified"}`,
        roleCfg ? `Emphasis: ${roleCfg.emphasis}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      source: "Survey · Screen 1",
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
      source: "Survey · Screen 1",
    },
    {
      id: "company_data",
      heading: "COMPANY DATA",
      body: [
        `Company: Voltara (sample / fictional)`,
        `Source files: ${stats.sources.bom.file} (${stats.sources.bom.rows} rows), ${stats.sources.spend.file} (${stats.sources.spend.rows} rows), ${stats.sources.products.file} (${stats.sources.products.rows} rows)`,
        `BOM lines: ${stats.bomLines}`,
        `Distinct part numbers: ${stats.distinctPartNumbers}`,
        `Products: ${stats.productCount}`,
        `Purchase orders: ${stats.poCount}`,
        `Annual spend (stated): ~$${(stats.totalYearlySpendUsd / 1_000_000).toFixed(1)}M`,
      ].join("\n"),
      source: `voltara_boms.csv · voltara_spend_cube.csv · voltara_product_master.csv`,
    },
    {
      id: "role_metrics",
      heading: "ROLE METRICS",
      body: roleCfg
        ? [
            `KPI focus order: ${roleCfg.kpiFocus.join(" > ")}`,
            `Lead questions for this role:`,
            roleCfg.suggestedQuestions.map((q) => `  - ${q}`).join("\n"),
          ].join("\n")
        : "Role not set — no role-specific metrics loaded.",
      source: "app/lib/roles.ts",
    },
    {
      id: "rules",
      heading: "RULES",
      body: [
        "1. Cite a source row or a listed assumption for every number you state. Never invent figures.",
        "2. Label all Voltara data as sample data (fictional company) in every response.",
        "3. Lead answers for this role with time to market, cost, and complexity — in the order set by ROLE METRICS.",
        "4. Platforming is the method, not the headline. Lead with the business outcome.",
        "5. If a question cannot be answered from the loaded data, say so explicitly and state what data would be needed.",
        "6. Keep responses concise. Use bullet points for lists of findings.",
      ].join("\n"),
      source: "CLAUDE.md · docs/CONTEXT.md",
    },
    {
      id: "assumptions",
      heading: "ASSUMPTIONS",
      body: [
        "A1: Annual spend of ~$39.3M is from voltara_spend_cube.csv extended_usd column, summed across all POs.",
        "A2: Time to market figures are qualitative only — no launch-to-ship data exists in the sample files.",
        "A3: Savings estimate of ~$1.13M/year (paying lowest existing price on shared parts) is from CLAUDE.md stated facts; engine has not yet validated this.",
        "A4: Part counts (60 real parts, 45 shared, 23 in 5+ products) are from CLAUDE.md stated facts; pending engine validation.",
        "A5: Complexity index score is pending engine output (data/derived/placeholder.json).",
      ].join("\n"),
      source: "CLAUDE.md stated facts",
    },
  ];

  return sections;
}
