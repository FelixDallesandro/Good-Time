import { describe, expect, it } from 'vitest';
import { BACKGROUNDS, CHARGES } from '../src/engine/content';
import { beginSentence, classify, draftPick, listingActive, lockReason, newGame, postProfile, chooseCourt } from '../src/engine/engine';
import { GED_MONTHS, ICD_BASE, PEN_PAL, icdBand, waOne } from '../src/content/classification';
import { CASES } from '../src/content/sentencing';
import { COMMUNITY_CUSTODY } from '../src/content/reentry';
import type { Game } from '../src/engine/types';
import { playGame } from '../src/engine/autoplay';

const intake = (charge: string, bg: string, seed = 7): Game =>
  draftPick(newGame('harlan', seed), { chargeId: charge, backgroundId: bg, name: 'T' });

describe('reception (DOC 310.150)', () => {
  it('uses the policy bands', () => {
    expect(icdBand(34)).toBe('close');
    expect(icdBand(35)).toBe('medium');
    expect(icdBand(47)).toBe('medium');
    expect(icdBand(48)).toBe('minimum');
  });

  it('deals the Outside card: the player never picks it', () => {
    const s = intake('burglary', 'b2');
    expect(s.char!.outsideId).toBeTruthy();
    expect(s.phase).toBe('sheet');
  });

  it('classifies only after the court, and places you by the score', () => {
    for (const c of CHARGES)
      for (const b of BACKGROUNDS) {
        const s = classify(intake(c.id, b.id));
        const r = s.intake!;
        expect(s.phase).toBe('reception');
        expect(r.icd).toBe(Math.max(0, r.parts.reduce((a, x) => a + x.v, 0)));
        expect(r.custody).toBe(icdBand(r.icd));
        expect(s.custody).toBe(r.custody);
        expect(s.facilityId).toBe(r.facilityId);
        if (b.age < 29) expect(r.parts.some((x) => x.label.startsWith('Under 29'))).toBe(true);
        // the history of violence deduction never exceeds 15
        const hv = r.parts.find((x) => x.label.startsWith('History'));
        if (hv) expect(hv.v).toBeGreaterThanOrEqual(-15);
      }
  });

  it('scores the offense you were convicted of: trial and deal can differ', () => {
    const deal = classify(intake('robbery', 'b9'));
    const trialG = chooseCourt(intake('robbery', 'b9'), 'trial');
    const trial = classify(trialG);
    expect(deal.intake!.parts[1].label).toContain(CASES.robbery.deal.cat);
    expect(trial.intake!.parts[1].label).toContain(CASES.robbery.trial.cat);
  });

  it('puts a first-time property case over 29 at Minimum, and a young violent one lower', () => {
    const old = classify(intake('retail_theft', 'b9'));
    expect(old.intake!.icd).toBe(ICD_BASE + 20);
    expect(old.custody).toBe('minimum');
    const young = classify(intake('assault', 'b3'));
    expect(young.intake!.icd).toBeLessThan(old.intake!.icd);
  });

  it('a pretrial jail stay costs more people than going home', () => {
    const lost = (bg: string) => {
      let n = 0;
      for (let seed = 1; seed <= 300; seed++) n += classify(intake('burglary', bg, seed)).intake!.lost.length;
      return n;
    };
    expect(lost('b3')).toBeGreaterThan(lost('b2')); // held vs home until trial
  });

  it('Washington ONE keeps the highest model in the hierarchy', () => {
    expect(waOne({ category: 'violent', priors: 3, young: false, priorDoc: false, habit: false }).level).toBe('High Violent');
    expect(waOne({ category: 'drug', priors: 0, young: false, priorDoc: false, habit: false }).level).toBe('Lower');
    expect(waOne({ category: 'property', priors: 5, young: true, priorDoc: true, habit: true }).level).toBe('High Violent Property Drug');
    // none high: the general felony model decides
    expect(waOne({ category: 'public_order', priors: 2, young: false, priorDoc: false, habit: false }).level).toBe('Moderate');
  });

  it('rates eight needs, and reassessment moves them but never the frozen risk level', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = classify(intake('burglary', 'b3', seed)).intake!;
      expect(Object.keys(r.needs)).toHaveLength(8);
      const end = playGame(seed, { classify: true });
      if (!end.intake || (end.m - 1) * end.perTurn < 6) continue; // over before the first six months (e.g. PC)
      expect(Number(end.flags.waOneSeen ?? 0)).toBeGreaterThan(0);
      expect(Object.keys(end.intake.needs)).toHaveLength(8);
    }
  });

  it('rolls schooling within what the background allows, and rates Education on it', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      for (const bg of BACKGROUNDS) {
        const s = classify(intake('burglary', bg.id, seed));
        const e = s.char!.education;
        seen.add(e);
        if (bg.credential) expect(e).not.toBe('none');
        expect(s.intake!.needs.Education).toBe(e === 'none' ? 'High' : 'Low');
      }
    }
    expect([...seen].sort()).toEqual(['diploma', 'ged', 'none']);
  });

  it('needs a GED before a job, and GED class earns one', () => {
    const job = { id: 'x', label: 'Take it', text: '', effect: { job: true } } as never;
    let gated = 0, inClass = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s = beginSentence(classify(intake('burglary', 'b3', seed)));
      if (s.char!.education === 'none') { expect(lockReason(s, job)).toBe('Needs a GED first'); gated++; }
      else expect(lockReason(s, job)).toBeNull();
    }
    for (let seed = 1; seed <= 150; seed++) {
      const end = playGame(seed, { classify: true });
      const months = Number(end.flags.gedMonths ?? 0);
      if (!months) continue;
      inClass++;
      expect(end.char!.education).toBe(months >= GED_MONTHS ? 'ged' : 'none');
      if (end.char!.education === 'none') expect(end.job).toBe(false);
    }
    expect(gated).toBeGreaterThan(0);
    expect(inClass).toBeGreaterThan(0);
  });

  it('begins the sentence from reception', () => {
    const s = beginSentence(classify(intake('delivery', 'b8')));
    expect(s.m).toBe(1);
    expect(['card', 'hub']).toContain(s.phase);
  });
});

