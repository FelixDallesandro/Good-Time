import type { Card } from '../engine/types';
import { fightRoll, fightEffect, move, thr } from './helpers';

/** Each player draws one Code move at setup: a one-time test of what they'll do for the yard. */
export const CODE_MOVES: Card[] = [
  move({ id: 'code_hold_line', title: 'Hold the line: when an officer asks you who did it', text: 'He is polite about it. He already has a name in mind.',
    choices: [
      { id: 'nothing', label: 'Say nothing', text: 'Staff rolls 1 blue die against you for failure to follow a directive.', roll: { blue: 1, discretionary: true } },
      { id: 'name', label: 'Give a name', text: 'Refill one good-time box, and pin a cooperation rumor to yourself.', effect: { boxes: 1, coopRumors: 1, informed: true } },
      { id: 'false', label: 'Give a false name', text: 'As giving a name, and the man you named shuffles Payback in.', effect: { boxes: 1, coopRumors: 1, informed: true, echoes: ['payback'] } }
    ] }),
  move({ id: 'code_homeboy', title: 'Homeboy: when a new guy from your neighborhood arrives', text: 'He is nineteen and he says your cousin\'s name.',
    choices: [
      { id: 'vouch', label: 'Vouch for him', text: '+1 Standing now; his first mistake costs you 1 Standing.', effect: { standing: 1, defer: { in: 2, unit: 'month', chance: 0.6, effect: { standing: -1, log: 'The kid you vouched for made his first mistake.' } } } },
      { id: 'out', label: 'Stay out of it', text: 'No change.', effect: {} },
      { id: 'warn', label: 'Warn him about the car', text: '-1 Standing if anyone hears.', sideRoll: { white: 2, on6: { standing: -1 } }, effect: {} }
    ] }),
  move({ id: 'code_dues', title: 'Dues: when your car collects dues', text: 'The collector has a list. You are on it.',
    choices: [
      { id: 'pay', label: 'Pay', needs: { commissary: 2 }, text: '-2 store.', effect: { commissary: -2 } },
      { id: 'short', label: 'Short them', text: 'Keep the store, and shuffle Car Politics in.', effect: { echoes: ['car_politics'] } },
      { id: 'cover', label: "Pay for someone who can't", requires: { stat: 'nerve', min: 1 }, needs: { commissary: 4 }, text: 'Nerve +1 only. -4 store, +2 Standing.', effect: { commissary: -4, standing: 2 } }
    ] }),
  move({ id: 'code_break', title: 'Break in the code: when someone in your car breaks the code', text: 'Everyone saw. Everyone is waiting to see who moves first.',
    choices: [
      { id: 'report', label: 'Report it to the shot caller', text: '+1 Standing; he\'s dealt with.', effect: { standing: 1 } },
      { id: 'handle', label: 'Handle it yourself', tag: 'violent', text: 'Play a Fight.', roll: fightRoll(), effect: fightEffect(['payback']) },
      { id: 'cover', label: 'Cover for him', text: 'If it comes out, -2 Standing.', sideRoll: { white: 2, on6: { standing: -2 } }, effect: {} }
    ] }),
  move({ id: 'code_courier', title: 'Courier: when your car asks you to carry a message to another unit', text: 'A folded square of paper, and a name.',
    choices: [
      { id: 'carry', label: 'Carry it', text: 'Roll 1 blue, 1 gray. +1 Standing if clean.', roll: { blue: 1, gray: 1 }, onClean: { standing: 1 } },
      { id: 'refuse', label: 'Refuse', text: '-1 Standing.', effect: { standing: -1 } },
      { id: 'read', label: 'Read it first', text: 'Learn something you were not meant to. Roll 1 blue, 1 gray.', roll: { blue: 1, gray: 1 }, effect: { log: 'You learn one man\'s private business. You will not be able to forget it.' } }
    ] }),
  move({ id: 'code_shower', title: 'Shower rules: when someone breaks shower etiquette in front of you', text: 'He does not look at you. That is the insult.',
    choices: [
      { id: 'check', label: 'Check him', text: 'A threat.', threat: thr(fightRoll(1, 3, 0)) },
      { id: 'let', label: 'Let it go', tag: 'letGo', text: '-1 Standing.', effect: { standing: -1 } },
      { id: 'quiet', label: 'Tell him quietly later', text: 'No change, unless your Standing is 0.', cond: { standingMax: 0, then: { standing: -1 }, else: {} } }
    ] }),
  move({ id: 'code_table', title: "The table: when someone sits at your car's table", text: 'He sits down like it is his.',
    choices: [
      { id: 'move', label: 'Move him', text: 'A threat.', threat: thr(fightRoll(1, 4, 1)) },
      { id: 'stay', label: 'Let him stay', tag: 'letGo', text: '-1 Standing.', effect: { standing: -1 } },
      { id: 'invite', label: 'Invite him', text: '+1 Standing if your Standing is 4 or more, -1 if less.', cond: { standingMin: 4, then: { standing: 1 }, else: { standing: -1 } } }
    ] }),
  move({ id: 'code_kite', title: 'Kite on the wall: when a kite turns up on the tier with a name on it', text: 'Folded twice, taped under the phone. Somebody wanted it found.',
    choices: [
      { id: 'car', label: 'Take it to your car', tag: 'takeToCar', text: 'The named man is now a target. +1 Standing.', effect: { standing: 1 } },
      { id: 'destroy', label: 'Destroy it', text: 'Nothing happens, unless someone saw you.', sideRoll: { white: 2, on6: { rumors: 1 } }, effect: {} },
      { id: 'give', label: 'Give it to the named man', text: 'He owes you. A leverage string goes up.', effect: { leverage: true } }
    ] }),
  move({ id: 'code_riding', title: 'Riding: when a member of your car is in a fight', text: 'It is already happening. You are ten feet away.',
    choices: [
      { id: 'jump', label: 'Jump in', tag: 'violent', text: 'Play a Fight. +1 Standing whether caught or not.', roll: fightRoll(), effect: fightEffect(['payback']) },
      { id: 'back', label: 'Stay back', text: '-2 Standing.', effect: { standing: -2 } },
      { id: 'pull', label: 'Pull him off', text: '-1 Standing, and the fight ends before any officer\'s die is rolled.', effect: { standing: -1 } }
    ] }),
  move({ id: 'code_collector', title: 'Debt collector: when your car asks you to collect a debt', text: 'A name, a number, and a day.',
    choices: [
      { id: 'collect', label: 'Collect', text: 'A threat. On success, +1 Standing and +1 store.', threat: thr(fightRoll(1, 3, 0), { success: { standing: 1, commissary: 1 } }) },
      { id: 'pay', label: 'Pay it yourself and say you collected', needs: { commissary: 4 }, text: '-4 store.', effect: { commissary: -4 } },
      { id: 'refuse', label: 'Refuse', text: '-1 Standing.', effect: { standing: -1 } }
    ] }),
  move({ id: 'code_paperwork', title: 'Bad paperwork: when the yard demands to see your paperwork', text: 'Three men, one folder, and a long time to read.',
    choices: [
      { id: 'show', label: 'Show it', text: 'If your private card has a charge or cooperation tag, it flips.', effect: { flipPrivate: ['charge', 'cooperation'] } },
      { id: 'refuse', label: 'Refuse', text: '-2 Standing, and pin a cooperation rumor.', effect: { standing: -2, coopRumors: 1 } },
      { id: 'vouch', label: 'Have your car vouch', text: 'You owe them.', effect: { debt: 'your car' } }
    ] }),
  move({ id: 'code_old_beef', title: 'Old beef: when someone you hurt outside lands on your unit', text: 'You recognize the walk before you recognize the face.',
    choices: [
      { id: 'squash', label: 'Squash it', text: 'Roll a d6 plus Nerve; on 4+, it\'s done.', check: { stat: 'nerve', target: 4, pass: { log: 'It\'s done.' }, fail: { echoes: ['he_tries_again'] } } },
      { id: 'strike', label: 'Strike first', tag: 'violent', text: 'Play a Fight.', roll: fightRoll(), effect: fightEffect(['payback']) },
      { id: 'avoid', label: 'Avoid him', text: 'Shuffle He Tries Again in.', effect: { echoes: ['he_tries_again'] } }
    ] })
];

