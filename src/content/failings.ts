import type { Failing, Officer } from '../engine/types';

export const OFFICERS: Officer[] = [
  { name: 'Okafor', mood: 'exhausted', blurb: 'Sergeant. By the book. The book is long and he has read all of it.' },
  { name: 'Pruitt', mood: 'exhausted', blurb: 'Counting his own days. Counts everything twice.' },
  { name: 'Reyes', mood: 'decent', blurb: 'Firm, fair, tired. Writes fewer tickets than he could, and everyone knows it.' },
  { name: 'Dahl', mood: 'exhausted', blurb: "New. Hasn't learned yet which rules nobody follows." },
  { name: 'Moss', mood: 'exhausted', blurb: 'On overtime. Sixteen hours in, and not looking.' },
  { name: 'Brandt', mood: 'cruel', blurb: 'Holds grudges. Remembers names and files them in order.' },
  { name: 'Haskins', mood: 'exhausted', blurb: 'Lieutenant. Wants a quiet unit, and will trade a lot for one.' }
];

export const FAILINGS: Failing[] = [
  { d20: 1, id: 'short_fuse', name: 'Short Fuse', card: 'public', text: "You can't choose Let it go on the first Test card of each act." },
  { d20: 2, id: 'pride', name: 'Pride', card: 'public', text: 'You can never Fold. If your threat is called, you follow through.' },
  { d20: 3, id: 'mouthy', name: 'Mouthy', card: 'public', text: '+1 blue die on every discretionary rule, on top of Conspicuity.' },
  { d20: 4, id: 'gambler', name: 'Gambler', card: 'public', text: "When a game is running, you sit in. Gambling is a minor if you're seen." },
  { d20: 5, id: 'soft_spot', name: 'Soft Spot', card: 'public', text: "When someone weaker is in trouble (Fresh Fish), you can't choose to look away." },
  { d20: 6, id: 'trust_no_one', name: 'Trust No One', card: 'public', text: 'You can never choose Take it to your car. You owe no one, and no one owes you.' },
  { d20: 7, id: 'bad_blood', name: 'Bad Blood', card: 'public', text: 'Someone on the yard knows you from outside. Payback is shuffled into the Yard deck.' },
  { d20: 8, id: 'snitch_jacket', name: 'Snitch Jacket', card: 'public', text: 'You arrive with a cooperation rumor already pinned to you, true or not.' },
  { d20: 9, id: 'known_to_staff', name: 'Known to Staff', card: 'public', text: "One officer knows you from before. When that officer's Count card comes up, +1 blue die on every roll that month." },
  { d20: 10, id: 'informant', name: 'Informant', card: 'private', text: "You've already talked. Once per act, an officer calls you in. Your secret's tag is cooperation." },
  { d20: 11, id: 'affiliated', name: 'Affiliated', card: 'private', text: 'You were sworn in before you arrived. You start with a debt string to a shot caller. Politics cards are never discarded for you. Your first major gets you validated: +1 Conspicuity.' },
  { d20: 12, id: 'habit', name: 'Habit', card: 'private', text: 'A second Pull: when someone offers you something to get through the night.' },
  { d20: 13, id: 'sticky_fingers', name: 'Sticky Fingers', card: 'private', text: "A second Pull: when something's left unguarded." },
  { d20: 14, id: 'in_debt', name: 'In Debt', card: 'private', text: "You arrive owing the store man 10 commissary at two-for-one. Your secret's tag is debt." },
  { d20: 15, id: 'liar', name: 'Liar', card: 'private', text: 'The claim on your public card is false. If your private card flips, lose 2 extra Standing.' },
  { d20: 16, id: 'holding', name: 'Holding', card: 'private', text: 'You arrived with contraband. Your first Random Search rolls 2 extra blue dice.' },
  { d20: 17, id: 'burned_bridges', name: 'Burned Bridges', card: 'private', text: 'No one writes back. Your Line Home move counts Heart as -2.' },
  { d20: 18, id: 'loose_mouth', name: 'Loose Mouth', card: 'private', text: "At each mail call, roll a die. On a 1, you've said too much: a rumor gets pinned to you." },
  { d20: 19, id: 'something_to_hide', name: 'Something to Hide', card: 'private', text: 'Two matching rumors flip your private card instead of three.' },
  { d20: 20, id: 'twice_more', name: 'Roll twice more', card: 'private', text: 'Take both. A bad sentence gets worse.' }
];
