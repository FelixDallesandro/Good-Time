import type { Charge, PullDef } from '../engine/types';

// † = drug or theft charge (+1 Conspicuity). Every Pull is rolled on a d6, never chosen:
// 1-4 you give in, 5-6 you walk past and make a tally. Each tally widens walk-past by one.
export const CHARGES: Charge[] = [
  {
    id: 'burglary', name: 'Burglary †', consp: 1,
    claim: 'Second-degree burglary. "He\'s a cat burglar. Lock your box."',
    truth: 'You went back a second time because the first was easy. Somebody was home.',
    pull: {
      id: 'pull_burglary', rule: 'burglary', title: "When you see something nobody's watching",
      text: "You already know how you'd do it. If you give in, roll the Eyes. Staff says whose it was. The state's: +2 store and +1 Standing if clean. Another prisoner's: +2 store if clean; if caught, or if a rumor about it is ever pinned to you, -3 Standing (jailhouse thief)."
    }
  },
  {
    id: 'retail_theft', name: 'Retail theft †', consp: 1,
    claim: 'Organized retail theft. "Boosted from the big-box stores."',
    truth: 'It was a job, with a crew and a van. You told yourself the stores could afford it.',
    pull: {
      id: 'pull_retail', rule: 'retail', title: "When commissary comes in and you're broke",
      text: 'Give in: lift from the line or the cart. Roll 1 blue, 2 white. +2 store if clean. Caught: a general (354) or a serious (741), depending on how staff value it.'
    }
  },
  {
    id: 'identity_theft', name: 'Identity theft †', consp: 1,
    claim: 'Identity theft, first degree. "Paperwork guy. Don\'t let him near your tablet."',
    truth: 'You never touched anyone. You touched four hundred accounts, and each had a person.',
    pull: {
      id: 'pull_identity', rule: 'identity', title: 'When someone leaves their tablet logged in',
      text: "Give in: move their store to yours. +3 store; Staff rolls 1 gray at mail call. If caught, it's 739 (soliciting identification information), a serious, and the victim learns your name."
    }
  },
  {
    id: 'delivery', name: 'Possession with intent to deliver †', consp: 1,
    claim: 'Possession with intent to deliver. "He knows where to get things."',
    truth: 'You were the middle. Everybody above you got away, and everybody below you was a customer.',
    pull: {
      id: 'pull_delivery', rule: 'delivery', title: 'When someone needs something and you know where to get it',
      text: 'Give in: broker it. +3 store, and run a debt string to whoever supplied it. Roll 2 white, 1 gray. Caught: 665 Trafficking, a Category A, with a mandatory loss of 75 days of good time.'
    }
  },
  {
    // Simple possession is no longer a felony in Washington (State v. Blake, 2021; the 2023 law makes it a gross
    // misdemeanor), so it can't send anyone to prison. The drugs stay in the story and in the Pull.
    id: 'stolen_vehicle', name: 'Possession of a stolen vehicle †', consp: 1,
    claim: 'Possession of a stolen vehicle. "Was using when they picked him up."',
    truth: 'It was never about the high. It was about making the nights short.',
    pull: {
      id: 'pull_possession', rule: 'possession', title: 'When someone offers you something to get through the night',
      text: "Give in: use. Lose 2 store; skip your next Pull roll (you're not thinking clearly). Roll 1 blue at count (caught: 667 Possession, a serious). A Random UA this act comes up dirty: 675."
    }
  },
  {
    id: 'vehicular', name: 'Vehicular assault', consp: 0,
    claim: 'Vehicular assault, under the influence. "Drunk driver. Hurt somebody."',
    truth: 'You think about her name every night, and the drinking is how you stop.',
    pull: {
      id: 'pull_vehicular', rule: 'vehicular', title: "When there's pruno going around",
      text: "Give in: drink. Roll 1 blue at count. Caught: 675, a serious. A Random UA this act comes up dirty."
    }
  },
  {
    id: 'assault', name: 'Assault, second degree', consp: 0,
    claim: 'Assault in the second degree. "Short fuse. Don\'t test him."',
    truth: 'He did start it. You finished it long after it had stopped mattering.',
    pull: {
      id: 'pull_assault', rule: 'assault', title: 'When someone disrespects you in front of others',
      text: "Give in: you swing before you decide to. Play it as a Fight, with Disrespected's dice. +1 Standing either way."
    }
  },
  {
    id: 'robbery', name: 'Robbery, second degree', consp: 0,
    claim: 'Robbery in the second degree. "Takes what he wants."',
    truth: "It was never loaded. That didn't matter to the clerk, and it shouldn't have.",
    pull: {
      id: 'pull_robbery', rule: 'robbery', title: 'When someone weaker is holding',
      text: "Give in: lean on him. +3 store. It's a threat; if he calls it, you follow through. Pin a rumor to yourself."
    }
  },
  {
    id: 'firearm', name: 'Unlawful possession of a firearm', consp: 0,
    claim: 'Unlawful possession of a firearm. "Says it was for protection."',
    truth: 'It was for protection. That is what everyone says, and sometimes it is even true.',
    pull: {
      id: 'pull_firearm', rule: 'firearm', title: 'When someone offers you a piece',
      text: 'Give in: take the shank and hide it. While you hold it, +1 on your Threats roll; if a search finds it, it is 602 Weapon, a Category A.'
    }
  },
  {
    id: 'eluding', name: 'Attempting to elude a police vehicle', consp: 0,
    claim: 'Attempting to elude a police vehicle. "Ran from the cops."',
    truth: 'You were scared, not guilty. By the time that stopped mattering, it was a felony.',
    pull: {
      id: 'pull_eluding', rule: 'eluding', title: 'When an officer gives you an order that makes no sense',
      text: "Give in: you don't comply. Discretionary: roll 1 blue plus Conspicuity. Caught: a general (103) or a serious (509 Refusing a direct order), the officer's choice. +1 Standing if clean."
    }
  },
  {
    id: 'no_contact', name: 'Violation of a no-contact order', consp: 0,
    claim: 'Violation of a no-contact order. "Couldn\'t stay away."',
    truth: 'You kept telling yourself you only wanted to hear her say it was over. She did, twice.',
    pull: {
      id: 'pull_nocontact', rule: 'nocontact', title: "When you know you shouldn't call her",
      text: "Give in: you call from someone else's tablet. Roll 1 gray. If caught, it's 718 (communication in violation of a court order), a serious; your messages are restricted and your Support drops by 1."
    }
  },
  {
    id: 'trafficking', name: 'Trafficking in stolen property †', consp: 1,
    claim: 'Trafficking in stolen property. "Fence. Moves whatever you bring him."',
    truth: 'You never stole anything. You only gave other people a reason to.',
    pull: {
      id: 'pull_trafficking', rule: 'trafficking', title: 'When someone wants to sell something hot',
      text: 'Give in: buy it to flip. Pay 2 store; next month +4 store if no Random Search finds it. Roll 1 white now.'
    }
  }
];

export const PULL_HABIT: PullDef = {
  id: 'pull_habit', rule: 'possession',
  title: 'When someone offers you something to get through the night',
  text: 'A second Pull from your Habit. Same rules as a Possession Pull.'
};
export const PULL_STICKY: PullDef = {
  id: 'pull_sticky', rule: 'burglary',
  title: "When something's left unguarded",
  text: "A second Pull from your Sticky Fingers. Same rules as a burglar's."
};
