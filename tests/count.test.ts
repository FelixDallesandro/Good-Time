import { describe, expect, it } from 'vitest';
import { careful } from '../src/engine/autoplay';
import { applyEfv, beginSentence, chooseVisit, choose, classify, continueResult, draftPick, newGame, plead, playScene, rollEyes, submitLetters, toMail, visitingTies } from '../src/engine/engine';

describe('count cards', () => {
  it('only closes the visiting room on someone who has a visitor', () => {
    let shown = 0, withNobody = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const g = newGame('harlan', seed);
      let s = beginSentence(classify(draftPick(g, { chargeId: g.draft!.charges[0], backgroundId: g.draft!.backgrounds[seed % 3], name: 'T' })));
      for (let guard = 0; guard < 3000 && s.phase !== 'over' && s.phase !== 'release'; guard++) {
        if (s.phase === 'card') {
          if (s.cur!.card.id === 'visiting_closed') { shown++; expect(visitingTies(s).length).toBeGreaterThan(0); }
          s = choose(s, careful(s));
        } else if (s.phase === 'result') s = continueResult(s);
        else if (s.phase === 'hub') s = s.mo.scenesLeft > 0 ? playScene(applyEfv(s)) : rollEyes(s);
        else if (s.phase === 'eyes') s = s.hearings.length ? plead(s, 'guilty') : toMail(s);
        else if (s.phase === 'mail') s = s.visitPending ? chooseVisit(s, 'money') : submitLetters(s, ['ok']);
        if (s.phase === 'hub' && !visitingTies(s).length) withNobody++;
      }
    }
    expect(shown).toBeGreaterThan(0);   // the card still comes up for people with visitors
    expect(withNobody).toBeGreaterThan(0); // and the test saw months with nobody to visit
  });
});
