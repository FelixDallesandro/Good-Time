# Good Time

A single-player prison-sentence game built from the *Good Time* design document and the card decks. You serve a sentence set by your case and try to walk out on your release date. Every month breaks one of two rulebooks: the institution's or the yard's. The game plays Staff.

TypeScript + React, no image assets. It runs in any browser and installs as an app (PWA) on Android, iOS and Windows.

## Run it

```
npm install
npm run dev        # http://localhost:5173
npm test           # 27 tests: rules, the card decks, every choice of every card, UI render
npm run sim        # balance simulation (build step 2 in the design doc)
npm run build      # static site in dist/
```

After `npm run build`, `dist/index.html` also opens by double-click (no server needed). The build emits a classic script instead of a module because browsers block modules over `file://`. The offline cache only works when it is served over HTTP(S).

## Ship it

| Platform | How |
|---|---|
| Android | Host `dist/` on any HTTPS static host. Open it in Chrome, then menu → *Install app*. |
| iOS | Same host. Open in Safari, then Share → *Add to Home Screen*. |
| Windows | Open in Edge or Chrome, then *Install Good Time*. Works offline after first load. |
| App stores | Wrap `dist/` with [Capacitor](https://capacitorjs.com) (`npx cap add android ios`). Same code, no rewrite. iOS builds need a Mac. |

## Layout

```
src/engine/    rules engine: pure state in, state out. No UI, no DOM.
src/content/   every card as typed TypeScript (helpers.ts has fightRoll(), thr() and friends)
src/ui/        React screens
tests/         rules + deck-integrity + UI smoke tests
scripts/       balance sim, icon generator
```

Content is typed TypeScript, not JSON: the compiler checks every card, and tests check that every echo points at a card that exists. Games are deterministic from a seed and the whole `Game` object is JSON, which is how save/resume works (saves are versioned; an old one is ignored, not crashed on).

## What changed with the revised design doc

- **Case and sentence.** Every Background carries a case (lawyer, bail, record); each ✖ adds 2 months to 12, up to 18. During play only the total is public; the case lines are revealed in the epilogue's **sentencing ledger**, which lays all 12 backgrounds side by side.
- **Ceiling on added time:** majors can add at most 3 months in total.
- **Support (0–3)** from the Outside card (+1 with Heart +1, max 3). Clean months with Support earn a **visit** (money, or pull a rumor); a minor suspends visits next month, a major for the rest of the act and costs 1 Support. Three clean months earn an **extended family visit** (not at Granite). **Staying in** a scene costs Standing the second time per act. At Support 0: **Lean on someone**, **Stand in**. **Stop counting** is a one-way door at any time. Who is at the gate on release day depends on Support. Leverage cards enter the deck for Support 2+.
- **Mail is read.** Staff may delay a message a month or hold it for good (staff, yard and grievance words make that likelier). Held messages appear under *Never delivered*. Support 0 writes to a notebook, which no one reads.
- **The Pull is rolled, never chosen**: d6, 1–4 give in, 5–6 walk past; each tally widens walk-past; three tallies tear it up.
- **Cameras and kites are the risk you can't count**: the dice preview shows blue, white and rumor dice only, with a note when cameras may be watching.
- A private card flipping costs **2 Standing**. Reporting an attack on you **pins a cooperation rumor** (the rat jacket).
- **Missions** (never discarded; Hurt on 1–3; come back, hit back harder for three marks, or check in; a third Mission is involuntary protective custody, which ends your game) and **Leverage**.

## What the card decks added

12 charges (each with its own Pull), 12 backgrounds with cases, 12 Outside cards with Support and a Line Home move, 12 Code moves (you draw one), 4 Anyone moves (they return), 12 cellies, the 24-card Count deck, the 40-card Yard deck (13 Test, 12 Politics, 15 Life) and the special cards. Facility cards now say who staff watch harder and where staff come from. **Cellies** and the **cell tag**: a search that finds your cellie's contraband lands on you unless he owns his own on the roll the card lists.

### How the decks PDF was read

Several tables in it sit under the wrong heading across page breaks. This build reads them by their own counts: the five rows after "Background deck (12)" begin with Robbery and are charges (12 total); Father, Partner (moving on), Best friend and Sister are Outside cards (12 total, 8 plus 4); the eight cards under "Test (13)" on page 15 are Count cards (24 total, 16 plus 8); the three cards before "Life (15)" are Politics (12 total); Hustle, Grievance, A hand and A question are the four Anyone moves.

## Approximations (solo, and where the rules need other players)

- Kites, pacts, betrayal, "other players aim moves at you" and "released players become the outside" have no other players to use them. The strike simulates three other prisoners; kites are an NPC chance each month.
- Camera dice are rolled with the other dice at the end of the month, not "just before mail call". The probabilities are identical.
- "Learn one player's private failing" and "pin a rumor to another player" are flavor lines or stand-ins here. "No count die this act" is recorded but changes no roll. "Tier rep", "his first mistake" and similar are simplified to a debt, a deferred cost or an echo.
- The cellie fight / lay-low rules are reduced to a marks roll and a skipped scene.
- Promises (the date to your son, the EFV to your sister) resolve at release.
- The draft deals three cards per deck and you keep one of each, in place of passing cards left.
- Not built: daily time blocks, remembered officers (the video-game extras).
- **Writing review.** The design doc plans for formerly incarcerated reviewers before the rules lock. These cards are the designer's draft, transcribed into code with minimal edits.

## Balance: still an open problem

`npm run sim` plays 3,000 sentences per strategy per facility. The design doc says keeping your head down should cost more good time than putting in work once, but not every time. **The current numbers still don't show that**: strict head-down finishes about even with put-in-work-once at Cedar, and earlier at Harlan and Granite (the sim also reports caught-per-game, dice per roll, deaths and end Standing). The new content raises how often a careful sentence is written up (about 2 catches per game), mostly because the Pull and the new Count cards add rolls. The levers are in `src/content/yard.ts` and `count.ts`: the cost of `let_go`, the Standing-0 `targeted` prompt, the echo cards, and what The Ask / The Visit pay.
