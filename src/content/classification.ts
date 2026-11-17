/**
 * Reception and initial classification, from DOC 310.150 (rev. 10/1/26). Every number below is the policy's unless it
 * says "game".
 *
 * Reception: men are received at Washington Corrections Center and held at Close custody until classified (II.A).
 * Reception screens, among other things, "family and community support" (I.C.4) and runs the risk and needs
 * assessment (I.C.9), and "the individual will not be provided a copy of the interview questions" (I.C.9.a).
 *
 * The Initial Custody Designation (II.C): crime category for the current, most serious offense (A 0, B 5, C 10,
 * D 20 points); history of violence (up to -15: -10 for a listed violent infraction within 7 years, -5 for a
 * history-of-violence conviction not already scored); -10 for a felony detainer; -6 for escape history within 10
 * years; -6 for anyone under 29 at classification. Close 0-34 (Level 4), Medium 35-47 (Level 3), Minimum 48 and up.
 * Minimum with more than 6 years to the earned release date is MI3, housed at a Level 3 facility (II.G.1.a).
 * Initial custody can be appealed within 72 hours; facility placement cannot (II.I).
 *
 * NOT in the policy, so game until the designer supplies them: which crimes are Categories A to D (set on each sheet in
 * sentencing.ts), and the value the score starts from (ICD_BASE).
 *
 * Washington ONE (WSIPP 20-11-1901, Oct. 2020; DOC to the Statewide Family Council, March 21, 2026). Reception staff
 * give it by in-person interview. Four models (violent, property, drug, general felony). High on all three offense
 * models is High Violent Property Drug; otherwise high violent, then high property, then high drug; if none is high,
 * the general felony model sets Moderate or Lower. DOC says "lower", not "low". It does not affect custody. It also
 * rates eight criminogenic needs Low, Mod, or High, and the case manager works the High ones first. Reassessed every
 * six months until release (DOC 320.400), but during the norming period, still in force in March 2026, the risk level
 * is frozen at intake and only the needs move. Sign form 07-057; appeal in writing within 7 days. On release, the
 * level sets minimum supervision contacts (DOC 380.200 Att. 1, as reported in 2020). Items and weights aren't
 * public; every score here is game.
 */

export type CrimeCategory = 'A' | 'B' | 'C' | 'D';
export const CATEGORY_POINTS: Record<CrimeCategory, number> = { A: 0, B: 5, C: 10, D: 20 };

/** Game: the policy lists the factors but not the starting value. Set so Close is mostly violent cases and violent histories. */
export const ICD_BASE = 35;

export const ICD_DEDUCT = { violentInfraction: 10, violentConviction: 5, violenceMax: 15, detainer: 10, escape: 6, under29: 6 };

/** Game odds that the file holds what the policy deducts for (the backgrounds don't say). */
export const ICD_ODDS = {
  /** a guilty finding on a listed violent infraction within 7 years, for anyone who has done prison time before */
  violentInfraction: 0.3,
  /** a prior on the history of violence list, for anyone with priors */
  violentConviction: 0.2
};

export type Custody = 'close' | 'medium' | 'minimum';
export const icdBand = (n: number): Custody => (n >= 48 ? 'minimum' : n >= 35 ? 'medium' : 'close');

/** More than 6 years to the earned release date: Minimum, but MI3 at a Level 3 facility. */
export const MI3_MONTHS = 72;

export type RiskLevel = 'Lower' | 'Moderate' | 'High Drug' | 'High Property' | 'High Violent' | 'High Violent Property Drug';
type Model = 'violent' | 'property' | 'drug' | 'felony';
type Cut = 'low' | 'moderate' | 'high';

/**
 * Game scoring for the Washington ONE hierarchy. Each model counts priors, youth, and a prior prison term; an offense
 * model adds 2 when the current offense is its kind, and the drug model adds 2 for a substance habit. The general
 * felony model counts every felony.
 */
export function waOne(o: { category: string; priors: number; young: boolean; priorDoc: boolean; habit: boolean }): {
  level: RiskLevel; models: Record<Model, Cut>;
} {
  const cut = (n: number): Cut => (n >= 5 ? 'high' : n >= 3 ? 'moderate' : 'low');
  const base = o.priors + (o.young ? 1 : 0) + (o.priorDoc ? 1 : 0);
  const models: Record<Model, Cut> = {
    violent: cut(base + (o.category === 'violent' ? 2 : 0)),
    property: cut(base + (o.category === 'property' ? 2 : 0)),
    drug: cut(base + (o.category === 'drug' ? 2 : 0) + (o.habit ? 2 : 0)),
    felony: cut(base + 1)
  };
  let level: RiskLevel;
  if (models.violent === 'high' && models.property === 'high' && models.drug === 'high') level = 'High Violent Property Drug';
  else if (models.violent === 'high') level = 'High Violent';
  else if (models.property === 'high') level = 'High Property';
  else if (models.drug === 'high') level = 'High Drug';
  else level = models.felony === 'low' ? 'Lower' : 'Moderate';
  return { level, models };
}

/** The eight criminogenic need domains (DOC, March 2026). Rated Low, Mod, or High. */
export const NEED_DOMAINS = [
  'Residential', 'Education', 'Employment', 'Social Influences', 'Substance Abuse', 'Mental Health', 'Aggression', 'Attitudes & Behaviors'
] as const;
export type NeedDomain = (typeof NEED_DOMAINS)[number];
/** null: the game doesn't track it, so it isn't scored here. */
export type NeedLevel = 'Low' | 'Mod' | 'High' | null;

/** Real months between reassessments, until release (DOC 320.400, via WSIPP 2020). */
export const REASSESS_MONTHS = 6;
/** Days to appeal the result in writing (DOC, March 2026). */
export const WA_ONE_APPEAL_DAYS = 7;

/** Minimum supervision contacts by risk level (DOC 380.200 Attachment 1, as WSIPP reported it in 2020). */
export const CONTACTS: Record<RiskLevel, string> = {
  'High Violent Property Drug': 'three face-to-face contacts a month with your community corrections officer, at least one in the office and one out of it, and one collateral contact a month',
  'High Violent': 'three face-to-face contacts a month with your community corrections officer, at least one in the office and one out of it, and one collateral contact a month',
  'High Property': 'two face-to-face contacts a month, one out of the office, and one collateral contact a month',
  'High Drug': 'two face-to-face contacts a month, one out of the office, and one collateral contact a month',
  Moderate: 'one office visit a month, one field contact a quarter, and one collateral contact a month',
  Lower: 'a kiosk check-in whenever your address or phone changes, or if you are arrested'
};
/** Homeless, at any level but Lower, overrides the level. */
export const CONTACTS_HOMELESS = 'one face-to-face contact a week and one collateral contact a month, because you have no address';

/** Game: who is still there by reception. Held in jail before trial costs more people than going home on bail. */
export const TIE_LOSS = { held: 0.3, home: 0.1 };

/** Game: a pen pal listing. What it costs from your books, how long it runs, and the monthly odds a stranger writes. */
export const PEN_PAL = { cost: 4, months: 12, odds: 0.15, max: 2 };
