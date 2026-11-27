import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GameView } from '../src/ui/App';
import { careful, endDemo } from '../src/engine/autoplay';
import { beginSentence, choose, classify, continueResult, draftPick, newGame, playScene, rollEyes, applyEfv } from '../src/engine/engine';
import type { Game } from '../src/engine/types';

const noop = () => {};
const render = (g: Game) =>
  renderToString(<GameView g={g} act={noop} countTime={noop} canRewind={false} onQuit={noop} onCards={noop} onAgain={noop} />);

const drafted = (seed: number) => {
  const g = newGame('harlan', seed);
  return draftPick(g, { chargeId: g.draft!.charges[0], backgroundId: g.draft!.backgrounds[0], name: 'Presenter' });
};

/** Plays a few months by hand, the way a presenter would, and stops mid-sentence. */
function played(seed: number, months: number): Game {
  let s = beginSentence(classify(drafted(seed)));
  for (let guard = 0; guard < 400 && s.m <= months && s.phase !== 'over'; guard++) {
    if (s.phase === 'card') s = choose(s, careful(s));
    else if (s.phase === 'result') s = continueResult(s);
    else if (s.phase === 'hub') s = s.mo.scenesLeft > 0 ? playScene(applyEfv(s)) : rollEyes(s);
    else break; // stop at the Eyes or mail: mid-month
  }
  return s;
}

describe('demo mode', () => {
  it('ends from any phase and plays out the rest', () => {
    for (let seed = 1; seed <= 6; seed++) {
      for (const g of [newGame('harlan', seed), drafted(seed), classify(drafted(seed)), played(seed, 3)]) {
        const end = endDemo(g);
        expect(end.phase).toBe('over');
        expect(end.demo).toBeTruthy();
        expect(end.ending).not.toBeNull();
      }
    }
  });

  it('keeps the player\'s decisions apart from the ones made for them', () => {
    const g = played(12, 6);
    const mine = g.decisions.length;
    expect(mine).toBeGreaterThan(2); // the draft, the court, and at least one card
    expect(g.decisions[0].what).toBe('Draft');
    expect(g.decisions[1].what).toBe('Court');
    const end = endDemo(g);
    expect(end.demo!.decisions).toBe(mine);
    expect(end.decisions.slice(0, mine)).toEqual(g.decisions);
    expect(end.decisions.length).toBeGreaterThan(mine);
    expect(end.demo!.stats).toEqual(g.stats);
  });

  it('renders the decisions and talking points first in the epilogue', () => {
    const end = endDemo(played(5, 2));
    const html = render(end);
    expect(html).toContain('Your decisions');
    expect(html).toContain('Talking points');
    expect(html.indexOf('Your decisions')).toBeLessThan(html.indexOf('What moved your number'));
    for (const t of ['<b>Institutionalization', '<b>Compromise', '<b>Disparity']) expect(html).toContain(t);
    // a whole game played normally has no demo panel
    const normal = endDemo(newGame('harlan', 5));
    expect(render({ ...normal, demo: null })).not.toContain('Your decisions');
  });
});

describe('the player\'s dice', () => {
  it('shows the player\'s own rolls on the result, never the Eyes', () => {
    let withDice = 0;
    for (let seed = 1; seed <= 40; seed++) {
      let s = beginSentence(classify(drafted(seed)));
      for (let guard = 0; guard < 600 && s.phase !== 'over' && s.phase !== 'release'; guard++) {
        if (s.phase === 'result' && s.result!.dice?.length) {
          withDice++;
          for (const r of s.result!.dice) {
            expect(r.faces.every((f) => f >= 1 && f <= 6)).toBe(true);
            expect(r.label).not.toMatch(/Eyes/);
          }
          const html = render(s);
          expect(html).toContain('class="d6"');
        }
        if (s.phase === 'card') s = choose(s, careful(s));
        else if (s.phase === 'result') s = continueResult(s);
        else if (s.phase === 'hub') s = s.mo.scenesLeft > 0 ? playScene(applyEfv(s)) : rollEyes(s);
        else s = endDemo(s);
      }
    }
    expect(withDice).toBeGreaterThan(0);
  });
});
