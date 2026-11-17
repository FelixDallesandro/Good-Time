/**
 * The research behind the game, as the epilogue cites it. Every figure here was checked against its source on
 * 2026-11-16; keep the wording as careful as the source is.
 */

export interface Source {
  label: string;
  url: string;
}

export const RESEARCH = {
  ussc: {
    label: 'U.S. Sentencing Commission, 2023 Demographic Differences in Federal Sentencing',
    url: 'https://www.ussc.gov/research/research-reports/2023-demographic-differences-federal-sentencing',
    /** Fiscal years 2017-2021, prison sentences, after controlling for other factors. */
    finding: 'In federal courts from 2017 to 2021, after controlling for other factors, Black men sentenced to prison got terms 4.7% longer than white men, and Hispanic men 1.9% longer. Black men were also 23.4% less likely to get probation.'
  },
  waTaskForce: {
    label: 'Task Force on Race and the Criminal Justice System, Preliminary Report on Race and Washington\'s Criminal Justice System (2012)',
    url: 'https://digitalcommons.law.uw.edu/wlr/vol87/iss1/2',
    finding: 'Washington\'s own task force concluded in 2012 that race and ethnicity affect outcomes in the state\'s criminal justice system beyond what offending explains, much of it through policies that look neutral and land unequally.'
  },
  nyt: {
    label: 'Schwirtz, Winerip, and Gebeloff, "The Scourge of Racial Bias in New York State\'s Prisons," New York Times (2016), Pulitzer finalist',
    url: 'https://www.pulitzer.org/finalists/michael-schwirtz-michael-winerip-and-robert-gebeloff',
    finding: 'A review of nearly 60,000 New York prison discipline cases found the racial gap was widest for infractions that rest on an officer\'s discretion, like disobeying a direct order. At one prison, Sing Sing, it found no Black-white gap.'
  },
  nyig: {
    label: 'New York State Inspector General, Racial Disparities in the Administration of Discipline in New York State Prisons (2022), via the Brooklyn Eagle',
    url: 'https://brooklyneagle.com/articles/2022/12/02/report-wide-racial-disparity-in-new-york-prison-discipline/',
    finding: 'From 2015 to 2020, counting write-ups later dismissed, Black people in New York prisons were 22% more likely than white people to be written up, and Hispanic people 12%. The Inspector General said the data alone can\'t say how much of that is bias.'
  }
} satisfies Record<string, Source & { finding: string }>;

/** The Washington sources the systems are built on, listed at the end. */
export const POLICY: Source[] = [
  { label: 'WAC 137-28, discipline', url: 'https://app.leg.wa.gov/wac/default.aspx?cite=137-28' },
  { label: 'RCW 9.94A, the Sentencing Reform Act, and the 2025 Adult Sentencing Guidelines Manual', url: 'https://app.leg.wa.gov/rcw/default.aspx?cite=9.94A' },
  { label: 'RCW 9.94A.701 and 9.94A.703, community custody', url: 'https://app.leg.wa.gov/rcw/default.aspx?cite=9.94A.701' },
  { label: 'DOC 310.150, initial classification; DOC 450.100 mail; DOC 590.100 extended family visits', url: 'https://doc.wa.gov/' },
  { label: 'WSIPP, Washington ONE: Evaluating Community Contact Impacts (2020)', url: 'https://www.wsipp.wa.gov/' },
  { label: 'DOC Graduated Reentry Handbook (500-HA004) and Reentry Center Handbook (400-HA019)', url: 'https://doc.wa.gov/' }
];
