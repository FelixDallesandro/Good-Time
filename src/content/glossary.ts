/**
 * The glossary: the words the game uses that a player who has never been inside won't know. Three kinds:
 * - yard: how people inside talk. Common usage, not policy.
 * - doc: the institution's and the law's own terms, with the policy the game takes them from.
 * - game: the game's own mechanics, which are not real procedure.
 */
export type GlossKind = 'yard' | 'doc' | 'game';
export interface Gloss {
  term: string;
  kind: GlossKind;
  text: string;
  /** Other words for the same thing, so search finds them. */
  also?: string[];
  source?: string;
}

const y = (term: string, text: string, also?: string[]): Gloss => ({ term, kind: 'yard', text, also });
const d = (term: string, text: string, source?: string, also?: string[]): Gloss => ({ term, kind: 'doc', text, source, also });
const g = (term: string, text: string, also?: string[]): Gloss => ({ term, kind: 'game', text, also });

export const GLOSSARY: Gloss[] = [
  /* ---------------- inside talk ---------------- */
  y('Car', 'The group you run with inside, most often drawn along race, neighborhood, or gang lines. Your car eats together, backs you up, and expects things of you in return. Turning your car down costs Standing.'),
  y('Shot caller', 'The man who speaks for a car and decides what its members will do.'),
  y('Put in work', "Commit violence, or take a serious risk, because your car told you to. It earns respect on the yard and a serious infraction on paper."),
  y('Green light', 'Word from a car that someone may be attacked on sight.'),
  y('Mission', "An order to hurt someone. In the game, a Mission card is one coming for you."),
  y('Check in', 'Ask staff for protective custody. It gets you off the yard, and the yard does not forget it.'),
  y('Kite', 'A note. Inside, any written message passed hand to hand, including one slipped to the officers about someone. Also the everyday name for the request form you send to staff.'),
  y('Cellie', 'The man you share a cell with. Nobody chooses theirs. Whatever is found in a cell can be charged to everyone in it.', ['cellmate']),
  y('Tier', 'One level or row of cells on a housing unit.'),
  y('Dayroom', "A unit's common room: tables, a TV, a microwave, the phones. Most of a unit's business happens in the dayroom."),
  y('Bubble', "The officers' station: a glassed-in booth that watches the unit."),
  y('Chow', 'A meal. The chow hall is where meals are served.'),
  y('Count', 'The times each day when all movement stops and staff count everyone. Until the numbers match and count "clears," nobody moves.'),
  y('Yard', "The outdoor recreation area. Also the people on it, and the politics among them: \"the yard\" decides how you're seen."),
  y('Mainline', 'Regular housing, the general population, as opposed to segregation or protective custody.', ['general population', 'GP']),
  y('Store', 'What you buy from commissary: food, coffee, hygiene, stamps. Inside, store is also money: debts and trades are paid in it. The game counts it as Commissary.', ['commissary']),
  y('Store man', 'Someone running a private store out of his cell. He fronts you what you need now, and you pay him back double.'),
  y('Two-for-one', 'The going rate on a loan inside: borrow one, pay back two.'),
  y('Spread', 'A shared meal made from commissary food, cooked by hand in a cell or the dayroom.'),
  y('Hustle', 'Any way of making store inside: doing laundry, tattoos, cooking, legal paperwork.'),
  y('Pruno', 'Alcohol brewed in a cell from fruit, sugar, and bread.', ['hooch']),
  y('Shank', 'A homemade knife.'),
  y('Fish', 'Someone new to prison. "Fresh fish."'),
  y('Old head', 'A man who has done a long time and is respected for it.'),
  y('Jailhouse lawyer', 'A prisoner who helps others with appeals and legal paperwork, often for a price.'),
  y('Rat', 'Someone who informs to staff. A rat jacket, or snitch jacket, is the label, and it sticks whether or not it is true.', ['snitch', 'rat jacket', 'snitch jacket']),
  y('Paperwork', "Your court documents. A car may demand to see a new man's paperwork, to check what he's in for and whether he cooperated."),
  y('J&S', 'Judgment and Sentence: the court document that lists your convictions and your sentence. Cellies ask to see it.', ['judgment and sentence']),
  y('Chain bus', 'The bus that moves people between facilities. Being "on the chain" means being transferred.'),
  y('Shakedown', 'A search of a cell, a person, or a whole unit.'),
  y('Mean mug', 'A hard, steady stare meant as a challenge.'),
  y('Lay low', "Stay in your cell and out of sight, for example until a fight's marks heal."),
  y('C/O', 'Corrections officer. The game mostly just says "officer."', ['CO', 'officer']),

  /* ---------------- DOC and the law ---------------- */
  d('DOC', 'The Washington State Department of Corrections.'),
  d('DOC number', 'The number you are given at your first admission. Come back, and you keep it. Older numbers show how long ago someone first came in.'),
  d('Reception', "Your first weeks in prison. Men are received at Washington Corrections Center and held at Close custody while they're screened, assessed, and classified. Nobody picks their prison.", 'DOC 310.150'),
  d('Classification', 'The process that sets your custody level, and with it which facility you live in. It starts at reception and is reviewed throughout your sentence.', 'DOC 310.150, DOC 300.380'),
  d('Initial Custody Designation', 'Your first custody score, set at reception from the category of your crime, any history of violence, any detainer, any escape history, and whether you are under 29. The game supplies the starting value and the crime categories.', 'DOC 310.150', ['ICD']),
  d('Custody score', 'The Custody Review Score: the number that moves your custody level after reception. Serious infractions take points off for months. Time without one adds points back. Below 40 is Close, 40 to 55 Medium, 56 and up Minimum.', 'DOC 300.380', ['custody review score']),
  d('Custody levels', 'How closely you are held. Minimum is camps and fewer fences. Medium is most of the system. Close is more cameras, more officers, and less movement. A Minimum score with more than six years left is MI3, housed at a Level 3 facility. Washington also has Maximum custody, in intensive management units, which the game does not play.', 'DOC 310.150, DOC 300.380', ['minimum', 'medium', 'close', 'maximum', 'MI3']),
  d('Plan Change Review', 'The review, every six months, that can move your custody level up or down one step. The facility can override the score either way.', 'DOC 300.380', ['override']),
  d('Earned release', 'Time off a sentence for good behavior and programming, up to a third on most sentences. Serious infractions can take it away. Your earned release date is when you walk out if you keep it.', 'RCW 9.94A.729', ['good time', 'good conduct time', 'earned release date', 'ERD']),
  d('Infraction', "A written rule violation. A general infraction is minor and is heard by a sergeant. A serious one goes to a disciplinary hearing and can cost good time. Four generals inside ninety days make a serious.", 'WAC 137-28', ['write-up', 'general', 'serious', '657']),
  d('Behavior Observation Entry', 'A note in your file for something an officer handled on the spot, with no infraction report.', 'WAC 137-28', ['BOE']),
  d('Disciplinary hearing', 'The hearing on a serious infraction, held by a hearing officer, often a lieutenant. Pleading guilty usually means a lighter sanction, but you give up the appeal. Contesting almost never wins.', 'WAC 137-28, DOC 460.000'),
  d('Category A, B, C, D', 'The classes of serious infraction, A the worst. A Category A, like a weapon or a cell phone, costs the most good time and the most custody points.', 'DOC 460.050'),
  d('Sanction', 'The penalty for an infraction: lost good time, loss of privileges, extra duty, confinement to cell, and some mandatory ones, like two years off the weight pile after a fight.', 'DOC 460.050'),
  d('Loss of privileges', 'No yard, no gym, no dayroom for a set number of days. Officers carry a sheet with photos of everyone under sanction.', 'WAC 137-28', ['LOP', 'the sheet', 'on the sheet']),
  d('658', 'Failing to comply with a sanction: a serious infraction. Going out to the yard while you are on loss of privileges is a 658.', 'DOC 460.050'),
  d('Confinement to cell', 'A sanction that keeps you in your cell for a set number of days. In the game it leaves you one scene a month, played in your cell.', 'WAC 137-28'),
  d('Administrative segregation', "Being taken off your unit and held alone, not as a sanction: after a fight, pending an investigation, or for your own safety. Thirty days at most, with reviews along the way. Ad seg isn't punishment on paper; it feels like it.", 'DOC 320.200', ['ad seg', 'seg', 'segregation', 'final review']),
  d('Protective custody', "Housing apart from the general population for people who aren't safe there. You can ask for it, or be placed in it.", undefined, ['PC']),
  d('Security threat group', "DOC's term for a gang. Being validated means staff have labeled you a member, whether you are one or not.", undefined, ['STG', 'validated', 'validation']),
  d('Debrief', 'Telling the institution everything you know about a gang, usually to leave it, in exchange for what staff can offer.'),
  d('Contraband', 'Anything you are not allowed to have, including more of an allowed item than the property limits permit.', 'DOC 440.000'),
  d('Cell tag', "When contraband is found in a shared cell, it can be charged to everyone who lives there, unless someone claims it."),
  d('UA', 'Urinalysis: a drug test. Failing to produce a sample in the time given is treated as a positive.', undefined, ['urinalysis', 'dirty', '675', '676']),
  d('K-9', 'A drug-sniffing dog, brought through a unit at count.'),
  d('Grievance', 'A formal complaint about conditions or staff. Most are found "resolved" with no change.'),
  d('Visiting list', 'The people approved to visit you. Each visitor applies and waits for approval. Minors visit with an approved adult.'),
  d('No-contact visit', 'A visit through glass, with no touching. In segregation, it is all there is.'),
  d('Extended family visit', 'Up to two nights with immediate family in a private unit inside the fence. Any serious infraction suspends it for six months, and then you apply again from the start.', 'DOC 590.100', ['EFV', 'trailer']),
  d('Strip search', 'Most institutions strip-search you after a visit.'),
  d('Tablet', 'The tablet issued to you inside: messages, music, and store. Messages are screened before they go through; anything flagged waits in review.', undefined, ['kiosk', 'eMessage', 'message']),
  d('Legal mail', 'Mail from a court or a lawyer. It is opened in front of you rather than read in the mailroom.'),
  d('Plea deal', 'An agreement to plead guilty, often to a lesser charge, for a set sentence. Most cases end this way. Turning down an offer can bring a better one, the same one, a worse one, or none.', undefined, ['deal', 'offer', 'trial']),
  d('Offender score', "Points from your prior convictions. On Washington's sentencing grid, the offender score and the crime's seriousness level set the standard range.", 'RCW 9.94A.525', ['priors', 'sentencing grid', 'standard range']),
  d('Washington ONE', 'The risk and needs assessment DOC gives at reception. It sets a risk level from Lower to High Violent Property Drug and rates eight needs. It does not change your custody. After release, the risk level sets how often you report.', 'DOC 320.400', ['risk level', 'needs', 'criminogenic needs']),
  d('Community custody', "Supervision after release, by a community corrections officer, for a length set by the offense. Most property convictions carry none.", 'RCW 9.94A.701', ['CCO', 'community corrections officer', 'supervision']),
  d('Graduated reentry', 'A program that lets some people serve the last months of a sentence at a reentry center or at home on an ankle monitor. The game describes it but does not play it.', undefined, ['GRE', 'reentry center', 'ankle monitor']),
  d('GED', "The high school equivalency. Without a diploma or a GED, you're placed in GED class, and you can't hold a job inside until you pass."),
  d('Persistent prison misbehavior', 'A felony for someone who keeps committing serious infractions after their good time is gone. The same act can bring discipline inside and a new charge outside.', 'RCW 9.94.070'),

  /* ---------------- the game's own words ---------------- */
  g('The Eyes', 'Whatever might see you break a rule. When you break one, the game counts the dice: blue for officers, white for other prisoners, red for every rumor pinned to you, and gray for cameras you can\'t count. At the end of the month, staff roll them all. Any 6 and you\'re caught.', ['dice', 'blue dice', 'white dice', 'gray dice', 'red dice']),
  g('Blue dice', 'Officers. Some officers, some months, and some files add blue dice; a few take them off. When that happens, the dice are drawn with a ring and a +, or struck through, and the reason is named.'),
  g('White dice', 'Other prisoners who might talk. Cool takes white dice off; some cards add them.'),
  g('Standing', 'How the yard sees you, 0 to 5. Keeping the code raises it; backing down or telling lowers it. At 3 and up, Test cards pass you by. At 0 you are a target.'),
  g('Support', 'The people outside who still have you, 0 to 3. Each one is a real person in the game, with their own messages and visits.'),
  g('Conspicuity', "How the facility looks at you, from your charge, your background, and whether you've been validated. It adds blue dice to searches and to the rules an officer can choose to enforce. It is how the game shows officer discretion."),
  g('Discretionary rule', 'A rule an officer can choose to enforce or not: disrespect, being out of bounds, refusing a directive. Conspicuity counts on these.'),
  g('The Pull', "Your charge's old habit, coming back around. A Pull is never a choice: you roll for it. Walk past it three times and you tear it up."),
  g('Proven', 'You put in work for your car. Test cards pass you by for good, and staff validate you.'),
  g('Rumor', 'Something said about you on the tier, pinned to the board. Each one is a red die on every roll. Three rumors about your secret flip your private card.'),
  g('Good-time boxes', 'The row of boxes in the corner. Each one is a turn of earned release. Fill them by staying clear of serious infractions; a serious one can take boxes away for good.', ['boxes']),
  g('Routine', 'How far the institution has gotten into you. It grows as you serve, and it shows up in what you stop noticing.', ['institutionalization']),
  g('Scene', 'Your turn to act in a month: a Yard card is dealt, and you choose. Usually one a month; two at Standing 0; none in seg.'),
  g('Count card', 'Drawn at the start of every month. It names the officer on shift and what kind of month it will be.'),
  g('Yard card', 'A situation on the yard: a Test (someone checking whether you\'ll stand up), Politics (your car\'s business), or Life (debts, family, other people\'s trouble).', ['Test', 'Politics', 'Life']),
  g('Threat', 'Making a threat instead of throwing a punch. At high Standing it just works; otherwise roll d6 + Nerve. If they call it, you follow through or fold.'),
  g('Hurt', "Hurt in a fight or an attack. You can't fight until it heals, and your next scene is medical."),
  g('Debt and leverage', 'Strings on the tier board. A debt is something you owe, and it will be called in. Leverage is something someone owes you.', ['debt', 'leverage', 'string', 'tier board']),
  g('Count Time', 'The button in the corner that rewinds your last decision. Use it freely.')
];
