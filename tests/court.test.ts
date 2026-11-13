import { describe, expect, it } from 'vitest';
import { BACKGROUNDS, CHARGES } from '../src/engine/content';
import { beginSentence, choose, newCaseCard, chooseCourt, clock, draftPick, newGame, refuseOffer, releaseMonth, syncBoxes, TREATMENT_MISSES } from '../src/engine/engine';
import { CASES, FACTS, INSIDE_CASE, insideSentence, MIN_TURNS, range, sentenceFor, timeScale, type Fact } from '../src/content/sentencing';
import type { Game } from '../src/engine/types';
import { playGame } from '../src/engine/autoplay';

const intake = (charge: string, bg: string): Game =>
  draftPick(newGame('harlan', 7), { chargeId: charge, backgroundId: bg, outsideId: 'mother', name: 'T' });

describe('the sentencing grid', () => {
  it('reads RCW 9.94A.510 and .517 cells correctly', () => {
    expect(range('felony', 4, 0)).toMatchObject({ low: 3, high: 9 });
    expect(range('felony', 4, 2)).toMatchObject({ low: 12, high: 14, plus: true });
    expect(range('felony', 9, 0)).toMatchObject({ low: 31, high: 41 });
    expect(range('felony', 1, 0)).toMatchObject({ days: 60 });
    expect(range('felony', 3, 9)).toMatchObject({ low: 51, high: 68 });
    expect(range('drug', 2, 2)).toMatchObject({ low: 12, high: 20, plus: true });
    expect(range('drug', 2, 3)).toMatchObject({ low: 20, high: 60 });
  });

  it('has a sheet for every charge, and every pairing is a prison term with trial worse than the deal', () => {
    for (const c of CHARGES) {
      expect(CASES[c.id], c.id).toBeTruthy();
      for (const b of BACKGROUNDS) {
        const bad = b.case.map((x) => x.bad);
        const deal = sentenceFor(c.id, b.score, 'deal', bad);
        const trial = sentenceFor(c.id, b.score, 'trial', bad);
        expect(deal.months, `${c.id}/${b.id}`).toBeGreaterThanOrEqual(12);
        expect(trial.months, `${c.id}/${b.id}`).toBeGreaterThan(deal.months);
        // the agreed number sits inside the reduced range
        expect(deal.base).toBeGreaterThanOrEqual(deal.range.low);
        expect(deal.base).toBeLessThanOrEqual(deal.range.high);
      }
    }
  });

  it('never plays fewer than 12 turns, even with every day of earned release', () => {
    for (const c of CHARGES)
      for (const b of BACKGROUNDS)
        for (const path of ['deal', 'trial'] as const) {
          const t = timeScale(sentenceFor(c.id, b.score, path, b.case.map((x) => x.bad)));
          expect(t.turns - t.boxes).toBeGreaterThanOrEqual(MIN_TURNS);
          expect(t.turns - t.boxes).toBeLessThanOrEqual(16);
        }
  });

  it('caps earned release at a third, and none on a deadly weapon enhancement', () => {
    const rob = sentenceFor('robbery', 0, 'trial', [false, false]);
    expect(rob.months).toBe(41 + 24);
    expect(rob.earnedMax).toBe(Math.floor(41 / 3));
    const elude = sentenceFor('eluding', 0, 'deal', [false, false]);
    expect(elude.earnedMax).toBe(Math.floor(elude.months / 3)); // the eluding enhancement is not excluded
  });
});

describe('the court at intake', () => {
  it('starts on the deal, and trial costs more turns', () => {
    const s = intake('robbery', 'b3');
    expect(s.court!.path).toBe('deal');
    expect(s.court!.talked).toBe(false);
    const t = chooseCourt(s, 'trial');
    expect(t.court!.path).toBe('trial');
    expect(t.court!.months).toBeGreaterThan(s.court!.months);
    expect(releaseMonth(t)).toBeGreaterThanOrEqual(12);
  });
  it('only lets you choose before the sentence begins', () => {
    const s = beginSentence(intake('burglary', 'b2'));
    expect(chooseCourt(s, 'trial')).toBe(s);
  });
  it('shows the real calendar', () => {
    const s = chooseCourt(intake('robbery', 'b3'), 'trial');
    expect(clock(s, 10)).toMatch(/^month \d+$/);
    const short = intake('burglary', 'b2'); // 12 months and a day: 8 served across 12 turns
    expect(clock(short, 12)).toMatch(/^week /);
  });
});

