# Platforming Index

Kearney PERLab x UIUC AI Entrepreneurship Hackathon, Nov 13-15, 2026. Team Ladebuggers: Nikhil Richard and Rittrija Mandal. Track 1, Rapid Platforming. Read docs/CONTEXT.md for the research, rubric, and pitch.

## What we are building

A tool that gets a manufacturer to cut product complexity and keeps them cutting it. It follows Kearney's three-step path: save money on current products, consolidate duplicate parts, then build common cores with modules for the next product generation.

Six stages:

1. Data in. Read parts lists (BOMs) and purchase records (spend cube). A matcher finds the same part under different names and part numbers. High-confidence matches go in automatically. Low-confidence matches go to a human review list.
2. Who are you. A ten-second profile (role, team, product) plus five belief questions (do customers need every variant, who owns architecture decisions, are you measured on complexity).
3. The index. One score from 0 to 100 across four dimensions: shared architecture versus scattered reuse, decision ownership, incentives, new complexity added per year. It also says which of Kearney's three steps the company is on.
4. Dashboard plus agent. Split screen. Left: metrics for the user's role. Right: one AI agent whose system prompt comes from the user's profile, beliefs, and the company data. One model, different prompt per role.
5. Disagreement view. Where survey answers from different functions collide, with the data between them.
6. Procurement hook. When an engineer requests a new part, a card shows the equivalent part already in stock, the yearly cost of adding a new part number, and the effect on the score. Demo it as a mock procurement screen.

## Hard rules

- Every number on screen and every agent answer cites a source row or a listed assumption. No invented figures.
- Never feed data/voltara/voltara_answer_key.csv to the matcher. Use it only to measure matching accuracy.
- Voltara is a fictional company. Label sample data as sample data in the UI.
- Lead each role's page with time to market, cost, and complexity. Platforming is the method, not the headline.
- Do not use Kearney logos or branding.
- Keep secrets in .env.local. Never commit keys.

## Stack

- Next.js (App Router), TypeScript, Tailwind. Deploy to Vercel from main.
- Agent: Anthropic API, called from a server route. Key in ANTHROPIC_API_KEY.
- Matcher and index: a script in /engine that reads the CSVs and writes JSON to /data/derived. The app reads that JSON. No database.

## Folders and owners

- /engine: matcher, index scoring, role metrics. Owner: Nikhil.
- /app: dashboard, survey, agent panel, disagreement view, procurement card. Owner: Rittrija.
- /data/voltara: sample data. /data/derived: engine output. /docs: context.
Swap owners if you prefer, but only one person edits a folder at a time.

## Git

- Pull before every working session.
- Short branches, merge to main often. Main must always run.
- Commit small. Never rewrite main's history.

## Build order

1. Matcher on the Voltara data, with accuracy measured against the answer key.
2. Index score and role metrics as JSON.
3. Dashboard shell with role switcher.
4. Agent panel with citations.
5. Procurement card on a mock procurement screen.
6. Disagreement view, scripted if time runs short.

## Sample data facts (data/voltara)

- Six products: two rack UPS, one modular UPS, two solar inverters, one battery cabinet.
- 262 BOM lines, 252 part numbers, 60 real parts. 45 real parts appear in two or more products, 23 in five or more.
- 1,109 purchase orders, $39.3M yearly spend. Low-volume products pay up to 30% more for the same part.
- One capacitor comes from three suppliers at about $3.95, $4.60, and $5.35.
- Paying the lowest existing price on every shared part saves about $1.13M a year.
- A few battery cabinet lines say only "SEE DWG". Text matching will miss them. They belong in human review.
- voltara_suppliers.csv gives each of the 12 suppliers a country of origin: 4 United States, the rest in Mexico, Germany, Czech Republic, Taiwan, Vietnam. Origin is data, not a guess from the supplier name. Ostrava Thermal ships from the United States; Norwick Components does not. engine/add_origin.py joins it onto every row of data/derived/voltara_parts.json.
