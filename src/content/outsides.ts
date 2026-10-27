import type { Outside } from '../engine/types';
import { move } from './helpers';

/** The front sets your starting Support (Heart +1 or better adds 1, up to 3). The back is your Line Home move. */
export const OUTSIDES: Outside[] = [
  {
    id: 'mother', who: 'Your mother', front: 'Your mother. Drives two hours every other Saturday.', to: 'Mom', support: 2, privateTag: 'family',
    secret: "She co-signed your bail and lost the house over it. She hasn't said so.",
    lineHome: move({ id: 'lh_mother', title: 'When she asks if you\'re staying out of trouble', text: 'She asks it the way she has since you were nine.',
      choices: [
        { id: 'truth', label: 'Tell her the truth', text: '-1 Standing (word gets around that you talk), +1 Support.', effect: { standing: -1, support: 1 } },
        { id: 'lie', label: 'Tell her what she wants to hear', text: 'No change. Write it in your next message home.', effect: { extraLine: true } }
      ] })
  },
  {
    id: 'partner_son', who: 'Your partner and your 6-year-old son', front: 'Your partner and your 6-year-old son.', to: 'my partner', support: 3, privateTag: 'family',
    secret: 'You told your son you were away working. Your partner has stopped correcting you.',
    lineHome: move({ id: 'lh_partner_son', title: "When your son asks when you're coming home", text: 'He asks it on the phone, in the voice he uses when he already knows.',
      choices: [
        { id: 'date', label: 'Promise a date', text: "If you're not out by then, -1 Support.", effect: { flag: 'promise_date' } },
        { id: 'soon', label: 'Say "soon"', text: "Nothing happens, and that's the problem.", effect: {} },
        { id: 'stop', label: 'Ask your partner to stop bringing him', text: '-1 Support, and you lay low easier (no count die this act).', effect: { support: -1, flag: 'act_lowdie' } }
      ] })
  },
  {
    id: 'grandmother', who: 'Your grandmother', front: "Your grandmother. Writes every week; can't travel.", to: 'Grandma', support: 1, privateTag: 'family',
    secret: 'She raised you. You never told her what happened. She knows anyway.',
    lineHome: move({ id: 'lh_grandmother', title: 'When her letters stop coming', text: 'Three weeks. She never missed one in three years.',
      choices: [
        { id: 'call', label: 'Call around', needs: { commissary: 2 }, text: "Spend 2 store on calls, learn she's in the hospital, and write two lines at the next mail call.", effect: { commissary: -2, extraLine: true } },
        { id: 'wait', label: 'Wait', text: "Next mail call, roll a d6; on 1-2 she's gone, and Support drops to 0.",
          effect: { defer: { in: 1, unit: 'month', chance: 1 / 3, effect: { supportSet: 0, log: 'She is gone.' } } } }
      ] })
  },
  {
    id: 'ex_daughter', who: 'Your ex and your daughter', front: 'Your ex brings your daughter when she can.', to: 'my daughter', support: 2, privateTag: 'family',
    secret: 'Your daughter asks if you are a bad person. Your ex says no. You have never asked if she means it.',
    lineHome: move({ id: 'lh_ex_daughter', title: 'When your ex says she\'s seeing someone', text: 'She says it fast, like pulling off tape.',
      choices: [
        { id: 'ugly', label: 'Make it ugly', text: '-1 Support, +1 Standing.', effect: { support: -1, standing: 1 } },
        { id: 'let', label: 'Let it go', text: 'No change.', effect: {} },
        { id: 'thank', label: 'Thank her for still bringing your daughter', text: '+1 Support.', effect: { support: 1 } }
      ] })
  },
  {
    id: 'brother_inside', who: 'Your brother, inside', front: 'Your brother, doing time at Granite Close. You write.', to: 'my brother', support: 1, privateTag: 'family',
    secret: "He's the one who should be in here. You never said so.",
    lineHome: move({ id: 'lh_brother', title: 'When he asks you to pass a message to his car', text: 'It comes in a letter, in his handwriting, with a smiley face. Nobody else can read it.',
      choices: [
        { id: 'pass', label: 'Pass it', text: '+1 Standing, and a Politics card is shuffled in with your name on it.', effect: { standing: 1, echoes: ['car_politics'] } },
        { id: 'refuse', label: 'Refuse', text: '-1 Support.', effect: { support: -1 } },
        { id: 'out', label: 'Tell him to get out of it', text: 'Roll a d6; on 6 he listens.', check: { target: 6, pass: { log: 'He listens. For now.' }, fail: { log: 'He does not listen.' } } }
      ] })
  },
  {
    id: 'church', who: 'A church volunteer', front: 'A volunteer you met at intake. Visits monthly.', to: 'the volunteer', support: 1,
    secret: 'She is the only person who has called you by your first name in a year.',
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
    lineHome: move({ id: 'lh_nobody_a', title: 'When someone from the old neighborhood writes out of nowhere', text: 'A name you half remember, a return address you do not.',
      choices: [
        { id: 'write', label: 'Write back', text: 'Support becomes 1.', effect: { supportSet: 1 } },
        { id: 'ignore', label: 'Ignore it', text: 'No change.', effect: {} },
        { id: 'money', label: 'Ask for money', text: "+3 store once; they never write again.", effect: { commissary: 3 } }
      ] })
  },
  {
    id: 'nobody_b', who: 'Nobody', front: 'No one is waiting.', to: 'no one', support: 0,
    secret: "There's no one to write to. You write anyway, to whoever you were.",
    lineHome: move({ id: 'lh_nobody_b', title: 'When a released player offers to put money on your books', text: 'A man you used to eat with, and a number he says he can spare.',
      choices: [
        { id: 'take', label: 'Take it', text: '+3 store, and you owe them.', effect: { commissary: 3, debt: 'the man who got out' } },
        { id: 'refuse', label: 'Refuse it', text: '+1 Standing.', effect: { standing: 1 } },
        { id: 'visit', label: 'Ask them to visit instead', text: 'Support becomes 1.', effect: { supportSet: 1 } }
      ] })
  },
  {
    id: 'father', who: 'Your father', front: "Your father. You haven't spoken in years.", to: 'Dad', support: 0,
    secret: 'The last thing you said to him was true, and you have not forgiven yourself for it.',
    lineHome: move({ id: 'lh_father', title: 'When your father shows up on the visit list', text: 'His name, in the same handwriting as the birthday cards that stopped.',
      choices: [
        { id: 'see', label: 'See him', text: 'Support becomes 1, and you write two lines at mail call.', effect: { supportSet: 1, extraLine: true } },
        { id: 'refuse', label: 'Refuse the visit', text: 'Nothing changes.', effect: {} }
      ] })
  },
  {
    id: 'partner_moving', who: 'Your partner (moving on)', front: 'Your partner. Fewer calls every month.', to: 'my partner', support: 2, privateTag: 'family',
    secret: 'You know why the calls are getting shorter. You have decided not to say it first.',
    lineHome: move({ id: 'lh_partner_moving', title: 'When she stops picking up', text: 'Rings, and rings, and then the recording.',
      choices: [
        { id: 'keep', label: 'Keep calling', text: '-2 store.', effect: { commissary: -2 } },
        { id: 'friend', label: 'Ask a friend to check on her', text: 'You learn the truth. -1 Support.', effect: { support: -1 } },
        { id: 'stop', label: 'Stop calling', text: '-1 Support, +1 Standing.', effect: { support: -1, standing: 1 } }
      ] })
  },
  {
    id: 'best_friend', who: 'Your best friend', front: 'Your best friend from high school. Puts money on your books.', to: 'my friend', support: 1,
    secret: "He's put money on your books every month. You don't know where it comes from.",
    lineHome: move({ id: 'lh_best_friend', title: 'When he asks you to hold something for a guy he knows', text: "He says it's nothing. It is never nothing.",
      choices: [
        { id: 'do', label: 'Do it', text: '+3 store, and a Hold This card is shuffled in with your name on it.', effect: { commissary: 3, echoes: ['hold_this'] } },
        { id: 'refuse', label: 'Refuse', text: '-1 Support.', effect: { support: -1 } }
      ] })
  },
  {
    id: 'sister', who: 'Your sister', front: 'Your sister. Has your kids while you\'re down.', to: 'my sister', support: 3, privateTag: 'family',
    secret: 'She is raising your kids and working nights. You have not said thank you, because it is not enough.',
    lineHome: move({ id: 'lh_sister', title: "When she says she can't keep doing this", text: 'She is not angry. That is worse.',
      choices: [
        { id: 'year', label: 'Ask for one more year', text: 'No change now, -1 Support at the end of the act.', effect: { defer: { in: 1, unit: 'act', effect: { support: -1, log: 'Your sister has run out of patience.' } } } },
        { id: 'state', label: 'Tell her to call the state', text: '-2 Support.', effect: { support: -2 } },
        { id: 'efv', label: "Promise you'll make the EFV", text: 'If you miss your next extended family visit, -2 Support.', effect: { flag: 'promise_efv' } }
      ] })
  }
];
