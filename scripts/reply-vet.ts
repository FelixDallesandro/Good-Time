/**
 * Read the replies the way a player would meet them: plays real sentences, composes a reply at every message call,
 * and prints a sample with the state that produced it, plus how often each line is actually reachable.
 *   npx tsx scripts/reply-vet.ts [samples] [seed]
 */
import { OUTSIDES } from '../src/engine/content';
import { careful, randomPolicy } from '../src/engine/autoplay';
import {
  beginSentence, choose, chooseVisit, continueResult, draftPick, newGame, plead, playMove, playScene, rollEyes, submitLetters, toMail
} from '../src/engine/engine';
import { VOICES, compose, correspondents, replyContext, topicsFor, type Topic } from '../src/engine/replies';

declare const process: { argv: string[] };
const SAMPLES = Number(process.argv[2] ?? 40);
let r = Number(process.argv[3] ?? 7);
const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);

type Row = { voice: string; topic: Topic; flags: string; text: string; month: number };
const rows: Row[] = [];
const used = new Map<string, number>();

for (const o of OUTSIDES) {
  for (let seed = 1; seed <= 30; seed++) {
    let s = newGame(['cedar', 'harlan', 'granite'][seed % 3], seed * 131 + o.id.length);
    s = draftPick(s, { chargeId: s.draft!.charges[0], backgroundId: s.draft!.backgrounds[0], outsideId: o.id, name: 'Dee' });
    s = beginSentence(s);
    const policy = seed % 2 ? careful : randomPolicy;
    let usedLine = false;
    for (let guard = 0; guard < 4000 && s.phase !== 'over'; guard++) {
      if (s.phase === 'card') s = choose(s, policy(s));
      else if (s.phase === 'result') s = continueResult(s);
      else if (s.phase === 'hub') {
        // play the Line Home move once, mid-sentence, so the people outside change as they do in real play
        if (!usedLine && s.m === 4 + (seed % 4)) {
          usedLine = true;
          s = playMove(s, OUTSIDES.find((x) => x.id === s.char!.outsideId)!.lineHome.id);
        } else s = s.mo.scenesLeft > 0 ? playScene(s) : rollEyes(s);
      } else if (s.phase === 'eyes') s = s.hearings.length ? plead(s, seed % 3 ? 'guilty' : 'contest') : toMail(s);
      else if (s.phase === 'mail') {
        for (const t of correspondents(s)) {
          for (const topic of topicsFor(s, t)) {
            const ctx = replyContext(s, t, rand() < 0.25)!;
            const reply = compose(ctx, topic, rand);
            if (!reply) throw new Error(`no reply: ${ctx.voice}/${topic}`);
            for (const p of reply.parts) used.set(`${ctx.voice}|${p}`, (used.get(`${ctx.voice}|${p}`) ?? 0) + 1);
            const flags = (['warm', 'canVisit', 'visited', 'noShow', 'inSeg', 'lostTime', 'withKids', 'nearRelease', 'late'] as const)
              .filter((k) => ctx[k]).join(',');
            rows.push({ voice: ctx.voice, topic, flags, text: reply.text, month: s.m });
          }
        }
        s = s.visitPending ? chooseVisit(s, 'money') : submitLetters(s, ['Thinking of you all today.']);
      } else break;
    }
  }
}

console.log(`${rows.length} replies composed.\n`);
const only = process.argv[4]; // e.g. "inSeg" to read just those
const pool = only ? rows.filter((x) => x.flags.split(',').includes(only)) : rows;
for (let i = 0; i < SAMPLES && pool.length; i++) {
  const x = pool[Math.floor(rand() * pool.length)];
  console.log(`[${x.voice} / ${x.topic} / m${x.month}] {${x.flags}}\n  ${x.text}\n`);
}

// lines no real sentence ever reached
const never: string[] = [];
for (const [voice, v] of Object.entries(VOICES)) {
  const all = [...v.late, ...v.news, ...v.signoffs, ...Object.values(v.replies).flat()].map((l) => l!.text.replace('{name}', 'Dee'));
  for (const t of all) if (!t.includes('{monthsText}') && !used.has(`${voice}|${t}`)) never.push(`${voice}: ${t}`);
}
console.log(`Lines never reached in play (${never.length}):`);
for (const n of never) console.log(`  ${n}`);
