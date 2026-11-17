# Good Time

A single-player game about serving a sentence in a Washington State prison. You are charged, you plead, you are classified, and you try to walk out on your release date. Every month asks you to break one of two rulebooks, the institution's or the yard's, and the game plays Staff.

Like *Papers, Please*, it is a game with a message, and it means for you to find that message by playing. It is about three things:

- **Institutionalization.** What the place does to a person month by month: the routine, the number that replaces your name, and the people outside who stop writing.
- **Compromise.** Every decision trades one rulebook for the other, and none of the options is a good one.
- **Disparity.** The same act does not cost everyone the same time. That holds in charging, in sentencing, and in who gets written up.

The systems come from Washington law and DOC policy. The routine, the code, and how a write-up feels come from the designer's own time inside.

## Play it

**In a browser:** https://felixdallesandro.github.io/Good-Time/. It installs as an app from Chrome, Edge or Safari and works offline after the first load.

**Downloads:** the [Releases page](https://github.com/FelixDallesandro/Good-Time/releases/latest) has:

| Platform | File | Notes |
|---|---|---|
| Windows | `Good-Time-<version>-windows-setup.exe` | Installer. It isn't code-signed, so SmartScreen may warn you: choose *More info*, then *Run anyway*. |
| Windows | `Good-Time-<version>-windows-portable.exe` | Runs without installing. |
| Android | `Good-Time-<version>-android.apk` | Open it on the phone and allow installs from your browser. |
| iOS | `Good-Time-<version>-ios-unsigned.ipa` | Unsigned. It needs a sideloading tool such as AltStore or Sideloadly. The easier route is the browser link in Safari, then Share → *Add to Home Screen*. |
| Any | `Good-Time-<version>-web.zip` | The static site. Unzip it and open `index.html`. |

The game deals with violence, racism, drug use, debt and coercion, and it says so before you start. **Count Time**, in the corner, rewinds your last decision at any point.

## How a sentence goes

1. **Draft a life.** You name your character, then keep one charge and one background. The background sets your age and your priors. Your Outside card (the people who still have you), your stats, your failings and your schooling are dealt or rolled. Schooling (a diploma, a GED, or neither) has to fit the background: work that asks for a diploma or equivalent always rolls one. Without either, you're placed in GED class (about a year) and can't hold a job inside until you pass.
2. **Court.** The sentence comes from the Washington sentencing grid: the seriousness level against your offender score. You can take the deal, turn down the first offer, or go to trial. What happened at the arrest can add enhancements. If there was a codefendant, you can tell what you know.
3. **Reception.** Everyone starts at Washington Corrections Center. There are three steps:
   - The interview records your Support.
   - The **Initial Custody Designation** (DOC 310.150) sets Close, Medium or Minimum custody, and the facility comes with it.
   - **Washington ONE** sets a risk level and rates eight needs. Education turns on whether you finished high school or a GED. You're reassessed every six months: a GED earned inside moves Education, but the risk level stays frozen.
4. **The months.** Each month has the same five steps:
   - A count card.
   - Whatever finds you: your Pull, group, legal mail, a rumor, a cellie.
   - Your scene.
   - The Eyes: staff roll for anything you did.
   - Visiting and messages.

   Good time fills one box per clean turn. Earned release can take off up to a third of the sentence, but none of the time added by an enhancement.
5. **Discipline.** There are two kinds of infraction:
   - **General** (WAC 137-28-220): these cost privileges, never good time. Four of them in ninety days becomes a serious (657).
   - **Serious**: these go to a hearing, where you plead or contest and can appeal. Sanctions follow DOC 460.050.

   Custody points move you between levels at each review (DOC 300.380). Segregation (DOC 320.200) and new charges for assaults are possible.
6. **The yard.** Standing, rumors, debts and leverage. Habits form: fight, tell, go to your car, or back down. Routine grows, and your name gives way to your DOC number.
7. **Outside.** Visits need a visitor application, and they end in a strip search. Extended family visits follow DOC 590.100. Messages are read by staff, and some are held or rejected under DOC 450.100. You can also take a pen pal listing.
8. **Release and epilogue.** The gate, the first night and the first week. Then you see the following:
   - Community custody, if your conviction carries it (RCW 9.94A.701 and .703).
   - Whether you would qualify for Graduated Reentry.
   - Your hidden case history, set beside every other background's for the same charge.
   - The ledger of every roll.
   - What the research says about who gets charged, sentenced and written up.

The in-game **How to play** page is the full rulebook.

### Demo mode

For a presentation with limited time, turn on **Demo mode** on the title screen. An **End the demo** bar then sits above every screen of a sentence; tap it twice to end. The game plays out the rest the careful way (it takes whatever option looks cheapest) and opens the epilogue.

The epilogue then opens with **Your decisions**: every decision you made, in order, with what each one said it would cost. The rolled Pull and one-option cards aren't counted. Below them are three talking points (institutionalization, compromise, disparity) drawn only from your decisions and the months you played. Everything the game did after you ended (write-ups, messages, rolls) is marked as simulated.

## Sources

The rules cite their sources in the game, and the epilogue lists them. The main ones:

- **Law:** WAC 137-28 (discipline); RCW 9.94A and the 2025 Adult Sentencing Guidelines Manual; RCW 9.94A.701 and .703 (community custody).
- **DOC policy:** 310.150, 300.380, 320.200, 450.100, 460.050 and 590.100; the Graduated Reentry Handbook (500-HA004); the Reentry Center Handbook (400-HA019).
- **Washington ONE:** the WSIPP 2020 evaluation and DOC's 2026 Family Council slides.
- **Disparity research:** the U.S. Sentencing Commission (2023); Washington's Task Force on Race and the Criminal Justice System (2012); the *New York Times*' "The Scourge of Racial Bias in New York State's Prisons" (2016); the New York State Inspector General (2022).

Some numbers had to be invented to make a game. They are labeled as game numbers in [src/content/](src/content/). For example, the ICD crime categories in [classification.ts](src/content/classification.ts) are provisional, and so are the schooling odds.

## Develop

TypeScript and React. There are no image assets. Node 20 or later.

```
npm install
npm run dev        # http://localhost:5173
npm test           # 134 tests: rules, decks, court, intake, routine, replies, UI render
npm run build      # type-check, then build the static site into dist/
npm run sim        # balance simulation, 3,000 sentences per strategy per facility
npx tsx scripts/discipline-sim.ts   # how discipline, visits and EFVs play out over whole sentences
npx tsx scripts/reply-vet.ts        # sample message replies as a player would meet them
```

`dist/` is committed. After `npm run build`, `dist/index.html` opens by double-click with no server, because the build emits a classic script instead of a module. The offline cache (the service worker) only registers over http(s).

### Packages

| Target | Command | Where it builds |
|---|---|---|
| Windows | `npm run desktop` to run it; `npm run dist:win` to build the installer and portable `.exe` into `release/` | [Electron](https://www.electronjs.org). [electron/main.cjs](electron/main.cjs) opens `dist/index.html` in a window. |
| Android, iOS | Built in CI with [Capacitor](https://capacitorjs.com) from [capacitor.config.json](capacitor.config.json). The `android/` and `ios/` projects are generated in CI and not committed. | GitHub Actions. iOS needs macOS. |
| Web | Every push to `main` that changes `dist/` publishes to GitHub Pages. | [pages.yml](.github/workflows/pages.yml) |

To publish a release, bump `version` in `package.json`, commit, then `git tag v<version> && git push --tags`. [release.yml](.github/workflows/release.yml) builds all three platforms and attaches them to the release, along with a zip of the web build.

Building the Windows installer locally needs Windows Developer Mode, because electron-builder's signing tools unpack symlinks. Inside the VS Code terminal, unset `ELECTRON_RUN_AS_NODE` before running Electron.

`npm run icons` regenerates every icon from code: the web icons in `public/`, the Windows icon in `build/`, and the mobile icon and splash in `assets/`.

### Layout

```
src/engine/    rules engine: pure state in, state out. No UI, no DOM.
src/content/   cards, sentencing grid, classification, reentry, violations, research, all as typed TypeScript
src/ui/        React screens
tests/         Vitest suites
scripts/       simulations, reply vetting, icon generator
electron/      Windows desktop wrapper
```

Content is typed TypeScript, not JSON, so the compiler checks every card. Games are deterministic from a seed, and the whole `Game` object is JSON, which is how save and resume work. Saves are versioned, and an old save is ignored rather than crashing the game.

## Open problems

- **Balance.** The design says keeping your head down should cost more good time than putting in work once, but not every time. `npm run sim` reports where the numbers stand. The levers are in [yard.ts](src/content/yard.ts) and [count.ts](src/content/count.ts).
- **ICD crime categories A–D** are placeholders until the real table is confirmed.
- **Graduated Reentry and the reentry center** appear only in the epilogue and are not yet playable.
- **Solo approximations.** The design has other players for kites, pacts, betrayal and rumors aimed at you. Here, NPC chances stand in for them, and the strike simulates three other prisoners.
- **Writing review.** The design calls for formerly incarcerated reviewers before the rules lock.
