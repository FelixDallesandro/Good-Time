/** How the discipline, visit, and EFV rules play out over whole sentences. `npx tsx scripts/discipline-sim.ts` */
import { playGame, careful, headDown, randomPolicy, type Policy } from '../src/engine/autoplay';
import { OUTSIDES } from '../src/engine/content';

const N = 300;
function run(label: string, facilityId: string, policy: Policy) {
  let generals = 0, seriouses = 0, f657 = 0, f658 = 0, petty = 0, anySerious = 0, gct = 0, ppm = 0;
  let visits = 0, efvApplied = 0, efvHad = 0, lostSomeone = 0, months = 0, early = 0;
  for (let seed = 1; seed <= N; seed++) {
    const s = playGame(seed * 7919, { facilityId, policy });
    months += s.m;
    if (s.ending === 'released' && s.m < s.sentence) early++;
    const guilty = s.infractions.filter((x) => x.result === 'guilty' || x.result === 'reduced');
    generals += guilty.filter((x) => !x.serious).length;
    seriouses += guilty.filter((x) => x.serious).length;
    f657 += guilty.filter((x) => x.code === '657').length;
    f658 += guilty.filter((x) => x.code === '658').length;
    petty += s.infractions.filter((x) => x.discretionary).length;
    if (guilty.some((x) => x.serious)) anySerious++;
    gct += s.gctLost;
    if (s.flags.ppm) ppm++;
    visits += s.visitMonths.length;
    if (s.efv.decide > 0) efvApplied++;
    if (s.efv.done) efvHad++;
    if (s.ties.some((t) => t.gone)) lostSomeone++;
  }
  const f = (x: number) => (x / N).toFixed(2);
  const p = (x: number) => `${Math.round((x / N) * 100)}%`;
  console.log(
    `${label.padEnd(10)} ${facilityId.padEnd(8)} month ${f(months)} early ${p(early)} | generals ${f(generals)} serious ${f(seriouses)} (any ${p(anySerious)}) ` +
      `657 ${f(f657)} 658 ${f(f658)} petty ${f(petty)} gct-days ${f(gct)} ppm ${p(ppm)} | visits ${f(visits)} efv-applied ${p(efvApplied)} efv-had ${p(efvHad)} lost-someone ${p(lostSomeone)}`
  );
}
for (const fac of ['cedar', 'harlan', 'granite']) {
  run('headDown', fac, headDown);
  run('careful', fac, careful);
  run('random', fac, randomPolicy);
}
console.log(`(Outside cards in the draft: ${OUTSIDES.length}; the autoplayer always keeps the first one dealt.)`);
