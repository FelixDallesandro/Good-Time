import {
  ANYONE_MOVES, BACKGROUNDS, CELLIES, CHARGES, COUNT, FAILINGS, OFFICERS, OUTSIDES, PROMPTS, PULL_HABIT,
  PULL_STICKY, YARD, background, cellie, charge, codeMove, facility, outside, CODE_MOVES
} from './content';
import { d, next, pickN, shuffle } from './rng';
import { flaggedWords } from '../content/keywords';
import { CATEGORY_POINTS, ICD_BASE, ICD_DEDUCT, ICD_ODDS, MI3_MONTHS, NEED_DOMAINS, PEN_PAL, REASSESS_MONTHS, TIE_LOSS, icdBand, waOne } from '../content/classification';
import type { NeedLevel } from '../content/classification';
import { CHARGE_CATEGORY } from '../content/recidivism';
import { CASES, FACTS, ROMAN, fmtMonths, fmtRange, insideSentence, sentenceFor, timeScale, type Fact, type Offer, type Path } from '../content/sentencing';
import { TOPICS, compose, replyContext, type Topic } from './replies';
import {
  GENERAL_SANCTIONS, NO_WEIGHTS, PETTY, PHONE_LOSS, SEG_CODES, SERIOUS_SANCTIONS, TRAFFICKING_GCT, violation
} from '../content/violations';
import type {
  Card, Character, Choice, Cond, Effect, Game, Groove, Hearing, Infraction, Letter, Month, Officer, PullDef, RollSpec, RumorTag,
  OutMsg, SlipId, Stat, Style, Tie, TieDef, TieOp
} from './types';

export const STATS: Stat[] = ['nerve', 'hustle', 'cool', 'heart'];
const clone = <T>(x: T): T => structuredClone(x);
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const L = (s: Game, msg: string) => void s.lines.push(msg);
const MAX_ADDED = 3; // ceiling on months added during play

/* ------------------------------------------------------------------ */
/* Derived values                                                      */
/* ------------------------------------------------------------------ */

export function modFor(roll: number): number {
  if (roll <= 5) return -2;
  if (roll <= 8) return -1;
  if (roll <= 12) return 0;
  if (roll <= 15) return 1;
  return 2;
}
export const has = (s: Game, id: string) => !!s.char?.failings.includes(id);
/** An arrest record before this sentence. */
export const hasPriors = (s: Game) => !!(s.char && background(s.char.backgroundId).priors);
export const statMod = (s: Game, k: Stat) => s.char!.stats[k].mod;
export const consp = (s: Game) => clamp(s.char!.conspBase + s.consBonus, -2, 2);
export const releaseMonth = (s: Game) => s.sentence - s.boxes;
export const cellieOf = (s: Game) => cellie(s.cellieId);

export type Act = 'intake' | 'yard' | 'long' | 'short';
export function actOf(s: Game): Act {
  if (s.m <= 2) return 'intake';
  if (releaseMonth(s) - s.m <= 1) return 'short';
  if (s.m <= 5) return 'yard';
  return 'long';
}

export const caughtChance = (dice: number) => 1 - Math.pow(5 / 6, dice);

/* ------------------------------------------------------------------ */
/* Grooves: how you meet trouble hardens into who you are              */
/* ------------------------------------------------------------------ */

export const STYLES: Style[] = ['force', 'tell', 'car', 'withdraw'];
const GROOVE_TIER1 = 3; // the yard learns how you handle things; going against it costs Standing
const GROOVE_TIER2 = 5; // the other ways close (a sentence is short: about 5 picks of one style is a pattern)
const GROOVE_CAP = 7;
const GROOVE_BREAK = 2; // a locked groove only opens once its count falls this far
const VERB: Record<Style, string> = { force: 'fight', tell: 'tell', car: 'go to your car', withdraw: 'back down' };

const newGroove = (): Groove => ({ force: 0, tell: 0, car: 0, withdraw: 0, locked: null, used: {} });
/** Old saves have no groove. */
const grooveOfState = (s: Game): Groove => (s.groove ??= newGroove());

export function styleOf(ch: Choice): Style | null {
  if (ch.style) return ch.style;
  if (ch.tag === 'violent' || ch.threat) return 'force';
  if (ch.tag === 'takeToCar') return 'car';
  if (ch.tag === 'letGo' || ch.tag === 'lookAway' || ch.tag === 'walkAway') return 'withdraw';
  if (ch.effect?.informed || ch.effect?.coopRumors) return 'tell';
  return null;
}

/** The style you are known for (3+ picks and ahead of every other style), or null. */
export function grooveOf(s: Game): { style: Style; tier: 1 | 2 } | null {
  const g = grooveOfState(s);
  if (g.locked) return { style: g.locked, tier: 2 };
  const top = Math.max(...STYLES.map((k) => g[k]));
  const leaders = STYLES.filter((k) => g[k] === top);
  return top >= GROOVE_TIER1 && leaders.length === 1 ? { style: leaders[0], tier: 1 } : null;
}

export function grooveLabel(s: Game): string | null {
  const gv = grooveOf(s);
  return gv ? `${gv.tier === 2 ? 'Locked in' : 'Known to'} ${VERB[gv.style]}` : null;
}

/** The price of going against a tier 1 groove, shown on the choice. */
export function grooveCost(s: Game, ch: Choice): string | null {
  const gv = grooveOf(s);
  const st = styleOf(ch);
  return gv?.tier === 1 && st && st !== gv.style ? `Out of character: -1 Standing` : null;
}

function noteStyle(s: Game, ch: Choice) {
  const st = styleOf(ch);
  if (!st) return;
  const g = grooveOfState(s);
  const before = grooveOf(s);
  if (before && before.style !== st) {
    g[before.style] = Math.max(0, g[before.style] - 1);
    if (before.tier === 1) {
      addStanding(s, -1);
      L(s, `That is not how you handle things. The yard notices: -1 Standing.`);
    }
  }
  g[st] = Math.min(GROOVE_CAP, g[st] + 1);
  g.used[st] = true;
  if (g.locked && g[g.locked] <= GROOVE_BREAK) {
    g.locked = null;
    L(s, 'You have broken the pattern. It cost you.');
  }
  if (!g.locked && g[st] >= GROOVE_TIER2) {
    g.locked = st;
    L(s, `That is who you are now. You ${VERB[st]}, and the other ways are closed.`);
  } else if (!before && grooveOf(s)?.style === st) {
    L(s, `The yard is learning that you ${VERB[st]}. Any other way will cost you.`);
  }
}

/** Slow decay at each act change: a style loses 1 only in an act spent without it. */
function decayGroove(s: Game) {
  const g = grooveOfState(s);
  for (const k of STYLES) if (!g.used[k]) g[k] = Math.max(0, g[k] - 1);
  g.used = {};
  if (g.locked && g[g.locked] <= GROOVE_BREAK) {
    g.locked = null;
    L(s, 'A whole act without it. The pattern breaks.');
  }
}

/* ------------------------------------------------------------------ */
/* The Eyes                                                            */
/* ------------------------------------------------------------------ */

export interface Dice {
  blueNo: number; // blue dice before Conspicuity
  blue: number;
  white: number;
  gray: number; // cameras: the risk you can't count
  rumor: number;
  applies: boolean; // Conspicuity applies to this roll
  total: number;
  pct: number;
  visible: number; // the eyes you can see
  visiblePct: number;
}

export function computeDice(s: Game, spec: RollSpec): Dice {
  const c = consp(s);
  const disc = !!spec.discretionary;
  const applies = disc || !!spec.search;
  let blueNo = spec.blue ?? 0;
  blueNo += s.mo.blueMonth + s.blueOnce;
  if (s.char?.knownOfficer && s.mo.officer.name === s.char.knownOfficer) blueNo += 1;
  if (disc) {
    blueNo += s.mo.discBlue;
    if (s.mo.officer.mood === 'cruel') blueNo += 1;
    if (s.mo.officer.mood === 'decent') blueNo -= 1;
    if (has(s, 'mouthy')) blueNo += 1;
    if (hasPriors(s)) blueNo += 1; // they read the file
  }
  blueNo = Math.max(0, blueNo);
  let blue = Math.max(0, blueNo + (applies ? c : 0));
  if (s.mo.noBlue) blue = 0;
  const baseWhite = spec.white ?? 0;
  let white = baseWhite > 0 ? Math.max(0, baseWhite - statMod(s, 'cool')) : 0;
  if (baseWhite > 0 && s.cur?.card.tag === 'test') white += (s.cur.extraWhite ?? 0) + s.mo.testWhite;
  const gray = (spec.gray ?? 0) + (s.custody === 'close' ? 1 : 0);
  const rumor = s.rumors.length;
  const visible = blue + white + rumor;
  const total = visible + gray;
  return {
    blueNo, blue, white, gray, rumor, applies, total, pct: caughtChance(total),
    visible, visiblePct: caughtChance(visible)
  };
}

function addBreak(
  s: Game,
  title: string,
  spec: RollSpec,
  opts: { forced?: 'major' | 'minor'; onClean?: Effect; onCaught?: Effect; hustle?: boolean } = {}
) {
  const dice = computeDice(s, spec);
  s.blueOnce = 0;
  s.mo.breaks.push({
    title,
    dice: { blueNo: dice.blueNo, blue: dice.blue, white: dice.white, gray: dice.gray, rumor: dice.rumor, applies: dice.applies },
    severity: opts.forced ?? spec.severity ?? 'rolled',
    forced: opts.forced ?? false,
    gen: spec.gen,
    ser: spec.ser ?? (opts.forced === 'major' || spec.severity === 'major' ? '505' : undefined),
    hustle: opts.hustle,
    onClean: opts.onClean,
    onCaught: opts.onCaught
  });
  L(s, opts.forced ? 'Staff will have this one on file: no roll.' : 'Noted. Staff will roll the Eyes at the end of the month.');
}

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

function emptyMonth(officer: Officer): Month {
  return {
    officer, noBlue: false, blueMonth: 0, discBlue: 0, testWhite: 0, warn: false, noVisits: false,
    noMessages: false, delayMessages: false, scenesLeft: 0, sceneInit: false, lockdown: false,
    caught: false, fought: false, searched: false, breaks: [], medicalDone: false, notes: [],
    confined: false, seriousGuilty: false, efvNow: false, seg: false, blank: false
  };
}

export function newGame(facilityId: string, seed: number): Game {
  const f = facility(facilityId);
  const s: Game = {
    v: 3, rng: seed | 0, phase: 'draft', custody: f.custody, facilityId, sentence: 12, court: null, perTurn: 1,
    treatment: { sessions: 0, need: TREATMENT_SESSIONS, misses: 0, failed: false, done: false }, added: 0, m: 1, lastAct: '',
    char: null, cellieId: '', draft: null, standing: f.startStanding, support: 0, ties: [], boxes: 0, maxBoxes: f.boxes,
    baseBoxes: f.boxes, gctLost: 0, classPoints: 0, crsBase: f.crs, progPoints: 0, infractions: [], hearings: [], lopUntil: 0, segUntil: 0, segPlacements: [], confinedUntil: 0,
    phoneUntil: 0, commsUntil: 0, visitMonths: [], efv: { status: 'none', decide: 0, next: 0, until: 0, done: 0 },
    commissary: 5, rumors: [], strings: [], proven: false, consBonus: 0, hurt: false, contraband: 0, job: false,
    flags: {}, usedMoves: {}, pull: {}, privateFlipped: false, blueOnce: 0, blueNext: 0, extraLines: 0,
    skipNext: 0, visitPending: false, visitRisk: null, pendingBreaks: [], visitBanMonth: 0, visitBanAct: '', marks: 0,
    missionsDrawn: 0, monthly: [], deferred: [], yardDeck: [], yardDiscard: [], countDeck: [], queue: [],
    cur: null, result: null, mo: emptyMonth(OFFICERS[0]), letters: [], outbox: [], inbox: [], rejections: [], routine: 0, release: null, ledger: [], report: [], lines: [],
    actUsed: {}, groove: newGroove(), stats: { letGo: 0, fights: 0, informed: 0, putInWork: 0, pullGiven: 0, pullWalked: 0, caught: 0 },
    ending: null, intake: null
  };
  s.draft = {
    charges: pickN(s, CHARGES.map((c) => c.id), 3),
    backgrounds: pickN(s, BACKGROUNDS.map((b) => b.id), 3),
    outsides: pickN(s, OUTSIDES.map((o) => o.id), 3)
  };
  return s;
}

/** Conspicuity is not rolled: it's the facts on your public card, read through this facility's card. */
export function conspFacts(facilityId: string, chargeId: string, backgroundId: string) {
  const f = facility(facilityId);
  const ch = charge(chargeId);
  const bg = background(backgroundId);
  const facts: { label: string; v: number }[] = [];
  if (f.watchedHarder.includes(bg.ethnicity))
    facts.push({ label: `Staff at ${f.name} watch ${bg.ethnicity} backgrounds harder`, v: 2 });
  if (ch.consp) facts.push({ label: 'Your charge involves drugs or theft', v: 1 });
  if (bg.tattoo) facts.push({ label: 'Visible tattoos', v: 1 });
  if (bg.age > 50) facts.push({ label: 'Over 50', v: -1 });
  if (bg.rural && bg.ethnicity === 'White')
    facts.push({ label: `Staff here mostly come from your community (${f.staffFrom})`, v: -1 });
  const raw = facts.reduce((a, x) => a + x.v, 0);
  return { facts, raw, total: clamp(raw, -2, 2) };
}

export function draftPick(
  g: Game,
  pick: { chargeId: string; backgroundId: string; outsideId?: string; name: string }
): Game {
  const s = clone(g);
  const ch = charge(pick.chargeId);
  const bg = background(pick.backgroundId);
  // nobody chooses who is still waiting: the Outside card is dealt
  const out = outside(pick.outsideId ?? pickN(s, OUTSIDES.map((o) => o.id), 1)[0]);

  const stats = {} as Character['stats'];
  for (const k of STATS) {
    const roll = d(s, 6) + d(s, 6) + d(s, 6);
    stats[k] = { roll, mod: modFor(roll) };
  }

  const failings: string[] = [];
  const rollFailings = (n: number) => {
    let guard = 0;
    while (failings.length < n && guard++ < 200) {
      const r = d(s, 20);
      if (r === 20) continue;
      const id = FAILINGS[r - 1].id;
      if (!failings.includes(id)) failings.push(id);
    }
  };
  const first = d(s, 20);
  if (first === 20) rollFailings(2); // "roll twice more": take both
  else {
    failings.push(FAILINGS[first - 1].id);
    rollFailings(2);
  }

  let privateTag: RumorTag = out.privateTag ?? 'charge';
  if (failings.includes('in_debt')) privateTag = 'debt';
  if (failings.includes('informant')) privateTag = 'cooperation';

  const knownOfficer = failings.includes('known_to_staff')
    ? pickN(s, OFFICERS.filter((o) => o.name !== 'Pruitt'), 1)[0].name
    : undefined;

  s.char = {
    name: pick.name.trim() || 'Inmate',
    chargeId: ch.id, backgroundId: bg.id, outsideId: out.id,
    codeMoveId: pickN(s, CODE_MOVES, 1)[0].id,
    stats, failings,
    conspBase: conspFacts(s.facilityId, ch.id, bg.id).total,
    privateTag, knownOfficer, claim: ch.claim,
    docNumber: docNumberFor(s, bg.priorDoc ? bg.age : null)
  };
  rollFacts(s);
  setCourt(s, 'deal');
  // been down before: the place is not new, and the number is not new either
  if (bg.priorDoc) {
    s.routine = bg.age >= 37 ? 8 : 4;
    s.flags.routineSeen = routineLevel(s);
  }
  // Support is the people on the Outside card. Heart +1 makes one of them hold on harder; with no one, it adds nothing.
  s.ties = out.ties.map((t) => ({ ...t, gone: false, ready: 0 }));
  if (stats.heart.mod >= 1 && s.ties.length) s.ties[0].weight += 1;
  syncSupport(s);
  s.cellieId = pickN(s, CELLIES, 1)[0].id;

  s.pull[ch.pull.id] = { tallies: 0, torn: false };
  if (failings.includes('habit')) s.pull[PULL_HABIT.id] = { tallies: 0, torn: false };
  if (failings.includes('sticky_fingers')) s.pull[PULL_STICKY.id] = { tallies: 0, torn: false };

  // decks: the 40-card Yard deck (no echoes, no specials), minus Politics at minimum custody
  s.yardDeck = shuffle(
    s,
    [...YARD.values()].filter((c) => !c.echo && c.tag !== 'special' && !(s.custody === 'minimum' && c.tag === 'politics')).map((c) => c.id)
  );
  // Support makes you a target: one Leverage card for Support 2, two for Support 3
  if (s.support >= 2) for (let i = 0; i < s.support - 1; i++) shuffleIn(s, 'leverage');

  if (failings.includes('bad_blood')) shuffleIn(s, 'payback');
  if (failings.includes('snitch_jacket')) s.rumors.push({ tag: 'cooperation' });
  if (failings.includes('affiliated')) s.strings.push({ type: 'debt', to: 'your shot caller' });
  if (failings.includes('in_debt')) s.strings.push({ type: 'debt', to: 'the store man' });
  if (failings.includes('holding')) s.flags.holding = true;
  if (s.custody === 'close') s.strings.push({ type: 'debt', to: 'your car' });
  apply(s, cellieOf(s).setup);
  s.lines = [];

  s.phase = 'sheet';
  return s;
}

