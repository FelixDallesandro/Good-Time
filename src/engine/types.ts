export type Stat = 'nerve' | 'hustle' | 'cool' | 'heart';
export type Custody = 'minimum' | 'medium' | 'close';
export type YardTag = 'test' | 'politics' | 'life' | 'special';
export type RumorTag = 'charge' | 'cooperation' | 'debt' | 'family' | 'weak';
export type Phase = 'draft' | 'sheet' | 'reception' | 'card' | 'result' | 'hub' | 'eyes' | 'mail' | 'release' | 'over';
export type Ending = 'released' | 'died' | 'medical' | 'pc';
/** Something said in a message from outside that tells staff more than it should. */
export type SlipId = 'ink' | 'phone' | 'efv' | 'money';

/** What the institution rolls. Any 6 means caught. */
export interface RollSpec {
  blue?: number; // officers who could see
  white?: number; // prisoners who could tell (adjusted by Cool)
  gray?: number; // cameras: hidden from the player, like at the table
  discretionary?: boolean; // adds Conspicuity in blue dice
  search?: boolean; // random search: also adds Conspicuity
  severity?: 'rolled' | 'minor' | 'major';
  /** WAC code charged if it is written as a general violation (one 6, or a minor). */
  gen?: string;
  /** WAC code charged if it is written as a serious violation (two 6s, or a major). */
  ser?: string;
}

/* ------------------------------------------------------------------ */
/* Ties: the actual people outside                                     */
/* ------------------------------------------------------------------ */

export type TieRole = 'partner' | 'ex' | 'child' | 'parent' | 'grandparent' | 'sibling' | 'friend' | 'volunteer' | 'stranger';

export interface TieDef {
  id: string;
  who: string; // "your mother"
  to: string; // how a letter is addressed: "Mom"
  role: TieRole;
  weight: number; // how much of your Support this person is
  visits: boolean; // can come to the visiting room at all
  efv: boolean; // immediate family for an extended family visit
  minor?: boolean;
  guardian?: string; // a minor comes only with this tie
}

export interface Tie extends TieDef {
  gone: boolean;
  ready: number; // first month a visit is possible (visitor approval)
  /** Blank messages sent them since the last time it cost you. */
  strain?: number;
}

export interface TieOp {
  id: string;
  delta?: number; // weight change; at 0 the person is gone
  gone?: boolean;
  why?: string;
}

/* ------------------------------------------------------------------ */
/* Discipline: WAC 137-28 / DOC 460.000 / DOC 460.050                  */
/* ------------------------------------------------------------------ */

export type ViolationCat = 'general' | 'A' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C3' | 'D';

export interface Violation {
  code: string;
  title: string;
  cat: ViolationCat;
  points: number; // classification points (DOC 460.050 Attachment 1)
}

/** A serious infraction report waiting for its hearing. */
export interface Hearing {
  code: string;
  source: string; // what you did, in the game's words
  gen?: string; // the lesser general violation a hearing officer could reduce it to
}

export interface Infraction {
  m: number;
  code: string;
  source: string;
  serious: boolean;
  result: 'guilty' | 'reduced' | 'not_guilty' | 'onsite';
  plea?: 'guilty' | 'contest';
  days?: number; // good conduct time taken
  appeal?: 'pending' | 'denied' | 'granted';
  discretionary?: boolean; // a petty write-up nobody else got
}

export interface Efv {
  status: 'none' | 'applied' | 'approved' | 'suspended';
  decide: number; // month the application decision arrives
  next: number; // month of the next scheduled visit
  until: number; // end of a suspension
  done: number; // visits had
}

export interface Effect {
  standing?: number;
  standingSet?: number;
  commissary?: number;
  commissarySupport?: boolean; // lose commissary equal to Support
  commissaryCap?: number; // anything over this is given up
  blueMonth?: number; // blue dice on every roll this month
  rumors?: number; // weakness rumor pinned to you
  coopRumors?: number; // cooperation rumor pinned to you
  removeRumors?: number | 'all';
  boxes?: number; // + refill, - erase (no roll)
  echoes?: string[]; // yard cards shuffled into the deck
  proven?: boolean;
  debt?: string; // debt string to ...
  leverage?: boolean;
  hurtCheck?: number; // hurt on d6 <= n
  contraband?: number;
  cellContraband?: boolean; // the package is on your cellie's side
  extraLine?: boolean;
  blueNext?: number;
  blueOnce?: number;
  noBlue?: boolean;
  statDelta?: Partial<Record<Stat, number>>;
  support?: number;
  supportSet?: number;
  ties?: TieOp[];
  newTie?: TieDef & { wait?: number; ifNone?: boolean };
  mission?: number;
  skipScene?: number;
  sentence?: number; // months added (capped) or removed
  defer?: { in: number; unit: 'month' | 'act'; chance?: number; effect: Effect };
  monthly?: { label: string; commissary?: number; standing?: number; untilAct?: boolean };
  cellieCut?: boolean;
  newCellie?: boolean;
  marksCheck?: boolean;
  markHit?: boolean;
  visitBan?: 'month' | 'act';
  flipPrivate?: RumorTag[];
  pc?: boolean;
  repeat?: boolean; // present the same card again
  flag?: string; // 'act_' prefixed flags clear at the end of the act
  informed?: boolean;
  putInWork?: boolean;
  job?: boolean;
  lockdown?: boolean;
  treatment?: 'comply' | 'refuse';
  paperwork?: 'show' | 'deny' | 'pc';
  newCase?: 'deal' | 'trial';
  segSafety?: number; // chance staff move you off mainline for your own safety (not discipline)
  log?: string;
}

