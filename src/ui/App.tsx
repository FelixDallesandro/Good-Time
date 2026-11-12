import { useMemo, useState } from 'react';
import {
  FACILITIES, background, charge, facility, failing, outside
} from '../engine/content';
import {
  STATS, actOf, activeTies, advanceRelease, chooseCourt, clock, refuseOffer, appeal, appealRejection, applyEfv, displayName, releaseCard, routineLevel, availableMoves, beginSentence, cardChoices, cellieOf, choose, chooseVisit, confess, consp,
  conspFacts, continueResult, custodyScore, cutLeverage, denyRumor, draftPick, efvBlock, grooveCost, grooveLabel, ledgerRows, leanOn, letterSlots, lockReason,
  newGame, onSheet, payDebt, plead, playMove, playScene, preview, primaryTie, releaseMonth, rollEyes, sentencingRows, standIn, stayIn,
  stopCounting, submitLetters, tieActive, toMail, visitingTies, MESSAGE_LIMIT
} from '../engine/engine';
import { TOPICS, correspondents, topicsFor } from '../engine/replies';
import { violation } from '../content/violations';
import { SOURCES, WA_ALL, WA_BY_CUSTODY, WA_PRIOR, estimate, rateFor } from '../content/recidivism';
import { CASES, ROMAN, fmtMonths, fmtRange, sentenceFor } from '../content/sentencing';
import type { Choice, Game, OutMsg } from '../engine/types';

const SAVE = 'goodtime.save.v3';
const SEEN = 'goodtime.notice.v1';

