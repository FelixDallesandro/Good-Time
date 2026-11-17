import { CHARGES, BACKGROUNDS, OUTSIDES } from './content';
import { chooseCourt, classify,
  advanceRelease,
  applyEfv,
  beginSentence,
  releaseCard,
  cardChoices,
  chooseVisit,
  choose,
  continueResult,
  draftPick,
  lockReason,
  newGame,
  playScene,
  plead,
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
  /** The court at intake: default is the first deal, keeping quiet. */
  court?: { path: 'deal' | 'trial'; talk?: boolean };
  /** Flags set when the sentence begins, e.g. to force a referral. */
  flags?: Game['flags'];
  /** Go through reception: classification places you instead of facilityId. */
  classify?: boolean;
}

/**
 * Demo mode: the player ends here. Whatever phase this is, the rest of the sentence is played out the careful way, and
 * the moment is recorded so the epilogue can tell the player's decisions from the ones made for them.
 */
export function endDemo(g: Game, name = 'You'): Game {
  if (g.phase === 'over') return g;
  let s: Game = structuredClone(g);
  s.decisions ??= [];
  s.demo = {
    m: s.phase === 'draft' || s.phase === 'sheet' || s.phase === 'reception' ? 0 : s.m,
    decisions: s.decisions.length, infractions: s.infractions.length, letters: s.letters.length, ledger: s.ledger.length,
    standing: s.standing, support: s.support, boxes: s.boxes, maxBoxes: s.maxBoxes, routine: s.routine, stats: { ...s.stats }
  };
  if (s.phase === 'draft')
    s = draftPick(s, { chargeId: s.draft!.charges[0], backgroundId: s.draft!.backgrounds[0], outsideId: s.draft!.outsides[0], name });
  if (s.phase === 'sheet') s = classify(s);
  if (s.phase === 'reception') s = beginSentence(s);
  return finishGame(s, careful);
}

/** Plays a sentence in progress to the end with a policy. */
export function finishGame(g: Game, policy: Policy = careful): Game {
  let s = g;
  for (let guard = 0; guard < 5000 && s.phase !== 'over'; guard++) {
    switch (s.phase) {
      case 'card':
        s = choose(s, policy(s));
        break;
      case 'result':
        s = continueResult(s);
        break;
      case 'hub':
        s = applyEfv(s);
        s = s.mo.scenesLeft > 0 ? playScene(s) : rollEyes(s);
        break;
      case 'eyes':
        s = s.hearings.length ? plead(s, s.m % 3 ? 'guilty' : 'contest') : toMail(s);
        break;
      case 'mail':
        s = s.visitPending ? chooseVisit(s, 'money') : submitLetters(s, ['Doing fine in here, mostly.']);
        break;
      case 'release':
        s = advanceRelease(s, releaseCard(s)!.choices[0].id);
        break;
      default:
        throw new Error(`stuck in phase ${s.phase}`);
    }
  }
  return s;
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
  if (opts.court) s = chooseCourt(s, opts.court.path, opts.court.talk);
  if (opts.classify) s = classify(s);
  s = beginSentence(s);
  if (opts.flags) Object.assign(s.flags, opts.flags);
  return finishGame(s, policy);
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
