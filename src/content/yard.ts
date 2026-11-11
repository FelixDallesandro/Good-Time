import type { Card, Choice } from '../engine/types';
import { fightEffect, fightRoll, thr, yard } from './helpers';

const fight = (label: string, text: string, roll = fightRoll(), echoes = ['payback']): Choice => ({
  id: 'fight', label, tag: 'violent', text, roll, effect: fightEffect(echoes)
});
const letGo = (text: string, effect = { standing: -1 } as Choice['effect']): Choice => ({
  id: 'let_go', label: 'Let it go', tag: 'letGo', text, effect
});

/* ------------------------------------------------------------------ */
/* Test (13): someone checking whether you'll stand up                  */
/* ------------------------------------------------------------------ */
const TEST: Card[] = [
  yard({ id: 'disrespected', tag: 'test', title: 'Disrespected',
    text: 'Someone from another car shoves past you at the microwave and says something in front of everyone. The dayroom goes quiet. Your car is watching. So is the officer in the bubble.',
    choices: [
      fight('Fight', 'Fight (1 blue, 3 white, 1 gray). +1 Standing whether or not you are caught. Caught: 505 Fighting, a serious. Payback will come.'),
      letGo('-1 Standing, pin a rumor, shuffle He Tries Again in.', { standing: -1, rumors: 1, echoes: ['he_tries_again'] }),
      { id: 'squash', label: 'Squash it', text: 'Threaten him, and mean it. At Standing 3+ or Proven it works. Otherwise it is a bet.', threat: thr(fightRoll(), { foldEchoes: ['payback', 'he_tries_again'] }) },
      { id: 'car', label: 'Take it to your car', tag: 'takeToCar', text: 'You owe them. They will call it in.', effect: { debt: 'your shot caller' } }
    ] }),
  yard({ id: 'cut_in_line', tag: 'test', title: 'Cut in Line',
    text: "A man cuts in front of you at chow and looks back to see what you'll do.",
    choices: [
      fight('Fight in the chow hall', 'Fight (2 blue, 4 white, 1 gray).', fightRoll(2, 4, 1)),
      letGo('-1 Standing.'),
      { id: 'loud', label: 'Say something loud enough to carry', text: 'A threat.', threat: thr(fightRoll(2, 4, 1)) }
    ] }),
  yard({ id: 'the_channel', tag: 'test', title: 'The Channel',
    text: 'Someone changes the dayroom TV in the middle of your game.',
    choices: [
      { id: 'change', label: 'Change it back', text: 'A threat.', threat: thr(fightRoll(1, 4, 1)) },
      letGo('-1 Standing.'),
      { id: 'rep', label: 'Take it up with the tier rep', text: 'No change, and you owe a favor.', effect: { debt: 'the tier rep' } }
    ] }),
  yard({ id: 'borrowed', tag: 'test', title: 'Borrowed',
    text: 'A man borrowed your headphones last week. He is wearing them now.',
    choices: [
      { id: 'take', label: 'Take them back', text: 'A threat.', threat: thr(fightRoll(1, 3, 0)) },
      letGo('-1 Standing, and he borrows again (this card is shuffled back in).', { standing: -1, echoes: ['borrowed'] }),
      { id: 'charge', label: 'Charge him', text: '+1 store, -1 Standing.', effect: { commissary: 1, standing: -1 } }
    ] }),
  yard({ id: 'mean_mug', tag: 'test', title: 'Mean Mug',
    text: 'Someone has been staring you down on the yard for three days.',
    choices: [
      { id: 'ask', label: 'Ask him what his problem is', text: 'A threat.', threat: thr(fightRoll(1, 3, 1)) },
      { id: 'ignore', label: 'Ignore it', style: 'withdraw', text: 'Your next Test card adds 1 white die.', effect: { flag: 'test_white' } },
      { id: 'car', label: 'Ask your car', text: 'Roll a d6; on 4+ they find out it is mistaken identity. Otherwise it is not.', check: { target: 4, pass: { log: 'Mistaken identity. He was looking at someone behind you.' }, fail: { echoes: ['he_tries_again'] } } }
    ] }),
  yard({ id: 'heard_talking', tag: 'test', title: 'Heard You Talking',
    text: "A man says you said something about his car. You didn't.",
    choices: [
      { id: 'deny', label: 'Deny it to his face', text: 'A threat.', threat: thr(fightRoll(1, 3, 1)) },
      { id: 'find', label: 'Find who started it', text: 'You pin it on someone else. He will want to know why.', effect: { echoes: ['he_tries_again'] } },
      { id: 'ride', label: 'Let it ride', tag: 'letGo', text: '-1 Standing, pin a rumor to yourself.', effect: { standing: -1, rumors: 1 } }
    ] }),
  yard({ id: 'weight_pile', tag: 'test', title: 'The Weight Pile',
    text: "Your bench is taken, and the man on it says he doesn't see your name on it. (A fight or assault finding bars you from weightlifting for two years: this card leaves the deck.)",
    choices: [
      { id: 'wait', label: 'Wait', style: 'withdraw', text: '-1 Standing.', effect: { standing: -1 } },
      { id: 'move', label: 'Move him', text: 'A threat.', threat: thr(fightRoll(1, 4, 1)) },
      { id: 'work', label: 'Work in with him', text: 'Roll a d6 plus Nerve; on 4+, +1 Standing and a new connection. Otherwise -1 Standing.', check: { stat: 'nerve', target: 4, pass: { standing: 1 }, fail: { standing: -1 } } }
    ] }),
  yard({ id: 'your_mother', tag: 'test', title: 'Your Mother',
    text: 'Someone makes a joke about your mother where everyone can hear.',
    choices: [
      fight('Fight', 'Fight (1 blue, 4 white).', fightRoll(1, 4, 0)),
      { id: 'laugh', label: 'Laugh it off', tag: 'letGo', text: '-2 Standing.', effect: { standing: -2 } },
      { id: 'joke', label: 'Answer with a better joke', requires: { stat: 'hustle', min: 1 }, text: 'Hustle +1 only. +1 Standing.', effect: { standing: 1 } }
    ] }),
  yard({ id: 'shower_wait', tag: 'test', title: 'Shower Wait',
    text: "Twenty minutes left before lockdown, and someone's taking his time.",
    choices: [
      { id: 'hurry', label: 'Tell him to hurry', text: 'A threat.', threat: thr(fightRoll(1, 2, 0)) },
      { id: 'wait', label: 'Wait', text: "You miss your shower and next month's visit (you won't show up looking like this).", effect: { visitBan: 'month' } },
      { id: 'skip', label: 'Skip it', text: 'No change.', effect: {} }
    ] }),
  yard({ id: 'wrong_cell', tag: 'test', title: 'Wrong Cell',
    text: "You come back and a man you don't know is sitting on your bunk.",
    choices: [
      fight('Throw him out', 'Fight in your cell (2 white).', fightRoll(0, 2, 0)),
      { id: 'ask', label: 'Ask him to leave', text: 'A threat.', threat: thr(fightRoll(0, 2, 0)) },
      { id: 'cellie', label: 'Leave and get your cellie', text: 'Your cellie handles it, and you owe him.', effect: { debt: 'your cellie' } }
    ] }),
  yard({ id: 'cheating', tag: 'test', title: 'Cheating',
    text: "A man at the card table says you're cheating.",
    choices: [
      fight('Fight at the table', 'Fight (1 blue, 3 white).', fightRoll(1, 3, 0)),
      { id: 'pay', label: 'Pay him to drop it', needs: { commissary: 2 }, text: '-2 store, -1 Standing.', effect: { commissary: -2, standing: -1 } },
      { id: 'liar', label: 'Call him a liar in front of everyone', text: 'A threat.', threat: thr(fightRoll(1, 3, 0)) }
    ] }),
  yard({ id: 'bad_store', tag: 'test', title: 'Bad Store',
    text: 'The man you bought from sold you watered-down coffee.',
    choices: [
      { id: 'back', label: 'Get it back', text: 'A threat. On success, +2 store.', threat: thr(fightRoll(1, 3, 0), { success: { commissary: 2 } }) },
      letGo('-1 Standing.'),
      { id: 'tell', label: 'Tell everyone', text: 'Pin a rumor to him, and shuffle Payback in with your name on it.', effect: { echoes: ['payback'] } }
    ] }),
  yard({ id: 'proving_himself', tag: 'test', title: 'Proving Himself',
    text: 'A new arrival picks you to prove himself on day one.',
    choices: [
      fight('Fight on the yard', 'Fight (2 blue, 4 white, 1 gray).', fightRoll(2, 4, 1)),
      { id: 'walk', label: 'Walk away', style: 'withdraw', text: '-2 Standing.', effect: { standing: -2 } },
      { id: 'standing', label: 'Let your Standing talk', text: 'At Standing 3+ he backs off. Otherwise it is a bet.', threat: thr(fightRoll(2, 4, 1)) }
    ] })
];

