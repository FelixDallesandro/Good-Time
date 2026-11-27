import { describe, expect, it } from 'vitest';
import { careful, randomPolicy, type Policy } from '../src/engine/autoplay';
import {
  activeTies, applyEfv, beginSentence, cellieOf, chooseVisit, choose, classify, continueResult, draftPick, newGame, plead,
  playScene, rollEyes, submitLetters, toMail
} from '../src/engine/engine';
import type { Game } from '../src/engine/types';

const SEG_COUNT = ['the_offer', 'validation_sweep', 'random_ua', 'mailroom_backlog', 'visiting_closed', 'price_increase', 'class_canceled'];

/** Every card that comes up has to make sense right then, whatever came before it. */
function audit(s: Game, seen: Record<string, number>, problems: string[]) {
  const c = s.cur!.card;
  const at = `seed ${s.rng} month ${s.m} ${c.id}`;
  seen[c.id] = (seen[c.id] ?? 0) + 1;
  const inSeg = s.segUntil >= s.m;
  if (c.id === 'the_run' && !s.job) problems.push(`${at}: The Run with no job`);
  if (c.id === 'kitchen_job' && s.job) problems.push(`${at}: Kitchen Job while already working`);
  if ((c.id === 'phone_vent' || c.id === 'store_man') && !cellieOf(s).has) problems.push(`${at}: needs a cellie with something going`);
  if (c.id === 'store_man' && s.cellieId === 'store') problems.push(`${at}: the store man owes himself`);
  if (c.id === 'the_visit' && s.efv.status !== 'approved') problems.push(`${at}: The Visit with no EFV`);
  if (c.id === 'divorce_papers' && !activeTies(s).some((t) => t.role === 'partner')) problems.push(`${at}: divorce with no partner`);
  if (inSeg && c.kind === 'count' && !SEG_COUNT.includes(c.id)) problems.push(`${at}: unit count card in seg`);
  if (inSeg && ['living_with_it', 'targeted', 'leak_told', 'leak_about', 'send_off'].includes(c.id)) problems.push(`${at}: unit prompt in seg`);
  if (inSeg && s.cur!.source === 'yard') problems.push(`${at}: yard card in seg`);
  if (c.id === 'visiting_closed' && !s.ties.some((t) => !t.gone && t.visits)) problems.push(`${at}: closed room, no visitors`);
  for (const n of s.mo.notes) {
    if (/released back to general population/.test(n) && !s.segPlacements.length) problems.push(`${at}: released from seg never entered`);
    if (/segregation/i.test(n) && s.m === 1) problems.push(`${at}: seg note in the first month`);
  }
}

function run(seed: number, policy: Policy, bg: number, seen: Record<string, number>, problems: string[]) {
  const g = newGame('harlan', seed);
  let s = beginSentence(classify(draftPick(g, { chargeId: g.draft!.charges[seed % 3], backgroundId: g.draft!.backgrounds[bg], name: 'T' })));
  const once: Record<string, number> = {};
  for (let guard = 0; guard < 4000 && s.phase !== 'over' && s.phase !== 'release'; guard++) {
    if (s.phase === 'card') {
      audit(s, seen, problems);
      if (s.cur!.source === 'count') once[s.cur!.card.id] = (once[s.cur!.card.id] ?? 0) + 1;
      s = choose(s, policy(s));
    } else if (s.phase === 'result') s = continueResult(s);
    else if (s.phase === 'hub') s = s.mo.scenesLeft > 0 ? playScene(applyEfv(s)) : rollEyes(s);
    else if (s.phase === 'eyes') s = s.hearings.length ? plead(s, 'guilty') : toMail(s);
    else if (s.phase === 'mail') s = s.visitPending ? chooseVisit(s, 'money') : submitLetters(s, ['ok']);
  }
  for (const id of ['new_officer', 'pruitt']) if ((once[id] ?? 0) > 1) problems.push(`seed ${seed}: ${id} came up ${once[id]} times`);
}

describe('card consistency, in any order', () => {
  it('never shows a card whose premise is false', () => {
    const seen: Record<string, number> = {};
    const problems: string[] = [];
    for (let seed = 1; seed <= 160; seed++) run(seed, seed % 2 ? randomPolicy : careful, seed % 3, seen, problems);
    expect(problems.slice(0, 10)).toEqual([]);
    // the gated cards still come up when they fit
    for (const id of ['the_run', 'kitchen_job', 'store_man', 'phone_vent', 'new_officer']) expect(seen[id] ?? 0).toBeGreaterThan(0);
  });
});
