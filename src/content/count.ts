import type { Card } from '../engine/types';
import { count, fightEffect, fightRoll, prompt, thr } from './helpers';

/** Staff draws one at the start of every month. The officer is named on the card. */
export const COUNT_CARDS: Card[] = [
  count({ id: 'new_memo', officer: 'Okafor', rule: 'memo', title: 'New Memo',
    text: 'Two memos posted side by side. All residents must stay in their assigned area at all times. All residents must report to the gym at 2 p.m. You obey both. You are, technically, out of bounds.' }),
  count({ id: 'random_search', officer: 'Haskins', rule: 'search', title: 'Random Search',
    text: '"Targeted" cell searches today. Every cell turns out to be targeted. Anyone holding contraband, or living with a cellie who is, rolls 1 blue die plus their Conspicuity.' }),
  count({ id: 'inspector', officer: 'Haskins', title: 'The Inspector',
    text: 'A state inspector is touring. The unit is repainted and lunch is good for one day. He asks if anyone has anything to report.',
    choices: [
      { id: 'truth', label: 'Tell the inspector the truth', text: 'A grievance finally lands: refill 1 box. Staff retaliate: +2 blue dice on every roll next month. A cooperation rumor gets pinned to you.', effect: { boxes: 1, blueNext: 2, coopRumors: 1 } },
      { id: 'silent', label: "Say everything's fine", text: 'Nothing changes. Lunch was good.', effect: {} }
    ] }),
  count({ id: 'pruitt', officer: 'Pruitt', title: "Pruitt's Last Week",
    text: "He's retiring Friday. No blue dice this month, unless someone makes his last week harder. Then 2 blue on everything.",
    choices: [
      { id: 'quiet', label: 'Leave him alone', text: 'No blue dice this month.', effect: { noBlue: true } },
      { id: 'hard', label: 'Make his last week harder', text: 'Gain 1 Standing for needling the man. Then 2 blue dice on everything this month.', effect: { standing: 1, blueMonth: 2 } }
    ] }),
  count({ id: 'lockdown', officer: 'Moss', title: 'Lockdown',
    text: 'Nobody moves. No scenes outside your cell this month. Every scene is played in your cell, with your cellie.', effect: { lockdown: true } }),
  count({ id: 'strike', officer: 'Haskins', title: 'The Strike',
    text: 'A work stoppage is called. Every man on the unit chooses in secret: hold, or break. You will find out what the others chose when it is over.',
    choices: [
      { id: 'hold', label: 'Hold', text: 'If everyone holds, everyone refills a box. If anyone breaks, those who held are written up: 682 Work stoppage, 652 Group demonstration, or 651 Inciting a riot, whichever staff choose.', special: 'strikeHold' },
      { id: 'break', label: 'Break', text: 'Break alone and staff reward you with two boxes. Break with others and nothing changes.', special: 'strikeBreak' }
    ] }),
  count({ id: 'class_canceled', officer: 'Reyes', title: 'Class Canceled',
    text: "A sign on the education door. The AA degree class is canceled again: the instructor's contract wasn't renewed, and the textbooks are still in the mailroom. Anyone who spent a scene working toward their degree gains nothing this month. The sign-up sheet stays on the wall.", effect: { log: 'The sign-up sheet stays on the wall.' } }),
  count({ id: 'visiting_closed', officer: 'Moss', rule: 'visits', title: 'Visiting Room Closed',
    text: 'Staffing shortage. No visits this month, for anyone. The notice goes up Saturday morning, after the families are already in the parking lot.' }),
  count({ id: 'mailroom_backlog', officer: 'Okafor', rule: 'backlog', title: 'Mailroom Backlog',
    text: 'The tablets say "sent." Every message this month is delayed a month.' }),
  count({ id: 'shakedown', officer: 'Brandt', rule: 'shakedown', title: 'Shakedown',
    text: 'The whole unit, strip to the walls. Everyone holding anything, or whose cellie is, rolls 2 blue dice. Cell tags apply.' }),
  count({ id: 'k9', officer: 'Okafor', rule: 'k9', title: 'K-9 Sweep',
    text: 'The dogs come through at count. Any cell with drugs or pills (yours or your cellie\'s) rolls 1 extra blue die.' }),
  count({ id: 'random_ua', officer: 'Reyes', rule: 'ua', title: 'Random UA',
    text: 'Names called for urinalysis, any time of day. Each player rolls a d6; on a 1, you are called. If you gave in to a drug or drinking Pull this act, you come up dirty: 675, a serious. Clean or not, you have a set time to produce a sample. Failing to produce is a 676, and it is treated as a dirty.' }),
  count({ id: 'new_officer', officer: 'Dahl', rule: 'dahl', title: 'The New Officer',
    text: 'First week on the unit. Dahl writes up everything he sees: +1 blue die on every discretionary rule this month, for everyone.' }),
  count({ id: 'brandt_on_shift', officer: 'Brandt', rule: 'brandt', title: 'Brandt on Shift',
    text: 'He remembers names. Anyone who filed a grievance this game rolls 2 extra blue dice this month.' }),
  count({ id: 'reyes_on_shift', officer: 'Reyes', rule: 'reyes', title: 'Reyes on Shift',
    text: 'Firm, fair, tired. The first general violation anyone commits this month is handled on site: a Behavior Observation Entry, no infraction report.' }),
  count({ id: 'double_shift', officer: 'Moss', rule: 'double', title: 'Double Shift',
    text: "Sixteen hours in. Moss isn't looking: -1 blue die on every roll this month (to a minimum of 0)." }),
  count({ id: 'property_limits', officer: 'Okafor', rule: 'property', title: 'Property Limits',
    text: 'New property matrix posted. Anything over the new limit is contraband. Anyone holding more than 10 store must give up the extra or roll 1 blue die.',
    choices: [
      { id: 'give', label: 'Give up the extra', text: 'Your store drops to 10.', effect: { commissaryCap: 10, log: 'You give up everything over 10.' } },
      { id: 'keep', label: 'Keep it', text: 'Roll 1 blue die. Caught: a general (356).', roll: { blue: 1, gen: '356' } }
    ] }),
  count({ id: 'price_increase', officer: 'Haskins', rule: 'price', title: 'Price Increase',
    text: 'New commissary prices. Everything costs 1 extra store this month, including messages home.' }),
  count({ id: 'tablet_outage', officer: 'Moss', rule: 'tablet', title: 'Tablet Outage',
    text: 'The kiosk is down. No messages this month, in or out. Visits still happen.' }),
  count({ id: 'validation_sweep', officer: 'Brandt', rule: 'validation', title: 'Validation Sweep',
    text: 'Gang intelligence is reviewing files. Anyone with tattoos counted in their Conspicuity rolls a d6; on 1-2 you are validated (+1 Conspicuity), member or not.' }),
  count({ id: 'the_offer', officer: 'Haskins', rule: 'offer', title: 'The Offer',
    text: 'A quiet word in the office. Staff offers you the Debriefing deal. You must answer before mail call.' }),
  count({ id: 'transfer_bus', officer: 'Okafor', rule: 'transfer', title: 'Transfer Bus',
    text: "The chain bus is in the lot. Your cellie is moved out, and a new one is dealt." }),
  count({ id: 'holiday_meal', officer: 'Reyes', rule: 'holiday', title: 'Holiday Meal',
    text: 'Real food, once. Everyone gains 1 store. Any Test card drawn this month adds 1 white die (portions start fights).' }),
  count({ id: 'count_not_clear', officer: 'Moss', rule: 'clear', title: "Count Doesn't Clear",
    text: 'Recount after recount. No scene this month can leave the unit. Anyone laying low rolls 1 extra blue die for count.' })
];

