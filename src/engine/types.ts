export type Stat = 'nerve' | 'hustle' | 'cool' | 'heart';
export type Custody = 'minimum' | 'medium' | 'close';
export type YardTag = 'test' | 'politics' | 'life' | 'special';
export type RumorTag = 'charge' | 'cooperation' | 'debt' | 'family' | 'weak';
export type Phase = 'draft' | 'sheet' | 'card' | 'result' | 'hub' | 'eyes' | 'mail' | 'over';
export type Ending = 'released' | 'died' | 'medical' | 'pc';

/** What the institution rolls. Any 6 means caught. */
export interface RollSpec {
  blue?: number; // officers who could see
  white?: number; // prisoners who could tell (adjusted by Cool)
  gray?: number; // cameras: hidden from the player, like at the table
  discretionary?: boolean; // adds Conspicuity in blue dice
  search?: boolean; // random search: also adds Conspicuity
  severity?: 'rolled' | 'minor' | 'major';
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
  bad: boolean; // a "✖": what the system did against you, +2 months
}
export interface Background {
  id: string;
  ethnicity: string;
  age: number;
  front: string; // as written on the public card
  tattoo: boolean;
  rural: boolean; // rural white backgrounds are where Cedar/Harlan/Granite staff come from
  case: CaseLine[];
  sentence: number;
}
export interface Outside {
  id: string;
  who: string;
  front: string;
  to: string;
  support: number;
  secret: string;
  privateTag?: RumorTag;
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
}

export interface Break {
  title: string;
  dice: { blueNo: number; blue: number; white: number; gray: number; rumor: number; applies: boolean };
  severity: 'rolled' | 'minor' | 'major';
  forced: 'major' | 'minor' | false;
  fightMajor?: boolean; // a minor that becomes a major if you also fought this month
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
  lines: { text: string; status: LetterStatus }[];
}

export interface Month {
  officer: Officer;
  noBlue: boolean;
  blueMonth: number;
  discBlue: number;
  testWhite: number;
  warn: boolean; // Reyes on Shift: the first minor becomes a warning
  noVisits: boolean;
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

export interface Game {
  v: 2;
  rng: number;
  phase: Phase;
  custody: Custody;
  facilityId: string;
  sentence: number;
  added: number; // months added during play (ceiling 3)
  m: number;
  lastAct: string;
  char: Character | null;
  cellieId: string;
  draft: { charges: string[]; backgrounds: string[]; outsides: string[] } | null;
  standing: number;
  support: number;
  boxes: number;
  maxBoxes: number;
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
  cleanStreak: number;
  efv: boolean;
  visitPending: boolean;
  visitBanMonth: number;
  visitBanAct: string;
  /** First month a visit can happen. Contact restored from Support 0 is letters and money only until the paperwork clears. */
  visitReadyMonth: number;
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
}