export function beginSentence(g: Game): Game {
  const s = clone(g);
  s.m = 1;
  scheduleExposure(s);
  startMonth(s);
  return s;
}

/* ------------------------------------------------------------------ */
/* The month                                                           */
/* ------------------------------------------------------------------ */

function shuffleIn(s: Game, id: string) {
  const at = Math.floor(next(s) * (s.yardDeck.length + 1));
  s.yardDeck.splice(at, 0, id);
}

function drawCount(s: Game): Card {
  if (!s.countDeck.length) s.countDeck = shuffle(s, [...COUNT.keys()]);
  return clone(COUNT.get(s.countDeck.shift()!)!);
}

export function pullDefs(s: Game): PullDef[] {
  if (!s.char) return [];
  const out: PullDef[] = [charge(s.char.chargeId).pull];
  if (has(s, 'habit')) out.push(PULL_HABIT);
  if (has(s, 'sticky_fingers')) out.push(PULL_STICKY);
  return out;
}

function processDeferred(s: Game, unit: 'month' | 'act') {
  const keep: typeof s.deferred = [];
  for (const df of s.deferred) {
    if (df.unit !== unit) {
      keep.push(df);
      continue;
    }
    df.left -= 1;
    if (df.left > 0) {
      keep.push(df);
      continue;
    }
    if (df.chance === undefined || next(s) < df.chance) apply(s, df.effect);
  }
  s.deferred = keep;
}

function actChange(s: Game, act: Act) {
  if (s.lastAct) {
    processDeferred(s, 'act');
    decayGroove(s);
    for (const k of Object.keys(s.flags)) if (k.startsWith('act_')) delete s.flags[k];
    s.monthly = s.monthly.filter((m) => !m.untilAct);
    if (s.visitBanAct && s.visitBanAct !== act) s.visitBanAct = '';
  }
  s.lastAct = act;
}

function startMonth(s: Game) {
  const act = actOf(s);
  s.lines = [];
  actChange(s, act);
  s.actUsed[act] ??= {};
  resolveAppeals(s);
  custodyReview(s);
  const efvNow = efvMonth(s);
  const seg = s.segUntil >= s.m;
  const confined = !seg && s.confinedUntil >= s.m;
  if (seg) L(s, 'Administrative segregation. The final review comes inside thirty days. No scenes this month.');
  else if (s.segUntil === s.m - 1) {
    L(s, 'Final review: released to general population.');
    if (s.job) {
      s.job = false;
      L(s, 'You went to seg from the workers tier. That privilege is gone: no job, and a new cell on a regular tier.');
      newCellie(s);
    } else if (next(s) < 0.5) L(s, 'You go back to the same cell.');
    else {
      L(s, 'Your old cell has been filled. You are assigned a new one.');
      newCellie(s);
    }
  }
  if (confined) L(s, 'Confinement to cell: one scene this month, in your cell.');
  else if (onSheet(s)) L(s, 'Loss of privileges: no yard, no gym, no dayroom. Your photo is on the sheet in the bubble.');
  penPalMonth(s);
  reassessMonth(s);
  const lvl = routineLevel(s);
  if (lvl > Number(s.flags.routineSeen ?? 0)) {
    s.flags.routineSeen = lvl;
    L(s, ROUTINE_NOTES[lvl]);
  }
  const notes = s.lines.slice();
  s.lines = [];
  s.report = [];
  const first = drawCount(s);
  const officer = OFFICERS.find((o) => o.name === first.officer) ?? OFFICERS[Math.floor(next(s) * OFFICERS.length)];
  s.mo = emptyMonth(officer);
  s.mo.notes = notes;
  s.mo.breaks.push(...(s.pendingBreaks ?? []));
  s.pendingBreaks = [];
  s.mo.efvNow = efvNow && !seg;
  if (lvl >= 4 && !seg && !efvNow && next(s) < 0.3) s.mo.blank = true;
  s.mo.seg = seg;
  if (confined) {
    s.mo.lockdown = true;
    s.mo.confined = true;
  }
  s.mo.blueMonth = s.blueNext;
  s.blueNext = 0;
  s.queue = [first];
  if (act === 'short') s.queue.push(drawCount(s));
  if (lvl >= 2 && !seg && next(s) < 0.5) s.queue.push(countCard(s));
  if (!seg && treatmentDue(s)) s.queue.push(treatmentCard(s));
  if (s.flags.newCaseAt && s.m >= Number(s.flags.newCaseAt)) s.queue.push(newCaseCard(s));
  if (s.flags.exposeAt && !s.flags.exposed && s.m >= Number(s.flags.exposeAt) && !seg) s.queue.push(paperworkCard(s));
  if (s.standing === 0) s.queue.push(clone(PROMPTS.get('targeted')!));
  if (s.m >= 2 && !s.actUsed[act].leak && next(s) < 0.35) {
    s.actUsed[act].leak = true;
    s.queue.push(clone(PROMPTS.get(next(s) < 0.65 ? 'leak_told' : 'leak_about')!));
  }
  if (has(s, 'informant') && !s.actUsed[act].informant && next(s) < 0.6) {
    s.actUsed[act].informant = true;
    s.queue.push(clone(PROMPTS.get('informant_call')!));
  }
  // under sanction, the yard still asks things of you
  if (onSheet(s) && !confined && !seg && !s.actUsed[act].sendoff && next(s) < 0.35) {
    s.actUsed[act].sendoff = true;
    s.queue.push(clone(PROMPTS.get('send_off')!));
  }
  if (cellieOf(s).has && !s.flags.living_seen && s.m >= 2 && s.m <= 6 && next(s) < 0.5) {
    s.flags.living_seen = true;
    s.queue.push(clone(PROMPTS.get('living_with_it')!));
  }
  // The Pull is never a choice: you roll for it
  const skip = !!s.flags.skip_pull;
  delete s.flags.skip_pull;
  const forced = cellieOf(s).id === 'hooch' && (has(s, 'habit') || (!!s.char && charge(s.char.chargeId).pull.rule === 'possession'));
  if (!skip) {
    for (const def of pullDefs(s)) {
      if (s.pull[def.id]?.torn) continue;
      if (forced || next(s) < 0.5) s.queue.push(pullCard(s, def));
    }
  }
  showNext(s);
}

export function pullCard(s: Game, def: PullDef): Card {
  const t = s.pull[def.id].tallies;
  return {
    id: 'pull', kind: 'prompt', title: `The Pull: ${def.title}`, pullId: def.id,
    text: def.text,
    choices: [{
      id: 'roll', label: 'Roll your Pull', special: 'pullRoll',
      text: `Roll a d6: 1-${4 - t + (hasPriors(s) ? 1 : 0)} you give in; ${5 - t + (hasPriors(s) ? 1 : 0)}-6 you walk past and make a tally mark (${t}/3).${hasPriors(s) ? ' You have done this before, and it shows.' : ''} A Pull is never a choice.`
    }]
  };
}

function showNext(s: Game) {
  const card = s.queue.shift();
  if (!card) return enterHub(s);
  if (card.rule === 'property' && s.commissary <= 10) {
    card.choices = undefined;
    card.text += ' You are under the limit. Nothing happens.';
  }
  s.cur = { card, source: card.kind === 'count' ? 'count' : card.kind === 'yard' ? 'yard' : 'prompt' };
  s.phase = 'card';
}

function scenesFor(s: Game): number {
  if (s.mo.seg || s.mo.blank) return 0;
  if (s.mo.lockdown) return 1;
  return s.standing === 0 ? 2 : 1;
}

function enterHub(s: Game) {
  if (!s.mo.sceneInit) {
    s.mo.sceneInit = true;
    s.mo.scenesLeft = Math.max(0, scenesFor(s) - s.skipNext);
    s.skipNext = 0;
  }
  s.cur = null;
  s.phase = 'hub';
}

function unwanted(s: Game, c: Card): boolean {
  if (s.custody === 'minimum' && c.tag === 'politics') return true;
  if (c.id === 'put_in_work' && s.proven) return true;
  // an EFV is on the line only for someone who actually has one on the schedule
  if (c.id === 'the_visit' && !(s.efv.status === 'approved' && s.efv.next - s.m <= 1)) return true;
  if (c.needsTie && !activeTies(s).some((t) => c.needsTie!.includes(t.role))) return true;
  if (c.id === 'weight_pile' && s.flags.noWeights) return true;
  if (c.id === 'leverage' && s.support === 0) return true;
  if (s.mo.lockdown && c.tag !== 'life') return true;
  if (c.tag === 'special') return false; // Missions and Leverage are never discarded by Standing
  const poliLocked = s.custody === 'close' || has(s, 'affiliated');
  if ((s.proven || s.flags.act_tax2) && c.tag === 'test') return true;
  if (s.standing >= 5 && (c.tag === 'test' || (c.tag === 'politics' && !poliLocked))) return true;
  if (s.standing >= 3 && c.tag === 'test') return true;
  return false;
}

function drawYard(s: Game, exclude: string[] = []): Card {
  for (let tries = 0; tries < 80; tries++) {
    if (!s.yardDeck.length) {
      s.yardDeck = shuffle(s, s.yardDiscard);
      s.yardDiscard = [];
      if (!s.yardDeck.length) {
        s.yardDeck = shuffle(s, [...YARD.values()].filter((c) => !c.echo && c.tag !== 'special').map((c) => c.id));
      }
    }
    const id = s.yardDeck.shift()!;
    const c = YARD.get(id);
    if (!c) continue; // an old save or a stray id: never let it crash the draw
    if (exclude.includes(id) || unwanted(s, c)) {
      if (!c.echo) s.yardDiscard.push(id);
      continue;
    }
    return clone(c);
  }
  return clone(YARD.get('spread')!);
}

/** On loss of privileges, a card that happens on the yard or in the dayroom asks first whether you go out at all. */
function sheetCard(card: Card): Card {
  const what = card.fronts?.[0] ?? card.text;
  return {
    id: 'on_sheet', kind: 'prompt', title: `On the Sheet: ${card.title}`,
    text: `${what} It is happening on the yard, and you are on loss of privileges. Your photo is on the sheet in the bubble.`,
    choices: [
      { id: 'go', label: 'Go out anyway', text: 'Being out under sanction is a 658 (failing to comply with a sanction), a serious. Every officer has your photo: 2 blue dice. Then the card plays.', roll: { blue: 2, severity: 'major', ser: '658' } },
      { id: 'stay', label: 'Stay in', text: card.tag === 'politics' ? '-1 Standing. Your car needed you out there.' : '-1 Standing. To the yard, it looks like backing down.', effect: { standing: -1 } }
    ]
  };
}

function presentYard(s: Game, card: Card, sheetOk = false) {
  const act = actOf(s);
  s.actUsed[act] ??= {};
  if (!sheetOk && onSheet(s) && !s.mo.lockdown && (card.tag === 'politics' || card.tag === 'test') && !card.echo) {
    s.cur = { card: sheetCard(card), source: 'prompt', origin: card.id };
    s.phase = 'card';
    return;
  }
  let front: number | undefined;
  if (card.fronts?.length) {
    front = Math.floor(next(s) * card.fronts.length);
    card.text = card.fronts[front];
  }
  const cur: NonNullable<Game['cur']> = { card, source: 'yard', front };
  if (has(s, 'short_fuse') && card.tag === 'test' && !s.actUsed[act].test) {
    s.actUsed[act].test = true;
    cur.noLetGo = true;
  }
  if (card.tag === 'test') {
    if (s.flags.next_test_fight) {
      delete s.flags.next_test_fight;
      cur.onlyViolent = true;
    }
    if (s.flags.test_white) {
      delete s.flags.test_white;
      cur.extraWhite = 1;
    }
  }
  if (card.id === 'mission') {
    s.missionsDrawn += 1;
    if (s.missionsDrawn >= 3) {
      s.cur = {
        card: {
          id: 'involuntary_pc', kind: 'prompt', title: 'Involuntary Protective Custody',
          text: 'A third Mission lands while you are still on the yard. The choice is made for you: staff place you on protective custody. Your game ends, and your letters are read in the epilogue.',
          effect: { standingSet: 0, pc: true }
        },
        source: 'prompt'
      };
      s.phase = 'card';
      return;
    }
  }
  s.cur = cur;
  s.phase = 'card';
}

export function playScene(g: Game): Game {
  if (g.phase !== 'hub' || g.mo.scenesLeft <= 0) return g;
  const s = clone(g);
  s.lines = [];
  s.mo.scenesLeft--;
  if (s.mo.efvNow) {
    s.mo.efvNow = false;
    s.cur = { card: clone(PROMPTS.get('efv')!), source: 'prompt' };
    s.phase = 'card';
    return s;
  }
  if (s.hurt && !s.mo.medicalDone) {
    s.mo.medicalDone = true;
    s.cur = {
      card: {
        id: 'medical', kind: 'prompt', title: 'Medical',
        text: 'You spend your scene on a gurney in medical, staring at a ceiling tile with a water stain shaped like a state you have never been to. Nobody asks what happened. Nobody has to.'
      },
      source: 'prompt'
    };
    s.phase = 'card';
    return s;
  }
  if (s.standing >= 5 && !s.mo.lockdown) {
    const a = drawYard(s);
    const b = drawYard(s, [a.id]);
    s.yardDiscard.push(a.id, b.id);
    s.cur = {
      card: {
        id: 'pick', kind: 'prompt', title: 'Solid',
        text: 'Two things are on your mind this month. You get to pick which one finds you first.',
        choices: [a, b].map((c) => ({ id: `pick:${c.id}`, label: c.title, text: c.fronts?.[0] ?? c.text }))
      },
      source: 'prompt'
    };
    s.phase = 'card';
    return s;
  }
  presentYard(s, drawYard(s));
  return s;
}

/* ------------------------------------------------------------------ */
/* Moves                                                               */
/* ------------------------------------------------------------------ */

export interface MoveEntry {
  id: string;
  title: string;
  kind: 'line' | 'code' | 'anyone';
  card: Card;
}

/** Line Home and Code are one-time. The four Anyone moves return after use. The Pull is rolled, not chosen. */
export function availableMoves(s: Game): MoveEntry[] {
  if (!s.char) return [];
  const out: MoveEntry[] = [];
  const lh = outside(s.char.outsideId).lineHome;
  if (!s.usedMoves[lh.id]) out.push({ id: lh.id, title: lh.title, kind: 'line', card: lh });
  const code = codeMove(s.char.codeMoveId);
  if (!s.usedMoves[code.id]) out.push({ id: code.id, title: code.title, kind: 'code', card: code });
  for (const m of ANYONE_MOVES) out.push({ id: m.id, title: m.title, kind: 'anyone', card: m });
  return out;
}

export function playMove(g: Game, id: string): Game {
  if (g.phase !== 'hub') return g;
  const entry = availableMoves(g).find((m) => m.id === id);
  if (!entry) return g;
  const s = clone(g);
  s.lines = [];
  if (entry.kind !== 'anyone') s.usedMoves[id] = true;
  s.cur = { card: clone(entry.card), source: 'move' };
  s.phase = 'card';
  return s;
}

/* ------------------------------------------------------------------ */
/* Choices                                                             */
/* ------------------------------------------------------------------ */

/** `failings` = locks that come from your failings, which are the first to give way. */
function rawLock(s: Game, ch: Choice, failings: boolean): string | null {
  if (ch.requires && statMod(s, ch.requires.stat) < ch.requires.min)
    return `Needs ${ch.requires.stat} +${ch.requires.min}`;
  if (ch.forbidden && statMod(s, ch.forbidden.stat) <= ch.forbidden.max) return `Your ${ch.forbidden.stat} is too low`;
  if (ch.needs?.commissary && s.commissary < ch.needs.commissary) return `Needs ${ch.needs.commissary} commissary`;
  if (ch.needs?.support && s.support < ch.needs.support) return `Needs Support ${ch.needs.support}`;
  if (ch.tag === 'violent' && s.hurt) return "You're hurt";
  if (ch.phone && s.phoneUntil >= s.m) return 'Phone privileges restricted';
  // what the place has made ordinary closes some doors without anyone locking them
  const cardId = s.cur?.card.id;
  if (cardId === 'any_grievance' && ch.id === 'file' && routineLevel(s) >= 3) return "You don't file those anymore. What would be the point.";
  if (cardId === 'any_hand' && ch.id === 'help' && routineLevel(s) >= 4) return 'Not your business. Not anymore.';
  if (!failings) return null;
  if (s.cur?.onlyViolent && ch.tag !== 'violent' && s.cur.card.tag === 'test') return "You're looking for a fight";
  if (ch.tag === 'letGo' && s.cur?.noLetGo) return 'Short Fuse';
  if (ch.tag === 'lookAway' && has(s, 'soft_spot')) return 'Soft Spot';
  if (ch.tag === 'takeToCar' && has(s, 'trust_no_one')) return 'Trust No One';
  if (ch.tag === 'walkAway' && has(s, 'gambler')) return 'Gambler';
  if (ch.tag === 'fold' && has(s, 'pride') && !s.hurt) return 'Pride';
  const gv = grooveOf(s);
  const st = styleOf(ch);
  if (gv?.tier === 2 && st && st !== gv.style) return `Locked in: you ${VERB[gv.style]}`;
  return null;
}

/**
 * Why a choice is unavailable, or null. A card never locks every option: if your
 * failings and your injuries would leave you nothing, the failings give way first,
 * and then everything does.
 */
export function lockReason(s: Game, ch: Choice): string | null {
  const strict = rawLock(s, ch, true);
  if (!strict || !s.cur) return strict;
  const all = cardChoices(s.cur.card);
  if (all.some((c) => !rawLock(s, c, true))) return strict;
  const relaxed = rawLock(s, ch, false);
  if (all.some((c) => !rawLock(s, c, false))) return relaxed;
  return null;
}