function loadSave(): Game | null {
  try {
    const t = localStorage.getItem(SAVE);
    const g = t ? (JSON.parse(t) as Game) : null;
    return g && g.v === 3 ? g : null;
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

type Screen = 'title' | 'notice' | 'rules' | 'facility' | 'game';
const cap = (x: string) => x[0].toUpperCase() + x.slice(1);
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [game, setGame] = useState<Game | null>(null);
  const [prev, setPrev] = useState<Game | null>(null);
  const [cards, setCards] = useState(false);
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
  const start = (facilityId: string) => {
    const g = newGame(facilityId, (Math.random() * 2 ** 31) | 0);
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
          onNew={() => setScreen(seenNotice() ? 'facility' : 'notice')}
          onContinue={() => {
            setGame(saved);
            setPrev(null);
            setScreen('game');
          }}
          onRules={() => setScreen('rules')}
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
            setScreen('facility');
          }}
          onBack={() => setScreen('title')}
        />
      )}
      {screen === 'rules' && <Rules onBack={() => setScreen('title')} />}
      {screen === 'facility' && <FacilityPick onPick={start} onBack={() => setScreen('title')} />}
      {screen === 'game' && game && (
        <GameView g={game} act={act} countTime={countTime} canRewind={!!prev} onQuit={quit} onCards={() => setCards(true)} onAgain={() => setScreen('facility')} />
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

function Title(p: { canContinue: boolean; onNew: () => void; onContinue: () => void; onRules: () => void }) {
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
      <h2>The whole rulebook fits on one card</h2>
      <h3>Two tracks</h3>
      <p><b>Calendar.</b> Your sentence comes from Washington's sentencing grid: the seriousness of the charge against your offender score. The prosecutor charged high. Take the deal (a reduced charge at an agreed number), turn down the first offer and hope for a better one, or go to trial (the top of the range on everything charged). If there's someone to tell on, telling buys the bottom of the range, and it can come out later. Earned release can take up to a third off, never the time on a weapon enhancement. Each empty good-time box is a turn of earned release; each turn without a serious violation fills one. You walk out at your sentence minus your filled boxes. A serious violation can take good time for good. Every sentence plays at least 12 turns; long ones are compressed, and the clock shows the real months.</p>
      <p><b>Treatment.</b> Everyone is assessed, and every assessment finds a substance use disorder that needs treatment. Late in your sentence, group comes around. Get terminated from the program and you serve to your max date, good time or not.</p>
      <p><b>Standing.</b> How the yard sees you, 0 to 5. Keeping the code raises it; breaking it lowers it. At 0 you are a target.</p>
      <p className="dim">The institution controls your Calendar. The yard controls your Standing. Almost every choice trades one for the other.</p>
      <h3>Support</h3>
      <p><b>Support</b> is the people outside who still have you, 0 to 3. Each of them is a real person: some can visit, some can only write, and a child can only come with the adult who brings them. When someone leaves, their visits and their letters stop. With no one, you write in a notebook no one reads.</p>
      <p>A new visitor waits on the visitor application, about two months. An extended family visit is a separate program: you need six visits in the last twelve months before you can apply, and the decision takes two to six months. Any serious violation suspends it for six months, and then you start over.</p>
      <h3>One roll: the Eyes</h3>
      <p>When you break a rule, count the dice on you. Blue for officers, white for prisoners, gray for cameras, red for rumors pinned to you. Any 6 means you're caught. One 6 is usually written as a <b>general</b> infraction, two or more as a <b>serious</b> one, and some acts are always serious. You always see the dice before you act. The risk is never hidden, only the result.</p>
      <p className="dim">Staff roll behind a screen and tell you only "clean" or "caught." You never learn which die did it.</p>
      <p><b>General</b> infractions (WAC 137-28-220) cost privileges, extra duty, and confinement, never good time or visits. But four of them inside ninety days is a serious: 657. While you are on loss of privileges, going out to the yard is itself a serious, 658, and the yard does not always let you stay in.</p>
      <p><b>Serious</b> infractions go to a hearing. Plead guilty and the sanction is usually lighter, but you give up the appeal. Contest it and you will almost certainly lose. Sanctions follow DOC 460.050: good time by category, privileges, confinement, and mandatory sanctions like two years off the weight pile for a fight.</p>
      <p><b>Custody</b> follows a score (DOC 300.380). Every serious takes points off it: 20 for a Category A, 15 for an assault, 10 for other Category B, 5 for C or D. Each month without a serious adds a programming point. Every six months a Plan Change Review moves you one custody level at a time: below 40 is Close, 40 to 55 Medium, 56 and up Minimum. Lose 20 points in one review period and a review team looks at demoting you sooner. Sometimes the facility overrides the score either way and keeps you where you are.</p>
      <p><b>Administrative segregation</b> (DOC 320.200) takes you off the unit for up to thirty days. A fight always brings it. So can a riot or a demonstration. And a lieutenant can place anyone the facility sees as a threat, pending an investigation nobody explains.</p>
      <h3>Routine</h3>
      <p>Every month makes the place more ordinary. Lockdown, confinement, seg, and loss of privileges make it faster; a visit or a real message slows it. Nothing stops it. As it grows, your name gives way to your DOC number, some months are nothing but count, and some things you used to do stop occurring to you.</p>
      <h3>Who you become</h3>
      <p>The way you meet trouble sticks. Fight, tell, go to your car, or back down: repeat one and the yard learns it, and going against it costs Standing. Keep repeating it and the other ways close for good. A slow stretch without it can wear a habit down. A locked one almost never lets go.</p>
      <h3>A month</h3>
      <p>Count card → your scenes → the Eyes and any hearings → visiting and messages. On the tablet you pick who to write and a subject, and you write to them. Send nothing but a subject and they notice. Replies come the next month, and staff read everything, both ways. In the epilogue, your messages are read next to your public card.</p>
      <h3>What to expect</h3>
      <p>Every option costs something with staff, with the yard, or with both. There's no right answer. Everyone gets released. The question is what kind of person the sentence made you.</p>
      <button className="primary" onClick={p.onBack}>Back</button>
    </div>
  );
}

function FacilityPick(p: { onPick: (id: string) => void; onBack: () => void }) {
  return (
    <>
      <h2>Choose a facility</h2>
      <p className="dim">Custody level sets the difficulty: the higher the custody, the harder it is to walk out early.</p>
      {FACILITIES.map((f) => (
        <button key={f.id} className="choice" onClick={() => p.onPick(f.id)}>
          <b>{f.name} <span className="dim small">· {cap(f.custody)} custody · {f.difficulty}</span></b>
          <span className="dim small">{f.rules}</span>
        </button>
      ))}
      <button className="ghost" onClick={p.onBack}>Back</button>
    </>
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
        <h2>Intake</h2>
        <p className="dim">Your public card is read aloud. Your private card is yours alone.</p>
        <Court g={g} act={act} />
        <CharacterCards g={g} />
        <button className="primary" onClick={() => act(beginSentence)}>
          {g.court?.path === 'trial' ? 'Go to trial and begin your sentence' : g.court?.talked ? 'Talk, take the deal, and begin your sentence' : 'Take the deal and begin your sentence'}
        </button>
      </>
    );
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
          {g.visitPending ? 'Choose what to do with your visit first' : g.ending === 'released' ? 'Send it. Walk out.' : 'Send'}
        </button>
        {g.ending !== 'released' && <StopCounting g={g} act={act} />}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- */

function Draft(p: { g: Game; act: Act; onQuit: () => void }) {
  const d = p.g.draft!;
  const [c, setC] = useState('');
  const [b, setB] = useState('');
  const [o, setO] = useState('');
  const [name, setName] = useState('');
  const ready = c && b && o;
  return (
    <>
      <h2>Draft a life</h2>
      <p className="dim">Keep one card from each hand. Everything else about you — your stats, your failings — is rolled. Nobody chooses the life they start with.</p>
      <input value={name} placeholder="Name (optional)" onChange={(e) => setName(e.target.value)} maxLength={24} />
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
      <h3>Outside</h3>
      {d.outsides.map((id) => {
        const out = outside(id);
        return (
          <button key={id} className={`choice ${o === id ? 'sel' : ''}`} onClick={() => setO(id)}>
            <b>{out.front}</b>
            <span className="small">Support {out.support}</span>
          </button>
        );
      })}
      <button className="primary" disabled={!ready} onClick={() => p.act((g) => draftPick(g, { chargeId: c, backgroundId: b, outsideId: o, name }))}>
        Roll stats and failings
      </button>
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
        <p><b>{chg.name}.</b> {ch.claim}</p>
        <p className="small dim">At {fac.name} · Sentence {g.court ? fmtMonths(g.court.months) : `${g.sentence} months`} · Standing {g.standing} · Support {g.support}</p>
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
  const s = g.stats;
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
  if (!notes.length) notes.push('You did your time.');

  const early = g.sentence - g.m;
  const headline =
    g.ending === 'released'
      ? `You walked out in ${clock(g, g.m)}${early > 0 ? `, ${Math.round(early * g.perTurn)} month${Math.round(early * g.perTurn) === 1 ? '' : 's'} before your max date` : ', on your max date'}.`
      : g.ending === 'died'
        ? 'You did not walk out.'
        : g.ending === 'pc'
          ? 'You left the yard for protective custody.'
          : 'You were carried out on a medical.';

  const meet = visitingTies(g)[0] ?? activeTies(g)[0];
  const gate =
    g.ending !== 'released' ? null
      : meet ? `At the gate: ${meet.who}. Your Support when you walked out was ${g.support}.`
        : 'At the gate: no one. You leave with a bus ticket and whatever is on your books.';
  if (g.flags.ppm) notes.push('You walked out with a referral for prosecution behind you: Persistent Prison Misbehavior. The sentence was not the end of it.');
  const file = g.infractions.filter((x) => x.result !== 'not_guilty');

  const all = g.letters.flatMap((l) => l.lines.map((ln) => ({ ...ln, m: l.m, notebook: l.notebook })));
  const delivered = all.filter((l) => l.status !== 'held');
  const held = all.filter((l) => l.status === 'held');
  const anyNotebook = g.letters.some((l) => l.notebook);

  return (
    <>
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
              <div key={`d${i}`} className="letter">
                <span className="small">Month {t.m}{t.notebook ? ' · notebook' : ''}{t.to ? ` · to ${t.to} · ${t.subject}` : ''}</span>
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
          <div key={i} className="line small">
            Month {x.m}: {x.code} {violation(x.code).title} · {x.result === 'onsite' ? 'handled on site' : x.serious ? `serious${x.plea === 'guilty' ? ', pled guilty' : ', contested'}${x.days ? `, ${x.days} days good time` : ''}${x.appeal ? `, appeal ${x.appeal}` : ''}` : x.result === 'reduced' ? 'reduced to a general' : 'general'}
            {x.discretionary ? <span className="dim"> · the officer's call</span> : ''}
          </div>
        ))}
        {file.length > 0 && (
          <p className="small dim">
            {g.gctLost} days of good conduct time taken. {g.classPoints} points taken off your custody score. {g.segPlacements.length ? `${g.segPlacements.length} month${g.segPlacements.length > 1 ? 's' : ''} in segregation${g.segPlacements.some((x) => x.discretionary) ? ', some on nothing but a lieutenant\'s say-so' : ''}.` : ''} {file.filter((x) => x.discretionary).length} write-ups that came down to which officer was on shift, and how that officer looked at you.
          </p>
        )}
      </div>

      {g.ending === 'released' && <Odds g={g} />}

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
          {g.ledger.filter((e) => !e.forced).map((e, i) => (
            <div key={i} className="line small">
              Month {e.m}: {e.title} · {Math.max(0, e.blueNo + (e.applies ? e.consp : 0)) + e.white + e.gray + e.rumor} dice
              {e.applies ? <span className="dim"> (discretionary: Conspicuity counted)</span> : ''} ·{' '}
              <span className={e.caught ? 'caught' : 'clean'}>{e.caught ? 'caught' : 'clean'}</span>
            </div>
          ))}
        </details>
      </div>

      <button className="primary" onClick={onAgain}>Serve another sentence</button>
      <button className="ghost" onClick={onQuit}>Main menu</button>
    </>
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
  const deal = sentenceFor(ch.chargeId, bg.score, 'deal', bad, { offer });
  const talk = sentenceFor(ch.chargeId, bg.score, 'deal', bad, { offer, talk: true });
  const trial = sentenceFor(ch.chargeId, bg.score, 'trial', bad);
  const row = (label: string, sen: typeof deal, sel: boolean, onPick: (x: Game) => Game, note: string) => (
    <button className={`choice ${sel ? 'sel' : ''}`} onClick={() => act(onPick)}>
      <b>{label}: {fmtMonths(sen.months)}</b>
      <span className="small">
        {sen.sheet.offense}{sen.sheet.counts > 1 ? `, ${sen.sheet.counts} counts` : ''} (RCW {sen.sheet.rcw}), level {ROMAN[sen.sheet.level]}
        {sen.sheet.grid === 'drug' ? ' on the drug grid' : ''}, offender score {sen.score}: standard range {fmtRange(sen.range)}
        {sen.sheet.enh ? `, plus ${sen.enhMonths} months for the ${sen.sheet.enh.label}${sen.sheet.enh.flat ? ', flat time' : ''}` : ''}.
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
