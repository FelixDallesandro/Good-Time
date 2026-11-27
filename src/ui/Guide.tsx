import { useState } from 'react';
import { cardChoices, onSheet } from '../engine/engine';
import { pendingOpenings } from '../engine/openings';
import type { Game } from '../engine/types';

/**
 * Teaching as you play. Two parts:
 * - the step tracker: where you are in the month, and what the game wants from you right now;
 * - hints: a few sentences the first time something comes up, instead of a rulebook before you start.
 * Seen hints are remembered per device, so a second sentence doesn't repeat the first one's lessons.
 */

const SEEN = 'goodtime.hints.seen';
const OFF = 'goodtime.hints.off';

function load(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN) ?? '[]');
  } catch {
    return [];
  }
}
function save(ids: string[]) {
  try {
    localStorage.setItem(SEEN, JSON.stringify(ids));
  } catch {
    /* private window: hints just come back next time */
  }
}
export function hintsOn(): boolean {
  try {
    return localStorage.getItem(OFF) !== '1';
  } catch {
    return true;
  }
}
export function setHintsOn(on: boolean) {
  try {
    localStorage.setItem(OFF, on ? '0' : '1');
    if (on) localStorage.removeItem(SEEN); // turning hints back on starts them over
  } catch {
    /* ignore */
  }
}

const STEPS = ['Count', 'Your scenes', 'The Eyes', 'Visits and messages'] as const;

/** Which step of the month this is, and one line on what the game wants from you. */
export function stepOf(g: Game): { step: number; now: string } {
  const cur = g.cur;
  switch (g.phase) {
    case 'card': {
      if (cur?.source === 'count') return { step: 0, now: 'Staff drew this month\'s card. It names the officer on shift and changes the month. Read it, answer it if it asks, and go on.' };
      if (cur?.card.pullId) return { step: 1, now: 'Your Pull came up. It is not a choice: roll, and see whether you walk past it.' };
      if (cur?.source === 'threat') return { step: 1, now: 'They called your threat. Follow through, which is a fight, or fold.' };
      if (cur?.source === 'yard') return { step: 1, now: 'Your scene. Choose how you handle it. Under each option: what it costs, and the dice if it breaks a rule.' };
      if (cur?.source === 'move') return { step: 1, now: 'You played a move. Choose how it goes.' };
      return { step: g.mo.sceneInit ? 1 : 0, now: 'Something found you this month. You have to answer it before the month goes on.' };
    }
    case 'result':
      return { step: g.mo.sceneInit ? 1 : 0, now: 'What happened. Anything you did that breaks a rule waits for the Eyes at the end of the month.' };
    case 'hub':
      return g.mo.scenesLeft > 0
        ? { step: 1, now: pendingOpenings(g).length ? 'Something going on opens a door for an extra action. Weigh it, or pass and go on.' : 'The tier, between scenes. Play your next scene.' }
        : { step: 1, now: 'Your scenes are done. Roll the Eyes: staff decide what they saw.' };
    case 'eyes':
      return { step: 2, now: g.hearings.length ? 'A serious infraction goes to a hearing. Plead guilty for a lighter sanction, or contest it.' : 'Staff rolled. Read what they caught, then go on to visits and messages.' };
    case 'mail':
      return { step: 3, now: 'Write to the people who still have you, and see who visits. Sending ends the month.' };
    default:
      return { step: -1, now: '' };
  }
}

