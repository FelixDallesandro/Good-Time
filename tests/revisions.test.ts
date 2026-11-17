import { describe, expect, it } from 'vitest';
import {
  ANYONE_MOVES, BACKGROUNDS, CELLIES, CHARGES, CODE_MOVES, COUNT, OUTSIDES, PROMPTS, YARD
} from '../src/engine/content';
import { YARD_DECK_SIZE } from '../src/content/yard';
import {
  appealRejection, applyEfv, beginSentence, choose, chooseVisit, computeDice, conspFacts, continueResult, custodyScore, draftPick, efvBlock, newGame, plead, playScene,
  preview, primaryTie, pullCard, rollEyes, sentencingRows, stopCounting, submitLetters, toMail, releaseMonth, grooveOf, lockReason, visibleMarks, visitingTies
} from '../src/engine/engine';
import { careful } from '../src/engine/autoplay';
import { VOICES } from '../src/engine/replies';
import type { Break, Card, Game } from '../src/engine/types';

/** A character at the hub of month 1, with the given background/charge/outside. */
function hub(seed: number, o: { facility?: string; charge?: string; bg?: string; out?: string } = {}): Game {
  let s = newGame(o.facility ?? 'harlan', seed);
  s = draftPick(s, {
    chargeId: o.charge ?? 'burglary', backgroundId: o.bg ?? 'b2', outsideId: o.out ?? 'mother', name: 'T'
  });
  s = beginSentence(s);
  for (let i = 0; i < 40 && s.phase !== 'hub'; i++) {
    if (s.phase === 'card') s = choose(s, careful(s));
    else if (s.phase === 'result') s = continueResult(s);
    else break;
  }
  expect(s.phase).toBe('hub');
  return s;
}

const forcedMajor: Break = {
  title: 'x', severity: 'major', forced: 'major', ser: '505',
  dice: { blueNo: 0, blue: 0, white: 0, gray: 0, rumor: 0, applies: false }
};

const everyCard = (): Card[] => [
  ...YARD.values(), ...COUNT.values(), ...PROMPTS.values(), ...CODE_MOVES, ...ANYONE_MOVES,
  ...OUTSIDES.map((o) => o.lineHome)
];
const echoesOf = (x: unknown, out: string[] = []): string[] => {
  if (Array.isArray(x)) x.forEach((y) => echoesOf(y, out));
  else if (x && typeof x === 'object') {
    for (const [k, v] of Object.entries(x)) {
      if (k === 'echoes' && Array.isArray(v)) out.push(...(v as string[]));
      else echoesOf(v, out);
    }
  }
  return out;
};

describe('the card decks PDF', () => {
  it('has the deck sizes the decks list', () => {
    expect(CHARGES).toHaveLength(12);
    expect(BACKGROUNDS).toHaveLength(12);
    expect(OUTSIDES).toHaveLength(12);
    expect(CODE_MOVES).toHaveLength(12);
    expect(ANYONE_MOVES).toHaveLength(4);
    expect(CELLIES).toHaveLength(12);
    expect(CELLIES.filter((c) => c.has)).toHaveLength(9); // "nine of twelve have something going"
    expect(COUNT.size).toBe(24);
    expect(YARD_DECK_SIZE).toBe(40);
  });
  it('gives every case three lines', () => {
    for (const b of BACKGROUNDS) expect(b.case).toHaveLength(3);
  });
  it('keeps the disparity: on every charge, the same deal comes out longer for everyone but the white cards', () => {
    for (const c of CHARGES) {
      const r = sentencingRows(c.id);
      expect(r.others, c.id).toBeGreaterThan(r.white);
    }
  });
  it('only ever shuffles in cards that exist', () => {
    for (const id of echoesOf(everyCard())) expect(YARD.has(id), id).toBe(true);
  });
  it('has unique choice ids on every card', () => {
    for (const c of everyCard()) {
      const ids = (c.choices ?? []).map((x) => x.id);
      expect(new Set(ids).size, c.title).toBe(ids.length);
    }
  });
  it('names an officer on every Count card', () => {
    for (const c of COUNT.values()) expect(c.officer, c.title).toBeTruthy();
  });
});