/* ------------------------------------------------------------------ */
/* Politics (12): your car's business                                   */
/* ------------------------------------------------------------------ */
const asked = {
  standingSet: 4, proven: true, putInWork: true
} as const;

const POLITICS: Card[] = [
  yard({ id: 'hold_this', tag: 'politics', title: 'Hold This',
    text: "A friend in your car asks you to keep a package in your cell for a week. You don't ask what's in it. A search team would.",
    choices: [
      { id: 'hold', label: 'Hold it', text: 'Until the next Count card, any search finds it (a serious, charged as whatever is inside).', effect: { contraband: 1 } },
      { id: 'refuse', label: 'Refuse', text: '-2 Standing.', effect: { standing: -2 } },
      { id: 'cell', label: "Hold it and move it to your cellie's side", text: 'Cell tag rules: if it is found, your cellie may or may not own it.', effect: { contraband: 1, cellContraband: true } }
    ] }),
  yard({ id: 'car_politics', tag: 'politics', title: 'Car Politics',
    text: 'Your car calls everyone out against another car tomorrow at yard.',
    choices: [
      fight('Show up', 'Fight on the yard; caught: 505 Fighting, a serious.', fightRoll(2, 4, 1)),
      { id: 'stay', label: 'Stay in your cell', text: 'A Mission is put on you.', effect: { mission: 1 } },
      { id: 'warn', label: 'Warn an officer', text: 'Pin a cooperation rumor; the riot does not happen.', effect: { coopRumors: 1, informed: true } }
    ] }),
  yard({ id: 'the_visit', tag: 'politics', title: 'The Visit',
    text: "Your extended family visit is on the schedule: two nights in the trailer with your family, the first in months. Today your car tells you to put in work and run a mission on someone.",
    choices: [
      { id: 'do', label: 'Do the work', tag: 'violent', auto: true, roll: { ser: '633' },
        text: 'A serious (no roll): 633 Assault. Any serious suspends you from the family visit program for six months, and then you start the application over. Standing jumps to 4, you are Proven (Test cards are discarded for you for good), and staff validate you: +1 Conspicuity.', effect: { ...asked } },
      { id: 'refuse', label: 'Refuse', text: 'A Mission is put on you.', effect: { mission: 1 } },
      { id: 'stall', label: 'Stall', text: 'Roll a d6; on 5-6 the visit comes first. Otherwise, you choose again.', check: { target: 5, pass: { log: 'The visit comes first. You have bought a month.' }, fail: { repeat: true, log: 'They are not waiting any longer.' } } }
    ] }),
  yard({ id: 'check_papers', tag: 'politics', title: 'Check His Papers',
    text: "Your car wants you to see the new guy's paperwork.",
    choices: [
      { id: 'do', label: 'Do it', text: 'Learn whether his private card has a cooperation tag. +1 Standing.', effect: { standing: 1, log: 'You read his file. You will not be able to stop knowing.' } },
      { id: 'refuse', label: 'Refuse', text: '-1 Standing.', effect: { standing: -1 } },
      { id: 'warn', label: 'Warn him first', text: 'He owes you. If your car finds out (d6 1-2), -2 Standing.', effect: { leverage: true }, check: { target: 3, pass: {}, fail: { standing: -2 } } }
    ] }),
  yard({ id: 'the_run', tag: 'politics', title: 'The Run',
    text: 'Your car wants you to bring something back from your work assignment.',
    choices: [
      { id: 'bring', label: 'Bring it', text: 'Roll 1 blue, 1 gray. +2 Standing if clean. Caught: 702 Introducing an unauthorized tool, a serious.', roll: { blue: 1, gray: 1, severity: 'major', ser: '702' }, onClean: { standing: 2 } },
      { id: 'refuse', label: 'Refuse', text: '-1 Standing.', effect: { standing: -1 } },
      { id: 'pulled', label: 'Say your job was pulled', text: 'Roll a d6; on 1-2 they check, and -2 Standing.', check: { target: 3, pass: {}, fail: { standing: -2, rumors: 1 } } }
    ] }),
  yard({ id: 'moving_day', tag: 'politics', title: 'Moving Day',
    text: 'Your car wants you to swap cells with one of theirs.',
    choices: [
      { id: 'request', label: 'Request the move', text: 'A kite to Staff: new cellie card; +1 Standing. The yard may read it as telling.', effect: { newCellie: true, standing: 1 }, sideRoll: { white: 2, on6: { coopRumors: 1 } } },
      { id: 'refuse', label: 'Refuse', text: '-1 Standing.', effect: { standing: -1 } },
      { id: 'stall', label: 'Stall', text: 'Staff decides when it happens, and you lose 1 Standing per month until it does.', effect: { monthly: { label: 'Stalling the move', standing: -1, untilAct: true } } }
    ] }),
  yard({ id: 'taxes', tag: 'politics', title: 'Taxes',
    text: 'Your car wants a cut of your hustle.',
    choices: [
      { id: 'pay', label: 'Pay', text: '-1 store every time you hustle.', effect: { flag: 'tax1' } },
      { id: 'refuse', label: 'Refuse', text: 'Shuffle Car Politics in.', effect: { echoes: ['car_politics'] } },
      { id: 'double', label: 'Pay double for protection', text: '-2 store every time you hustle, and Test cards are discarded for you this act.', effect: { flag: 'act_tax2', log: 'Test cards are discarded for you this act.' } }
    ] }),
  yard({ id: 'peace_talk', tag: 'politics', title: 'Peace Talk',
    text: 'Two cars are at war. Yours wants you to carry terms to the other.',
    choices: [
      { id: 'carry', label: 'Carry them', text: 'Roll a d6; on 4+ the talk holds: +2 Standing. Otherwise a Mission from the other car.', check: { target: 4, pass: { standing: 2 }, fail: { mission: 1 } } },
      { id: 'refuse', label: 'Refuse', text: '-1 Standing.', effect: { standing: -1 } },
      { id: 'change', label: 'Change the terms in transit', text: 'Roll a d6; on 6 it works and you are a hero (+3 Standing). Otherwise both cars want you.', check: { target: 6, pass: { standing: 3 }, fail: { mission: 1, standing: -1 } } }
    ] }),
  yard({ id: 'lookout', tag: 'politics', title: 'Lookout',
    text: "You're asked to stand at the end of the tier while something happens.",
    choices: [
      { id: 'do', label: 'Do it', text: 'Roll 1 blue, 1 gray. +1 Standing if clean. Caught: 709 Out of bounds, a serious.', roll: { blue: 1, gray: 1, severity: 'major', ser: '709' }, onClean: { standing: 1 } },
      { id: 'refuse', label: 'Refuse', text: '-1 Standing.', effect: { standing: -1 } },
      { id: 'walk', label: 'Walk away in the middle', text: '-3 Standing, and shuffle Payback in.', effect: { standing: -3, echoes: ['payback'] } }
    ] }),
  yard({ id: 'wrong_company', tag: 'politics', title: 'Wrong Company',
    text: 'Your car saw you laughing with a man from another car.',
    choices: [
      { id: 'explain', label: 'Explain', text: 'Roll a d6 plus Nerve; on 4+, fine. Otherwise -1 Standing.', check: { stat: 'nerve', target: 4, pass: { log: 'They let it go.' }, fail: { standing: -1 } } },
      { id: 'cut', label: 'Cut him off', text: 'No Standing lost, and he is an enemy now (shuffle He Tries Again in).', effect: { echoes: ['he_tries_again'] } },
      { id: 'keep', label: 'Keep talking to him', text: '-1 Standing per month, for as long as this act lasts.', effect: { monthly: { label: 'Wrong company', standing: -1, untilAct: true } } }
    ] }),
  yard({ id: 'green_light', tag: 'politics', title: 'Green Light',
    text: 'Someone in your own car has been green-lit. You are asked to help.',
    choices: [
      { id: 'help', label: 'Help', tag: 'violent', auto: true, roll: { ser: '633' }, text: 'A serious (no roll): 633 Assault. +2 Standing, and he shuffles Payback in.', effect: { standing: 2, echoes: ['payback'] } },
      { id: 'refuse', label: 'Refuse', text: 'A Mission is put on you.', effect: { mission: 1 } },
      { id: 'warn', label: 'Warn him', text: 'If he lives, he owes you everything. Roll a d6; on 1-2 your car finds out, and a Mission is put on you.', effect: { leverage: true }, check: { target: 3, pass: {}, fail: { mission: 1 } } }
    ] }),
  yard({ id: 'dues_day', tag: 'politics', title: 'Dues Day',
    text: "It's collection day, and you're short.",
    choices: [
      { id: 'favor', label: 'Pay with a favor', text: 'You owe your car.', effect: { debt: 'your car' } },
      { id: 'store', label: 'Borrow from the store man', text: 'Two-for-one debt.', effect: { debt: 'the store man' } },
      { id: 'short', label: 'Come up short', text: '-2 Standing.', effect: { standing: -2 } }
    ] })
];

