/**
 * Washington felony sentencing, from the statutes. Every number below is real unless it says "game".
 *
 * - Grid: RCW 9.94A.510 (Table 1) and the drug grid, RCW 9.94A.517 (Table 3). Months; "12+" is a year and a day.
 * - Seriousness levels: RCW 9.94A.515 and 9.94A.518.
 * - Enhancements: RCW 9.94A.533. Deadly weapon: class A 24 months, class B 12, class C 6; mandatory, total
 *   confinement, consecutive. Drug offense also violating RCW 69.50.435 (drug-free zones): +24. Eluding with a
 *   special allegation of endangerment (RCW 9.94A.834): +12 months and a day.
 * - Earned release: RCW 9.94A.729. Up to 10% for serious violent offenses (none in this game), one-third for every
 *   other case; none at all on the deadly weapon enhancement portion.
 * - Strikes: "most serious offense", RCW 9.94A.030. Class A felonies (robbery 1, burglary 1), assault 2, vehicular
 *   assault while impaired or reckless, any felony with a deadly weapon verdict. Robbery 2 is no longer on the list.
 *   A third strike is life without the possibility of release (RCW 9.94A.570), so no card here is on its third.
 *
 * Simplified (game): the offender score is one point per prior adult felony and one per other current count. The
 * real rules (RCW 9.94A.525, 9.94A.589) weigh some priors double or triple depending on the current offense.
 *
 * The plea (from the designer's account): the prosecutor overcharges so the deal sounds better. Trial gets the top
 * of the range on everything charged. The deal is a reduced charge, fewer counts, or a dropped enhancement, for an
 * agreed number inside the reduced range. Turning down the first offer sometimes brings a better one: prosecutors
 * don't want to try the case either. Telling what you know only comes up where there is someone to tell on (a
 * codefendant, a ring); it's the player's choice, and it buys the bottom of the range at the price of a snitch
 * jacket that may or may not come out.
 *
 * Where in the range the agreed number lands (game): public defenders and people held pretrial take worse deals
 * than people with paid counsel who went home. The direction is documented; the size here is the game's.
 */

export type Grid = 'felony' | 'drug';

export interface Range { low: number; high: number; plus: boolean; days?: number }

const parse = (row: string): Range[] =>
  row.split(' ').map((cell) => {
    const [lo, hi] = cell.split('-');
    if (hi.endsWith('d')) return { low: 0, high: Number(hi.slice(0, -1)) / 30, plus: false, days: Number(hi.slice(0, -1)) };
    return { low: Number(lo.replace('+', '')), high: Number(hi), plus: lo.endsWith('+') };
  });

/** RCW 9.94A.510, levels I to X; offender score 0 to 9+. [low, high, low is "and a day"] */
const FELONY: Record<number, Range[]> = {
  10: parse('51-68 57-75 62-82 67-89 72-96 77-102 98-130 108-144 129-171 149-198'),
  9: parse('31-41 36-48 41-54 46-61 51-68 57-75 77-102 87-116 108-144 129-171'),
  8: parse('21-27 26-34 31-41 36-48 41-54 46-61 67-89 77-102 87-116 108-144'),
  7: parse('15-20 21-27 26-34 31-41 36-48 41-54 57-75 67-89 77-102 87-116'),
  6: parse('12+-14 15-20 21-27 26-34 31-41 36-48 46-61 57-75 67-89 77-102'),
  5: parse('6-12 12+-14 13-17 15-20 22-29 33-43 41-54 51-68 62-82 72-96'),
  4: parse('3-9 6-12 12+-14 13-17 15-20 22-29 33-43 43-57 53-70 63-84'),
  3: parse('1-3 3-8 4-12 9-12 12+-16 17-22 22-29 33-43 43-57 51-68'),
  2: parse('0-90d 2-6 3-9 4-12 12+-14 14-18 17-22 22-29 33-43 43-57'),
  1: parse('0-60d 0-90d 2-5 2-6 3-8 4-12 12+-14 14-18 17-22 22-29')
};
/** RCW 9.94A.517: offender score 0 to 2, 3 to 5, 6 to 9+. */
const DRUG: Record<number, Range[]> = {
  3: parse('51-68 68+-100 100+-120'),
  2: parse('12+-20 20+-60 60+-120'),
  1: parse('0-6 6+-18 12+-24')
};

