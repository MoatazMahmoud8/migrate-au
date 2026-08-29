/**
 * Visa Journey data - Complete pathway from English test to Citizenship
 * Source: Department of Home Affairs - verified 2026-08
 */

export interface EnglishTest {
  name: string;
  code: string;
  website: string;
  competent: { overall: number; each: number };
  proficient: { overall: number; each: number };
  superior: { overall: number; each: number };
  validity: string;
  fee: string;
}

export const ENGLISH_TESTS: EnglishTest[] = [
  {
    name: 'IELTS Academic',
    code: 'IELTS',
    website: 'https://www.ielts.org/',
    competent: { overall: 6, each: 6 },
    proficient: { overall: 7, each: 7 },
    superior: { overall: 8, each: 8 },
    validity: '3 years',
    fee: 'AUD $395',
  },
  {
    name: 'PTE Academic',
    code: 'PTE',
    website: 'https://www.pearsonpte.com/',
    competent: { overall: 50, each: 50 },
    proficient: { overall: 65, each: 65 },
    superior: { overall: 79, each: 79 },
    validity: '3 years',
    fee: 'AUD $410',
  },
  {
    name: 'TOEFL iBT',
    code: 'TOEFL',
    website: 'https://www.ets.org/toefl',
    competent: { overall: 60, each: 12 },
    proficient: { overall: 79, each: 24 },
    superior: { overall: 94, each: 24 },
    validity: '3 years',
    fee: 'USD $245',
  },
  {
    name: 'Cambridge C1 Advanced (CAE)',
    code: 'CAE',
    website: 'https://www.cambridgeenglish.org/',
    competent: { overall: 169, each: 169 },
    proficient: { overall: 185, each: 185 },
    superior: { overall: 200, each: 200 },
    validity: 'Lifetime',
    fee: 'AUD $350',
  },
  {
    name: 'OET (Healthcare)',
    code: 'OET',
    website: 'https://www.oet.com/',
    competent: { overall: 350, each: 350 },
    proficient: { overall: 400, each: 400 },
    superior: { overall: 450, each: 450 },
    validity: '2 years',
    fee: 'AUD $587',
  },
];

export interface VisaJourneyStep {
  id: string;
  title: string;
  description: string;
  duration: string;
  cost?: string;
  documents?: string[];
  tips?: string[];
}

export interface VisaJourney {
  visaCode: string;
  visaName: string;
  type: 'Permanent' | 'Provisional' | 'Temporary';
  englishLevel: 'Competent' | 'Proficient' | 'Superior' | 'Varies';
  pointsTested: boolean;
  minPoints?: number;
  steps: VisaJourneyStep[];
}