export interface Cond {
  standingMin?: number;
  standingMax?: number;
  supportMax?: number;
  officer?: 'decent';
  front?: number;
  then: Effect;
  else?: Effect;
}

/** How a choice meets trouble. Repeating one hardens into a groove that closes the others. */
export type Style = 'force' | 'tell' | 'car' | 'withdraw';

export interface Groove {
  force: number;
  tell: number;
  car: number;
  withdraw: number;
  /** Set once a style hits tier 2; only cleared when its count falls back to the break point. */
  locked: Style | null;
  /** Styles picked during the current act: a locked style only decays in an act without it. */
  used: Partial<Record<Style, boolean>>;
}

export interface Choice {
  id: string;
  label: string;
  text: string;
  /** Overrides the style derived from the tag, threat, and effect. */
  style?: Style;
  requires?: { stat: Stat; min: number };
  forbidden?: { stat: Stat; max: number };
  needs?: { commissary?: number; support?: number };
  phone?: boolean; // a phone call: closed while phone privileges are restricted
  tag?: 'letGo' | 'lookAway' | 'takeToCar' | 'violent' | 'fold' | 'walkAway';
  hustle?: boolean;
  roll?: RollSpec;
  auto?: boolean; // automatic major, no roll
  threat?: {
    success: Effect;
    follow: { roll?: RollSpec; auto?: boolean; effect?: Effect };
    fold: Effect;
    mod?: number;
  };
  check?: { stat?: Stat; target: number; conspTarget?: boolean; pass: Effect; fail: Effect };
  sideRoll?: { white: number; on6: Effect };
  effect?: Effect;
  onClean?: Effect;
  onCaught?: Effect;
  cond?: Cond;
  special?: 'strikeHold' | 'strikeBreak' | 'pullRoll';
}

export interface Card {
  id: string;
  kind: 'yard' | 'count' | 'move' | 'prompt';
  tag?: YardTag;
  title: string;
  text: string;
  fronts?: string[];
  choices?: Choice[];
  officer?: string;
  effect?: Effect;
  echo?: boolean;
  rule?: string; // Count-card rule, handled in the engine
  pullId?: string;
  needsTie?: TieRole[]; // only drawn if one of these people is still in your life
}

export interface Officer {
  name: string;
  mood: 'decent' | 'exhausted' | 'cruel';
  blurb: string;
}

export interface Failing {
  d20: number;
  id: string;
  name: string;
  card: 'public' | 'private';
  text: string;
}

export interface PullDef {
  id: string;
  title: string;
  text: string;
  rule: string;
}
export interface Charge {
  id: string;
  name: string;
  claim: string;
  truth: string;
  consp: number; // 1 for drug or theft charges
  pull: PullDef;
}
export interface CaseLine {
  text: string;
  bad: boolean; // a "✖": what the system did against you
}
export interface Background {
  id: string;
  ethnicity: string;
  age: number;
  front: string; // as written on the public card
  tattoo: boolean;
  rural: boolean; // rural white backgrounds are where Cedar/Harlan/Granite staff come from
  /** A prior arrest record: the Pull is harder to walk past, and staff read the file. */
  priors?: boolean;
  /** Been to prison before: arrives with the DOC number from last time. */
  priorDoc?: boolean;
  case: CaseLine[];
  /** Offender score from prior adult felonies (RCW 9.94A.525, one point each: simplified). */
  score: number;
  /** Highest credential: a high school diploma, a GED, or neither. Washington ONE's Education need turns on it. */
  education: 'diploma' | 'ged' | 'none';
}
export interface Outside {
  id: string;
  who: string;
  front: string;
  to: string;
  support: number;
  secret: string;
  privateTag?: RumorTag;
  ties: TieDef[];
  lineHome: Card;
}
export interface Cellie {
  id: string;
  name: string;
  front: string;
  back: string;
  owns: number; // he owns his own on d6 >= owns (7 = never)
  has: boolean; // something going
  contraband: boolean;
  drugs: boolean;
  code?: string; // what the cell tag is written as
  setup?: Effect;
  cut?: Effect;
}
export interface Facility {
  id: string;
  name: string;
  custody: Custody;
  front: string;
  boxes: number;
  startStanding: number;
  crs: number; // Custody Review Score at intake (DOC 300.380); a game number, set near the next band
  difficulty: string;
  rules: string;
  watchedHarder: string[];
  staffFrom: string;
  efv: boolean;
}

