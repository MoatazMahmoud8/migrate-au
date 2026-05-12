/**
 * Visa pathway data — rendered in-app on /visas screen instead of linking to DHA.
 * Source: immi.homeaffairs.gov.au — verified subclasses & conditions as of 2026-04.
 */

export interface VisaPathway {
  code: string;
  name: string;
  category: 'Employer' | 'Family' | 'Student' | 'Working Holiday' | 'Graduate' | 'Visitor' | 'Humanitarian' | 'Training';
  icon: string;
  type: 'Temporary' | 'Permanent';
  subclasses: string[];
  conditions: string[];
  /** Official DHA listing — used as a "Read on DHA" fallback link. */
  url: string;
}

export const VISA_PATHWAYS: VisaPathway[] = [
  // ── EMPLOYER-SPONSORED ──────────────────────────────────────────
  {
    code: '482', name: 'Skills in Demand (Temp)', category: 'Employer',
    icon: 'hourglass-outline', type: 'Temporary',
    subclasses: ['482 - Core Skills Stream', '482 - Specialist Skills Stream', '482 - Labour Agreement Stream'],
    conditions: [
      'Sponsored by an approved employer',
      'Occupation on eligible skills list',
      'Meet English language requirements',
      'Skills assessment for most occupations',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482',
  },
  {
    code: '186', name: 'Employer Nominated (Perm)', category: 'Employer',
    icon: 'briefcase-outline', type: 'Permanent',
    subclasses: ['186 - Direct Entry', '186 - Temporary Residence Transition', '186 - Labour Agreement'],
    conditions: [
      'Nominated by Australian employer',
      'Occupation on eligible list',
      'Skills & qualification assessment',
      'Age under 45 (most streams)',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186',
  },
  {
    code: '494', name: 'Skilled Employer Regional', category: 'Employer',
    icon: 'location-outline', type: 'Temporary',
    subclasses: ['494 - Employer Sponsored', '494 - Labour Agreement'],
    conditions: [
      'Sponsored by regional employer',
      'Occupation on RSMS occupation list',
      'Live & work in specified regional area',
      'Pathway to permanent residence (191)',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-employer-sponsored-regional-provisional-494',
  },
  {
    code: '407', name: 'Training Visa', category: 'Training',
    icon: 'school-outline', type: 'Temporary',
    subclasses: ['407 - Occupational Training', '407 - Professional Development'],
    conditions: [
      'Sponsored by approved Australian organisation',
      'Training must improve skills in current occupation',
      'Not for general employment',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/training-407',
  },
  // ── GRADUATE ────────────────────────────────────────────────────
  {
    code: '485', name: 'Temporary Graduate', category: 'Graduate',
    icon: 'ribbon-outline', type: 'Temporary',
    subclasses: ['485 - Graduate Work', '485 - Post-Study Work'],
    conditions: [
      'Completed eligible Australian study',
      'Applied within 6 months of completing study',
      'Meet English requirements (IELTS 6+)',
      'Post-Study stream: bachelor or higher degree',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485',
  },
  // ── WORKING HOLIDAY ─────────────────────────────────────────────
  {
    code: '417', name: 'Working Holiday', category: 'Working Holiday',
    icon: 'sunny-outline', type: 'Temporary',
    subclasses: ['417 - First Working Holiday', '417 - Second (3 months regional)', '417 - Third (6 months regional)'],
    conditions: [
      'Passport from eligible country',
      'Aged 18–30 (up to 35 for some countries)',
      'Not accompanied by dependent children',
      'Sufficient funds (AUD 5,000+)',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/working-holiday-417',
  },
  {
    code: '462', name: 'Work and Holiday', category: 'Working Holiday',
    icon: 'globe-outline', type: 'Temporary',
    subclasses: ['462 - Work and Holiday'],
    conditions: [
      'Passport from participating country (e.g., USA, China)',
      'Aged 18–30',
      'Meet education/language requirements',
      'Supported by home country government',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-462',
  },
  // ── FAMILY ──────────────────────────────────────────────────────
  {
    code: '820 / 801', name: 'Partner (Onshore)', category: 'Family',
    icon: 'heart-outline', type: 'Permanent',
    subclasses: ['820 - Temporary (initial grant)', '801 - Permanent (after 2 years)'],
    conditions: [
      'Spouse or de facto partner of Australian citizen/PR',
      'Genuine, committed relationship',
      'Onshore application (in Australia)',
      'Health & character requirements',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-820-801',
  },
  {
    code: '309 / 100', name: 'Partner (Offshore)', category: 'Family',
    icon: 'heart-circle-outline', type: 'Permanent',
    subclasses: ['309 - Temporary (offshore)', '100 - Permanent'],
    conditions: [
      'Spouse or de facto of Australian citizen/PR',
      'Applied from outside Australia',
      'Genuine & committed relationship',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-309-100',
  },
  {
    code: '300', name: 'Prospective Marriage', category: 'Family',
    icon: 'diamond-outline', type: 'Temporary',
    subclasses: ['300 - Fiancé(e) Visa'],
    conditions: [
      'Intend to marry Australian citizen/PR',
      'Must marry within 9 months of entry',
      'Both parties must be free to marry',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/prospective-marriage-300',
  },
  {
    code: '103 / 143', name: 'Parent Visa', category: 'Family',
    icon: 'people-outline', type: 'Permanent',
    subclasses: ['103 - Parent', '143 - Contributory Parent', '173 - Contributory Temp'],
    conditions: [
      'Child who is Australian citizen/PR/eligible NZ citizen',
      'Pass the balance of family test',
      '143 requires significant financial contribution',
      'Long waiting periods (103: 30+ years; 143: 5–10 years)',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/parent-103',
  },
  {
    code: '101 / 445', name: 'Child Visa', category: 'Family',
    icon: 'person-add-outline', type: 'Permanent',
    subclasses: ['101 - Child (offshore)', '445 - Dependent Child', '102 - Adopted Child'],
    conditions: [
      'Child of Australian citizen/PR',
      'Under 18, or 18–25 if full-time student',
      'Single & dependent if 18+',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/child-101',
  },
  // ── STUDENT ─────────────────────────────────────────────────────
  {
    code: '500', name: 'Student Visa', category: 'Student',
    icon: 'book-outline', type: 'Temporary',
    subclasses: ['500 - Full-time Study', '590 - Student Guardian'],
    conditions: [
      'Enrolled in CRICOS-registered course (CoE)',
      'Hold Overseas Student Health Cover (OSHC)',
      'Genuine Temporary Entrant (GTE)',
      'Sufficient financial means',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
  },
  // ── VISITOR ─────────────────────────────────────────────────────
  {
    code: '600', name: 'Visitor Visa', category: 'Visitor',
    icon: 'airplane-outline', type: 'Temporary',
    subclasses: ['600 - Tourist', '600 - Business Visitor', '600 - Family Sponsored', '600 - Approved Destination Status'],
    conditions: [
      'Genuine temporary visit intention',
      'Sufficient funds for stay & departure ticket',
      'Meet health & character requirements',
      'Sponsored stream requires Australian sponsor',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600',
  },
  {
    code: '408', name: 'Temporary Activity', category: 'Visitor',
    icon: 'flash-outline', type: 'Temporary',
    subclasses: ['408 - Entertainment', '408 - Sports', '408 - Religious', '408 - Research', '408 - Domestic Worker'],
    conditions: [
      'Sponsored by Australian organisation',
      'Specific short-term activity',
      'Not a general work visa',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-activity-408',
  },
  // ── HUMANITARIAN ────────────────────────────────────────────────
  {
    code: '200 – 204', name: 'Refugee & Humanitarian', category: 'Humanitarian',
    icon: 'shield-outline', type: 'Permanent',
    subclasses: ['200 - Refugee', '201 - In-Country Special', '202 - Global Special', '203 - Emergency Rescue', '204 - Woman at Risk'],
    conditions: [
      'Referred by UNHCR or Australian Embassy',
      'Assessed to be a refugee under UN convention',
      'Not applicable for individual applications (offshore)',
      '866 - Protection visa for onshore applicants',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/refugee-200',
  },
];

export const VISA_CATEGORY_META: Record<VisaPathway['category'], { icon: string; color: string; bg: string }> = {
  Employer:         { icon: 'briefcase-outline', color: '#00C2FF', bg: 'rgba(0,194,255,0.10)' },
  Family:           { icon: 'heart-outline',     color: '#FF6B8A', bg: 'rgba(255,107,154,0.10)' },
  Student:          { icon: 'school-outline',    color: '#00D68F', bg: 'rgba(0,214,143,0.10)' },
  'Working Holiday':{ icon: 'sunny-outline',     color: '#FFCD00', bg: 'rgba(255,205,0,0.10)' },
  Graduate:         { icon: 'ribbon-outline',    color: '#A78BFA', bg: 'rgba(167,139,250,0.10)' },
  Visitor:          { icon: 'airplane-outline',  color: '#A8B0BD', bg: 'rgba(255,255,255,0.06)' },
  Humanitarian:     { icon: 'shield-outline',    color: '#FF3B30', bg: 'rgba(255,59,48,0.10)' },
  Training:         { icon: 'construct-outline', color: '#06B6D4', bg: 'rgba(6,182,212,0.10)' },
};
