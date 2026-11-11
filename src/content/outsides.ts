import type { Outside, TieDef } from '../engine/types';
import { move } from './helpers';

const tie = (t: Omit<TieDef, 'efv'> & { efv?: boolean }): TieDef => ({ efv: false, ...t });

/**
 * The front sets your starting Support (Heart +1 or better adds 1, up to 3). The back is your Line Home move.
 * Support is the sum of the people below who are still in your life. A child counts, and visits, only while the
 * adult who brings them is still in your life.
 *
 * `efv` marks immediate family for an extended family visit (RCW 72.09.015, confirmed by the designer): parents,
 * step-parents, grandparents, aunts and uncles, siblings, children and step-children qualify. Unmarried partners and exes
 * do not.
 */
export const OUTSIDES: Outside[] = [
  {
    id: 'mother', who: 'Your mother', front: 'Your mother. Drives two hours every other Saturday.', to: 'Mom', support: 2, privateTag: 'family',
    secret: "She co-signed your bail and lost the house over it. She hasn't said so.",
    ties: [tie({ id: 'mother', who: 'your mother', to: 'Mom', role: 'parent', weight: 2, visits: true, efv: true })],
    lineHome: move({ id: 'lh_mother', title: 'When she asks if you\'re staying out of trouble', text: 'She asks it the way she has since you were nine.',
      choices: [
        { id: 'truth', label: 'Tell her the truth', text: '-1 Standing (word gets around that you talk), +1 Support.', effect: { standing: -1, ties: [{ id: 'mother', delta: 1 }] } },
        { id: 'lie', label: 'Tell her what she wants to hear', text: 'No change. Write it in your next message home.', effect: { extraLine: true } }
      ] })
  },
  {
    id: 'partner_son', who: 'Your partner and your 6-year-old son', front: 'Your partner and your 6-year-old son.', to: 'my partner', support: 3, privateTag: 'family',
    secret: 'You told your son you were away working. Your partner has stopped correcting you.',
    ties: [
      tie({ id: 'partner', who: 'your partner', to: 'my partner', role: 'partner', weight: 2, visits: true }),
      tie({ id: 'son', who: 'your son', to: 'my son', role: 'child', weight: 1, visits: true, efv: true, minor: true, guardian: 'partner' })
    ],
    lineHome: move({ id: 'lh_partner_son', title: "When your son asks when you're coming home", text: 'He asks it on the phone, in the voice he uses when he already knows.',
      choices: [
        { id: 'date', label: 'Promise a date', text: "If you're not out by then, -1 Support.", effect: { flag: 'promise_date' } },
        { id: 'soon', label: 'Say "soon"', text: "Nothing happens, and that's the problem.", effect: {} },
        { id: 'stop', label: 'Ask your partner to stop bringing him', text: 'He stops coming. -1 Support, and you lay low easier (no count die this act).',
          effect: { ties: [{ id: 'son', gone: true, why: 'Your son stops coming to visits.' }], flag: 'act_lowdie' } }
      ] })
  },
  {
    id: 'grandmother', who: 'Your grandmother', front: "Your grandmother. Writes every week; can't travel.", to: 'Grandma', support: 1, privateTag: 'family',
    secret: 'She raised you. You never told her what happened. She knows anyway.',
    ties: [tie({ id: 'grandmother', who: 'your grandmother', to: 'Grandma', role: 'grandparent', weight: 1, visits: false, efv: true })],
    lineHome: move({ id: 'lh_grandmother', title: 'When her letters stop coming', text: 'Three weeks. She never missed one in three years.',
      choices: [
        { id: 'call', label: 'Call around', phone: true, needs: { commissary: 2 }, text: "Spend 2 store on calls, learn she's in the hospital, and write two lines next month.", effect: { commissary: -2, extraLine: true } },
        { id: 'wait', label: 'Wait', text: "Next month, roll a d6; on 1-2 she's gone.",
          effect: { defer: { in: 1, unit: 'month', chance: 1 / 3, effect: { ties: [{ id: 'grandmother', gone: true, why: 'Your grandmother has died. Nobody from the facility tells you. A cousin does, a week later.' }] } } } }
      ] })
  },
  {
    id: 'ex_daughter', who: 'Your ex and your daughter', front: 'Your ex brings your daughter when she can.', to: 'my daughter', support: 2, privateTag: 'family',
    secret: 'Your daughter asks if you are a bad person. Your ex says no. You have never asked if she means it.',
    ties: [
      tie({ id: 'ex', who: 'your ex', to: 'my ex', role: 'ex', weight: 1, visits: true }),
      tie({ id: 'daughter', who: 'your daughter', to: 'my daughter', role: 'child', weight: 1, visits: true, efv: true, minor: true, guardian: 'ex' })
    ],
    lineHome: move({ id: 'lh_ex_daughter', title: 'When your ex says she\'s seeing someone', text: 'She says it fast, like pulling off tape.',
      choices: [
        { id: 'ugly', label: 'Make it ugly', text: '+1 Standing. She stops bringing your daughter.', effect: { standing: 1, ties: [{ id: 'ex', gone: true, why: 'Your ex stops answering. Your daughter does not come without her.' }] } },
        { id: 'let', label: 'Let it go', text: 'No change.', effect: {} },
        { id: 'thank', label: 'Thank her for still bringing your daughter', text: '+1 Support.', effect: { ties: [{ id: 'ex', delta: 1 }] } }
      ] })
  },
  {
    id: 'brother_inside', who: 'Your brother, inside', front: 'Your brother, doing time at Granite Close. You write.', to: 'my brother', support: 1, privateTag: 'family',
    secret: "He's the one who should be in here. You never said so.",
    ties: [tie({ id: 'brother', who: 'your brother', to: 'my brother', role: 'sibling', weight: 1, visits: false, efv: true })],
    lineHome: move({ id: 'lh_brother', title: 'When he asks you to pass a message to his car', text: 'It comes in a letter, in his handwriting, with a smiley face. Nobody else can read it.',
      choices: [
        { id: 'pass', label: 'Pass it', text: '+1 Standing, and a Politics card is shuffled in with your name on it.', effect: { standing: 1, echoes: ['car_politics'] } },
        { id: 'refuse', label: 'Refuse', text: 'He stops writing. -1 Support.', effect: { ties: [{ id: 'brother', gone: true, why: 'Your brother stops writing.' }] } },
        { id: 'out', label: 'Tell him to get out of it', text: 'Roll a d6; on 6 he listens.', check: { target: 6, pass: { log: 'He listens. For now.' }, fail: { log: 'He does not listen.' } } }
      ] })
  },
  {
    id: 'church', who: 'A church volunteer', front: 'A volunteer you met at intake. Visits monthly.', to: 'the volunteer', support: 1,
    secret: 'She is the only person who has called you by your first name in a year.',
    ties: [tie({ id: 'volunteer', who: 'the volunteer', to: 'the volunteer', role: 'volunteer', weight: 1, visits: true })],
    lineHome: move({ id: 'lh_church', title: 'When she asks you to come to Bible study', text: 'She asks every month, and every month she seems prepared for no.',
      choices: [
        { id: 'go', label: 'Go', text: 'One scene off the yard, no Yard card. -1 Standing (the yard calls it hiding).', effect: { skipScene: 1, standing: -1 } },
        { id: 'no', label: "Don't", text: 'No change.', effect: {} },
        { id: 'other', label: 'Ask her to visit someone with no one', text: 'Give your next visit away. No visit next month.', effect: { visitBan: 'month', log: 'Someone else gets your visit.' } }
      ] })
  },
  {
    id: 'nobody_a', who: 'Nobody', front: 'No one is waiting.', to: 'no one', support: 0,
    secret: "There's no one to write to. You write anyway, to whoever you were.",
    ties: [],
    lineHome: move({ id: 'lh_nobody_a', title: 'When someone from the old neighborhood writes out of nowhere', text: 'A name you half remember, a return address you do not.',
      choices: [
        { id: 'write', label: 'Write back', text: 'Support becomes 1. Visits wait on the visitor application.',
          effect: { newTie: { id: 'neighborhood', who: 'someone from the old neighborhood', to: 'the old neighborhood', role: 'friend', weight: 1, visits: true, efv: false, wait: 2 } } },
        { id: 'ignore', label: 'Ignore it', text: 'No change.', effect: {} },
        { id: 'money', label: 'Ask for money', text: "+3 store once; they never write again.", effect: { commissary: 3 } }
      ] })
  },
  {
    id: 'nobody_b', who: 'Nobody', front: 'No one is waiting.', to: 'no one', support: 0,
    secret: "There's no one to write to. You write anyway, to whoever you were.",
    ties: [],
    lineHome: move({ id: 'lh_nobody_b', title: 'When a released player offers to put money on your books', text: 'A man you used to eat with, and a number he says he can spare.',
      choices: [
        { id: 'take', label: 'Take it', text: '+3 store, and you owe them.', effect: { commissary: 3, debt: 'the man who got out' } },
        { id: 'refuse', label: 'Refuse it', text: '+1 Standing.', effect: { standing: 1 } },
        { id: 'visit', label: 'Ask them to visit instead', text: 'Support becomes 1. Someone who has been inside waits longer on the visitor application.',
          effect: { newTie: { id: 'got_out', who: 'the man who got out', to: 'the man who got out', role: 'friend', weight: 1, visits: true, efv: false, wait: 3 } } }
      ] })
  },
  {
    id: 'father', who: 'Your father', front: "Your father. You haven't spoken in years.", to: 'Dad', support: 0,
    secret: 'The last thing you said to him was true, and you have not forgiven yourself for it.',
    ties: [],
    lineHome: move({ id: 'lh_father', title: 'When your father shows up on the visit list', text: 'His name, in the same handwriting as the birthday cards that stopped.',
      choices: [
        { id: 'see', label: 'See him', text: 'He is already approved. Support becomes 1, and you write two lines this month.',
          effect: { extraLine: true, newTie: { id: 'father', who: 'your father', to: 'Dad', role: 'parent', weight: 1, visits: true, efv: true, wait: 0 } } },
        { id: 'refuse', label: 'Refuse the visit', text: 'Nothing changes.', effect: {} }
      ] })
  },
  {
    id: 'partner_moving', who: 'Your partner (moving on)', front: 'Your partner. Fewer calls every month.', to: 'my partner', support: 2, privateTag: 'family',
    secret: 'You know why the calls are getting shorter. You have decided not to say it first.',
    ties: [tie({ id: 'partner', who: 'your partner', to: 'my partner', role: 'partner', weight: 2, visits: true })],
    lineHome: move({ id: 'lh_partner_moving', title: 'When she stops picking up', text: 'Rings, and rings, and then the recording.',
      choices: [
        { id: 'keep', label: 'Keep calling', phone: true, text: '-2 store.', effect: { commissary: -2 } },
        { id: 'friend', label: 'Ask a friend to check on her', text: 'You learn the truth. She is gone, and so are her visits.', effect: { ties: [{ id: 'partner', gone: true, why: 'She has moved on. Her name comes off your visiting list.' }] } },
        { id: 'stop', label: 'Stop calling', text: '+1 Standing. You let her go before she says it.', effect: { standing: 1, ties: [{ id: 'partner', gone: true, why: 'You stop calling. She does not call back.' }] } }
      ] })
  },
  {
    id: 'best_friend', who: 'Your best friend', front: 'Your best friend from high school. Puts money on your books.', to: 'my friend', support: 1,
    secret: "He's put money on your books every month. You don't know where it comes from.",
    ties: [tie({ id: 'friend', who: 'your best friend', to: 'my friend', role: 'friend', weight: 1, visits: true })],
    lineHome: move({ id: 'lh_best_friend', title: 'When he asks you to hold something for a guy he knows', text: "He says it's nothing. It is never nothing.",
      choices: [
        { id: 'do', label: 'Do it', text: '+3 store, and a Hold This card is shuffled in with your name on it.', effect: { commissary: 3, echoes: ['hold_this'] } },
        { id: 'refuse', label: 'Refuse', text: 'He stops coming. -1 Support.', effect: { ties: [{ id: 'friend', gone: true, why: 'Your friend stops putting money on your books, and stops coming.' }] } }
      ] })
  },
  {
    id: 'sister', who: 'Your sister', front: 'Your sister. Has your kids while you\'re down.', to: 'my sister', support: 3, privateTag: 'family',
    secret: 'She is raising your kids and working nights. You have not said thank you, because it is not enough.',
    ties: [
      tie({ id: 'sister', who: 'your sister', to: 'my sister', role: 'sibling', weight: 2, visits: true, efv: true }),
      tie({ id: 'kids', who: 'your kids', to: 'my kids', role: 'child', weight: 1, visits: true, efv: true, minor: true, guardian: 'sister' })
    ],
    lineHome: move({ id: 'lh_sister', title: "When she says she can't keep doing this", text: 'She is not angry. That is worse.',
      choices: [
        { id: 'year', label: 'Ask for one more year', text: 'No change now, -1 Support at the end of the act.', effect: { defer: { in: 1, unit: 'act', effect: { ties: [{ id: 'sister', delta: -1, why: 'Your sister has run out of patience.' }] } } } },
        { id: 'state', label: 'Tell her to call the state', text: 'Your kids go into care. You will not see them while you are down. -2 Support.',
          effect: { ties: [{ id: 'kids', gone: true, why: 'Your kids are placed in foster care. Their visits stop.' }, { id: 'sister', delta: -1 }] } },
        { id: 'efv', label: "Promise you'll make the EFV", text: 'If you lose the family visit program, -2 Support.', effect: { flag: 'promise_efv' } }
      ] })
  }
];