export interface StatLine {
  roll: number;
  mod: number;
}
export interface Character {
  name: string;
  chargeId: string;
  backgroundId: string;
  outsideId: string;
  codeMoveId: string;
  stats: Record<Stat, StatLine>;
  failings: string[];
  conspBase: number;
  privateTag: RumorTag;
  knownOfficer?: string;
  claim: string;
  /** Six digits, issued at intake. Stamped on everything you own, the back of every photo included. */
  docNumber: string;
}

export interface Break {
  title: string;
  dice: { blueNo: number; blue: number; white: number; gray: number; rumor: number; applies: boolean };
  severity: 'rolled' | 'minor' | 'major';
  forced: 'major' | 'minor' | false;
  gen?: string;
  ser?: string;
  hustle?: boolean;
  onClean?: Effect;
  onCaught?: Effect;
}

export interface LedgerEntry {
  m: number;
  title: string;
  blueNo: number;
  white: number;
  gray: number;
  rumor: number;
  applies: boolean;
  consp: number;
  caught: boolean;
  forced: boolean;
}

export type LetterStatus = 'sent' | 'delayed' | 'held';
export interface Letter {
  m: number;
  notebook: boolean; // Support 0: written to no one
  lines: { text: string; status: LetterStatus; to?: string; subject?: string; flagged?: string[] }[];
}

/** A message you write: who to, a subject line, and (optionally) your own words. */
export interface OutMsg {
  to: string; // tie id
  topic: string;
  text: string;
}
/** A message on its way out. The reply is written when it arrives, from the state of things then. */
export interface Outgoing {
  to: string;
  who: string;
  topic: string;
  subject: string;
  m: number;
  arrive: number;
  late: boolean;
  /** Sent with a subject line and nothing else. */
  blank?: boolean;
}
/**
 * A message that didn't go out. A rejection comes with a notice (DOC 05-525) and can be appealed; a message blocked by a
 * disciplinary restriction cannot.
 */
export interface Rejection {
  id: number;
  /** Outgoing: yours, reviewed automatically, never returned. Incoming: theirs, which you may appeal. */
  dir: 'out' | 'in';
  kind: 'rejected' | 'restricted';
  m: number; // month written
  noticed: number; // month the notice reaches you
  to: string; // tie id (the other person)
  who: string;
  topic: string;
  subject: string;
  text: string;
  reason: string;
  /** DOC 450.100 Attachment 2: the Superintendent reviews first, then Headquarters, whose decision is final. */
  stage: 'none' | 'superintendent' | 'hq';
  status?: 'pending' | 'upheld' | 'overturned';
  decide?: number;
  decidedAt?: number;
  slip?: SlipId;
}

export interface Incoming {
  m: number;
  from: string;
  subject: string;
  text: string;
  slip?: SlipId;
}

export interface Month {
  officer: Officer;
  noBlue: boolean;
  blueMonth: number;
  discBlue: number;
  testWhite: number;
  warn: boolean; // Reyes on Shift: the first general is handled on site
  noVisits: boolean;
  confined: boolean; // cell confinement sanction: one scene, in the cell
  seriousGuilty: boolean; // no earned time this month
  efvNow: boolean; // the first scene this month is an extended family visit
  blank: boolean; // a month of nothing but count
  seg: boolean; // administrative segregation: no scenes this month
  noMessages: boolean;
  delayMessages: boolean;
  scenesLeft: number;
  sceneInit: boolean;
  lockdown: boolean;
  caught: boolean;
  fought: boolean;
  searched: boolean;
  breaks: Break[];
  medicalDone: boolean;
  notes: string[]; // things that happened at the turn of an act
}

export interface Cur {
  card: Card;
  source: 'count' | 'yard' | 'move' | 'prompt' | 'threat';
  noLetGo?: boolean;
  onlyViolent?: boolean;
  extraWhite?: number;
  front?: number;
  origin?: string;
}

export interface Deferred {
  unit: 'month' | 'act';
  left: number;
  chance?: number;
  effect: Effect;
}

