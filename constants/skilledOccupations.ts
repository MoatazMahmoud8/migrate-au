/**
 * Federal Skilled Occupation Lists — bundled snapshot.
 *
 * Lists:
 *  - CSOL  : Core Skills Occupation List (effective Dec 2024) — SC 482 Core Skills
 *  - MLTSSL: Medium-Long Term Strategic Skills List — SC 189, 190, 491, 485
 *  - STSOL : Short-Term Skilled Occupation List — SC 482 Short-term (legacy)
 *  - ROL   : Regional Occupation List — SC 491, 494
 *
 * Each occupation lists which list(s) it appears on plus the visa subclasses
 * for which it is eligible. ANZSCO assessing authorities are included where
 * commonly used (VETASSESS / Engineers Australia / ACS / etc).
 *
 * Data source: Department of Home Affairs — Skilled Occupation List.
 * This is the bundled fallback; the live list is pulled by utils/skilledOccupations.ts
 * from the remote scraper snapshot.
 */
export type SkillList = 'CSOL' | 'MLTSSL' | 'STSOL' | 'ROL';

/** Australian state / territory codes used for state-nominated visa lists. */
export type StateCode = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

export const STATE_CODES: StateCode[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

export interface SkilledOccupation {
  /** ANZSCO 6-digit code. */
  anzsco: string;
  /** Occupation title as published by DHA. */
  name: string;
  /** Federal lists the occupation appears on. */
  lists: SkillList[];
  /** Federal visa subclasses for which this occupation is eligible. */
  visas: string[];
  /** Skills assessing authority (free text, e.g. "VETASSESS", "Engineers Australia"). */
  assessingAuthority?: string;
  /** ANZSCO major group label (Manager / Professional / Trade / Tech / Clerical / Sales / Operator / Labourer). */
  group: string;
  /**
   * State / territory eligibility for state-nominated visas (190, 491).
   * Map of state code → eligible subclasses. Omit a state to indicate the
   * occupation isn't currently on that state's list. The scraper keeps this
   * authoritative; the seed below reflects commonly-known coverage.
   */
  states?: Partial<Record<StateCode, string[]>>;
  /**
   * State / territory-specific nomination requirements for this occupation.
   * Nested structure: [state][visa_type] = StateRequirement
   * Fetched daily from the state requirements endpoint and merged at runtime.
   */
  stateRequirements?: Partial<Record<StateCode, Record<string, StateRequirement>>>;

  // ── Enrichment fields from merged database ─────────────────────────────
  /** Official ABS ANZSCO occupation description. */
  description?: string;
  /** Unit group label (e.g. "2611 ICT Business and Systems Analysts"). */
  unitGroup?: string;
  /** ABS skill level descriptor. */
  skillLevel?: string;
  /** URL to the ABS source page. */
  descriptionSource?: string;
  /** ANZSCO tasks (responsibilities) — array of task bullets from ABS. */
  tasks?: string[];
  /** Alias of tasks for convenience. */
  responsibilities?: string[];
  /** Resolved assessing authority details (fee, processing time, website). */
  authorityInfo?: {
    name: string;
    fee: string | null;
    processingTime: string | null;
    website: string | null;
    assesses: string | null;
  };
  /** SkillSelect invitation round cutoff scores. */
  skillSelectScores?: { sc189: number | null; sc491Family: number | null };
  /** Per-visa application fees. */
  visaFeeDetails?: Record<string, { fee: string; note?: string | null }>;
  /** Official median salary from Jobs and Skills Australia. */
  salary?: {
    annualSalary: number;
    weeklyEarnings: number | null;
    currency: string;
    sourceLevel: '6-digit' | '4-digit' | null;
    sourceUrl: string | null;
  };
  /** Per-visa merged details (fees + processing times + name). */
  visaDetailsMerged?: Record<string, unknown>;
}

/**
 * Special requirements a state / territory may impose for nominating a
 * particular occupation — over and above the federal visa requirements.
 * Populated by the daily state-requirements scraper.
 * Structure: [state][visa_type] = StateRequirement (e.g., [NSW][190])
 */
export interface StateRequirement {
  /** Visa subclass code (e.g., "190", "491", "482"). */
  visa: string;
  /** Visa name (e.g., "SC 190 Skilled Independent"). */
  type: string;
  /** Visa stream description (e.g., "Points-based + State nomination"). */
  stream: string;
  /** Eligible visa subclasses under this state's program. */
  visas: string[];
  /** Whether the nomination round is currently open. */
  open: boolean;
  /** Minimum annual salary (AUD) required by this state for this occupation. */
  minSalary?: number;
  /** Minimum years of relevant work experience. */
  minExperienceYears?: number;
  /** Whether a formal skills assessment must be lodged before nomination. */
  skillsAssessmentRequired?: boolean;
  /** Whether a job offer in the state is required. */
  jobOfferRequired?: boolean;
  /** Whether the applicant must live / work in the state at time of application. */
  residencyRequired?: boolean;
  /** Points threshold (EOI score) set by the state for this occupation, if any. */
  minPoints?: number;
  /** Age limit (max age) set by the state for this occupation, if any. */
  maxAge?: number;
  /** Free-text notes — one bullet point per entry. */
  notes: string[];
  /** Canonical URL for this state's nomination page for this occupation. */
  sourceUrl: string;
  /** ISO date this record was last updated by the scraper. */
  updatedAt: string;
}

export const SKILL_OCCUPATIONS_SNAPSHOT_DATE = '2026-10-21';

export const SKILL_LISTS: SkillList[] = ['CSOL', 'MLTSSL', 'STSOL', 'ROL'];

export const ANZSCO_GROUPS = [
  'Managers',
  'Professionals',
  'Technicians & Trades',
  'Community & Personal Service',
  'Clerical & Administrative',
  'Sales',
  'Machinery Operators & Drivers',
  'Labourers',
];

/**
 * Curated seed of the most-applied federal occupations. The remote scraper
 * will replace this with the full ~700-entry list at runtime.
 */
export const SKILLED_OCCUPATIONS: SkilledOccupation[] = [
  // ── Managers ──────────────────────────────────────────────────────────────
  { anzsco: '111111', name: 'Chief Executive or Managing Director', lists: ['CSOL', 'MLTSSL'], visas: ['186', '407', '482', '494'], assessingAuthority: 'IML', group: 'Managers' },
  { anzsco: '111211', name: 'Corporate General Manager', lists: ['CSOL', 'MLTSSL'], visas: ['186', '407', '482', '494'], assessingAuthority: 'IML', group: 'Managers' },
  { anzsco: '111212', name: 'Defence Force Senior Officer', lists: ['ROL'], visas: [], group: 'Managers' },
  { anzsco: '111311', name: 'Local Government Legislator', lists: ['ROL'], visas: [], group: 'Managers' },
  { anzsco: '111312', name: 'Member of Parliament', lists: ['ROL'], visas: [], group: 'Managers' },
  { anzsco: '111399', name: 'Legislators nec', lists: ['ROL'], visas: [], group: 'Managers' },
  { anzsco: '121111', name: 'Aquaculture Farmer', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '121311', name: 'Apiarist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '121312', name: 'Beef Cattle Farmer', lists: ['ROL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '121313', name: 'Dairy Cattle Farmer', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '121314', name: 'Deer Farmer', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '121315', name: 'Goat Farmer', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '121316', name: 'Horse Breeder', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '121318', name: 'Pig Farmer', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '121321', name: 'Poultry Farmer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '121322', name: 'Sheep Farmer', lists: ['CSOL', 'ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '121399', name: 'Livestock Farmers nec', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '131112', name: 'Sales and Marketing Manager', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'IML', group: 'Managers' },
  { anzsco: '131113', name: 'Advertising Manager', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'IML', group: 'Managers' },
  { anzsco: '131114', name: 'Public Relations Manager', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'IML', group: 'Managers' },
  { anzsco: '132111', name: 'Corporate Services Manager', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '132211', name: 'Finance Manager', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'CAANZ', group: 'Managers' },
  { anzsco: '132311', name: 'Human Resource Manager', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'IML', group: 'Managers' },
  { anzsco: '132411', name: 'Policy and Planning Manager', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '132511', name: 'Research and Development Manager', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '133111', name: 'Construction Project Manager', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '133112', name: 'Project Builder', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '133211', name: 'Engineering Manager', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Managers' },
  { anzsco: '133311', name: 'Importer or Exporter', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '133312', name: 'Wholesaler', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '133411', name: 'Manufacturer', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '133511', name: 'Production Manager (Forestry)', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '133512', name: 'Production Manager (Manufacturing)', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '133513', name: 'Production Manager (Mining)', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '133611', name: 'Supply and Distribution Manager', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'IML', group: 'Managers' },
  { anzsco: '133612', name: 'Procurement Manager', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'IML', group: 'Managers' },
  { anzsco: '134111', name: 'Child Care Centre Manager', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'ACECQA', group: 'Managers' },
  { anzsco: '134211', name: 'Medical Administrator', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '134212', name: 'Nursing Clinical Director', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Managers' },
  { anzsco: '134213', name: 'Primary Health Organisation Manager', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '134214', name: 'Welfare Centre Manager', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'Community Work Australia', group: 'Managers' },
  { anzsco: '134299', name: 'Health and Welfare Services Managers nec', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '134311', name: 'School Principal', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '134411', name: 'Faculty Head', lists: ['CSOL', 'MLTSSL'], visas: ['186', '407', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '134412', name: 'Regional Education Manager', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '134499', name: 'Education Managers nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '135111', name: 'Chief Information Officer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ACS', group: 'Managers' },
  { anzsco: '135112', name: 'ICT Project Manager', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ACS', group: 'Managers' },
  { anzsco: '135199', name: 'ICT Managers nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ACS', group: 'Managers' },
  { anzsco: '139111', name: 'Commissioned Defence Force Officer', lists: ['ROL'], visas: [], group: 'Managers' },
  { anzsco: '139112', name: 'Commissioned Fire Officer', lists: ['ROL'], visas: [], group: 'Managers' },
  { anzsco: '139113', name: 'Commissioned Police Officer', lists: ['ROL'], visas: [], group: 'Managers' },
  { anzsco: '139211', name: 'Senior Non-commissioned Defence Force Member', lists: ['ROL'], visas: [], group: 'Managers' },
  { anzsco: '139911', name: 'Arts Administrator or Manager', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '139912', name: 'Environmental Manager', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '139913', name: 'Laboratory Manager', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '139915', name: 'Sports Administrator', lists: ['ROL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '139916', name: 'Quality Assurance Manager', lists: [], visas: ['190', '491'], group: 'Managers' },
  { anzsco: '139917', name: 'Regulatory Affairs Manager', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '139999', name: 'Specialist Managers nec', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '141111', name: 'Cafe or Restaurant Manager', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '141211', name: 'Caravan Park and Camping Ground Manager', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '141311', name: 'Hotel or Motel Manager', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '141411', name: 'Licensed Club Manager', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '141911', name: 'Bed and Breakfast Operator', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '141912', name: 'Retirement Village Manager', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '141999', name: 'Accommodation and Hospitality Managers nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '142111', name: 'Retail Manager (General)', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '142112', name: 'Antique Dealer', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '142113', name: 'Betting Agency Manager', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '142114', name: 'Hair or Beauty Salon Manager', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '142115', name: 'Post Office Manager', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '142116', name: 'Travel Agency Manager', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149111', name: 'Amusement Centre Manager', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149112', name: 'Fitness Centre Manager', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149113', name: 'Sports Centre Manager', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149211', name: 'Call or Contact Centre Manager', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149212', name: 'Customer Service Manager', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149311', name: 'Conference and Event Organiser', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149411', name: 'Fleet Manager', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149412', name: 'Railway Station Manager', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149413', name: 'Transport Company Manager', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149911', name: 'Boarding Kennel or Cattery Operator', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149912', name: 'Cinema or Theatre Manager', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149913', name: 'Facilities Manager', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149914', name: 'Financial Institution Branch Manager', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149915', name: 'Equipment Hire Manager', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '149999', name: 'Hospitality, Retail and Service Managers nec', lists: ['CSOL', 'ROL'], visas: ['160', '186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  // ── Professionals ─────────────────────────────────────────────────────────
  { anzsco: '211111', name: 'Actor', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '211112', name: 'Dancer or Choreographer', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '211113', name: 'Entertainer or Variety Artist', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '211199', name: 'Actors, Dancers and Other Entertainers nec', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '211211', name: 'Composer', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '211212', name: 'Music Director', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '211213', name: 'Musician (Instrumental)', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '211214', name: 'Singer', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '211299', name: 'Music Professionals nec', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '211311', name: 'Photographer', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '211411', name: 'Painter (Visual Arts)', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '211412', name: 'Potter or Ceramic Artist', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '211413', name: 'Sculptor', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '211499', name: 'Visual Arts and Crafts Professionals nec', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212111', name: 'Artistic Director', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212112', name: 'Media Producer (excluding Video)', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212113', name: 'Radio Presenter', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212114', name: 'Television Presenter', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212211', name: 'Author', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212212', name: 'Book or Script Editor', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212311', name: 'Art Director (Film, Television or Stage)', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212312', name: 'Director (Film, Television, Radio or Stage)', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212313', name: 'Director of Photography', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212314', name: 'Film and Video Editor', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212315', name: 'Program Director (Television or Radio)', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212316', name: 'Stage Manager', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212317', name: 'Technical Director', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212318', name: 'Video Producer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212399', name: 'Film, Television, Radio and Stage Directors nec', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212411', name: 'Copywriter', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212412', name: 'Newspaper or Periodical Editor', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212413', name: 'Print Journalist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212414', name: 'Radio Journalist', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212415', name: 'Technical Writer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212416', name: 'Television Journalist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '212499', name: 'Journalists and Other Writers nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '221111', name: 'Accountant (General)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'CAANZ', group: 'Professionals' },
  { anzsco: '221112', name: 'Management Accountant', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'CAANZ', group: 'Professionals' },
  { anzsco: '221113', name: 'Taxation Accountant', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'CAANZ', group: 'Professionals' },
  { anzsco: '221211', name: 'Company Secretary', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '221212', name: 'Corporate Treasurer', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'CPAA', group: 'Professionals' },
  { anzsco: '221213', name: 'External Auditor', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'CAANZ', group: 'Professionals' },
  { anzsco: '221214', name: 'Internal Auditor', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '222111', name: 'Commodities Trader', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '222112', name: 'Finance Broker', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '222113', name: 'Insurance Broker', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '222199', name: 'Financial Brokers nec', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '222211', name: 'Financial Market Dealer', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '222212', name: 'Futures Trader', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '222213', name: 'Stockbroking Dealer', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '222299', name: 'Financial Dealers nec', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '222311', name: 'Financial Investment Adviser', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '222312', name: 'Financial Investment Manager', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '223111', name: 'Human Resource Adviser', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '223112', name: 'Recruitment Consultant', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '223113', name: 'Workplace Relations Adviser', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '223311', name: 'Training and Development Professional', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224111', name: 'Actuary', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224112', name: 'Mathematician', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224114', name: 'Data Analyst', lists: ['CSOL'], visas: ['186', '482'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '224115', name: 'Data Scientist', lists: ['CSOL'], visas: ['186', '482'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '224211', name: 'Archivist', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224212', name: 'Gallery or Museum Curator', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224213', name: 'Health Information Manager', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224214', name: 'Records Manager', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224311', name: 'Economist', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224411', name: 'Intelligence Officer', lists: ['ROL'], visas: [], group: 'Professionals' },
  { anzsco: '224412', name: 'Policy Analyst', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224511', name: 'Land Economist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224512', name: 'Valuer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224611', name: 'Librarian', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224712', name: 'Organisation and Methods Analyst', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224714', name: 'Supply Chain Analyst', lists: ['CSOL'], visas: ['186', '482'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224911', name: 'Electorate Officer', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224912', name: 'Liaison Officer', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224913', name: 'Migration Agent (Aus) \\ Immigration Consultant (NZ)', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224914', name: 'Patents Examiner', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224999', name: 'Information and Organisation Professionals nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '225111', name: 'Advertising Specialist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '225112', name: 'Market Research Analyst', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '225113', name: 'Marketing Specialist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '225114', name: 'Content Creator (Marketing)', lists: ['CSOL'], visas: ['186', '482'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '225211', name: 'ICT Account Manager', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '225212', name: 'ICT Business Development Manager', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '225213', name: 'ICT Sales Representative', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '225311', name: 'Public Relations Professional', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '225411', name: 'Sales Representative (Industrial Products)', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '225412', name: 'Sales Representative (Medical and Pharmaceutical Products)', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '225499', name: 'Technical Sales Representatives nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '231111', name: 'Aeroplane Pilot', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'CASA', group: 'Professionals' },
  { anzsco: '231112', name: 'Air Traffic Controller', lists: ['ROL'], visas: [], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '231113', name: 'Flying Instructor', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '231114', name: 'Helicopter Pilot', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'CASA', group: 'Professionals' },
  { anzsco: '231199', name: 'Air Transport Professionals nec', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '231211', name: 'Master Fisher', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '231212', name: 'Ship\'s Engineer', lists: ['CSOL', 'ROL'], visas: ['186', '190', '482', '491', '494'], assessingAuthority: 'AMSA', group: 'Professionals' },
  { anzsco: '231213', name: 'Ship\'s Master', lists: ['ROL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'AMSA', group: 'Professionals' },
  { anzsco: '231214', name: 'Ship\'s Officer', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'AMSA', group: 'Professionals' },
  { anzsco: '231215', name: 'Marine Surveyor', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'AMSA', group: 'Professionals' },
  { anzsco: '231299', name: 'Marine Transport Professionals nec', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '232111', name: 'Architect', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'AACA', group: 'Professionals' },
  { anzsco: '232112', name: 'Landscape Architect', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '232212', name: 'Surveyor', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ISNSW', group: 'Professionals' },
  { anzsco: '232213', name: 'Cartographer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '232214', name: 'Other Spatial Scientist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '232311', name: 'Fashion Designer', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '232312', name: 'Industrial Designer', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '232313', name: 'Jewellery Designer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '232411', name: 'Graphic Designer', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '232412', name: 'Illustrator', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '232413', name: 'Multimedia Designer', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '232414', name: 'Web Designer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '232511', name: 'Interior Designer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '232611', name: 'Urban and Regional Planner', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '233111', name: 'Chemical Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233112', name: 'Materials Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233211', name: 'Civil Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233212', name: 'Geotechnical Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233213', name: 'Quantity Surveyor', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'AIQS', group: 'Professionals' },
  { anzsco: '233214', name: 'Structural Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233215', name: 'Transport Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233311', name: 'Electrical Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233411', name: 'Electronics Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233511', name: 'Industrial Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233512', name: 'Mechanical Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233513', name: 'Production or Plant Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233611', name: 'Mining Engineer (excluding Petroleum)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233612', name: 'Petroleum Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233911', name: 'Aeronautical Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233912', name: 'Agricultural Engineer', lists: ['CSOL', 'MLTSSL', 'ROL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233913', name: 'Biomedical Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233914', name: 'Engineering Technologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233915', name: 'Environmental Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233916', name: 'Naval Architect', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233999', name: 'Engineering Professionals nec', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '234111', name: 'Agricultural Consultant', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234113', name: 'Forester', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234114', name: 'Agricultural Research Scientist', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234115', name: 'Agronomist', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234116', name: 'Aquaculture or Fisheries Scientist', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234211', name: 'Chemist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234212', name: 'Food Technologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234213', name: 'Wine Maker', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234311', name: 'Conservation Officer', lists: ['ROL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234312', name: 'Environmental Consultant', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234313', name: 'Environmental Research Scientist', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234314', name: 'Park Ranger', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234399', name: 'Environmental Scientists nec', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234411', name: 'Geologist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234412', name: 'Geophysicist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234413', name: 'Hydrogeologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234511', name: 'Life Scientist (General)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234513', name: 'Biochemist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234514', name: 'Biotechnologist', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234515', name: 'Botanist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234516', name: 'Marine Biologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234517', name: 'Microbiologist', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234521', name: 'Entomologist', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234522', name: 'Zoologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234599', name: 'Life Scientists nec', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234611', name: 'Medical Laboratory Scientist', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'AIMS', group: 'Professionals' },
  { anzsco: '234612', name: 'Respiratory Scientist', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234711', name: 'Veterinarian', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'AVBC', group: 'Professionals' },
  { anzsco: '234911', name: 'Conservator', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234912', name: 'Metallurgist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234913', name: 'Meteorologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234914', name: 'Physicist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234915', name: 'Exercise Physiologist', lists: ['ROL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234999', name: 'Natural and Physical Science Professionals nec', lists: ['MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '241111', name: 'Early Childhood (Pre-primary School) Teacher', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ACECQA', group: 'Professionals' },
  { anzsco: '241112', name: 'Kaiako Kohanga Reo (Maori Language Nest Teacher)', lists: ['ROL'], visas: ['190', '491'], assessingAuthority: 'AITSL', group: 'Professionals' },
  { anzsco: '241211', name: 'Kaiako Kura Kaupapa Maori (Maori-medium Primary School Teacher)', lists: ['ROL'], visas: ['190', '491'], assessingAuthority: 'AITSL', group: 'Professionals' },
  { anzsco: '241212', name: 'Pouako Kura Kaupapa Maori (Maori-medium Primary School Senior Teacher)', lists: ['ROL'], visas: ['190', '491'], assessingAuthority: 'AITSL', group: 'Professionals' },
  { anzsco: '241213', name: 'Primary School Teacher', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'AITSL', group: 'Professionals' },
  { anzsco: '241311', name: 'Middle School Teacher', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'AITSL', group: 'Professionals' },
  { anzsco: '241411', name: 'Secondary School Teacher', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'AITSL', group: 'Professionals' },
  { anzsco: '241511', name: 'Special Needs Teacher', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'AITSL', group: 'Professionals' },
  { anzsco: '241512', name: 'Teacher of the Hearing Impaired', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'AITSL', group: 'Professionals' },
  { anzsco: '241513', name: 'Teacher of the Sight Impaired', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'AITSL', group: 'Professionals' },
  { anzsco: '241599', name: 'Special Education Teachers nec', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'AITSL', group: 'Professionals' },
  { anzsco: '242111', name: 'University Lecturer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '242112', name: 'University Tutor', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '242211', name: 'Vocational Education Teacher', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS (non-trades)', group: 'Professionals' },
  { anzsco: '249111', name: 'Education Adviser', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '249112', name: 'Education Reviewer', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '249211', name: 'Art Teacher (Private Tuition)', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '249212', name: 'Dance Teacher (Private Tuition)', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '249213', name: 'Drama Teacher (Private Tuition)', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '249214', name: 'Music Teacher (Private Tuition)', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '249299', name: 'Private Tutors and Teachers nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '249311', name: 'Teacher of English to Speakers of Other Languages', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '251111', name: 'Dietitian', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'DAA', group: 'Professionals' },
  { anzsco: '251112', name: 'Nutritionist', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '251211', name: 'Medical Diagnostic Radiographer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ASMIRT', group: 'Professionals' },
  { anzsco: '251212', name: 'Medical Radiation Therapist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ASMIRT', group: 'Professionals' },
  { anzsco: '251213', name: 'Nuclear Medicine Technologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANZSNM', group: 'Professionals' },
  { anzsco: '251214', name: 'Sonographer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ASMIRT', group: 'Professionals' },
  { anzsco: '251311', name: 'Environmental Health Officer', lists: ['ROL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '251312', name: 'Occupational Health and Safety Adviser', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '251411', name: 'Optometrist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'OCANZ', group: 'Professionals' },
  { anzsco: '251412', name: 'Orthoptist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '251511', name: 'Hospital Pharmacist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'APharmC', group: 'Professionals' },
  { anzsco: '251512', name: 'Industrial Pharmacist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '251513', name: 'Retail Pharmacist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'APharmC', group: 'Professionals' },
  { anzsco: '251911', name: 'Health Promotion Officer', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '251912', name: 'Orthotist or Prosthetist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'AOPA', group: 'Professionals' },
  { anzsco: '251999', name: 'Health Diagnostic and Promotion Professionals nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '252111', name: 'Chiropractor', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'CCEA', group: 'Professionals' },
  { anzsco: '252112', name: 'Osteopath', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'AOAC', group: 'Professionals' },
  { anzsco: '252211', name: 'Acupuncturist', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'CMBA', group: 'Professionals' },
  { anzsco: '252212', name: 'Homoeopath', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '252213', name: 'Naturopath', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '252214', name: 'Traditional Chinese Medicine Practitioner', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'CMBA', group: 'Professionals' },
  { anzsco: '252215', name: 'Traditional Maori Health Practitioner', lists: ['ROL'], visas: ['190', '491'], group: 'Professionals' },
  { anzsco: '252299', name: 'Complementary Health Therapists nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '252311', name: 'Dental Specialist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ADC', group: 'Professionals' },
  { anzsco: '252312', name: 'Dentist', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ADC', group: 'Professionals' },
  { anzsco: '252411', name: 'Occupational Therapist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'OTC', group: 'Professionals' },
  { anzsco: '252511', name: 'Physiotherapist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'APC', group: 'Professionals' },
  { anzsco: '252611', name: 'Podiatrist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'PodBA', group: 'Professionals' },
  { anzsco: '252711', name: 'Audiologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '252712', name: 'Speech Pathologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'SPA', group: 'Professionals' },
  { anzsco: '253111', name: 'General Practitioner', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253112', name: 'Resident Medical Officer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253211', name: 'Anaesthetist', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253311', name: 'Specialist Physician (General Medicine)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253312', name: 'Cardiologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253313', name: 'Clinical Haematologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253314', name: 'Medical Oncologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253315', name: 'Endocrinologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253316', name: 'Gastroenterologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253317', name: 'Intensive Care Specialist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253318', name: 'Neurologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253321', name: 'Paediatrician', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253322', name: 'Renal Medicine Specialist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253323', name: 'Rheumatologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253324', name: 'Thoracic Medicine Specialist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253399', name: 'Specialist Physicians nec', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253411', name: 'Psychiatrist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253511', name: 'Surgeon (General)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253512', name: 'Cardiothoracic Surgeon', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253513', name: 'Neurosurgeon', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253514', name: 'Orthopaedic Surgeon', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253515', name: 'Otorhinolaryngologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253516', name: 'Paediatric Surgeon', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253517', name: 'Plastic and Reconstructive Surgeon', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253518', name: 'Urologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253521', name: 'Vascular Surgeon', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253911', name: 'Dermatologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253912', name: 'Emergency Medicine Specialist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253913', name: 'Obstetrician and Gynaecologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253914', name: 'Ophthalmologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253915', name: 'Pathologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253917', name: 'Diagnostic and Interventional Radiologist', lists: ['MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253918', name: 'Radiation Oncologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '253999', name: 'Medical Practitioners nec', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'MedBA', group: 'Professionals' },
  { anzsco: '254111', name: 'Midwife', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254211', name: 'Nurse Educator', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254212', name: 'Nurse Researcher', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254311', name: 'Nurse Manager', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254411', name: 'Nurse Practitioner', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254412', name: 'Registered Nurse (Aged Care)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254413', name: 'Registered Nurse (Child and Family Health)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254414', name: 'Registered Nurse (Community Health)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254415', name: 'Registered Nurse (Critical Care and Emergency)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254416', name: 'Registered Nurse (Developmental Disability)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254417', name: 'Registered Nurse (Disability and Rehabilitation)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254418', name: 'Registered Nurse (Medical)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254421', name: 'Registered Nurse (Medical Practice)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254422', name: 'Registered Nurse (Mental Health)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254423', name: 'Registered Nurse (Perioperative)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254424', name: 'Registered Nurse (Surgical)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254425', name: 'Registered Nurse (Paediatrics)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254499', name: 'Registered Nurses nec', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '261111', name: 'ICT Business Analyst', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261112', name: 'Systems Analyst', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261113', name: 'User Experience Designer (ICT)', lists: [], visas: ['190', '491'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261211', name: 'Multimedia Specialist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261212', name: 'Web Developer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261311', name: 'Analyst Programmer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261312', name: 'Developer Programmer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261313', name: 'Software Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261314', name: 'Software Tester', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261315', name: 'Cyber Security Engineer', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261316', name: 'Devops Engineer', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261317', name: 'Penetration Tester', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261399', name: 'Software and Applications Programmers nec', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '262111', name: 'Database Administrator', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '262113', name: 'Systems Administrator', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '262114', name: 'Cyber Governance Risk and Compliance Specialist', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '262115', name: 'Cyber Security Advice and Assessment Specialist', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '262116', name: 'Cyber Security Analyst', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '262117', name: 'Cyber Security Architect', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '262118', name: 'Cyber Security Operations Coordinator', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263111', name: 'Computer Network and Systems Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263112', name: 'Network Administrator', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263113', name: 'Network Analyst', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263211', name: 'ICT Quality Assurance Engineer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263212', name: 'ICT Support Engineer', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263213', name: 'ICT Systems Test Engineer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263299', name: 'ICT Support and Test Engineers nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263311', name: 'Telecommunications Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '263312', name: 'Telecommunications Network Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '271111', name: 'Barrister', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Legal admissions authority of a state or territory', group: 'Professionals' },
  { anzsco: '271211', name: 'Judge', lists: ['ROL'], visas: [], assessingAuthority: 'SLAA', group: 'Professionals' },
  { anzsco: '271212', name: 'Magistrate', lists: ['ROL'], visas: [], assessingAuthority: 'SLAA', group: 'Professionals' },
  { anzsco: '271213', name: 'Tribunal Member', lists: ['ROL'], visas: [], assessingAuthority: 'SLAA', group: 'Professionals' },
  { anzsco: '271214', name: 'Intellectual Property Lawyer', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '271299', name: 'Judicial and Other Legal Professionals nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '271311', name: 'Solicitor', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Legal admissions authority of a state or territory', group: 'Professionals' },
  { anzsco: '272111', name: 'Careers Counsellor', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '272112', name: 'Drug and Alcohol Counsellor', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '272113', name: 'Family and Marriage Counsellor', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '272114', name: 'Rehabilitation Counsellor', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '272115', name: 'Student Counsellor', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '272199', name: 'Counsellors nec', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '272211', name: 'Minister of Religion', lists: ['STSOL'], visas: ['407'], group: 'Professionals' },
  { anzsco: '272311', name: 'Clinical Psychologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'APS', group: 'Professionals' },
  { anzsco: '272312', name: 'Educational Psychologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'APS', group: 'Professionals' },
  { anzsco: '272313', name: 'Organisational Psychologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'APS', group: 'Professionals' },
  { anzsco: '272314', name: 'Psychotherapist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '272399', name: 'Psychologists nec', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'APS', group: 'Professionals' },
  { anzsco: '272411', name: 'Historian', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '272412', name: 'Interpreter', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'NAATI', group: 'Professionals' },
  { anzsco: '272413', name: 'Translator', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'NAATI', group: 'Professionals' },
  { anzsco: '272414', name: 'Archaeologist', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '272499', name: 'Social Professionals nec', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '272511', name: 'Social Worker', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'AASW', group: 'Professionals' },
  { anzsco: '272611', name: 'Community Arts Worker', lists: ['ROL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '272612', name: 'Recreation Officer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '272613', name: 'Welfare Worker', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'Community Work Australia', group: 'Professionals' },
  // ── Technicians & Trades ──────────────────────────────────────────────────
  { anzsco: '311112', name: 'Agricultural and Agritech Technician', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311113', name: 'Animal Husbandry Technician', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311114', name: 'Aquaculture or Fisheries Technician', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311115', name: 'Irrigation Designer', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311211', name: 'Anaesthetic Technician', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311212', name: 'Cardiac Technician', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311213', name: 'Medical Laboratory Technician', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'AIMS', group: 'Technicians & Trades' },
  { anzsco: '311214', name: 'Operating Theatre Technician', lists: ['ROL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311215', name: 'Pharmacy Technician', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311216', name: 'Pathology Collector', lists: ['ROL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'AIMS', group: 'Technicians & Trades' },
  { anzsco: '311217', name: 'Respiratory Technician', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311299', name: 'Medical Technicians nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311311', name: 'Fisheries Officer', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311312', name: 'Meat Inspector', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311313', name: 'Quarantine Officer', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311314', name: 'Primary Products Quality Assurance Officer', lists: ['CSOL'], visas: ['186', '482'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311399', name: 'Primary Products Assurance and Inspection Officers nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311411', name: 'Chemistry Technician', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311412', name: 'Earth Science Technician', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311413', name: 'Life Science Technician', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311414', name: 'School Laboratory Technician', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311415', name: 'Hydrographer', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '311499', name: 'Science Technicians nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '312111', name: 'Architectural Draftsperson', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '312112', name: 'Building Associate', lists: ['CSOL', 'ROL'], visas: ['186', '190', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '312113', name: 'Building Inspector', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '312114', name: 'Construction Estimator', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '312115', name: 'Plumbing Inspector', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '312116', name: 'Surveying or Spatial Science Technician', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '312199', name: 'Architectural, Building and Surveying Technicians nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '312211', name: 'Civil Engineering Draftsperson', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Technicians & Trades' },
  { anzsco: '312212', name: 'Civil Engineering Technician', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '312311', name: 'Electrical Engineering Draftsperson', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Technicians & Trades' },
  { anzsco: '312312', name: 'Electrical Engineering Technician', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '312411', name: 'Electronic Engineering Draftsperson', lists: ['ROL'], visas: ['494'], assessingAuthority: 'Engineers Australia', group: 'Technicians & Trades' },
  { anzsco: '312412', name: 'Electronic Engineering Technician', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '312511', name: 'Mechanical Engineering Draftsperson', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Technicians & Trades' },
  { anzsco: '312512', name: 'Mechanical Engineering Technician', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '312611', name: 'Safety Inspector', lists: ['ROL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '312911', name: 'Maintenance Planner', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '312912', name: 'Metallurgical or Materials Technician', lists: ['STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '312913', name: 'Mine Deputy', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '312914', name: 'Other Draftsperson', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '312999', name: 'Building and Engineering Technicians nec', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '313111', name: 'Hardware Technician', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '313112', name: 'ICT Customer Support Officer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '313113', name: 'Web Administrator', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ACS', group: 'Technicians & Trades' },
  { anzsco: '313199', name: 'ICT Support Technicians nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '313211', name: 'Radiocommunications Technician', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '313212', name: 'Telecommunications Field Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Technicians & Trades' },
  { anzsco: '313213', name: 'Telecommunications Network Planner', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Technicians & Trades' },
  { anzsco: '313214', name: 'Telecommunications Technical Officer or Technologist', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'Engineers Australia', group: 'Technicians & Trades' },
  { anzsco: '321111', name: 'Automotive Electrician', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '321211', name: 'Motor Mechanic (General)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '321212', name: 'Diesel Motor Mechanic', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '321213', name: 'Motorcycle Mechanic', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '321214', name: 'Small Engine Mechanic', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '322111', name: 'Blacksmith', lists: ['ROL'], visas: ['494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '322112', name: 'Electroplater', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '322113', name: 'Farrier', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '322114', name: 'Metal Casting Trades Worker', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '322115', name: 'Metal Polisher', lists: ['ROL'], visas: ['494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '322211', name: 'Sheetmetal Trades Worker', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '322311', name: 'Metal Fabricator', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '322312', name: 'Pressure Welder', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '322313', name: 'Welder (First Class)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323111', name: 'Aircraft Maintenance Engineer (Avionics)', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323112', name: 'Aircraft Maintenance Engineer (Mechanical)', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323113', name: 'Aircraft Maintenance Engineer (Structures)', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323211', name: 'Fitter (General)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323212', name: 'Fitter and Turner', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323213', name: 'Fitter-Welder', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323214', name: 'Metal Machinist (First Class)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323215', name: 'Textile, Clothing and Footwear Mechanic', lists: ['CSOL', 'ROL'], visas: ['186', '190', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323299', name: 'Metal Fitters and Machinists nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323311', name: 'Engraver', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323312', name: 'Gunsmith', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323313', name: 'Locksmith', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323314', name: 'Precision Instrument Maker and Repairer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323315', name: 'Saw Doctor', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323316', name: 'Watch and Clock Maker and Repairer', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323411', name: 'Engineering Patternmaker', lists: ['CSOL', 'ROL'], visas: ['186', '190', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323412', name: 'Toolmaker', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '324111', name: 'Panelbeater', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '324211', name: 'Vehicle Body Builder', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '324212', name: 'Vehicle Trimmer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '324311', name: 'Vehicle Painter', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '331111', name: 'Bricklayer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '331112', name: 'Stonemason', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '331211', name: 'Carpenter and Joiner', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '331212', name: 'Carpenter', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '331213', name: 'Joiner', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '332111', name: 'Floor Finisher', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '332211', name: 'Painter', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '333111', name: 'Glazier', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '333211', name: 'Fibrous Plasterer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '333212', name: 'Renderer (Solid Plaster)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '333311', name: 'Roof Tiler', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '333411', name: 'Wall and Floor Tiler', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '334112', name: 'Airconditioning and Mechanical Services Plumber', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '334113', name: 'Drainer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '334114', name: 'Gasfitter', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '334115', name: 'Roof Plumber', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '334116', name: 'Plumber (General)', lists: [], visas: ['190', '491'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '334117', name: 'Fire Protection Plumber', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '341111', name: 'Electrician (General)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '341112', name: 'Electrician (Special Class)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '341113', name: 'Lift Mechanic', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342111', name: 'Airconditioning and Refrigeration Mechanic', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342211', name: 'Electrical Linesworker', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342212', name: 'Technical Cable Jointer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342311', name: 'Business Machine Mechanic', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342312', name: 'Communications Operator', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342313', name: 'Electronic Equipment Trades Worker', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342314', name: 'Electronic Instrument Trades Worker (General)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342315', name: 'Electronic Instrument Trades Worker (Special Class)', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342411', name: 'Cabler (Data and Telecommunications)', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342412', name: 'Telecommunications Cable Jointer', lists: ['CSOL', 'ROL'], visas: ['186', '190', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342413', name: 'Telecommunications Linesworker', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342414', name: 'Telecommunications Technician', lists: ['CSOL', 'ROL'], visas: ['186', '190', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '351111', name: 'Baker', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '351112', name: 'Pastrycook', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '351211', name: 'Butcher or Smallgoods Maker', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '351311', name: 'Chef', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '351411', name: 'Cook', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '361111', name: 'Dog Handler or Trainer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '361112', name: 'Horse Trainer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '361113', name: 'Pet Groomer', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '361114', name: 'Zookeeper', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '361115', name: 'Kennel Hand', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '361199', name: 'Animal Attendants and Trainers nec', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '361311', name: 'Veterinary Nurse', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '362111', name: 'Florist', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '362411', name: 'Nurseryperson', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '362511', name: 'Arborist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '362512', name: 'Tree Worker', lists: ['CSOL'], visas: ['186', '482'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '362712', name: 'Irrigation Technician', lists: ['CSOL'], visas: ['186', '482'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '391111', name: 'Hairdresser', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '392111', name: 'Print Finisher', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '392112', name: 'Screen Printer', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '392211', name: 'Graphic Pre-press Trades Worker', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '392311', name: 'Printing Machinist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '392312', name: 'Small Offset Printer', lists: ['ROL'], visas: ['494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '393111', name: 'Canvas Goods Fabricator', lists: ['ROL'], visas: ['494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '393112', name: 'Leather Goods Maker', lists: ['ROL'], visas: ['494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '393113', name: 'Sail Maker', lists: ['ROL'], visas: ['494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '393114', name: 'Shoemaker', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '393211', name: 'Apparel Cutter', lists: ['ROL'], visas: ['494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '393212', name: 'Clothing Patternmaker', lists: ['ROL'], visas: ['494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '393213', name: 'Dressmaker or Tailor', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '393299', name: 'Clothing Trades Workers nec', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '393311', name: 'Upholsterer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '394112', name: 'Cabinet Maker', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '394113', name: 'Furniture Maker', lists: ['CSOL'], visas: ['186', '190', '482', '491'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '394211', name: 'Furniture Finisher', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '394212', name: 'Picture Framer', lists: ['CSOL', 'ROL'], visas: ['186', '190', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '394213', name: 'Wood Machinist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '394214', name: 'Wood Turner', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '394299', name: 'Wood Machinists and Other Wood Trades Workers nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399111', name: 'Boat Builder and Repairer', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399112', name: 'Shipwright', lists: ['CSOL', 'MLTSSL'], visas: ['186', '189', '190', '407', '482', '485', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399211', name: 'Chemical Plant Operator', lists: ['CSOL', 'ROL'], visas: ['186', '190', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399212', name: 'Gas or Petroleum Operator', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399213', name: 'Power Generation Plant Operator', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399311', name: 'Gallery or Museum Technician', lists: ['ROL'], visas: ['494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399312', name: 'Library Technician', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '399411', name: 'Jeweller', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399511', name: 'Broadcast Transmitter Operator', lists: ['ROL'], visas: ['494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399512', name: 'Camera Operator (Film, Television or Video)', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399513', name: 'Light Technician', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399514', name: 'Make Up Artist', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399515', name: 'Musical Instrument Maker or Repairer', lists: ['ROL'], visas: ['494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399516', name: 'Sound Technician', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399517', name: 'Television Equipment Operator', lists: ['ROL'], visas: ['494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399599', name: 'Performing Arts Technicians nec', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '399611', name: 'Signwriter', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399911', name: 'Diver', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '399912', name: 'Interior Decorator', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '399913', name: 'Optical Dispenser (Aus) \\ Dispensing Optician (NZ)', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399914', name: 'Optical Mechanic', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399915', name: 'Photographer\'s Assistant', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Technicians & Trades' },
  { anzsco: '399916', name: 'Plastics Technician', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399918', name: 'Fire Protection Equipment Technician', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '399999', name: 'Technicians and Trades Workers nec', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  // ── Community & Personal Service ──────────────────────────────────────────
  { anzsco: '411111', name: 'Ambulance Officer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '411112', name: 'Intensive Care Ambulance Paramedic', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '411211', name: 'Dental Hygienist', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '411212', name: 'Dental Prosthetist', lists: ['CSOL', 'ROL'], visas: ['186', '190', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Community & Personal Service' },
  { anzsco: '411213', name: 'Dental Technician', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'TRA', group: 'Community & Personal Service' },
  { anzsco: '411214', name: 'Dental Therapist', lists: ['CSOL', 'ROL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '411311', name: 'Diversional Therapist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '411411', name: 'Enrolled Nurse', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'ANMAC', group: 'Community & Personal Service' },
  { anzsco: '411412', name: 'Mothercraft Nurse', lists: ['ROL'], visas: ['190', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '411511', name: 'Aboriginal and Torres Strait Islander Health Worker', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '411512', name: 'Kaiawhina (Hauora) (Maori Health Assistant)', lists: ['ROL'], visas: [], group: 'Community & Personal Service' },
  { anzsco: '411611', name: 'Massage Therapist', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '411711', name: 'Community Worker', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'Community Work Australia', group: 'Community & Personal Service' },
  { anzsco: '411712', name: 'Disabilities Services Officer', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'Community Work Australia', group: 'Community & Personal Service' },
  { anzsco: '411713', name: 'Family Support Worker', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'Community Work Australia', group: 'Community & Personal Service' },
  { anzsco: '411714', name: 'Parole or Probation Officer', lists: ['ROL'], visas: ['190', '491'], group: 'Community & Personal Service' },
  { anzsco: '411715', name: 'Residential Care Officer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'Community Work Australia', group: 'Community & Personal Service' },
  { anzsco: '411716', name: 'Youth Worker', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'Community Work Australia', group: 'Community & Personal Service' },
  { anzsco: '421111', name: 'Child Care Worker', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'ACECQA', group: 'Community & Personal Service' },
  { anzsco: '421114', name: 'Out of School Hours Care Worker', lists: ['CSOL'], visas: ['186', '482'], assessingAuthority: 'ACECQA', group: 'Community & Personal Service' },
  { anzsco: '431411', name: 'Hotel Service Manager', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '441111', name: 'Defence Force Member - Other Ranks', lists: ['ROL'], visas: [], group: 'Community & Personal Service' },
  { anzsco: '441211', name: 'Emergency Service Worker', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '441212', name: 'Fire Fighter', lists: ['ROL'], visas: [], group: 'Community & Personal Service' },
  { anzsco: '441311', name: 'Detective', lists: ['ROL'], visas: [], group: 'Community & Personal Service' },
  { anzsco: '441312', name: 'Police Officer', lists: ['ROL'], visas: [], group: 'Community & Personal Service' },
  { anzsco: '442216', name: 'Security Consultant', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '451111', name: 'Beauty Therapist', lists: ['CSOL'], visas: ['186', '482'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '451211', name: 'Driving Instructor', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '451311', name: 'Funeral Director', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '451399', name: 'Funeral Workers nec', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '451412', name: 'Tour Guide', lists: ['CSOL'], visas: ['186', '482'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '451612', name: 'Travel Consultant', lists: ['CSOL'], visas: ['186', '482'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '451711', name: 'Flight Attendant', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '451799', name: 'Travel Attendants nec', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '451815', name: 'First Aid Trainer', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452311', name: 'Diving Instructor (Open Water)', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452312', name: 'Gymnastics Coach or Instructor', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452313', name: 'Horse Riding Coach or Instructor', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452314', name: 'Snowsport Instructor', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452315', name: 'Swimming Coach or Instructor', lists: ['STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452316', name: 'Tennis Coach', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452317', name: 'Other Sports Coach or Instructor', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452318', name: 'Dog or Horse Racing Official', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452321', name: 'Sports Development Officer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452322', name: 'Sports Umpire', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452323', name: 'Other Sports Official', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452411', name: 'Footballer', lists: ['MLTSSL'], visas: ['189', '190', '407', '485', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452412', name: 'Golfer', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452413', name: 'Jockey', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'TRA', group: 'Community & Personal Service' },
  { anzsco: '452414', name: 'Lifeguard', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '452499', name: 'Sportspersons nec', lists: ['CSOL', 'STSOL'], visas: ['190', '407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  // ── Clerical & Administrative ─────────────────────────────────────────────
  { anzsco: '511111', name: 'Contract Administrator', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '511112', name: 'Program or Project Administrator', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '512111', name: 'Office Manager', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '512211', name: 'Health Practice Manager', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '512299', name: 'Practice Managers nec', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '521111', name: 'Personal Assistant', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '521211', name: 'Secretary (General)', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '521212', name: 'Legal Secretary', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '541111', name: 'Call or Contact Centre Team Leader', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '599111', name: 'Conveyancer', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '599112', name: 'Legal Executive', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '599211', name: 'Clerk of Court', lists: ['CSOL', 'ROL'], visas: ['186', '482', '494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '599212', name: 'Court Bailiff or Sheriff (Aus) \\ Court Collections Officer (NZ)', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '599213', name: 'Court Orderly (Aus) \\ Court Registry Officer (NZ)', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '599214', name: 'Law Clerk', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '599215', name: 'Trust Officer', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '599611', name: 'Insurance Investigator', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '599612', name: 'Insurance Loss Adjuster', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '599613', name: 'Insurance Risk Surveyor', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  { anzsco: '599915', name: 'Clinical Coder', lists: ['CSOL', 'ROL'], visas: ['186', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Clerical & Administrative' },
  // ── Sales ─────────────────────────────────────────────────────────────────
  { anzsco: '611111', name: 'Auctioneer', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Sales' },
  { anzsco: '611112', name: 'Stock and Station Agent', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Sales' },
  { anzsco: '611211', name: 'Insurance Agent', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Sales' },
  { anzsco: '612111', name: 'Business Broker', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Sales' },
  { anzsco: '612112', name: 'Property Manager', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Sales' },
  { anzsco: '612113', name: 'Real Estate Agency Principal (Aus) \\ Real Estate Agency Licensee (NZ)', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Sales' },
  { anzsco: '612114', name: 'Real Estate Agent', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Sales' },
  { anzsco: '612115', name: 'Real Estate Representative', lists: ['ROL'], visas: ['407', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Sales' },
  { anzsco: '639211', name: 'Retail Buyer', lists: ['CSOL', 'STSOL'], visas: ['186', '190', '407', '482', '491', '494'], assessingAuthority: 'VETASSESS', group: 'Sales' },
  { anzsco: '639212', name: 'Wool Buyer', lists: ['ROL'], visas: ['494'], assessingAuthority: 'VETASSESS', group: 'Sales' },
];

/** Stable identity key for an occupation row (ANZSCO is globally unique). */
export function occupationKey(o: SkilledOccupation): string {
  return o.anzsco;
}

/**
 * Default state coverage seed — applied to every entry that doesn't already
 * specify `states` explicitly. Reflects the most commonly-observed state
 * eligibility patterns; the scraper will replace this with each state's
 * authoritative list at runtime.
 *
 * Heuristic:
 *  - MLTSSL occupations are typically eligible for both 190 and 491 across
 *    all 8 states/territories.
 *  - CSOL-only occupations (no MLTSSL) are usually only on regional (491)
 *    lists and limited to a subset of states.
 *  - Healthcare / nursing / aged care / teaching is eligible everywhere.
 */
const HEALTH_GROUPS = new Set(['Community & Personal Service']);
const CRITICAL_KEYWORDS = ['Nurse', 'Doctor', 'Midwife', 'Teacher', 'Carer', 'Care', 'Chef', 'Electrician'];

function defaultStateCoverage(o: SkilledOccupation): Partial<Record<StateCode, string[]>> {
  const isMLTSSL = o.lists.includes('MLTSSL');
  const isCritical =
    HEALTH_GROUPS.has(o.group) ||
    o.group === 'Professionals' && /Nurse|Teacher|Midwife|Doctor|General Practitioner|Psychologist|Therapist|Physio|Speech|Dental|Pharma/i.test(o.name) ||
    CRITICAL_KEYWORDS.some((k) => o.name.includes(k));

  if (isMLTSSL || isCritical) {
    return STATE_CODES.reduce((acc, s) => {
      acc[s] = ['190', '491'];
      return acc;
    }, {} as Partial<Record<StateCode, string[]>>);
  }

  // CSOL-only → regional 491 in lower-population states (more common pattern)
  return {
    SA: ['491'], TAS: ['491'], NT: ['491'], ACT: ['491'], WA: ['491'],
  };
}

// Decorate the exported seed with default state coverage.
for (const o of SKILLED_OCCUPATIONS) {
  if (!o.states) o.states = defaultStateCoverage(o);
}