export const VISA_JOURNEYS: VisaJourney[] = [
  {
    visaCode: '189',
    visaName: 'Skilled Independent',
    type: 'Permanent',
    englishLevel: 'Competent',
    pointsTested: true,
    minPoints: 65,
    steps: [
      {
        id: 'english',
        title: 'English Language Test',
        description: 'Take an approved English test (IELTS, PTE, TOEFL, CAE, or OET)',
        duration: '2-4 weeks',
        cost: 'AUD $350-$600',
        documents: ['Valid passport', 'Payment receipt'],
        tips: ['Book early as slots fill up', 'PTE often has fastest results (2-5 days)'],
      },
      {
        id: 'skills-assessment',
        title: 'Skills Assessment',
        description: 'Get your qualifications and experience assessed by the relevant authority',
        duration: '6-16 weeks',
        cost: 'AUD $500-$1,200',
        documents: [
          'Certified passport copy',
          'Academic transcripts',
          'Degree certificates',
          'Employment references with duties',
          'CV/Resume',
        ],
        tips: ['Ensure employment references include detailed job duties', 'Get documents certified by authorized signatories'],
      },
      {
        id: 'points-calculation',
        title: 'Points Calculation',
        description: 'Calculate your points score (minimum 65 required)',
        duration: 'Immediate',
        tips: ['Age 25-32 gives maximum points', 'Superior English adds 20 points'],
      },
      {
        id: 'eoi',
        title: 'Submit EOI (SkillSelect)',
        description: 'Submit Expression of Interest through SkillSelect',
        duration: 'Valid for 2 years',
        cost: 'Free',
        documents: ['Skills assessment outcome', 'English test results'],
        tips: ['Update your EOI if your circumstances change', 'Higher points = faster invitation'],
      },
      {
        id: 'invitation',
        title: 'Receive Invitation',
        description: 'Wait for an invitation to apply (based on points ranking)',
        duration: '1-24 months (varies)',
        tips: ['Check invitation rounds announcements', 'Current cutoff is typically 70-90 points'],
      },
      {
        id: 'visa-application',
        title: 'Lodge Visa Application',
        description: 'Submit your visa application within 60 days of invitation',
        duration: '60 days to apply',
        cost: 'AUD $4,640 (main) + $2,320 (adult dependent)',
        documents: [
          'Identity documents',
          'Skills assessment',
          'English test results',
          'Employment evidence',
          'Police clearances',
          'Health examination',
          'Form 80 & Form 1221',
        ],
      },
      {
        id: 'processing',
        title: 'Visa Processing',
        description: 'Department processes your application',
        duration: '6-12 months',
        tips: ['Respond promptly to requests for information', 'Keep documents updated'],
      },
      {
        id: 'grant',
        title: 'Visa Grant',
        description: 'Receive your permanent resident visa',
        duration: 'Immediate (electronic)',
        tips: ['Make your first entry before the initial entry date', 'Start your 4-year citizenship clock'],
      },
      {
        id: 'citizenship',
        title: 'Citizenship Eligibility',
        description: 'After 4 years residence, apply for Australian citizenship',
        duration: '4 years from PR grant',
        cost: 'AUD $490',
        documents: ['Residence evidence', 'Identity documents', 'Citizenship test'],
        tips: ['Must be physically present for at least 1460 days in 4 years', 'Must pass citizenship test'],
      },
    ],
  },
  {
    visaCode: '190',
    visaName: 'Skilled Nominated',
    type: 'Permanent',
    englishLevel: 'Competent',
    pointsTested: true,
    minPoints: 65,
    steps: [
      {
        id: 'english',
        title: 'English Language Test',
        description: 'Take an approved English test',
        duration: '2-4 weeks',
        cost: 'AUD $350-$600',
      },
      {
        id: 'skills-assessment',
        title: 'Skills Assessment',
        description: 'Get your qualifications assessed',
        duration: '6-16 weeks',
        cost: 'AUD $500-$1,200',
      },
      {
        id: 'state-nomination',
        title: 'State Nomination',
        description: 'Apply for state/territory nomination (adds 5 points)',
        duration: '4-12 weeks',
        cost: 'AUD $0-$400 (varies by state)',
        documents: ['EOI submission', 'Commitment to live in nominating state'],
        tips: ['Each state has different occupation lists', 'Check state-specific requirements'],
      },
      {
        id: 'eoi',
        title: 'Submit EOI (SkillSelect)',
        description: 'Submit Expression of Interest',
        duration: 'Valid for 2 years',
        cost: 'Free',
      },
      {
        id: 'invitation',
        title: 'Receive Invitation',
        description: 'Receive invitation after state approves nomination',
        duration: '2-8 weeks after nomination',
      },
      {
        id: 'visa-application',
        title: 'Lodge Visa Application',
        description: 'Submit visa application within 60 days',
        duration: '60 days to apply',
        cost: 'AUD $4,640 (main)',
      },
      {
        id: 'processing',
        title: 'Visa Processing',
        description: 'Department processes application',
        duration: '5-10 months',
      },
      {
        id: 'grant',
        title: 'Visa Grant',
        description: 'Receive permanent resident visa',
        duration: 'Immediate',
      },
      {
        id: 'citizenship',
        title: 'Citizenship Eligibility',
        description: 'Apply for citizenship after 4 years',
        duration: '4 years from PR',
        cost: 'AUD $490',
      },
    ],
  },
  {
    visaCode: '491',
    visaName: 'Skilled Work Regional (Provisional)',
    type: 'Provisional',
    englishLevel: 'Competent',
    pointsTested: true,
    minPoints: 65,
    steps: [
      {
        id: 'english',
        title: 'English Language Test',
        description: 'Take an approved English test',
        duration: '2-4 weeks',
        cost: 'AUD $350-$600',
      },
      {
        id: 'skills-assessment',
        title: 'Skills Assessment',
        description: 'Get your qualifications assessed',
        duration: '6-16 weeks',
        cost: 'AUD $500-$1,200',
      },
      {
        id: 'state-nomination',
        title: 'State/Family Nomination',
        description: 'Get nominated by state or sponsored by eligible relative (adds 15 points)',
        duration: '4-12 weeks',
        cost: 'AUD $0-$400',
        tips: ['Regional areas offer more occupation options', 'Family sponsorship requires eligible relative in regional area'],
      },
      {
        id: 'eoi',
        title: 'Submit EOI (SkillSelect)',
        description: 'Submit Expression of Interest',
        duration: 'Valid for 2 years',
        cost: 'Free',
      },
      {
        id: 'invitation',
        title: 'Receive Invitation',
        description: 'Receive invitation to apply',
        duration: '2-12 weeks',
      },
      {
        id: 'visa-application',
        title: 'Lodge Visa Application',
        description: 'Submit visa application',
        duration: '60 days to apply',
        cost: 'AUD $4,640 (main)',
      },
      {
        id: 'grant',
        title: 'Visa Grant (5 years)',
        description: 'Receive provisional visa valid for 5 years',
        duration: '5-12 months processing',
      },
      {
        id: 'regional-work',
        title: 'Live & Work in Regional Area',
        description: 'Must live and work in regional Australia for 3 years',
        duration: '3 years minimum',
        tips: ['Keep evidence of regional residence', 'Tax returns showing regional income'],
      },
      {
        id: 'pr-191',
        title: 'Apply for Subclass 191 (PR)',
        description: 'Apply for permanent residence after 3 years',
        duration: '3-6 months processing',
        cost: 'AUD $445',
        documents: ['3 years regional residence evidence', 'Tax assessments', 'Employment evidence'],
      },
      {
        id: 'citizenship',
        title: 'Citizenship Eligibility',
        description: 'Apply for citizenship after 4 years total PR',
        duration: '4 years from 191 grant',
        cost: 'AUD $490',
      },
    ],
  },
];

export function getVisaJourney(visaCode: string): VisaJourney | undefined {
  return VISA_JOURNEYS.find(v => v.visaCode === visaCode);
}

export function getEnglishRequirements(level: 'Competent' | 'Proficient' | 'Superior'): Record<string, { overall: number; each: number }> {
  const result: Record<string, { overall: number; each: number }> = {};
  for (const test of ENGLISH_TESTS) {
    result[test.code] = test[level.toLowerCase() as keyof EnglishTest] as { overall: number; each: number };
  }
  return result;
}
