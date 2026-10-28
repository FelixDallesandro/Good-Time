/**
 * Balance simulation (build step 2 in the design doc).
 * Design intent: over a full sentence, keeping your head down should cost more
 * good time on average than putting in work once, but not every time.
 *
 *   npm run sim
 */
import { careful, headDown, headDownThenWork, putInWorkOnce, randomPolicy, playGame } from '../src/engine/autoplay';
import { grooveOf, ledgerRows } from '../src/engine/engine';
import type { Policy } from '../src/engine/autoplay';

const N = 3000;

function run(label: string, facilityId: string, policy: Policy, inject?: string[]) {
  let months = 0, caught = 0, dice = 0, rolls = 0, early = 0, dead = 0, medical = 0, finalStanding = 0, majors = 0;
  let grooved = 0, locked = 0;
  for (let seed = 1; seed <= N; seed++) {
    const s = playGame(seed * 7919, { facilityId, policy, inject });
    months += s.m;
    caught += s.stats.caught;
    finalStanding += s.standing;
    if (grooveOf(s)) grooved++;
    if (s.groove.locked) locked++;
    for (const e of s.ledger) {
      if (e.forced) continue;
      dice += Math.max(0, e.blueNo + (e.applies ? e.consp : 0)) + e.white + e.gray + e.rumor;
      rolls++;
    }
    if (s.ending === 'released' && s.m < s.sentence) early++;
    if (s.ending === 'died') dead++;
    if (s.ending === 'medical') medical++;
    majors += s.ledger.filter((e) => e.caught && e.forced).length;
  }
  const f = (x: number) => x.toFixed(2);
  console.log(
    `${label.padEnd(22)} ${facilityId.padEnd(8)} avg walk-out month ${f(months / N)}  caught/game ${f(caught / N)}  ` +
      `dice/roll ${f(dice / Math.max(1, rolls))}  walk early ${((early / N) * 100).toFixed(0)}%  ` +
      `died ${((dead / N) * 100).toFixed(1)}%  medical ${((medical / N) * 100).toFixed(1)}%  end standing ${f(finalStanding / N)}  ` +
      `groove ${((grooved / N) * 100).toFixed(0)}% locked ${((locked / N) * 100).toFixed(0)}%`
  );
}

for (const fac of ['cedar', 'harlan', 'granite']) {
  run('head down (strict)', fac, headDown);
  run('head down, work once', fac, headDownThenWork, ['put_in_work']);
  run('optimizer', fac, careful);
  run('random choices', fac, randomPolicy);
  console.log('');
}

// How much does a background change the same choices? (the ledger's thesis)
let s = playGame(123, { policy: careful });
for (let seed = 124; seed < 400 && !s.ledger.some((e) => e.applies); seed++) s = playGame(seed, { policy: careful });
console.log('Ledger replay for one careful sentence (same choices, different Conspicuity):');
for (const r of ledgerRows(s))
  console.log(`  conspicuity ${r.consp >= 0 ? '+' : ''}${r.consp}: expected catches ${r.expectedCaught.toFixed(2)}, chance of a clean sentence ${(r.cleanChance * 100).toFixed(0)}%`);