describe('Conspicuity from the facility card', () => {
  it('+2 watched harder, +1 drug/theft, +1 tattoos, -1 over 50, -1 rural white staff; capped at +/-2', () => {
    expect(conspFacts('harlan', 'burglary', 'b1').total).toBe(2);
    expect(conspFacts('cedar', 'assault', 'b1').total).toBe(1); // Cedar doesn't list Black; tattoo only
    expect(conspFacts('harlan', 'burglary', 'b8').total).toBe(0); // +1 theft, -1 rural white staff
    expect(conspFacts('harlan', 'assault', 'b7').total).toBe(1); // Native 52: +2 -1
    expect(conspFacts('cedar', 'assault', 'b9').total).toBe(0);
    expect(conspFacts('granite', 'assault', 'b5').total).toBe(2); // Latino watched at Granite
    expect(conspFacts('harlan', 'assault', 'b5').total).toBe(0); // ...but not at Harlan
  });
});

describe('the Eyes you can count', () => {
  it('hides cameras from the preview but not from the roll', () => {
    const s = hub(1);
    const dice = computeDice(s, { blue: 1, white: 3, gray: 1 });
    expect(dice.gray).toBeGreaterThanOrEqual(1);
    expect(dice.total).toBe(dice.visible + dice.gray);
    expect(dice.visiblePct).toBeLessThan(dice.pct);
    const p = preview(s, { id: 'x', label: 'x', text: '', roll: { blue: 1, white: 3, gray: 1 } });
    expect(p && p.kind === 'roll' && p.dice.visible).toBe(dice.visible);
  });
});

describe('the Pull', () => {
  const trial = (tallies: number, n = 600) => {
    let walked = 0;
    for (let seed = 1; seed <= n; seed++) {
      let s = hub(seed);
      const def = Object.keys(s.pull)[0];
      s.pull[def].tallies = tallies;
      s.queue = [];
      s.cur = { card: pullCard(s, { id: def, rule: 'retail', title: 't', text: 't' }), source: 'prompt' };
      s.phase = 'card';
      s = choose(s, 'roll');
      if (s.pull[def].tallies > tallies || s.pull[def].torn) walked++;
    }
    return walked / n;
  };
  it('walks past on 5-6, then 4-6, then 3-6 (and tears up on the third tally)', () => {
    const a = trial(0);
    const b = trial(1);
    const c = trial(2);
    expect(a).toBeGreaterThan(0.27);
    expect(a).toBeLessThan(0.4); // 1/3
    expect(b).toBeGreaterThan(0.43);
    expect(b).toBeLessThan(0.57); // 1/2
    expect(c).toBeGreaterThan(0.6);
    expect(c).toBeLessThan(0.73); // 2/3
  });
});

describe('sentences and the ceiling on added time', () => {
  it('starts from the grid: priors and the case push the same deal longer', () => {
    expect(hub(3, { bg: 'b1' }).court!.months).toBeGreaterThan(hub(3, { bg: 'b2' }).court!.months);
  });
  it('takes good time for serious violations, but never adds months to the sentence', () => {
    let s = hub(5, { facility: 'granite', bg: 'b9' });
    const base = s.sentence;
    for (let i = 0; i < 6; i++) {
      s.mo.scenesLeft = 0;
      s.mo.breaks = [forcedMajor];
      s.phase = 'hub';
      s = rollEyes(s);
      while (s.hearings.length) s = plead(s, 'contest');
      s.phase = 'hub';
    }
    expect(s.sentence).toBe(base);
    expect(s.gctLost).toBeGreaterThan(0);
    expect(s.maxBoxes).toBeLessThan(3);
  });
});