const checkMod = (s: Game, stat?: Stat): number => {
  if (!stat) return 0;
  if (stat === 'heart' && has(s, 'burned_bridges')) return -2;
  return statMod(s, stat);
};
const checkTarget = (s: Game, c: NonNullable<Choice['check']>) =>
  c.target + (c.conspTarget ? Math.max(0, consp(s)) : 0);

export type Preview =
  | { kind: 'roll'; dice: Dice }
  | { kind: 'auto' }
  | { kind: 'threat'; pct: number; sure: boolean }
  | { kind: 'check'; pct: number }
  | null;

const threatNeed = (s: Game, mod = 0) => 4 - statMod(s, 'nerve') - mod - (s.flags.shank ? 1 : 0);

export function preview(s: Game, ch: Choice): Preview {
  if (ch.auto) return { kind: 'auto' };
  if (ch.roll) return { kind: 'roll', dice: computeDice(s, ch.roll) };
  if (ch.threat) {
    const sure = s.standing >= 3 || s.proven;
    return { kind: 'threat', sure, pct: sure ? 1 : clamp((7 - threatNeed(s, ch.threat.mod)) / 6, 0, 1) };
  }
  if (ch.check) {
    const need = checkTarget(s, ch.check) - checkMod(s, ch.check.stat);
    return { kind: 'check', pct: clamp((7 - need) / 6, 0, 1) };
  }
  return null;
}

function implicitOk(card: Card): Choice {
  return { id: 'ok', label: 'Continue', text: '', effect: card.effect };
}
export const cardChoices = (card: Card): Choice[] => (card.choices?.length ? card.choices : [implicitOk(card)]);

function condMet(s: Game, c: Cond): boolean {
  if (c.standingMin !== undefined && s.standing < c.standingMin) return false;
  if (c.standingMax !== undefined && s.standing > c.standingMax) return false;
  if (c.supportMax !== undefined && s.support > c.supportMax) return false;
  if (c.officer === 'decent' && s.mo.officer.mood !== 'decent') return false;
  if (c.front !== undefined && s.cur?.front !== c.front) return false;
  return true;
}
const effectOf = (s: Game, ch: Choice): Effect | undefined =>
  ch.cond ? (condMet(s, ch.cond) ? ch.cond.then : ch.cond.else) : ch.effect;

export function choose(g: Game, id: string): Game {
  if (g.phase !== 'card' || !g.cur) return g;
  const s = clone(g);
  s.lines = [];
  const cur = s.cur!;
  const card = cur.card;

  if (id.startsWith('pick:')) {
    const cid = id.slice(5);
    const at = s.yardDiscard.lastIndexOf(cid);
    if (at >= 0) s.yardDiscard.splice(at, 1);
    presentYard(s, clone(YARD.get(cid)!));
    return s;
  }

  const ch = cardChoices(card).find((c) => c.id === id);
  if (!ch || lockReason(s, ch)) return g;

  if (card.id === 'on_sheet' && cur.origin) {
    const orig = YARD.get(cur.origin)!;
    if (ch.id === 'go') {
      addBreak(s, `Out under sanction: ${orig.title}`, ch.roll!);
      presentYard(s, clone(orig), true);
      return s;
    }
    apply(s, ch.effect, ch);
    if (!orig.echo) s.yardDiscard.push(orig.id);
    finish(s, ch.label);
    return s;
  }

  delete s.flags.__repeat;
  if (cur.source !== 'threat') noteStyle(s, ch); // a threat's follow-up is the same choice, not a second one
  if (ch.id === 'ok' && !card.choices?.length) countAuto(s, card);
  if (ch.special === 'pullRoll') resolvePull(s, card.pullId!);
  else if (ch.special) strike(s, ch.special);
  else if (ch.threat) {
    if (!resolveThreat(s, card, ch)) return s; // waiting on a follow-up prompt
  } else applyChoice(s, card, ch);

  const repeat = !!s.flags.__repeat;
  delete s.flags.__repeat;
  if (repeat) s.queue.unshift(clone(YARD.get(card.id) ?? card));
  else {
    if (cur.source === 'yard' && !card.echo) s.yardDiscard.push(card.id);
    // only Yard cards go back to the Yard discard (a threat can also start from a move or an event)
    const origin = cur.source === 'threat' && cur.origin ? YARD.get(cur.origin) : undefined;
    if (origin && !origin.echo) s.yardDiscard.push(origin.id);
  }
  finish(s, ch.label);
  return s;
}

function finish(s: Game, title: string) {
  s.result = { title, lines: s.lines.slice() };
  s.phase = s.ending ? 'over' : 'result';
}

function applyChoice(s: Game, card: Card, ch: Choice) {
  apply(s, effectOf(s, ch), ch);
  if (ch.sideRoll) {
    let six = false;
    for (let i = 0; i < ch.sideRoll.white; i++) if (d(s, 6) === 6) six = true;
    if (six) {
      L(s, 'Someone saw.');
      apply(s, ch.sideRoll.on6, ch);
    } else L(s, 'Nobody seemed to notice. This time.');
  }
  if (ch.check) {
    const c = ch.check;
    const mod = checkMod(s, c.stat);
    const target = checkTarget(s, c);
    const r = d(s, 6);
    const ok = r + mod >= target;
    L(s, `Rolled ${r}${mod ? (mod > 0 ? ` +${mod}` : ` ${mod}`) : ''} against ${target}: ${ok ? 'it works.' : 'it does not.'}`);
    apply(s, ok ? c.pass : c.fail, ch);
  }
  if (ch.auto) addBreak(s, `${card.title}: ${ch.label}`, { ser: ch.roll?.ser ?? '633' }, { forced: 'major' });
  else if (ch.roll) {
    addBreak(s, `${card.title}: ${ch.label}`, ch.roll, { onClean: ch.onClean, onCaught: ch.onCaught, hustle: ch.hustle });
  }
  if (ch.hustle && card.id === 'any_hustle') {
    const tax = s.flags.act_tax2 ? 2 : s.flags.tax1 ? 1 : 0;
    if (tax) {
      s.commissary = Math.max(0, s.commissary - tax);
      L(s, `Your car takes ${tax} store off the top.`);
    }
  }
  if (ch.tag === 'letGo') s.stats.letGo++;
  if (ch.tag === 'violent') {
    s.stats.fights++;
    s.mo.fought = true;
  }
}

/** @returns true when the choice is fully resolved, false when a follow-up prompt is waiting. */
function resolveThreat(s: Game, card: Card, ch: Choice): boolean {
  const t = ch.threat!;
  if (s.standing >= 3 || s.proven) {
    L(s, 'Your reputation speaks first. The threat works.');
    apply(s, t.success, ch);
    return true;
  }
  const r = d(s, 6);
  const need = threatNeed(s, t.mod);
  L(s, `Rolled ${r} + Nerve ${sign(statMod(s, 'nerve'))}${s.flags.shank ? ' +1 (the shank)' : ''}${t.mod ? ` ${sign(t.mod)}` : ''}. Needs ${4}.`);
  if (r + (4 - need) >= 4) {
    L(s, 'They back down.');
    apply(s, t.success, ch);
    return true;
  }
  L(s, 'They call it.');
  const followChoice: Choice = {
    id: 'follow', label: 'Follow through', tag: 'violent', hustle: ch.hustle,
    text: 'Play it as a fight. If you are caught, it is a major.',
    roll: t.follow.roll, auto: t.follow.auto, effect: t.follow.effect
  };
  const foldChoice: Choice = {
    id: 'fold', label: 'Fold', tag: 'fold',
    text: 'Lose face. Backing down from your own threat costs more than never making it.', effect: t.fold
  };
  if (has(s, 'pride') && !s.hurt) {
    L(s, 'Pride: you follow through.');
    applyChoice(s, card, followChoice);
    return true;
  }
  s.cur = {
    card: {
      id: 'threat', kind: 'prompt', title: 'They Call It',
      text: 'He did not back down. Everyone is watching what you do next.',
      choices: [followChoice, foldChoice]
    },
    source: 'threat',
    origin: s.cur?.source === 'threat' ? s.cur.origin : card.id
  };
  s.phase = 'card';
  return false;
}

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/* ------------------------------------------------------------------ */
/* The Pull: a d6, never a choice                                      */
/* ------------------------------------------------------------------ */

function resolvePull(s: Game, pullId: string) {
  const def = pullDefs(s).find((p) => p.id === pullId);
  const st = s.pull[pullId];
  if (!def || !st) return;
  const giveMax = 4 - st.tallies + (hasPriors(s) ? 1 : 0);
  const r = d(s, 6);
  if (r <= giveMax) {
    L(s, `Rolled ${r}: you give in.`);
    s.stats.pullGiven++;
    giveIn(s, def);
  } else {
    L(s, `Rolled ${r}: you walk past.`);
    st.tallies++;
    s.stats.pullWalked++;
    if (st.tallies >= 3) {
      st.torn = true;
      L(s, 'Three tallies. You tear it up. You have changed. The file will not notice.');
    } else L(s, `A tally mark on your private card (${st.tallies}/3). Walking past gets easier.`);
  }
}

function giveIn(s: Game, def: PullDef) {
  const t = `The Pull: ${def.title}`;
  switch (def.rule) {
    case 'burglary': {
      const state = d(s, 6) <= 3;
      L(s, state ? "Staff says it was the state's." : "Staff says it was another prisoner's.");
      addBreak(s, t, { blue: 1, white: 2, ser: '555' }, state
        ? { onClean: { commissary: 2, standing: 1 } }
        : { onClean: { commissary: 2, flag: 'thief' }, onCaught: { standing: -3, log: 'Jailhouse thief.' } });
      break;
    }
    case 'retail':
      addBreak(s, t, { blue: 1, white: 2, gen: '354', ser: '741' }, { onClean: { commissary: 2 } });
      break;
    case 'identity':
      apply(s, { commissary: 3 });
      addBreak(s, t, { gray: 1, severity: 'major', ser: '739' }, { onCaught: { echoes: ['payback'], log: 'The victim learns your name.' } });
      break;
    case 'delivery':
      apply(s, { commissary: 3, debt: 'whoever supplied it' });
      addBreak(s, t, { white: 2, gray: 1, ser: '665' });
      break;
    case 'possession':
      apply(s, { commissary: -2, flag: 'skip_pull' });
      s.flags.act_drug = true;
      addBreak(s, t, { blue: 1, ser: '667' });
      break;
    case 'vehicular':
      s.flags.act_drug = true;
      addBreak(s, t, { blue: 1, ser: '675' });
      break;
    case 'assault':
      s.mo.fought = true;
      s.stats.fights++;
      addBreak(s, t, { ...fightSpec(), ser: '633' });
      apply(s, { standing: 1, hurtCheck: 1, echoes: ['payback'] });
      break;
    case 'robbery': {
      apply(s, { commissary: 3, rumors: 1 });
      if (s.standing >= 3 || s.proven) L(s, 'Your reputation speaks first.');
      else {
        const r = d(s, 6);
        if (r + statMod(s, 'nerve') + (s.flags.shank ? 1 : 0) >= 4) L(s, 'He pays up.');
        else {
          L(s, 'He calls it. You follow through.');
          s.mo.fought = true;
          s.stats.fights++;
          addBreak(s, t, fightSpec(), {});
          apply(s, { standing: 1, hurtCheck: 1, echoes: ['payback'] });
        }
      }
      break;
    }
    case 'firearm':
      s.flags.shank = true;
      L(s, 'You take the shank and hide it. +1 on your Threats; if a search finds it, it is 602 Weapon, a Category A.');
      break;
    case 'eluding':
      addBreak(s, t, { blue: 1, discretionary: true, gen: '103', ser: '509' }, { onClean: { standing: 1 } });
      break;
    case 'nocontact':
      addBreak(s, t, { gray: 1, severity: 'major', ser: '718' }, { onCaught: { support: -1 } });
      break;
    case 'trafficking':
      apply(s, { commissary: -2 });
      s.flags.hot = s.m;
      addBreak(s, t, { white: 1, gen: '351', ser: '714' });
      break;
  }
}
const fightSpec = (): RollSpec => ({ blue: 1, white: 3, gray: 1, severity: 'major', ser: '505' });

/* ------------------------------------------------------------------ */
/* Count-card rules                                                    */
/* ------------------------------------------------------------------ */

function searchRoll(s: Game, title: string, base: { blue: number; search: boolean }) {
  s.mo.searched = true;
  const shank = !!s.flags.shank;
  const inside = ['667', '602', '882'];
  if (s.contraband > 0 && !s.flags.cell_package) {
    const code = inside[Math.floor(next(s) * inside.length)];
    L(s, `They find the package in your cell, and open it. Now you know what you were holding: ${violation(code).title.toLowerCase()}.`);
    addBreak(s, `${title}: the package`, { ser: code }, { forced: 'major' });
  } else if (s.flags.holding || shank) {
    const blue = base.blue + (s.flags.holding ? 2 : 0);
    s.flags.holding = false;
    L(s, 'You are holding. The search team is on your tier.');
    addBreak(s, title, shank ? { blue, search: base.search, severity: 'major', ser: '602' } : { blue, search: base.search, gen: '053' });
  } else L(s, 'You were clean.');
  // the cell tag: whatever is found in a cell belongs to everyone in it
  const ce = cellieOf(s);
  const cellHot = (ce.contraband && !s.flags.cellie_gone) || (s.contraband > 0 && s.flags.cell_package);
  if (cellHot) {
    const r = d(s, 6);
    if (r >= ce.owns && ce.has) L(s, `${ce.name} owns his own. Nothing sticks to you.`);
    else {
      L(s, `${ce.has ? ce.name : 'Your cellie'} does not claim it. The cell tag lands on you.`);
      const code = s.contraband > 0 && s.flags.cell_package ? inside[Math.floor(next(s) * inside.length)] : ce.code ?? '053';
      const serious = violation(code).cat !== 'general';
      addBreak(s, `${title}: cell tag`, { blue: base.blue, search: base.search, severity: ce.id === 'shank' ? 'major' : 'rolled', gen: '053', ser: serious ? code : undefined });
    }
  }
}

function countAuto(s: Game, card: Card) {
  switch (card.rule) {
    case 'memo':
      addBreak(s, card.title, { blue: 1, discretionary: true, gen: '210', ser: '509' });
      break;
    case 'search':
      searchRoll(s, 'Random Search', { blue: 1, search: true });
      break;
    case 'shakedown':
      searchRoll(s, 'Shakedown', { blue: 2, search: false });
      break;
    case 'k9': {
      s.mo.searched = true;
      const dirty = cellieOf(s).drugs || s.flags.act_drug;
      if (dirty) {
        L(s, 'The dogs stop at your door.');
        addBreak(s, 'K-9 Sweep', { blue: 2, ser: '667' });
      } else L(s, 'The dogs walk past.');
      break;
    }
    case 'ua':
      if (d(s, 6) === 1) {
        L(s, 'Your name is called for urinalysis.');
        if (s.flags.act_drug) addBreak(s, 'Random UA: dirty', { ser: '675' }, { forced: 'major' });
        else if (d(s, 6) === 1) {
          L(s, 'You are clean, and you cannot go in the time they give you. Failing to produce counts as a dirty.');
          addBreak(s, 'Random UA: failed to produce', { ser: '676' }, { forced: 'major' });
        } else L(s, 'You are clean.');
      } else L(s, 'Your name is not called.');
      break;
    case 'dahl':
      s.mo.discBlue += 1;
      L(s, '+1 blue die on every discretionary rule this month.');
      break;
    case 'brandt':
      if (s.flags.grievance) {
        s.mo.blueMonth += 2;
        L(s, 'You filed a grievance. +2 blue dice this month.');
      } else L(s, 'He has nothing on you. Yet.');
      break;
    case 'reyes':
      s.mo.warn = true;
      L(s, 'The first minor this month becomes a warning.');
      break;
    case 'double':
      s.mo.blueMonth -= 1;
      L(s, '-1 blue die on every roll this month.');
      break;
    case 'price':
      apply(s, { commissary: -1, log: 'Everything costs 1 extra store this month.' });
      break;
    case 'tablet':
      s.mo.noMessages = true;
      L(s, 'No messages this month, in or out.');
      break;
    case 'backlog':
      s.mo.delayMessages = true;
      L(s, 'Every message this month is delayed.');
      break;
    case 'visits':
      s.mo.noVisits = true;
      L(s, 'No visits this month.');
      break;
    case 'validation':
      if (s.char && background(s.char.backgroundId).tattoo && d(s, 6) <= 2) {
        s.consBonus += 1;
        L(s, 'You are validated: +1 Conspicuity, member or not.');
      } else L(s, 'Your file passes. This time.');
      break;
    case 'offer':
      s.queue.unshift(clone(PROMPTS.get('debrief')!));
      break;
    case 'transfer':
      newCellie(s);
      break;
    case 'holiday':
      s.commissary += 1;
      s.mo.testWhite += 1;
      L(s, 'Commissary +1. Test cards add 1 white die this month.');
      break;
    case 'clear':
      if (s.flags.marked) addBreak(s, 'Count', { blue: 1, gen: '214', ser: '653' });
      break;
  }
}

