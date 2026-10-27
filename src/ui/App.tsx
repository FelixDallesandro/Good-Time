import { useMemo, useState } from 'react';
import {
  FACILITIES, background, charge, facility, failing, outside
} from '../engine/content';
import {
  STATS, actOf, availableMoves, beginSentence, cardChoices, cellieOf, choose, chooseVisit, confess, consp,
  conspFacts, continueResult, cutLeverage, denyRumor, draftPick, ledgerRows, leanOn, letterSlots, lockReason,
  newGame, payDebt, playMove, playScene, preview, releaseMonth, rollEyes, sentencingRows, standIn, stayIn,
  stopCounting, submitLetters, toMail
} from '../engine/engine';
import type { Choice, Game } from '../engine/types';

const SAVE = 'goodtime.save.v2';
const SEEN = 'goodtime.notice.v1';

function loadSave(): Game | null {
  try {
    const t = localStorage.getItem(SAVE);
    const g = t ? (JSON.parse(t) as Game) : null;
    return g && g.v === 2 ? g : null;
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
      <p><b>Calendar.</b> You start with a 12-month sentence and some empty good-time boxes. Each clean month fills one. You walk out at month 12 minus your filled boxes.</p>
      <p><b>Standing.</b> How the yard sees you, 0 to 5. Keeping the code raises it; breaking it lowers it. At 0 you are a target.</p>
      <p className="dim">The institution controls your Calendar. The yard controls your Standing. Almost every choice trades one for the other.</p>
      <h3>One roll: the Eyes</h3>
      <p>When you break a rule, count the dice on you. Blue for officers, white for prisoners, gray for cameras, red for rumors pinned to you. Any 6 means you're caught: one 6 is a minor (lose a box), two or more a major (lose two). You always see the dice before you act. The risk is never hidden, only the result.</p>
      <p className="dim">Staff roll behind a screen and tell you only "clean" or "caught." You never learn which die did it.</p>
      <h3>A month</h3>
      <p>Count card → your scenes → the Eyes → mail call. At mail call you write a sentence home. In the epilogue, your letters are read next to your public card.</p>
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
          <b>Month {Math.min(g.m, g.sentence)}</b> <span className="dim small">· walk out month {release} · {cap(actOf(g) === 'short' ? 'short time' : actOf(g) === 'long' ? 'the long middle' : actOf(g) === 'yard' ? 'the yard' : 'intake')}</span>
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
        {g.rumors.length > 0 && <span className="tag">{g.rumors.length} rumor{g.rumors.length > 1 ? 's' : ''}</span>}
        {g.proven && <span className="tag">Proven</span>}
        {g.hurt && <span className="tag hurt">Hurt</span>}
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
        <CharacterCards g={g} />
        <button className="primary" onClick={() => act(beginSentence)}>Begin your sentence</button>
      </>
    );
  if (g.phase === 'over') return <Epilogue g={g} onAgain={p.onAgain} onQuit={p.onQuit} />;

  return (
    <>
      <Hud g={g} canRewind={p.canRewind} countTime={p.countTime} onQuit={p.onQuit} onCards={p.onCards} />
      {g.phase === 'card' && <CardView g={g} act={act} />}
      {g.phase === 'result' && g.result && <ResultView g={g} act={act} />}
      {g.phase === 'hub' && <Hub g={g} act={act} />}
      {g.phase === 'eyes' && (
        <div className="panel">
          <h2>The Eyes</h2>
          <Lines lines={g.report} />
          <button className="primary" onClick={() => act(toMail)}>Mail call</button>
        </div>
      )}
      {g.phase === 'mail' && <Mail g={g} act={act} />}
    </>
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
                {why && <span className="why">{why}</span>}
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
          {done
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

const LETTER_IDEAS = [
  "I'm fine. Don't worry about the money.",
  'They moved me to a quieter unit.',
  'I think about home every day.',
  "I'm keeping my head down.",
  "I did something I'm not proud of.",
  'Nothing to report. That is the point.',
  "I'll be home sooner than they said.",
  "Tell them I said hello."
];

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
  const [lines, setLines] = useState<string[]>(Array.from({ length: slots }, () => ''));
  const notebook = g.support === 0;
  const to = outside(g.char!.outsideId).to;
  const set = (i: number, v: string) => setLines((a) => a.map((x, j) => (j === i ? v : x)));
  return (
    <>
      <div className="panel">
        <h2>Mail call</h2>
        <Lines lines={g.lines} />
        {g.visitPending && (
          <>
            <h3>Your visit</h3>
            <div className="grid2 stack">
              <button className="choice" onClick={() => act((s) => chooseVisit(s, 'money'))}><b>Money on your books</b><span className="dim small">+{g.support} store.</span></button>
              <button className="choice" onClick={() => act((s) => chooseVisit(s, 'steady'))}><b>Steady</b><span className="dim small">Pull one rumor. Someone outside still knows who you are.</span></button>
            </div>
          </>
        )}
      </div>
      <div className="panel">
        <h3>{notebook ? 'In your notebook' : `Dear ${to},`}</h3>
        <p className="dim small">
          {notebook
            ? 'No one is waiting, so you write one line in a notebook no one reads, addressed to no one.'
            : 'One private sentence home. Staff read every message before it goes out, and may delay it or hold it. A message that mentions staff, the yard, or a grievance is the likeliest to be held. It stays face down until the epilogue.'}
          {slots > 1 ? ` You may write ${slots} lines this month.` : ''}
        </p>
        {lines.map((l, i) => (
          <div key={i}>
            <textarea value={l} placeholder="Write a sentence…" onChange={(e) => set(i, e.target.value)} />
            <div className="row" style={{ marginTop: 6 }}>
              {LETTER_IDEAS.slice(0, 4).map((idea) => (
                <button key={idea} className="small ghost" onClick={() => set(i, idea)}>{idea}</button>
              ))}
            </div>
          </div>
        ))}
        <button className="primary" disabled={g.visitPending} onClick={() => act((s) => submitLetters(s, lines))}>
          {g.visitPending ? 'Choose what to do with your visit first' : g.ending === 'released' ? 'Seal it. Walk out.' : 'Seal it and send it'}
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
            <span className="small">Sentence: {bg.sentence} months</span>
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
        <h2>{ch.name}</h2>
        <p>{bg.front}</p>
        <p><b>{chg.name}.</b> {ch.claim}</p>
        <p className="small dim">At {fac.name} · Sentence {g.sentence} months · Standing {g.standing} · Support {g.support}</p>
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

const STATUS_NOTE = { sent: '', delayed: ' (it arrived a month late)', held: '' } as const;

function Epilogue({ g, onAgain, onQuit }: { g: Game; onAgain: () => void; onQuit: () => void }) {
  const ch = g.char!;
  const chg = charge(ch.chargeId);
  const bg = background(ch.backgroundId);
  const out = outside(ch.outsideId);
  const rows = ledgerRows(g);
  const yours = consp(g);
  const sent = sentencingRows();
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
  if (!notes.length) notes.push('You did your time.');

  const early = g.sentence - g.m;
  const headline =
    g.ending === 'released'
      ? `You walked out on month ${g.m}${early > 0 ? `, ${early} month${early > 1 ? 's' : ''} early` : ''}.`
      : g.ending === 'died'
        ? 'You did not walk out.'
        : g.ending === 'pc'
          ? 'You left the yard for protective custody.'
          : 'You were carried out on a medical.';

  const gate =
    g.ending !== 'released' ? null
      : g.support >= 1 ? `At the gate: ${out.who.toLowerCase()}. Your Support when you walked out was ${g.support}.`
        : 'At the gate: no one. You leave with a bus ticket and whatever is on your books.';

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
              <h2>{ch.name}</h2>
              <p>{bg.front}</p>
              <p><b>{chg.name}.</b> {ch.claim}</p>
              {ch.failings.map(failing).filter((f) => f.card === 'public').map((f) => <p key={f.id} className="small">{f.name}.</p>)}
            </div>
          </div>
          <div>
            <div className="small dim" style={{ marginBottom: 6 }}>{anyNotebook && g.support === 0 ? 'What you wrote in your notebook' : `What ${out.who.toLowerCase()} heard`}</div>
            {delivered.map((t, i) => (
              <div key={`d${i}`} className="letter"><span className="small">Month {t.m}{t.notebook ? ' · notebook' : ''}</span><br />{t.text}{STATUS_NOTE[t.status as 'sent' | 'delayed']}</div>
            ))}
            {!delivered.length && !held.length && <p className="dim">No letters were written.</p>}
          </div>
        </div>
        {held.length > 0 && (
          <>
            <h3>Never delivered</h3>
            <p className="small dim">Staff needed no reason and gave none.</p>
            {held.map((t, i) => <div key={`h${i}`} className="letter"><span className="small">Month {t.m}</span><br />{t.text}</div>)}
          </>
        )}
      </div>

      <div className="panel">
        <h3>The sentencing ledger</h3>
        <p>
          Every sentence starts at 12 months. Each line in your case that went against you added 2. Here are all {sent.rows.length} backgrounds side by side.
          The pattern is never announced during play. Yours is highlighted.
        </p>
        <table>
          <thead><tr><th>Background</th><th>Case</th><th>Months</th></tr></thead>
          <tbody>
            {sent.rows.map((r) => (
              <tr key={r.id} className={r.id === bg.id ? 'you' : ''}>
                <td>{r.ethnicity}, {r.age}</td>
                <td className="small">{r.case.map((c) => `${c.bad ? '✖' : '✓'} ${c.text}`).join(' ')}</td>
                <td>{r.sentence}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small dim">
          The average sentence across these cards is {sent.white.toFixed(0)} months for the white backgrounds and {sent.others.toFixed(1)} for everyone else.
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