export function range(grid: Grid, level: number, score: number): Range {
  const row = grid === 'drug' ? DRUG[level] : FELONY[level];
  const i = grid === 'drug' ? (score <= 2 ? 0 : score <= 5 ? 1 : 2) : Math.min(9, Math.max(0, score));
  return row[i];
}

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export interface Enhancement { label: string; months: number; flat: boolean }
const DEADLY_A: Enhancement = { label: 'deadly weapon enhancement (class A)', months: 24, flat: true };
const DEADLY_B: Enhancement = { label: 'deadly weapon enhancement (class B)', months: 12, flat: true };
const DRUG_ZONE: Enhancement = { label: 'drug-free zone enhancement', months: 24, flat: false };
const ELUDE: Enhancement = { label: 'endangerment enhancement', months: 12, flat: false };

/** Who there is to tell on. Codefendants can end up inside too; a ring leaves a paper trail. */
export type Info = 'codefendant' | 'ring';

export interface Sheet {
  offense: string;
  rcw: string;
  grid: Grid;
  level: number;
  counts: number;
  enh?: Enhancement;
  /** Enhancements are per count. */
  enhCounts?: number;
  strike: boolean;
}

/** What the prosecutor files, and what they will take. Counts are game; offenses and levels are the statutes'. */
export const CASES: Record<string, { trial: Sheet; deal: Sheet; info?: Info; infoText?: string }> = {
  burglary: {
    trial: { offense: 'Burglary in the first degree', rcw: '9A.52.020', grid: 'felony', level: 7, counts: 3, strike: true },
    deal: { offense: 'Residential burglary', rcw: '9A.52.025', grid: 'felony', level: 4, counts: 3, strike: false },
    info: 'codefendant', infoText: 'You were not the only one in the house.'
  },
  retail_theft: {
    trial: { offense: 'Retail theft with special circumstances, first degree', rcw: '9A.56.360', grid: 'felony', level: 3, counts: 6, strike: false },
    deal: { offense: 'Theft in the first degree', rcw: '9A.56.030', grid: 'felony', level: 2, counts: 5, strike: false }
  },
  identity_theft: {
    trial: { offense: 'Identity theft in the first degree', rcw: '9.35.020', grid: 'felony', level: 4, counts: 5, strike: false },
    deal: { offense: 'Identity theft in the second degree', rcw: '9.35.020', grid: 'felony', level: 2, counts: 5, strike: false },
    info: 'ring', infoText: 'You know who sold you the numbers.'
  },
  delivery: {
    trial: { offense: 'Possession with intent to deliver methamphetamine', rcw: '69.50.401', grid: 'drug', level: 2, counts: 2, enh: DRUG_ZONE, strike: false },
    deal: { offense: 'Possession with intent to deliver methamphetamine', rcw: '69.50.401', grid: 'drug', level: 2, counts: 1, strike: false },
    info: 'ring', infoText: 'You know who fronted it to you.'
  },
  stolen_vehicle: {
    trial: { offense: 'Possession of a stolen vehicle', rcw: '9A.56.068', grid: 'felony', level: 2, counts: 6, strike: false },
    deal: { offense: 'Possession of a stolen vehicle', rcw: '9A.56.068', grid: 'felony', level: 2, counts: 5, strike: false }
  },
  vehicular: {
    trial: { offense: 'Vehicular assault, under the influence', rcw: '46.61.522', grid: 'felony', level: 4, counts: 5, strike: true },
    deal: { offense: 'Vehicular assault, disregard for the safety of others', rcw: '46.61.522', grid: 'felony', level: 3, counts: 5, strike: false }
  },
  assault: {
    trial: { offense: 'Assault in the second degree', rcw: '9A.36.021', grid: 'felony', level: 4, counts: 2, enh: DEADLY_B, enhCounts: 2, strike: true },
    deal: { offense: 'Assault in the second degree', rcw: '9A.36.021', grid: 'felony', level: 4, counts: 1, enh: DEADLY_B, enhCounts: 1, strike: true }
  },
  robbery: {
    trial: { offense: 'Robbery in the first degree', rcw: '9A.56.200', grid: 'felony', level: 9, counts: 1, enh: DEADLY_A, enhCounts: 1, strike: true },
    deal: { offense: 'Robbery in the second degree', rcw: '9A.56.210', grid: 'felony', level: 4, counts: 3, strike: false },
    info: 'codefendant', infoText: 'Somebody else was driving.'
  },
  firearm: {
    trial: { offense: 'Unlawful possession of a firearm, first degree', rcw: '9.41.040', grid: 'felony', level: 7, counts: 2, strike: false },
    deal: { offense: 'Unlawful possession of a firearm, first degree', rcw: '9.41.040', grid: 'felony', level: 7, counts: 1, strike: false }
  },
  eluding: {
    trial: { offense: 'Attempting to elude a pursuing police vehicle', rcw: '46.61.024', grid: 'felony', level: 1, counts: 2, enh: ELUDE, enhCounts: 1, strike: false },
    deal: { offense: 'Attempting to elude a pursuing police vehicle', rcw: '46.61.024', grid: 'felony', level: 1, counts: 1, enh: ELUDE, enhCounts: 1, strike: false }
  },
  no_contact: {
    trial: { offense: 'Felony violation of a no-contact order', rcw: '7.105.450', grid: 'felony', level: 5, counts: 4, strike: false },
    deal: { offense: 'Felony violation of a no-contact order', rcw: '7.105.450', grid: 'felony', level: 5, counts: 2, strike: false }
  },
  trafficking: {
    trial: { offense: 'Trafficking in stolen property, first degree', rcw: '9A.82.050', grid: 'felony', level: 4, counts: 5, strike: false },
    deal: { offense: 'Trafficking in stolen property, second degree', rcw: '9A.82.055', grid: 'felony', level: 3, counts: 5, strike: false },
    info: 'ring', infoText: 'You know where it was coming from.'
  }
};