function strike(s: Game, which: 'strikeHold' | 'strikeBreak') {
  const others = [0, 1, 2].map(() => next(s) < 0.35);
  const k = others.filter(Boolean).length;
  const brk = which === 'strikeBreak';
  L(s, k === 0 ? 'The other three held.' : `${k} of the other three broke.`);
  if (!brk) {
    if (k === 0) {
      L(s, 'Everyone held. The institution gives in.');
      addBoxes(s, 1);
    } else {
      const code = ['682', '652', '651'][Math.floor(next(s) * 3)];
      L(s, `The men who held get written up. Staff choose the charge: ${code}, ${violation(code).title.toLowerCase()}.`);
      addBreak(s, 'The strike', { ser: code }, { forced: 'major' });
    }
  } else if (k === 0) {
    L(s, 'You were the only one to break. Staff reward whoever ended it.');
    addBoxes(s, 2);
  } else if (k === 3) {
    L(s, 'Everyone broke. The strike collapses before it starts.');
  } else L(s, 'Several broke. There is no reward to split.');
}

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

const RUMOR_LABEL: Record<RumorTag, string> = {
  charge: 'charge', cooperation: 'cooperation', debt: 'debt', family: 'family', weak: 'weakness'
};

function addStanding(s: Game, n: number) {
  const before = s.standing;
  s.standing = clamp(s.standing + n, 0, 5);
  if (s.standing !== before) L(s, `Standing ${n > 0 ? '+' : ''}${s.standing - before} (now ${s.standing})`);
}

function addBoxes(s: Game, n: number) {
  if (s.flags.stopped) return;
  const before = s.boxes;
  s.boxes = clamp(s.boxes + n, 0, s.maxBoxes);
  if (s.boxes !== before) L(s, n > 0 ? `Good time: +${s.boxes - before} box` : `Good time: ${s.boxes - before} box`);
}

/* ------------------------------------------------------------------ */
/* The court: the grid, the deal, and the turns                        */
/* ------------------------------------------------------------------ */

/**
 * Take the deal or go to trial. The deal is the reduced sheet at the agreed number, and you tell what you know. Trial
 * is the top of the range on everything charged. Either way, the real months become turns: at least 12 served.
 */
/* Reception: DOC 310.150. Held at Close until classified; then the score places you. */

const FACILITY_FOR = { close: 'granite', medium: 'harlan', minimum: 'cedar' } as const;

/** Move into a facility at intake: its custody, its starting Standing, how its staff read your card. */
function place(s: Game, facilityId: string, custody: Game['custody']) {
  const f = facility(facilityId);
  s.facilityId = f.id;
  s.custody = custody;
  s.standing = f.startStanding;
  s.crsBase = facility(FACILITY_FOR[custody]).crs;
  if (s.char) s.char.conspBase = conspFacts(f.id, s.char.chargeId, s.char.backgroundId).total;
  if (custody === 'minimum') s.yardDeck = s.yardDeck.filter((id) => YARD.get(id)?.tag !== 'politics');
  if (custody === 'close' && !s.strings.some((x) => x.to === 'your car')) s.strings.push({ type: 'debt', to: 'your car' });
}

/**
 * Reception at Washington Corrections Center. The support interview records who is still there, the Initial Custody
 * Designation sets custody and the facility, and Washington ONE sets a risk level. The player chooses none of it.
 */
export function classify(g: Game): Game {
  if (g.phase !== 'sheet' || !g.char || !g.court || !CASES[g.char.chargeId]) return g;
  const s = clone(g);
  s.lines = [];
  const bg = background(s.char!.backgroundId);
  const sheet = CASES[s.char!.chargeId][s.court!.path];

  // family and community support (I.C.4): the county jail already cost you some of them
  const held = !!bg.case[1]?.bad;
  const lost: string[] = [];
  for (const t of s.ties) {
    if (t.minor || t.gone) continue;
    const p = (held ? TIE_LOSS.held : TIE_LOSS.home) / (t.weight >= 3 ? 2 : 1);
    if (next(s) < p) {
      t.gone = true;
      lost.push(t.who);
    }
  }
  for (const t of s.ties) if (t.minor && !t.gone && !tieActive(s, t)) lost.push(`${t.who}, who only comes with ${s.ties.find((x) => x.id === t.guardian)?.who ?? 'them'}`);
  syncSupport(s);
  const kept = activeTies(s).map((t) => t.who);

  // the Initial Custody Designation (II.C)
  const parts: { label: string; v: number }[] = [
    { label: 'Starting value (game: the policy does not publish one)', v: ICD_BASE },
    { label: `Crime category ${sheet.cat}: ${sheet.offense.toLowerCase()} (provisional)`, v: CATEGORY_POINTS[sheet.cat] }
  ];
  let violence = 0;
  if (bg.priorDoc && next(s) < ICD_ODDS.violentInfraction) violence += ICD_DEDUCT.violentInfraction;
  if (bg.priors && next(s) < ICD_ODDS.violentConviction) violence += ICD_DEDUCT.violentConviction;
  violence = Math.min(violence, ICD_DEDUCT.violenceMax);
  if (violence) parts.push({ label: 'History of violence: what is in your file from before', v: -violence });
  if (bg.age < 29) parts.push({ label: 'Under 29 at classification', v: -ICD_DEDUCT.under29 });
  const icd = Math.max(0, parts.reduce((a, x) => a + x.v, 0));
  const custody = icdBand(icd);
  const toErd = s.court!.months - s.court!.earnedMax;
  const mi3 = custody === 'minimum' && toErd > MI3_MONTHS;
  const facilityId = mi3 ? 'harlan' : FACILITY_FOR[custody];
  place(s, facilityId, custody);

  const risk = waOne({
    category: CHARGE_CATEGORY[s.char!.chargeId] ?? 'public_order', priors: bg.score, young: bg.age < 29,
    priorDoc: !!bg.priorDoc, habit: has(s, 'habit')
  }).level;

  s.intake = { icd, parts, custody, facilityId, mi3, risk, lost, kept, needs: {} };
  s.intake.needs = assessNeeds(s);
  s.phase = 'reception';
  return s;
}

/**
 * Washington ONE needs. Game mapping from what the game tracks; Education and Mental Health aren't tracked, so they
 * aren't scored. The items and weights of the real tool aren't public.
 */
export function assessNeeds(s: Game): Record<string, NeedLevel> {
  const lvl = (n: number): NeedLevel => (n >= 2 ? 'High' : n >= 1 ? 'Mod' : 'Low');
  const adults = activeTies(s).filter((t) => !t.minor && t.role !== 'stranger').length;
  const serious = s.infractions.filter((i) => i.serious && i.result !== 'not_guilty').length;
  const general = s.infractions.filter((i) => !i.serious && i.result !== 'not_guilty').length;
  const r: Record<string, NeedLevel> = {
    Residential: adults >= 2 ? 'Low' : adults === 1 ? 'Mod' : 'High',
    Education: null,
    Employment: s.job ? 'Low' : 'Mod',
    'Social Influences': lvl((has(s, 'affiliated') ? 2 : 0) + (s.strings.some((x) => x.type === 'debt') ? 1 : 0)),
    'Substance Abuse': s.treatment.done ? 'Mod' : has(s, 'habit') || s.treatment.need > 0 ? 'High' : 'Low',
    'Mental Health': null,
    Aggression: lvl(s.stats.fights + (has(s, 'short_fuse') ? 1 : 0)),
    'Attitudes & Behaviors': lvl(serious + (general >= 2 ? 1 : 0))
  };
  return Object.fromEntries(NEED_DOMAINS.map((d) => [d, r[d]]));
}

/** Every six real months until release: a new interview. The needs move; the risk level is frozen (norming period). */
function reassessMonth(s: Game) {
  if (!s.intake?.needs) return;
  const due = Math.floor((s.m - 1) * (s.perTurn || 1) / REASSESS_MONTHS);
  if (due <= Number(s.flags.waOneSeen ?? 0)) return;
  s.flags.waOneSeen = due;
  const before = s.intake.needs;
  const after = assessNeeds(s);
  const moved = NEED_DOMAINS.filter((d) => before[d] !== after[d]).map((d) => `${d} ${before[d]} to ${after[d]}`);
  s.intake.needs = after;
  L(s, `Washington ONE reassessment with your counselor. ${moved.length ? `Needs: ${moved.join(', ')}.` : 'Your needs come out the same.'} Your risk level stays ${s.intake.risk}: it is frozen while DOC is still norming the tool.`);
}

/* Looking for support: a pen pal listing, paid from your books. Strangers write, sometimes. */

export const listingActive = (s: Game) => Number(s.flags.listingUntil ?? 0) >= s.m;

export function postProfile(g: Game): Game {
  if (g.phase !== 'hub' || listingActive(g) || g.commissary < PEN_PAL.cost) return g;
  const s = clone(g);
  s.lines = [];
  s.commissary -= PEN_PAL.cost;
  s.flags.listingUntil = s.m + Math.max(1, Math.round(PEN_PAL.months / (s.perTurn || 1)));
  L(s, `You pay for a listing on a pen pal site: a photo from the dayroom wall, a hundred words about yourself, and your DOC number. Commissary -${PEN_PAL.cost}. It runs a year.`);
  return s;
}

function penPalMonth(s: Game) {
  if (!listingActive(s)) return;
  const have = s.ties.filter((t) => t.id.startsWith('pen_pal') && !t.gone).length;
  if (have >= PEN_PAL.max || next(s) >= PEN_PAL.odds) return;
  L(s, 'A stranger read your listing and wrote.');
  addTie(s, { id: 'pen_pal', who: 'your pen pal', to: 'my pen pal', role: 'stranger', weight: 1, visits: false, efv: false });
}

/** Assault findings that can be referred for a new felony. Not phones, not drugs (the designer's account). */
const ASSAULT_CODES = ['633', '502'];
/** Game odds of a referral: assaults are charged, but not always; more often with a weapon. */
export const REFERRAL_ODDS = { plain: 0.25, weapon: 0.5 };

/** Points for the new case: priors, plus every count on the judgment you are serving now. */
function insidePoints(s: Game) {
  return background(s.char!.backgroundId).score + (s.court?.counts ?? 1);
}

export function newCaseCard(s: Game): Card {
  const bad = background(s.char!.backgroundId).case.map((c) => c.bad);
  const pts = insidePoints(s);
  const weapon = !!s.flags.newCaseWeapon;
  const deal = insideSentence(pts, 'deal', bad, weapon);
  const trial = insideSentence(pts, 'trial', bad, weapon);
  return {
    id: 'new_case', kind: 'prompt', title: 'New Charges',
    text: `Legal mail. The county has charged you with ${trial.sheet.offense.toLowerCase()} (RCW ${trial.sheet.rcw}), level ${ROMAN[trial.sheet.level]}, a strike. ` +
      `Offender score ${pts}, every count you are serving now included: standard range ${fmtRange(trial.range)}. ` +
      (weapon ? 'Assault in the first degree is a serious violent offense: earned release is 10%, not a third. ' : '') +
      'Whatever you get starts the day this sentence ends (RCW 9.94A.589(2)(a)). You see the lawyer for twenty minutes on a video screen.',
    choices: [
      {
        id: 'deal', label: `Take the deal: ${fmtMonths(deal.months)}`,
        text: weapon ? 'They come down to assault in the second degree. Still a strike. You sign.' : 'An agreed number. Still a strike. You sign.',
        effect: { newCase: 'deal' }
      },
      { id: 'trial', label: `Go to trial: ${fmtMonths(trial.months)}`, text: 'Everything charged, at the top of the range.', effect: { newCase: 'trial' } }
    ]
  };
}

function newCaseStep(s: Game, path: 'deal' | 'trial') {
  const sen = insideSentence(insidePoints(s), path, background(s.char!.backgroundId).case.map((c) => c.bad), !!s.flags.newCaseWeapon);
  s.flags.newMonths = sen.months;
  s.flags.newCaseLevel = sen.sheet.level;
  if (path === 'trial') s.flags.newTrial = true;
  delete s.flags.newCaseAt;
  L(s, `${path === 'trial' ? 'Convicted at trial' : 'You plead'}: ${fmtMonths(sen.months)}, consecutive. Your release date is now the first day of the next sentence.`);
}

/** The facts of the arrest, rolled once at intake (game odds in FACTS), stored as flags fact_ran, fact_gun, fact_child. */
function rollFacts(s: Game) {
  if (!s.char) return;
  for (const f of Object.keys(FACTS) as Fact[])
    if (FACTS[f].charges.includes(s.char.chargeId) && next(s) < FACTS[f].odds) s.flags[`fact_${f}`] = true;
}

export function caseFacts(s: Game): Fact[] {
  return (Object.keys(FACTS) as Fact[]).filter((f) => s.flags[`fact_${f}`]);
}

export function setCourt(s: Game, path: Path, talk = false, offer: Offer = s.court?.offer ?? 'first') {
  if (!s.char) return;
  const bg = background(s.char.backgroundId);
  talk = path === 'deal' && talk && !!CASES[s.char.chargeId]?.info;
  const facts = caseFacts(s);
  const sen = sentenceFor(s.char.chargeId, bg.score, path, bg.case.map((c) => c.bad), { talk, offer, facts });
  const t = timeScale(sen);
  s.court = {
    path, offense: sen.sheet.offense, rcw: sen.sheet.rcw, level: sen.sheet.level, grid: sen.sheet.grid,
    counts: sen.sheet.counts + sen.extra.length, score: sen.score, range: sen.range, base: sen.base, enhs: sen.enhs, facts,
    enhMonths: sen.enhMonths, months: sen.months, earnedMax: sen.earnedMax, strike: sen.sheet.strike, talked: talk, offer
  };
  s.perTurn = t.perTurn;
  s.sentence = t.turns;
  s.baseBoxes = t.boxes;
  s.maxBoxes = t.boxes;
  s.boxes = 0;
}

/** Choose at intake, before the sentence begins. Talking is only on the table where there is someone to tell on. */
export function chooseCourt(g: Game, path: Path, talk = false): Game {
  if (g.phase !== 'sheet' || !g.char || !CASES[g.char.chargeId]) return g;
  const s = clone(g);
  setCourt(s, path, talk);
  return s;
}

/** Odds after turning down the first offer (game numbers): a third better, half the same, a sixth worse. */
export const OFFER_ODDS = { better: 1 / 3, same: 1 / 2 };

/** Turn down the first offer, once. The prosecutor doesn't want a trial either, usually. */
export function refuseOffer(g: Game): Game {
  if (g.phase !== 'sheet' || !g.char || !g.court || g.court.offer !== 'first') return g;
  const s = clone(g);
  const r = next(s);
  const offer: Offer = r < OFFER_ODDS.better ? 'better' : r < OFFER_ODDS.better + OFFER_ODDS.same ? 'same' : 'worse';
  setCourt(s, 'deal', g.court.talked, offer);
  return s;
}

/* Paperwork: a snitch jacket, if you talked. It may come out, or you may coast the sentence without it. */

/** Game odds that it ever comes out: a codefendant who lands inside and talks, or a paper trail someone pulls. */
export const EXPOSE_ODDS = { codefendant: 0.5, paper: 0.25, paperClose: 0.4 };

const EXPOSE_HOW = ['codefendant', 'transcripts', 'newspaper'] as const;

function scheduleExposure(s: Game) {
  if (!s.court?.talked || !s.char) return;
  const info = CASES[s.char.chargeId]?.info;
  const last = Math.max(3, releaseMonth(s) - 1);
  const at = () => 2 + Math.floor(next(s) * (last - 1));
  const hits: { m: number; how: string }[] = [];
  if (info === 'codefendant' && next(s) < EXPOSE_ODDS.codefendant) hits.push({ m: at(), how: 'codefendant' });
  if (next(s) < (s.custody === 'close' ? EXPOSE_ODDS.paperClose : EXPOSE_ODDS.paper))
    hits.push({ m: at(), how: next(s) < 0.5 ? 'transcripts' : 'newspaper' });
  hits.sort((a, b) => a.m - b.m);
  if (hits.length) {
    s.flags.exposeAt = hits[0].m;
    s.flags.exposeHow = EXPOSE_HOW.indexOf(hits[0].how as (typeof EXPOSE_HOW)[number]);
  }
}

function paperworkCard(s: Game): Card {
  const how = EXPOSE_HOW[Number(s.flags.exposeHow)];
  const text = how === 'codefendant'
    ? 'Your codefendant came in on the chain last week. Now the tier is saying you told. Two of the car come by your cell and ask to see your paperwork.'
    : how === 'transcripts'
      ? "Somebody's people pulled the transcripts from your case through public disclosure. Copies are going around the tier. Your name is on the pages where you talked."
      : "Someone on the tier has a printout of a newspaper story about your case. It says you cooperated. It's been passed hand to hand.";
  const choices: Choice[] = [];
  // only word of mouth leaves room to defend yourself; pages in hand don't
  if (how === 'codefendant')
    choices.push({ id: 'show', label: 'Show them your J&S', text: 'Your judgment and sentence lists your charges and nothing else. It may be enough. It may not.', effect: { paperwork: 'show' } });
  choices.push(
    { id: 'deny', label: 'Deny it', text: 'Say it is a lie and dare anyone to prove it.', effect: { paperwork: 'deny' } },
    { id: 'pc', label: 'Check in', text: 'Ask for protective custody before they come for you.', effect: { paperwork: 'pc' } }
  );
  return { id: 'paperwork', kind: 'prompt', title: 'Paperwork', text, choices };
}

