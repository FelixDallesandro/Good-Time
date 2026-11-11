import type { Violation, ViolationCat } from '../engine/types';

/**
 * Sources:
 * - Serious violations, categories, and classification points: DOC 460.050 Attachment 1 (rev. 10/26).
 *   Titles are shortened from the attachment's wording.
 * - General violations: WAC 137-28-220. Titles are short paraphrases.
 * Only the codes the game can charge are listed.
 */
const pts: Record<ViolationCat, number> = { general: 0, A: 20, B1: 10, B2: 10, B3: 10, C1: 5, C2: 5, C3: 5, D: 5 };
const v = (code: string, cat: ViolationCat, title: string, points = pts[cat]): Violation => ({ code, cat, title, points });

export const VIOLATIONS: Violation[] = [
  // General (WAC 137-28-220)
  v('053', 'general', 'Possessing unauthorized items'),
  v('103', 'general', 'Failing to follow orders, rules, or policies'),
  v('202', 'general', 'Harassing or abusive language'),
  v('203', 'general', 'Lying to a staff member'),
  v('210', 'general', 'Being in an unauthorized area'),
  v('214', 'general', 'Interfering with count procedures'),
  v('301', 'general', 'Failing to maintain hygiene or quarters'),
  v('303', 'general', 'Unauthorized mail, phone, or electronic communication'),
  v('351', 'general', 'Lending or trading items under $10'),
  v('353', 'general', 'Disruptive behavior'),
  v('354', 'general', 'Stealing food under $10'),
  v('355', 'general', 'Roughhousing or unauthorized physical contact'),
  v('356', 'general', 'Unauthorized amount of clothing, bedding, or supplies'),

  // Category A: 20 points
  v('502', 'A', 'Aggravated assault against another incarcerated individual'),
  v('602', 'A', 'Possessing, manufacturing, or introducing a weapon'),
  v('651', 'A', 'Inciting others to riot'),
  v('665', 'A', 'Introduction or trafficking of an unauthorized drug'),
  v('882', 'A', 'Introducing, possessing, or using a cell phone'),
  // Category B, Level 1: 633 and 704 are 15 points, the rest 10
  v('633', 'B1', 'Assaulting another incarcerated individual', 15),
  v('667', 'B1', 'Possession of any unauthorized drug'),
  v('669', 'B1', "Giving, selling, or trading prescribed medication"),
  // Category B, Level 2
  v('505', 'B2', 'Fighting with another incarcerated individual'),
  v('652', 'B2', 'Engaging in or inciting a group demonstration'),
  v('670', 'B2', 'Making an intoxicating substance'),
  v('675', 'B2', 'Admitting use or a positive test for an unauthorized substance'),
  v('676', 'B2', 'Refusing a urinalysis or failing to provide a sample in the allotted time'),
  v('682', 'B2', 'Engaging in or inciting an organized work stoppage'),
  // Category B, Level 3
  v('503', 'B3', 'Extorting, or demanding anything of value for protection'),
  v('509', 'B3', 'Refusing a direct order to proceed to or disperse from an area'),
  v('558', 'B3', 'Interfering with staff in the performance of their duties'),
  v('653', 'B3', 'Interfering with count by deception or distraction'),
  v('709', 'B3', 'Out of bounds with others, without authorization'),
  v('739', 'B3', "Possessing or soliciting a person's identification information"),
  // Category C, Level 1
  v('702', 'C1', 'Possessing, manufacturing, or introducing an unauthorized tool'),
  v('734', 'C1', 'Participating in the activities of a security threat group'),
  v('894', 'C1', 'Disposing of evidence to interfere with an investigation'),
  // Category C, Level 2
  v('710', 'C2', 'Unauthorized tattooing, or possessing tattoo paraphernalia'),
  v('718', 'C2', 'Using mail, phone, or electronic communication in violation of a court order'),
  // Category C, Level 3
  v('657', 'C3', 'Four or more general violations from separate incidents within 90 days'),
  v('658', 'C3', 'Failing to comply with a sanction'),
  // Category D
  v('555', 'D', 'Stealing property, or possessing another individual\'s property'),
  v('559', 'D', 'Gambling or possessing gambling paraphernalia'),
  v('741', 'D', 'Stealing food, the value of which is $10 or more'),
  v('714', 'D', 'Trading money or items of value of $10 or more outside approved channels')
];

export const violation = (code: string): Violation => {
  const x = VIOLATIONS.find((y) => y.code === code);
  if (!x) throw new Error(`unknown WAC code ${code}`);
  return x;
};

/**
 * Sanctioning guidelines, DOC 460.050 Attachment 2. Each array is [first, second, third or subsequent]
 * offense: general within 6 months, serious within 12. Values are the top of each range ("0 - 30 days").
 */
export const GENERAL_SANCTIONS = {
  privileges: [10, 20, 30], // days of loss of privileges (yard, gym, dayroom, TV, tablet...)
  confinement: [5, 7, 10], // days of confinement to cell
  extraDuty: [40, 80, 120] // hours
};

type Ladder = [number, number, number];
export const SERIOUS_SANCTIONS: Record<Exclude<ViolationCat, 'general'>, { gct: Ladder; privileges: Ladder; confinement: Ladder }> = {
  A: { gct: [45, 60, 75], privileges: [30, 90, 180], confinement: [30, 30, 30] },
  B1: { gct: [30, 45, 60], privileges: [20, 60, 120], confinement: [30, 30, 30] },
  B2: { gct: [30, 45, 60], privileges: [20, 60, 120], confinement: [30, 30, 30] },
  B3: { gct: [30, 45, 60], privileges: [20, 60, 120], confinement: [30, 30, 30] },
  C1: { gct: [0, 15, 30], privileges: [15, 45, 90], confinement: [10, 20, 30] },
  C2: { gct: [0, 10, 20], privileges: [15, 45, 90], confinement: [10, 20, 30] },
  C3: { gct: [0, 5, 10], privileges: [15, 45, 90], confinement: [10, 20, 30] },
  D: { gct: [0, 0, 0], privileges: [15, 45, 90], confinement: [10, 20, 30] }
};

/** Mandatory sanctions (DOC 460.050 V.A): never suspended, never reduced by a plea. */
export const NO_WEIGHTS = ['501', '502', '505', '511', '521', '604', '611', '613', '633', '635', '637', '704', '711'];
export const PHONE_LOSS: Ladder = [30, 90, 180]; // 882
export const TRAFFICKING_GCT = 75; // 665

/**
 * Serious findings that always bring segregation (DOC 320.200 II.A: a significant risk to the safety of others, or
 * to the orderly operation of the facility). Fights always do, per the designer.
 */
export const SEG_CODES = ['502', '505', '633', '651', '652', '682'];

/** What a petty officer can always find. */
export const PETTY = ['301', '210', '202', '103', '356'];
