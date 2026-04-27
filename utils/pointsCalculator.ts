import { PointsInput, PointsBreakdown, VisaSubclass } from '../constants/types';

function calcAge(age: number): number {
  if (age >= 18 && age <= 24) return 25;
  if (age >= 25 && age <= 32) return 30;
  if (age >= 33 && age <= 39) return 25;
  if (age >= 40 && age <= 44) return 15;
  return 0;
}

function calcEnglish(level: string): number {
  if (level === 'superior') return 20;
  if (level === 'proficient') return 10;
  if (level === 'competent') return 0;
  return 0;
}

function calcAustralianWork(years: number): number {
  if (years >= 8) return 20;
  if (years >= 5) return 15;
  if (years >= 3) return 10;
  if (years >= 1) return 5;
  return 0;
}

function calcOverseasWork(years: number): number {
  if (years >= 8) return 15;
  if (years >= 5) return 10;
  if (years >= 3) return 5;
  return 0;
}

function calcStateNomination(visa: VisaSubclass, hasNomination: boolean): number {
  if (!hasNomination) return 0;
  if (visa === '491') return 15;
  if (visa === '190') return 5;
  return 0;
}

export function calculatePoints(input: PointsInput): PointsBreakdown {
  const age = calcAge(input.age);
  const english = calcEnglish(input.englishLevel);
  const australianWork = calcAustralianWork(input.australianWorkYears);
  const overseasWork = calcOverseasWork(input.overseasWorkYears);

  let partner = 0;
  if (input.hasPartnerSkills) partner = 10;
  else if (input.hasPartnerSuperiorEnglish) partner = 5;

  const stateNomination = calcStateNomination(input.visaSubclass, input.hasStateNomination);
  const professionalYear = input.hasProfessionalYear ? 5 : 0;
  const naati = input.hasNaati ? 5 : 0;
  const communityLanguage = input.hasCommunityLanguage ? 5 : 0;
  const australianStudy = input.hasAustralianStudy ? 5 : 0;

  const total =
    age +
    english +
    australianWork +
    overseasWork +
    partner +
    stateNomination +
    professionalYear +
    naati +
    communityLanguage +
    australianStudy;

  return {
    age,
    english,
    australianWork,
    overseasWork,
    partner,
    stateNomination,
    professionalYear,
    naati,
    communityLanguage,
    australianStudy,
    total,
    likelyEligible: total >= 65,
  };
}