describe('treatment', () => {
  it('holds you to your max date when you are terminated from the program', () => {
    const s = beginSentence(intake('burglary', 'b2'));
    s.boxes = s.maxBoxes;
    s.treatment.misses = TREATMENT_MISSES;
    s.treatment.failed = true;
    syncBoxes(s);
    expect(s.maxBoxes).toBe(0);
    expect(releaseMonth(s)).toBe(s.sentence);
  });
});

describe('telling what you know', () => {
  it('is only on the table where there is someone to tell on', () => {
    expect(chooseCourt(intake('assault', 'b3'), 'deal', true).court!.talked).toBe(false);
    const rob = chooseCourt(intake('robbery', 'b3'), 'deal', true);
    expect(rob.court!.talked).toBe(true);
    expect(rob.court!.months).toBeLessThan(intake('robbery', 'b3').court!.months);
    expect(chooseCourt(intake('robbery', 'b3'), 'trial', true).court!.talked).toBe(false);
  });
  it('buys nothing when paid counsel already got the bottom of the range', () => {
    const s = intake('robbery', 'b2');
    expect(chooseCourt(s, 'deal', true).court!.months).toBe(s.court!.months);
  });
  it('can come out, or not, across sentences', () => {
    let out = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const g = draftPick(newGame('harlan', seed), { chargeId: 'robbery', backgroundId: 'b3', outsideId: 'mother', name: 'T' });
      const s = beginSentence(chooseCourt(g, 'deal', true));
      if (s.flags.exposeAt) out++;
    }
    expect(out).toBeGreaterThan(60); // codefendant 50% or paper 25%: about 62%
    expect(out).toBeLessThan(150);
  });
  it('a paperwork card pins cooperation rumors; checking in ends on protective custody', () => {
    const g = draftPick(newGame('harlan', 3), { chargeId: 'robbery', backgroundId: 'b3', outsideId: 'mother', name: 'T' });
    let s = beginSentence(chooseCourt(g, 'deal', true));
    s.flags.exposeHow = 0;
    s.cur = { card: { id: 'paperwork', kind: 'prompt', title: 'Paperwork', text: '', choices: [
      { id: 'deny', label: 'Deny it', text: '', effect: { paperwork: 'deny' } },
      { id: 'pc', label: 'Check in', text: '', effect: { paperwork: 'pc' } }
    ] } } as Game['cur'];
    s.phase = 'card';
    const denied = choose(s, 'deny');
    expect(denied.rumors.filter((r) => r.tag === 'cooperation').length).toBeGreaterThanOrEqual(2);
    expect(denied.flags.exposed).toBe(true);
    expect(choose(s, 'pc').ending).toBe('pc');
  });
});

describe('turning down the first offer', () => {
  it('happens once, and comes back better, the same, or worse', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const g = draftPick(newGame('harlan', seed), { chargeId: 'burglary', backgroundId: 'b3', outsideId: 'mother', name: 'T' });
      const r = refuseOffer(g);
      seen.add(r.court!.offer);
      expect(refuseOffer(r)).toBe(r);
      if (r.court!.offer === 'better') expect(r.court!.months).toBeLessThanOrEqual(g.court!.months);
      if (r.court!.offer === 'worse') expect(r.court!.months).toBeGreaterThanOrEqual(g.court!.months);
    }
    expect([...seen].sort()).toEqual(['better', 'same', 'worse']);
  });
});

