import { describe, expect, it } from 'vitest';
import { OUTSIDES } from '../src/engine/content';
import { careful, randomPolicy } from '../src/engine/autoplay';
import {
  beginSentence, choose, chooseVisit, continueResult, draftPick, isBlank, newGame, plead, playScene, rollEyes, slipConsequence, submitLetters, toMail
} from '../src/engine/engine';
import {
  CONDITIONS, TOPICS, VOICES, candidates, compose, correspondents, matches, replyContext, topicsFor, voiceOf,
  type Condition, type Line, type ReplyContext, type Topic, type Voice
} from '../src/engine/replies';
import type { Game } from '../src/engine/types';

const ALLOWED_PLACEHOLDERS = ['{name}', '{monthsText}'];
/** Words that only make sense if this person can come to the visiting room (or just did, or didn't). */
const VISIT_WORDS = /\b(visit|visiting|come up|come again|come by|come through|be there|saturday|weekend|the drive|drive up|ride home|machines|that table)\b/i;
/** Only after an actual visit. */
const SAW_YOU = /\b(good to see|good seeing|see your face|you looked|you look|ride home|drive home)\b/i;
const KID_WORDS_STRICT = /\b(kids|your son|your daughter|the little one|the oldest)\b/i;
const SISTER_KIDS = /\b(kids|the little one|the oldest|them|their|they're)\b/i;
const PARTNER_SON = /\b(he|him|his)\b/i;

function* allLines(): Generator<{ voice: string; v: Voice; where: string; topic?: Topic; line: Line }> {
  for (const [voice, v] of Object.entries(VOICES)) {
    for (const where of ['late', 'blank', 'news', 'signoffs'] as const) for (const line of v[where] ?? []) yield { voice, v, where, line };
    for (const [topic, lines] of Object.entries(v.replies)) for (const line of lines ?? []) yield { voice, v, where: 'replies', topic: topic as Topic, line };
  }
}

/** Every combination of conditions that can actually happen for this voice. */
function* contexts(voice: string, v: Voice): Generator<ReplyContext> {
  const n = CONDITIONS.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    const c = Object.fromEntries(CONDITIONS.map((k, i) => [k, !!(mask & (1 << i))])) as Record<Condition, boolean>;
    if (c.visited && !c.canVisit) continue;
    if (c.noShow && (!c.canVisit || c.visited)) continue;
    if (!v.visits && c.canVisit) continue;
    if (!v.kids && c.withKids) continue;
    for (const late of [false, true]) yield { ...c, voice, late, months: c.nearRelease ? 2 : 7, name: 'Dee', slips: [], blank: false };
  }
}

