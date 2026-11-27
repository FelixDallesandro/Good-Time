import {
  actOf, confess, cutLeverage, denyRumor, efvBlock, has, leanOn, listingActive, payDebt, playMove, postProfile,
  standIn, stayIn, stopCounting, applyEfv
} from './engine';
import { PEN_PAL } from '../content/classification';
import type { Game } from './types';

/**
 * Openings: the actions you can take outside a scene. None of them is on a menu. Each comes up only when something in
 * your sentence makes it worth thinking about, on its own screen, with why now, what it costs, and what it gets you.
 * Pass, and it won't ask again until something changes (or three months go by and it is still true).
 */
export interface Opening {
  id: string;
  title: string;
  /** What is happening that makes this worth thinking about now. */
  why: string;
  cost: string;
  gain: string;
  /** The label on the button. */
  verb: string;
  /** Changes when the situation changes, so a pass only lasts as long as the situation does. */
  sig: string;
  /** A one-way door asks twice. */
  oneWay?: boolean;
  /** Months before a pass expires while nothing changes. Leave out for never: it waits for the situation to change. */
  again?: number;
  take: (g: Game) => Game;
}


/** Every opening that fits this moment, whether or not it has been offered. */
export function openings(g: Game): Opening[] {
  if (g.phase !== 'hub' || !g.char) return [];
  const out: Opening[] = [];
  const act = actOf(g);
  const used = g.actUsed[act] ?? {};
  const debts = g.strings.filter((x) => x.type === 'debt');
  const levs = g.strings.filter((x) => x.type === 'leverage');
  const secret = g.char.privateTag;
  const onSecret = g.rumors.filter((r) => r.tag === secret).length;
  const flipAt = has(g, 'something_to_hide') ? 2 : 3;
  const liar = has(g, 'liar');

  // a month off the unit: almost nothing is in reach
  if (g.mo.seg) {
    if (stopCountingFits(g)) out.push(stopOpening(g));
    return out;
  }

  // your secret is one rumor from coming out on its own
  if (!g.privateFlipped && onSecret === flipAt - 1) {
    out.push({
      id: 'confess', title: 'Get ahead of it',
      why: `${onSecret} ${onSecret === 1 ? 'rumor' : 'rumors'} about your secret ${onSecret === 1 ? 'is' : 'are'} pinned up on the tier board. One more, and the yard turns your private card over for you.`,
      cost: `−${1 + (liar ? 2 : 0)} Standing now${liar ? ' (the claim on your public card was a lie, and that costs extra)' : ''}. The yard knows, from today.`,
      gain: `If it comes out on its own, it costs −${2 + (liar ? 2 : 0)} Standing. Saying it yourself costs less, and nothing more about it can be used on you.${secret === 'family' ? ' And you can write one more line home this month.' : ''}`,
      verb: 'Tell them yourself', sig: `${onSecret}`, take: confess
    });
  }

  // rumors are dice on every roll; a public denial takes one down
  if (g.rumors.length >= 2 && g.standing >= 1) {
    out.push({
      id: 'deny', title: 'Deny a rumor',
      why: `${g.rumors.length} rumors are pinned to you. Each one is a red die on every roll you make${onSecret ? `, and ${onSecret} of them ${onSecret === 1 ? 'is' : 'are'} about your secret` : ''}.`,
      cost: '−1 Standing: denying it in public means people saw it got to you.',
      gain: `One rumor comes down${onSecret ? ', starting with the one about your secret' : ''}: one less red die on every roll.`,
      verb: 'Deny it in front of everyone', sig: `${g.rumors.length}`, again: 3, take: denyRumor
    });
  }

  // a debt can be called in any month, and it is called at the worst time
  if (debts.length && g.commissary >= 6) {
    out.push({
      id: 'pay_debt', title: 'Pay what you owe',
      why: `You owe ${debts[0].to}, and you have ${g.commissary} store. Every month there is a chance they call it in, and they choose the moment, not you.`,
      cost: '−6 store.',
      gain: `The string comes down before they collect. ${debts[0].to === 'your car' || debts[0].to === 'your shot caller' ? 'When your car collects, it collects in work.' : 'Whoever collects decides what you pay.'}`,
      verb: 'Pay it now', sig: `${debts.length}`, again: 3, take: payDebt
    });
  }

  // someone owes you, and you are broke
  if (levs.length && g.commissary <= 2) {
    out.push({
      id: 'cut_leverage', title: 'Call in what you are owed',
      why: `You have ${g.commissary} store, and a man on the tier owes you. Every month you hold it, there is a chance he moves on you first.`,
      cost: 'The leverage is gone: he owes you nothing after this.',
      gain: '+5 store, and he has no more reason to come at you first.',
      verb: 'Collect', sig: `${levs.length}`, take: cutLeverage
    });
  }

  // a scene you could spend out of sight
  const lieLow = g.mo.fought ? 'You were in a fight this month, and the tier is still talking about it.'
    : debts.length ? `You owe ${debts[0].to}, and you would rather not be found.`
    : g.rumors.length >= 2 ? 'There are rumors going around about you.'
    : null;
  if (lieLow && g.support >= 1 && g.mo.scenesLeft > 0 && !g.mo.lockdown) {
    const second = ((used.stay as number) ?? 0) >= 1;
    out.push({
      id: 'stay_in', title: 'Stay in your cell',
      why: `${lieLow} You could spend the next scene in your cell, writing to someone who still writes back.`,
      cost: `You skip the next scene: no Yard card, good or bad.${second ? ' This would be the second time this stretch. The yard notices who never comes out: −1 Standing.' : ' Do it twice in one stretch and the yard notices.'}`,
      gain: 'No Yard card means nothing new to break. And one more line home this month.',
      verb: 'Stay in', sig: `${g.m}`, take: stayIn
    });
  }

  // nobody is writing back
  if (g.support <= 1 && !listingActive(g) && g.commissary >= PEN_PAL.cost && g.m >= 2) {
    out.push({
      id: 'pen_pal', title: 'Post a pen pal listing',
      why: g.support === 0 ? 'Nobody outside is writing to you anymore.' : 'Only one person outside still writes.',
      cost: `${PEN_PAL.cost} store, and your photo and DOC number on a website.`,
      gain: `For a year, a stranger might write: some months someone does, most months nobody does. Messages only; a pen pal never visits.`,
      verb: 'Post it', sig: `${g.support}`, take: postProfile
    });
  }

  // nothing to lose outside: once a stretch, use it
  if (g.support === 0 && g.commissary <= 3 && !used.lean) {
    out.push({
      id: 'lean_on', title: 'Lean on a man with a visit coming',
      why: `You have ${g.commissary} store and nobody outside, so nobody can be used against you. The man two cells down has a visit Saturday and a lot to lose.`,
      cost: 'A rumor gets pinned to you: people saw.',
      gain: '+2 store.',
      verb: 'Lean on him', sig: act, take: leanOn
    });
  }
  if (g.support === 0 && !g.flags.stood_in && (act === 'yard' || act === 'long')) {
    out.push({
      id: 'stand_in', title: 'Take a charge for someone',
      why: 'A man with kids on his visiting list is about to be written up. You have no visits to lose.',
      cost: 'A serious infraction in your name, with everything it costs: good time, custody points, a hearing.',
      gain: 'He keeps his visits, and he owes you: a leverage string on the board.',
      verb: 'Take it for him', sig: 'once', take: (x) => {
        const n = standIn(x);
        if (n !== x) n.flags.stood_in = true;
        return n;
      }
    });
  }

  // an extended family visit you can apply for
  if (!efvBlock(g) && g.efv.status === 'none') {
    out.push({
      id: 'efv', title: 'Apply for an extended family visit',
      why: 'You are eligible: no serious infraction in the last six months, and immediate family on your visiting list.',
      cost: 'Nothing now. The application takes two to six months, and any serious infraction before the visit suspends you for six months.',
      gain: 'Two nights with your family in a trailer inside the fence, if it is approved.',
      verb: 'Apply', sig: g.efv.status, take: applyEfv
    });
  }

  // broke, with a debt or nothing on the books
  if (g.commissary <= 2 && (debts.length || g.commissary === 0)) {
    out.push({
      id: 'hustle', title: 'Run a hustle',
      why: `You have ${g.commissary} store${debts.length ? `, and you owe ${debts[0].to}` : ''}. There are ways to make it: laundry, tattoos, cooking, legal work.`,
      cost: "It's against the rules: roll the Eyes, and if you're caught, it's a general infraction.",
      gain: '+2 store if it goes clean (+3 with Hustle +1).',
      verb: 'Find a hustle', sig: act, take: (x) => playMove(x, 'any_hustle')
    });
  }

  // an officer wrote you up on his own say-so
  const call = [...g.infractions].reverse().find((x) => x.discretionary && x.result !== 'not_guilty' && g.m - x.m <= 1);
  if (call) {
    out.push({
      id: 'grievance', title: 'File a grievance',
      why: `Your write-up for ${call.code} came down to the officer's call: ${call.source}. Nobody else would have written it.`,
      cost: 'Staff remember who files: +1 blue die on every roll next month.',
      gain: 'Usually it is "resolved" and nothing changes. On a 6, it is actually fixed, and you get a good-time box back.',
      verb: 'File it', sig: act, // once a stretch: the form doesn't get less pointless
      take: (x) => playMove(x, 'any_grievance')
    });
  }

  if (stopCountingFits(g)) out.push(stopOpening(g));
  return out;
}