function paperworkStep(s: Game, how: 'show' | 'deny' | 'pc') {
  s.flags.exposed = true;
  if (how === 'pc') {
    apply(s, { pc: true, coopRumors: 1 });
    return;
  }
  const close = s.custody === 'close'; // people hunt rats hardest in close custody
  if (how === 'show' && next(s) < (close ? 0.35 : 0.5)) {
    L(s, 'They read it twice and hand it back. For now, that is enough.');
    apply(s, { coopRumors: 1 });
    return;
  }
  L(s, how === 'show' ? 'They read it and hand it back. The J&S was never going to settle it.' : 'Nobody believes you. Nobody says so to your face.');
  apply(s, { coopRumors: 2, standing: close ? -2 : -1 });
  if (close) shuffleIn(s, 'payback');
}

/** The real calendar behind a turn: months, or weeks when the sentence is short enough that a turn is less. */
export function clock(s: Game, turn: number): string {
  const per = s.perTurn ?? 1;
  if (per < 0.95) return `week ${Math.max(1, Math.round((turn * per * 52) / 12))}`;
  return `month ${Math.max(1, Math.round(turn * per))}`;
}

/* ------------------------------------------------------------------ */
/* Treatment: the assessment always finds something                    */
/* ------------------------------------------------------------------ */

/** Groups to complete (game number). Two missed or refused, and you're terminated from the program (game number). */
export const TREATMENT_SESSIONS = 3;
export const TREATMENT_MISSES = 2;

function treatmentCard(s: Game): Card {
  const n = s.treatment.sessions - s.treatment.misses + 1;
  return {
    id: 'treatment', kind: 'prompt', title: 'Treatment',
    text: n === 1
      ? 'Substance use disorder group. Your assessment found a disorder that needs treatment; everyone\'s does. The counselor says the first step is admitting it. Finish the program or serve to your max date, good time or not.'
      : `Group, session ${n} of ${s.treatment.need}. The counselor goes around the circle. When it's your turn, they want to hear you say it.`,
    choices: [
      { id: 'comply', label: 'Say what they want to hear', text: 'You say the words. The counselor writes something down.', effect: { treatment: 'comply' } },
      { id: 'refuse', label: "Tell them you don't have a problem", text: 'You tell the truth as you see it. The counselor writes something down.', effect: { treatment: 'refuse' } }
    ]
  };
}

/** When group comes around: spread across the back half of the sentence, never in seg. */
function treatmentDue(s: Game): boolean {
  const t = s.treatment;
  if (!t || t.done || t.failed) return false;
  const start = Math.floor(releaseMonth(s) / 2);
  const left = releaseMonth(s) - s.m;
  const remaining = t.need - (t.sessions - t.misses);
  return s.m >= start && remaining > 0 && (left <= remaining * 2 || next(s) < 0.5);
}

function treatmentStep(s: Game, how: 'comply' | 'refuse') {
  const t = s.treatment;
  t.sessions += 1;
  if (how === 'comply') s.routine = (s.routine ?? 0) + 0.5; // you learn to say what the file wants
  else t.misses += 1;
  if (t.misses >= TREATMENT_MISSES) {
    t.failed = true;
    L(s, 'Terminated from treatment: non-compliance. You will serve to your max date. Your good time no longer counts.');
    syncBoxes(s);
    return;
  }
  if (t.sessions - t.misses >= t.need) {
    t.done = true;
    L(s, 'Treatment complete. A certificate goes in your file.');
  } else if (how === 'refuse') L(s, 'The counselor notes it: denial. One more and you are out of the program.');
}

/* ------------------------------------------------------------------ */
/* Routine: what the place makes ordinary                              */
/* ------------------------------------------------------------------ */

/** 0 to 4. Every month adds to it; a lockdown, confinement, seg, or loss of privileges adds more; contact slows it. */
/**
 * A DOC number is issued once and follows you back. New numbers are 4-series. Someone who has been down before keeps
 * theirs: an 8-series if they were first committed before those stopped being issued (around 2007-2008, so late 30s
 * and older now), otherwise a 3 or 4 series.
 */
function docNumberFor(s: Game, priorAge: number | null): string {
  const series = priorAge === null ? '4' : priorAge >= 37 ? '8' : next(s) < 0.5 ? '3' : '4';
  return series + String(Math.floor(next(s) * 100000)).padStart(5, '0');
}

export const routineLevel = (s: Game) => Math.min(4, Math.floor((s.routine ?? 0) / 4));

/** What the screens call you. The name goes first, then it shares space with the number, then it's gone. */
export function displayName(s: Game): string {
  if (!s.char) return '';
  const lvl = routineLevel(s);
  if (lvl >= 3) return s.char.docNumber;
  if (lvl === 2) return `${s.char.name}, ${s.char.docNumber}`;
  return s.char.name;
}

const ROUTINE_NOTES = [
  '',
  "You stopped hearing the noise at night. You can't say when.",
  'An officer calls your number, and you answer before you think.',
  'You think of yourself by the number now. Your name feels like something you used to own.',
  'You are standing at your door for count before anyone calls it.'
];

function countCard(s: Game): Card {
  const n = s.char?.docNumber ?? '';
  const lvl = routineLevel(s);
  const text = lvl >= 4
    ? 'Count. You were standing before they called it. Chow. Count. Nothing happens this month that you will remember.'
    : lvl === 3
      ? `Count. "${n}." "Here." Chow. Count. Yard. Count. The day folds into the shape it always has.`
      : `Count. Stand by your bunk. "${n}." "Here." Then it's over, until the next one.`;
  return { id: 'routine_count', kind: 'prompt', title: 'Count', text };
}

/** At the end of each month, the place takes a little more. Time with people outside gives some of it back. */
function accrueRoutine(s: Game, sentReal: boolean) {
  let r = 1;
  if (s.mo.lockdown || s.mo.confined || s.mo.seg) r += 1;
  if (onSheet(s)) r += 0.25;
  if (s.visitMonths.includes(s.m)) r -= 0.5; // contact slows it; nothing stops it
  if (sentReal) r -= 0.25;
  s.routine = Math.max(0, (s.routine ?? 0) + r);
}

/* ------------------------------------------------------------------ */
/* Ties: Support is the people outside, one by one                     */
/* ------------------------------------------------------------------ */

/** Months a new visitor waits on the visitor application. */
const VISIT_APPROVAL_MONTHS = 2;
const cap = (x: string) => x[0].toUpperCase() + x.slice(1);
const guardianOf = (s: Game, t: Tie) => (t.guardian ? s.ties.find((x) => x.id === t.guardian) : undefined);

/** A person counts while they are in your life. A child counts only while the adult who brings them does. */
export function tieActive(s: Game, t: Tie): boolean {
  if (t.gone || t.weight <= 0) return false;
  if (t.minor && t.guardian) {
    const g = guardianOf(s, t);
    return !!g && !g.gone && g.weight > 0;
  }
  return true;
}
export const activeTies = (s: Game) => (s.ties ?? []).filter((t) => tieActive(s, t));

export function syncSupport(s: Game) {
  s.support = clamp(activeTies(s).reduce((a, t) => a + t.weight, 0), 0, 3);
}

/** Who a message is addressed to: the first adult still in your life. */
export function primaryTie(s: Game): Tie | undefined {
  const a = activeTies(s);
  return a.find((t) => !t.minor) ?? a[0];
}

/** Who could come to the visiting room this month. A child comes only with the adult who brings them. */
export function visitingTies(s: Game): Tie[] {
  return activeTies(s).filter((t) => {
    if (!t.visits || s.m < t.ready) return false;
    if (!t.minor) return true;
    const g = guardianOf(s, t);
    return !!g && g.visits && s.m >= g.ready;
  });
}

function logSupport(s: Game, before: number) {
  if (s.support !== before) L(s, `Support ${sign(s.support - before)} (now ${s.support})`);
}

function tieOps(s: Game, ops: TieOp[]) {
  const before = s.support;
  for (const op of ops) {
    const t = s.ties.find((x) => x.id === op.id && !x.gone);
    if (!t || !tieActive(s, t)) continue;
    const dependents = s.ties.filter((x) => x.guardian === t.id && tieActive(s, x));
    if (op.gone) t.gone = true;
    if (op.delta) {
      t.weight = Math.max(0, t.weight + op.delta);
      if (t.weight === 0) t.gone = true;
    }
    if (op.why) L(s, op.why);
    else if (t.gone) L(s, `${cap(t.who)} is gone.`);
    if (t.gone) for (const dep of dependents) L(s, `${cap(dep.who)} cannot visit without ${t.who}. Messages to a minor need a parent's approval.`);
  }
  syncSupport(s);
  logSupport(s, before);
}

function addTie(s: Game, def: TieDef & { wait?: number; ifNone?: boolean }) {
  if (def.ifNone && activeTies(s).length) return;
  const before = s.support;
  const wait = def.wait ?? VISIT_APPROVAL_MONTHS;
  const { wait: _w, ifNone: _n, ...rest } = def;
  s.ties.push({ ...rest, id: s.ties.some((t) => t.id === def.id) ? `${def.id}_${s.m}` : def.id, gone: false, ready: s.m + wait });
  L(s, `${cap(def.who)} is in touch.`);
  if (def.visits && wait > 0) L(s, 'Visits wait on an approved visitor application, and that takes time. Messages and money come first.');
  if (!def.visits) L(s, 'Messages only: no visits.');
  syncSupport(s);
  logSupport(s, before);
}

/** A change to Support that names no one lands on the person closest to you. */
function addSupport(s: Game, n: number) {
  if (!n) return;
  const p = primaryTie(s);
  if (n > 0) {
    if (!p) {
      addTie(s, { id: 'someone', who: 'someone from before', to: 'you', role: 'friend', weight: n, visits: true, efv: false });
      return;
    }
    const before = s.support;
    p.weight += n;
    syncSupport(s);
    logSupport(s, before);
  } else if (p) tieOps(s, [{ id: p.id, delta: n }]);
}

function flipPrivate(s: Game, extra = 0) {
  if (s.privateFlipped) return;
  s.privateFlipped = true;
  L(s, 'Your private card turns face up. The yard knows.');
  addStanding(s, -2 - extra - (has(s, 'liar') ? 2 : 0));
}

function pin(s: Game, tag: RumorTag) {
  s.rumors.push({ tag });
  L(s, `A ${RUMOR_LABEL[tag]} rumor is pinned to you.`);
  if (s.flags.thief && !s.flags.thief_paid) {
    s.flags.thief_paid = true;
    addStanding(s, -3);
    L(s, 'A rumor about the theft: jailhouse thief.');
  }
  if (s.privateFlipped || !s.char) return;
  const need = has(s, 'something_to_hide') ? 2 : 3;
  if (s.rumors.filter((r) => r.tag === s.char!.privateTag).length >= need) flipPrivate(s);
}

function hurtCheck(s: Game, threshold: number) {
  if (d(s, 6) > threshold) return;
  if (!s.hurt) {
    s.hurt = true;
    L(s, "You're hurt. Next scene: medical. You can't fight until the next mail call.");
    return;
  }
  if (d(s, 6) === 1) {
    s.ending = 'died';
    L(s, 'You do not get up.');
  } else {
    s.ending = 'medical';
    L(s, 'You are carried out and transferred on a medical.');
  }
}

function newCellie(s: Game) {
  const next1 = pickN(s, CELLIES.filter((c) => c.id !== s.cellieId), 1)[0];
  s.cellieId = next1.id;
  delete s.flags.living_seen;
  delete s.flags.cellie_gone;
  L(s, `You have a new cellie: ${next1.front}`);
  L(s, 'He asks to see your J&S before you put your property down. It lists your charges and nothing else.');
  apply(s, next1.setup);
}

function addSentence(s: Game, n: number) {
  if (n > 0) {
    const allowed = Math.min(n, MAX_ADDED - s.added);
    if (allowed <= 0) return L(s, 'The ceiling on added time holds: your calendar stops growing.');
    s.sentence += allowed;
    s.added += allowed;
    L(s, `Your sentence grows by ${allowed} month${allowed > 1 ? 's' : ''}.`);
  } else if (n < 0) {
    s.sentence = Math.max(1, s.sentence + n);
    L(s, `Your sentence shrinks by ${-n} month${-n > 1 ? 's' : ''}.`);
  }
}

function apply(s: Game, e: Effect | undefined, ch?: Choice) {
  if (!e) return;
  if (e.standingSet !== undefined) {
    s.standing = e.standingSet;
    L(s, `Standing is now ${s.standing}.`);
  }
  if (e.standing) addStanding(s, e.standing);
  if (e.commissary) {
    let c = e.commissary;
    if (c > 0 && ch?.hustle && statMod(s, 'hustle') >= 1) c += 1;
    const before = s.commissary;
    s.commissary = Math.max(0, s.commissary + c);
    if (s.commissary !== before) L(s, `Commissary ${s.commissary - before > 0 ? '+' : ''}${s.commissary - before}`);
  }
  if (e.commissaryCap !== undefined && s.commissary > e.commissaryCap) {
    L(s, `Commissary -${s.commissary - e.commissaryCap}`);
    s.commissary = e.commissaryCap;
  }
  if (e.commissarySupport) {
    const lose = Math.min(s.commissary, s.support);
    s.commissary -= lose;
    L(s, `They take ${lose} store.`);
  }
  for (let i = 0; i < (e.rumors ?? 0); i++) pin(s, 'weak');
  for (let i = 0; i < (e.coopRumors ?? 0); i++) pin(s, 'cooperation');
  if (e.removeRumors) {
    const n = e.removeRumors === 'all' ? s.rumors.length : Math.min(e.removeRumors, s.rumors.length);
    s.rumors.splice(0, n);
    if (n) L(s, n === 1 ? 'A rumor comes down.' : `${n} rumors come down.`);
  }
  if (e.boxes) addBoxes(s, e.boxes);
  for (const id of e.echoes ?? []) shuffleIn(s, id);
  if (e.mission) {
    for (let i = 0; i < e.mission; i++) shuffleIn(s, 'mission');
    L(s, e.mission > 1 ? 'More Missions are shuffled into the deck.' : 'A Mission is shuffled into the deck, with your name on it.');
  }
  if (e.proven) {
    s.proven = true;
    s.consBonus += 1;
    L(s, 'You are Proven. Staff validate you as a gang member: +1 Conspicuity.');
  }
  if (e.debt) {
    s.strings.push({ type: 'debt', to: e.debt });
    L(s, `You owe ${e.debt}. They will call it in.`);
  }
  if (e.leverage) {
    s.strings.push({ type: 'leverage', to: 'them' });
    L(s, 'A leverage string goes up on the board.');
  }
  if (e.hurtCheck) hurtCheck(s, e.hurtCheck);
  if (e.contraband) {
    s.contraband += e.contraband;
    L(s, 'There is a package in your cell.');
  }
  if (e.cellContraband) {
    s.flags.cell_package = true;
    L(s, "It's on your cellie's side. Cell tag rules.");
  }
  if (e.extraLine) {
    s.extraLines += 1;
    L(s, 'You may write an extra line home.');
  }
  if (e.blueNext) s.blueNext += e.blueNext;
  if (e.blueOnce) {
    s.blueOnce += e.blueOnce;
    L(s, '+1 blue die on your next roll.');
  }
  if (e.blueMonth) {
    s.mo.blueMonth += e.blueMonth;
    L(s, `+${e.blueMonth} blue dice on everything this month.`);
  }
  if (e.noBlue) {
    s.mo.noBlue = true;
    L(s, 'No blue dice this month.');
  }
  if (e.statDelta) {
    for (const k of STATS) {
      const dlt = e.statDelta[k];
      if (!dlt) continue;
      const before = s.char!.stats[k].mod;
      s.char!.stats[k].mod = clamp(before + dlt, -2, 2);
      if (s.char!.stats[k].mod !== before)
        L(s, `${k[0].toUpperCase() + k.slice(1)} ${dlt > 0 ? '+' : ''}${s.char!.stats[k].mod - before}`);
    }
  }
  if (e.support) addSupport(s, e.support);
  if (e.ties) tieOps(s, e.ties);
  if (e.newTie) addTie(s, e.newTie);
  if (e.supportSet !== undefined) {
    if (e.supportSet === 0) tieOps(s, activeTies(s).map((t) => ({ id: t.id, gone: true })));
    else if (s.support < e.supportSet) addSupport(s, e.supportSet - s.support);
  }
  if (e.skipScene) {
    for (let i = 0; i < e.skipScene; i++) {
      if (s.mo.scenesLeft > 0) s.mo.scenesLeft--;
      else s.skipNext++;
    }
    L(s, e.skipScene > 1 ? 'You lose your next scenes.' : 'You lose your next scene.');
  }
  if (e.sentence) addSentence(s, e.sentence);
  if (e.defer) s.deferred.push({ unit: e.defer.unit, left: e.defer.in, chance: e.defer.chance, effect: e.defer.effect });
  if (e.monthly) s.monthly.push(e.monthly);
  if (e.cellieCut) {
    const ce = cellieOf(s);
    L(s, `You take a cut from ${ce.name}. If it's found, you take the tag.`);
    apply(s, ce.cut);
  }
  if (e.newCellie) newCellie(s);
  if (e.marksCheck && d(s, 6) <= 3) {
    s.flags.marked = true;
    L(s, 'Your face shows the fight. You lay low: you skip your next scene.');
    apply(s, { skipScene: 1 });
  }
  if (e.markHit) {
    s.marks += 1;
    L(s, `A clean hit. Mark ${s.marks}/3.`);
    if (s.marks >= 3) {
      s.yardDeck = s.yardDeck.filter((id) => id !== 'mission');
      s.missionsDrawn = 0;
      s.marks = 0;
      L(s, 'They decide you are not worth it. Every Mission with your name on it is removed.');
    }
  }
  if (e.visitBan === 'month') s.visitBanMonth = s.m + 1;
  if (e.visitBan === 'act') s.visitBanAct = actOf(s);
  if (e.flipPrivate && s.char && e.flipPrivate.includes(s.char.privateTag)) flipPrivate(s);
  else if (e.flipPrivate) L(s, 'Nothing on your private card matches.');
  if (e.pc) {
    s.ending = 'pc';
    L(s, 'You leave the yard for protective custody.');
  }
  if (e.repeat) s.flags.__repeat = true;
  if (e.treatment) treatmentStep(s, e.treatment);
  if (e.paperwork) paperworkStep(s, e.paperwork);
  if (e.newCase) newCaseStep(s, e.newCase);
  if (e.flag) {
    s.flags[e.flag] = true;
    if (e.flag === 'fresh_ink') s.flags.inked = true; // healed or not, the ink stays
    if (e.flag === 'used_phone') s.flags.used_phone = s.m;
    if (e.flag === 'efv_used') delete s.flags.promise_efv;
  }
  if (e.informed) s.stats.informed += 1;
  if (e.putInWork) s.stats.putInWork += 1;
  if (e.job) {
    s.job = true;
    L(s, 'You have a job. It pays a little each month.');
  }
  if (e.lockdown) {
    s.mo.lockdown = true;
    L(s, 'Lockdown: one scene, in your cell.');
  }
  if (e.segSafety && next(s) < e.segSafety) placeSeg(s, 'for your own safety. The paperwork says you are not in trouble', false);
  if (e.log) L(s, e.log);
}