describe('the reply library', () => {
  it('only uses placeholders the game fills', () => {
    for (const { voice, line } of allLines()) {
      for (const ph of line.text.match(/\{[^}]+\}/g) ?? []) expect(ALLOWED_PLACEHOLDERS, `${voice}: ${line.text}`).toContain(ph);
    }
  });

  it('only uses conditions the game knows', () => {
    for (const { voice, line } of allLines()) for (const k of Object.keys(line.when ?? {})) expect(CONDITIONS, `${voice}: ${k}`).toContain(k);
  });

  it('never talks about visiting unless the line is gated on visiting', () => {
    for (const { voice, v, line } of allLines()) {
      if (!VISIT_WORDS.test(line.text)) continue;
      expect(v.visits, `${voice} cannot visit: ${line.text}`).toBe(true);
      const w = line.when ?? {};
      expect('canVisit' in w || 'visited' in w || 'noShow' in w, `${voice}: ${line.text}`).toBe(true);
    }
  });

  it('only says it saw you after a visit that happened', () => {
    for (const { voice, line } of allLines()) if (SAW_YOU.test(line.text)) expect(line.when?.visited, `${voice}: ${line.text}`).toBe(true);
  });

  it('never mentions children that are not there', () => {
    for (const { voice, v, topic, line } of allLines()) {
      if (!v.kids) expect(KID_WORDS_STRICT.test(line.text), `${voice}: ${line.text}`).toBe(false);
      // a line about the children must say which situation it was written for: with them, or with them gone
      if (voice === 'sister' && SISTER_KIDS.test(line.text)) expect(!!line.when && 'withKids' in line.when, `sister: ${line.text}`).toBe(true);
      if (voice === 'partner' && topic === 'visit' && line.when?.canVisit !== false && PARTNER_SON.test(line.text))
        expect(line.when?.withKids, `partner: ${line.text}`).toBe(true);
    }
  });

  it('never answers a no-contact visit from seg with an ordinary one', () => {
    for (const [voice, v] of Object.entries(VOICES)) {
      if (!v.visits) continue;
      for (const ctx of contexts(voice, v)) {
        if (!(ctx.visited && ctx.inSeg)) continue;
        for (const l of candidates(v.replies.visit, ctx)) expect(l.when?.inSeg, `${voice}: ${l.text}`).toBe(true);
      }
    }
  });

  it('never says "I heard nothing" to someone they just visited', () => {
    const SILENCE = /\b(didn't hear|nothing from you|nobody .* tell|nothing came back|went quiet|disappeared|stopped writing|went ghost|unavailable|got nowhere|two weeks and nothing)\b/i;
    for (const { voice, v, line } of allLines()) {
      if (SILENCE.test(line.text) && v.visits) expect(line.when?.visited, `${voice}: ${line.text}`).toBe(false);
    }
  });

  // The tablet allows 12,000 characters from family (6,000 from inside). Lines stay short by choice: they read better.
  it('has no duplicate lines and keeps each line short', () => {
    const seen = new Set<string>();
    for (const { voice, line } of allLines()) {
      expect(seen.has(line.text), `duplicate: ${line.text}`).toBe(false);
      seen.add(line.text);
      expect(line.text.length, `${voice}: ${line.text}`).toBeLessThanOrEqual(220);
    }
  });

  it('answers every subject in every possible situation, with a sign-off, and a late note when needed', () => {
    let checked = 0;
    for (const [voice, v] of Object.entries(VOICES)) {
      for (const ctx of contexts(voice, v)) {
        for (const { id } of TOPICS) {
          if (!v.replies[id]) continue;
          if (id === 'visit' && !v.visits) continue;
          const c = candidates(v.replies[id], ctx);
          expect(c.length, `${voice}/${id} ${JSON.stringify(ctx)}`).toBeGreaterThan(0);
          for (const l of c) expect(matches(l.when, ctx)).toBe(true);
          checked++;
        }
        expect(candidates(v.signoffs, ctx).length, `${voice} signoff`).toBeGreaterThan(0);
        if (ctx.late) expect(candidates(v.late, ctx).length, `${voice} late`).toBeGreaterThan(0);
      }
    }
    expect(checked).toBeGreaterThan(10000);
  });

  it('gives every adult on every Outside card, and every new contact, a voice', () => {
    for (const o of OUTSIDES) {
      for (const t of o.ties) {
        const s = { char: { outsideId: o.id } } as Game;
        const voice = voiceOf(s, { ...t, gone: false, ready: 0 });
        if (t.minor) expect(voice).toBeNull();
        else expect(VOICES[voice ?? ''], `${o.id}/${t.id}`).toBeTruthy();
      }
      for (const ch of o.lineHome.choices ?? []) {
        const nt = ch.effect?.newTie;
        if (nt) expect(VOICES[voiceOf({ char: { outsideId: o.id } } as Game, { ...nt, gone: false, ready: 0 }) ?? '']).toBeTruthy();
      }
    }
  });
});

