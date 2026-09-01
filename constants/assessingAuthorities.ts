/**
 * Assessing Authority data for skilled occupations.
 * Source: Department of Home Affairs - Skilled Occupation Lists
 * Last verified: 2026-08
 */

export interface AssessingAuthority {
  code: string;
  name: string;
  fullName: string;
  website: string;
  processingTime: string;
  fee: string;
  occupationPrefixes: string[];
  requiredDocuments: string[];
}

export const ASSESSING_AUTHORITIES: Record<string, AssessingAuthority> = {
  EA: {
    code: 'EA',
    name: 'Engineers Australia',
    fullName: 'Engineers Australia',
    website: 'https://www.engineersaustralia.org.au/migrants/migration-skills-assessment',
    processingTime: '8-16 weeks (fast-track: 20 business days)',
    fee: 'AUD $347–$1,815 incl GST (varies by pathway)',
    occupationPrefixes: ['2331', '2332', '2333', '2334', '2335', '2336', '2339', '3122', '3123', '3132'],
    requiredDocuments: [
      'Certified passport copy',
      'Academic transcripts',
      'Degree certificates',
      'Competency Demonstration Report (CDR) for non-accredited degrees',
      'English language test results',
      'CV/Resume',
      'Employment references',
    ],
  },
  ACS: {
    code: 'ACS',
    name: 'ACS',
    fullName: 'Australian Computer Society',
    website: 'https://www.acs.org.au/msa.html',
    processingTime: '6-12 weeks',
    fee: 'AUD $625–$1,498 excl GST (varies by pathway)',
    occupationPrefixes: ['2611', '2612', '2613', '2621', '2631', '2632', '2633'],
    requiredDocuments: [
      'Certified passport copy',
      'Academic transcripts',
      'Degree certificates',
      'Detailed employment references (duties, dates, hours)',
      'Statutory declarations for self-employment',
      'Professional Year completion (if applicable)',
    ],
  },
  CPA: {
    code: 'CPA',
    name: 'CPA Australia',
    fullName: 'CPA Australia',
    website: 'https://www.cpaaustralia.com.au/become-a-cpa/migration-assessment',
    processingTime: '6-8 weeks',
    fee: 'AUD $540',
    occupationPrefixes: ['2211', '2212'],
    requiredDocuments: [
      'Certified passport copy',
      'Academic transcripts',
      'Degree certificates',
      'Syllabus for core accounting subjects',
      'Employment references',
    ],
  },
  TRA: {
    code: 'TRA',
    name: 'TRA',
    fullName: 'Trades Recognition Australia',
    website: 'https://www.tradesrecognitionaustralia.gov.au/',
    processingTime: '12-16 weeks',
    fee: 'AUD $300-$500 + Technical Interview',
    occupationPrefixes: ['3', '4'],
    requiredDocuments: [
      'Certified passport copy',
      'Trade qualification certificates',
      'Employment references with detailed duties',
      'Photos of work (for some trades)',
      'Licensing/registration (if applicable)',
      'Technical interview may be required',
    ],
  },
  AITSL: {
    code: 'AITSL',
    name: 'AITSL',
    fullName: 'Australian Institute for Teaching and School Leadership',
    website: 'https://www.aitsl.edu.au/migrate-to-australia',
    processingTime: '8-12 weeks',
    fee: 'AUD $550',
    occupationPrefixes: ['2411', '2412', '2413', '2414', '2415'],
    requiredDocuments: [
      'Certified passport copy',
      'Teaching qualification certificates',
      'Academic transcripts',
      'Evidence of at least 1 year supervised teaching',
      'English language test results (higher requirements)',
      'Character references',
    ],
  },
  ANMAC: {
    code: 'ANMAC',
    name: 'ANMAC',
    fullName: 'Australian Nursing and Midwifery Accreditation Council',
    website: 'https://www.anmac.org.au/skills-assessment',
    processingTime: '8-12 weeks',
    fee: 'AUD $480',
    occupationPrefixes: ['2541', '2542', '2544', '4114', '4115'],
    requiredDocuments: [
      'Certified passport copy',
      'Nursing qualification certificates',
      'Academic transcripts (with clinical hours)',
      'Registration/license from home country',
      'Employment references',
      'English language test results (OET preferred)',
    ],
  },
  VETASSESS: {
    code: 'VETASSESS',
    name: 'VETASSESS',
    fullName: 'Vocational Education and Training Assessment Services',
    website: 'https://www.vetassess.com.au/',
    processingTime: '10-16 weeks',
    fee: 'AUD $630-$1,200',
    occupationPrefixes: [],
    requiredDocuments: [
      'Certified passport copy',
      'Academic qualifications (certified)',
      'Academic transcripts',
      'Employment references with detailed duties',
      'Organizational charts',
      'Payslips/tax records',
      'CV/Resume',
    ],
  },
};

export function getAssessingAuthority(anzsco: string): AssessingAuthority | null {
  for (const [, authority] of Object.entries(ASSESSING_AUTHORITIES)) {
    if (authority.occupationPrefixes.length > 0) {
      for (const prefix of authority.occupationPrefixes) {
        if (anzsco.startsWith(prefix)) {
          return authority;
        }
      }
    }
  }
  if (anzsco.startsWith('2')) return ASSESSING_AUTHORITIES.VETASSESS;
  if (anzsco.startsWith('3') || anzsco.startsWith('4')) return ASSESSING_AUTHORITIES.TRA;
  return ASSESSING_AUTHORITIES.VETASSESS;
}
