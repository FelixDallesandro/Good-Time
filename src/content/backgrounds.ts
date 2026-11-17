import type { Background, CaseLine } from '../engine/types';

const bad = (text: string): CaseLine => ({ text, bad: true });
const ok = (text: string): CaseLine => ({ text, bad: false });

/**
 * Each Background carries a case: what the system did, never what the character did.
 * The backs stay hidden until the sentencing ledger.
 *
 * `score`: prior adult felony convictions, one offender-score point each (RCW 9.94A.525, simplified). These numbers
 * are game; the grid they feed is the statute's. A ✖ on counsel or bail moves the agreed number up the range
 * (src/content/sentencing.ts). b10's prior was pleaded down to a misdemeanor by paid counsel, so it scores nothing.
 *
 * `priors`: an arrest record. The Pull is harder to walk past, and staff read the file (an extra officer die on
 * discretionary rules).
 * `priorDoc`: priors that became a prison term. These arrive with the DOC number from last time: an 8-series number
 * for anyone old enough to have been committed before those stopped being issued (around 2007 or 2008, so late 30s
 * and up), otherwise a 3 or 4 series. One prior "pleaded down" with paid counsel never became a number at all.
 *
 * `credential`: the work on the front asks for a high school diploma or equivalent (a union apprenticeship, college,
 * the Army), so education rolls a diploma or a GED. Everyone else can roll neither. The odds are in classification.ts.
 */
export const BACKGROUNDS: Background[] = [
  { id: 'b1', priors: true, priorDoc: true, ethnicity: 'Black', age: 24, tattoo: true, rural: false, score: 3,
    front: 'Black, 24. Grew up on the Southend of Harbor City. Neighborhood tattoo on the forearm.',
    case: [bad('Public defender, full caseload.'), bad("Held: couldn't post bail."), bad('Priors from a block with a patrol car on every corner.')] },
  { id: 'b2', credential: true, ethnicity: 'Black', age: 41, tattoo: false, rural: false, score: 0,
    front: 'Black, 41. Union electrician from the suburbs east of the lake.',
    case: [ok('Paid counsel.'), ok('Home until trial.'), ok('First arrest.')] },
  { id: 'b3', ethnicity: 'Black', age: 19, tattoo: false, rural: false, score: 0,
    front: 'Black, 19. Aged out of foster care eight months ago.',
    case: [bad('Public defender.'), bad('Held: no one to post bail.'), ok('First arrest.')] },
  { id: 'b4', priors: true, priorDoc: true, ethnicity: 'Latino', age: 33, tattoo: false, rural: false, score: 3,
    front: 'Latino, 33. Farmworker family in the upper valley. Speaks Spanish at home.',
    case: [bad('Public defender.'), bad('Held: bail set as a flight risk.'), bad('Priors from the valley sweeps.')] },
  { id: 'b5', priors: true, priorDoc: true, ethnicity: 'Latino', age: 27, tattoo: false, rural: false, score: 2,
    front: 'Latino, 27. Line cook in Harbor City, second generation.',
    case: [bad('Public defender.'), ok('Home: his aunt posted bail.'), bad('Priors from traffic stops that turned into searches.')] },
  { id: 'b6', priors: true, priorDoc: true, ethnicity: 'Native', age: 30, tattoo: true, rural: false, score: 3,
    front: 'Native, 30. Enrolled member of a coastal tribe; arrested off-reservation. Tribal tattoo on the shoulder.',
    case: [bad("Public defender, three hours' drive away."), bad('Held in county jail.'), bad('Priors.')] },
  { id: 'b7', ethnicity: 'Native', age: 52, tattoo: false, rural: false, score: 0,
    front: 'Native, 52. Raised in Harbor City; ran a shop for twenty years.',
    case: [bad('Public defender.'), bad("Held: the bail was a month's revenue."), ok('First arrest.')] },
  { id: 'b8', priors: true, priorDoc: true, ethnicity: 'White', age: 35, tattoo: false, rural: true, score: 2,
    front: "White, 35. Rural county where the mill closed. Lives in his mother's trailer.",
    case: [bad('Public defender.'), bad('Held.'), bad('Priors from a county that charges everything.')] },
  { id: 'b9', ethnicity: 'White', age: 45, tattoo: false, rural: false, score: 0,
    front: 'White, 45. Contractor from a cul-de-sac suburb.',
    case: [ok('Paid counsel.'), ok('Home until trial.'), ok('First arrest.')] },
  { id: 'b10', credential: true, priors: true, ethnicity: 'White', age: 22, tattoo: false, rural: false, score: 0,
    front: 'White, 22. College dropout; parents in the north end.',
    case: [ok('Paid counsel (his parents).'), ok('Home until trial.'), bad('One prior, pleaded down.')] },
  { id: 'b11', ethnicity: 'Pacific Islander', age: 28, tattoo: false, rural: false, score: 0,
    front: 'Pacific Islander, 28. Samoan family in Harbor City; plays rugby on Sundays.',
    case: [bad('Public defender.'), bad('Held.'), ok('First arrest.')] },
  { id: 'b12', credential: true, priors: true, priorDoc: true, ethnicity: 'White', age: 58, tattoo: false, rural: false, score: 2,
    front: 'White, 58. Army veteran. Lives in his truck.',
    case: [bad('Public defender.'), ok("Home: a veterans' group posted bail."), bad('Priors.')] }
];