describe('private card flips', () => {
  it('cost 2 Standing, not 1', () => {
    let s = hub(7);
    s.char!.privateTag = 'cooperation';
    s.privateFlipped = false;
    s.rumors = [{ tag: 'cooperation' }, { tag: 'cooperation' }];
    s.standing = 4;
    s.cur = {
      card: { id: 't', kind: 'prompt', title: 't', text: 't', choices: [{ id: 'ride', label: 'r', text: '', effect: { coopRumors: 1 } }] },
      source: 'prompt'
    };
    s.phase = 'card';
    s = choose(s, 'ride');
    expect(s.privateFlipped).toBe(true);
    expect(s.standing).toBe(2);
  });
});

describe('Support, visits and mail', () => {
  const toMailPhase = (seed: number, out: string) => {
    let s = hub(seed, { out });
    s.mo.scenesLeft = 0;
    s.mo.breaks = [];
    s.mo.caught = false;
    s.visitBanMonth = 0;
    s.mo.noVisits = false;
    s = rollEyes(s);
    while (s.hearings.length) s = plead(s, 'guilty');
    return toMail(s);
  };
  it('starts from the Outside card, and never exceeds 3', () => {
    expect(hub(9, { out: 'mother' }).support).toBeGreaterThanOrEqual(2);
    expect(hub(9, { out: 'nobody_a' }).support).toBeLessThanOrEqual(1);
    for (let seed = 1; seed < 40; seed++) expect(hub(seed, { out: 'sister' }).support).toBeLessThanOrEqual(3);
  });
  it('gives a visit you must settle before the letter, when someone comes', () => {
    let s = toMailPhase(11, 'mother');
    for (let seed = 12; !s.visitPending && seed < 60; seed++) s = toMailPhase(seed, 'mother');
    expect(s.visitPending).toBe(true);
    expect(submitLetters(s, ['hi']).phase).toBe('mail');
    const before = s.commissary;
    s = chooseVisit(s, 'money');
    expect(s.commissary).toBe(before + s.support);
    expect(submitLetters(s, ['hi']).phase).not.toBe('mail');
  });
  it('gives no visit at Support 0 and writes to a notebook instead', () => {
    let s = hub(13, { out: 'nobody_a' });
    s.mo.scenesLeft = 0;
    s.mo.breaks = [];
    s = rollEyes(s);
    while (s.hearings.length) s = plead(s, 'guilty');
    s = toMail(s);
    expect(s.visitPending).toBe(false);
    s = submitLetters(s, ['no one will read this']);
    expect(s.letters[0].notebook).toBe(true);
    expect(s.letters[0].lines[0].status).toBe('sent');
  });
  it('never gives Nobody Support, whatever their Heart', () => {
    for (let seed = 1; seed < 60; seed++) expect(hub(seed, { out: 'nobody_a' }).support).toBe(0);
  });
  it('makes a new visitor wait on the visitor application', () => {
    const s = hub(17, { out: 'nobody_a' });
    s.cur = { card: structuredClone(OUTSIDES.find((o) => o.id === 'nobody_a')!.lineHome), source: 'move' };
    s.phase = 'card';
    const t = choose(s, 'write');
    expect(t.support).toBe(1);
    expect(visitingTies(t)).toHaveLength(0);
    expect(visitingTies({ ...t, m: t.m + 2 })).toHaveLength(1);
  });
  it('never brings a visit from someone who cannot come', () => {
    expect(visitingTies(hub(19, { out: 'grandmother' }))).toHaveLength(0);
    expect(visitingTies(hub(19, { out: 'brother_inside' }))).toHaveLength(0);
  });
  it('takes the child with the adult who brings them when that adult leaves', () => {
    let s = hub(23, { out: 'partner_son' });
    expect(visitingTies(s).map((t) => t.id).sort()).toEqual(['partner', 'son']);
    s.cur = { card: structuredClone(YARD.get('divorce_papers')!), source: 'yard' };
    s.phase = 'card';
    s = choose(s, 'sign');
    expect(s.support).toBe(0);
    expect(visitingTies(s)).toHaveLength(0);
    expect(primaryTie(s)).toBeUndefined();
  });
  it('never draws Divorce Papers for someone with no partner', () => {
    const s = hub(29, { out: 'mother' });
    s.yardDeck = ['divorce_papers', 'spread'];
    s.standing = 2;
    s.lopUntil = 0;
    s.mo.scenesLeft = 1;
    expect(playScene(s).cur!.card.id).toBe('spread');
  });
  const mailAt = (seed: number, out = 'mother') => {
    let s = toMailPhase(seed, out);
    s = chooseVisit(s, 'money');
    s.mo.noMessages = false;
    s.mo.delayMessages = false;
    s.commsUntil = 0;
    return s;
  };
  /** Send, then play straight through to next month's messages. */
  const nextMail = (s: Game) => {
    s.yardDeck = ['spread'];
    for (let i = 0; i < 60 && s.phase !== 'mail'; i++) {
      if (s.phase === 'card') s = choose(s, careful(s));
      else if (s.phase === 'result') s = continueResult(s);
      else if (s.phase === 'hub') s = s.mo.scenesLeft > 0 ? playScene(s) : rollEyes(s);
      else if (s.phase === 'eyes') s = s.hearings.length ? plead(s, 'guilty') : toMail(s);
    }
    return s;
  };
  it('never holds a message for criticizing staff (DOC 450.100 III.E)', () => {
    let hot = 0;
    let cold = 0;
    for (let seed = 1; seed <= 200; seed++) {
      if (submitLetters(mailAt(seed), ['The officers here are unfair and the sergeant lies.']).letters[0].lines[0].status === 'held') hot++;
      if (submitLetters(mailAt(seed), ['The weather is nice.']).letters[0].lines[0].status === 'held') cold++;
    }
    expect(hot).toBe(cold); // the same rare rejection, and nothing more
  });
  it("answers the subject line next month, in that person's voice", () => {
    let s = mailAt(31);
    s = submitLetters(s, [{ to: 'mother', topic: 'release', text: '' }]);
    expect(s.outbox).toHaveLength(1);
    s = nextMail(s);
    const reply = s.inbox.find((x) => x.m === s.m);
    expect(reply?.from).toBe('your mother');
    expect(reply?.subject).toBe('Re: My release date');
  });
  it('puts a message with a listed word in review: the reply comes late, and says so', () => {
    let s = mailAt(33);
    s = submitLetters(s, [{ to: 'mother', topic: 'checkin', text: 'Can you send it by cashapp?' }]);
    expect(s.letters[0].lines[0].status).toBe('delayed');
    expect(s.letters[0].lines[0].flagged).toContain('cashapp');
    s = nextMail(s);
    const reply = s.inbox.find((x) => x.m === s.m)!;
    expect(VOICES.mother.late.some((l) => reply.text.startsWith(l.text))).toBe(true);
  });
  it('gets no answer from someone who has left your life', () => {
    let s = mailAt(35, 'partner_moving');
    s = submitLetters(s, [{ to: 'partner', topic: 'checkin', text: '' }]);
    s.ties.find((t) => t.id === 'partner')!.gone = true;
    s = nextMail(s);
    expect(s.inbox).toHaveLength(0);
  });
  it('sends nothing while messages are restricted by a sanction', () => {
    const s = mailAt(37);
    s.commsUntil = s.m;
    const after = submitLetters(s, ['hello']);
    expect(after.letters[0].lines[0].status).toBe('held');
    expect(after.outbox).toHaveLength(0);
    expect(after.rejections[0].kind).toBe('restricted');
    expect(after.rejections[0].stage).toBe('none');
  });
  it('reviews a rejected outgoing message automatically, with nothing to appeal', () => {
    let s = mailAt(39);
    const many = Array.from({ length: 150 }, () => ({ to: 'mother', topic: 'checkin', text: 'Thinking about home a lot this week.' }));
    s = submitLetters(s, many);
    const out = s.rejections.filter((x) => x.dir === 'out' && x.kind === 'rejected');
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].stage).toBe('superintendent');
    expect(out[0].status).toBe('pending');
    s = nextMail(s);
    expect(appealRejection(s, out[0].id)).toBe(s); // you can't appeal your own outgoing message
    const r = s.rejections.find((x) => x.id === out[0].id)!;
    expect(['overturned', 'pending']).toContain(r.status); // overturned, or passed up to Headquarters
    if (r.status === 'pending') expect(r.stage).toBe('hq');
  });
  it('ends an upheld outgoing rejection at Headquarters: kept two years, destroyed, never returned', () => {
    let s = mailAt(41);
    for (let i = 0; i < 200; i++) {
      s.rejections.push({ id: i, dir: 'out', kind: 'rejected', m: s.m - 2, noticed: s.m - 1, to: 'mother', who: 'your mother', topic: 'checkin', subject: 'Checking in', text: 'Thinking about home a lot.', reason: 'x', stage: 'hq', status: 'pending', decide: s.m + 1 });
    }
    s = nextMail(submitLetters(s, ['Thinking of you all today.']));
    const overturned = s.rejections.filter((x) => x.status === 'overturned').length;
    expect(s.rejections.every((x) => x.status !== 'pending')).toBe(true);
    expect(overturned).toBeGreaterThan(5);
    expect(overturned).toBeLessThan(45);
    expect(s.lines.some((l) => /two years and then destroyed/.test(l))).toBe(true);
    expect(s.outbox.filter((o) => o.late && o.m < s.m - 1)).toHaveLength(overturned);
  });
  it('lets you appeal a rejected message from home, twice, and delivers it if overturned', () => {
    let s = mailAt(43);
    s.rejections.push({ id: 0, dir: 'in', kind: 'rejected', m: s.m, noticed: s.m, to: 'mother', who: 'your mother', topic: 'checkin', subject: 'Re: Checking in', text: 'Love, Mom', reason: 'x', stage: 'none' });
    s = appealRejection(s, 0);
    expect(s.rejections[0].stage).toBe('superintendent');
    expect(appealRejection(s, 0)).toBe(s); // one appeal at a time
    let delivered = 0;
    let finals = 0;
    for (let seed = 1; seed <= 60; seed++) {
      let t = structuredClone(s);
      t.rng = seed;
      t = nextMail(submitLetters(t, ['Thinking of you all today.']));
      const r = t.rejections[0];
      if (r.status === 'overturned') {
        delivered++;
        expect(t.inbox.some((x) => x.text === 'Love, Mom')).toBe(true);
        continue;
      }
      expect(r.status).toBe('upheld');
      t = appealRejection(t, 0);
      expect(t.rejections[0].stage).toBe('hq');
      if (t.visitPending) t = chooseVisit(t, 'money');
      t = nextMail(submitLetters(t, ['Thinking of you all today.']));
      if (t.rejections[0].status === 'upheld') finals++;
    }
    expect(delivered).toBeGreaterThan(0);
    expect(finals).toBeGreaterThan(30);
  });
});

