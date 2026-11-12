import data from '../content/replies.json';
import { OUTSIDES } from './content';
import { activeTies, releaseMonth, tieActive, visitingTies, visitsBanned } from './engine';
import type { Game, SlipId, Tie } from './types';

/**
 * Replies from people outside. The player picks a subject line; the reply answers that subject, in that person's
 * voice, matched to what the game knows (how close you still are, whether they can visit, whether they came, seg,
 * a serious finding, time left). The player's own words never steer the reply, so it can never misread them.
 */

export type Topic = 'checkin' | 'visit' | 'money' | 'trouble' | 'seg' | 'family' | 'release' | 'sorry';

export const TOPICS: { id: Topic; subject: string }[] = [
  { id: 'checkin', subject: 'Checking in' },
  { id: 'visit', subject: 'Visiting' },
  { id: 'money', subject: 'Money on my books' },
  { id: 'trouble', subject: 'I got written up' },
  { id: 'seg', subject: "Where I've been" },
  { id: 'family', subject: 'How is everyone' },
  { id: 'release', subject: 'My release date' },
  { id: 'sorry', subject: "I'm sorry" }
];

export const CONDITIONS = ['warm', 'canVisit', 'visited', 'noShow', 'inSeg', 'lostTime', 'withKids', 'nearRelease'] as const;
export type Condition = (typeof CONDITIONS)[number];
export type When = Partial<Record<Condition, boolean>>;
export interface Line {
  text: string;
  when?: When;
}
export interface Voice {
  who: string;
  visits: boolean;
  kids: boolean;
  /** The children live with this person no matter what: only their visits can stop. */
  kidsAtHome?: boolean;
  /** After this month they are no longer warm, whatever else happens. */
  coolsAfterMonth?: number;
  late: Line[];
  /** When you sent them nothing but a subject line. */
  blank: Line[];
  news: Line[];
  signoffs: Line[];
  replies: Partial<Record<Topic, Line[]>>;
  /** Innocent-sounding questions that alert staff. Only offered when the fact behind them is true. */
  slips: Partial<Record<SlipId, Line[]>>;
}
export const VOICES = (data as { voices: Record<string, Voice> }).voices;

export interface ReplyContext extends Record<Condition, boolean> {
  voice: string;
  late: boolean;
  /** Your message had nothing in it. */
  blank: boolean;
  months: number;
  name: string;
  /** What this person could let slip right now, because it actually happened. */
  slips: SlipId[];
}

/** Which voice a person writes in. Children don't write; their news comes through the adult who has them. */
export function voiceOf(s: Game, t: Tie): string | null {
  if (t.minor) return null;
  if (t.id === 'partner') return s.char?.outsideId === 'partner_moving' ? 'partner_moving' : 'partner';
  if (t.id.startsWith('picked_up') || t.id.startsWith('someone')) return 'neighborhood';
  const base = t.id.replace(/_\d+$/, '');
  return VOICES[base] ? base : null;
}

const startWeight = (s: Game, t: Tie) =>
  OUTSIDES.find((o) => o.id === s.char?.outsideId)?.ties.find((x) => x.id === t.id)?.weight ?? 1;

export function replyContext(s: Game, t: Tie, late = false): ReplyContext | null {
  const voice = voiceOf(s, t);
  if (!voice) return null;
  const canVisit = visitingTies(s).some((x) => x.id === t.id);
  const visited = canVisit && s.visitMonths.includes(s.m);
  const months = Math.max(0, releaseMonth(s) - s.m);
  const sawYou = canVisit && s.visitMonths.some((m) => s.m - m <= 1);
  const efvFamily = t.efv || s.ties.some((x) => x.guardian === t.id && x.efv && tieActive(s, x));
  const slips: SlipId[] = [];
  if (s.flags.inked && sawYou) slips.push('ink');
  if (typeof s.flags.used_phone === 'number' && s.m - s.flags.used_phone <= 1) slips.push('phone');
  if (s.efv.status === 'approved' && efvFamily) slips.push('efv');
  if (s.strings.some((x) => x.type === 'debt')) slips.push('money');
  return {
    blank: false,
    slips: slips.filter((x) => VOICES[voice].slips?.[x]?.length),
    voice,
    late,
    months,
    name: s.char?.name ?? '',
    warm: t.weight >= startWeight(s, t) && s.m <= (VOICES[voice].coolsAfterMonth ?? Infinity),
    canVisit,
    visited,
    noShow: canVisit && !visited && !visitsBanned(s),
    inSeg: s.segUntil >= s.m, // in seg now: a visit this month was no-contact
    lostTime: s.infractions.some((x) => x.serious && x.result === 'guilty' && (x.days ?? 0) > 0 && s.m - x.m <= 1),
    withKids: s.ties.some((x) => x.minor && x.guardian === t.id && tieActive(s, x)),
    nearRelease: months <= 2
  };
}

