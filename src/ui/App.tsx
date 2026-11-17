import { useMemo, useState } from 'react';
import {
  background, charge, facility, failing, outside
} from '../engine/content';
import {
  STATS, actOf, activeTies, advanceRelease, caseFacts, chooseCourt, classify, listingActive, postProfile, clock, refuseOffer, appeal, appealRejection, applyEfv, displayName, releaseCard, routineLevel, availableMoves, beginSentence, cardChoices, cellieOf, choose, chooseVisit, confess, consp,
  conspFacts, continueResult, custodyScore, cutLeverage, denyRumor, draftPick, efvBlock, grooveCost, grooveLabel, ledgerRows, leanOn, letterSlots, lockReason,
  newGame, onSheet, payDebt, plead, playMove, playScene, preview, primaryTie, releaseMonth, rollEyes, sentencingRows, standIn, stayIn,
  stopCounting, submitLetters, tieActive, toMail, visitingTies, MESSAGE_LIMIT
} from '../engine/engine';
import { TOPICS, correspondents, topicsFor } from '../engine/replies';
import { endDemo } from '../engine/autoplay';
import { violation } from '../content/violations';
import { SOURCES, WA_ALL, WA_BY_CUSTODY, WA_PRIOR, estimate, rateFor } from '../content/recidivism';
import { CASES, FACTS, ROMAN, fmtMonths, fmtRange, sentenceFor } from '../content/sentencing';
import { CONDITIONS, GRE, communityCustody } from '../content/reentry';
import { POLICY, RESEARCH } from '../content/research';
import { CONTACTS, CONTACTS_HOMELESS, GED_MONTHS, NEED_DOMAINS, PEN_PAL, REASSESS_MONTHS, WA_ONE_APPEAL_DAYS } from '../content/classification';
import type { Choice, Game, OutMsg } from '../engine/types';

const SAVE = 'goodtime.save.v3';
const SEEN = 'goodtime.notice.v1';
const DEMO = 'goodtime.demo';

/** Demo mode is a per-device setting for presentations: an "End the demo" bar on every screen of a sentence. */
function demoSetting(): boolean {
  try {
    return localStorage.getItem(DEMO) === '1';
  } catch {
    return false;
  }
}

function loadSave(): Game | null {
  try {
    const t = localStorage.getItem(SAVE);
    const g = t ? (JSON.parse(t) as Game) : null;
    return g && g.v === 5 ? g : null;
  } catch {
    return null;
  }
}
function storeSave(g: Game | null) {
  try {
    if (g && g.phase !== 'over') localStorage.setItem(SAVE, JSON.stringify(g));
    else localStorage.removeItem(SAVE);
  } catch {
    /* private mode etc.: the game still works, it just can't resume */
  }
}
const seenNotice = () => {
  try {
    return localStorage.getItem(SEEN) === '1';
  } catch {
    return false;
  }
};

