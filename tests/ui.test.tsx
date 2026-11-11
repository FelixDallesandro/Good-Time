import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GameView } from '../src/ui/App';
import { careful, randomPolicy } from '../src/engine/autoplay';
import { CHARGES, BACKGROUNDS, OUTSIDES } from '../src/engine/content';
import {
  availableMoves, appeal, applyEfv, beginSentence, choose, chooseVisit, continueResult, draftPick, newGame, playMove, plead, playScene,
  rollEyes, submitLetters, toMail
} from '../src/engine/engine';
import type { Game } from '../src/engine/types';

const noop = () => {};
const render = (g: Game) =>
  renderToString(<GameView g={g} act={noop} countTime={noop} canRewind={false} onQuit={noop} onCards={noop} onAgain={noop} />);

describe('every screen renders', () => {
  it('through whole games in each facility, including moves', () => {
    const seen = new Set<string>();
    for (const facilityId of ['cedar', 'harlan', 'granite']) {
      for (let seed = 1; seed <= 12; seed++) {
        let s = newGame(facilityId, seed * 31);
        seen.add(render(s) && 'draft');
        s = draftPick(s, { chargeId: CHARGES[seed % CHARGES.length].id, backgroundId: BACKGROUNDS[seed % BACKGROUNDS.length].id, outsideId: OUTSIDES[seed % OUTSIDES.length].id, name: 'Tester' });
        if (!s.draft!.charges.includes(s.char!.chargeId)) s.draft!.charges.push(s.char!.chargeId);
        seen.add(render(s) && 'sheet');
        s = beginSentence(s);
        for (let guard = 0; guard < 4000 && s.phase !== 'over'; guard++) {
          const html = render(s);
          expect(html.length).toBeGreaterThan(50);
          seen.add(s.phase);
          const policy = seed % 2 ? careful : randomPolicy;
          if (s.phase === 'card') s = choose(s, policy(s));
          else if (s.phase === 'result') s = continueResult(s);
          else if (s.phase === 'hub') {
            // exercise a move now and then
            const mv = availableMoves(s)[seed % 3];
            if (mv && s.m % 2 === 0 && !s.flags[`t${s.m}`]) {
              s = { ...s, flags: { ...s.flags, [`t${s.m}`]: true } };
              s = playMove(s, mv.id);
            } else {
              s = applyEfv(s);
              s = s.mo.scenesLeft > 0 ? playScene(s) : rollEyes(s);
            }
          } else if (s.phase === 'eyes') {
            if (s.hearings.length) s = plead(s, guard % 2 ? 'guilty' : 'contest');
            else {
              const i = s.infractions.findIndex((x) => x.plea === 'contest' && x.m === s.m && !x.appeal);
              s = i >= 0 && seed % 2 ? appeal(s, i) : s;
              s = toMail(s);
            }
          }
          else if (s.phase === 'mail') s = s.visitPending ? chooseVisit(s, 'steady') : submitLetters(s, ['Hello.']);
          else break;
        }
        expect(s.phase).toBe('over');
        expect(render(s)).toContain('The ledger');
      }
    }
    for (const p of ['card', 'result', 'hub', 'eyes', 'mail']) expect(seen.has(p)).toBe(true);
  });
});
