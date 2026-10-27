import { ANYONE_MOVES, CODE_MOVES } from '../content/moves';
import { BACKGROUNDS } from '../content/backgrounds';
import { CELLIES } from '../content/cellies';
import { CHARGES, PULL_HABIT, PULL_STICKY } from '../content/charges';
import { COUNT_CARDS, PROMPTS as PROMPT_CARDS } from '../content/count';
import { FACILITIES } from '../content/facilities';
import { FAILINGS, OFFICERS } from '../content/failings';
import { OUTSIDES } from '../content/outsides';
import { YARD_CARDS } from '../content/yard';
import type { Card } from './types';

export { BACKGROUNDS, CELLIES, CHARGES, FACILITIES, FAILINGS, OFFICERS, OUTSIDES, PULL_HABIT, PULL_STICKY, ANYONE_MOVES, CODE_MOVES };

export const YARD = new Map<string, Card>(YARD_CARDS.map((c) => [c.id, c]));
export const COUNT = new Map<string, Card>(COUNT_CARDS.map((c) => [c.id, c]));
export const PROMPTS = new Map<string, Card>(PROMPT_CARDS.map((c) => [c.id, c]));

export const charge = (id: string) => CHARGES.find((c) => c.id === id)!;
export const background = (id: string) => BACKGROUNDS.find((b) => b.id === id)!;
export const outside = (id: string) => OUTSIDES.find((o) => o.id === id)!;
export const facility = (id: string) => FACILITIES.find((f) => f.id === id)!;
export const failing = (id: string) => FAILINGS.find((f) => f.id === id)!;
export const cellie = (id: string) => CELLIES.find((c) => c.id === id)!;
export const codeMove = (id: string) => CODE_MOVES.find((c) => c.id === id)!;
