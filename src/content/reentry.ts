/**
 * After the gate. Every number here is the statute's or the handbook's.
 *
 * Community custody (RCW 9.94A.701): 36 months for a serious violent offense, 18 for a violent offense, 12 for a crime
 * against persons (RCW 9.94A.411(2)) or a chapter 69.50 drug felony. Other offenses carry none. Violent and serious
 * violent are RCW 9.94A.030, as listed in the 2025 Adult Sentencing Manual. Residential burglary, theft, possession of
 * a stolen vehicle, trafficking in stolen property, eluding, and unlawful possession of a firearm (without a gang
 * finding) are on 9.94A.411's property and other list, so they carry none.
 *
 * Conditions (RCW 9.94A.703): the court must order you to tell DOC about court-ordered treatment and follow the
 * conditions DOC sets; unless it waives them, to report to your community corrections officer, work at approved
 * education, employment, or community restitution, use no controlled substances without a prescription, and live
 * where DOC approves.
 *
 * Graduated Reentry (DOC 500-HA004, R. 10/2026; ESSB 5121, ESSB 5219): Track 1, after 6 months in total confinement,
 * up to 18 months at a reentry center and up to the last 9 on electronic home monitoring at an approved address.
 * Track 2, after 3 months, up to 18 months on home monitoring, but not for a violent offense, a sex offense, or a crime
 * against a person. Both need an approved address with a sponsor (who should be an approved visitor) and an SUD
 * evaluation first. DOC may issue a housing voucher for up to six months. You are still an inmate, not on supervision.
 */

export interface Custody {
  months: number;
  why: string;
}

const NONE: Custody = { months: 0, why: 'not violent, not a crime against persons, not a drug felony' };
const VIOLENT: Custody = { months: 18, why: 'a violent offense' };
const PERSONS: Custody = { months: 12, why: 'a crime against persons' };

/** RCW 9.94A.701 by the offense you were convicted of, as the case sheets name it. */
export const COMMUNITY_CUSTODY: Record<string, Custody> = {
  'Burglary in the first degree': VIOLENT,
  'Residential burglary': NONE,
  'Retail theft with special circumstances, first degree': NONE,
  'Theft in the first degree': NONE,
  'Identity theft in the first degree': PERSONS,
  'Identity theft in the second degree': PERSONS,
  'Possession with intent to deliver methamphetamine': { months: 12, why: 'a chapter 69.50 drug felony' },
  'Possession of a stolen vehicle': NONE,
  'Vehicular assault, under the influence': VIOLENT,
  'Vehicular assault, disregard for the safety of others': PERSONS,
  'Assault in the second degree': VIOLENT,
  'Assault in the first degree': { months: 36, why: 'a serious violent offense' },
  'Robbery in the first degree': VIOLENT,
  'Robbery in the second degree': VIOLENT,
  'Unlawful possession of a firearm, first degree': NONE,
  'Attempting to elude a pursuing police vehicle': NONE,
  'Felony violation of a no-contact order': PERSONS,
  'Trafficking in stolen property, first degree': NONE,
  'Trafficking in stolen property, second degree': NONE
};

export const communityCustody = (offense: string): Custody => COMMUNITY_CUSTODY[offense] ?? NONE;

/** The RCW 9.94A.703 conditions every term carries unless the court waives them. */
export const CONDITIONS =
  'report to your community corrections officer, work or go to school where DOC approves, use nothing without a prescription, and live only where DOC approves';

/** Graduated Reentry: months of total confinement required first, and how early each track lets you out. */
export const GRE = { track1Min: 6, track2Min: 3, reentryCenter: 18, ehmTrack1: 9, ehmTrack2: 18, voucher: 6 };