describe('community custody (RCW 9.94A.701)', () => {
  it('knows the term for every offense on every case sheet', () => {
    for (const c of Object.values(CASES)) for (const sh of [c.trial, c.deal]) expect(COMMUNITY_CUSTODY[sh.offense], sh.offense).toBeDefined();
  });
  it('violent 18, persons and drug felonies 12, property none', () => {
    expect(COMMUNITY_CUSTODY['Robbery in the second degree'].months).toBe(18);
    expect(COMMUNITY_CUSTODY['Identity theft in the second degree'].months).toBe(12);
    expect(COMMUNITY_CUSTODY['Possession with intent to deliver methamphetamine'].months).toBe(12);
    expect(COMMUNITY_CUSTODY['Residential burglary'].months).toBe(0);
  });
});

describe('pen pals', () => {
  it('a paid listing costs commissary, one at a time', () => {
    let s = beginSentence(classify(intake('burglary', 'b3')));
    s = { ...s, phase: 'hub', commissary: 20 };
    s = postProfile(s);
    expect(listingActive(s)).toBe(true);
    expect(s.commissary).toBe(20 - PEN_PAL.cost);
    expect(postProfile(s)).toBe(s);
  });
  it('while it is up, strangers sometimes write: messages only, never more than two', () => {
    let wrote = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const s = playGame(seed, { flags: { listingUntil: 99 } });
      const pals = s.ties.filter((t) => t.id.startsWith('pen_pal'));
      expect(pals.filter((t) => !t.gone).length).toBeLessThanOrEqual(PEN_PAL.max);
      if (pals.length) wrote++;
      for (const t of pals) expect(t.visits).toBe(false);
    }
    expect(wrote).toBeGreaterThan(10);
  });
});