/** Events Staff and the game raise: leaks, the informant call, the debriefing deal, and so on. */
export const PROMPTS: Card[] = [
  prompt({ id: 'leak_told', title: 'A Name Slips',
    text: "An officer lets a name slip while he's counting: a man on your tier, one of your own car, he says, 'has been very helpful lately.' He says it to you, and looks at the wall while he does. Staff aren't bound to protect anyone, and the yard is now divided, which was the point.",
    choices: [
      { id: 'retaliate', label: 'Retaliate', tag: 'violent', text: 'Play it as a fight: roll the Eyes. Gain 1 Standing. Caught: 505 Fighting, a serious.', roll: fightRoll(1, 3, 0), effect: fightEffect() },
      { id: 'let_go', label: 'Let it go', tag: 'letGo', text: 'Lose 1 Standing. The yard watched you take it.', effect: { standing: -1 } }
    ] }),
  prompt({ id: 'leak_about', title: 'Your Name Slips',
    text: "You hear it from three people before lunch: you were seen leaving the bubble. You weren't. It doesn't matter. Staff sometimes hang a snitch label on someone who never talked.",
    choices: [
      { id: 'confront', label: 'Hunt down the source', tag: 'violent', text: 'Roll the Eyes. Gain 1 Standing. Caught: 505 Fighting, a serious. One rumor comes down.', roll: fightRoll(1, 3, 0), effect: { ...fightEffect(), removeRumors: 1 } },
      { id: 'deny', label: 'Deny it', text: 'Spend 1 Standing to pull one rumor.', effect: { standing: -1, removeRumors: 1 } },
      { id: 'ride', label: 'Let it ride', text: 'A cooperation rumor gets pinned to you, true or not.', effect: { coopRumors: 1 } }
    ] }),
  prompt({ id: 'informant_call', title: 'The Officer Calls You In',
    text: "An officer asks for you by name. He doesn't say what it's about. You both know.",
    choices: [
      { id: 'give', label: 'Give him something', text: 'Refill 1 good-time box. Someone may see you walk to the bubble.', effect: { boxes: 1, informed: true }, sideRoll: { white: 2, on6: { coopRumors: 1, echoes: ['payback'] } } },
      { id: 'refuse', label: 'Refuse', text: '+1 blue die on your next roll.', effect: { blueOnce: 1 } }
    ] }),
  prompt({ id: 'debrief', title: 'A Deal',
    text: "A lieutenant you've never met offers you a deal: name names. He'll pull every rumor pinned to you and refill two of your good-time boxes. It is the biggest reward in the building. He doesn't say what it costs on the other side.",
    choices: [
      { id: 'accept', label: 'Name names', text: 'Pull every rumor and refill 2 boxes. The yard learns it: lose 3 Standing, and Payback comes twice.', effect: { removeRumors: 'all', boxes: 2, standing: -3, informed: true, echoes: ['payback', 'payback'] } },
      { id: 'decline', label: 'Decline', text: 'Nothing changes.', effect: {} }
    ] }),
  prompt({ id: 'targeted', title: 'A Target',
    text: 'You have no standing, and everyone on the tier has noticed. Somebody has decided you are this month\'s problem to solve: extortion, theft, or somebody\'s dirty work. They say you have until count.',
    choices: [
      { id: 'pay', label: 'Pay them to be left alone', needs: { commissary: 4 }, text: 'Pay 4 store. It buys the month, not the year.', effect: { commissary: -4 } },
      { id: 'work', label: 'Carry something across the tier for them', text: 'Roll the Eyes; caught is a general (053). Gain 1 Standing: they remember who was useful.', roll: { blue: 1, white: 2, severity: 'minor', gen: '053' }, effect: { standing: 1 } },
      { id: 'refuse', label: 'Say no', text: 'A hard hurt check. Nobody enjoys being told no by a man with no standing.', effect: { hurtCheck: 2 } }
    ] }),
  prompt({ id: 'living_with_it', title: 'Living With It',
    text: "You finally work out what your cellie has going. Whatever is found in a cell belongs to everyone in it: his hustle is your risk, you didn't choose him, and you can't fully trust him to claim it.",
    choices: [
      { id: 'ride', label: 'Let it ride', text: 'Take a cut and share the risk: you take the tag if it is found.', effect: { cellieCut: true } },
      { id: 'stop', label: 'Tell him to stop', text: 'A threat. If he calls it, follow through or fold.', threat: thr(fightRoll(0, 2, 0)) },
      { id: 'fight', label: 'Fight him', tag: 'violent', text: 'Behind a closed door there are fewer eyes: roll only white dice. Then roll for marks: on 1-3 your face shows the fight, and you lay low.', roll: fightRoll(0, 2, 0), effect: { standing: 1, hurtCheck: 1, marksCheck: true } },
      { id: 'move', label: 'Request a move', text: 'A kite to Staff. The yard may read it as telling.', effect: { newCellie: true }, sideRoll: { white: 2, on6: { coopRumors: 1 } } },
      { id: 'tell', label: 'Tell staff', text: 'He takes the charge alone. Pin a cooperation rumor to yourself.', effect: { coopRumors: 1, informed: true, newCellie: true } }
    ] }),
  prompt({ id: 'efv', title: 'Extended Family Visit',
    text: 'Two nights in a trailer inside the fence. A kitchen, a couch, a door you can close yourself. Staff still count you. For two days nobody calls you by your number. No Yard card, no Eyes. You write two lines home.',
    effect: { extraLine: true, flag: 'efv_used' } }),
  prompt({ id: 'send_off', title: 'Going Home',
    text: "A man from your car goes home Friday. The car walks him to the gate line on the yard, every one of them. You are on loss of privileges, and your photo is on the sheet in the bubble.",
    choices: [
      { id: 'go', label: 'Go out anyway', text: '+1 Standing. Being on the yard under sanction is a 658, a serious: roll 2 blue dice, because every officer has your photo.', roll: { blue: 2, severity: 'major', ser: '658' }, effect: { standing: 1 } },
      { id: 'stay', label: 'Stay in', text: '-1 Standing. He will understand. The car might not.', effect: { standing: -1 } }
    ] })
];