/** The four Anyone moves sit in the middle of the table, and they return after use. */
export const ANYONE_MOVES: Card[] = [
  move({ id: 'any_hustle', title: 'When you run a hustle', text: 'Laundry, tattoos, cooking, legal work.',
    choices: [
      { id: 'run', label: 'Run it', hustle: true, text: 'Roll 1 blue, 1 white. +2 store if clean (+3 with Hustle +1). Caught: a minor.', roll: { blue: 1, white: 1, severity: 'minor' }, onClean: { commissary: 2 } },
      { id: 'pass', label: 'Think better of it', text: 'Nothing happens.', effect: {} }
    ] }),
  move({ id: 'any_grievance', title: 'When you file a grievance', text: 'There is a form. There is always a form.',
    choices: [
      { id: 'file', label: 'File it', text: 'Staff decides: usually "resolved" with no change. Roll a d6; on 6 it\'s actually fixed. Either way, the officer named in it rolls +1 blue against you next month.',
        check: { target: 6, pass: { boxes: 1, blueNext: 1, flag: 'grievance', log: 'It is actually fixed.' }, fail: { blueNext: 1, flag: 'grievance', log: 'It is resolved. Nothing changes.' } } },
      { id: 'tear', label: 'Tear it up', text: 'Nothing happens.', effect: {} }
    ] }),
  move({ id: 'any_hand', title: "When someone needs a hand and it'll cost you", text: 'Not your car, not your business. But you are the one standing there.',
    choices: [
      { id: 'help', label: 'Help', needs: { commissary: 3 }, text: 'Pay the cost Staff names (3 store); they owe you, and you write two lines at mail call.', effect: { commissary: -3, extraLine: true, leverage: true } },
      { id: 'away', label: "Don't", tag: 'lookAway', text: 'No change.', effect: {} }
    ] }),
  move({ id: 'any_question', title: 'When an officer asks you a question', text: 'He is casual about it. He is always casual about it.',
    choices: [
      { id: 'plain', label: 'Answer plainly', text: 'If anyone saw, pin a rumor to yourself.', sideRoll: { white: 2, on6: { rumors: 1 } }, effect: {} },
      { id: 'dumb', label: 'Play dumb', text: 'Staff rolls 1 blue for failure to follow a directive.', roll: { blue: 1, discretionary: true } },
      { id: 'why', label: 'Ask why', text: '+1 Standing if anyone saw; Staff rolls 1 blue.', roll: { blue: 1 }, sideRoll: { white: 2, on6: { standing: 1 } }, effect: {} }
    ] })
];