const general: Break = { ...forcedMajor, forced: 'minor', severity: 'minor', gen: '103', ser: undefined };
const eyes = (s: Game, breaks: Break[]) => {
  s.mo.scenesLeft = 0;
  s.mo.breaks = breaks;
  s.mo.officer = { name: 'Reyes', mood: 'decent', blurb: '' };
  s.mo.warn = false;
  s.phase = 'hub';
  s.rumors = [];
  s.char!.conspBase = -2;
  return rollEyes(s);
};

describe('discipline (WAC 137-28, DOC 460.000, DOC 460.050)', () => {
  it('a general never touches good time or visits, and puts you on the sheet', () => {
    let s = hub(31, { out: 'mother' });
    s.boxes = 2;
    s = eyes(s, [general]);
    expect(s.hearings).toHaveLength(0);
    expect(s.boxes).toBe(2);
    expect(s.lopUntil).toBe(s.m + 1);
    s = toMail(s);
    expect(s.boxes).toBe(3);
    expect(s.visitBanMonth).not.toBe(s.m + 1);
  });
  it('four generals inside ninety days become a 657', () => {
    const s = eyes(hub(33), [general, general, general, general]);
    expect(s.hearings.map((h) => h.code)).toContain('657');
  });
  it('a guilty plea takes less good time than a lost contest, and any serious suspends EFV for six months', () => {
    const fight: Break = { ...forcedMajor, ser: '505' };
    const a = plead(eyes(hub(35), [fight]), 'guilty');
    let b = plead(eyes(hub(35), [fight]), 'contest');
    for (let seed = 36; b.infractions.slice(-1)[0]?.result !== 'guilty' && seed < 80; seed++) b = plead(eyes(hub(seed), [fight]), 'contest');
    expect(a.infractions.slice(-1)[0]!.days).toBe(15);
    expect(b.infractions.slice(-1)[0]!.days).toBe(30);
    expect(a.efv.status).toBe('suspended');
    expect(a.efv.until).toBe(a.m + 6);
    expect(a.flags.noWeights).toBe(true);
    expect(toMail(a).boxes).toBe(a.boxes);
  });
  it('waits for the hearing before visiting', () => {
    const s = eyes(hub(37), [{ ...forcedMajor, ser: '505' }]);
    expect(toMail(s)).toBe(s);
  });
  it('asks before you go out under sanction, and going out is a 658', () => {
    let s = hub(39);
    s.lopUntil = s.m;
    s.yardDeck = ['cut_in_line'];
    s.mo.scenesLeft = 1;
    s.mo.lockdown = false;
    s.standing = 2;
    s = playScene(s);
    expect(s.cur!.card.id).toBe('on_sheet');
    const stay = choose(s, 'stay');
    expect(stay.standing).toBe(1);
    const go = choose(s, 'go');
    expect(go.cur!.card.id).toBe('cut_in_line');
    expect(go.mo.breaks.slice(-1)[0]!.ser).toBe('658');
  });
  it('demotes custody one level at a time after 20 points in a review period, unless the facility overrides', () => {
    const fight: Break = { ...forcedMajor, ser: '505' };
    let demoted = 0;
    let kept = 0;
    for (let seed = 50; seed < 90; seed++) {
      let s = hub(seed, { facility: 'cedar', out: 'mother' });
      s = plead(plead(eyes(s, [fight, fight]), 'guilty'), 'guilty');
      expect(s.flags.frmtPending).toBe(true);
      s = submitLetters(chooseVisit(toMail(s), 'money'), ['x']);
      if (s.custody === 'medium') {
        demoted++;
        expect(s.facilityId).toBe('harlan');
      } else {
        kept++;
        expect(s.custody).toBe('minimum');
      }
    }
    expect(demoted).toBeGreaterThan(kept);
    expect(kept).toBeGreaterThan(0);
  });
  it('promotes one level at the six-month review once the score reaches the next band', () => {
    let promoted = 0;
    let kept = 0;
    for (let seed = 60; seed < 100; seed++) {
      let s = hub(seed, { out: 'mother' });
      expect(custodyScore(s)).toBe(50);
      s.m = 6;
      s.progPoints = 5;
      s = eyes(s, []);
      while (s.hearings.length) s = plead(s, 'guilty');
      s = toMail(s);
      if (s.infractions.some((x) => x.serious)) continue;
      s = submitLetters(chooseVisit(s, 'money'), ['x']);
      if (s.ending) continue;
      expect(s.m).toBe(7);
      if (s.custody === 'minimum') {
        promoted++;
        expect(s.facilityId).toBe('cedar');
      } else kept++;
    }
    expect(promoted).toBeGreaterThan(kept);
  });
  it('a fight always brings segregation: no scenes next month, and then release', () => {
    let s = plead(eyes(hub(71, { out: 'mother' }), [{ ...forcedMajor, ser: '505' }]), 'guilty');
    expect(s.segUntil).toBe(s.m + 1);
    expect(s.segPlacements[0].discretionary).toBe(false);
    s = submitLetters(chooseVisit(toMail(s), 'money'), ['x']);
    for (let i = 0; i < 40 && s.phase !== 'hub'; i++) s = s.phase === 'card' ? choose(s, careful(s)) : continueResult(s);
    expect(s.mo.seg).toBe(true);
    expect(s.mo.scenesLeft).toBe(0);
    let v = toMail(rollEyes(s));
    while (v.phase === 'eyes') v = toMail(plead(v, 'guilty'));
    if (v.visitPending) expect(v.lines.join(' ')).toMatch(/no-contact/);
  });
  it('leaving seg from the workers tier costs the job and the cell', () => {
    let s = hub(75, { out: 'mother' });
    s.job = true;
    const cellie = s.cellieId;
    s.segUntil = s.m;
    s = eyes(s, []);
    while (s.hearings.length) s = plead(s, 'guilty');
    s = submitLetters(chooseVisit(toMail(s), 'money'), ['x']);
    expect(s.job).toBe(false);
    expect(s.cellieId).not.toBe(cellie);
  });
  it('a strip search after a visit can find a fight nobody wrote up, unless you tell them to stay home', () => {
    const fight: Break = { ...forcedMajor, forced: false, ser: '505', dice: { ...forcedMajor.dice } }; // no dice: never caught
    let found = 0;
    for (let seed = 80; seed < 120; seed++) {
      let s = eyes(hub(seed, { out: 'mother' }), [fight]);
      while (s.hearings.length) s = plead(s, 'guilty');
      s = toMail(s);
      if (!s.visitPending || s.infractions.some((x) => x.code === '505')) continue; // a kite already gave it away
      expect(s.visitRisk).toBe('fight');
      const home = chooseVisit(s, 'stayHome');
      expect(home.visitMonths).not.toContain(s.m);
      expect(home.pendingBreaks).toHaveLength(0);
      const took = chooseVisit(s, 'money');
      if (took.pendingBreaks.length) {
        found++;
        expect(took.pendingBreaks[0].ser).toBe('505');
        const next = submitLetters(took, ['x']);
        expect(next.mo.breaks.some((b) => b.ser === '505' && b.forced)).toBe(true);
      }
    }
    expect(found).toBeGreaterThan(0);
  });
  it('being attacked in front of officers leaves nothing for a strip search to find', () => {
    let s = hub(121, { out: 'mother' });
    s.cur = { card: structuredClone(YARD.get('payback')!), source: 'yard' };
    s.phase = 'card';
    s = continueResult(choose(s, 'take'));
    expect(visibleMarks(s)).toBeNull();
  });
  it('a dirty UA or a phone is not alone grounds for segregation', () => {
    for (const ser of ['675', '882']) {
      const s = plead(eyes(hub(73), [{ ...forcedMajor, ser }]), 'guilty');
      expect(s.segPlacements.filter((x) => !x.discretionary)).toHaveLength(0);
    }
  });
  it('one serious alone does not trigger a custody review', () => {
    const s = plead(eyes(hub(51), [{ ...forcedMajor, ser: '505' }]), 'guilty');
    expect(s.flags.frmtPending).toBeFalsy();
  });
  it('closes phone calls while phone privileges are restricted', () => {
    const s = hub(41, { out: 'partner_moving' });
    s.phoneUntil = s.m + 2;
    s.cur = { card: structuredClone(OUTSIDES.find((o) => o.id === 'partner_moving')!.lineHome), source: 'move' };
    const keep = s.cur.card.choices!.find((c) => c.id === 'keep')!;
    expect(lockReason(s, keep)).toMatch(/Phone/);
  });
});