export type Path = 'deal' | 'trial';
/** The offer after turning down the first one (game odds in the engine). */
export type Offer = 'first' | 'better' | 'same' | 'worse';

export interface Sentence {
  path: Path;
  sheet: Sheet;
  score: number;
  range: Range;
  /** The base term in months, before enhancements. */
  base: number;
  enhMonths: number;
  /** Total months on paper. */
  months: number;
  /** The most earned release can take off. */
  earnedMax: number;
}

/** How far into the range the agreed number lands, from the case lines on the background (game). */
export function dealPosition(caseBad: boolean[]): number {
  const [counsel, bail] = caseBad;
  return ((counsel ? 1 : 0) + (bail ? 1 : 0)) / 2;
}

export function sentenceFor(
  chargeId: string, priorPoints: number, path: Path, caseBad: boolean[], o: { talk?: boolean; offer?: Offer } = {}
): Sentence {
  const sheet = CASES[chargeId][path];
  const score = priorPoints + sheet.counts - 1;
  const r = range(sheet.grid, sheet.level, score);
  let pos = dealPosition(caseBad);
  if (o.offer === 'better') pos = Math.max(0, pos - 0.5);
  if (o.offer === 'worse') pos = 1;
  if (o.talk && CASES[chargeId].info) pos = 0; // what you know buys the bottom of the range
  const base = path === 'trial' ? r.high : Math.round(r.low + (r.high - r.low) * pos);
  const enhMonths = sheet.enh ? sheet.enh.months * (sheet.enhCounts ?? 1) : 0;
  const flat = sheet.enh?.flat ? enhMonths : 0;
  const months = base + enhMonths;
  return { path, sheet, score, range: r, base, enhMonths, months, earnedMax: Math.floor((months - flat) / 3) };
}

/** At least this many turns are served, even with every day of earned release; long sentences are compressed. */
export const MIN_TURNS = 12;
export const MAX_TURNS = 16;

/** Turns for the game: months per turn, the earned-release boxes, and the sentence in turns. */
export function timeScale(sen: Sentence): { perTurn: number; boxes: number; turns: number } {
  const served = sen.months - sen.earnedMax;
  const servedTurns = Math.min(MAX_TURNS, Math.max(MIN_TURNS, Math.round(served)));
  const perTurn = served / servedTurns;
  const boxes = Math.round(sen.earnedMax / perTurn);
  return { perTurn, boxes, turns: servedTurns + boxes };
}

export const fmtRange = (r: Range) => (r.days ? `0 to ${r.days} days` : `${r.low}${r.plus ? '+' : ''} to ${r.high} months`);

/** A base of exactly 12 only happens at the bottom of a "12+" cell: a year and a day, the shortest prison term. */
export const fmtMonths = (m: number) => (m === 12 ? '12 months and a day' : `${Math.round(m)} months`);
