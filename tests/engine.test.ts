import { describe, expect, it } from 'vitest';
import { caughtChance, ledgerRows, modFor, newGame, draftPick, computeDice, consp } from '../src/engine/engine';
import { playGame, randomPolicy, careful } from '../src/engine/autoplay';

describe('the Eyes', () => {
  it('matches the doc: 1 die 17%, 3 dice 42%, 5 dice 60%', () => {
    expect(caughtChance(1)).toBeCloseTo(0.167, 2);
    expect(caughtChance(3)).toBeCloseTo(0.421, 2);
    expect(caughtChance(5)).toBeCloseTo(0.598, 2);
  });
  it('maps 3d6 to modifiers per the stat table', () => {
    expect([3, 5, 6, 8, 9, 12, 13, 15, 16, 18].map(modFor)).toEqual([-2, -2, -1, -1, 0, 0, 1, 1, 2, 2]);
  });
});

describe('Conspicuity', () => {
  it('only adds blue dice on discretionary rules, never objective ones', () => {
    let s = newGame('harlan', 42);
    s = draftPick(s, {
      chargeId: s.draft!.charges[0], backgroundId: s.draft!.backgrounds[0],
      outsideId: s.draft!.outsides[0], name: 'T'
    });
    s.char!.conspBase = 2;
    s.consBonus = 0;
    s.mo.officer = { name: 'Reyes', mood: 'exhausted', blurb: '' };
    s.char!.knownOfficer = undefined;
    const objective = computeDice(s, { blue: 1, white: 3 });
    const discretionary = computeDice(s, { blue: 1, white: 3, discretionary: true });
    expect(consp(s)).toBe(2);
    expect(discretionary.blue - objective.blue).toBe(2);
    expect(discretionary.white).toBe(objective.white);
  });
});

describe('whole sentences', () => {
  it('always terminate, in every facility, with a random policy', () => {
    for (const facilityId of ['cedar', 'harlan', 'granite']) {
      for (let seed = 1; seed <= 150; seed++) {
        const s = playGame(seed, { facilityId, policy: randomPolicy });
        expect(s.phase).toBe('over');
        expect(s.ending).not.toBeNull();
      }
    }
  });
  it('are deterministic for a seed', () => {
    const a = playGame(7, { policy: careful });
    const b = playGame(7, { policy: careful });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('release is never earlier than the boxes allow', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const s = playGame(seed, { policy: careful });
      if (s.ending === 'released') {
        expect(s.m).toBeGreaterThanOrEqual(s.sentence - s.maxBoxes);
        expect(s.m).toBeLessThanOrEqual(s.sentence);
      }
    }
  });
  it('shows higher expected catches for higher Conspicuity on the ledger', () => {
    const s = playGame(11, { policy: careful });
    const rows = ledgerRows(s);
    expect(rows[4].expectedCaught).toBeGreaterThanOrEqual(rows[0].expectedCaught);
  });
});