describe('extended family visits (DOC 590.100)', () => {
  it('needs a visit history, then an application, then a decision', () => {
    let s = hub(43, { out: 'mother' });
    expect(efvBlock(s)).toMatch(/six visits/);
    s.visitMonths = [1, 1, 1, 1, 1, 1];
    expect(efvBlock(s)).toBeNull();
    s = applyEfv(s);
    expect(s.efv.status).toBe('applied');
    expect(s.efv.decide - s.m).toBeGreaterThanOrEqual(2);
    expect(s.efv.decide - s.m).toBeLessThanOrEqual(6);
  });
  it('is never open at Granite Close, or to someone with no family who can come', () => {
    const g = hub(45, { facility: 'granite', out: 'mother' });
    g.visitMonths = [1, 1, 1, 1, 1, 1];
    expect(efvBlock(g)).toMatch(/No extended family visits/);
    const f = hub(45, { out: 'best_friend' });
    f.visitMonths = [1, 1, 1, 1, 1, 1];
    expect(efvBlock(f)).toMatch(/immediate family/);
  });
});

describe('grooves', () => {
  const pick = (s: Game, id: string): Game => {
    s.phase = 'card';
    s.cur = { card: structuredClone(YARD.get('disrespected')!), source: 'yard' };
    return choose(s, id);
  };
  it('makes a style cost Standing to leave at tier 1, and locks the others at tier 2', () => {
    let s = hub(21);
    s.standing = 3;
    s.groove = { force: 3, tell: 0, car: 0, withdraw: 0, locked: null, used: {} };
    expect(grooveOf(s)).toEqual({ style: 'force', tier: 1 });
    const cost = s.standing;
    s = pick(s, 'let_go');
    expect(s.standing).toBeLessThan(cost);
    s.groove = { force: 6, tell: 0, car: 0, withdraw: 0, locked: 'force', used: {} };
    const letGo = YARD.get('disrespected')!.choices!.find((c) => c.id === 'let_go')!;
    s.cur = { card: structuredClone(YARD.get('disrespected')!), source: 'yard' };
    expect(lockReason(s, letGo)).toMatch(/Locked in/);
  });
  it('locks in at 6 picks and stays locked until its count falls to 3', () => {
    let s = hub(22);
    for (let i = 0; i < 6; i++) s = continueResult(pick(s, 'fight'));
    expect(s.groove.locked).toBe('force');
    s.groove.force = 4; // below tier 2 but above the break point: it stays locked
    s.hurt = false; // six fights can leave you hurt, which locks a seventh
    s = continueResult(pick(s, 'fight'));
    expect(s.groove.force).toBe(5);
    expect(s.groove.locked).toBe('force');
  });
});