/* ------------------------------------------------------------------ */
/* Life (15): debts, family, and other people's trouble                  */
/* ------------------------------------------------------------------ */
const LIFE: Card[] = [
  yard({ id: 'you_saw_that', tag: 'life', title: 'You Saw That',
    fronts: [
      "Someone lifts a bag of commissary from an open cell. The man it belongs to eats at your car's table. Nobody else seems to have noticed. They noticed you.",
      'Two men go at it in the' + " camera's blind spot by the laundry. Nobody else seems to have noticed. They noticed you."
    ],
    text: 'They noticed you.',
    choices: [
      { id: 'inform', label: 'Inform', text: 'Refill one good-time box. Roll 2 white; on any 6, pin a cooperation rumor and shuffle Payback in.',
        effect: { boxes: 1, informed: true }, sideRoll: { white: 2, on6: { coopRumors: 1, echoes: ['payback'] } } },
      { id: 'extort', label: 'Extort', hustle: true, text: 'A threat. On success, gain store. Either way, shuffle Payback in.',
        threat: thr(fightRoll(), { success: { commissary: 3, echoes: ['payback'] }, followExtra: { commissary: 3 } }) },
      { id: 'ignore', label: 'Ignore it', text: 'No cost, unless the victim rides with your car (then -1 Standing).',
        cond: { front: 0, then: { standing: -1 }, else: {} } },
      { id: 'blackmail', label: 'Blackmail', text: 'Say nothing, yet. Run a leverage string. Cut it later for a favor. They know you know.', effect: { leverage: true } }
    ] }),
  yard({ id: 'fresh_fish', tag: 'life', title: 'Fresh Fish',
    text: 'A scared first-timer is being lined up for extortion.',
    choices: [
      { id: 'step_in', label: 'Step in', text: 'A threat against the extortioner. On success, he owes you.',
        threat: thr(fightRoll(), { success: { standing: 1, leverage: true } }) },
      { id: 'look_away', label: 'Look away', tag: 'lookAway', text: 'No change. Write it in your notebook or message home.', effect: { extraLine: true } },
      { id: 'charge', label: 'Charge him for protection', text: '+2 store a month, -1 Standing.', effect: { standing: -1, monthly: { label: 'Protection money', commissary: 2 } } }
    ] }),
  yard({ id: 'store_man', tag: 'life', title: 'The Store Man',
    text: 'Your cellie owes two-for-one and cannot pay.',
    choices: [
      { id: 'cover', label: 'Cover him', needs: { commissary: 6 }, text: "Pay what he owes (6 store). He owes you.", effect: { commissary: -6, leverage: true } },
      { id: 'handle', label: 'Tell him to handle it', text: "If the store man comes to the cell, you're in the room.", effect: { echoes: ['store_collects'] } },
      { id: 'stash', label: 'Tell the store man where his stash is', text: "+1 Standing with the store man, and your cellie knows.", effect: { standing: 1, newCellie: true } }
    ] }),
  yard({ id: 'phone_vent', tag: 'life', title: 'The Phone',
    text: "A search team is two cells away, and your cellie's phone is somewhere in your cell. A phone is a Category A, the same as a weapon: it means someone in a uniform brought it in, and the institution will want to know who.",
    choices: [
      { id: 'claim', label: 'Claim it', tag: 'violent', auto: true, roll: { ser: '882' }, text: 'A serious (no roll): 882 Cell phone. You lose phone privileges for months. +1 Standing, and he owes you.', effect: { standing: 1, leverage: true } },
      { id: 'silent', label: 'Say nothing', text: 'Cell tag: you both roll the Eyes with 2 blue dice. Caught: 882, a serious.', roll: { blue: 2, ser: '882' } },
      { id: 'tell', label: "Tell the officer it's his", text: 'No roll for you; pin a cooperation rumor. He will look for who talked.', effect: { coopRumors: 1, informed: true, echoes: ['payback'] } },
      { id: 'flush', label: 'Flush it', text: 'Roll 1 blue die. If clean, -1 Standing and he is out $400. Caught: 894 Disposing of evidence.', roll: { blue: 1, ser: '894' }, onClean: { standing: -1, echoes: ['store_collects'] } }
    ] }),
  yard({ id: 'bad_news', tag: 'life', title: 'Bad News',
    text: 'A call home: someone you love has died. The funeral furlough is denied.',
    choices: [
      { id: 'grieve', label: 'Grieve in your cell', text: 'Skip your next scene, and write two lines at mail call.', effect: { skipScene: 1, extraLine: true } },
      { id: 'grievance', label: 'File a grievance', text: 'Staff decides; it is "resolved." The officer named rolls +1 blue against you next month.', effect: { blueNext: 1, flag: 'grievance' } },
      { id: 'out', label: 'Take it out on someone', text: 'Your next Test card is a Fight, automatically.', effect: { flag: 'next_test_fight' } }
    ] }),
  yard({ id: 'kitchen_job', tag: 'life', title: 'Kitchen Job',
    text: "You're offered a job in the kitchen. Food, and access.",
    choices: [
      { id: 'take', label: 'Take it', text: '+1 store a month; your car will ask for things (shuffle The Run in).', effect: { job: true, echoes: ['the_run'] } },
      { id: 'no', label: 'Turn it down', text: 'No change.', effect: {} },
      { id: 'refuse', label: 'Take it and refuse every ask', text: '-1 Standing for this act.', effect: { job: true, standing: -1 } }
    ] }),
  yard({ id: 'sick_call', tag: 'life', title: 'Sick Call',
    text: "You've been sick for a week. Medical has a waitlist and a copay.",
    choices: [
      { id: 'copay', label: 'Pay the copay', needs: { commissary: 1 }, text: '-1 store; seen in two weeks.', effect: { commissary: -1 } },
      { id: 'wait', label: 'Wait it out', text: "Roll a d6; on 1-2 you're Hurt.", check: { target: 3, pass: {}, fail: { hurtCheck: 6 } } },
      { id: 'trade', label: 'Trade for meds on the tier', needs: { commissary: 2 }, text: '-2 store, roll 1 white. Caught: a general (351) or a serious (669 Trading prescribed medication).', roll: { white: 1, gen: '351', ser: '669' }, effect: { commissary: -2 } }
    ] }),
  yard({ id: 'wrong_mail', tag: 'life', title: 'Wrong Mail',
    text: "Someone else's mail lands in your cell: photos and a letter.",
    choices: [
      { id: 'give', label: 'Give it back', text: '+1 Standing.', effect: { standing: 1 } },
      { id: 'read', label: 'Read it first', text: "Learn something about a man you'll be eating next to.", effect: { log: 'You learn one man\'s private business.' } },
      { id: 'keep', label: 'Keep the photos', text: '-2 Standing if anyone finds out.', sideRoll: { white: 2, on6: { standing: -2 } }, effect: {} }
    ] }),
  yard({ id: 'the_appeal', tag: 'life', title: 'The Appeal',
    text: 'A jailhouse lawyer says he can file an appeal for you. For a price.',
    choices: [
      { id: 'pay', label: 'Pay', needs: { commissary: 4 }, text: '-4 store; roll a d6 next act. On a 6, -1 month from your sentence.', effect: { commissary: -4, defer: { in: 1, unit: 'act', chance: 1 / 6, effect: { sentence: -1, log: 'The appeal worked: one month off your sentence.' } } } },
      { id: 'self', label: 'Do it yourself in the law library', text: 'Two scenes, same roll.', effect: { skipScene: 2, defer: { in: 1, unit: 'act', chance: 1 / 6, effect: { sentence: -1, log: 'The appeal worked: one month off your sentence.' } } } },
      { id: 'let', label: 'Let it go', text: 'No change.', effect: {} }
    ] }),
  yard({ id: 'divorce_papers', tag: 'life', title: 'Divorce Papers', needsTie: ['partner'],
    text: 'Legal mail, opened in front of you. Your partner is filing. If she goes, she comes off your visiting list, and any child who only comes with her stops coming too.',
    choices: [
      { id: 'sign', label: 'Sign', text: 'She is gone.', effect: { ties: [{ id: 'partner', gone: true, why: 'You sign. Her name comes off your visiting list.' }] } },
      { id: 'refuse', label: 'Refuse to sign', text: 'No change now. At the end of the act, she is gone anyway.', effect: { defer: { in: 1, unit: 'act', effect: { ties: [{ id: 'partner', gone: true, why: 'The papers came back anyway. Her name comes off your visiting list.' }] } } } },
      { id: 'call', label: 'Call her', phone: true, needs: { commissary: 2 }, text: '-2 store; roll a d6 plus Heart; on 5+, she waits. Otherwise she is gone.', effect: { commissary: -2 }, check: { stat: 'heart', target: 5, pass: { log: 'She waits.' }, fail: { ties: [{ id: 'partner', gone: true, why: 'She does not wait.' }] } } }
    ] }),
  yard({ id: 'spread', tag: 'life', title: 'Spread',
    text: "It's a man's birthday. The tier is putting together a spread.",
    choices: [
      { id: 'chip', label: 'Chip in', needs: { commissary: 1 }, text: '-1 store, +1 Standing.', effect: { commissary: -1, standing: 1 } },
      { id: 'no', label: "Don't", text: '-1 Standing.', effect: { standing: -1 } },
      { id: 'make', label: 'Make the spread', requires: { stat: 'hustle', min: 1 }, needs: { commissary: 2 }, text: 'Hustle +1 only. -2 store, +2 Standing.', effect: { commissary: -2, standing: 2 } }
    ] }),
  yard({ id: 'man_down', tag: 'life', title: 'Man Down',
    text: 'A man on your tier is overdosing in his cell.',
    choices: [
      { id: 'staff', label: 'Call for staff', text: "He lives. Staff roll 1 blue against you (they'll ask what you saw); pin a rumor.", roll: { blue: 1, gen: '103' }, effect: { rumors: 1 } },
      { id: 'cellie', label: 'Get his cellie to call', text: "Roll a d6; on 1-2 it's too late. You carry that: -1 Heart.", check: { target: 3, pass: { log: 'He lives.' }, fail: { statDelta: { heart: -1 }, log: 'It was too late.' } } },
      { id: 'nothing', label: 'Do nothing', text: 'No roll. Write it in your notebook or message home.', effect: { extraLine: true } }
    ] }),
  yard({ id: 'rat_rumor', tag: 'life', title: 'Rat Rumor',
    text: 'A friend tells you that another friend is a rat.',
    choices: [
      { id: 'believe', label: 'Believe it', text: 'Cut him off. If it was false (d6 1-3), you owe him.', check: { target: 4, pass: { log: 'It was true.' }, fail: { debt: 'the man you wronged' } } },
      { id: 'ask', label: 'Ask him', text: 'A threat.', threat: thr(fightRoll(1, 3, 0)) },
      { id: 'car', label: 'Tell your car', text: 'The rumor is pinned to him, true or not. +1 Standing, and he will come for you.', effect: { standing: 1, echoes: ['payback'] } }
    ] }),
  yard({ id: 'records_error', tag: 'life', title: 'Records Error',
    text: 'Your release date in the system is wrong, by a month, in the state\'s favor.',
    choices: [
      { id: 'grievance', label: 'File a grievance', text: "Roll a d6; on 4+ it's fixed next month. Otherwise it stays wrong. The officer named rolls +1 blue against you next month.",
        effect: { blueNext: 1, flag: 'grievance' }, check: { target: 4, pass: { log: 'The record is corrected.' }, fail: { sentence: 1 } } },
      { id: 'kite', label: 'Get a kite to records through a decent officer', text: 'If Reyes is on shift, he fixes it. Anyone else, roll as a grievance.',
        cond: { officer: 'decent', then: { log: 'Reyes fixes it, quietly.' }, else: { sentence: 1, log: 'The kite goes nowhere. It stays wrong.' } } },
      { id: 'wait', label: 'Wait', text: 'It stays wrong: +1 month.', effect: { sentence: 1 } }
    ] }),
  yard({ id: 'pen_pal', tag: 'life', title: 'Pen Pal',
    text: 'A woman writes you through a pen-pal site. She asks for your tablet PIN "to send money."',
    choices: [
      { id: 'give', label: 'Give it', text: 'Lose all your store.', effect: { commissary: -999 } },
      { id: 'no', label: "Don't", text: 'No change.', effect: {} },
      { id: 'honest', label: 'Write back and keep it honest', text: 'Support 1 if you have none. Messages only: she will never visit.',
        cond: { supportMax: 0, then: { newTie: { id: 'pen_pal', who: 'your pen pal', to: 'my pen pal', role: 'stranger', weight: 1, visits: false, efv: false } }, else: {} } }
    ] })
];

