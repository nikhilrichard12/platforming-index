# PlatInform MCP server

The reuse decision happens while an engineer designs, not when procurement
raises a part number. Every team runs a different NPD or PLM system, but every
team now runs an agent, so the check is delivered here: any agent can call it
from inside whatever tool the engineer is already using.

The Chrome extension in `extension/` stays as the backup path for teams
without an agent.

This server holds no data. It calls the PlatInform app, which owns the
parts data, the rules, and the index.

## Build and run

```sh
cd app && npm run dev          # the app must be on http://localhost:3000
cd mcp && npm install && npm run build
```

`PLATFORMING_INDEX_URL` overrides the app URL (default `http://localhost:3000`).

Run the five-step demo against a running app:

```sh
cd mcp && node demo.mjs
```

## Claude Desktop

Add this to `claude_desktop_config.json`
(`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS),
then restart Claude Desktop:

```json
{
  "mcpServers": {
    "platforming-index": {
      "command": "node",
      "args": ["/Users/nikhilrichard/platforming-index/mcp/dist/index.js"],
      "env": {
        "PLATFORMING_INDEX_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Claude Code

From the repository root:

```sh
claude mcp add platforming-index \
  --env PLATFORMING_INDEX_URL=http://localhost:3000 \
  -- node /Users/nikhilrichard/platforming-index/mcp/dist/index.js
```

Check it with `claude mcp list`.

## Tools

| Tool | When the agent calls it |
|---|---|
| `check_part` | Before specifying, designing in, or requesting any component. Returns the part Voltara already buys, its part number count, best price and supplier, the yearly saving, and the number to reuse. If a rule blocks it, returns the rule and alternatives instead. |
| `record_decision` | When the engineer accepts or declines a suggestion. Declining needs a reason, and creates a rule. |
| `get_rules` | To see what is already ruled out, and why, before suggesting anything. |
| `get_index` | When someone asks how the product line is doing overall. |
| `open_dashboard` | When the engineer wants the whole picture rather than one part. |

Products: `VRK-1000`, `VRK-3000`, `VMX-20`, `VSI-5`, `VSI-10`, `VBS-50`. The
tools also accept product names and partial names, so "battery cabinet" and
"StorLine 50 kWh Battery Cabinet" both resolve to `VBS-50`.

## Demo script

Say these to the agent in order. Expected behaviour alongside.

| Say | What should happen |
|---|---|
| a. "I need a 120 mm 24 volt fan for the VBS-50 battery cabinet." | `check_part` finds Axial Fan 120mm 24VDC: 6 part numbers today, best price $9.77 from Norwick Components, $5,324 of yearly gap at 1,800 units. Suggests reusing **10-92550**. |
| b. "We can't reuse it. The battery cabinet needs US-origin cooling parts for a federal contract." | `record_decision` records an exception of kind compliance or country of origin, and creates rule R0001 scoped to VBS-50 and that fan. States that the index score does not drop. |
| c. "Same fan for the VMX-20 modular UPS." | `check_part` suggests reuse again. The rule is scoped to VBS-50 only, so it does not follow the part to another product. |
| d. "I need another 120 mm fan for the VBS-50." | `check_part` is blocked. Cites rule R0001 with its date, and offers alternatives in the same category that no rule blocks, instead of the reuse suggestion. |
| e. "How is Voltara doing overall?" | `get_index` returns 34 of 100, provisional, "Sharing parts, not yet a platform", the four dimensions, step 1 of three, and the headline part and spend numbers. |

Reset between runs with `curl -X DELETE http://localhost:3000/api/rules`, or
the "Reset demo data" button on the dashboard's Decisions tab.

A sample transcript of all five steps is in
`docs/design/out/06-mcp-demo.txt`.

## Notes

- Every tool answers in plain text first and puts the JSON after it, so the
  agent can speak the answer without parsing anything.
- Every `check_part` answer ends with "A match is a suggestion until
  engineering confirms fit."
- An exception never lowers the PlatInform score. Complexity a rule
  requires is not complexity anyone chose.
- Sample company and sample data throughout.
