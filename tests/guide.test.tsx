import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GameView, Glossary } from '../src/ui/App';
import { stepOf } from '../src/ui/Guide';
import { BACKGROUNDS, background } from '../src/engine/content';
import { beginSentence, classify, computeDice, draftPick, newGame, sentencingFactors } from '../src/engine/engine';
import { COUNT_CARDS } from '../src/content/count';
import { OFFICERS } from '../src/content/failings';
import { GLOSSARY } from '../src/content/glossary';
import type { Game } from '../src/engine/types';

const noop = () => {};
const start = (seed: number): Game => {
  const g = newGame('harlan', seed);
  return beginSentence(classify(draftPick(g, { chargeId: g.draft!.charges[0], backgroundId: g.draft!.backgrounds[0], name: 'T' })));
};

describe('backgrounds', () => {
  it('has about twenty, and a draft hand never shows two from the same group', () => {
    expect(BACKGROUNDS.length).toBe(20);
    for (let seed = 1; seed <= 300; seed++) {
      const hand = newGame('harlan', seed).draft!.backgrounds;
      expect(hand).toHaveLength(3);
      expect(new Set(hand.map((id) => background(id).ethnicity)).size).toBe(3);
    }
  });
  it('explains the deal by its factors, each pointing the same way as the research', () => {
    const f = sentencingFactors('delivery', 'b1');
    expect(f.factors.map((x) => x.id)).toEqual(['counsel', 'bail', 'priors']);
    for (const x of f.factors) if (x.bad) expect(x.ifNot).toBeLessThanOrEqual(f.yours);
    expect(f.best).toBeLessThanOrEqual(f.yours);
    expect(f.others.defender).toBeGreaterThan(f.white.defender);
    expect(f.others.held).toBeGreaterThan(f.white.held);
    expect(f.others.months).toBeGreaterThan(f.white.months);
  });
});

describe('officers', () => {
  it('every officer on a count card exists, and every officer has a card', () => {
    const named = new Set(COUNT_CARDS.map((c) => c.officer));
    for (const o of OFFICERS) expect(named.has(o.name)).toBe(true);
    for (const n of named) expect(OFFICERS.some((o) => o.name === n)).toBe(true);
    expect(OFFICERS.length).toBeGreaterThanOrEqual(11);
  });
});

describe('the dice say why they changed', () => {
  it("names Dahl's week, a double shift, and Conspicuity on the roll", () => {
    const s = start(5);
    s.mo.discBlue = 1;
    s.mo.blueMonth = -1;
    s.mo.why = [{ label: "Dahl's first week", n: 1, kind: 'disc' }, { label: 'Moss on a double shift', n: -1, kind: 'blue' }];
    const d = computeDice(s, { blue: 2, white: 3, discretionary: true });
    const labels = d.mods.map((m) => m.label);
    expect(labels).toContain("Dahl's first week");
    expect(labels).toContain('Moss on a double shift');
    // the parts add up to what is rolled
    const blueSum = d.baseBlue + d.mods.filter((m) => m.color === 'blue').reduce((a, m) => a + m.n, 0);
    expect(Math.max(0, blueSum)).toBe(d.blue);
  });
});

describe('teaching as you play', () => {
  it('always says where you are in the month', () => {
    const s = start(7);
    expect(stepOf(s).now.length).toBeGreaterThan(10);
    const html = renderToString(<GameView g={s} act={noop} countTime={noop} canRewind={false} onQuit={noop} onCards={noop} hints onAgain={noop} />);
    expect(html).toContain('class="steps"');
    expect(html).toContain('class="hint"');
  });
  it('has a glossary of the words the game uses', () => {
    for (const w of ['Car', 'Kite', 'Custody score', 'Custody levels', 'Classification', 'Administrative segregation', 'The Eyes']) {
      expect(GLOSSARY.some((e) => e.term === w)).toBe(true);
    }
    expect(renderToString(<Glossary />)).toContain('Inside talk');
  });
});