describe('the facts of the arrest', () => {
  const all = Object.keys(FACTS) as Fact[];
  it('keeps every pairing a prison term, trial worse than the deal, and 12 to 16 served turns', () => {
    for (const c of CHARGES)
      for (const b of BACKGROUNDS) {
        const facts = all.filter((f) => FACTS[f].charges.includes(c.id));
        const bad = b.case.map((x) => x.bad);
        const deal = sentenceFor(c.id, b.score, 'deal', bad, { facts });
        const trial = sentenceFor(c.id, b.score, 'trial', bad, { facts });
        expect(deal.months).toBeGreaterThanOrEqual(12);
        expect(trial.months).toBeGreaterThan(deal.months);
        for (const sen of [deal, trial]) {
          const t = timeScale(sen);
          expect(t.turns - t.boxes).toBeGreaterThanOrEqual(MIN_TURNS);
          expect(t.turns - t.boxes).toBeLessThanOrEqual(16);
        }
      }
  });
  it('running adds an eluding count to both sheets and the endangerment enhancement at trial', () => {
    const plain = sentenceFor('stolen_vehicle', 0, 'trial', [false, false]);
    const ran = sentenceFor('stolen_vehicle', 0, 'trial', [false, false], { facts: ['ran'] });
    expect(ran.score).toBe(plain.score + 1);
    expect(ran.enhs.map((e) => e.label)).toContain('endangerment enhancement');
    const deal = sentenceFor('stolen_vehicle', 0, 'deal', [false, false], { facts: ['ran'] });
    expect(deal.extra.length).toBe(1);
    expect(deal.enhs.length).toBe(0);
  });
  it('a gun makes the robbery enhancement five years flat; a child passenger is twelve months flat', () => {
    const rob = sentenceFor('robbery', 0, 'trial', [false, false], { facts: ['gun'] });
    expect(rob.months).toBe(41 + 60);
    expect(rob.earnedMax).toBe(Math.floor(41 / 3));
    const dui = sentenceFor('vehicular', 0, 'trial', [false, false], { facts: ['child'] });
    const plain = sentenceFor('vehicular', 0, 'trial', [false, false]);
    expect(dui.months).toBe(plain.months + 12);
    expect(dui.earnedMax).toBe(plain.earnedMax);
  });
  it('ignores facts that do not belong to the charge', () => {
    expect(sentenceFor('firearm', 0, 'trial', [false, false], { facts: ['ran', 'gun', 'child'] }).months)
      .toBe(sentenceFor('firearm', 0, 'trial', [false, false]).months);
  });
  it('rolls the facts at intake, and some running cases show up', () => {
    let ran = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s = draftPick(newGame('harlan', seed), { chargeId: 'stolen_vehicle', backgroundId: 'b2', outsideId: 'mother', name: 'T' });
      if (s.court!.facts.includes('ran')) ran++;
    }
    expect(ran).toBeGreaterThan(5);
    expect(ran).toBeLessThan(40);
  });
});

describe('a drug offense inside (RCW 9.94A.533(5))', () => {
  it('adds 18 months at trial, drops it on the deal, and reads the drug grid', () => {
    const deal = insideSentence(4, 'deal', [true, true]);
    const trial = insideSentence(4, 'trial', [true, true]);
    expect(deal.range).toMatchObject({ low: 20, high: 60 });
    expect(trial.months).toBe(60 + INSIDE_CASE.enh.months);
    expect(deal.enhMonths).toBe(0);
  });
  it('a new case runs consecutive: no release act, and the epilogue knows', () => {
    const g = draftPick(newGame('harlan', 3), { chargeId: 'delivery', backgroundId: 'b3', outsideId: 'mother', name: 'T' });
    let s = beginSentence(g);
    s.cur = { card: newCaseCard(s) } as Game['cur'];
    s.phase = 'card';
    s = choose(s, 'deal');
    expect(Number(s.flags.newMonths)).toBeGreaterThanOrEqual(12);
    expect(s.flags.newCaseAt).toBeUndefined();
  });
  it('whole games with a referral end on the hold, not at the gate', () => {
    let checked = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const s = playGame(seed, { flags: { newCaseAt: 3 } });
      if (s.ending !== 'released') continue; // protective custody or a medical: no date to hold
      checked++;
      expect(Number(s.flags.newMonths)).toBeGreaterThanOrEqual(12);
      expect(s.phase).toBe('over');
      expect(s.release).toBeFalsy();
    }
    expect(checked).toBeGreaterThanOrEqual(3);
    // charged too late to plead before the date: the plea happens on the hold
    const late = [9, 10, 11, 12, 13].map((n) => playGame(n, { flags: { newCaseAt: 99 } })).find((x) => x.ending === 'released')!;
    expect(Number(late.flags.newMonths)).toBeGreaterThanOrEqual(12);
    expect(late.release).toBeFalsy();
  });
});
