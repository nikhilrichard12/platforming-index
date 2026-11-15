/**
 * Site adapters.
 *
 * Every procurement system names its fields differently, so the only
 * site-specific knowledge in this extension lives here: how to find the four
 * fields we read and the one field we write. Everything downstream works on
 * the values, not the page.
 *
 * To support a second system, add an entry keyed by a substring of its URL:
 *
 *   "acme-erp.example.com/requisition": {
 *     name: "Acme ERP",
 *     description: 'input[name="RequisitionLine.Description"]',
 *     product:     'select[name="RequisitionLine.Program"]',
 *     unitsPerYear:'input[name="RequisitionLine.AnnualQty"]',
 *     partNumber:  'input[name="RequisitionLine.ItemCode"]',
 *     // optional: where to anchor the card, if not the viewport edge
 *   }
 *
 * Selectors should prefer stable ids or name attributes over classes, which
 * tend to change when the host system is restyled.
 */
/* The PlatInform server. scripts/package-extension.sh rewrites this line, so
   the mock procurement screen is found wherever that server is. */
const PI_SERVER = "http://localhost:3000";

const PI_ORDERDESK = {
  name: "OrderDesk",
  description: "#part-description",
  product: "#product",
  unitsPerYear: "#units-per-year",
  partNumber: "#part-number",
};

const PI_ADAPTERS = {
  "localhost:3000/mock-procurement": PI_ORDERDESK,
  [`${PI_SERVER.replace(/^https?:\/\//, "").replace(/\/$/, "")}/mock-procurement`]:
    PI_ORDERDESK,
};

/** The adapter whose key appears in this page's URL, or null. */
function piFindAdapter(href) {
  for (const [key, adapter] of Object.entries(PI_ADAPTERS)) {
    if (href.includes(key)) return adapter;
  }
  return null;
}
