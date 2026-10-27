import type { Background, CaseLine } from '../engine/types';

const bad = (text: string): CaseLine => ({ text, bad: true });
const ok = (text: string): CaseLine => ({ text, bad: false });

/**
 * Each Background carries a case: what the system did, never what the character did.
 * Each ✖ adds 2 months to the 12-month base. The backs stay hidden until the sentencing ledger.
 */
export const BACKGROUNDS: Background[] = [
  { id: 'b1', ethnicity: 'Black', age: 24, tattoo: true, rural: false, sentence: 18,
    front: 'Black, 24. Grew up on the Southend of Harbor City. Neighborhood tattoo on the forearm.',
    case: [bad('Public defender, full caseload.'), bad("Held: couldn't post bail."), bad('Priors from a block with a patrol car on every corner.')] },
  { id: 'b2', ethnicity: 'Black', age: 41, tattoo: false, rural: false, sentence: 12,
    front: 'Black, 41. Union electrician from the suburbs east of the lake.',
    case: [ok('Paid counsel.'), ok('Home until trial.'), ok('First arrest.')] },
  { id: 'b3', ethnicity: 'Black', age: 19, tattoo: false, rural: false, sentence: 16,
    front: 'Black, 19. Aged out of foster care eight months ago.',
    case: [bad('Public defender.'), bad('Held: no one to post bail.'), ok('First arrest.')] },
  { id: 'b4', ethnicity: 'Latino', age: 33, tattoo: false, rural: false, sentence: 18,
    front: 'Latino, 33. Farmworker family in the upper valley. Speaks Spanish at home.',
    case: [bad('Public defender.'), bad('Held: bail set as a flight risk.'), bad('Priors from the valley sweeps.')] },
  { id: 'b5', ethnicity: 'Latino', age: 27, tattoo: false, rural: false, sentence: 16,
    front: 'Latino, 27. Line cook in Harbor City, second generation.',
    case: [bad('Public defender.'), ok('Home: his aunt posted bail.'), bad('Priors from traffic stops that turned into searches.')] },
  { id: 'b6', ethnicity: 'Native', age: 30, tattoo: true, rural: false, sentence: 18,
    front: 'Native, 30. Enrolled member of a coastal tribe; arrested off-reservation. Tribal tattoo on the shoulder.',
    case: [bad("Public defender, three hours' drive away."), bad('Held in county jail.'), bad('Priors.')] },
  { id: 'b7', ethnicity: 'Native', age: 52, tattoo: false, rural: false, sentence: 16,
    front: 'Native, 52. Raised in Harbor City; ran a shop for twenty years.',
    case: [bad('Public defender.'), bad("Held: the bail was a month's revenue."), ok('First arrest.')] },
  { id: 'b8', ethnicity: 'White', age: 35, tattoo: false, rural: true, sentence: 18,
    front: "White, 35. Rural county where the mill closed. Lives in his mother's trailer.",
    case: [bad('Public defender.'), bad('Held.'), bad('Priors from a county that charges everything.')] },
  { id: 'b9', ethnicity: 'White', age: 45, tattoo: false, rural: false, sentence: 12,
    front: 'White, 45. Contractor from a cul-de-sac suburb.',
    case: [ok('Paid counsel.'), ok('Home until trial.'), ok('First arrest.')] },
  { id: 'b10', ethnicity: 'White', age: 22, tattoo: false, rural: false, sentence: 14,
    front: 'White, 22. College dropout; parents in the north end.',
    case: [ok('Paid counsel (his parents).'), ok('Home until trial.'), bad('One prior, pleaded down.')] },
  { id: 'b11', ethnicity: 'Pacific Islander', age: 28, tattoo: false, rural: false, sentence: 16,
    front: 'Pacific Islander, 28. Samoan family in Harbor City; plays rugby on Sundays.',
    case: [bad('Public defender.'), bad('Held.'), ok('First arrest.')] },
  { id: 'b12', ethnicity: 'White', age: 58, tattoo: false, rural: false, sentence: 16,
    front: 'White, 58. Army veteran. Lives in his truck.',
    case: [bad('Public defender.'), ok("Home: a veterans' group posted bail."), bad('Priors.')] }
];
