/**
 * OrderDesk: a stand-in for the procurement system the manufacturer already
 * runs. There is no PlatInform code on this page and it knows nothing
 * about the new part check. The check arrives through a browser extension.
 */
export default function MockProcurementPage() {
  return (
    <div className="od-shell">
      <nav className="od-side">
        <p className="od-side-label">Purchasing</p>
        <a href="#" className="on">
          Requisitions
        </a>
        <a href="#">Orders</a>
        <a href="#">Suppliers</a>
        <a href="#">Invoices</a>
      </nav>

      <div className="od-main">
        <header className="od-head">
          <span className="od-brand">OrderDesk</span>
          <span className="od-user">Voltara Power Systems · j.okafor</span>
        </header>

        <main className="od-body">
          <p className="od-crumb">Requisitions / New</p>
          <h1 className="od-title">New part requisition REQ-2026-1184</h1>
          <p className="od-sub">
            Raise a part number for a component not yet in the catalogue.
          </p>

          <form className="od-card" action="#" method="post">
            <h2>Part details</h2>
            <div className="od-form">
              <div className="od-row">
                <label htmlFor="part-description" className="od-req">
                  Description
                </label>
                <input
                  id="part-description"
                  name="part-description"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Fan, axial, 120 mm, 24 VDC"
                />
              </div>
              <p className="od-hint">As it should read on the drawing.</p>

              <div className="od-row">
                <label htmlFor="part-number">Part number</label>
                <input
                  id="part-number"
                  name="part-number"
                  type="text"
                  autoComplete="off"
                  placeholder="Assigned on submit"
                />
              </div>

              <div className="od-row">
                <label htmlFor="product" className="od-req">
                  Product
                </label>
                <select id="product" name="product" defaultValue="VBS-50">
                  <option value="VBS-50">VBS-50 StorLine Battery Cabinet</option>
                  <option value="VMX-20">VMX-20 ModuLine Modular UPS</option>
                  <option value="VSI-10">VSI-10 SunLine Solar Inverter</option>
                </select>
              </div>

              <div className="od-row">
                <label htmlFor="units-per-year">Units per year</label>
                <input
                  id="units-per-year"
                  name="units-per-year"
                  type="number"
                  min={1}
                  defaultValue={1800}
                />
              </div>
            </div>
            <div className="od-actions">
              <button type="submit" className="od-btn primary">
                Create part number
              </button>
              <button type="button" className="od-btn secondary">
                Save draft
              </button>
            </div>
          </form>

          <p className="od-foot">
            OrderDesk 7.2 · Sample screen for a fictional company. Not a real
            product.
          </p>
        </main>
      </div>
    </div>
  );
}