export interface Court {
  path: 'deal' | 'trial';
  offense: string;
  rcw: string;
  level: number;
  grid: 'felony' | 'drug';
  counts: number;
  score: number;
  range: { low: number; high: number; plus: boolean; days?: number };
  base: number;
  enhs: { label: string; months: number; flat: boolean }[];
  enhMonths: number;
  /** What happened at the arrest: ran, gun, child. */
  facts: ('ran' | 'gun' | 'child')[];
  months: number;
  earnedMax: number;
  strike: boolean;
  talked: boolean;
  offer: 'first' | 'better' | 'same' | 'worse';
}

export interface Game {
  v: 3;
  rng: number;
  phase: Phase;
  custody: Custody;
  facilityId: string;
  sentence: number; // in turns
  /** The court: what was charged, what you took, and the real months behind the turns. */
  court: Court | null;
  /** Real months each turn stands for (12 to 16 turns served at full earned release). */
  perTurn: number;
  /** Substance use disorder treatment: every assessment finds a need. Failing it holds you to your max date. */
  treatment: { sessions: number; need: number; misses: number; failed: boolean; done: boolean };
  added: number; // months added during play (ceiling 3)
  m: number;
  lastAct: string;
  char: Character | null;
  cellieId: string;
  draft: { charges: string[]; backgrounds: string[]; outsides: string[] } | null;
  standing: number;
  /** Derived from ties: never set it directly. */
  support: number;
  ties: Tie[];
  boxes: number;
  maxBoxes: number;
  baseBoxes: number; // the facility's good time before any is taken
  gctLost: number; // days of good conduct time taken by sanctions
  classPoints: number; // total custody points ever deducted
  crsBase: number; // intake Custody Review Score
  progPoints: number; // +1 for each month with earned time
  infractions: Infraction[];
  hearings: Hearing[];
  lopUntil: number; // loss of privileges (yard, gym, dayroom) through this month
  segUntil: number; // administrative segregation through this month (30 days at most)
  segPlacements: { m: number; why: string; discretionary: boolean }[];
  confinedUntil: number;
  phoneUntil: number;
  commsUntil: number;
  visitMonths: number[];
  efv: Efv;
  commissary: number;
  rumors: { tag: RumorTag }[];
  strings: { type: 'debt' | 'leverage'; to: string }[];
  proven: boolean;
  consBonus: number;
  hurt: boolean;
  contraband: number;
  job: boolean;
  flags: Record<string, number | boolean>;
  usedMoves: Record<string, boolean>;
  pull: Record<string, { tallies: number; torn: boolean }>;
  privateFlipped: boolean;
  blueOnce: number;
  blueNext: number;
  extraLines: number;
  skipNext: number;
  visitPending: boolean;
  /** Marks a strip search after the visit would find: an uncaught fight or fresh ink. */
  visitRisk: 'fight' | 'ink' | null;
  /** Write-ups that land next month (found after a visit, say). */
  pendingBreaks: Break[];
  visitBanMonth: number;
  visitBanAct: string;
  marks: number;
  missionsDrawn: number;
  monthly: { label: string; commissary?: number; standing?: number; untilAct?: boolean }[];
  deferred: Deferred[];
  yardDeck: string[];
  yardDiscard: string[];
  countDeck: string[];
  queue: Card[];
  cur: Cur | null;
  result: { title: string; lines: string[] } | null;
  mo: Month;
  letters: Letter[];
  outbox: Outgoing[];
  inbox: Incoming[];
  rejections: Rejection[];
  /** Institutionalization: what the place has made routine. Rises every month; contact with outside slows it. */
  routine: number;
  /** The release act: the steps between the last message and the gate. */
  release: { step: number; picks: Record<string, string> } | null;
  ledger: LedgerEntry[];
  report: string[];
  lines: string[];
  actUsed: Record<string, Record<string, boolean | number>>;
  groove: Groove;
  stats: {
    letGo: number;
    fights: number;
    informed: number;
    putInWork: number;
    pullGiven: number;
    pullWalked: number;
    caught: number;
  };
  ending: Ending | null;
  /** Reception at Washington Corrections Center: the classification that placed you, and who was still there. */
  intake?: Intake | null;
}

export interface Intake {
  icd: number;
  parts: { label: string; v: number }[];
  custody: Custody;
  facilityId: string;
  /** Minimum custody with more than six years to the earned release date: housed at a Level 3 facility. */
  mi3: boolean;
  risk: string;
  lost: string[];
  kept: string[];
  /** Washington ONE criminogenic needs, as of the last reassessment. The risk level stays frozen. */
  needs: Record<string, 'Low' | 'Mod' | 'High' | null>;
}
