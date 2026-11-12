import { describe, expect, it } from 'vitest';
import { FACILITY, SHARED, flaggedWords } from '../src/content/keywords';

/** Ordinary things people write home. Most of these should pass. */
const ORDINARY = [
  'I miss you every day. Tell the kids I love them.',
  "Hope work isn't too hard on you this week.",
  'The food here is the same thing every Tuesday.',
  'I started reading again. The library has more than I thought.',
  "Don't worry about me, I'm keeping my head down.",
  'Can you put a little money on my books when you get paid?',
  'I think about home a lot. Give Grandma a hug for me.',
  'Did the car get fixed? That noise sounded bad.',
  "I'm sorry I wasn't there for her birthday. I'll make the next one.",
  'Counting the days. Ten more months and I am out.',
  'My cellie snores like a truck but he is alright.',
  'Got my GED class on Mondays now. Feels good to learn something.',
  'Tell Mom I said thank you for the pictures.',
  "It's been cold in here. They finally turned the heat on.",
  'I had a bad week but I am okay now. Write me back.',
  "Thinking of you all today. It's quiet on the unit.",
  'Is the dog still sleeping on my side of the bed?',
  'I ran laps on the yard this morning. Trying to stay healthy.',
  'They moved me to a new cell. Same building, different view.',
  "Happy anniversary. I know it's not much from in here."
];

describe('the keyword lists', () => {
  it('flag what the designer says gets flagged', () => {
    for (const w of ['spice', 'fentanyl', 'meth', 'pussy', 'anal', 'anus', 'stab', 'mission', 'ink', 'tats', 'cashapp'])
      expect(flaggedWords('harlan', `something about ${w} here`), w).toContain(w);
  });

  it('match whole words only: "think" is not "ink", "method" is not "meth"', () => {
    expect(flaggedWords('harlan', 'I think about the method they use, and their sexton')).toEqual([]);
  });

  it('leave most ordinary messages alone, everywhere', () => {
    for (const f of Object.keys(FACILITY)) {
      const flagged = ORDINARY.filter((m) => flaggedWords(f, m).length);
      expect(flagged.length, `${f}: ${flagged.join(' | ')}`).toBeLessThanOrEqual(2);
    }
  });

  it('differ between facilities, as they do', () => {
    const msg = 'I hit the yard early and passed a kite to nobody.';
    const results = Object.keys(FACILITY).map((f) => flaggedWords(f, msg).join(','));
    expect(new Set(results).size).toBeGreaterThan(1);
  });

  it('stay under about 100 terms per facility', () => {
    for (const f of Object.keys(FACILITY)) expect(SHARED.length + FACILITY[f].length).toBeLessThanOrEqual(100);
  });
});
