/**
 * Real recidivism figures, shown in the epilogue. Nothing here is invented; where two sources are combined, the
 * epilogue says so.
 *
 * BJS: Antenangeli & Durose, "Recidivism of Prisoners Released in 24 States in 2008: A 10-Year Follow-Up Period
 * (2008-2018)", NCJ 256094, Table 5. Cumulative percent rearrested, by most serious commitment offense. 409,300
 * people released. The game uses the four broad offense categories (violent, property, drug, public order), so a
 * property crime is measured against property crimes and a drug crime against drug crimes.
 *
 * WA SAC: Hernandez & Georgoulas-Sherry, "Long-Term Recidivism: Assessing the Washington Prison Population's Return
 * to Prison", Washington Statistical Analysis Center. 8,140 people released from WADOC in 2004, followed 19 years;
 * return to prison by custody level and by prior prison term (Tables 1 and 2). Custody level comes from the Custody
 * Review Score, which is built from infractions and program behavior (DOC 300.380). The report also breaks returns
 * down by offense, but 65% of that cohort is coded "Other/Unknown", so those rows are not used.
 */

export const SOURCES = {
  bjs: { label: 'Bureau of Justice Statistics, Recidivism of Prisoners Released in 24 States in 2008 (NCJ 256094), Table 5', url: 'https://bjs.ojp.gov/library/publications/recidivism-prisoners-released-24-states-2008-10-year-follow-period-2008-2018' },
  wa: { label: 'Washington Statistical Analysis Center, Long-Term Recidivism: Assessing the Washington Prison Population\'s Return to Prison', url: 'https://sac.ofm.wa.gov/sites/default/files/long-term_DOC_recidivism.pdf' }
};

export type Category = 'violent' | 'property' | 'drug' | 'public_order';

/** BJS Table 5: percent rearrested within 3 and 10 years, by broad category of the most serious commitment offense. */
export const CATEGORIES: Record<Category, { label: string; released: number; y3: number; y10: number }> = {
  violent: { label: 'violent offenses', released: 100100, y3: 60.7, y10: 76.7 },
  property: { label: 'property offenses', released: 121000, y3: 72.5, y10: 86.7 },
  drug: { label: 'drug offenses', released: 123900, y3: 64.8, y10: 81.4 },
  public_order: { label: 'public order offenses', released: 64300, y3: 65.8, y10: 82.1 }
};

/** Which BJS category each charge in the game falls under. */
export const CHARGE_CATEGORY: Record<string, Category> = {
  burglary: 'property',
  retail_theft: 'property',
  identity_theft: 'property',
  trafficking: 'property', // trafficking in stolen property
  delivery: 'drug',
  stolen_vehicle: 'property', // drugs were a factor; the conviction is property
  vehicular: 'violent',
  assault: 'violent',
  robbery: 'violent',
  firearm: 'public_order', // BJS files weapons offenses under public order
  eluding: 'public_order',
  no_contact: 'public_order'
};

export const BJS_ALL = { label: 'all offenses', released: 409300, y3: 66.2, y10: 81.9 };

export const rateFor = (chargeId: string) => {
  const cat = CHARGE_CATEGORY[chargeId];
  return cat ? CATEGORIES[cat] : BJS_ALL;
};

/** WA SAC: share of the 2004 release cohort who returned to a Washington prison within 19 years, by custody level. */
export const WA_BY_CUSTODY: Record<string, number> = {
  minimum: (2797 / 5782) * 100, // 48.4
  medium: (896 / 1412) * 100, // 63.5
  close: (279 / 418) * 100 // 66.7
};
export const WA_ALL = (4162 / 8140) * 100; // 51.1
/** WA SAC: return to prison within 19 years, by whether they had been to prison before (Tables 1 and 2). */
export const WA_PRIOR = { yes: (2195 / 3350) * 100, no: (1967 / 4790) * 100 }; // 65.5, 41.1

const odds = (pct: number) => pct / (100 - pct);

/**
 * A rough estimate for one person, anchored to the rearrest rate for their category of crime. Custody level and a
 * prior prison term move it up or down by how much more or less often those groups returned to prison in Washington,
 * applied as odds ratios so the figure stays tied to the crime's own rate and never reaches 100. Real rates,
 * combined; not a prediction. The two Washington factors overlap (people with priors land in higher custody more
 * often), so the combination leans toward the extremes.
 */
export function estimate(chargeId: string, custody: string, priorPrison = false): { y3: number; base: number } {
  const base = rateFor(chargeId).y3;
  const ratio =
    (odds(WA_BY_CUSTODY[custody] ?? WA_ALL) / odds(WA_ALL)) *
    (odds(priorPrison ? WA_PRIOR.yes : WA_PRIOR.no) / odds(WA_ALL));
  const o = odds(base) * ratio;
  return { y3: Math.round((100 * o) / (1 + o)), base };
}