describe('replies in real sentences', () => {
  it('compose for every correspondent and every offered subject, month after month', () => {
    let composed = 0;
    const seenVoices = new Set<string>();
    for (const o of OUTSIDES) {
      for (let seed = 1; seed <= 25; seed++) {
        let s = newGame(['cedar', 'harlan', 'granite'][seed % 3], seed * 97 + o.id.length);
        s = draftPick(s, { chargeId: s.draft!.charges[0], backgroundId: s.draft!.backgrounds[0], outsideId: o.id, name: 'Dee' });
        s = beginSentence(s);
        const policy = seed % 2 ? careful : randomPolicy;
        let r = seed;
        const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
        for (let guard = 0; guard < 4000 && s.phase !== 'over'; guard++) {
          if (s.phase === 'card') s = choose(s, policy(s));
          else if (s.phase === 'result') s = continueResult(s);
          else if (s.phase === 'hub') s = s.mo.scenesLeft > 0 ? playScene(s) : rollEyes(s);
          else if (s.phase === 'eyes') s = s.hearings.length ? plead(s, 'guilty') : toMail(s);
          else if (s.phase === 'mail') {
            for (const t of correspondents(s)) {
              for (const topic of topicsFor(s, t)) {
                const ctx = replyContext(s, t, rand() < 0.3)!;
                const reply = compose(ctx, topic, rand);
                expect(reply, `${ctx.voice}/${topic} ${JSON.stringify(ctx)}`).not.toBeNull();
                expect(reply!.text).not.toMatch(/\{|\}/);
                if (!ctx.canVisit) expect(reply!.text, `${ctx.voice}/${topic}`).not.toMatch(/\b(good to see you|good seeing you|ride home)\b/i);
                seenVoices.add(ctx.voice);
                composed++;
              }
            }
            s = s.visitPending ? chooseVisit(s, 'money') : submitLetters(s, ['Thinking of you all today.']);
          } else break;
        }
      }
    }
    expect(composed).toBeGreaterThan(5000);
    for (const v of ['mother', 'partner', 'grandmother', 'ex', 'brother', 'volunteer', 'partner_moving', 'friend', 'sister']) expect(seenVoices).toContain(v);
  });
});