/* ------------------------------------------------------------------ */
/* Result -> next                                                      */
/* ------------------------------------------------------------------ */

export function continueResult(g: Game): Game {
  if (g.phase !== 'result') return g;
  const s = clone(g);
  s.result = null;
  s.lines = [];
  if (s.queue.length) showNext(s);
  else enterHub(s);
  return s;
}

/* ------------------------------------------------------------------ */
/* Hub actions                                                         */
/* ------------------------------------------------------------------ */

export function denyRumor(g: Game): Game {
  if (g.phase !== 'hub' || !g.rumors.length || g.standing < 1) return g;
  const s = clone(g);
  s.lines = [];
  const i = Math.max(0, s.rumors.map((r) => r.tag).lastIndexOf(s.char!.privateTag));
  s.rumors.splice(i, 1);
  L(s, 'You publicly deny it. A rumor comes down.');
  addStanding(s, -1);
  return s;
}

export function confess(g: Game): Game {
  if (g.phase !== 'hub' || g.privateFlipped) return g;
  const s = clone(g);
  s.lines = [];
  s.privateFlipped = true;
  L(s, 'You turn your private card face up yourself.');
  addStanding(s, -1 - (has(s, 'liar') ? 2 : 0));
  if (s.char!.privateTag === 'family') {
    s.extraLines += 1;
    L(s, 'You may write an extra line home.');
  }
  return s;
}

export function payDebt(g: Game): Game {
  const i = g.strings.findIndex((x) => x.type === 'debt');
  if (g.phase !== 'hub' || i < 0 || g.commissary < 6) return g;
  const s = clone(g);
  s.lines = [];
  const [str] = s.strings.splice(i, 1);
  s.commissary -= 6;
  L(s, `You pay what you owe ${str.to}. Commissary -6.`);
  return s;
}

export function cutLeverage(g: Game): Game {
  const i = g.strings.findIndex((x) => x.type === 'leverage');
  if (g.phase !== 'hub' || i < 0) return g;
  const s = clone(g);
  s.lines = [];
  s.strings.splice(i, 1);
  s.commissary += 5;
  L(s, 'You cut the string. They pay. Commissary +5. They will remember it.');
  return s;
}

/** With Support 1+, spend a scene in the cell instead of on the yard. The yard notices who never comes out. */
export function stayIn(g: Game): Game {
  if (g.phase !== 'hub' || g.support < 1 || g.mo.scenesLeft <= 0) return g;
  const s = clone(g);
  s.lines = [];
  const act = actOf(s);
  s.actUsed[act] ??= {};
  const n = ((s.actUsed[act].stay as number) ?? 0) + 1;
  s.actUsed[act].stay = n;
  s.mo.scenesLeft--;
  L(s, 'You spend the scene in your cell, writing. No Yard card.');
  if (n >= 2) {
    L(s, 'The yard notices who never comes out.');
    addStanding(s, -1);
  }
  return s;
}

/** Support 0: nothing to lose. Once per act, lean on someone who has something to lose. */
export function leanOn(g: Game): Game {
  const act = actOf(g);
  if (g.phase !== 'hub' || g.support > 0 || g.actUsed[act]?.lean) return g;
  const s = clone(g);
  s.lines = [];
  s.actUsed[act] ??= {};
  s.actUsed[act].lean = true;
  L(s, 'You take a Leverage card and play it on a man with a visit coming. Whatever he pays, you collect.');
  apply(s, { commissary: 2, rumors: 1 });
  return s;
}

/** Support 0: once per act, take a fight or a cell tag for someone with something to lose. */
export function standIn(g: Game): Game {
  const act = actOf(g);
  if (g.phase !== 'hub' || g.support > 0 || g.actUsed[act]?.standin) return g;
  const s = clone(g);
  s.lines = [];
  s.actUsed[act] ??= {};
  s.actUsed[act].standin = true;
  L(s, 'You take the charge for a man with something to lose. He keeps his visits, and he owes you.');
  addBreak(s, 'Stand in', {}, { forced: 'major' });
  apply(s, { leverage: true });
  return s;
}

/** A one-way door: erase every box and serve the full sentence. Write-ups cost no good time from now on. */
export function stopCounting(g: Game): Game {
  if ((g.phase !== 'hub' && g.phase !== 'mail') || g.flags.stopped) return g;
  const s = clone(g);
  s.lines = [];
  s.flags.stopped = true;
  syncBoxes(s);
  L(s, 'You stop counting days. Every box is erased: you will serve your full sentence.');
  addStanding(s, 2);
  if (s.m >= s.sentence) s.ending = 'released';
  return s;
}

/* ------------------------------------------------------------------ */
/* Eyes, mail call                                                     */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Discipline: WAC 137-28, DOC 460.000, DOC 460.050                    */
/* ------------------------------------------------------------------ */

/** Loss of privileges: yard, gym, dayroom. C/Os keep a sheet with the photo of everyone on it. */
export const onSheet = (s: Game) => s.lopUntil >= s.m;
const monthsFor = (days: number) => Math.max(1, Math.ceil(days / 30));

/** One box is one turn of earned release, so it holds as many days as a turn does. */
export const daysPerBox = (s: Game) => Math.max(1, Math.round(30.4 * (s.perTurn ?? 1)));

/** Good time is lost in days, a box at a time, and lost for good: it lowers the boxes you can ever fill. */
export function syncBoxes(s: Game) {
  if (s.flags.stopped) {
    s.maxBoxes = 0;
    s.boxes = 0;
    return;
  }
  if (s.treatment?.failed) {
    s.maxBoxes = 0;
    s.boxes = 0;
    return;
  }
  s.maxBoxes = Math.max(0, s.baseBoxes - Math.floor(s.gctLost / daysPerBox(s)));
  s.boxes = Math.min(s.boxes, s.maxBoxes);
}

/** First, second, or third-and-after offense: general within 6 months, serious within 12. */
function offenseTier(s: Game, serious: boolean): 0 | 1 | 2 {
  const window = serious ? 12 : 6;
  const n = s.infractions.filter(
    (x) => x.serious === serious && (x.result === 'guilty' || x.result === 'reduced') && s.m - x.m < window
  ).length;
  return Math.min(2, n) as 0 | 1 | 2;
}

function generalInfraction(s: Game, code: string, source: string, discretionary = false) {
  const v = violation(code);
  if (s.mo.warn) {
    s.mo.warn = false;
    s.infractions.push({ m: s.m, code, source, serious: false, result: 'onsite', discretionary });
    L(s, `${source}: ${s.mo.officer.name} handles it on site. A Behavior Observation Entry goes in your file. No infraction report.`);
    return;
  }
  const tier = offenseTier(s, false);
  s.infractions.push({ m: s.m, code, source, serious: false, result: 'guilty', discretionary });
  L(s, `General infraction ${code}: ${v.title}. A sergeant hears it within five business days. Guilty.`);
  const parts = [`${GENERAL_SANCTIONS.privileges[tier]} days loss of privileges (yard, gym, dayroom)`];
  s.lopUntil = Math.max(s.lopUntil, s.m + 1);
  if (tier >= 1) parts.push(`${GENERAL_SANCTIONS.extraDuty[tier]} hours extra duty`);
  if (tier === 2) {
    parts.push(`${GENERAL_SANCTIONS.confinement[2]} days confinement to cell`);
    s.skipNext += 1;
  }
  L(s, `Sanction, offense ${tier + 1} in six months: ${parts.join(', ')}. A general never touches your good time or your visits.`);
  check657(s);
}

/** WAC 657: four general violations from separate incidents within 90 days is a serious. */
function check657(s: Game) {
  const since = typeof s.flags.last657 === 'number' ? s.flags.last657 : -1;
  const recent = s.infractions.filter(
    (x, i) => i > since && !x.serious && x.result === 'guilty' && s.m - x.m <= 2
  );
  if (recent.length < 4) return;
  s.flags.last657 = s.infractions.length - 1;
  s.hearings.push({ code: '657', source: 'Four general infractions in ninety days' });
  L(s, 'That is four general infractions inside ninety days. Four generals make a serious: 657. CAUGHT.');
}

/**
 * Administrative segregation (DOC 320.200): out of general population until staff decide where you belong. Reviews
 * at 2 business days, 14 days, and 30. Thirty days is the most, whatever the placement is called.
 */
function placeSeg(s: Game, why: string, discretionary: boolean) {
  if (s.segUntil > s.m) return;
  s.segUntil = s.m + 1;
  s.segPlacements.push({ m: s.m, why, discretionary });
  L(s, `A lieutenant places you on administrative segregation: ${why}. You are cuffed and walked off the unit. Reviews at two days, fourteen days, and thirty. Thirty days is the most anyone can hold you there.`);
}

function chargeSerious(s: Game, code: string, source: string, gen?: string) {
  if (SEG_CODES.includes(code)) placeSeg(s, code === '505' || code === '633' || code === '502' ? 'a fight' : 'a threat to the orderly operation of the facility', false);
  s.hearings.push({ code, source, gen });
  L(s, `Serious infraction ${code}: ${violation(code).title}. You are served the report. A hearing within five business days.`);
}

/** Charge a caught break: one 6 is written as the general, two or more as the serious. */
function writeUp(s: Game, b: { title: string; gen?: string; ser?: string }, serious: boolean) {
  const code = (serious ? b.ser ?? b.gen : b.gen ?? b.ser) ?? (serious ? '505' : '103');
  if (violation(code).cat === 'general') generalInfraction(s, code, b.title);
  else chargeSerious(s, code, b.title, b.gen);
}

/** What a serious finding costs. Ranges are DOC 460.050 Attachment 2; a guilty plea takes the low half. */
function seriousSanction(s: Game, h: Hearing, plea: 'guilty' | 'contest') {
  const v = violation(h.code);
  const cat = v.cat as Exclude<typeof v.cat, 'general'>;
  const tbl = SERIOUS_SANCTIONS[cat];
  const tier = offenseTier(s, true);
  const take = (n: number) => (plea === 'guilty' ? Math.round(n / 2) : n);
  const parts: string[] = [];
  const rec: Infraction = { m: s.m, code: h.code, source: h.source, serious: true, result: 'guilty', plea, days: 0 };

  if (!s.flags.stopped && s.maxBoxes === 0 && s.gctLost > 0) {
    s.flags.ppm = true;
    L(s, 'You have no good time left to lose. The hearing officer refers you for prosecution: Persistent Prison Misbehavior. A single act can bring both discipline and a criminal charge.');
  }
  if (ASSAULT_CODES.includes(h.code) && !s.flags.newCaseAt && !s.flags.newMonths) {
    const weapon = !!s.flags.shank || h.code === '502';
    if (next(s) < (weapon ? REFERRAL_ODDS.weapon : REFERRAL_ODDS.plain)) {
      s.flags.newCaseAt = s.m + 1;
      if (weapon) s.flags.newCaseWeapon = true;
      L(s, 'The finding is referred to the county prosecutor. The same act can bring discipline here and a new felony out there.');
    }
  }
  const days = h.code === '665' ? TRAFFICKING_GCT : take(tbl.gct[tier]);
  if (days > 0 && !s.flags.stopped) {
    const before = s.maxBoxes;
    s.gctLost += days;
    rec.days = days;
    syncBoxes(s);
    parts.push(`${days} days of good conduct time${h.code === '665' ? ' (mandatory)' : ''}${s.maxBoxes < before ? `: your good-time boxes drop to ${s.maxBoxes}, for good` : ''}`);
  } else if (days > 0) parts.push('no good time to take: you stopped counting');

  const priv = take(tbl.privileges[tier]);
  s.lopUntil = Math.max(s.lopUntil, s.m + monthsFor(priv));
  parts.push(`${priv} days loss of privileges`);
  if (cat === 'A' || cat.startsWith('B') || plea === 'contest') {
    s.confinedUntil = Math.max(s.confinedUntil, s.m + 1);
    parts.push(`${take(tbl.confinement[tier])} days confinement to cell`);
  }
  if (NO_WEIGHTS.includes(h.code) && !s.flags.noWeights) {
    s.flags.noWeights = true;
    parts.push('no weightlifting for two years (mandatory)');
  }
  if (h.code === '882') {
    s.phoneUntil = Math.max(s.phoneUntil, s.m + monthsFor(PHONE_LOSS[tier]));
    parts.push(`${PHONE_LOSS[tier]} days without phone privileges, except legal calls (mandatory)`);
  }
  if (h.code === '718') {
    s.commsUntil = Math.max(s.commsUntil, s.m + 1);
    parts.push('your messages restricted for 30 days');
  }
  s.classPoints += v.points;
  parts.push(`-${v.points} points off your custody score for ${v.cat === 'A' ? 24 : v.points === 15 ? 12 : 6} months`);
  s.mo.seriousGuilty = true;
  L(s, `Sanctions: ${parts.join('; ')}.`);

  if (facility(s.facilityId).efv || s.efv.status !== 'none') {
    const had = s.efv.status === 'applied' || s.efv.status === 'approved';
    s.efv.status = 'suspended';
    s.efv.until = s.m + 6;
    L(s, had
      ? 'Any serious ends your extended family visits: six months suspended, and then the application starts over from the beginning.'
      : 'Any serious keeps you out of the family visit program for six months.');
    if (had && s.flags.promise_efv) {
      delete s.flags.promise_efv;
      L(s, 'You promised you would make the visit.');
      addSupport(s, -2);
    }
  }
  s.infractions.push(rec);
  // DOC 300.380 V.A.2.b: 20 or more points deducted in a review period requires evaluation for demotion
  if (custodyDeducted(s) >= 20 && s.custody !== 'close' && !s.flags.frmtPending) {
    s.flags.frmtPending = true;
    L(s, 'Twenty points off your custody score inside one review period. A Facility Risk Management Team will review your custody.');
  }
  if (has(s, 'affiliated') && !s.flags.validated) {
    s.flags.validated = true;
    s.consBonus += 1;
    L(s, 'Staff validate you: +1 Conspicuity.');
  }
  if (cellieOf(s).id === 'oldhead' && !s.flags.oldhead_gone) {
    s.flags.oldhead_gone = true;
    addStanding(s, -3);
    L(s, 'The old head rolls you out for bringing heat.');
  }
}

/* ------------------------------------------------------------------ */
/* Custody: DOC 300.380                                                */
/* ------------------------------------------------------------------ */

/** How long a deduction stays on the score: Category A 24 months, 633/704 12, everything else 6. */
const deductionMonths = (code: string) => (violation(code).cat === 'A' ? 24 : violation(code).points === 15 ? 12 : 6);

/** The Custody Review Score: intake score, +1 programming point a month, minus deductions still in force. */
export function custodyScore(s: Game): number {
  const off = s.infractions
    .filter((x) => x.serious && x.result === 'guilty' && s.m - x.m < deductionMonths(x.code))
    .reduce((a, x) => a + violation(x.code).points, 0);
  return s.crsBase + s.progPoints - off;
}
export const scoreBand = (n: number) => (n >= 56 ? 'minimum' : n >= 40 ? 'medium' : 'close');

/** Points taken off the Custody Review Score by serious findings in the current six-month review period. */
export function custodyDeducted(s: Game): number {
  return s.infractions
    .filter((x) => x.serious && x.result === 'guilty' && s.m - x.m < 6)
    .reduce((a, x) => a + violation(x.code).points, 0);
}

type Move = { custody: Game['custody']; facility: string; label: string };
const DEMOTE: Record<string, Move> = {
  minimum: { custody: 'medium', facility: 'harlan', label: 'Medium' },
  medium: { custody: 'close', facility: 'granite', label: 'Close' }
};
const PROMOTE: Record<string, Move> = {
  close: { custody: 'medium', facility: 'harlan', label: 'Medium' },
  medium: { custody: 'minimum', facility: 'cedar', label: 'Minimum' }
};
const RANK = { close: 0, medium: 1, minimum: 2 };

function moveCustody(s: Game, to: Move) {
  const f = facility(to.facility);
  s.custody = to.custody;
  s.facilityId = to.facility;
  // earned release comes from the sentence, not the facility: the boxes travel with you
  syncBoxes(s);
  return f;
}

