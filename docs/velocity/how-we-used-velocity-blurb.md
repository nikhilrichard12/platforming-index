# How we used Velocity AI Studio (draft blurb for the pitch HTML)

Rubric target (Velocity AI research, 10% of score): top score requires research that "validates the problem and supports key decisions" and is "clearly integrated" into the solution.

## What we did in Velocity

All of our research and demo development ran inside Kearney's Velocity AI Studio (team workspace "Ladebuggers"). Nothing below was done outside the tool.

**1. Built a shared evidence base.** We assembled a 21-source team library in Studio Sources: our structured research snapshots (problem validation, impact by function, existing alternatives, survey design, buyer and market, cost of complexity, precedents), Kearney PERLab's November 2026 platforming survey article, product-architecture analyses, mentor interview notes, and our own product-model brainstorm.

**2. Ran deep research chats to test our core claim.** We asked Velocity to test the claim that manufacturers with many duplicate or similar parts often have not achieved platforming at scale, citing a source for every figure and marking anything unsupported as NOT IN SOURCES. Velocity's folder-grounded answer (Energy Equipment Platforming Evidence chat) returned per-figure evidence tables with sector, sample, date, and limit for each point. Its bottom line: in Kearney PERLab's 100-leader mixed-industry survey (which included energy and power), only about half of respondents said they platform at scale, and only a minority of those described a recent initiative with a true common core and plug-in modules - most described parts sharing or activity outside product architecture. It confirmed measured results from energy-relevant cases (Wartsila engines: unique components from nearly 7,000 to under 4,000; development expense from an EUR 88M initial estimate to EUR 49M) and flagged honestly what the sources do NOT show: no energy-only adoption rate and no dataset measuring both duplicate-part prevalence and platform maturity at the same firms.

**3. Built the demo inside a Velocity concept.** Our concept "Voltara Persona and Sample Data (Platforming Index demo company)" is grounded in all 21 team sources, and we used Velocity's AI canvas generation for four working artifacts:

- **Company persona**: Voltara Power Systems, a fictional power-and-energy-equipment manufacturer. Velocity labeled every invented value FICTIONAL ASSUMPTION and kept sourced facts cited and separate.
- **Synthetic sample data**: a parts master and spend extract (252 part numbers mapping to 60 physical parts, $39.3M annual spend, ~$1.13M/year price gap on shared parts), labeled SYNTHETIC throughout, with a data dictionary and provenance note.
- **Scoring-spec assessment**: Velocity assessed our existing Platforming Index scoring spec (the 34/100 Voltara demo score) - strengths, failure modes (weighting sensitivity, validation risk, gaming risk), and six improvement proposals. Velocity stated up front that it assessed but did not originate the scoring math.
- **Evidence synthesis**: a cross-source synthesis of what the 21 sources say about part duplication, platforming results, and the limits of our claim, with an explicit NOT IN SOURCES section.

## How it validated the problem and drove decisions

- **Validated the problem**: the survey evidence (self-reported platforming at scale far outruns true common-core architectures; 43% cite engineering effort as the top challenge; 52% of at-scale reporters lack complexity targets) is the problem statement behind the Platforming Index.
- **Drove a real decision**: Velocity's evidence discipline narrowed our pitch claim. We dropped the stronger claim (that duplicate-part-heavy manufacturers measurably fail to platform) because the sources do not support it, and adopted Velocity's pitch-safe wording: reported platforming at scale is substantially more common than descriptions of true common-core initiatives, while energy-related case studies show material part-variety reductions when modular architectures are implemented.
- **Clearly integrated**: the persona and synthetic data generated in Velocity are exactly what our demo and 34/100 example score run on, and the assessment shaped how we present the scoring model and its limits.

## Honest limits

- Velocity's web-scrape step was unavailable for a stretch on Nov 14 (site-side freeze at 0%); we switched to folder-grounded queries against our 21-source library, which produced the cited answer used above. One cross-sector research run is still in progress.
- Voltara and its figures are fictional demo parameters; Velocity itself enforced that separation and declined to present them as research findings. Independently verified external statistics are listed separately in our source-check file.
