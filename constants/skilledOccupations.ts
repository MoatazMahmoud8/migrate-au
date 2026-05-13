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

export interface SkilledOccupation {
  /** ANZSCO 6-digit code. */
  anzsco: string;
  /** Occupation title as published by DHA. */
  name: string;
  /** Lists the occupation appears on. */
  lists: SkillList[];
  /** Visa subclasses for which this occupation is eligible. */
  visas: string[];
  /** Skills assessing authority (free text, e.g. "VETASSESS", "Engineers Australia"). */
  assessingAuthority?: string;
  /** ANZSCO major group label (Manager / Professional / Trade / Tech / Clerical / Sales / Operator / Labourer). */
  group: string;
}

export const SKILL_OCCUPATIONS_SNAPSHOT_DATE = '2026-05-01';

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
  // ── Managers ────────────────────────────────────────────────────────────
  { anzsco: '111111', name: 'Chief Executive or Managing Director', lists: ['CSOL'], visas: ['482', '186', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '132111', name: 'Corporate Services Manager', lists: ['CSOL'], visas: ['482', '186', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '132211', name: 'Finance Manager', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '132411', name: 'Policy and Planning Manager', lists: ['CSOL'], visas: ['482', '186', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '133111', name: 'Construction Project Manager', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '133211', name: 'Engineering Manager', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Managers' },
  { anzsco: '133611', name: 'Supply and Distribution Manager', lists: ['CSOL'], visas: ['482', '186', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '134111', name: 'Child Care Centre Manager', lists: ['CSOL'], visas: ['482', '186', '494'], assessingAuthority: 'TRA', group: 'Managers' },
  { anzsco: '134212', name: 'Nursing Clinical Director', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ANMAC', group: 'Managers' },
  { anzsco: '134311', name: 'School Principal', lists: ['CSOL'], visas: ['482', '186', '494'], assessingAuthority: 'AITSL', group: 'Managers' },
  { anzsco: '139914', name: 'Quality Assurance Manager', lists: ['CSOL'], visas: ['482', '186', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '141111', name: 'Cafe or Restaurant Manager', lists: ['CSOL'], visas: ['482', '186', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },
  { anzsco: '142111', name: 'Retail Manager (General)', lists: ['CSOL'], visas: ['482', '494'], assessingAuthority: 'VETASSESS', group: 'Managers' },

  // ── Professionals — ICT ─────────────────────────────────────────────────
  { anzsco: '135111', name: 'Chief Information Officer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Managers' },
  { anzsco: '135112', name: 'ICT Project Manager', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Managers' },
  { anzsco: '135199', name: 'ICT Managers nec', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Managers' },
  { anzsco: '261111', name: 'ICT Business Analyst', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261112', name: 'Systems Analyst', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261211', name: 'Multimedia Specialist', lists: ['CSOL', 'STSOL'], visas: ['190', '491', '482', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261212', name: 'Web Developer', lists: ['CSOL', 'STSOL'], visas: ['190', '491', '482', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261311', name: 'Analyst Programmer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261312', name: 'Developer Programmer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261313', name: 'Software Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261314', name: 'Software Tester', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '261399', name: 'Software and Applications Programmers nec', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '262111', name: 'Database Administrator', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '262112', name: 'ICT Security Specialist', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '262113', name: 'Systems Administrator', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263111', name: 'Computer Network and Systems Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263112', name: 'Network Administrator', lists: ['CSOL', 'STSOL'], visas: ['190', '491', '482', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263113', name: 'Network Analyst', lists: ['CSOL', 'STSOL'], visas: ['190', '491', '482', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263211', name: 'ICT Quality Assurance Engineer', lists: ['CSOL', 'STSOL'], visas: ['190', '491', '482', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263212', name: 'ICT Support Engineer', lists: ['CSOL', 'STSOL'], visas: ['190', '491', '482', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263213', name: 'ICT Systems Test Engineer', lists: ['CSOL', 'STSOL'], visas: ['190', '491', '482', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263299', name: 'ICT Support and Test Engineers nec', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ACS', group: 'Professionals' },
  { anzsco: '263311', name: 'Telecommunications Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '263312', name: 'Telecommunications Network Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },

  // ── Professionals — Engineering ─────────────────────────────────────────
  { anzsco: '233111', name: 'Chemical Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233211', name: 'Civil Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233212', name: 'Geotechnical Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233213', name: 'Quantity Surveyor', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AIQS', group: 'Professionals' },
  { anzsco: '233214', name: 'Structural Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233215', name: 'Transport Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233311', name: 'Electrical Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233411', name: 'Electronics Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233511', name: 'Industrial Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233512', name: 'Mechanical Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233513', name: 'Production or Plant Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233611', name: 'Mining Engineer (excluding Petroleum)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233612', name: 'Petroleum Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233911', name: 'Aeronautical Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233912', name: 'Agricultural Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233913', name: 'Biomedical Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233914', name: 'Engineering Technologist', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233915', name: 'Environmental Engineer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },
  { anzsco: '233916', name: 'Naval Architect', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'Engineers Australia', group: 'Professionals' },

  // ── Professionals — Health ──────────────────────────────────────────────
  { anzsco: '253111', name: 'General Practitioner', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '494'], assessingAuthority: 'Medical Board of Australia', group: 'Professionals' },
  { anzsco: '253112', name: 'Resident Medical Officer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186'], assessingAuthority: 'Medical Board of Australia', group: 'Professionals' },
  { anzsco: '253211', name: 'Anaesthetist', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186'], assessingAuthority: 'Medical Board of Australia', group: 'Professionals' },
  { anzsco: '253311', name: 'Specialist Physician (General)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186'], assessingAuthority: 'Medical Board of Australia', group: 'Professionals' },
  { anzsco: '253411', name: 'Psychiatrist', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186'], assessingAuthority: 'Medical Board of Australia', group: 'Professionals' },
  { anzsco: '253511', name: 'Surgeon (General)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186'], assessingAuthority: 'Medical Board of Australia', group: 'Professionals' },
  { anzsco: '254111', name: 'Midwife', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254411', name: 'Nurse Practitioner', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254412', name: 'Registered Nurse (Aged Care)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254418', name: 'Registered Nurse (Medical)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254421', name: 'Registered Nurse (Critical Care and Emergency)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254423', name: 'Registered Nurse (Mental Health)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '254499', name: 'Registered Nurses nec', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ANMAC', group: 'Professionals' },
  { anzsco: '251211', name: 'Medical Diagnostic Radiographer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AHPRA', group: 'Professionals' },
  { anzsco: '251411', name: 'Optometrist', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AHPRA', group: 'Professionals' },
  { anzsco: '251513', name: 'Retail Pharmacist', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'APC', group: 'Professionals' },
  { anzsco: '252411', name: 'Occupational Therapist', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'OTC', group: 'Professionals' },
  { anzsco: '252511', name: 'Physiotherapist', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'APC', group: 'Professionals' },
  { anzsco: '252712', name: 'Speech Pathologist', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'SPA', group: 'Professionals' },
  { anzsco: '252611', name: 'Podiatrist', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AHPRA', group: 'Professionals' },
  { anzsco: '272311', name: 'Clinical Psychologist', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AHPRA', group: 'Professionals' },
  { anzsco: '272314', name: 'Psychologist (General)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AHPRA', group: 'Professionals' },
  { anzsco: '252111', name: 'Chiropractor', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AHPRA', group: 'Professionals' },
  { anzsco: '252311', name: 'Dentist', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ADC', group: 'Professionals' },

  // ── Professionals — Education & Social ──────────────────────────────────
  { anzsco: '241111', name: 'Early Childhood (Pre-primary School) Teacher', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AITSL', group: 'Professionals' },
  { anzsco: '241213', name: 'Primary School Teacher', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AITSL', group: 'Professionals' },
  { anzsco: '241411', name: 'Secondary School Teacher', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AITSL', group: 'Professionals' },
  { anzsco: '241511', name: 'Special Needs Teacher', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AITSL', group: 'Professionals' },
  { anzsco: '242111', name: 'University Lecturer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '272511', name: 'Social Worker', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AASW', group: 'Professionals' },

  // ── Professionals — Accounting, Finance, Law ────────────────────────────
  { anzsco: '221111', name: 'Accountant (General)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'CPA / CAANZ / IPA', group: 'Professionals' },
  { anzsco: '221112', name: 'Management Accountant', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'CPA / CAANZ / IPA', group: 'Professionals' },
  { anzsco: '221113', name: 'Taxation Accountant', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'CPA / CAANZ / IPA', group: 'Professionals' },
  { anzsco: '221213', name: 'External Auditor', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'CPA / CAANZ / IPA', group: 'Professionals' },
  { anzsco: '222311', name: 'Financial Investment Adviser', lists: ['CSOL'], visas: ['482', '186', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224111', name: 'Actuary', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '224711', name: 'Management Consultant', lists: ['CSOL'], visas: ['482', '186', '494'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '271111', name: 'Barrister', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'State Legal Admission Boards', group: 'Professionals' },
  { anzsco: '271311', name: 'Solicitor', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'State Legal Admission Boards', group: 'Professionals' },

  // ── Professionals — Science & Architecture ──────────────────────────────
  { anzsco: '232111', name: 'Architect', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AACA', group: 'Professionals' },
  { anzsco: '232112', name: 'Landscape Architect', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '232212', name: 'Surveyor', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234111', name: 'Agricultural Consultant', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234511', name: 'Life Scientist (General)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'VETASSESS', group: 'Professionals' },
  { anzsco: '234711', name: 'Veterinarian', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AVBC', group: 'Professionals' },

  // ── Technicians & Trades — Construction ─────────────────────────────────
  { anzsco: '331111', name: 'Bricklayer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '331112', name: 'Stonemason', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '331211', name: 'Carpenter and Joiner', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '331212', name: 'Carpenter', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '331213', name: 'Joiner', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '332211', name: 'Painting Trades Worker', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '333411', name: 'Wall and Floor Tiler', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '334111', name: 'Plumber (General)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '334113', name: 'Drainer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '334115', name: 'Roof Plumber', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },

  // ── Technicians & Trades — Electrotechnology ────────────────────────────
  { anzsco: '341111', name: 'Electrician (General)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '341112', name: 'Electrician (Special Class)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342111', name: 'Airconditioning and Refrigeration Mechanic', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342211', name: 'Electrical Linesworker', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '342313', name: 'Electronic Equipment Trades Worker', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },

  // ── Technicians & Trades — Automotive & Engineering ─────────────────────
  { anzsco: '321111', name: 'Automotive Electrician', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '321211', name: 'Motor Mechanic (General)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '321212', name: 'Diesel Motor Mechanic', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '322211', name: 'Sheetmetal Trades Worker', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '322311', name: 'Metal Fabricator', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '322313', name: 'Welder (First Class)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323211', name: 'Fitter (General)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '323214', name: 'Metal Machinist (First Class)', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },

  // ── Technicians & Trades — Food ─────────────────────────────────────────
  { anzsco: '351311', name: 'Chef', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '351411', name: 'Cook', lists: ['CSOL'], visas: ['482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '351111', name: 'Baker', lists: ['CSOL', 'STSOL'], visas: ['482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },
  { anzsco: '351112', name: 'Pastrycook', lists: ['CSOL', 'STSOL'], visas: ['482', '494'], assessingAuthority: 'TRA', group: 'Technicians & Trades' },

  // ── Community & Personal Service ────────────────────────────────────────
  { anzsco: '411111', name: 'Ambulance Officer', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'VETASSESS', group: 'Community & Personal Service' },
  { anzsco: '411411', name: 'Enrolled Nurse', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'ANMAC', group: 'Community & Personal Service' },
  { anzsco: '423111', name: 'Aged or Disabled Carer', lists: ['CSOL'], visas: ['482', '494'], assessingAuthority: 'TRA', group: 'Community & Personal Service' },
  { anzsco: '423312', name: 'Nursing Support Worker', lists: ['CSOL'], visas: ['482', '494'], assessingAuthority: 'TRA', group: 'Community & Personal Service' },
  { anzsco: '423313', name: 'Personal Care Assistant', lists: ['CSOL'], visas: ['482', '494'], assessingAuthority: 'TRA', group: 'Community & Personal Service' },
  { anzsco: '421111', name: 'Child Care Worker', lists: ['CSOL'], visas: ['482', '494'], assessingAuthority: 'TRA', group: 'Community & Personal Service' },
  { anzsco: '411211', name: 'Dental Hygienist', lists: ['CSOL', 'MLTSSL'], visas: ['189', '190', '491', '482', '186', '485'], assessingAuthority: 'AHPRA', group: 'Community & Personal Service' },

  // ── Machinery Operators & Drivers ───────────────────────────────────────
  { anzsco: '733111', name: 'Truck Driver (General)', lists: ['CSOL'], visas: ['482', '494'], assessingAuthority: 'TRA', group: 'Machinery Operators & Drivers' },
  { anzsco: '721311', name: 'Excavator Operator', lists: ['CSOL'], visas: ['482', '494'], assessingAuthority: 'TRA', group: 'Machinery Operators & Drivers' },
];

/** Stable identity key for an occupation row (ANZSCO is globally unique). */
export function occupationKey(o: SkilledOccupation): string {
  return o.anzsco;
}
