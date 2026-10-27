import { CHARGES, BACKGROUNDS, OUTSIDES } from './content';
import {
  beginSentence,
  cardChoices,
  chooseVisit,
  choose,
  continueResult,
  draftPick,
  lockReason,
  newGame,
  playScene,
  preview,
  rollEyes,
  submitLetters,
  toMail
} from './engine';
import type { Choice, Game } from './types';

export type Policy = (s: Game) => string;

function effectScore(ch: Choice): number {
  const e = ch.effect ?? {};
  return (
    (e.standing ?? 0) * 0.3 +
    (e.commissary ?? 0) * 0.05 +
    (e.boxes ?? 0) * 1 -
    (e.coopRumors ?? 0) * 0.5 -
    (e.rumors ?? 0) * 0.2 -
    (e.hurtCheck ? e.hurtCheck * 0.15 : 0) -
    (e.debt ? 0.3 : 0) +
    (e.standingSet !== undefined ? 0.8 : 0)
  );
}

export function scoreChoice(s: Game, ch: Choice): number {
  let v = effectScore(ch);
  const p = preview(s, ch);
  if (p?.kind === 'roll') v -= p.dice.pct * (ch.roll?.severity === 'minor' ? 1 : 2);
  if (p?.kind === 'auto') v -= 2;
  if (p?.kind === 'threat') v -= (1 - p.pct) * 1.5;
  return v;
}

/** Plays it safe: takes whatever looks cheapest. */
export const careful: Policy = (s) => {
  const choices = cardChoices(s.cur!.card).filter((c) => !lockReason(s, c));
  return choices.reduce((best, c) => (scoreChoice(s, c) > scoreChoice(s, best) ? c : best)).id;
};

/** Keeps the head down, except it answers The Ask once. */
export const putInWorkOnce: Policy = (s) => (['put_in_work', 'the_visit'].includes(s.cur!.card.id) ? 'do' : careful(s));

/** Picks any legal option. */
export function randomPolicy(s: Game): string {
  const choices = cardChoices(s.cur!.card).filter((c) => !lockReason(s, c));
  const pick = Math.floor(((s.rng ^ (s.m * 7919)) >>> 0) % choices.length);
  return choices[pick].id;
}

export interface PlayOpts {
  facilityId?: string;
  policy?: Policy;
  /** yard card ids placed on top of the deck at the start, e.g. to force The Ask. */
  inject?: string[];
}

export function playGame(seed: number, opts: PlayOpts = {}): Game {
  const policy = opts.policy ?? careful;
  let s = newGame(opts.facilityId ?? 'harlan', seed);
  s = draftPick(s, {
    chargeId: s.draft!.charges[0] ?? CHARGES[0].id,
    backgroundId: s.draft!.backgrounds[0] ?? BACKGROUNDS[0].id,
    outsideId: s.draft!.outsides[0] ?? OUTSIDES[0].id,
    name: 'Test'
  });
  if (opts.inject) s.yardDeck = [...opts.inject, ...s.yardDeck];
  s = beginSentence(s);
  for (let guard = 0; guard < 5000 && s.phase !== 'over'; guard++) {
    switch (s.phase) {
      case 'card':
        s = choose(s, policy(s));
        break;
      case 'result':
        s = continueResult(s);
        break;
      case 'hub':
        s = s.mo.scenesLeft > 0 ? playScene(s) : rollEyes(s);
        break;
      case 'eyes':
        s = toMail(s);
        break;
      case 'mail':
        s = s.visitPending ? chooseVisit(s, 'money') : submitLetters(s, ['Doing fine.']);
        break;
      default:
        throw new Error(`stuck in phase ${s.phase}`);
    }
  }
  return s;
}

/** The doc's "keep your head down": no rolls, no informing, no fighting, no threats. Let it go. */
export const headDown: Policy = (s) => {
  const choices = cardChoices(s.cur!.card).filter((c) => !lockReason(s, c));
  const quiet = choices.filter(
    (c) => !c.roll && !c.auto && !c.threat && c.tag !== 'violent' && !c.effect?.coopRumors && !((c.effect?.boxes ?? 0) > 0)
  );
  const pool = quiet.length ? quiet : choices;
  return pool.reduce((best, c) => (effectScore(c) > effectScore(best) ? c : best)).id;
};

/** Head down, but answers The Ask once. */
export const headDownThenWork: Policy = (s) => (['put_in_work', 'the_visit'].includes(s.cur!.card.id) ? 'do' : headDown(s));
