import { describe, expect, it } from 'vitest';
import { CHARGES } from '../src/engine/content';
import { ANYONE_MOVES } from '../src/engine/content';
import { careful, playGame } from '../src/engine/autoplay';
import {
  advanceRelease, beginSentence, choose, computeDice, continueResult, displayName, pullCard, draftPick, lockReason, newGame, releaseCard, routineLevel
} from '../src/engine/engine';
import { CATEGORIES, CHARGE_CATEGORY, WA_ALL, WA_BY_CUSTODY, estimate, rateFor } from '../src/content/recidivism';
import type { Game } from '../src/engine/types';

const start = (seed = 3, out = 'mother') => {
  let s = newGame('harlan', seed);
  s = draftPick(s, { chargeId: s.draft!.charges[0], backgroundId: s.draft!.backgrounds[0], outsideId: out, name: 'Dee' });
  return beginSentence(s);
};

describe('the DOC number and Routine', () => {
  const withBg = (bg: string, seed: number) => {
    let s = newGame('harlan', seed);
    s = draftPick(s, { chargeId: 'burglary', backgroundId: bg, outsideId: 'mother', name: 'Dee' });
    return s;
  };
  it('issues a new six-digit 4-series number to someone on their first time down', () => {
    for (let seed = 1; seed < 30; seed++) expect(withBg('b2', seed).char!.docNumber).toMatch(/^4\d{5}$/);
  });
  it('gives someone who has been down before their old number: 8-series if old enough, else 3 or 4', () => {
    const series = new Set<string>();
    for (let seed = 1; seed < 40; seed++) {
      expect(withBg('b12', seed).char!.docNumber).toMatch(/^8\d{5}$/); // 58: first committed before they stopped
      const young = withBg('b1', seed).char!.docNumber; // 24
      expect(young).toMatch(/^[34]\d{5}$/);
      series.add(young[0]);
    }
    expect([...series].sort()).toEqual(['3', '4']);
    expect(withBg('b10', 1).char!.docNumber).toMatch(/^4/); // one prior, pleaded down: never a prison number
  });
  it('makes the Pull harder to walk past, and the file heavier, with prior arrests', () => {
    const clean = withBg('b2', 1);
    const priors = withBg('b10', 1);
    const spec = { blue: 1, discretionary: true };
    clean.mo.officer = priors.mo.officer = { name: 'Moss', mood: 'exhausted', blurb: '' };
    expect(computeDice(priors, spec).blueNo - computeDice(clean, spec).blueNo).toBe(1);
    expect(computeDice(priors, { blue: 1 }).blueNo).toBe(computeDice(clean, { blue: 1 }).blueNo); // only discretionary rules
    const def = Object.keys(priors.pull)[0];
    expect(pullCard(priors, { id: def, rule: 'retail', title: 't', text: 't' }).choices![0].text).toMatch(/1-5 you give in/);
    expect(pullCard(clean, { id: Object.keys(clean.pull)[0], rule: 'retail', title: 't', text: 't' }).choices![0].text).toMatch(/1-4 you give in/);
  });
  it('raises the recidivism figure for a prior prison term', () => {
    expect(estimate('burglary', 'medium', true).y3).toBeGreaterThan(estimate('burglary', 'medium', false).y3);
  });
  it('starts someone who has been down before further along', () => {
    expect(routineLevel(withBg('b2', 1))).toBe(0);
    expect(routineLevel(withBg('b1', 1))).toBe(1);
    expect(routineLevel(withBg('b12', 1))).toBe(2);
  });

  it('lets the number take the name over', () => {
    const s = start();
    s.routine = 0;
    expect(displayName(s)).toBe('Dee');
    s.routine = 8;
    expect(displayName(s)).toBe(`Dee, ${s.char!.docNumber}`);
    s.routine = 12;
    expect(displayName(s)).toBe(s.char!.docNumber);
  });

  it('grows over a sentence, and closes things you used to do', () => {
    const g = playGame(5, { policy: careful });
    expect(g.routine).toBeGreaterThanOrEqual(5); // even with family in touch every month
    const s = start();
    s.routine = 12;
    s.cur = { card: structuredClone(ANYONE_MOVES.find((m) => m.id === 'any_grievance')!), source: 'move' };
    expect(lockReason(s, s.cur.card.choices!.find((c) => c.id === 'file')!)).toMatch(/don't file/);
    s.routine = 0;
    expect(lockReason(s, s.cur.card.choices!.find((c) => c.id === 'file')!)).toBeNull();
  });

  it('adds count to the month as it grows', () => {
    let counts = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const g = playGame(seed * 13, { policy: careful });
      if (routineLevel(g) >= 2) counts++;
    }
    expect(counts).toBeGreaterThan(0);
  });
});

describe('the release act', () => {
  it('walks from release day to the epilogue in four steps', () => {
    let g: Game | null = null;
    for (let seed = 1; seed < 40 && !g; seed++) {
      const x = playGame(seed, { policy: careful });
      if (x.ending === 'released') g = x;
    }
    expect(g!.release!.step).toBe(4);
    expect(Object.keys(g!.release!.picks)).toEqual(['Release Day', 'The Gate', 'The First Night', 'The First Week']);
  });

  it('only offers the man who got out if he is still in your life', () => {
    const s = start(7, 'nobody_b');
    s.phase = 'release';
    s.release = { step: 2, picks: {} };
    expect(releaseCard(s)!.choices.map((c) => c.id)).not.toContain('got_out');
    s.ties.push({ id: 'got_out', who: 'the man who got out', to: 'x', role: 'friend', weight: 1, visits: true, efv: false, gone: false, ready: 0 });
    expect(releaseCard(s)!.choices.map((c) => c.id)).toContain('got_out');
    expect(advanceRelease(s, 'nope')).toBe(s);
  });
});

describe('recidivism figures', () => {
  it('measures every charge against its own category of crime', () => {
    for (const c of CHARGES) {
      expect(CHARGE_CATEGORY[c.id], c.id).toBeTruthy();
      const r = rateFor(c.id);
      expect(r.y10).toBeGreaterThan(r.y3);
    }
    expect(rateFor('burglary')).toBe(CATEGORIES.property);
    expect(rateFor('delivery')).toBe(CATEGORIES.drug);
    expect(rateFor('stolen_vehicle')).toBe(CATEGORIES.property);
    expect(rateFor('assault')).toBe(CATEGORIES.violent);
  });
  it('keeps the estimate tied to the crime and below 100', () => {
    for (const cat of Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]) {
      const id = Object.keys(CHARGE_CATEGORY).find((k) => CHARGE_CATEGORY[k] === cat)!;
      for (const cust of ['minimum', 'medium', 'close']) {
        for (const prior of [false, true]) {
          const e = estimate(id, cust, prior);
          expect(e.y3).toBeLessThan(100);
          expect(e.y3).toBeGreaterThan(30);
          expect(e.base).toBe(CATEGORIES[cat].y3);
        }
      }
    }
    // same custody, same record: property stays above violent, as the data has it
    expect(estimate('burglary', 'medium').y3).toBeGreaterThan(estimate('assault', 'medium').y3);
  });
  it('rises with custody level, as the Washington data does', () => {
    expect(WA_BY_CUSTODY.minimum).toBeLessThan(WA_ALL);
    expect(WA_BY_CUSTODY.close).toBeGreaterThan(WA_BY_CUSTODY.medium);
    expect(estimate('burglary', 'close').y3).toBeGreaterThan(estimate('burglary', 'minimum').y3);
  });
});
