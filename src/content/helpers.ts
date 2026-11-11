import type { Card, Choice, Effect, RollSpec } from '../engine/types';

/** A Fight: roll the Eyes for that place, +1 Standing whether caught or not, roll for Hurt after. Caught: 505 Fighting. */
export const fightRoll = (blue = 1, white = 3, gray = 1): RollSpec => ({ blue, white, gray, severity: 'major', ser: '505' });
export const fightEffect = (echoes: string[] = ['payback'], extra: Effect = {}): Effect => ({
  standing: 1,
  hurtCheck: 1,
  echoes,
  ...extra
});

/** A threat: reputation speaks first; otherwise d6 + Nerve vs 4; called = follow through (a fight) or fold. */
export function thr(
  roll: RollSpec = fightRoll(),
  o: { success?: Effect; echoes?: string[]; mod?: number; foldEchoes?: string[]; followExtra?: Effect } = {}
): NonNullable<Choice['threat']> {
  const echoes = o.echoes ?? ['payback'];
  return {
    success: o.success ?? {},
    follow: { roll, effect: fightEffect(echoes, o.followExtra) },
    fold: { standing: -2, rumors: 2, echoes: o.foldEchoes ?? echoes },
    mod: o.mod
  };
}

export const yard = (c: Omit<Card, 'kind'>): Card => ({ kind: 'yard', ...c });
export const move = (c: Omit<Card, 'kind'>): Card => ({ kind: 'move', ...c });
export const prompt = (c: Omit<Card, 'kind'>): Card => ({ kind: 'prompt', ...c });
export const count = (c: Omit<Card, 'kind'>): Card => ({ kind: 'count', ...c });