export function StepTracker({ g }: { g: Game }) {
  const { step, now } = stepOf(g);
  if (step < 0) return null;
  return (
    <div className="steps" aria-label="Where you are in the month">
      <ol>
        {STEPS.map((x, i) => (
          <li key={x} className={i === step ? 'now' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>{x}</li>
        ))}
      </ol>
      <p className="small">{now}</p>
    </div>
  );
}

interface Hint {
  id: string;
  title: string;
  text: string;
  when: (g: Game) => boolean;
}

const card = (g: Game) => (g.phase === 'card' ? g.cur?.card : undefined);
const choices = (g: Game) => {
  const c = card(g);
  return c ? cardChoices(c) : [];
};

/** In the order a sentence usually meets them. The first one that applies and hasn't been seen is shown. */
const HINTS: Hint[] = [
  { id: 'month', title: 'How a month goes', when: (g) => g.phase === 'card' && g.cur?.source === 'count',
    text: 'Every month runs the same way: a Count card from staff, then your scene (usually one), then the Eyes, where staff roll for anything you did, then visits and messages. The tracker above shows where you are.' },
  { id: 'officer', title: 'The officer on shift', when: (g) => g.phase === 'card' && g.cur?.source === 'count' && !!g.cur.card.officer,
    text: 'Each Count card names an officer. Cruel ones add a blue die to rules they can choose to enforce, and decent ones take one off. Some cards change the dice for the whole month: that shows under the bar at the top.' },
  { id: 'pull', title: 'The Pull', when: (g) => !!card(g)?.pullId,
    text: 'Your charge came with a habit, and it comes back around. You never choose it: you roll. On a low roll you give in, and that may break a rule. Walk past it three times and you tear it up for good.' },
  { id: 'dice', title: 'Counting the Eyes', when: (g) => choices(g).some((c) => c.roll && !c.auto),
    text: 'An option that breaks a rule shows its dice: blue for officers, white for other prisoners who might talk, red for each rumor about you. At the end of the month staff roll them, and any 6 means caught. Cameras are dice you can\'t see. A die ringed with + was added this month; a struck one was taken off, and the chip beside it says why.' },
  { id: 'standing', title: 'Standing and the code', when: (g) => g.phase === 'card' && g.cur?.source === 'yard',
    text: 'Standing (the dots at the top, 0 to 5) is how the yard sees you. Backing down costs it; standing up usually breaks a rule. Almost every choice trades the institution\'s rules against the yard\'s. There is rarely a free option.' },
  { id: 'test', title: 'Test cards', when: (g) => card(g)?.tag === 'test',
    text: 'A Test is someone checking whether you\'ll stand up. Letting it go costs Standing. Once your Standing is 3 or more, Test cards pass you by.' },
  { id: 'threat', title: 'Threats', when: (g) => choices(g).some((c) => c.threat),
    text: 'A threat is a bet instead of a fight. At high Standing it just works. Otherwise you roll a d6 plus Nerve and need 4. If they call it, you follow through, which is a fight, or fold, which costs Standing and pins rumors.' },
  { id: 'politics', title: 'Your car', when: (g) => card(g)?.tag === 'politics',
    text: 'Politics cards are your car\'s business: the group you run with inside. Saying no costs Standing, and some refusals send a Mission your way. Saying yes often means a serious infraction.' },
  { id: 'opening', title: 'Openings', when: (g) => g.phase === 'hub' && pendingOpenings(g).length > 0,
    text: "Sometimes what's going on in your sentence opens a door: a debt you can pay before it's called, a rumor you can deny, a write-up you can grieve. The game stops and asks. Each one says why now, what it costs, and what you get. Passing is always an answer." },
  { id: 'hub', title: 'Between scenes', when: (g) => g.phase === 'hub' && g.mo.scenesLeft > 0 && !pendingOpenings(g).length,
    text: 'This is the tier. "Play the next scene" deals a Yard card. The tier board shows what is pinned to you; Outside shows who still has you.' },
  { id: 'eyes', title: 'The Eyes', when: (g) => g.phase === 'eyes',
    text: 'Staff rolled behind a screen. One 6 is usually a general infraction: lost privileges, never good time. Two or more 6s, or some acts, make a serious one, which goes to a hearing and can cost good time.' },
  { id: 'hearing', title: 'Hearings', when: (g) => g.phase === 'eyes' && g.hearings.length > 0,
    text: 'Pleading guilty usually means a lighter sanction, but you give up the appeal. Contesting almost never wins. Any serious infraction also suspends extended family visits for six months.' },
  { id: 'mail', title: 'People outside', when: (g) => g.phase === 'mail',
    text: 'Support (top bar) is the people who still have you. Each one is a real person: what you write, and whether you write, changes whether they stay. Visits need an approved visitor, and some months there is no visit at all.' },
  { id: 'goodtime', title: 'Good time', when: (g) => g.m >= 2 && g.phase === 'hub',
    text: 'The boxes at the top are earned release. Each month without a serious infraction fills one, and you walk out early by the boxes you filled. A serious one can take boxes away for good.' },
  { id: 'rumor', title: 'Rumors', when: (g) => g.rumors.length > 0 && g.phase === 'hub',
    text: 'A rumor is pinned to you on the tier board. Each one adds a red die to every roll. Three about your secret, and your private card turns face up.' },
  { id: 'strings', title: 'Debts and leverage', when: (g) => g.strings.length > 0 && g.phase === 'hub',
    text: 'A debt will be called in, usually at a bad time. Leverage is someone who owes you. Both sit on the tier board; you can pay a debt off or cut a leverage string for store.' },
  { id: 'sheet', title: 'On the sheet', when: (g) => onSheet(g) && g.phase === 'hub',
    text: 'You are on loss of privileges: no yard, gym, or dayroom. Going out anyway is a 658, a serious, and every officer has your photo. The yard won\'t always let you stay in.' },
  { id: 'seg', title: 'Segregation', when: (g) => g.mo.seg && (g.phase === 'hub' || g.phase === 'card'),
    text: 'You were taken off the unit to administrative segregation. No scenes this month. On paper it is not a punishment. Your next month starts with the final review.' },
  { id: 'hurt', title: 'Hurt', when: (g) => g.hurt && g.phase === 'hub',
    text: 'You are hurt. You can\'t choose a fight until it heals, and your next scene is medical.' },
  { id: 'custody', title: 'Custody', when: (g) => g.m >= 7 && g.phase === 'card' && g.cur?.source === 'count',
    text: 'Every six months a review can move your custody level a step, by your custody score. Serious infractions take points off; clean months add them back. The facility can override the score either way.' }
];

/** The first hint that fits this moment and hasn't been seen. "Got it" puts it away for good. */
export function HintBox({ g, on }: { g: Game; on: boolean }) {
  const [seen, setSeen] = useState<string[]>(load);
  if (!on) return null;
  const h = HINTS.find((x) => !seen.includes(x.id) && x.when(g));
  if (!h) return null;
  const done = (all = false) => {
    const next = all ? HINTS.map((x) => x.id) : [...seen, h.id];
    setSeen(next);
    save(next);
  };
  return (
    <div className="hint" role="note">
      <b>{h.title}.</b> {h.text}
      <div className="row" style={{ gap: 6, marginTop: 6 }}>
        <button className="small" onClick={() => done()}>Got it</button>
        <button className="small ghost" onClick={() => done(true)}>No more hints</button>
      </div>
    </div>
  );
}
