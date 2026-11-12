/**
 * Message keyword lists. Each institution keeps its own list of no more than about 100 terms, kept secret from the
 * people inside and from their families. The lists are supposed to match across institutions and often don't; the
 * differences get covered as "interpretation of policy".
 *
 * Nobody outside the mailroom knows what is on them, so these are supposition, built from the designer's account of
 * what gets flagged: drug names, explicit words, money apps, certain violence, ink. Everyday words ("hit", "money",
 * "ice", "kill") are left off the shared list so that most ordinary messages pass. A facility's own additions are
 * where the arbitrary ones live.
 *
 * A message with a listed word is held for review for a week or more, with no notice.
 */
export const SHARED: string[] = [
  // drugs
  'spice', 'k2', 'fentanyl', 'fentynol', 'fent', 'meth', 'heroin', 'suboxone', 'subutex', 'oxy', 'percs', 'xanax',
  'molly', 'coke', 'dope', 'kush',
  // explicit
  'sex', 'pussy', 'anal', 'anus', 'dick', 'cock', 'cum', 'nudes', 'naked', 'blowjob',
  // money moving outside approved channels
  'cashapp', 'cash app', 'venmo', 'zelle', 'paypal', 'western union', 'bitcoin',
  // violence and weapons
  'force', 'stab', 'stabbed', 'stabbing', 'shank', 'shanked', 'mission', 'green light', 'hit him', 'gun', 'blade',
  // ink
  'ink', 'inked', 'tat', 'tats', 'tattoo', 'tattoos', 'tattooed',
  // phones
  'burner', 'cell phone'
];

/** Each institution's own additions. Same department, same policy, different list. */
export const FACILITY: Record<string, string[]> = {
  cedar: ['weed', 'pills'],
  harlan: ['kite', 'strips', 'drop'],
  granite: ['hit', 'fence', 'bars', 'kite']
};

const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function flaggedWords(facilityId: string, text: string): string[] {
  const terms = [...SHARED, ...(FACILITY[facilityId] ?? [])];
  return terms.filter((t) => new RegExp(`\\b${escape(t)}\\b`, 'i').test(text));
}