/** The FRMT meets. Custody drops one level at a time, unless the facility overrides the score and keeps you. */
function custodyReview(s: Game) {
  // Plan Change Review every six months. Intake custody is not promoted for the first six.
  if (!s.flags.frmtPending && s.m > 1 && (s.m - 1) % 6 === 0) {
    const score = custodyScore(s);
    const up = PROMOTE[s.custody];
    if (!up || RANK[scoreBand(score)] <= RANK[s.custody]) {
      L(s, `Plan Change Review: custody score ${score}. You stay at ${cap(s.custody)}.`);
      return;
    }
    if (next(s) < 0.25) {
      L(s, `Plan Change Review: custody score ${score}, enough to promote. The facility overrides it and keeps you at ${cap(s.custody)}.`);
      return;
    }
    const f = moveCustody(s, up);
    L(s, `Plan Change Review: custody score ${score}. Promoted one level, to ${up.label}. You transfer to ${f.name}.`);
    return;
  }
  if (!s.flags.frmtPending) return;
  delete s.flags.frmtPending;
  const to = DEMOTE[s.custody];
  if (!to) return;
  if (next(s) < 0.25) {
    L(s, `Custody review: the score says demote. The facility overrides it and keeps you at ${cap(s.custody)}. Nobody tells you why.`);
    return;
  }
  const f = moveCustody(s, to);
  L(s, `Custody review: demoted one level, to ${to.label}. You are on the chain bus to ${f.name}.`);
}

/**
 * Plead to the next serious infraction. A guilty plea usually gets a lighter sanction, and gives up the appeal of
 * the finding. Contesting almost never wins.
 */
export function plead(g: Game, how: 'guilty' | 'contest'): Game {
  if (g.phase !== 'eyes' || !g.hearings.length) return g;
  const s = clone(g);
  s.lines = [];
  const h = s.hearings.shift()!;
  const v = violation(h.code);
  L(s, `Disciplinary hearing: ${h.code}, ${v.title}. ${s.segUntil > s.m ? 'You are in segregation, so it comes within three business days. ' : ''}A lieutenant hears it, on the record. ${how === 'guilty' ? 'You plead guilty.' : 'You plead not guilty and ask for your witnesses.'}`);
  if (how === 'contest') {
    const r = next(s);
    if (r < 0.03) {
      L(s, 'Not guilty. It almost never happens. Nothing goes in your central file.');
      s.infractions.push({ m: s.m, code: h.code, source: h.source, serious: true, result: 'not_guilty', plea: how });
    } else if (r < 0.09 && h.gen) {
      L(s, `Guilty of a lesser violation: the hearing officer reduces it to a general, ${h.gen}.`);
      const before = s.infractions.length;
      generalInfraction(s, h.gen, h.source);
      if (s.infractions[before]) s.infractions[before].result = 'reduced';
    } else {
      L(s, "Guilty. The officer's report is the evidence, and the hearing officer believes it.");
      seriousSanction(s, h, how);
    }
  } else {
    L(s, 'Guilty, on your plea. The hearing officer takes the plea into account. You cannot appeal the finding now.');
    seriousSanction(s, h, how);
  }
  s.report = [...s.report, ...s.lines];
  return s;
}

/** Appeal a contested finding to the Superintendent. Sanctions are not stayed; the answer comes next month. */
export function appeal(g: Game, i: number): Game {
  const rec = g.infractions[i];
  if (g.phase !== 'eyes' || !rec || !rec.serious || rec.plea !== 'contest' || rec.result !== 'guilty' || rec.appeal || rec.m !== g.m) return g;
  const s = clone(g);
  s.infractions[i].appeal = 'pending';
  s.report = [...s.report, `You appeal ${rec.code} to the Superintendent. The sanctions are not stayed while you wait.`];
  return s;
}

function resolveAppeals(s: Game) {
  for (const rec of s.infractions) {
    if (rec.appeal !== 'pending') continue;
    if (next(s) < 0.05) {
      rec.appeal = 'granted';
      rec.result = 'not_guilty';
      s.gctLost = Math.max(0, s.gctLost - (rec.days ?? 0));
      syncBoxes(s);
      L(s, `The Superintendent reverses ${rec.code}. The good time comes back. The days you already served on sanction do not.`);
    } else {
      rec.appeal = 'denied';
      L(s, `Your appeal of ${rec.code} is denied. The Superintendent's decision is final.`);
    }
  }
}

export function rollEyes(g: Game): Game {
  if (g.phase !== 'hub' || g.mo.scenesLeft > 0) return g;
  const s = clone(g);
  s.lines = [];
  if (has(s, 'gambler') && next(s) < 1 / 3) {
    const r = d(s, 6);
    L(s, `A game runs. You sit in: ${r <= 3 ? 'you lose 3 commissary.' : 'you win 3 commissary.'}`);
    s.commissary = Math.max(0, s.commissary + (r <= 3 ? -3 : 3));
    s.mo.breaks.push({
      title: 'A card game', severity: 'major', forced: false, ser: '559',
      dice: { blueNo: 0, blue: 0, white: 3, gray: 0, rumor: 0, applies: false }
    });
  }
  L(s, s.mo.breaks.length ? 'Staff roll behind the screen. They say only "clean" or "caught."' : 'Nothing was done that staff could write up.');
  for (const b of s.mo.breaks) {
    const total = b.dice.blue + b.dice.white + b.dice.gray + b.dice.rumor;
    let sixes = 0;
    for (let i = 0; i < total; i++) if (d(s, 6) === 6) sixes++;
    const caught = !!b.forced || sixes > 0;
    s.ledger.push({
      m: s.m, title: b.title, blueNo: b.dice.blueNo, white: b.dice.white, gray: b.dice.gray,
      rumor: b.dice.rumor, applies: b.dice.applies, consp: consp(s), caught, forced: !!b.forced
    });
    if (!caught) {
      L(s, `${b.title}: clean.`);
      apply(s, b.onClean, b.hustle ? ({ hustle: true } as Choice) : undefined);
      continue;
    }
    const serious = b.forced ? b.forced === 'major' : b.severity === 'rolled' ? sixes >= 2 : b.severity === 'major';
    s.mo.caught = true;
    s.stats.caught++;
    L(s, `${b.title}: CAUGHT.`);
    writeUp(s, b, serious);
    apply(s, b.onCaught);
  }
  // kites: everyone passes one every month, so passing one proves nothing
  const kiteP = Math.min(0.3, 0.05 + 0.03 * s.rumors.length);
  if (next(s) < kiteP) {
    L(s, 'Someone passed a kite to the bubble. Staff are not saying what it said.');
    if (s.mo.breaks.length && !s.mo.caught) {
      s.mo.caught = true;
      s.stats.caught++;
      L(s, 'The kite named something you did. CAUGHT.');
      writeUp(s, s.mo.breaks[0], false);
    } else if (!s.mo.caught) pin(s, s.char!.privateTag);
  }
  // discretion: some officers can always find something, and they look harder at some men than others
  const o = s.mo.officer;
  const petty = (o.mood === 'cruel' ? 0.3 : o.name === 'Dahl' ? 0.25 : o.mood === 'decent' ? 0.02 : 0.08) + 0.05 * Math.max(0, consp(s)) + (hasPriors(s) ? 0.05 : 0);
  if (next(s) < petty) {
    const code = PETTY[Math.floor(next(s) * PETTY.length)];
    L(s, `${o.name} writes you up. CAUGHT. It is the officer's call, and the officer made it.`);
    generalInfraction(s, code, `${o.name}'s write-up`, true);
  }
  // discretion: the lieutenant on shift can place anyone the facility sees as a threat, pending investigation
  const watched = s.proven || !!s.flags.validated || s.rumors.length >= 3;
  if (watched && s.segUntil <= s.m && next(s) < 0.08 + 0.02 * Math.max(0, consp(s))) {
    placeSeg(s, s.rumors.length >= 3 ? 'pending investigation. Nobody says of what' : 'pending investigation into security threat group activity', true);
  }
  if (s.hearings.length) L(s, `${s.hearings.length === 1 ? 'A serious infraction goes' : `${s.hearings.length} serious infractions go`} to a hearing.`);
  s.report = s.lines.slice();
  s.phase = 'eyes';
  return s;
}

function collect(s: Game, to: string) {
  L(s, `${to[0].toUpperCase() + to.slice(1)} calls in what you owe.`);
  if (to === 'your car') shuffleIn(s, 'car_politics');
  else if (to === 'your shot caller') shuffleIn(s, 'put_in_work');
  else if (to === 'the store man') {
    if (s.commissary >= 5) {
      s.commissary -= 5;
      L(s, 'You pay 5 commissary.');
    } else {
      L(s, 'You cannot pay.');
      addStanding(s, -1);
      shuffleIn(s, 'store_collects');
    }
  } else {
    s.commissary = Math.max(0, s.commissary - 3);
    L(s, 'You pay 3 commissary.');
    pin(s, 'weak');
  }
}

export function letterSlots(s: Game): number {
  return 1 + s.extraLines + (statMod(s, 'heart') >= 1 ? 1 : 0);
}

export function visitsBanned(s: Game): boolean {
  return s.visitBanMonth === s.m || (!!s.visitBanAct && s.visitBanAct === actOf(s)) || s.mo.noVisits;
}

/* ------------------------------------------------------------------ */
/* Extended family visits: DOC 590.100                                 */
/* ------------------------------------------------------------------ */

const efvFamily = (s: Game) => visitingTies(s).filter((t) => t.efv);

/** Why you cannot apply for an extended family visit right now, or null if you can. */
export function efvBlock(s: Game): string | null {
  const e = s.efv;
  const f = facility(s.facilityId);
  if (!f.efv) return `No extended family visits at ${f.name}.`;
  if (e.status === 'suspended') return `Suspended after a serious violation, through month ${e.until - 1}. Then you apply again.`;
  if (e.status === 'applied') return 'Application pending. It can take two to six months.';
  if (e.status === 'approved') return e.next > s.m ? `Approved. Scheduled by availability, around month ${e.next}.` : 'Approved.';
  if (!efvFamily(s).length) return 'No immediate family who can come is on your visiting list.';
  const recent = s.visitMonths.filter((m) => s.m - m < 12).length;
  if (recent < 6) return `You need an established visit history: six visits in the last twelve months. You have ${recent}.`;
  return null;
}

export function applyEfv(g: Game): Game {
  if (g.phase !== 'hub' || efvBlock(g)) return g;
  const s = clone(g);
  s.lines = [];
  const fam = efvFamily(s)[0];
  s.efv.status = 'applied';
  s.efv.decide = s.m + 2 + Math.floor(next(s) * 5);
  L(s, `You ask ${fam.who} to apply. The forms go to the Headquarters EFV Unit: background checks, your case manager, Health Services, a Facility Risk Management Team, then the Superintendent. It can take two to six months.`);
  return s;
}

/** At the turn of a month: decisions arrive, visits get scheduled. Returns true when a visit happens this month. */
function efvMonth(s: Game): boolean {
  const e = s.efv;
  if (e.status === 'suspended' && s.m >= e.until) {
    e.status = 'none';
    L(s, 'The six-month suspension from extended family visits is over. You can apply again, from the beginning.');
  }
  if (e.status === 'applied' && s.m >= e.decide) {
    if (efvFamily(s).length) {
      e.status = 'approved';
      e.next = s.m + 1 + Math.floor(next(s) * 2);
      L(s, 'A letter from the Headquarters EFV Unit: approved. The facility schedules visits by availability.');
    } else {
      e.status = 'none';
      L(s, 'A letter from the Headquarters EFV Unit: denied. No eligible family member is left on the application.');
    }
  }
  if (e.status !== 'approved' || s.m < e.next) return false;
  if (!efvFamily(s).length || !facility(s.facilityId).efv) {
    e.status = 'none';
    L(s, 'No approved family member is left to come. The extended family visit is canceled.');
    return false;
  }
  e.done += 1;
  e.next = s.m + 1 + Math.floor(next(s) * 3); // no sooner than 30 days, and only as the units come free
  return true;
}

/* ------------------------------------------------------------------ */
/* The end of the month                                                */
/* ------------------------------------------------------------------ */

export function toMail(g: Game): Game {
  if (g.phase !== 'eyes' || g.hearings.length) return g;
  const s = clone(g);
  s.lines = [];
  if (!s.mo.seriousGuilty) s.progPoints += 1; // a month of earned time is a programming point
  if (s.mo.seriousGuilty) L(s, 'A serious finding this month: no good-time box, and no programming point.');
  else if (s.flags.stopped) L(s, 'A month done.');
  else if (s.boxes >= s.maxBoxes) L(s, s.maxBoxes ? 'Another month, but every box you can still fill is full.' : 'Another month. You have no good time left to earn.');
  else {
    s.boxes++;
    L(s, 'No serious violation this month: a good-time box is filled.');
  }

  const vt = visitingTies(s);
  if (vt.length && !visitsBanned(s)) {
    const lead = vt.find((t) => !t.minor) ?? vt[0];
    const kids = vt.filter((t) => t.minor && t.guardian === lead.id);
    if (next(s) < (lead.weight >= 2 ? 0.9 : 0.7)) {
      s.visitPending = true;
      s.visitMonths.push(s.m);
      s.visitRisk = visibleMarks(s);
      const who = `${lead.who}${kids.length ? ` brought ${kids.map((k) => k.who).join(' and ')}` : ' came'}`;
      if (s.mo.seg || s.segUntil > s.m) L(s, `Visiting day, from segregation: ${who}. A no-contact visit, one hour. You cannot touch them. In segregation that is all there is, once a week.`);
      else L(s, `Visiting day. An officer calls your name: ${who}.`);
    } else {
      L(s, 'Visiting day. You are dressed early and waiting in your cell. You ask the officer to call up front. "Nobody\'s shown up." Visiting hours end. Nobody calls your name.');
      // Staff never tell you a visitor was turned away. Sometimes they were, and you hear it from them.
      if (next(s) < 0.5) {
        s.deferred.push({ unit: 'month', left: 1, effect: { log: `A message from ${lead.who}: they drove all the way there, and were turned away at the front. Nobody inside told you.` } });
      }
    }
  } else if (vt.length) L(s, 'No visit this month.');
  else {
    const waiting = activeTies(s).filter((t) => t.visits && s.m < t.ready);
    if (waiting.length) L(s, `${cap(waiting[0].who)} is still waiting on visitor approval.`);
  }

  if (s.job) {
    s.commissary += 1;
    L(s, 'Your job pays 1 commissary.');
  }
  for (const m of s.monthly) {
    if (m.commissary) s.commissary = Math.max(0, s.commissary + m.commissary);
    if (m.standing) addStanding(s, m.standing);
    L(s, `${m.label}: ${[m.commissary ? `${sign(m.commissary)} store` : '', m.standing ? `${sign(m.standing)} Standing` : ''].filter(Boolean).join(', ')}.`);
  }
  for (const str of s.strings.slice()) {
    if (d(s, 6) !== 1) continue;
    if (str.type === 'debt') collect(s, str.to);
    else {
      L(s, 'They move first on the man you held leverage over.');
      shuffleIn(s, 'payback');
    }
  }
  if (typeof s.flags.hot === 'number' && s.flags.hot < s.m) {
    if (!s.mo.searched) {
      s.commissary += 4;
      L(s, 'The goods you flipped sold: +4 store.');
    } else L(s, 'A search turned up the goods you were holding. They are gone.');
    delete s.flags.hot;
  }
  if (has(s, 'loose_mouth') && d(s, 6) === 1) {
    L(s, 'You said too much to the wrong man.');
    pin(s, s.char!.privateTag);
  }
  deliverMessages(s);
  processDeferred(s, 'month');
  if (s.m >= s.sentence - s.boxes) s.ending = 'released';
  s.phase = 'mail';
  return s;
}

/**
 * What a strip search after a visit would find. Most institutions strip you out after every contact visit: fresh ink
 * or the marks of a fight nobody wrote up become an infraction the moment you take the visit.
 */
export function visibleMarks(s: Game): 'fight' | 'ink' | null {
  if (s.mo.seg || s.segUntil > s.m) return null; // a no-contact visit: no strip search
  // a fight you took part in that nobody wrote up (being attacked in front of officers is already known)
  const FIGHTS = ['505', '633', '502'];
  const fightCaught = s.infractions.some((x) => x.m === s.m && FIGHTS.includes(x.code));
  const hiddenFight = s.mo.breaks.some((b) => !b.forced && FIGHTS.includes(b.ser ?? ''));
  if (hiddenFight && !fightCaught) return 'fight';
  if (s.flags.fresh_ink) return 'ink';
  return null;
}

/**
 * Staff read incoming messages. A question from family that seems harmless can tell them exactly where to look.
 * The consequence lands next month, and the write-up says where it came from.
 */
export function slipConsequence(s: Game, slip: SlipId, who: string) {
  const blank = { blueNo: 0, blue: 0, white: 0, gray: 0, rumor: 0, applies: false };
  if (slip === 'ink') {
    if (next(s) < 0.5) {
      s.pendingBreaks.push({ title: `Mail review: ${who} asked about a new tattoo`, dice: blank, severity: 'major', forced: 'major', ser: '710' });
    }
  } else if (slip === 'phone') {
    // they come looking: a search of your cell, with your name on it
    s.pendingBreaks.push({
      title: `Mail review: ${who} asked about a phone number`, dice: { ...blank, blueNo: 3, blue: 3, applies: true },
      severity: 'major', forced: false, ser: '882'
    });
  } else if (slip === 'efv') {
    if (s.efv.status === 'approved') {
      s.efv.status = 'applied';
      s.efv.decide = s.m + 2;
      s.efv.next = 0;
    }
  } else if (slip === 'money' && next(s) < 0.5) {
    s.pendingBreaks.push({
      title: `Mail review: ${who} mentioned sending money to someone`, dice: { ...blank, blueNo: 2, blue: 2 },
      severity: 'major', forced: false, ser: '714'
    });
  }
}

