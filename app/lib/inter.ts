import "./inter.css";

/**
 * Stands in for next/font/google's Inter with the same call shape, so the
 * layouts keep `inter.className` and `inter.variable`. The font itself comes
 * from the stylesheet imported above.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Inter(_options?: unknown) {
  return {
    className: "pi-inter",
    variable: "pi-inter-var",
    style: { fontFamily: "Inter, system-ui, sans-serif" },
  };
}