/** The people you can write to this month, with the voice each one answers in. */
export function correspondents(s: Game): Tie[] {
  return activeTies(s).filter((t) => voiceOf(s, t));
}

/** Subject lines that make sense right now for this person. */
export function topicsFor(s: Game, t: Tie): Topic[] {
  const v = VOICES[voiceOf(s, t) ?? ''];
  if (!v) return [];
  const recentTrouble = s.infractions.some((x) => x.result !== 'not_guilty' && s.m - x.m <= 1);
  const recentSeg = s.segUntil >= s.m || s.segPlacements.some((x) => s.m - x.m <= 1);
  return TOPICS.map((x) => x.id).filter((id) => {
    if (!v.replies[id]?.length) return false;
    if (id === 'visit') return v.visits && t.visits;
    if (id === 'trouble') return recentTrouble;
    if (id === 'seg') return recentSeg;
    return true;
  });
}

export const matches = (w: When | undefined, ctx: ReplyContext) =>
  !w || CONDITIONS.every((k) => w[k] === undefined || w[k] === ctx[k]);

/**
 * Events decide what a reply is about: a visit that happened or didn't, seg, lost time, release coming. A line written
 * for an event always beats one that isn't. Mood conditions (how close you are, whether they can visit, whether the
 * kids are still with them) only filter, so a fitting general line stays in the mix for variety.
 */
const EVENTS: Condition[] = ['visited', 'noShow', 'inSeg', 'lostTime', 'nearRelease'];
const eventsIn = (w: When | undefined) => EVENTS.filter((k) => w?.[k] === true).length;

/** The lines whose conditions all hold, at the highest event tier. */
export function candidates(lines: Line[] | undefined, ctx: ReplyContext): Line[] {
  const ok = (lines ?? []).filter((l) => matches(l.when, ctx));
  const best = Math.max(-1, ...ok.map((l) => eventsIn(l.when)));
  return ok.filter((l) => eventsIn(l.when) === best);
}

const NUM = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty', 'Twenty-one'];
export const monthsText = (n: number) => (n <= 0 ? 'Any day now' : n === 1 ? 'One month' : `${NUM[n] ?? n} months`);

export function fill(text: string, ctx: ReplyContext) {
  return text.replace(/\{name\}/g, ctx.name || 'friend').replace(/\{monthsText\}/g, monthsText(ctx.months));
}

export interface Reply {
  parts: string[];
  text: string;
  /** If the message let something slip, staff will read it too. */
  slip?: SlipId;
}

/** Not common, but it happens. */
export const SLIP_CHANCE = 0.08;

/** Assemble a reply: a note if your message came late, the answer, maybe their news, a sign-off. */
export function compose(ctx: ReplyContext, topic: Topic, rand: () => number): Reply | null {
  const v = VOICES[ctx.voice];
  if (!v) return null;
  const pick = (ls: Line[]) => (ls.length ? ls[Math.floor(rand() * ls.length)] : undefined);
  const body = pick(candidates(v.replies[topic], ctx));
  if (!body) return null;
  const parts: string[] = [];
  const late = ctx.late ? pick(candidates(v.late, ctx)) : undefined;
  if (late) parts.push(late.text);
  const blank = ctx.blank ? pick(v.blank ?? []) : undefined;
  if (blank) parts.push(blank.text);
  parts.push(body.text);
  let slip: SlipId | undefined;
  if (ctx.slips.length && rand() < SLIP_CHANCE) {
    slip = ctx.slips[Math.floor(rand() * ctx.slips.length)];
    const line = pick(v.slips[slip] ?? []);
    if (line) parts.push(line.text);
    else slip = undefined;
  }
  const news = rand() < 0.5 ? pick(candidates(v.news, ctx)) : undefined;
  if (news) parts.push(news.text);
  const sign = pick(candidates(v.signoffs, ctx));
  if (sign) parts.push(sign.text);
  const filled = parts.map((p) => fill(p, ctx));
  return { parts: filled, text: filled.join(' '), slip };
}
