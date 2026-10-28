import {
  ANYONE_MOVES, BACKGROUNDS, CELLIES, CHARGES, COUNT, FAILINGS, OFFICERS, OUTSIDES, PROMPTS, PULL_HABIT,
  PULL_STICKY, YARD, background, cellie, charge, codeMove, facility, outside, CODE_MOVES
} from './content';
import { d, next, pickN, shuffle } from './rng';
import type {
  Card, Character, Choice, Cond, Effect, Game, Groove, Month, Officer, PullDef, RollSpec, RumorTag, Stat, Style
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
  opts: { forced?: 'major' | 'minor'; onClean?: Effect; onCaught?: Effect; fightMajor?: boolean; hustle?: boolean } = {}
) {
  const dice = computeDice(s, spec);
  s.blueOnce = 0;
  s.mo.breaks.push({
    title,
    dice: { blueNo: dice.blueNo, blue: dice.blue, white: dice.white, gray: dice.gray, rumor: dice.rumor, applies: dice.applies },
    severity: opts.forced ?? spec.severity ?? 'rolled',
    forced: opts.forced ?? false,
    fightMajor: opts.fightMajor,
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
    caught: false, fought: false, searched: false, breaks: [], medicalDone: false, notes: []
  };
}

export function newGame(facilityId: string, seed: number): Game {
  const f = facility(facilityId);
  const s: Game = {
    v: 2, rng: seed | 0, phase: 'draft', custody: f.custody, facilityId, sentence: 12, added: 0, m: 1, lastAct: '',
    char: null, cellieId: '', draft: null, standing: f.startStanding, support: 0, boxes: 0, maxBoxes: f.boxes,
    commissary: 5, rumors: [], strings: [], proven: false, consBonus: 0, hurt: false, contraband: 0, job: false,
    flags: {}, usedMoves: {}, pull: {}, privateFlipped: false, blueOnce: 0, blueNext: 0, extraLines: 0,
    skipNext: 0, cleanStreak: 0, efv: false, visitPending: false, visitBanMonth: 0, visitBanAct: '', visitReadyMonth: 0, marks: 0,
    missionsDrawn: 0, monthly: [], deferred: [], yardDeck: [], yardDiscard: [], countDeck: [], queue: [],
    cur: null, result: null, mo: emptyMonth(OFFICERS[0]), letters: [], ledger: [], report: [], lines: [],
    actUsed: {}, groove: newGroove(), stats: { letGo: 0, fights: 0, informed: 0, putInWork: 0, pullGiven: 0, pullWalked: 0, caught: 0 },
    ending: null
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
  pick: { chargeId: string; backgroundId: string; outsideId: string; name: string }
): Game {
  const s = clone(g);
  const ch = charge(pick.chargeId);
  const bg = background(pick.backgroundId);
  const out = outside(pick.outsideId);

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
    privateTag, knownOfficer, claim: ch.claim
  };
  s.sentence = bg.sentence;
  s.support = clamp(out.support + (stats.heart.mod >= 1 ? 1 : 0), 0, 3);
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
  const notes = s.lines.slice();
  s.lines = [];
  s.report = [];
  const first = drawCount(s);
  const officer = OFFICERS.find((o) => o.name === first.officer) ?? OFFICERS[Math.floor(next(s) * OFFICERS.length)];
  s.mo = emptyMonth(officer);
  s.mo.notes = notes;
  s.mo.blueMonth = s.blueNext;
  s.blueNext = 0;
  s.queue = [first];
  if (act === 'short') s.queue.push(drawCount(s));
  if (s.standing === 0) s.queue.push(clone(PROMPTS.get('targeted')!));
  if (s.m >= 2 && !s.actUsed[act].leak && next(s) < 0.35) {
    s.actUsed[act].leak = true;
    s.queue.push(clone(PROMPTS.get(next(s) < 0.65 ? 'leak_told' : 'leak_about')!));
  }
  if (has(s, 'informant') && !s.actUsed[act].informant && next(s) < 0.6) {
    s.actUsed[act].informant = true;
    s.queue.push(clone(PROMPTS.get('informant_call')!));
  }
  if (cellieOf(s).has && !s.flags.living_seen && s.m >= 2 && s.m <= 6 && next(s) < 0.5) {
    s.flags.living_seen = true;
    s.queue.push(clone(PROMPTS.get('living_with_it')!));
  }
  // The Pull is never a choice: you roll for it
  const skip = !!s.flags.skip_pull;
  delete s.flags.skip_pull;
  const forced = cellieOf(s).id === 'hooch' && (has(s, 'habit') || s.char?.chargeId === 'possession');
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
      text: `Roll a d6: 1-${4 - t} you give in; ${5 - t}-6 you walk past and make a tally mark (${t}/3). A Pull is never a choice.`
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
  // an EFV is on the line only for someone who could actually have one
  if (c.id === 'the_visit' && !(visitsApproved(s) && facility(s.facilityId).efv)) return true;
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

function presentYard(s: Game, card: Card) {
  const act = actOf(s);
  s.actUsed[act] ??= {};
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
  if (s.efv) {
    s.efv = false;
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
  if (ch.auto) addBreak(s, `${card.title}: ${ch.label}`, {}, { forced: 'major' });
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
  const giveMax = 4 - st.tallies;
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
      addBreak(s, t, { blue: 1, white: 2 }, state
        ? { onClean: { commissary: 2, standing: 1 } }
        : { onClean: { commissary: 2, flag: 'thief' }, onCaught: { standing: -3, log: 'Jailhouse thief.' } });
      break;
    }
    case 'retail':
      addBreak(s, t, { blue: 1, white: 2 }, { onClean: { commissary: 2 } });
      break;
    case 'identity':
      apply(s, { commissary: 3 });
      addBreak(s, t, { gray: 1, severity: 'major' }, { onCaught: { echoes: ['payback'], log: 'The victim learns your name.' } });
      break;
    case 'delivery':
      apply(s, { commissary: 3, debt: 'whoever supplied it' });
      addBreak(s, t, { white: 2, gray: 1 });
      break;
    case 'possession':
      apply(s, { commissary: -2, flag: 'skip_pull' });
      s.flags.act_drug = true;
      addBreak(s, t, { blue: 1 });
      break;
    case 'vehicular':
      s.flags.act_drug = true;
      addBreak(s, t, { blue: 1, severity: 'minor' }, { fightMajor: true });
      break;
    case 'assault':
      s.mo.fought = true;
      s.stats.fights++;
      addBreak(s, t, { blue: 1, white: 3, gray: 1, severity: 'major' });
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
      L(s, 'You take the shank and hide it. +1 on your Threats; every Random Search is a major for you if caught.');
      break;
    case 'eluding':
      addBreak(s, t, { blue: 1, discretionary: true }, { onClean: { standing: 1 } });
      break;
    case 'nocontact':
      addBreak(s, t, { gray: 1, severity: 'major' }, { onCaught: { support: -1 } });
      break;
    case 'trafficking':
      apply(s, { commissary: -2 });
      s.flags.hot = s.m;
      addBreak(s, t, { white: 1 });
      break;
  }
}
const fightSpec = (): RollSpec => ({ blue: 1, white: 3, gray: 1, severity: 'major' });

/* ------------------------------------------------------------------ */
/* Count-card rules                                                    */
/* ------------------------------------------------------------------ */

function searchRoll(s: Game, title: string, base: { blue: number; search: boolean }) {
  s.mo.searched = true;
  const shank = !!s.flags.shank;
  const sev = shank ? 'major' : 'rolled';
  if (s.contraband > 0 && !s.flags.cell_package) {
    L(s, 'They find the package in your cell.');
    addBreak(s, `${title}: the package`, {}, { forced: 'major' });
  } else if (s.flags.holding || shank) {
    const blue = base.blue + (s.flags.holding ? 2 : 0);
    s.flags.holding = false;
    L(s, 'You are holding. The search team is on your tier.');
    addBreak(s, title, { blue, search: base.search, severity: sev });
  } else L(s, 'You were clean.');
  // the cell tag: whatever is found in a cell belongs to everyone in it
  const ce = cellieOf(s);
  const cellHot = (ce.contraband && !s.flags.cellie_gone) || (s.contraband > 0 && s.flags.cell_package);
  if (cellHot) {
    const r = d(s, 6);
    if (r >= ce.owns && ce.has) L(s, `${ce.name} owns his own. Nothing sticks to you.`);
    else {
      L(s, `${ce.has ? ce.name : 'Your cellie'} does not claim it. The cell tag lands on you.`);
      addBreak(s, `${title}: cell tag`, { blue: base.blue, search: base.search, severity: ce.id === 'shank' ? 'major' : sev });
    }
  }
}

function countAuto(s: Game, card: Card) {
  switch (card.rule) {
    case 'memo':
      addBreak(s, card.title, { blue: 1, discretionary: true });
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
        addBreak(s, 'K-9 Sweep', { blue: 2 });
      } else L(s, 'The dogs walk past.');
      break;
    }
    case 'ua':
      if (d(s, 6) === 1) {
        L(s, 'Your name is called for urinalysis.');
        if (s.flags.act_drug) addBreak(s, 'Random UA', {}, { forced: 'minor' });
        else L(s, 'You are clean.');
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
      if (s.flags.marked) addBreak(s, 'Count', { blue: 1 });
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
      L(s, 'Organizers get written up.');
      addBoxes(s, -2);
    }
  } else if (k === 0) {
    L(s, 'You were the only one to break. Staff reward whoever ended it.');
    addBoxes(s, 2);
  } else if (k === 3) {
    L(s, 'Everyone broke. The strike collapses and the whole unit is written up.');
    addBoxes(s, -1);
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

function addSupport(s: Game, n: number) {
  const before = s.support;
  s.support = clamp(s.support + n, 0, 3);
  if (s.support !== before) L(s, `Support ${s.support - before > 0 ? '+' : ''}${s.support - before} (now ${s.support})`);
  if (before === 0 && s.support > 0) {
    s.visitReadyMonth = s.m + VISIT_APPROVAL_MONTHS;
    L(s, 'Someone is in touch again. Visits need an approved questionnaire, and that takes time.');
  }
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
  if (e.supportSet !== undefined) {
    const target = e.supportSet === 0 ? 0 : Math.max(s.support, e.supportSet);
    if (target !== s.support) addSupport(s, target - s.support);
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
  if (e.flag) {
    s.flags[e.flag] = true;
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
  s.boxes = 0;
  s.maxBoxes = 0;
  L(s, 'You stop counting days. Every box is erased: you will serve your full sentence.');
  addStanding(s, 2);
  if (s.m >= s.sentence) s.ending = 'released';
  return s;
}

/* ------------------------------------------------------------------ */
/* Eyes, mail call                                                     */
/* ------------------------------------------------------------------ */

function eraseBoxes(s: Game, n: number) {
  if (s.flags.stopped) return 0;
  const before = s.boxes;
  s.boxes = Math.max(0, s.boxes - n);
  return before - s.boxes;
}

function major(s: Game) {
  if (s.custody === 'minimum') {
    s.custody = 'medium';
    s.facilityId = 'harlan';
    s.maxBoxes = facility('harlan').boxes;
    s.boxes = Math.min(s.boxes, s.maxBoxes);
    L(s, 'You are transferred to Harlan for the rest of your sentence.');
  } else if (s.custody === 'close') addSentence(s, 1);
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

export function rollEyes(g: Game): Game {
  if (g.phase !== 'hub' || g.mo.scenesLeft > 0) return g;
  const s = clone(g);
  s.lines = [];
  L(s, s.mo.breaks.length ? 'Staff roll behind the screen. They say only "clean" or "caught."' : 'Nothing was done that staff could write up.');
  for (const b of s.mo.breaks) {
    const total = b.dice.blue + b.dice.white + b.dice.gray + b.dice.rumor;
    let sixes = 0;
    for (let i = 0; i < total; i++) if (d(s, 6) === 6) sixes++;
    let caught = !!b.forced || sixes > 0;
    let sev: 'minor' | 'major' = b.forced
      ? b.forced
      : b.severity === 'rolled' ? (sixes >= 2 ? 'major' : 'minor') : b.severity;
    if (caught && sev === 'minor' && b.fightMajor && s.mo.fought) sev = 'major';
    s.ledger.push({
      m: s.m, title: b.title, blueNo: b.dice.blueNo, white: b.dice.white, gray: b.dice.gray,
      rumor: b.dice.rumor, applies: b.dice.applies, consp: consp(s), caught, forced: !!b.forced
    });
    if (caught && sev === 'minor' && s.mo.warn) {
      s.mo.warn = false;
      caught = false;
      L(s, `${b.title}: a warning. Reyes lets it go.`);
      apply(s, b.onClean, b.hustle ? ({ hustle: true } as Choice) : undefined);
      continue;
    }
    if (caught) {
      const lost = eraseBoxes(s, sev === 'major' ? 2 : 1);
      s.mo.caught = true;
      s.stats.caught++;
      L(s, `${b.title}: CAUGHT (${sev}).${lost ? ` Good time -${lost}.` : s.flags.stopped ? ' (You stopped counting: no good time to lose.)' : ''}`);
      if (sev === 'minor') {
        s.visitBanMonth = s.m + 1;
        L(s, 'A minor suspends visits next month.');
      } else {
        s.visitBanAct = actOf(s);
        addSupport(s, -1);
        L(s, 'A major suspends visits for the rest of the act, and strains the people on the other side.');
        major(s);
      }
      apply(s, b.onCaught);
    } else {
      L(s, `${b.title}: clean.`);
      apply(s, b.onClean, b.hustle ? ({ hustle: true } as Choice) : undefined);
    }
  }
  // kites: everyone passes one every month, so passing one proves nothing
  const kiteP = Math.min(0.3, 0.05 + 0.03 * s.rumors.length);
  if (next(s) < kiteP) {
    L(s, 'Someone passed a kite to the bubble. Staff are not saying what it said.');
    if (s.mo.breaks.length && !s.mo.caught) {
      s.mo.caught = true;
      s.stats.caught++;
      const lost = eraseBoxes(s, 1);
      L(s, `The kite named something you did. CAUGHT (minor).${lost ? ' Good time -1.' : ''}`);
      s.visitBanMonth = s.m + 1;
    } else if (!s.mo.caught) pin(s, s.char!.privateTag);
  }
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

/** Months between Support going from 0 to 1+ and the first possible visit. */
const VISIT_APPROVAL_MONTHS = 2;

export function visitsApproved(s: Game): boolean {
  return s.support >= 1 && s.m >= s.visitReadyMonth;
}

export function visitsBanned(s: Game): boolean {
  return s.visitBanMonth === s.m || (!!s.visitBanAct && s.visitBanAct === actOf(s)) || s.mo.noVisits;
}

export function toMail(g: Game): Game {
  if (g.phase !== 'eyes') return g;
  const s = clone(g);
  s.lines = [];
  if (s.mo.caught) {
    s.cleanStreak = 0;
    L(s, 'You were caught this month: no good-time box.');
  } else {
    s.cleanStreak += 1;
    if (s.flags.stopped) L(s, 'A clean month.');
    else if (s.boxes >= s.maxBoxes) L(s, 'A clean month, but every box is already full.');
    else {
      s.boxes++;
      L(s, 'A clean month: a good-time box is filled.');
    }
    const efvOk = facility(s.facilityId).efv;
    if (s.cleanStreak >= 3 && visitsApproved(s) && efvOk && !s.efv) {
      s.efv = true;
      s.cleanStreak = 0;
      L(s, 'Three clean months in a row: you have earned an extended family visit. Your next scene is with your family.');
    }
    if (visitsApproved(s) && !visitsBanned(s)) {
      s.visitPending = true;
      L(s, 'You have a visit.');
    } else if (visitsApproved(s)) L(s, 'No visit this month: visits are suspended.');
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
  if (has(s, 'gambler') && next(s) < 1 / 3) {
    const r = d(s, 6);
    const sixSeen = [d(s, 6), d(s, 6), d(s, 6)].includes(6);
    L(s, `A game runs. You sit in: ${r <= 3 ? 'you lose 3 commissary.' : 'you win 3 commissary.'}`);
    s.commissary = Math.max(0, s.commissary + (r <= 3 ? -3 : 3));
    if (sixSeen) {
      eraseBoxes(s, 1);
      L(s, 'An officer saw. Gambling is a minor: good time -1.');
    }
  }
  if (has(s, 'loose_mouth') && d(s, 6) === 1) {
    L(s, 'You said too much to the wrong man.');
    pin(s, s.char!.privateTag);
  }
  processDeferred(s, 'month');
  if (s.m >= s.sentence - s.boxes) s.ending = 'released';
  s.phase = 'mail';
  return s;
}

export function chooseVisit(g: Game, which: 'money' | 'steady'): Game {
  if (g.phase !== 'mail' || !g.visitPending) return g;
  const s = clone(g);
  s.lines = g.lines.slice();
  s.visitPending = false;
  if (which === 'money') {
    s.commissary += s.support;
    L(s, `Money on your books: +${s.support} store.`);
  } else if (s.rumors.length) {
    s.rumors.pop();
    L(s, 'Steady: someone outside still knows who you are. A rumor comes down.');
  } else L(s, 'Steady: someone outside still knows who you are.');
  return s;
}

const SENSITIVE = /(staff|officer|guard|co\b|sergeant|yard|grievance|snitch|rat\b|car\b|gang|cop|warden|lieutenant)/i;

export function submitLetters(g: Game, lines: string[]): Game {
  if (g.phase !== 'mail' || g.visitPending) return g;
  const s = clone(g);
  s.lines = [];
  const notebook = s.support === 0;
  // Mail is read. Staff may delay a message a month, or hold it for good.
  const out = lines.map((t) => t.trim()).filter(Boolean).map((text) => {
    if (notebook) return { text, status: 'sent' as const };
    if (s.mo.noMessages) return { text, status: 'held' as const };
    if (s.mo.delayMessages) return { text, status: 'delayed' as const };
    const r = next(s);
    const pHeld = 0.06 + (SENSITIVE.test(text) ? 0.3 : 0);
    if (r < pHeld) return { text, status: 'held' as const };
    if (r < pHeld + 0.1) return { text, status: 'delayed' as const };
    return { text, status: 'sent' as const };
  });
  s.letters.push({ m: s.m, notebook, lines: out });
  s.extraLines = 0;
  if (s.ending === 'released') {
    if (typeof s.flags.promise_date === 'number' && s.m > s.flags.promise_date) s.support = Math.max(0, s.support - 1);
    if (s.flags.promise_efv) s.support = Math.max(0, s.support - 2);
    s.phase = 'over';
    return s;
  }
  s.hurt = false;
  delete s.flags.marked;
  s.contraband = Math.max(0, s.contraband - 1);
  if (s.contraband === 0) delete s.flags.cell_package;
  s.m += 1;
  startMonth(s);
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
export function sentencingRows() {
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return {
    rows: BACKGROUNDS,
    white: avg(BACKGROUNDS.filter((b) => b.ethnicity === 'White').map((b) => b.sentence)),
    others: avg(BACKGROUNDS.filter((b) => b.ethnicity !== 'White').map((b) => b.sentence))
  };
}