describe('slips: questions from outside that tell staff too much', () => {
  const at = (out: string, seed = 5) => {
    let s = newGame('harlan', seed);
    s = draftPick(s, { chargeId: s.draft!.charges[0], backgroundId: s.draft!.backgrounds[0], outsideId: out, name: 'Dee' });
    s = beginSentence(s);
    for (let i = 0; i < 40 && s.phase !== 'hub'; i++) s = s.phase === 'card' ? choose(s, careful(s)) : continueResult(s);
    return s;
  };
  const tieOf = (s: Game, id: string) => s.ties.find((t) => t.id === id)!;

  it('only lets slip what actually happened', () => {
    const s = at('mother');
    expect(replyContext(s, tieOf(s, 'mother'))!.slips).toEqual([]);
    s.flags.inked = true;
    s.visitMonths = [s.m];
    expect(replyContext(s, tieOf(s, 'mother'))!.slips).toContain('ink');
    s.visitMonths = [];
    expect(replyContext(s, tieOf(s, 'mother'))!.slips).not.toContain('ink'); // she has to have seen it
    s.flags.used_phone = s.m;
    expect(replyContext(s, tieOf(s, 'mother'))!.slips).toContain('phone');
    s.efv.status = 'approved';
    expect(replyContext(s, tieOf(s, 'mother'))!.slips).toContain('efv');
  });

  it('never offers an EFV slip to someone who could not come on one', () => {
    const s = at('best_friend');
    s.efv.status = 'approved';
    expect(replyContext(s, tieOf(s, 'friend'))!.slips).not.toContain('efv');
  });

  it('puts the slip in the message when it happens, and nowhere else', () => {
    const s = at('mother');
    s.flags.used_phone = s.m;
    const ctx = replyContext(s, tieOf(s, 'mother'))!;
    let seen = 0;
    for (let i = 0; i < 400; i++) {
      let r = i + 1;
      const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
      const reply = compose(ctx, 'checkin', rand)!;
      if (reply.slip) {
        seen++;
        expect(reply.text).toContain(VOICES.mother.slips.phone![0].text);
      } else expect(reply.text).not.toContain(VOICES.mother.slips.phone![0].text);
    }
    expect(seen).toBeGreaterThan(5);
    expect(seen).toBeLessThan(80); // not common
  });

  it('staff act on what they read', () => {
    const s = at('mother');
    s.pendingBreaks = [];
    slipConsequence(s, 'phone', 'your mother');
    expect(s.pendingBreaks[0].ser).toBe('882');
    expect(s.pendingBreaks[0].title).toMatch(/Mail review/);
    s.efv.status = 'approved';
    slipConsequence(s, 'efv', 'your mother');
    expect(s.efv.status).toBe('applied');
    let tattoos = 0;
    for (let i = 0; i < 40; i++) {
      s.pendingBreaks = [];
      s.rng = i + 1;
      slipConsequence(s, 'ink', 'your mother');
      if (s.pendingBreaks.some((b) => b.ser === '710')) tattoos++;
    }
    expect(tattoos).toBeGreaterThan(5);
  });

  it('keeps slip lines clean: no placeholders, no duplicates, short', () => {
    const seen = new Set<string>();
    for (const [voice, v] of Object.entries(VOICES)) {
      for (const lines of Object.values(v.slips ?? {})) {
        for (const l of lines ?? []) {
          expect(l.text, voice).not.toMatch(/\{/);
          expect(seen.has(l.text), l.text).toBe(false);
          seen.add(l.text);
          expect(l.text.length).toBeLessThanOrEqual(220);
        }
      }
      if (!v.visits) expect(v.slips?.ink, `${voice} never saw you`).toBeUndefined();
    }
  });
});

describe('blank messages', () => {
  const at = (out: string, seed = 7) => {
    let s = newGame('harlan', seed);
    s = draftPick(s, { chargeId: s.draft!.charges[0], backgroundId: s.draft!.backgrounds[0], outsideId: out, name: 'Dee' });
    s = beginSentence(s);
    for (let i = 0; i < 60 && s.phase !== 'mail'; i++) {
      if (s.phase === 'card') s = choose(s, careful(s));
      else if (s.phase === 'result') s = continueResult(s);
      else if (s.phase === 'hub') s = s.mo.scenesLeft > 0 ? playScene(s) : rollEyes(s);
      else if (s.phase === 'eyes') s = s.hearings.length ? plead(s, 'guilty') : toMail(s);
    }
    if (s.visitPending) s = chooseVisit(s, 'money');
    s.commsUntil = 0;
    return s;
  };

  it('every voice notices an empty message', () => {
    for (const [voice, v] of Object.entries(VOICES)) expect(v.blank?.length, voice).toBeGreaterThan(0);
  });

  it('counts fewer than three words as blank', () => {
    expect(isBlank('')).toBe(true);
    expect(isBlank('hi mom')).toBe(true);
    expect(isBlank('I miss you')).toBe(false);
  });

  it('costs the relationship on the second blank, not the first', () => {
    let s = at('mother');
    const before = s.ties.find((t) => t.id === 'mother')!.weight;
    s.mo.noMessages = false;
    s = { ...s, phase: 'mail' };
    const one = submitLetters(s, [{ to: 'mother', topic: 'checkin', text: '' }]);
    expect(one.ties.find((t) => t.id === 'mother')!.weight).toBe(before);
    expect(one.ties.find((t) => t.id === 'mother')!.strain).toBe(1);
    expect(one.outbox[0].blank).toBe(true);
    const tie = s.ties.find((t) => t.id === 'mother')!;
    tie.strain = 1;
    const two = submitLetters(s, [{ to: 'mother', topic: 'checkin', text: 'ok' }]);
    expect(two.ties.find((t) => t.id === 'mother')!.weight).toBe(before - 1);
  });

  it('a real message costs nothing', () => {
    const s = at('mother');
    const after = submitLetters(s, [{ to: 'mother', topic: 'checkin', text: 'The days are long but I am okay.' }]);
    expect(after.ties.find((t) => t.id === 'mother')!.strain ?? 0).toBe(0);
    expect(after.outbox[0].blank).toBe(false);
  });

  it('the reply calls it out, and comes back cooler', () => {
    const s = at('mother');
    const ctx = { ...replyContext(s, s.ties.find((t) => t.id === 'mother')!)!, blank: true, warm: false };
    let r = 9;
    const reply = compose(ctx, 'checkin', () => ((r = (r * 16807) % 2147483647) / 2147483647))!;
    expect(reply.text).toContain(VOICES.mother.blank[0].text);
  });
});