/** Only when there is little left to protect: the boxes are mostly gone, or treatment took them anyway. */
function stopCountingFits(g: Game): boolean {
  if (g.flags.stopped) return false;
  return g.treatment.failed || g.maxBoxes <= 1 || (g.maxBoxes < g.baseBoxes && g.boxes === 0);
}

function stopOpening(g: Game): Opening {
  return {
    id: 'stop', title: 'Stop counting days',
    why: g.treatment.failed
      ? 'You were terminated from treatment. You serve to your max date anyway: your good time no longer counts.'
      : `Your good time is almost gone: you can only ever fill ${g.maxBoxes} ${g.maxBoxes === 1 ? 'box' : 'boxes'} now, and ${g.boxes} ${g.boxes === 1 ? 'is' : 'are'} filled.`,
    cost: 'Every box is erased, for good. You serve the full sentence.',
    gain: '+2 Standing, and from now on write-ups cost you no good time, because there is none left to take.',
    verb: 'Stop counting', sig: `${g.maxBoxes}-${g.treatment.failed}`, oneWay: true, take: stopCounting
  };
}

/** Openings that fit and that you haven't already passed on in this situation. */
export function pendingOpenings(g: Game): Opening[] {
  return openings(g).filter((o) => {
    const seen = g.offered?.[o.id];
    if (!seen) return true;
    return seen.sig !== o.sig || (o.again !== undefined && g.m - seen.m >= o.again);
  });
}

function mark(s: Game, ops: Opening[]) {
  s.offered ??= {};
  for (const o of ops) s.offered[o.id] = { sig: o.sig, m: s.m };
}

/** "Not now": everything offered is put away until the situation changes. */
export function passOpenings(g: Game): Game {
  const ops = pendingOpenings(g);
  if (!ops.length) return g;
  const s = structuredClone(g);
  mark(s, ops);
  return s;
}

/** Take one. The rest are put away too: one extra action at a time. */
export function takeOpening(g: Game, id: string): Game {
  const ops = pendingOpenings(g);
  const o = ops.find((x) => x.id === id);
  if (!o) return g;
  const s = structuredClone(g);
  mark(s, ops);
  const n = o.take(s);
  if (n === s) return g;
  // a move records itself when it is played; everything else is written down here
  if (n.phase !== 'card') (n.decisions ??= []).push({ m: n.m, what: 'Opening', choice: o.title, cost: o.cost });
  return n;
}