describe('Stop Counting', () => {
  it('erases every box, gives 2 Standing, and makes write-ups cost no good time', () => {
    let s = hub(17);
    s.boxes = 2;
    s.standing = 1;
    s = stopCounting(s);
    expect(s.boxes).toBe(0);
    expect(s.maxBoxes).toBe(0);
    expect(s.standing).toBe(3);
    expect(releaseMonth(s)).toBe(s.sentence);
    s.mo.scenesLeft = 0;
    s.mo.breaks = [forcedMajor];
    s = plead(rollEyes(s), 'guilty');
    expect(s.boxes).toBe(0);
  });
});

describe('every choice on every card', () => {
  it('resolves without throwing, in every facility, and leaves a playable state', () => {
    let played = 0;
    for (const facility of ['cedar', 'harlan', 'granite']) {
      for (const card of everyCard()) {
        for (const ch of card.choices ?? [{ id: 'ok', label: 'ok', text: '' }]) {
          for (let seed = 1; seed <= 4; seed++) {
            const s = hub(seed * 17 + played, { facility, out: seed % 2 ? 'sister' : 'nobody_a', charge: CHARGES[(seed + played) % 12].id });
            s.commissary = 20;
            s.standing = seed;
            s.cur = { card: structuredClone(card), source: card.kind === 'count' ? 'count' : card.kind === 'yard' ? 'yard' : card.kind === 'move' ? 'move' : 'prompt', front: 0 };
            s.phase = 'card';
            const out = choose(s, ch.id);
            expect(['card', 'result', 'over']).toContain(out.phase);
            // a follow-up threat prompt must also resolve
            if (out.phase === 'card' && out.cur) {
              for (const c2 of out.cur.card.choices ?? []) {
                const again = choose(out, c2.id);
                expect(['card', 'result', 'over']).toContain(again.phase);
              }
            }
            played++;
          }
        }
      }
    }
    expect(played).toBeGreaterThan(1000);
  });
});
