import type { Cellie } from '../engine/types';

/**
 * Dealt face down, one per player. Only Staff reads it. `owns`: he owns his own when Staff rolls a d6 >= that
 * number ("owns his own on 3-6" = 3). 7 means never. Nine of twelve have something going.
 */
export const CELLIES: Cellie[] = [
  { id: 'ink', name: 'Ink', front: 'Quiet, older. Sketches all day.',
    back: 'Runs a tattoo gun (motor from a fan, ink from soot). Offers free ink; a fresh tattoo adds +1 Conspicuity if it\'s gang work.',
    owns: 3, has: true, contraband: true, drugs: false, cut: { commissary: 2, log: 'He pays you for keeping the door.' } },
  { id: 'brewer', name: 'Brewer', front: 'Friendly. Always has fruit from chow.',
    back: 'Brews pruno under the bunk. Cuts you in for 1 store a month.',
    owns: 4, has: true, contraband: true, drugs: false, cut: { monthly: { label: 'Pruno cut', commissary: 1 }, log: 'He cuts you in: +1 store a month.' } },
  { id: 'pills', name: 'Pills', front: 'Sleeps a lot. Gets mail every week.',
    back: 'Holds pills that come in through the mail. Leans on you to eat it with a debt he creates.',
    owns: 6, has: true, contraband: true, drugs: true, cut: { commissary: 3, debt: 'your cellie', log: 'He fronts you store early.' } },
  { id: 'phone', name: 'Phone', front: 'Always on the bunk with his back to the door.',
    back: 'Keeps a cell phone in the vent. Lets you use it once.',
    owns: 5, has: true, contraband: true, drugs: false, cut: { supportSet: 1, log: 'You use the phone once. Someone picks up. Support becomes 1 if you had none.' } },
  { id: 'store', name: 'Store man', front: 'Commissary stacked to the ceiling.',
    back: 'Runs a store at two-for-one. Will front you anything, and will collect.',
    owns: 3, has: true, contraband: true, drugs: false, cut: { commissary: 4, debt: 'the store man', log: 'He fronts you 4 store at two-for-one.' } },
  { id: 'runner', name: "Shot caller's runner", front: 'Gone half the day. Comes back with news.',
    back: 'Carries messages and holds for his car. His car makes sure someone else eats it.',
    owns: 6, has: true, contraband: true, drugs: false, setup: { echoes: ['car_politics'] }, cut: { standing: 1, log: 'His car notices you kept quiet: +1 Standing.' } },
  { id: 'gambler', name: 'Gambler', front: 'Cards and dice, always a game going.',
    back: 'Runs a poker game in the cell. Every Gambling roll you make is in your cell (cell tag applies).',
    owns: 4, has: true, contraband: true, drugs: false, cut: { commissary: 2, log: 'You sit in on a hand. It pays.' } },
  { id: 'hooch', name: 'Hooch and a habit', front: 'Talks fast, sleeps little.',
    back: 'Uses, and holds for himself. If you have Habit or a Possession charge, roll your Pull every month.',
    owns: 5, has: true, contraband: true, drugs: true, cut: { commissary: 2, log: 'He gives you a little for your silence.' } },
  { id: 'shank', name: 'Shank', front: 'Says little. Sleeps facing the door.',
    back: 'Keeps a weapon in the mattress. Any search that finds it is a major for whoever eats it.',
    owns: 2, has: true, contraband: true, drugs: false, cut: { standing: 1, log: 'He nods at you. The tier notices: +1 Standing.' } },
  { id: 'student', name: 'Clean: the student', front: 'Working on his AA. Books everywhere.',
    back: 'Nothing going. Asks you to keep the cell quiet; if you bring trouble in, he kites for a move.',
    owns: 1, has: false, contraband: false, drugs: false },
  { id: 'oldhead', name: 'Clean: the old head', front: 'Twenty-two years in. Everyone knows him.',
    back: "Nothing going. +1 Standing while you're his cellie; -2 if he rolls you out for bringing heat.",
    owns: 1, has: false, contraband: false, drugs: false, setup: { standing: 1 } },
  { id: 'scared', name: 'Clean: the scared one', front: "First time down. Doesn't sleep.",
    back: "Nothing going. Someone will try to extort him; you'll be in the room (a Fresh Fish card is shuffled in with his name on it).",
    owns: 1, has: false, contraband: false, drugs: false, setup: { echoes: ['fresh_fish'] } }
];