export function chooseVisit(g: Game, which: 'money' | 'steady' | 'stayHome'): Game {
  if (g.phase !== 'mail' || !g.visitPending) return g;
  const s = clone(g);
  s.lines = g.lines.slice();
  s.visitPending = false;
  const risk = s.visitRisk;
  s.visitRisk = null;
  if (which === 'stayHome') {
    s.visitMonths = s.visitMonths.filter((m) => m !== s.m);
    s.visitBanMonth = s.m; // nobody comes, and nobody is told why
    L(s, risk === 'ink'
      ? 'You tell them to stay home this week. You say the unit is on lockdown. It is not. The ink needs another week to heal.'
      : 'You tell them to stay home this week. You say you have a cold. You do not tell them about your face.');
    return s;
  }
  if (risk) {
    L(s, 'After the visit, they strip you out. Every visit, every time.');
    if (next(s) < 0.6) {
      L(s, risk === 'ink'
        ? 'The officer sees the fresh ink on your forearm, still raised. He writes it down.'
        : 'The officer sees the bruising on your ribs and asks where it came from. You say you fell. He writes it down.');
      s.pendingBreaks.push({
        title: risk === 'ink' ? 'Strip search: fresh ink' : 'Strip search: marks from a fight',
        dice: { blueNo: 0, blue: 0, white: 0, gray: 0, rumor: 0, applies: false },
        severity: 'major', forced: 'major', ser: risk === 'ink' ? '710' : '505'
      });
    } else L(s, 'The officer is moving fast. He does not look closely.');
  }
  if (which === 'money') {
    s.commissary += s.support;
    L(s, `Money on your books: +${s.support} store.`);
  } else if (s.rumors.length) {
    s.rumors.pop();
    L(s, 'Steady: someone outside still knows who you are. A rumor comes down.');
  } else L(s, 'Steady: someone outside still knows who you are.');
  return s;
}

/* ------------------------------------------------------------------ */
/* Messages: the tablet                                                */
/* ------------------------------------------------------------------ */

/** Tablet messages from inside are capped at 6,000 characters. Longer ones take longer to clear review. */
export const MESSAGE_LIMIT = 6000;
const LONG_MESSAGE = 2000;
/** Fewer words than this is a blank message: a subject line and nothing to say. People notice. */
export const BLANK_WORDS = 3;
export const isBlank = (text: string) => text.trim().split(/\s+/).filter(Boolean).length < BLANK_WORDS;
/** Rejections happen, rarely, with a notice (DOC 450.100 Attachment 2, form 05-525). */
const REJECT_CHANCE = 0.03;
/**
 * The reasons a notice gives. These are the catch-alls from DOC 450.100 Attachment 4, quoted: broad enough to cover
 * anything, specific enough to sign.
 */
const REJECT_REASONS = [
  'Violates or plans to violate facility procedures',
  'Information considered to be a threat to the safety and security of the facility',
  'Code or intentionally using any method in an attempt to defeat electronic messaging security features',
  'Violates or plans to violate Department policy'
];
/** How often each level overturns a rejection. Game numbers: the policy gives none. */
const OVERTURN = { superintendent: 0.15, hq: 0.1 };
/** A family message is rejected about as often as yours. */
const INCOMING_REJECT_CHANCE = 0.03;

/**
 * Appeal a rejected incoming message (DOC 450.100 Attachment 2). Only the person it was meant for, or its sender, may
 * appeal, and only within 10 business days: that is, in the month of the notice or of the Superintendent's decision.
 * Outgoing messages can't be appealed; they are reviewed automatically.
 */
export function appealRejection(g: Game, id: number): Game {
  const r = g.rejections.find((x) => x.id === id);
  if (g.phase !== 'mail' || !r || r.dir !== 'in' || r.kind !== 'rejected') return g;
  const first = r.stage === 'none' && r.noticed === g.m;
  const second = r.stage === 'superintendent' && r.status === 'upheld' && r.decidedAt === g.m;
  if (!first && !second) return g;
  const s = clone(g);
  const x = s.rejections.find((y) => y.id === id)!;
  x.stage = first ? 'superintendent' : 'hq';
  x.status = 'pending';
  x.decide = s.m + 1; // 10 business days to the Superintendent; 20 to Headquarters
  s.lines = [...s.lines, first
    ? `You appeal to the Superintendent: the message from ${x.who} should be delivered.`
    : `You appeal to the Headquarters Correctional Manager. Their decision will be final.`];
  return s;
}

function resolveRejections(s: Game) {
  for (const r of s.rejections) {
    if (r.status !== 'pending' || (r.decide ?? 0) > s.m || r.stage === 'none') continue;
    r.decidedAt = s.m;
    const level = r.stage as 'superintendent' | 'hq';
    if (next(s) < OVERTURN[level]) {
      r.status = 'overturned';
      if (r.dir === 'in') {
        s.inbox.push({ m: s.m, from: r.who, subject: r.subject, text: r.text, slip: r.slip });
        L(s, `The rejection is overturned. The message from ${r.who} is delivered, ${s.m - r.m} months after they wrote it.`);
      } else if (s.ties.some((t) => t.id === r.to && tieActive(s, t))) {
        s.outbox.push({ to: r.to, who: r.who, topic: r.topic, subject: r.subject, m: r.m, arrive: s.m + 1, late: true, blank: isBlank(r.text) });
        L(s, `On review, the rejection of your message to ${r.who} is overturned. It goes out ${s.m - r.m} months after you wrote it.`);
      } else L(s, `On review, the rejection of your message to ${r.who} is overturned. There is no one left to read it.`);
      continue;
    }
    r.status = 'upheld';
    if (r.dir === 'out' && level === 'superintendent') {
      // upheld rejections of outgoing messages go to Headquarters on their own: 30 business days for electronic messages
      r.stage = 'hq';
      r.status = 'pending';
      r.decide = s.m + 2;
      L(s, `The Superintendent upholds the rejection of your message to ${r.who}. It goes to Headquarters for review. You don't have to do anything. You can't do anything.`);
    } else if (r.dir === 'out') {
      L(s, `Headquarters upholds the rejection of your message to ${r.who}. It will be kept on file for two years and then destroyed. It will not be returned to you.`);
    } else if (level === 'superintendent') {
      L(s, `The Superintendent upholds the rejection of the message from ${r.who}. You may appeal to Headquarters within 10 business days.`);
    } else {
      L(s, `Headquarters upholds the rejection of the message from ${r.who}. The decision is final. You have 30 days to arrange its disposal, or it will be destroyed.`);
    }
  }
}
const subjectOf = (topic: string) => TOPICS.find((x) => x.id === topic)?.subject ?? topic;

/** Replies arrive a month after you write. They are written then, from what is true then. */
function deliverMessages(s: Game) {
  resolveRejections(s);
  if (s.mo.noMessages) {
    for (const o of s.outbox) if (o.arrive <= s.m) o.arrive = s.m + 1;
    return; // the kiosk is down: nothing in, nothing out
  }
  const due = s.outbox.filter((o) => o.arrive <= s.m);
  s.outbox = s.outbox.filter((o) => o.arrive > s.m);
  for (const o of due) {
    const tie = s.ties.find((t) => t.id === o.to && tieActive(s, t));
    if (!tie) continue; // they're gone. No reply, and no one says why.
    const ctx = replyContext(s, tie, o.late);
    if (ctx && o.blank) {
      ctx.blank = true;
      ctx.warm = false; // they answer the way they were written to
    }
    const reply = ctx && compose(ctx, o.topic as Topic, () => next(s));
    if (!reply) continue;
    if (reply.slip) slipConsequence(s, reply.slip, tie.who); // staff read it, delivered or not
    if (next(s) < INCOMING_REJECT_CHANCE) {
      s.rejections.push({
        id: s.rejections.length, dir: 'in', kind: 'rejected', m: s.m, noticed: s.m, to: tie.id, who: tie.who, topic: o.topic,
        subject: `Re: ${o.subject}`, text: reply.text, reason: REJECT_REASONS[Math.floor(next(s) * REJECT_REASONS.length)],
        stage: 'none', slip: reply.slip
      });
      continue;
    }
    s.inbox.push({ m: s.m, from: tie.who, subject: `Re: ${o.subject}`, text: reply.text, slip: reply.slip });
  }
}

/**
 * Send this month's messages. Each is to someone, with a subject line; your own words are optional. A plain string
 * is a message to the person closest to you, about nothing in particular.
 */
export function submitLetters(g: Game, msgs: (string | OutMsg)[]): Game {
  if (g.phase !== 'mail' || g.visitPending) return g;
  const s = clone(g);
  s.lines = [];
  const primary = primaryTie(s);
  const notebook = !primary;
  const restricted = s.commsUntil >= s.m;
  const items = msgs.map((x) => (typeof x === 'string' ? { to: primary?.id ?? '', topic: 'checkin', text: x } : x));
  const out: Letter['lines'] = [];
  for (const item of items) {
    const text = item.text.trim().slice(0, MESSAGE_LIMIT);
    if (notebook) {
      if (text) out.push({ text, status: 'sent' });
      continue;
    }
    const tie = s.ties.find((t) => t.id === item.to && tieActive(s, t));
    if (!tie) continue;
    const subject = subjectOf(item.topic);
    const line = { text, status: 'sent' as Letter['lines'][number]['status'], to: tie.who, subject };
    const hold = (kind: 'rejected' | 'restricted', reason: string) => {
      line.status = 'held';
      out.push(line);
      // the notice reaches you by the next time you're at the tablet; a rejection goes to the Superintendent on its own
      s.rejections.push({
        id: s.rejections.length, dir: 'out', kind, m: s.m, noticed: s.m + 1, to: tie.id, who: tie.who, topic: item.topic, subject, text, reason,
        stage: kind === 'rejected' ? 'superintendent' : 'none', status: kind === 'rejected' ? 'pending' : undefined,
        decide: kind === 'rejected' ? s.m + 1 : undefined
      });
    };
    if (restricted) {
      hold('restricted', 'Your electronic messaging is restricted by a disciplinary sanction');
      continue;
    }
    if (next(s) < REJECT_CHANCE) {
      hold('rejected', REJECT_REASONS[Math.floor(next(s) * REJECT_REASONS.length)]);
      continue;
    }
    // a word on the list, or a long message, sits in review for a week or more. Nobody tells you.
    const flagged = flaggedWords(s.facilityId, text);
    const late = flagged.length > 0 || text.length > LONG_MESSAGE || s.mo.delayMessages || s.mo.noMessages;
    if (late) line.status = 'delayed';
    out.push({ ...line, flagged: flagged.length ? flagged : undefined });
    const blank = isBlank(text);
    s.outbox.push({ to: tie.id, who: tie.who, topic: item.topic, subject, m: s.m, arrive: s.m + (s.mo.delayMessages || s.mo.noMessages ? 2 : 1), late, blank });
    if (blank) {
      tie.strain = (tie.strain ?? 0) + 1;
      L(s, `You send ${tie.who} a subject line and almost nothing else.`);
      if (tie.strain >= 2) {
        tie.strain = 0;
        tieOps(s, [{ id: tie.id, delta: -1, why: `${cap(tie.who)} has stopped expecting much from your messages.` }]);
      }
    }
  }
  s.letters.push({ m: s.m, notebook, lines: out });
  accrueRoutine(s, out.some((l) => l.status !== 'held' && !isBlank(l.text)));
  s.extraLines = 0;
  if (s.ending === 'released' && s.flags.newCaseAt && !s.flags.newMonths) {
    // charged but never resolved before the date: the plea happens on the hold
    newCaseStep(s, 'deal');
  }
  if (s.ending === 'released' && s.flags.newMonths) {
    L(s, 'They call your name for release, and then for the hold. You sign for your property and hand it back.');
    s.phase = 'over';
    return s;
  }
  if (s.ending === 'released') {
    if (s.flags.promise_date && s.m > s.sentence - s.maxBoxes) addSupport(s, -1);
    if (s.flags.promise_efv && s.efv.done === 0) addSupport(s, -2);
    s.release = { step: 0, picks: {} };
    s.phase = 'release';
    return s;
  }
  s.hurt = false;
  delete s.flags.marked;
  delete s.flags.fresh_ink;
  s.contraband = Math.max(0, s.contraband - 1);
  if (s.contraband === 0) delete s.flags.cell_package;
  s.m += 1;
  startMonth(s);
  return s;
}

/* ------------------------------------------------------------------ */
/* The release act: from the last message to the gate                  */
/* ------------------------------------------------------------------ */

export interface ReleaseCard {
  title: string;
  text: string;
  choices: { id: string; label: string }[];
}

export const RELEASE_STEPS = 4;

/** Who is waiting, if anyone: someone who could visit, then anyone at all. */
function waiting(s: Game) {
  const adults = activeTies(s).filter((t) => !t.minor);
  return { meet: visitingTies(s).find((t) => !t.minor), someone: adults[0] };
}

export function releaseCard(g: Game): ReleaseCard | null {
  if (g.phase !== 'release' || !g.release || !g.char) return null;
  const lvl = routineLevel(g);
  const { meet, someone } = waiting(g);
  const gotOut = activeTies(g).find((t) => t.id.startsWith('got_out'));
  switch (g.release.step) {
    case 0:
      return {
        title: 'Release Day',
        text: [
          `They call ${lvl >= 3 ? 'your number' : 'your name'}. You sign for your property, item by item, against a record with ${g.char.docNumber} on every line.`,
          someone && someone.visits
            ? `The clothes ${someone.who} sent are folded on the counter. They fit differently than you remember.`
            : 'State-issued release clothes. They fit like a uniform, because they are one.',
          lvl >= 2 ? `At the last door you stop and wait to be buzzed through. The officer says, "It's open. Go."` : 'The last door opens, and you go through it.'
        ].join(' '),
        choices: [{ id: 'walk', label: 'Walk out' }]
      };
    case 1:
      if (meet) return { title: 'The Gate', text: `${cap(meet.who)} is at the gate. Nobody says anything for a second. Then everyone does.`, choices: [{ id: 'car', label: `Go with ${meet.who}` }] };
      return {
        title: 'The Gate',
        text: someone
          ? `Nobody at the gate. ${cap(someone.who)} couldn't come. A bus schedule is taped inside the gatehouse window, and what was left on your books is in an envelope in your hand.`
          : 'Nobody at the gate. A bus schedule is taped inside the gatehouse window, and what was left on your books is in an envelope in your hand.',
        choices: [{ id: 'bus', label: 'Get on the bus' }]
      };
    case 2: {
      const choices: ReleaseCard['choices'] = [];
      if (someone) choices.push({ id: 'with', label: `Stay with ${someone.who}` });
      if (gotOut) choices.push({ id: 'got_out', label: 'Call the man who got out' });
      choices.push({ id: 'shelter', label: 'Find a shelter bed' }, { id: 'bus_night', label: 'Ride the bus until morning' });
      return {
        title: 'The First Night',
        text: `Somewhere to sleep, and nobody counting you.${lvl >= 3 ? ' You will wake at 5:30 for a count that does not come.' : ''}`,
        choices
      };
    }
    case 3:
      return {
        title: 'The First Week',
        text: [
          'An ID. A phone. A bank that will take you. A job that will take the box you have to check.',
          lvl >= 2 ? 'You eat fast. You sit with your back to the wall. In the grocery store you stand in front of the cereal for a long time, because there are too many.' : 'Everything is louder than you remember, and faster.'
        ].join(' '),
        choices: [{ id: 'go', label: 'Keep going' }]
      };
  }
  return null;
}

export function advanceRelease(g: Game, choiceId: string): Game {
  const card = releaseCard(g);
  const pick = card?.choices.find((c) => c.id === choiceId);
  if (!card || !pick) return g;
  const s = clone(g);
  s.release!.picks[card.title] = pick.label;
  s.release!.step += 1;
  if (s.release!.step >= RELEASE_STEPS) s.phase = 'over';
  return s;
}

/* ------------------------------------------------------------------ */
/* Ledger: the thesis moment                                           */
/* ------------------------------------------------------------------ */

export interface LedgerRow {
  consp: number;
  expectedCaught: number;
  cleanChance: number;
}

/** Replays every Eyes roll under each Conspicuity from -2 to +2. */
export function ledgerRows(s: Game): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (let c = -2; c <= 2; c++) {
    let exp = 0;
    let clean = 1;
    for (const e of s.ledger) {
      if (e.forced) continue;
      const blue = Math.max(0, e.blueNo + (e.applies ? c : 0));
      const p = caughtChance(blue + e.white + e.gray + e.rumor);
      exp += p;
      clean *= 1 - p;
    }
    rows.push({ consp: c, expectedCaught: exp, cleanChance: clean });
  }
  return rows;
}

/** The sentencing ledger: lay every Background side by side and compare the time. */
/** Every background, offered the same deal on the same charge: what the grid gives each of them. */
export function sentencingRows(chargeId: string) {
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const rows = BACKGROUNDS.map((b) => ({ ...b, months: sentenceFor(chargeId, b.score, 'deal', b.case.map((c) => c.bad)).months }));
  return {
    rows,
    white: avg(rows.filter((b) => b.ethnicity === 'White').map((b) => b.months)),
    others: avg(rows.filter((b) => b.ethnicity !== 'White').map((b) => b.months))
  };
}
