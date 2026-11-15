/**
 * Drives the PlatInform MCP server over stdio with the SDK client and
 * runs the five demo steps in order.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const SERVER = "/Users/nikhilrichard/platforming-index/mcp/dist/index.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [SERVER],
  env: { ...process.env, PLATFORMING_INDEX_URL: "http://localhost:3000" },
});

const client = new Client({ name: "demo-driver", version: "0.1.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("Tools exposed: " + tools.tools.map((t) => t.name).join(", "));
console.log("=".repeat(78));

async function call(label, name, args) {
  console.log(`\n### ${label}`);
  console.log(`call ${name}(${JSON.stringify(args)})\n`);
  const res = await client.callTool({ name, arguments: args });
  const text = res.content.find((c) => c.type === "text")?.text ?? "";
  console.log(text);
  console.log("-".repeat(78));
  return res;
}

// a. Engineer asks for a fan for the battery cabinet.
const a = await call(
  "a. I need a 120 mm 24 volt fan for the VBS-50 battery cabinet.",
  "check_part",
  { description: "120 mm 24 volt axial fan", product: "VBS-50 StorLine Battery Cabinet", unitsPerYear: 1800 }
);

// b. They decline, with a reason.
await call(
  "b. We can't reuse it. The battery cabinet needs US-origin cooling parts for a federal contract.",
  "record_decision",
  {
    description: "120 mm 24 volt axial fan",
    product: "VBS-50",
    decision: "exception",
    matchedPart: "Axial Fan 120mm 24VDC",
    suggestedPn: "10-92550",
    reasonKind: "compliance_or_origin",
    reasonText: "The battery cabinet needs US-origin cooling parts for a federal contract.",
    role: "Engineering / R&D",
  }
);

// c. Same fan, a different product. The rule must not follow it.
const c = await call("c. Same fan for the VMX-20 modular UPS.", "check_part", {
  description: "120 mm 24 volt axial fan",
  product: "modular UPS",
  unitsPerYear: 1200,
});

// d. Same fan, the ruled-out product. Must be blocked with alternatives.
const d = await call("d. I need another 120 mm fan for the VBS-50.", "check_part", {
  description: "axial fan 120 mm 24 VDC",
  product: "battery cabinet",
  unitsPerYear: 450,
});

// e. The whole picture.
await call("e. How is Voltara doing overall?", "get_index", {});

/* assertions */
const textOf = (r) => r.content.find((x) => x.type === "text")?.text ?? "";
const checks = [
  ["a suggests reuse of 10-92550", textOf(a).includes("Reuse 10-92550")],
  ["c is not blocked", !textOf(c).includes("blocked")],
  ["c suggests reuse", textOf(c).includes("Reuse 10-92550")],
  ["d is blocked by the rule", textOf(d).includes("is blocked for VBS-50")],
  ["d offers alternatives", textOf(d).includes("Alternatives that no rule blocks")],
];
console.log("\n### Checks");
let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}`);
}

await client.close();
process.exit(failed ? 1 : 0);