type Screen = 'title' | 'notice' | 'rules' | 'game';
const cap = (x: string) => x[0].toUpperCase() + x.slice(1);
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [game, setGame] = useState<Game | null>(null);
  const [prev, setPrev] = useState<Game | null>(null);
  const [cards, setCards] = useState(false);
  const [demo, setDemo] = useState(demoSetting);
  const toggleDemo = () => {
    const on = !demo;
    setDemo(on);
    try {
      localStorage.setItem(DEMO, on ? '1' : '0');
    } catch {
      /* ignore */
    }
  };
  const saved = useMemo(loadSave, [screen]);

  const act = (fn: (g: Game) => Game) => {
    if (!game) return;
    const n = fn(game);
    if (n === game) return;
    setPrev(game);
    setGame(n);
    storeSave(n);
    window.scrollTo({ top: 0 });
  };
  const countTime = () => {
    if (!prev) return;
    setGame(prev);
    storeSave(prev);
    setPrev(null);
  };
  // nobody picks their prison: classification at reception places you
  const start = () => {
    const g = newGame('harlan', (Math.random() * 2 ** 31) | 0);
    setGame(g);
    setPrev(null);
    storeSave(g);
    setScreen('game');
  };
  const quit = () => {
    setScreen('title');
  };

  return (
    <div className="app">
      {screen === 'title' && (
        <Title
          canContinue={!!saved}
          onNew={() => (seenNotice() ? start() : setScreen('notice'))}
          onContinue={() => {
            setGame(saved);
            setPrev(null);
            setScreen('game');
          }}
          onRules={() => setScreen('rules')}
          demo={demo}
          onDemo={toggleDemo}
        />
      )}
      {screen === 'notice' && (
        <Notice
          onOk={() => {
            try {
              localStorage.setItem(SEEN, '1');
            } catch {
              /* ignore */
            }
            start();
          }}
          onBack={() => setScreen('title')}
        />
      )}
      {screen === 'rules' && <Rules onBack={() => setScreen('title')} />}
      {screen === 'game' && game && (
        <>
          {demo && game.phase !== 'over' && <DemoBar onEnd={() => act((g) => endDemo(g))} />}
          <GameView g={game} act={act} countTime={countTime} canRewind={!!prev} onQuit={quit} onCards={() => setCards(true)} onAgain={start} />
        </>
      )}
      {cards && game?.char && (
        <div className="modal" onClick={() => setCards(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <CharacterCards g={game} />
            <button className="primary" onClick={() => setCards(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Title(p: { canContinue: boolean; onNew: () => void; onContinue: () => void; onRules: () => void; demo: boolean; onDemo: () => void }) {
  return (
    <div className="splash">
      <div className="bars"><i /><i /><i /><i /><i /><i /><i /></div>
      <h1>Good Time</h1>
      <p className="dim">Serve your sentence. Walk out on your release date.</p>
      <p className="dim small">Two rulebooks. Both enforced. Neither fair.</p>
      <div style={{ height: 8 }} />
      <button className="primary" onClick={p.onNew}>New sentence</button>
      {p.canContinue && <button onClick={p.onContinue}>Continue</button>}
      <button className="ghost" onClick={p.onRules}>How to play</button>
      <button className="ghost small" onClick={p.onDemo} aria-pressed={p.demo}>
        Demo mode: {p.demo ? 'on' : 'off'}
      </button>
      {p.demo && <p className="dim small">For presentations. You can end any sentence early: the game plays out the rest the careful way, and the epilogue shows your decisions apart from the ones made for you.</p>}
    </div>
  );
}

function Notice(p: { onOk: () => void; onBack: () => void }) {
  return (
    <div className="panel">
      <h2>Before you start</h2>
      <p>Good Time is set in a men's prison in a fictional state. It deals with <b>violence, racism, drug use, debt and coercion</b>, and the ways institutions and the people inside them wear each other down.</p>
      <p>Racism enters the game the way research says it enters real prison discipline: through officer discretion. It is shown through systems, never through slurs.</p>
      <p><b>Count Time.</b> At any moment, you can tap Count Time in the corner to rewind your last decision. Use it freely. Nobody is keeping score of how you play.</p>
      <button className="primary" onClick={p.onOk}>I understand</button>
      <button className="ghost" onClick={p.onBack}>Back</button>
    </div>
  );
}

function Rules(p: { onBack: () => void }) {
  return (
    <div className="panel">
      <h2>How to play</h2>
      <p>Serve your sentence and walk out on your release date. The institution runs your calendar. The yard runs your standing. Almost every choice trades one for the other. Two rulebooks, both enforced, neither fair.</p>

      <h3>Draft a life</h3>
      <p>Name yourself, then keep one card from each of two hands. Your <b>charge</b> sets your crime and your Pull. Your <b>background</b> sets your age, your priors (your offender score), and a case history you don't see until the end.</p>
      <p>Everything else is dealt or rolled. Your <b>Outside</b> card, the people who still have you, is dealt: nobody chooses who waits for them. Then come four stats, your failings, and your schooling: a diploma, a GED, or neither, within what your background allows. Work that asks for a diploma or equivalent rolls one. Without either, you're placed in GED class, and you can't hold a job inside until you pass. Each stat runs from −2 to +2.</p>
      <ul>
        <li><b>Nerve</b> backs your threats.</li>
        <li><b>Hustle</b> stretches a deal.</li>
        <li><b>Cool</b> takes white dice off your rolls.</li>
        <li><b>Heart</b> at +1 or more gives you an extra message each month.</li>
      </ul>
      <p>Your <b>public card</b> is what the yard knows. Your <b>private card</b> holds your real name, what actually happened, and a secret. If three rumors about that secret get pinned to you, the card turns face up and you lose 2 Standing.</p>

      <h3>The court</h3>
      <p>Your sentence comes from Washington's sentencing grid: the seriousness of the charge against your offender score. The prosecutor charged high so the deal would sound good. You have three choices:</p>
      <ul>
        <li><b>Take the deal:</b> a reduced charge at an agreed number.</li>
        <li><b>Turn down the first offer:</b> the next one might be better, the same, or worse.</li>
        <li><b>Go to trial:</b> the top of the range on everything charged.</li>
      </ul>
      <p>What happened at the arrest can add time: running from the police, a gun, a child in the car. Trial carries all of it. If there was a codefendant or a ring, you can tell what you know for the bottom of the range. It goes in the transcripts, and it can come out on the yard later.</p>

      <h3>Reception</h3>
      <p>Everyone goes to Washington Corrections Center first, held at Close custody until classified (DOC 310.150). Nobody picks their prison.</p>
      <ul>
        <li><b>Support.</b> The interview records who is still there. Months in county jail before trial cost more people than going home on bail.</li>
        <li><b>The Initial Custody Designation</b> scores your crime's category, any history of violence, and whether you're under 29. That sets Close, Medium, or Minimum custody, and the facility comes with it. Close is the hardest place to walk out early.</li>
        <li><b>Washington ONE</b> sets a risk level, from Lower to High Violent Property Drug, and rates eight needs. Education turns mostly on whether you finished high school or a GED. It doesn't touch custody. You're reassessed every six months: the needs can change, but the risk level stays frozen while DOC finishes norming the tool. If your conviction carries community custody (RCW 9.94A.701), the level sets how closely you're supervised after release. Property convictions mostly carry none.</li>
      </ul>

      <h3>The calendar</h3>
      <p>Each turn on the calendar is a stretch of real time; the clock shows the months. Every sentence plays at least 12 turns, and long ones are compressed. Earned release can take up to a third off your sentence, but never the time on a weapon or child passenger enhancement. That third is your row of good-time boxes. Each turn without a serious infraction fills one, and you walk out at your sentence minus your filled boxes.</p>
      <p>A serious infraction can take good time away for good, which lowers how many boxes you can ever fill. Once, you can choose to <b>stop counting days</b>. Every box is erased and you serve the full sentence, but you gain 2 Standing and write-ups can't cost you good time anymore.</p>
      <p><b>Treatment.</b> Everyone is assessed, and every assessment finds a substance use disorder. Late in your sentence, group comes around. Get terminated from the program and you serve to your max date, good time or not.</p>

      <h3>What you carry</h3>
      <ul>
        <li><b>Standing</b> (0 to 5) is how the yard sees you. Keeping the code raises it; breaking it lowers it. At 0 you are a target: the yard comes at you, and you get two scenes a month instead of one.</li>
        <li><b>Support</b> (0 to 3) is the people outside who still have you. Each one is a real person.</li>
        <li><b>Commissary</b> is what's on your books: food, trades, and debts.</li>
        <li><b>Conspicuity</b> is how the facility looks at you, from your charge, your background, and whether staff have validated you. It adds officer dice to searches and to discretionary rules like disrespect, being out of bounds, or refusing a directive.</li>
        <li><b>Custody</b> is your score and level: Close, Medium, or Minimum. More below.</li>
      </ul>

      <h3>A month</h3>
      <ol>
        <li><b>Count.</b> A count card names the officer on shift and their mood.</li>
        <li><b>Whatever finds you.</b> Your Pull, group, legal mail, a rumor, a cellie.</li>
        <li><b>Your scene.</b> Usually one; two at Standing 0. Lockdown or confinement to cell gives you one, in your cell. Seg gives you none.</li>
        <li><b>The Eyes.</b> Staff roll for anything you did, and any serious infraction goes to a hearing.</li>
        <li><b>Visiting and messages.</b></li>
      </ol>
      <p>Between scenes you can play your <b>moves</b>. Your Line Home and Code moves are spent when used; the Anyone moves come back.</p>

      <h3>The Pull</h3>
      <p>Your charge comes with a Pull, and some failings add another. A Pull is never a choice: when it comes up, you roll a d6. On 1 to 4 you give in. Each tally mark lowers that number by one, and priors raise it by one. Walk past and you make a tally. Three tallies and you tear it up for good.</p>

      <h3>The Eyes</h3>
      <p>When you break a rule, count the dice on you: blue for officers, white for prisoners, red for every rumor pinned to you. You see those before you act. You don't see the gray dice, the cameras, and Close custody always has one more of them.</p>
      <p>At the end of the month, staff roll behind a screen and tell you only "clean" or "caught." Any 6 means you're caught. One 6 is usually written as a <b>general</b> infraction, two or more as a <b>serious</b> one, and some acts are always serious.</p>
      <p>Some write-ups need no roll at all. A kite to the bubble can name what you did, and an officer can write you up because they decided to.</p>

      <h3>Discipline</h3>
      <p><b>General</b> infractions (WAC 137-28-220) cost privileges, extra duty, and confinement, never good time or visits. But four of them inside ninety days is a serious: 657. While you're on loss of privileges, going out to the yard is itself a serious, 658, and the yard doesn't always let you stay in.</p>
      <p><b>Serious</b> infractions go to a hearing. Plead guilty and the sanction is usually lighter, but you give up the appeal. Contest it and you'll almost certainly lose; you can appeal to the Superintendent, and that almost never works either. Sanctions follow DOC 460.050: good time by category, loss of privileges, confinement, and mandatory sanctions like two years off the weight pile for a fight. Any serious also suspends extended family visits for six months.</p>
      <p><b>Custody</b> follows a score (DOC 300.380). Every serious takes points off: 20 for a Category A, 15 for an assault, 10 for other Category B, 5 for C or D. Each turn without a serious adds a point back. Every six turns a Plan Change Review can move you one level at a time: below 40 is Close, 40 to 55 Medium, 56 and up Minimum. Lose 20 points in one review period and a review team looks at demoting you sooner. Sometimes the facility overrides the score either way.</p>
      <p><b>Administrative segregation</b> (DOC 320.200) takes you off the unit for up to thirty days. A fight always brings it. A lieutenant can also place anyone the facility sees as a threat, pending an investigation nobody explains. Go to seg from the workers tier and you lose the job.</p>
      <p><b>New charges.</b> An assault finding can be referred to the county prosecutor, though not always. With a weapon it's assault in the first degree. A new sentence starts the day this one ends.</p>

      <h3>The yard</h3>
      <p>Rumors, debts, and leverage go up on the tier board. You can:</p>
      <ul>
        <li><b>Deny a rumor</b> (−1 Standing).</li>
        <li><b>Confess your secret</b> before it comes out (−1 Standing instead of −2).</li>
        <li><b>Pay a debt</b> for 6 commissary.</li>
        <li><b>Cut a leverage string</b> for 5 commissary, and they'll remember it.</li>
      </ul>
      <p>With Support, you can stay in your cell instead of playing a scene; do it twice in an act and the yard notices. With no Support you have nothing to lose. Once an act you can lean on someone who does, or take a charge for him.</p>
      <p>If you told what you know, your paperwork can come out. Cellies ask for your J&amp;S on every move, and it lists only your charges. Sometimes that's enough. Protective custody is always a way off the yard, and it ends the game.</p>

      <h3>Who you become</h3>
      <p>The way you meet trouble sticks. Fight, tell, go to your car, or back down: repeat one and the yard learns it, and going against it costs Standing. Keep repeating it and the other ways close for good. A slow stretch without it can wear a habit down. A locked one almost never lets go.</p>
      <p><b>Routine.</b> Every month makes the place more ordinary. Lockdown, confinement, seg, and loss of privileges speed it up. A visit or a real message slows it, but nothing stops it. As it grows, your name gives way to your DOC number, some months are nothing but count, and some things you used to do stop occurring to you.</p>

      <h3>Outside</h3>
      <p>Each person on your Outside card is real. Some can visit, some can only write, and a child can only come with the adult who brings them. A new visitor waits about two months on the visitor application. When someone leaves, their visits and their messages stop.</p>
      <p>When a visit comes, you choose what it's for: money on your books, or steadying yourself, which takes one rumor off you. They strip you out after every visit, so fresh ink or marks from a fight can become a write-up.</p>
      <p><b>Pen pals.</b> You can pay for a listing on a pen pal site from your books. While it's up, a stranger sometimes writes. A pen pal is messages only, and can drift away like anyone else.</p>
      <p>An extended family visit is a separate program for immediate family. You need six visits in the last twelve months before you can apply, and the decision takes two to six months.</p>
      <p><b>Messages.</b> On the tablet you pick who to write and a subject, and write what you want. Send nothing but a subject and they notice. Replies come the next month. Staff read everything, both ways. Some words hold a message in review, and nobody tells you which. A message can be rejected: you can appeal one that was sent to you, but not one you sent. With no one left, you write in a notebook no one reads.</p>

      <h3>The end</h3>
      <p>Release day, the gate, the first night, the first week. Then the epilogue opens everything that was face down:</p>
      <ul>
        <li>your case history, next to every other background's on your charge</li>
        <li>the ledger of every roll</li>
        <li>your messages, read next to your public card</li>
        <li>what the numbers say about coming back</li>
      </ul>
      <p className="dim"><b>Demo mode</b>, on the title screen, is for presentations: end any sentence early, and the epilogue shows your decisions apart from the ones the game made after.</p>
      <p className="dim"><b>Count Time</b>, in the corner, rewinds your last decision. Use it freely. Every option costs something with staff, with the yard, or with both. There's no right answer. Everyone gets released. The question is what kind of person the sentence made you.</p>
      <button className="primary" onClick={p.onBack}>Back</button>
    </div>
  );
}

/** Demo mode: end now. Two taps, so a stray one doesn't cost a presenter the run. */
function DemoBar({ onEnd }: { onEnd: () => void }) {
  const [sure, setSure] = useState(false);
  return (
    <div className="demobar">
      <span className="small dim">Demo mode</span>
      {sure ? (
        <span className="row" style={{ gap: 6 }}>
          <button className="small primary" onClick={() => { setSure(false); onEnd(); }}>Play out the rest and show the epilogue</button>
          <button className="small ghost" onClick={() => setSure(false)}>Keep playing</button>
        </span>
      ) : (
        <button className="small" onClick={() => setSure(true)}>End the demo</button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Dice({ n, c }: { n: number; c: 'blue' | 'white' | 'gray' | 'rumor' }) {
  if (!n) return null;
  return (
    <span>
      {Array.from({ length: Math.min(n, 8) }, (_, i) => <i key={i} className={`die ${c}`} />)}
      {n > 8 ? `×${n}` : ''}
    </span>
  );
}

function PreviewLine({ g, ch }: { g: Game; ch: Choice }) {
  const p = preview(g, ch);
  if (!p) return null;
  if (p.kind === 'auto') return <div className="pv"><span className="caught">No roll: you're caught. A major.</span></div>;
  if (p.kind === 'roll') {
    const d = p.dice;
    // You count the eyes you can see before you act. Cameras and kites are the risk you can't count.
    return (
      <div className="pv">
        <Dice n={d.blue} c="blue" /><Dice n={d.white} c="white" /><Dice n={d.rumor} c="rumor" />
        <span>
          {d.visible} {d.visible === 1 ? 'die' : 'dice'} · <span className="pct">{Math.round(d.visiblePct * 100)}% caught</span>
          {d.gray > 0 && <span className="dim"> · and cameras you can't count</span>}
        </span>
      </div>
    );
  }
  if (p.kind === 'threat')
    return <div className="pv">{p.sure ? <span className="pct sure">Your reputation makes this work</span> : <span>Nerve check · <span className="pct">{Math.round(p.pct * 100)}% it works</span></span>}</div>;
  return <div className="pv"><span>Roll · <span className="pct">{Math.round(p.pct * 100)}% it works</span></span></div>;
}

function Hud(p: { g: Game; canRewind: boolean; countTime: () => void; onQuit: () => void; onCards: () => void }) {
  const { g } = p;
  const release = releaseMonth(g);
  const months = Array.from({ length: g.sentence }, (_, i) => i + 1);
  return (
    <div className="hud">
      <div className="hud-top">
        <div>
          <b>{displayName(g)}</b> <span className="dim small">·</span> <b>{cap(clock(g, Math.min(g.m, g.sentence)))}</b> <span className="dim small">· walk out {clock(g, release)} · {cap(actOf(g) === 'short' ? 'short time' : actOf(g) === 'long' ? 'the long middle' : actOf(g) === 'yard' ? 'the yard' : 'intake')}</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="small" onClick={p.onCards}>Cards</button>
          <button className="small" disabled={!p.canRewind} onClick={p.countTime} title="Rewind your last decision">Count Time</button>
          <button className="small ghost" onClick={p.onQuit}>Menu</button>
        </div>
      </div>
      <div className="cal" aria-label="Calendar">
        {months.map((m) => (
          <i key={m} className={`${m < g.m ? 'served' : ''} ${m === g.m ? 'now' : ''} ${m === release ? 'release' : ''} ${m > release ? 'cut' : ''}`} />
        ))}
      </div>
      <div className="stats">
        {g.flags.stopped
          ? <span className="tag">Not counting days</span>
          : <span>Good time <span className="boxes">{Array.from({ length: g.maxBoxes }, (_, i) => <i key={i} className={i < g.boxes ? 'on' : ''} />)}</span></span>}
        <span>Standing <span className="pips">{Array.from({ length: 5 }, (_, i) => <i key={i} className={i < g.standing ? 'on' : ''} />)}</span></span>
        <span>Support <span className="pips">{Array.from({ length: 3 }, (_, i) => <i key={i} className={i < g.support ? 'on' : ''} />)}</span></span>
        <span>Commissary <b>{g.commissary}</b></span>
        <span>Custody <b>{cap(g.custody)}</b> <span className="dim small">score {custodyScore(g)}</span></span>
        {g.rumors.length > 0 && <span className="tag">{g.rumors.length} rumor{g.rumors.length > 1 ? 's' : ''}</span>}
        {g.proven && <span className="tag">Proven</span>}
        {grooveLabel(g) && <span className="tag">{grooveLabel(g)}</span>}
        {g.hurt && <span className="tag hurt">Hurt</span>}
        {g.mo.seg ? <span className="tag hurt">Ad Seg</span> : g.mo.confined ? <span className="tag hurt">Confined to cell</span> : onSheet(g) && <span className="tag hurt">On the sheet: no yard</span>}
        {g.phoneUntil >= g.m && <span className="tag">No phone</span>}
        {g.efv.status === 'approved' && <span className="tag">EFV approved</span>}
        {g.efv.status === 'suspended' && <span className="tag">EFV suspended</span>}
      </div>
    </div>
  );
}

function TierBoard({ g }: { g: Game }) {
  if (!g.rumors.length && !g.strings.length) return null;
  return (
    <div className="panel">
      <h3>The tier board</h3>
      <div className="board">
        {g.rumors.map((r, i) => <span key={`r${i}`} className="pin rumor">Rumor: {r.tag}</span>)}
        {g.strings.map((s, i) => <span key={`s${i}`} className={`pin ${s.type}`}>{cap(s.type)} → {s.to}</span>)}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

type Act = (fn: (g: Game) => Game) => void;

export function GameView(p: { g: Game; act: Act; countTime: () => void; canRewind: boolean; onQuit: () => void; onCards: () => void; onAgain: () => void }) {
  const { g, act } = p;
  if (g.phase === 'draft') return <Draft g={g} act={act} onQuit={p.onQuit} />;
  if (g.phase === 'sheet')
    return (
      <>
        <h2>The court</h2>
        <p className="dim">Your public card is what the yard will know. Your private card is yours alone.</p>
        <Court g={g} act={act} />
        <CharacterCards g={g} />
        <button className="primary" onClick={() => act(classify)}>
          {g.court?.path === 'trial' ? 'Go to trial' : g.court?.talked ? 'Talk and take the deal' : 'Take the deal'}, and go to reception
        </button>
      </>
    );
  if (g.phase === 'reception') return <Reception g={g} act={act} />;
  if (g.phase === 'over') return <Epilogue g={g} onAgain={p.onAgain} onQuit={p.onQuit} />;
  if (g.phase === 'release') return <Release g={g} act={act} />;

  return (
    <>
      <Hud g={g} canRewind={p.canRewind} countTime={p.countTime} onQuit={p.onQuit} onCards={p.onCards} />
      {g.phase === 'card' && <CardView g={g} act={act} />}
      {g.phase === 'result' && g.result && <ResultView g={g} act={act} />}
      {g.phase === 'hub' && <Hub g={g} act={act} />}
      {g.phase === 'eyes' && <Eyes g={g} act={act} />}
      {g.phase === 'mail' && <Mail g={g} act={act} />}
    </>
  );
}

function Eyes({ g, act }: { g: Game; act: Act }) {
  const h = g.hearings[0];
  const appealable = g.infractions
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => x.serious && x.plea === 'contest' && x.result === 'guilty' && !x.appeal && x.m === g.m);
  return (
    <div className="panel">
      <h2>The Eyes</h2>
      <Lines lines={g.report} />
      {h ? (
        <>
          <h3>Hearing: {h.code}, {violation(h.code).title}</h3>
          <p className="dim small">
            {h.source}. A lieutenant hears it, on the record. A guilty plea usually means a lighter sanction, and you cannot appeal the finding.
            Contesting almost never wins.{g.hearings.length > 1 ? ` ${g.hearings.length - 1} more after this one.` : ''}
          </p>
          <div className="grid2 stack">
            <button className="choice" onClick={() => act((s) => plead(s, 'guilty'))}><b>Plead guilty</b><span className="dim small">Take the lower sanction.</span></button>
            <button className="choice" onClick={() => act((s) => plead(s, 'contest'))}><b>Plead not guilty</b><span className="dim small">Make them prove it.</span></button>
          </div>
        </>
      ) : (
        <>
          {appealable.map(({ x, i }) => (
            <button key={i} className="small" onClick={() => act((s) => appeal(s, i))}>Appeal {x.code} to the Superintendent</button>
          ))}
          <button className="primary" onClick={() => act(toMail)}>Visiting and messages</button>
        </>
      )}
    </div>
  );
}

function Lines({ lines }: { lines: string[] }) {
  return (
    <div>
      {lines.map((l, i) => (
        <div key={i} className={`line ${/CAUGHT/.test(l) ? 'caught' : /: clean\./.test(l) ? 'clean' : ''}`}>{l}</div>
      ))}
    </div>
  );
}

function CardView({ g, act }: { g: Game; act: Act }) {
  const cur = g.cur!;
  const card = cur.card;
  const choices = cardChoices(card);
  return (
    <div className="panel">
      <div className="row">
        {card.tag && <span className={`tag ${card.tag}`}>{card.tag}</span>}
        <span className="tag">{cur.source === 'count' ? 'Count' : cur.source === 'move' ? 'Your move' : cur.source === 'yard' ? 'Yard' : 'Event'}</span>
      </div>
      <h2>{card.title}</h2>
      {card.officer && cur.source === 'count' && (
        <div className="officer">On shift: <b>{g.mo.officer.name}</b> ({g.mo.officer.mood}). {g.mo.officer.blurb}</div>
      )}
      <p className="card-text">{card.text}</p>
      {cur.source === 'count' && g.mo.notes.length > 0 && <Lines lines={g.mo.notes} />}
      {choices.map((ch) => {
        const why = lockReason(g, ch);
        return (
          <button key={ch.id} className={ch.id === 'ok' ? 'primary' : 'choice'} disabled={!!why} onClick={() => act((s) => choose(s, ch.id))}>
            {ch.id === 'ok' ? 'Continue' : (
              <>
                <b>{ch.label}</b>
                {ch.text && <span className="dim small">{ch.text}</span>}
                <PreviewLine g={g} ch={ch} />
                {why ? <span className="why">{why}</span> : grooveCost(g, ch) && <span className="why">{grooveCost(g, ch)}</span>}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ResultView({ g, act }: { g: Game; act: Act }) {
  const r = g.result!;
  return (
    <div className="panel">
      <h3>{r.title}</h3>
      {r.lines.length ? <Lines lines={r.lines} /> : <p className="dim">Nothing happens. The yard notices that too.</p>}
      <button className="primary" onClick={() => act(continueResult)}>Continue</button>
    </div>
  );
}

function Hub({ g, act }: { g: Game; act: Act }) {
  const moves = availableMoves(g);
  const done = g.mo.scenesLeft <= 0;
  const hasDebt = g.strings.some((s) => s.type === 'debt');
  const hasLev = g.strings.some((s) => s.type === 'leverage');
  return (
    <>
      {g.lines.length > 0 && <div className="panel"><Lines lines={g.lines} /></div>}
      <div className="panel">
        <h2>{done ? 'End of the month' : 'The tier'}</h2>
        <p className="dim">
          {g.mo.blank
            ? 'The month passes. Count, chow, count. Nothing happens that you will remember.'
            : g.mo.seg
            ? 'Administrative segregation. The month passes in a cell off the unit. Staff will still roll the Eyes on anything already written down.'
            : done
            ? 'Your scenes are done. Staff will roll the Eyes on anything that got written down.'
            : g.mo.lockdown
              ? 'Lockdown. One scene, in your cell.'
              : `Standing ${g.standing}: ${g.standing === 0 ? 'you are a target. Two scenes this month.' : `${g.mo.scenesLeft} scene left this month.`}`}
        </p>
        {!done && <button className="primary" onClick={() => act(playScene)}>Play the next scene</button>}
        {done && <button className="primary" onClick={() => act(rollEyes)}>Roll the Eyes</button>}
      </div>
      {moves.length > 0 && (
        <div className="panel">
          <h3>Your moves</h3>
          <p className="dim small">Hooks, not a path. You never have to use them. Your Line Home and Code moves are spent when used; the four Anyone moves return. Your Pull is rolled for you.</p>
          <div className="row">
            {moves.map((m) => (
              <button key={m.id} className="small" onClick={() => act((s) => playMove(s, m.id))}>
                {m.kind === 'line' ? 'Line Home: ' : m.kind === 'code' ? 'Code: ' : ''}{m.title}
              </button>
            ))}
          </div>
        </div>
      )}
      <TierBoard g={g} />
      <Outside g={g} act={act} />
      <div className="panel">
        <h3>On the yard</h3>
        <div className="row">
          {g.rumors.length > 0 && <button className="small" disabled={g.standing < 1} onClick={() => act(denyRumor)}>Deny a rumor (−1 Standing)</button>}
          {!g.privateFlipped && <button className="small" onClick={() => act(confess)}>Confess (turn your private card up, −1 Standing)</button>}
          {hasDebt && <button className="small" disabled={g.commissary < 6} onClick={() => act(payDebt)}>Pay a debt (6 commissary)</button>}
          {hasLev && <button className="small" onClick={() => act(cutLeverage)}>Cut the leverage string (+5 commissary)</button>}
          {g.support >= 1 && !done && <button className="small" onClick={() => act(stayIn)}>Stay in (skip a scene; the yard notices the second time)</button>}
          {!listingActive(g) && (
            <button className="small" disabled={g.commissary < PEN_PAL.cost} onClick={() => act(postProfile)}>
              Post a pen pal listing ({PEN_PAL.cost} commissary)
            </button>
          )}
          {listingActive(g) && <span className="small dim">Your pen pal listing is up.</span>}
          {g.support === 0 && <button className="small" onClick={() => act(leanOn)}>Lean on someone (once per act)</button>}
          {g.support === 0 && <button className="small" onClick={() => act(standIn)}>Stand in for someone (once per act)</button>}
        </div>
        <StopCounting g={g} act={act} />
      </div>
    </>
  );
}

function Outside({ g, act }: { g: Game; act: Act }) {
  const visiting = new Set(visitingTies(g).map((t) => t.id));
  const block = efvBlock(g);
  return (
    <div className="panel">
      <h3>Outside</h3>
      {!g.ties.length && <p className="dim small">No one.</p>}
      {g.ties.map((t) => {
        const on = tieActive(g, t);
        const status = !on
          ? t.gone ? 'gone' : 'cannot come without the adult who brought them'
          : visiting.has(t.id) ? 'can visit' : !t.visits ? 'messages only' : 'waiting on visitor approval';
        return <div key={t.id} className={`small ${on ? '' : 'dim'}`}>{t.who[0].toUpperCase() + t.who.slice(1)}: {status}</div>;
      })}
      <div style={{ marginTop: 8 }}>
        <button className="small" disabled={!!block} onClick={() => act(applyEfv)}>Apply for an extended family visit</button>
        {block && <div className="small dim">{block}</div>}
      </div>
    </div>
  );
}


function StopCounting({ g, act }: { g: Game; act: Act }) {
  if (g.flags.stopped) return null;
  return (
    <div>
      <button
        className="small ghost"
        onClick={() => {
          if (window.confirm('Stop counting days? This is a one-way door. Every good-time box is erased and you will serve your full sentence. In exchange you gain 2 Standing, and write-ups cost you no good time from now on.')) act(stopCounting);
        }}
      >
        Stop counting days (one-way door)
      </button>
    </div>
  );
}

function Mail({ g, act }: { g: Game; act: Act }) {
  const slots = letterSlots(g);
  const people = correspondents(g);
  const notebook = !people.length;
  const [lines, setLines] = useState<string[]>(Array.from({ length: slots }, () => ''));
  const [msgs, setMsgs] = useState<OutMsg[]>(() =>
    Array.from({ length: slots }, (_, i) => ({ to: people[i % Math.max(1, people.length)]?.id ?? '', topic: 'checkin', text: '' }))
  );
  const set = (i: number, v: string) => setLines((a) => a.map((x, j) => (j === i ? v : x)));
  const setMsg = (i: number, patch: Partial<OutMsg>) => setMsgs((a) => a.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const inbox = g.inbox.filter((x) => x.m === g.m);
  const notices = g.rejections.filter((x) => x.noticed === g.m || x.decidedAt === g.m);
  return (
    <>
      <div className="panel">
        <h2>Visiting and messages</h2>
        <Lines lines={g.lines} />
        {notices.map((x) => (
          <div key={`n${x.id}`} className="letter">
            <span className="small dim">{x.kind === 'rejected' ? 'Rejection Notice, DOC 05-525' : 'Notice'}</span>
            <br />
            {x.dir === 'out'
              ? <>Your message of month {x.m} to {x.who}, "{x.subject}," was not sent. Reason: {x.reason}.</>
              : <>A message to you from {x.who}, "{x.subject}," was rejected. Reason: {x.reason}.</>}
            {x.dir === 'out' && x.status === 'pending' && (
              <div className="small dim">Outgoing rejections are reviewed automatically: first the Superintendent, then Headquarters. There is nothing to appeal.</div>
            )}
            {x.dir === 'in' && x.stage === 'none' && x.noticed === g.m && (
              <div><button className="small" onClick={() => act((s) => appealRejection(s, x.id))}>Appeal to the Superintendent</button></div>
            )}
            {x.dir === 'in' && x.stage === 'superintendent' && x.status === 'upheld' && x.decidedAt === g.m && (
              <div><button className="small" onClick={() => act((s) => appealRejection(s, x.id))}>Appeal to Headquarters</button></div>
            )}
            {x.dir === 'in' && x.status === 'pending' && <div className="small dim">Appealed. A decision next month.</div>}
          </div>
        ))}
        {inbox.length > 0 && (
          <>
            <h3>Messages in</h3>
            {inbox.map((x, i) => (
              <div key={i} className="letter">
                <span className="small dim">From {x.from} · {x.subject}</span>
                <br />
                {x.text}
              </div>
            ))}
          </>
        )}
        {g.visitPending && (
          <>
            <h3>Your visit</h3>
            {g.visitRisk && (
              <p className="small">
                {g.visitRisk === 'ink' ? 'Your ink is still fresh.' : 'You have marks from a fight nobody wrote up.'} They strip you out after every
                visit. If the officer looks closely, it becomes a write-up: {g.visitRisk === 'ink' ? '710, unauthorized tattooing' : '505, fighting'}.
              </p>
            )}
            <div className="grid2 stack">
              {g.visitRisk && (
                <button className="choice" onClick={() => act((s) => chooseVisit(s, 'stayHome'))}>
                  <b>Tell them to stay home this week</b><span className="dim small">No visit. You make up a reason.</span>
                </button>
              )}
              <button className="choice" onClick={() => act((s) => chooseVisit(s, 'money'))}><b>Money on your books</b><span className="dim small">+{g.support} store.</span></button>
              <button className="choice" onClick={() => act((s) => chooseVisit(s, 'steady'))}><b>Steady</b><span className="dim small">Pull one rumor. Someone outside still knows who you are.</span></button>
            </div>
          </>
        )}
      </div>
      <div className="panel">
        <h3>{notebook ? 'In your notebook' : 'The tablet'}</h3>
        <p className="dim small">
          {notebook
            ? 'No one is waiting, so you write in a notebook no one reads, addressed to no one.'
            : g.commsUntil >= g.m
              ? 'Your messages are restricted by a sanction. You can write them. They will not go out.'
              : 'Pick who, and a subject, and write to them. A subject with nothing under it is still a message, and they notice. Staff read every message. Some words put a message in review for a week or more, and nobody tells you which. Replies come next month.'}
          {slots > 1 ? ` You can send ${slots} messages this month.` : ''}
        </p>
        {notebook
          ? lines.map((l, i) => (
            <textarea key={i} value={l} maxLength={MESSAGE_LIMIT} placeholder="Write something…" onChange={(e) => set(i, e.target.value)} />
          ))
          : msgs.map((msg, i) => {
            const tie = people.find((t) => t.id === msg.to) ?? people[0];
            const topics = topicsFor(g, tie);
            const topic = topics.includes(msg.topic as never) ? msg.topic : topics[0];
            return (
              <div key={i} className="compose">
                <div className="row">
                  <label className="small">To{' '}
                    <select value={tie.id} onChange={(e) => setMsg(i, { to: e.target.value })}>
                      {people.map((t) => <option key={t.id} value={t.id}>{t.to}</option>)}
                    </select>
                  </label>
                  <label className="small">Subject{' '}
                    <select value={topic} onChange={(e) => setMsg(i, { topic: e.target.value })}>
                      {topics.map((id) => <option key={id} value={id}>{TOPICS.find((x) => x.id === id)!.subject}</option>)}
                    </select>
                  </label>
                </div>
                <textarea value={msg.text} maxLength={MESSAGE_LIMIT} placeholder={`Write to ${tie.to}…`} onChange={(e) => setMsg(i, { text: e.target.value })} />
              </div>
            );
          })}
        <button
          className="primary"
          disabled={g.visitPending}
          onClick={() => act((s) => submitLetters(s, notebook ? lines : msgs.map((m) => {
            const tie = people.find((t) => t.id === m.to) ?? people[0];
            const topics = topicsFor(s, tie);
            return { ...m, to: tie.id, topic: topics.includes(m.topic as never) ? m.topic : topics[0] };
          })))}
        >
          {g.visitPending ? 'Choose what to do with your visit first' : g.ending === 'released' ? (g.flags.newMonths || g.flags.newCaseAt ? 'Send it.' : 'Send it. Walk out.') : 'Send'}
        </button>
        {g.ending !== 'released' && <StopCounting g={g} act={act} />}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- */

const EDUCATION = { diploma: 'High school diploma', ged: 'GED', none: 'No diploma or GED' } as const;

function Draft(p: { g: Game; act: Act; onQuit: () => void }) {
  const d = p.g.draft!;
  const [c, setC] = useState('');
  const [b, setB] = useState('');
  const [name, setName] = useState('');
  const ready = c && b && name.trim();
  return (
    <>
      <h2>Draft a life</h2>
      <p className="dim">Keep a charge and a background. Everything else is dealt or rolled: who is still waiting outside, your stats, your failings. Nobody chooses the life they start with, or which prison it ends up in.</p>
      <h3>Your name</h3>
      <p className="dim small">Your own name, on your private card. The yard and the paperwork may not keep using it.</p>
      <input value={name} placeholder="Your name" aria-label="Your name" onChange={(e) => setName(e.target.value)} maxLength={24} />
      <h3>Charge</h3>
      {d.charges.map((id) => {
        const ch = charge(id);
        return (
          <button key={id} className={`choice ${c === id ? 'sel' : ''}`} onClick={() => setC(id)}>
            <b>{ch.name}</b><span className="dim small">{ch.claim}</span>
            <span className="small">Pull: {ch.pull.title}</span>
          </button>
        );
      })}
      <h3>Background</h3>
      <p className="dim small">The front goes on your public card. Your case, the three lines recording what the system did, stays face down until the epilogue. Only the total is public during play.</p>
      {d.backgrounds.map((id) => {
        const bg = background(id);
        return (
          <button key={id} className={`choice ${b === id ? 'sel' : ''}`} onClick={() => setB(id)}>
            <b>{bg.front}</b>
            <span className="small">Offender score from priors: {bg.score}{bg.priorDoc ? ' · Been down before: arrives with a DOC number' : ''}</span>
          </button>
        );
      })}
      <button className="primary" disabled={!ready} onClick={() => p.act((g) => draftPick(g, { chargeId: c, backgroundId: b, name }))}>
        Roll stats and failings
      </button>
      {!ready && <p className="dim small">Pick a charge and a background, and write your name.</p>}
      <button className="ghost" onClick={p.onQuit}>Back</button>
    </>
  );
}

function CharacterCards({ g }: { g: Game }) {
  const ch = g.char!;
  const chg = charge(ch.chargeId);
  const bg = background(ch.backgroundId);
  const out = outside(ch.outsideId);
  const [priv, setPriv] = useState(false);
  const facts = conspFacts(g.facilityId, ch.chargeId, ch.backgroundId);
  const fac = facility(g.facilityId);
  const publicFailings = ch.failings.map(failing).filter((f) => f.card === 'public');
  const privateFailings = ch.failings.map(failing).filter((f) => f.card === 'private');
  const c = consp(g);
  return (
    <>
      <div className="panel">
        <h3>Public card</h3>
        <h2>{displayName(g)}</h2>
        <p>{bg.front}</p>
        <p className="small"><b>Schooling.</b> {EDUCATION[ch.education] ?? EDUCATION.none}{ch.education === 'none' ? `. GED class: ${Math.min(GED_MONTHS, Number(g.flags.gedMonths ?? 0))} of ${GED_MONTHS} months. No job inside until you pass.` : '.'}</p>
        <p><b>{chg.name}.</b> {ch.claim}</p>
        <p className="small dim">At {g.phase === 'draft' || g.phase === 'sheet' || g.phase === 'reception' ? 'county jail, then reception' : fac.name} · Sentence {g.court ? fmtMonths(g.court.months) : `${g.sentence} months`} · Standing {g.standing} · Support {g.support}</p>
        {publicFailings.map((f) => <p key={f.id} className="small"><b>{f.name}.</b> {f.text}</p>)}
        <div className="grid4">
          {STATS.map((k) => (
            <div key={k} className="publiccard center">
              <div className="small dim">{cap(k)}</div>
              <b>{sign(ch.stats[k].mod)}</b>
              <div className="small dim">({ch.stats[k].roll})</div>
            </div>
          ))}
        </div>
        <div>
          <h3>Conspicuity {sign(c)}</h3>
          <p className="small dim">How {fac.name} looks at you. It adds blue dice to discretionary rules (disrespect, out of bounds, refusing a directive) and searches. It never changes what you can do.</p>
          {facts.facts.map((f) => <div key={f.label} className="small">{sign(f.v)} {f.label}</div>)}
          {!facts.facts.length && <div className="small">Nothing on your card moves it.</div>}
          {g.consBonus > 0 && <div className="small">{sign(g.consBonus)} Validated by staff</div>}
        </div>
      </div>
      <div className="panel">
        <h3>Private card</h3>
        {!priv && <button onClick={() => setPriv(true)}>Show (only you should look)</button>}
        {priv && (
          <>
            <p><b>Your name.</b> {ch.name}. DOC {ch.docNumber}{bg.priorDoc ? ', the same number as last time' : ''}.</p>
            <p><b>What actually happened.</b> {chg.truth}</p>
            <p><b>Who you left outside.</b> {out.who}. {out.secret}</p>
            <p className="small dim">Secret's tag: {ch.privateTag}. Three {ch.privateTag} rumors turn this card face up, and you lose 2 Standing.{g.privateFlipped ? ' It already has.' : ''}</p>
            {privateFailings.map((f) => <p key={f.id} className="small"><b>{f.name}.</b> {f.text}</p>)}
            {ch.knownOfficer && <p className="small"><b>Known to staff:</b> {ch.knownOfficer}.</p>}
            {g.phase !== 'sheet' && <p className="small dim">Your cellie: {cellieOf(g).front}</p>}
            <button className="small ghost" onClick={() => setPriv(false)}>Hide</button>
          </>
        )}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- */

const STATUS_NOTE = { sent: '', delayed: ' (held in review; it arrived late)', held: '' } as const;

function Epilogue({ g, onAgain, onQuit }: { g: Game; onAgain: () => void; onQuit: () => void }) {
  const ch = g.char!;
  const chg = charge(ch.chargeId);
  const bg = background(ch.backgroundId);
  const out = outside(ch.outsideId);
  const rows = ledgerRows(g);
  const yours = consp(g);
  const sent = sentencingRows(ch.chargeId);
  const tornPulls = Object.values(g.pull).filter((x) => x.torn).length;
  // in demo mode, the notes speak to what the player did, not what the simulation did after
  const s = g.demo?.stats ?? g.stats;
  const cut = g.demo;
  const simulated = (i: number, at?: number) => !!cut && at !== undefined && i >= at;
  const notes: string[] = [];
  if (s.putInWork) notes.push('You put in work. The yard stopped testing you. The file never forgot, and it never will.');
  if (s.informed >= 2) notes.push('The yard says you talk. The file says you cooperated. Only one of them was keeping count.');
  else if (s.informed === 1) notes.push('You told once. You will be asked about it, in one place or another, for a long time.');
  if (s.letGo >= 4) notes.push('You kept your head down. The yard noticed how many times.');
  if (tornPulls) notes.push('You tore up your Pull. Your public card never changed.');
  else if (s.pullGiven >= 2) notes.push('You gave in to the Pull more than once. It was easy, and it was rewarded. That is how it works.');
  if (g.privateFlipped) notes.push('Your private card turned face up. Everyone knew.');
  if (g.flags.stopped) notes.push('You stopped counting days. You served every one of them.');
  if (g.court?.talked) notes.push(g.flags.exposed ? 'You traded a name for months. It came out, the way paperwork does.' : 'You traded a name for months. It never came out. It is still in the transcripts.');
  const lvl = routineLevel(g);
  if (lvl >= 3) notes.push(`By the end you answered to ${ch.docNumber} faster than to your name.`);
  else if (lvl === 2) notes.push(`By the end, ${ch.docNumber} had started to sound like your name.`);
  if (g.intake)
  {
    const night = g.release?.picks['The First Night'];
    const homeless = (night === 'Find a shelter bed' || night === 'Ride the bus until morning') && g.intake.risk !== 'Lower';
    notes.push(`Reception scored you ${g.intake.icd} and sent you to ${cap(g.intake.custody)} custody. Washington ONE put you at ${g.intake.risk} on intake, and it was still ${g.intake.risk} at the gate, whatever you did in between.`);
    if (g.ending === 'released' && !g.flags.newMonths && g.court) {
      const cc = communityCustody(g.court.offense);
      const served = Math.round(g.m * (g.perTurn || 1));
      // Graduated Reentry (DOC 500-HA004): Track 2 is closed to violent offenses and crimes against persons
      const track2 = cc.months === 0 || cc.why.includes('drug');
      const early = track2 ? Math.min(GRE.ehmTrack2, served - GRE.track2Min) : Math.min(GRE.reentryCenter, served - GRE.track1Min);
      const sponsor = activeTies(g).find((t) => !t.minor && t.visits && t.role !== 'stranger');
      if (early > 0)
        notes.push(
          `You served about ${served} months. Graduated Reentry could have let you do the last ${early} of them ${track2 ? 'at home on an ankle monitor' : `at a reentry center, and up to the final ${GRE.ehmTrack1} at home on an ankle monitor`}, with ${sponsor ? `${sponsor.who} as your sponsor` : `an approved address, or a DOC housing voucher for up to ${GRE.voucher} months if there was none`}. DOC screens for it; this game doesn't play it.`
        );
      notes.push(
        cc.months
          ? `Then ${cc.months} months of community custody, because ${g.court.offense.toLowerCase()} is ${cc.why} (RCW 9.94A.701): ${CONDITIONS}. At ${g.intake.risk}, the minimum is ${homeless ? CONTACTS_HOMELESS : CONTACTS[g.intake.risk as keyof typeof CONTACTS]}.`
          : `No community custody: ${g.court.offense.toLowerCase()} is ${cc.why} (RCW 9.94A.701). Your Washington ONE level never got used. When the gate opened, nobody was assigned to supervise you.`
      );
    }
  }
  if (!notes.length) notes.push('You did your time.');

  const early = g.sentence - g.m;
  const headline =
    g.ending === 'released' && g.flags.newMonths
      ? `You finished this sentence in ${clock(g, g.m)}. The next one, ${fmtMonths(Number(g.flags.newMonths))} for ${g.flags.newCaseLevel === 12 ? 'assault in the first degree' : 'assault in the second degree'}, started the next morning.`
      : g.ending === 'released'
      ? `You walked out in ${clock(g, g.m)}${early > 0 ? `, ${Math.round(early * g.perTurn)} month${Math.round(early * g.perTurn) === 1 ? '' : 's'} before your max date` : ', on your max date'}.`
      : g.ending === 'died'
        ? 'You did not walk out.'
        : g.ending === 'pc'
          ? 'You left the yard for protective custody.'
          : 'You were carried out on a medical.';

  const meet = visitingTies(g)[0] ?? activeTies(g)[0];
  const gate =
    g.ending !== 'released' || g.flags.newMonths ? null
      : meet ? `At the gate: ${meet.who}. Your Support when you walked out was ${g.support}.`
        : 'At the gate: no one. You leave with a bus ticket and whatever is on your books.';
  if (g.flags.newMonths) notes.push('The prosecutor took the same act the hearing officer already punished, and made it a new sentence. One act, punished twice: once by the hearing officer, once by the court.');
  if (g.flags.ppm) notes.push('You walked out with a referral for prosecution behind you: Persistent Prison Misbehavior. The sentence was not the end of it.');
  const file = g.infractions.map((x, i) => ({ ...x, sim: simulated(i, cut?.infractions) })).filter((x) => x.result !== 'not_guilty');

  const all = g.letters.flatMap((l, li) => l.lines.map((ln) => ({ ...ln, m: l.m, notebook: l.notebook, sim: simulated(li, cut?.letters) })));
  const delivered = all.filter((l) => l.status !== 'held');
  const held = all.filter((l) => l.status === 'held');
  const anyNotebook = g.letters.some((l) => l.notebook);

  return (
    <>
      {cut && <DemoDecisions g={g} />}
      <div className="panel">
        <h1 style={{ fontSize: '1.8rem' }}>{headline}</h1>
        <p className="dim">Everyone gets released. The question is what kind of person the sentence made you.</p>
        {gate && <p>{gate}</p>}
        {notes.map((n) => <p key={n}>{n}</p>)}
      </div>

      <div className="panel">
        <h3>The distance between the two</h3>
        <div className="letters">
          <div>
            <div className="small dim" style={{ marginBottom: 6 }}>What the yard knew</div>
            <div className="publiccard">
              <h2>{ch.name} <span className="dim small">DOC {ch.docNumber}</span></h2>
              <p>{bg.front}</p>
              <p><b>{chg.name}.</b> {ch.claim}</p>
              {ch.failings.map(failing).filter((f) => f.card === 'public').map((f) => <p key={f.id} className="small">{f.name}.</p>)}
            </div>
          </div>
          <div>
            <div className="small dim" style={{ marginBottom: 6 }}>{anyNotebook && g.support === 0 ? 'What you wrote in your notebook' : 'What you sent home'}</div>
            {delivered.map((t, i) => (
              <div key={`d${i}`} className={`letter${t.sim ? ' sim' : ''}`}>
                <span className="small">Month {t.m}{t.sim ? ' · simulated' : ''}{t.notebook ? ' · notebook' : ''}{t.to ? ` · to ${t.to} · ${t.subject}` : ''}</span>
                <br />
                {t.text || <span className="dim">(subject only)</span>}{STATUS_NOTE[t.status as 'sent' | 'delayed']}
                {t.flagged && <div className="small dim">Flagged by the facility keyword list: {t.flagged.join(', ')}. "Interpretation of policy."</div>}
              </div>
            ))}
            {!delivered.length && !held.length && <p className="dim">No letters were written.</p>}
          </div>
        </div>
        {g.inbox.length > 0 && (
          <>
            <h3>What came back</h3>
            {g.inbox.map((x, i) => (
              <div key={`in${i}`} className="letter">
                <span className="small">Month {x.m} · from {x.from} · {x.subject}</span>
                <br />
                {x.text}
                {x.slip && <div className="small dim">Staff read this one too.</div>}
              </div>
            ))}
          </>
        )}
        {g.rejections.some((x) => x.dir === 'in' && x.status !== 'overturned') && (
          <>
            <h3>Withheld from you</h3>
            {g.rejections.filter((x) => x.dir === 'in' && x.status !== 'overturned').map((x) => (
              <div key={`w${x.id}`} className="letter">
                <span className="small">Month {x.m} · from {x.who}</span>
                <br />
                <span className="dim">You never read this. They wrote:</span> {x.text}
                <div className="small dim">Reason given: {x.reason}.{x.stage === 'none' ? ' Not appealed.' : x.stage === 'hq' ? ' Appealed twice. Upheld.' : ' Appealed. Upheld.'}</div>
              </div>
            ))}
          </>
        )}
        <p className="small dim">Every envelope that leaves a Washington prison is stamped: "Its contents are uncensored."</p>
        {held.length > 0 && (
          <>
            <h3>Never delivered</h3>
            {held.map((t, i) => {
              const r = g.rejections.find((x) => x.m === t.m && x.who === t.to && x.subject === t.subject);
              return (
                <div key={`h${i}`} className="letter">
                  <span className="small">Month {t.m}{t.to ? ` · to ${t.to}` : ''}</span>
                  <br />
                  {t.text || <span className="dim">(subject only)</span>}
                  {r && <div className="small dim">Reason given: {r.reason}.{r.status === 'overturned' ? ' Overturned on review, and sent late.' : r.status === 'upheld' ? ' Upheld at Headquarters. Kept on file for two years, then destroyed. Never returned to you.' : ''}</div>}
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="panel">
        <h3>Your file</h3>
        {!file.length && <p className="dim">Nothing in your central file. That is rare.</p>}
        {file.map((x, i) => (
          <div key={i} className={`line small${x.sim ? ' sim' : ''}`}>
            Month {x.m}{x.sim ? ' (simulated)' : ''}: {x.code} {violation(x.code).title} · {x.result === 'onsite' ? 'handled on site' : x.serious ? `serious${x.plea === 'guilty' ? ', pled guilty' : ', contested'}${x.days ? `, ${x.days} days good time` : ''}${x.appeal ? `, appeal ${x.appeal}` : ''}` : x.result === 'reduced' ? 'reduced to a general' : 'general'}
            {x.discretionary ? <span className="dim"> · the officer's call</span> : ''}
          </div>
        ))}
        {file.length > 0 && (
          <p className="small dim">
            {g.gctLost} days of good conduct time taken. {g.classPoints} points taken off your custody score. {g.segPlacements.length ? `${g.segPlacements.length} month${g.segPlacements.length > 1 ? 's' : ''} in segregation${g.segPlacements.some((x) => x.discretionary) ? ', some on nothing but a lieutenant\'s say-so' : ''}.` : ''} {file.filter((x) => x.discretionary).length} write-ups that came down to which officer was on shift, and how that officer looked at you.
          </p>
        )}
      </div>

      {g.ending === 'released' && !g.flags.newMonths && <Odds g={g} />}

      <div className="panel">
        <h3>The sentencing ledger</h3>
        <p>
          The grid is the same for everyone. Here are all {sent.rows.length} backgrounds, each offered the same deal on your charge. Priors raise the offender
          score, and priors follow policing. A public defender and a jail cell while the case is pending push the agreed number up the range. The pattern is
          never announced during play. Yours is highlighted.
        </p>
        <table>
          <thead><tr><th>Background</th><th>Case</th><th>Score</th><th>Deal</th></tr></thead>
          <tbody>
            {sent.rows.map((r) => (
              <tr key={r.id} className={r.id === bg.id ? 'you' : ''}>
                <td>{r.ethnicity}, {r.age}</td>
                <td className="small">{r.case.map((c) => `${c.bad ? '✖' : '✓'} ${c.text}`).join(' ')}</td>
                <td>{r.score}</td>
                <td>{r.months}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small dim">
          The average deal across these cards is {sent.white.toFixed(1)} months for the white backgrounds and {sent.others.toFixed(1)} for everyone else.
          No single card makes the point. The ledger does, when you line them up.
        </p>
      </div>

      <div className="panel">
        <h3>The Eyes ledger</h3>
        <p>Your Conspicuity was <b>{sign(yours)}</b>. Here is how the same choices you made would have rolled for a man with a different one.</p>
        <table>
          <thead><tr><th>Conspicuity</th><th>Expected write-ups</th><th>Chance of a clean sentence</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.consp} className={r.consp === yours ? 'you' : ''}>
                <td>{sign(r.consp)}{r.consp === yours ? ' (you)' : ''}</td>
                <td>{r.expectedCaught.toFixed(2)}</td>
                <td>{Math.round(r.cleanChance * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small dim">Background never changes what a character can do. It only changes how many blue dice the institution rolls.</p>
        <details>
          <summary className="small">Every roll that was made</summary>
          {g.ledger.map((e, i) => ({ e, i })).filter(({ e }) => !e.forced).map(({ e, i }) => (
            <div key={i} className={`line small${simulated(i, cut?.ledger) ? ' sim' : ''}`}>
              Month {e.m}{simulated(i, cut?.ledger) ? ' (simulated)' : ''}: {e.title} · {Math.max(0, e.blueNo + (e.applies ? e.consp : 0)) + e.white + e.gray + e.rumor} dice
              {e.applies ? <span className="dim"> (discretionary: Conspicuity counted)</span> : ''} ·{' '}
              <span className={e.caught ? 'caught' : 'clean'}>{e.caught ? 'caught' : 'clean'}</span>
            </div>
          ))}
        </details>
      </div>

      <AboutTheGame g={g} />

      <button className="primary" onClick={onAgain}>Serve another sentence</button>
      <button className="ghost" onClick={onQuit}>Main menu</button>
    </>
  );
}

/**
 * Demo mode: the player's own decisions, apart from the ones the game made after they ended, and talking points drawn
 * from those decisions only. Built for a presenter with a few minutes.
 */
function DemoDecisions({ g }: { g: Game }) {
  const cut = g.demo!;
  const ch = g.char!;
  const bg = background(ch.backgroundId);
  const mine = (g.decisions ?? []).slice(0, cut.decisions);
  const after = (g.decisions ?? []).length - cut.decisions;
  const st = cut.stats;
  const played = cut.m ? Math.round((cut.m - 1) * (g.perTurn || 1)) : 0;
  const total = Math.round(g.sentence * (g.perTurn || 1));
  const lvl = routineLevel({ ...g, routine: cut.routine });
  const myFile = g.infractions.slice(0, cut.infractions).filter((x) => x.result !== 'not_guilty');
  const officerCalls = myFile.filter((x) => x.discretionary).length;
  const laterFile = g.infractions.slice(cut.infractions).filter((x) => x.result !== 'not_guilty').length;
  const court = mine.find((d) => d.what === 'Court');
  const sent = sentencingRows(ch.chargeId);
  const myRow = sent.rows.find((r) => r.id === bg.id);
  const when = (d: { m: number; what: string }) => (d.what === 'Draft' || d.what === 'Court' ? 'Before sentencing' : `Month ${d.m}`);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

  const styles = [
    st.letGo && `let ${plural(st.letGo, 'thing')} go`,
    st.fights && `fought ${plural(st.fights, 'time')}`,
    st.informed && `told ${plural(st.informed, 'time')}`,
    st.putInWork && 'put in work'
  ].filter(Boolean);
  const pulls = st.pullGiven + st.pullWalked;

  const points = [
    {
      theme: 'Institutionalization',
      text: !cut.m
        ? 'You ended before the first month inside. The routine never had a chance to start.'
        : `${played ? `In about ${plural(played, 'month')}` : 'In the first month'} of a ${total}-month sentence, ` +
          (lvl >= 3 ? `you were already answering to ${ch.docNumber} before your name.` : lvl >= 1 ? 'the routine had started to settle in.' : 'the routine had not set in yet. Ask what a year would do.') +
          ` Support when you stopped: ${cut.support} of 3.`
    },
    {
      theme: 'Compromise',
      text: !mine.length
        ? 'You ended before making a decision. Every option ahead of you would have cost something: good time with staff, Standing with the yard, or a person outside.'
        : `You made ${plural(mine.length, 'decision')}${styles.length ? `: you ${styles.join(', ')}` : ''}. ` +
        (court ? `At court you ${court.choice.charAt(0).toLowerCase() + court.choice.slice(1)}${court.cost ? `, for ${court.cost.replace(/\.$/, '')}` : ''}. ` : '') +
        (pulls ? `Your Pull came up ${plural(pulls, 'time')}, and ${st.pullGiven ? `you gave in ${plural(st.pullGiven, 'time')}` : 'you walked past it every time'}. That one was never yours to choose: it is rolled. ` : '') +
        'Which of these had a good option? What did each one cost, and with whom: staff, the yard, or the people outside?'
    },
    {
      theme: 'Disparity',
      text: (myRow ? `Your background's deal on this charge was ${myRow.months} months. ` : '') +
        `Across all ${sent.rows.length} backgrounds, the same deal averaged ${sent.white.toFixed(1)} months for the white ones and ${sent.others.toFixed(1)} for everyone else. ` +
        `${plural(myFile.length, 'write-up')} landed while you were playing${officerCalls ? `, ${officerCalls} of them the officer's call` : ''}. Your Conspicuity was ${sign(consp(g))}: the same choices roll more dice for some characters.`
    }
  ];

  return (
    <div className="panel">
      <h2>Your decisions</h2>
      <p>
        {cut.m ? `You played to ${clock(g, cut.m)} and ended the demo.` : 'You ended the demo before the sentence began.'} The game played out the rest the
        careful way: it takes whatever option looks cheapest, every time. Only the decisions below are yours.
      </p>
      <div className="decisions">
        {mine.map((d, i) => (
          <div key={i} className="line small">
            <span className="dim">{when(d)} · {d.what}:</span> <b>{d.choice}</b>
            {d.cost && <span className="dim"> ({d.cost})</span>}
          </div>
        ))}
        {!mine.length && <p className="dim small">No decisions yet. Everything below was played for you.</p>}
      </div>

      <h3>Talking points</h3>
      {points.map((p) => (
        <p key={p.theme}><b>{p.theme}.</b> {p.text}</p>
      ))}

      <p className="small dim">
        After you ended, the game made {plural(after, 'more decision')} for you and {laterFile ? `took ${plural(laterFile, 'more write-up')}` : 'took no more write-ups'}.
        Everything it did is marked as simulated below. The epilogue's other notes speak to your decisions, not to its.
      </p>
    </div>
  );
}

/**
 * What the game is for, said once, after play. Like Papers, Please, it hopes the message arrived through the choices
 * before it arrives in words. Each aim points back to this run, then to the research.
 */
function AboutTheGame({ g }: { g: Game }) {
  const ch = g.char!;
  const bg = background(ch.backgroundId);
  const s = g.demo?.stats ?? g.stats;
  const yourFile = g.infractions.slice(0, g.demo?.infractions ?? g.infractions.length).filter((x) => x.result !== 'not_guilty');
  const served = Math.round(g.m * (g.perTurn || 1));
  const lvl = routineLevel(g);
  const choices = s.letGo + s.fights + s.informed + s.putInWork + s.pullGiven + s.pullWalked;
  const court = g.court;
  const other = court ? sentenceFor(ch.chargeId, bg.score, court.path === 'deal' ? 'trial' : 'deal', bg.case.map((c) => c.bad), { facts: court.facts }) : null;
  const sent = sentencingRows(ch.chargeId);
  const src = (k: keyof typeof RESEARCH) => (
    <a href={RESEARCH[k].url} target="_blank" rel="noreferrer">{RESEARCH[k].label}</a>
  );
  return (
    <div className="panel">
      <h2>What this game is about</h2>
      <p>
        Good Time is a game with a message, and it hoped you would find it by playing before you read it here. It does not lecture during play: the
        systems do the talking, and the pattern only shows when you line things up at the end. It asks three things of you.
      </p>

      <h3>1. What the place does to a person</h3>
      <p>
        Institutionalization is not one moment. It is the noise you stop hearing, the number you answer to, the count you stand for before anyone calls
        it. The game tracks it month by month, and contact with the outside is the only thing that slows it.
      </p>
      <p className="small">
        You served about {served} months.{' '}
        {lvl >= 3
          ? `By the end you answered to ${ch.docNumber} before your name.`
          : lvl >= 1
            ? 'The routine had started to settle into you.'
            : 'You held it off. The people writing to you had a lot to do with that.'}{' '}
        {g.support > 0 ? `You walked out with Support ${g.support}.` : 'By the end, nobody outside was still writing.'}
      </p>
      <p className="small dim">The routine, the code, and how a write-up feels come from the designer's own time inside, not from research.</p>

      <h3>2. Every choice is a compromise</h3>
      <p>
        Two rulebooks, the institution's and the yard's, pull in opposite directions, and almost every choice satisfies one by breaking the other. Every card
        was written so a reasonable person could defend each option on it. None of them is free: each costs good time, Standing, commissary, or a person.
        The rulebook punishes the one act that makes the yard leave you alone.
      </p>
      <p className="small">
        The game counted {choices} of those choices from you{g.demo ? ' before you ended the demo' : ''}{s.letGo ? `: you let ${s.letGo} thing${s.letGo === 1 ? '' : 's'} go` : ''}
        {s.fights ? `, fought ${s.fights} time${s.fights === 1 ? '' : 's'}` : ''}{s.informed ? `, told ${s.informed} time${s.informed === 1 ? '' : 's'}` : ''}
        {s.putInWork ? ', put in work' : ''}. {g.demo ? 'In the months you played, your file took' : 'Your file holds'} {yourFile.length} write-up{yourFile.length === 1 ? '' : 's'}. What the yard kept, it never wrote down.
      </p>

      <h3>3. The same act does not cost everyone the same time</h3>
      <p>
        Nobody's sentence in this game comes from who the character is. It comes from what was done to them: a public defender with a full caseload, a bail
        nobody could post, priors from a neighborhood with a patrol car on every corner. The prosecutor charges high and offers a deal, and the gap between
        the two is the pressure to take it.
      </p>
      <p className="small">
        {court && other
          ? `You ${court.path === 'deal' ? 'took the deal' : 'went to trial'}: ${fmtMonths(court.months)}. The ${court.path === 'deal' ? 'trial' : 'deal'} would have meant ${fmtMonths(other.months)}. `
          : ''}
        On your charge, the same deal averaged {sent.white.toFixed(1)} months for the white backgrounds and {sent.others.toFixed(1)} for everyone else. Inside, the
        same choices cost more write-ups for the characters the institution watches harder.
      </p>
      <ul className="small">
        <li>{RESEARCH.ussc.finding}</li>
        <li>{RESEARCH.waTaskForce.finding}</li>
        <li>{RESEARCH.nyt.finding} Bias is a choice institutions make, and some make it less.</li>
        <li>{RESEARCH.nyig.finding}</li>
      </ul>

      <p className="dim">Everyone gets released. The question the game asks is what kind of person the sentence made you, and who it made you into on paper.</p>

      <details>
        <summary className="small">Sources</summary>
        <ul className="small">
          <li>{src('ussc')}</li>
          <li>{src('waTaskForce')}</li>
          <li>{src('nyt')}</li>
          <li>{src('nyig')}</li>
          <li><a href={SOURCES.bjs.url} target="_blank" rel="noreferrer">{SOURCES.bjs.label}</a></li>
          <li><a href={SOURCES.wa.url} target="_blank" rel="noreferrer">{SOURCES.wa.label}</a></li>
          {POLICY.map((p) => <li key={p.label}><a href={p.url} target="_blank" rel="noreferrer">{p.label}</a></li>)}
        </ul>
        <p className="small dim">Set in a fictional state modeled on Washington's prisons, in a men's facility. It draws on one system and does not claim to speak for every prison.</p>
      </details>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Release({ g, act }: { g: Game; act: Act }) {
  const card = releaseCard(g);
  if (!card) return null;
  return (
    <div className="panel">
      <h2>{card.title}</h2>
      <p className="card-text">{card.text}</p>
      {card.choices.map((c) => (
        <button key={c.id} className={card.choices.length === 1 ? 'primary' : 'choice'} onClick={() => act((s) => advanceRelease(s, c.id))}>
          {card.choices.length === 1 ? c.label : <b>{c.label}</b>}
        </button>
      ))}
    </div>
  );
}

/** Real numbers, from real people released before you. */
function Odds({ g }: { g: Game }) {
  const ch = g.char!;
  const rate = rateFor(ch.chargeId);
  const wa = WA_BY_CUSTODY[g.custody] ?? WA_ALL;
  const est = estimate(ch.chargeId, g.custody, !!background(ch.backgroundId).priorDoc);
  const night = g.release?.picks['The First Night'];
  return (
    <div className="panel">
      <h3>What the numbers say</h3>
      {night && <p className="small dim">Your first night out: {night.toLowerCase()}.</p>}
      <p>
        Of the {rate.released.toLocaleString('en-US')} people released from state prison in 2008 after time for {rate.label}, <b>{rate.y3.toFixed(0)}%</b> were
        arrested again within three years, and <b>{rate.y10.toFixed(0)}%</b> within ten.
      </p>
      <p>
        You walked out of <b>{g.custody}</b> custody. In Washington, people released from {g.custody} custody returned to prison at{' '}
        <b>{wa.toFixed(0)}%</b> over the next nineteen years, against {WA_ALL.toFixed(0)}% for everyone released. Custody comes from a score built on
        your infractions.
      </p>
      <p>
        {background(ch.backgroundId).priorDoc
          ? <>You had been to prison before. In Washington, people who had returned at <b>{WA_PRIOR.yes.toFixed(0)}%</b> over nineteen years; people on their first time down, {WA_PRIOR.no.toFixed(0)}%.</>
          : <>This was your first time down. In Washington, first-timers returned at <b>{WA_PRIOR.no.toFixed(0)}%</b> over nineteen years; people who had been before, {WA_PRIOR.yes.toFixed(0)}%.</>}
      </p>
      <p>
        Starting from the {rate.y3.toFixed(0)}% for {rate.label} and adjusting for your custody and your record, a rough figure for someone like you: <b>{est.y3}%</b> arrested again within three years.
      </p>
      <p className="small dim">
        Real rates, combined; not a prediction about you. The Washington figures overlap, so the adjustment leans toward the extremes. These are the numbers a risk tool sees. They count arrests and returns, which follow
        policing and supervision as much as behavior. They say nothing about who you are.
      </p>
      <p className="small dim">
        Sources: <a href={SOURCES.bjs.url} target="_blank" rel="noreferrer">{SOURCES.bjs.label}</a>;{' '}
        <a href={SOURCES.wa.url} target="_blank" rel="noreferrer">{SOURCES.wa.label}</a>.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- */

/** Intake: the charge sheet against the deal. The overcharge is the point. */
function Court({ g, act }: { g: Game; act: Act }) {
  const ch = g.char!;
  const c = CASES[ch.chargeId];
  if (!c || !g.court) return null;
  const bg = background(ch.backgroundId);
  const bad = bg.case.map((x) => x.bad);
  const cur = g.court;
  const offer = cur.offer;
  const facts = caseFacts(g);
  const deal = sentenceFor(ch.chargeId, bg.score, 'deal', bad, { offer, facts });
  const talk = sentenceFor(ch.chargeId, bg.score, 'deal', bad, { offer, talk: true, facts });
  const trial = sentenceFor(ch.chargeId, bg.score, 'trial', bad, { facts });
  const row = (label: string, sen: typeof deal, sel: boolean, onPick: (x: Game) => Game, note: string) => (
    <button className={`choice ${sel ? 'sel' : ''}`} onClick={() => act(onPick)}>
      <b>{label}: {fmtMonths(sen.months)}</b>
      <span className="small">
        {sen.sheet.offense}{sen.sheet.counts > 1 ? `, ${sen.sheet.counts} counts` : ''} (RCW {sen.sheet.rcw}), level {ROMAN[sen.sheet.level]}
        {sen.extra.map((x) => `, and ${x.offense} (RCW ${x.rcw})`).join('')}
        {sen.sheet.grid === 'drug' ? ' on the drug grid' : ''}, offender score {sen.score}: standard range {fmtRange(sen.range)}
        {sen.enhs.map((e) => `, plus ${e.label.startsWith('endangerment') ? '12 months and a day' : `${e.months} months`} for the ${e.label}${e.flat ? ', flat time' : ''}`).join('')}.
        {sen.sheet.strike ? ' A strike.' : ''}
      </span>
      <span className="small dim">{note} Earned release: up to {sen.earnedMax} months off.</span>
    </button>
  );
  const OFFER_NOTE = {
    first: '',
    better: 'You turned down the first offer. The prosecutor came back lower: they did not want to try it either.',
    same: "You turned down the first offer. It's the same offer, and they're not budging.",
    worse: 'You turned down the first offer. The prosecutor took it personally. The new offer is worse.'
  } as const;
  const canTalk = !!c.info && talk.months < deal.months;
  return (
    <div className="panel">
      <h3>The court</h3>
      <p className="small dim">
        The prosecutor charged high so the offer would sound good. Your offender score counts your priors and every other count on the sheet. Nobody here
        decides whether you did it; that was settled before you got this far. What's left is how long.
      </p>
      {facts.map((f) => <p key={f} className="small">{FACTS[f].text}</p>)}
      {offer !== 'first' && <p className="small">{OFFER_NOTE[offer]}</p>}
      {row('Take the deal', deal, cur.path === 'deal' && !cur.talked, (x) => chooseCourt(x, 'deal'), 'A reduced charge at an agreed number.')}
      {canTalk && row(
        'Take the deal and tell what you know', talk, cur.path === 'deal' && cur.talked, (x) => chooseCourt(x, 'deal', true),
        `${c.infoText} Give them a name and the agreed number drops to the bottom of the range. It goes in the transcripts, and it can come out.`
      )}
      {c.info && !canTalk && <p className="small dim">{c.infoText} Your lawyer already got you the bottom of the range. Telling would buy you nothing.</p>}
      {row('Go to trial', trial, cur.path === 'trial', (x) => chooseCourt(x, 'trial'), 'Everything charged, and the judge gives the top of the range for making the court do its job.')}
      {offer === 'first' && <button className="ghost" onClick={() => act(refuseOffer)}>Turn down the first offer and wait for another</button>}
      {(deal.sheet.strike || trial.sheet.strike) && (
        <p className="small dim">
          A strike is a "most serious offense" (RCW 9.94A.030). Three of them is life without the possibility of release.
          {trial.sheet.strike && !deal.sheet.strike ? ' The deal takes the strike off your record.' : ''}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */

/** Reception at Washington Corrections Center: DOC 310.150. You answer the questions; you don't get a copy. */
function Reception({ g, act }: { g: Game; act: Act }) {
  const r = g.intake!;
  const f = facility(r.facilityId);
  return (
    <>
      <h2>Reception</h2>
      <div className="panel">
        <p>
          Washington Corrections Center, Shelton. You are Close custody until you are classified. Medical, dental, mental health, a substance use
          assessment, an interview. You answer the questions. You are not given a copy of them.
        </p>
        <h3>Family and community support</h3>
        {r.lost.length > 0 && <p className="small">The county jail already cost you {r.lost.join(', and ')}.</p>}
        <p className="small">{r.kept.length ? `Still there: ${r.kept.join(', ')}.` : 'The counselor writes "none" on the line, and moves to the next question.'}</p>
        <p className="small dim">You can look for more later. Strangers on pen pal sites write to people inside, sometimes.</p>
      </div>
      <div className="panel">
        <h3>Initial Custody Designation: {r.icd}</h3>
        {r.parts.map((x) => <div key={x.label} className="small">{x.v > 0 && x.label.startsWith('Starting') ? x.v : sign(x.v)} {x.label}</div>)}
        <p className="small dim">DOC 310.150: Close 0 to 34, Medium 35 to 47, Minimum 48 and up. You can appeal the custody level within 72 hours. The facility can't be appealed.</p>
        <p>
          <b>{cap(r.custody)} custody{r.mi3 ? ' (MI3)' : ''}: {f.name}.</b> {f.front}
          {r.mi3 ? ' More than six years to your earned release date, so minimum custody is served at a Level 3 facility.' : ''}
        </p>
      </div>
      <div className="panel">
        <h3>Washington ONE: {r.risk}</h3>
        <p className="small dim">
          A counselor interviews you about the six months before you were locked up. Four models score it: violent, property, drug, and general
          felony. High on all three offense models is High Violent Property Drug. Otherwise the highest wins, violent before property before drug.
          If none is high, the general felony model says Moderate or Lower. It doesn't set your custody. It sets your programming now and, if your
          conviction carries community custody, how closely you're supervised when you get out.
        </p>
        <h3>Needs</h3>
        {NEED_DOMAINS.map((d) => (
          <div key={d} className="small">
            {d}: {r.needs[d] ?? <span className="dim">not scored in this game</span>}
          </div>
        ))}
        <p className="small dim">
          The case manager works the High needs first. You'll be reassessed every {REASSESS_MONTHS} months. The needs can move. The risk level won't:
          DOC is still in the norming period, so it stays where intake put it. You sign form 07-057, and you have {WA_ONE_APPEAL_DAYS} days to appeal in writing.
        </p>
      </div>
      <button className="primary" onClick={() => act(beginSentence)}>Get on the chain bus to {f.name}</button>
    </>
  );
}