/* ------------------------------------------------------------------ */
/* Special cards: enter the deck only when a rule or choice puts them there */
/* ------------------------------------------------------------------ */
const SPECIAL: Card[] = [
  yard({ id: 'payback', tag: 'test', echo: true, title: 'Payback',
    text: "The man you crossed and two friends run up on you in the dayroom, in front of everyone, officers included. It is meant to be seen. Nobody wonders who started it: you roll no Eyes. Roll for Hurt. Staff may move you off mainline afterward, not because you are in trouble, but because they are not sure you are safe there.",
    choices: [
      { id: 'again', label: 'Fight again later', tag: 'violent', text: 'Hurt check. Shuffle Payback in once more. Staff may move you for your safety.', effect: { hurtCheck: 1, echoes: ['payback'], segSafety: 0.35 } },
      { id: 'report', label: 'Report it', text: "Hurt check. You wear a rat jacket: pin a cooperation rumor. Staff are more likely to move you for your safety.", effect: { hurtCheck: 1, coopRumors: 1, segSafety: 0.6 } },
      { id: 'take', label: 'Take it and say nothing', text: "Hurt check. -1 Standing, and it's over. Staff may still move you.", effect: { hurtCheck: 1, standing: -1, segSafety: 0.25 } }
    ] }),
  yard({ id: 'he_tries_again', tag: 'test', echo: true, title: 'He Tries Again',
    text: 'The same man takes your seat at chow. Everyone remembers last time.',
    choices: [
      fight('Fight now', 'With more eyes (2 blue, 4 white, 1 gray).', fightRoll(2, 4, 1)),
      letGo('-2 Standing.', { standing: -2 }),
      { id: 'squash', label: 'Squash it', text: 'A threat, with -1 to the roll.', threat: thr(fightRoll(2, 4, 1), { mod: -1 }) }
    ] }),
  yard({ id: 'leverage', tag: 'special', echo: true, title: 'Leverage',
    text: "Someone knows people outside put money on your books. They want a cut, or they'll start something and make sure your name ends up on the infraction report.",
    choices: [
      { id: 'pay', label: 'Pay', text: 'Lose store equal to your Support. Shuffle Leverage back in: they will be back.', effect: { commissarySupport: true, echoes: ['leverage'] } },
      { id: 'swallow', label: 'Swallow it', text: '-1 Standing; they find someone else.', effect: { standing: -1 } },
      { id: 'refuse', label: 'Refuse', tag: 'violent', text: 'It becomes a Fight. Caught: 505, a serious, which also ends any family visit program for six months.', roll: fightRoll(), effect: fightEffect(['payback']) },
      { id: 'threat', label: 'Threaten', text: 'A threat.', threat: thr(fightRoll()) },
      { id: 'car', label: 'Take it to your car', tag: 'takeToCar', text: 'You owe them for it.', effect: { debt: 'your car' } }
    ] }),
  yard({ id: 'mission', tag: 'special', echo: true, title: 'Mission',
    text: "They catch you somewhere public, in front of the officers, where everyone can see it happen. It is clear who the aggressor is, so defending yourself rolls no Eyes. Sometimes the victim doesn't even go to seg. Sometimes staff move you off mainline anyway, for your safety. On a Mission you're Hurt on 1-3, because sometimes it's a blade.",
    choices: [
      { id: 'back', label: 'Come back to the yard', text: 'Shuffle two more Missions in. They will keep coming. Staff may move you for your safety.', effect: { hurtCheck: 3, mission: 2, segSafety: 0.5 } },
      { id: 'hit', label: 'Hit back harder', tag: 'violent', text: 'Past defending yourself, in front of officers: now it is a fight, and caught is 505. Each time you hit back and are not caught, make a mark. At three marks, every Mission is removed.',
        roll: fightRoll(2, 4, 1), effect: { hurtCheck: 3, standing: 1, segSafety: 0.5 }, onClean: { markHit: true } },
      { id: 'check', label: 'Check in', text: 'Ask to be moved. Your Standing drops to 0 and you leave the yard for protective custody. Your game ends, and your letters are read in the epilogue.', effect: { standingSet: 0, pc: true } }
    ] }),
  yard({ id: 'store_collects', tag: 'life', echo: true, title: "The Store Man's Cousin",
    text: "The store man's cousin is collecting what your cellie owes. He's looking at you.",
    choices: [
      { id: 'pay', label: 'Pay it for him', needs: { commissary: 8 }, text: 'Pay 8 store. +1 Standing.', effect: { commissary: -8, standing: 1 } },
      { id: 'send', label: 'Point him at your cellie', text: '-1 Standing. It is his problem now, and you both know whose it was.', effect: { standing: -1 } },
      { id: 'car', label: 'Take it to your car', tag: 'takeToCar', text: 'No cost today. You owe them.', effect: { debt: 'your car' } }
    ] }),
  yard({ id: 'put_in_work', tag: 'politics', echo: true, title: 'The Ask',
    text: 'A debt you owe is being called in. Your car asks you to put in work. Nobody says what the work is. Nobody has to.',
    choices: [
      { id: 'do', label: 'Do it', tag: 'violent', auto: true,
        text: 'No roll: in a unit full of cameras and witnesses, you are caught: 633 Assault, a serious. Standing jumps to 4, you are Proven (Test cards are discarded for you for good), and staff validate you: +1 Conspicuity.',
        effect: { standingSet: 4, proven: true, putInWork: true } },
      { id: 'refuse', label: 'Refuse', text: 'Lose 2 Standing. Car Politics comes back.', effect: { standing: -2, echoes: ['car_politics'] } },
      { id: 'buy', label: 'Buy your way out', requires: { stat: 'hustle', min: 1 }, needs: { commissary: 8 }, text: "Hustle +1 only. Pay 8 store and lose 1 Standing. You'll be asked again.", effect: { commissary: -8, standing: -1, echoes: ['put_in_work'] } }
    ] })
];

export const YARD_CARDS: Card[] = [...TEST, ...POLITICS, ...LIFE, ...SPECIAL];
export const YARD_DECK_SIZE = TEST.length + POLITICS.length + LIFE.length; // 40
