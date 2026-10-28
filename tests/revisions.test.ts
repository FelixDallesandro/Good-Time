import { describe, expect, it } from 'vitest';
import {
  ANYONE_MOVES, BACKGROUNDS, CELLIES, CHARGES, CODE_MOVES, COUNT, OUTSIDES, PROMPTS, YARD
} from '../src/engine/content';
import { YARD_DECK_SIZE } from '../src/content/yard';
import {
  beginSentence, choose, chooseVisit, computeDice, conspFacts, continueResult, draftPick, newGame, preview,
  pullCard, rollEyes, stopCounting, submitLetters, toMail, releaseMonth, grooveOf, lockReason
} from '../src/engine/engine';
import { careful } from '../src/engine/autoplay';
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
  title: 'x', severity: 'major', forced: 'major',
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
  it('gives every case its sentence: 12 months plus 2 per cross, up to 18', () => {
    for (const b of BACKGROUNDS) {
      expect(b.case).toHaveLength(3);
      expect(b.sentence).toBe(12 + 2 * b.case.filter((c) => c.bad).length);
      expect(b.sentence).toBeLessThanOrEqual(18);
    }
  });
  it("matches the designer's note on average sentences", () => {
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(avg(BACKGROUNDS.filter((b) => b.ethnicity === 'White').map((b) => b.sentence))).toBe(15);
    const others = avg(BACKGROUNDS.filter((b) => b.ethnicity !== 'White').map((b) => b.sentence));
    expect(others).toBeGreaterThan(16);
    expect(others).toBeLessThan(16.5);
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
  it('starts from the case, not from a flat 12', () => {
    expect(hub(3, { bg: 'b1' }).sentence).toBe(18);
    expect(hub(3, { bg: 'b2' }).sentence).toBe(12);
  });
  it('never adds more than 3 months during play, however many majors you take', () => {
    let s = hub(5, { facility: 'granite', bg: 'b9' });
    const base = s.sentence;
    for (let i = 0; i < 6; i++) {
      s.mo.scenesLeft = 0;
      s.mo.breaks = [forcedMajor];
      s.phase = 'hub';
      s = rollEyes(s);
      s.phase = 'hub';
    }
    expect(s.sentence - base).toBe(3);
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
    return toMail(s);
  };
  it('starts from the Outside card, and never exceeds 3', () => {
    expect(hub(9, { out: 'mother' }).support).toBeGreaterThanOrEqual(2);
    expect(hub(9, { out: 'nobody_a' }).support).toBeLessThanOrEqual(1);
    for (let seed = 1; seed < 40; seed++) expect(hub(seed, { out: 'sister' }).support).toBeLessThanOrEqual(3);
  });
  it('gives a clean month with Support a visit you must settle before the letter', () => {
    let s = toMailPhase(11, 'mother');
    expect(s.visitPending).toBe(true);
    expect(submitLetters(s, ['hi']).phase).toBe('mail');
    const before = s.commissary;
    s = chooseVisit(s, 'money');
    expect(s.commissary).toBe(before + s.support);
    expect(submitLetters(s, ['hi']).phase).not.toBe('mail');
  });
  it('gives no visit at Support 0 and writes to a notebook instead', () => {
    let s = hub(13, { out: 'nobody_a' });
    s.support = 0;
    s.mo.scenesLeft = 0;
    s.mo.breaks = [];
    s = toMail(rollEyes(s));
    expect(s.visitPending).toBe(false);
    s = submitLetters(s, ['no one will read this']);
    expect(s.letters[0].notebook).toBe(true);
    expect(s.letters[0].lines[0].status).toBe('sent');
  });
  it('gives contact restored from Support 0 no visit and no EFV until the questionnaire clears', () => {
    const mailAt = (ready: number) => {
      let s = hub(17, { out: 'nobody_a' });
      s.support = 1;
      s.visitReadyMonth = ready;
      s.cleanStreak = 2;
      s.mo.scenesLeft = 0;
      s.mo.breaks = [];
      s.mo.caught = false;
      s.visitBanMonth = 0;
      s.mo.noVisits = false;
      return toMail(rollEyes(s));
    };
    const waiting = mailAt(99);
    expect(waiting.visitPending).toBe(false);
    expect(waiting.efv).toBe(false);
    const cleared = mailAt(0);
    expect(cleared.visitPending).toBe(true);
  });
  it('lets staff hold messages that mention staff far more often than ordinary ones', () => {
    let hot = 0;
    let cold = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const mk = (text: string) => {
        let s = toMailPhase(seed, 'mother');
        s = chooseVisit(s, 'money');
        s.mo.noMessages = false;
        s.mo.delayMessages = false;
        return submitLetters(s, [text]).letters[0].lines[0].status;
      };
      if (mk('The officers here are fine and the yard is quiet.') === 'held') hot++;
      if (mk('The weather is nice.') === 'held') cold++;
    }
    expect(hot).toBeGreaterThan(cold * 2);
  });
  it('a major suspends visits for the rest of the act and lowers Support', () => {
    let s = hub(15, { out: 'sister' });
    const sup = s.support;
    s.mo.scenesLeft = 0;
    s.mo.breaks = [forcedMajor];
    s = rollEyes(s);
    expect(s.support).toBe(sup - 1);
    expect(s.visitBanAct).not.toBe('');
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
    s = rollEyes(s);
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
