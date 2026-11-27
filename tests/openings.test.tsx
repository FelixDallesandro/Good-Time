import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GameView } from '../src/ui/App';
import { careful } from '../src/engine/autoplay';
import { codeMove, outside } from '../src/engine/content';
import {
  applyEfv, beginSentence, chooseVisit, choose, classify, continueResult, draftPick, newGame, plead, playScene, primaryTie, rollEyes, tieActive,
  submitLetters, toMail
} from '../src/engine/engine';
import { openings, passOpenings, pendingOpenings, takeOpening } from '../src/engine/openings';
import type { Game } from '../src/engine/types';

const noop = () => {};

/** Play to the first hub of the sentence. */
function hub(seed: number): Game {
  const g = newGame('harlan', seed);
  let s = beginSentence(classify(draftPick(g, { chargeId: g.draft!.charges[0], backgroundId: g.draft!.backgrounds[0], name: 'T' })));
  for (let i = 0; i < 80 && s.phase !== 'hub'; i++) s = s.phase === 'card' ? choose(s, careful(s)) : continueResult(s);
  return s;
}
const ids = (g: Game) => openings(g).map((o) => o.id);

describe('openings come from the situation, not a menu', () => {
  it('offers nothing on a quiet first month', () => {
    const s = hub(3);
    s.rumors = [];
    s.strings = [];
    s.commissary = 5;
    s.support = 2;
    s.infractions = [];
    expect(ids(s).filter((x) => !['efv', 'pen_pal'].includes(x))).toEqual([]);
  });
  it('asks about confessing only when the secret is one rumor from coming out', () => {
    const s = hub(4);
    const tag = s.char!.privateTag;
    s.rumors = [{ tag }];
    expect(ids(s)).not.toContain('confess');
    s.rumors = [{ tag }, { tag }];
    expect(ids(s)).toContain('confess');
    const o = openings(s).find((x) => x.id === 'confess')!;
    expect(o.why).toMatch(/One more/);
    expect(o.cost).toMatch(/Standing/);
    expect(o.gain).toMatch(/costs less/);
  });
  it('asks about paying a debt only with a debt and the store to pay it', () => {
    const s = hub(5);
    s.strings = [{ type: 'debt', to: 'the store man' }];
    s.commissary = 3;
    expect(ids(s)).not.toContain('pay_debt');
    s.commissary = 8;
    expect(ids(s)).toContain('pay_debt');
    const paid = takeOpening(s, 'pay_debt');
    expect(paid.strings).toHaveLength(0);
    expect(paid.commissary).toBe(2);
    expect(paid.decisions[paid.decisions.length - 1].what).toBe('Opening');
  });
  it('asks about stopping the count only when there is little good time left to protect', () => {
    const s = hub(6);
    s.maxBoxes = s.baseBoxes;
    expect(ids(s)).not.toContain('stop');
    s.maxBoxes = 1;
    expect(ids(s)).toContain('stop');
    expect(openings(s).find((x) => x.id === 'stop')!.oneWay).toBe(true);
  });
  it('remembers a pass until the situation changes', () => {
    const s = hub(7);
    const tag = s.char!.privateTag;
    s.rumors = [{ tag: tag === 'debt' ? 'family' : 'debt' }, { tag: tag === 'debt' ? 'family' : 'debt' }];
    expect(pendingOpenings(s).map((o) => o.id)).toContain('deny');
    const passed = passOpenings(s);
    expect(pendingOpenings(passed).map((o) => o.id)).not.toContain('deny');
    passed.rumors.push({ tag: 'weak' });
    expect(pendingOpenings(passed).map((o) => o.id)).toContain('deny');
  });
  it('shows openings on their own screen, before the tier', () => {
    const s = hub(8);
    s.strings = [{ type: 'debt', to: 'your car' }];
    s.commissary = 9;
    const html = renderToString(<GameView g={s} act={noop} countTime={noop} canRewind={false} onQuit={noop} onCards={noop} onAgain={noop} />);
    expect(html).toContain('Would you like to take an additional action this turn?');
    expect(html).toContain('Why now.');
    expect(html).not.toContain('Play the next scene');
    const after = renderToString(<GameView g={passOpenings(s)} act={noop} countTime={noop} canRewind={false} onQuit={noop} onCards={noop} onAgain={noop} />);
    expect(after).toContain('Play the next scene');
    expect(after).not.toContain('Confess');
  });
});

describe('moves are moments', () => {
  it('brings your Code and Line Home moments to you before the sentence ends', () => {
    let code = 0, line = 0, games = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const g = newGame('harlan', seed);
      let s = beginSentence(classify(draftPick(g, { chargeId: g.draft!.charges[0], backgroundId: g.draft!.backgrounds[1], name: 'T' })));
      const c = codeMove(s.char!.codeMoveId).id;
      const lh = outside(s.char!.outsideId).lineHome.id;
      let sawCode = false, sawLine = false;
      for (let guard = 0; guard < 4000 && s.phase !== 'over' && s.phase !== 'release'; guard++) {
        if (s.phase === 'card') {
          if (s.cur!.card.id === c) sawCode = true;
          if (s.cur!.card.id === lh) sawLine = true;
          s = choose(s, careful(s));
        } else if (s.phase === 'result') s = continueResult(s);
        else if (s.phase === 'hub') s = s.mo.scenesLeft > 0 ? playScene(applyEfv(s)) : rollEyes(s);
        else if (s.phase === 'eyes') s = s.hearings.length ? plead(s, 'guilty') : toMail(s);
        else if (s.phase === 'mail') s = s.visitPending ? chooseVisit(s, 'money') : submitLetters(s, ['ok']);
      }
      if (s.ending !== 'released' && s.ending !== null) continue; // a sentence cut short may not get there
      games++;
      if (sawCode) code++;
      const p = primaryTie(s);
      if (sawLine || !p || !tieActive(s, p)) line++; // with your person gone, that moment never comes
    }
    expect(games).toBeGreaterThan(10);
    expect(code).toBe(games);
    expect(line).toBe(games);
  });
});
