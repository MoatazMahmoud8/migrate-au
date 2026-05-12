/**
 * Bundled visa processing times.
 *
 * Source: Australian Department of Home Affairs — Global Visa Processing Times
 *   https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/global-visa-processing-times
 *
 * These figures represent the 50th and 90th percentile published processing
 * times for recently decided applications. They are bundled as fallback values
 * and refreshed at runtime when a network update is available (see
 * utils/processingTimes.ts).
 */

export interface ProcessingTime {
  subclass: string;
  name: string;
  stream?: string;
  category: 'Skilled' | 'Employer' | 'Family' | 'Student' | 'Visitor' | 'Graduate';
  /** 50th percentile (median) — in months unless otherwise noted */
  p50: string;
  /** 90th percentile — in months */
  p90: string;
  icon: string;
  color: string;
  url: string;
}

/** ISO date of last bundled snapshot. Replace via OTA when the scraper runs. */
export const PROCESSING_SNAPSHOT_DATE = '2026-04-20';

export const PROCESSING_TIMES: ProcessingTime[] = [
  // ─── Skilled ──────────────────────────────────────────────────────
  {
    subclass: '189',
    name: 'Skilled Independent',
    category: 'Skilled',
    p50: '9 months',
    p90: '17 months',
    icon: 'globe-outline',
    color: '#00C2FF',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189',
  },
  {
    subclass: '190',
    name: 'Skilled Nominated',
    category: 'Skilled',
    p50: '5 months',
    p90: '11 months',
    icon: 'location-outline',
    color: '#00C2FF',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190',
  },
  {
    subclass: '491',
    name: 'Skilled Work Regional (Provisional)',
    category: 'Skilled',
    p50: '7 months',
    p90: '15 months',
    icon: 'map-outline',
    color: '#00C2FF',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491',
  },
  {
    subclass: '887',
    name: 'Skilled Regional (Residence)',
    category: 'Skilled',
    p50: '6 months',
    p90: '12 months',
    icon: 'home-outline',
    color: '#00C2FF',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-regional-887',
  },
  {
    subclass: '191',
    name: 'Permanent Residence (Skilled Regional)',
    category: 'Skilled',
    p50: '8 months',
    p90: '16 months',
    icon: 'home-outline',
    color: '#00C2FF',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/permanent-residence-skilled-regional-191',
  },

  // ─── Employer-sponsored ───────────────────────────────────────────
  {
    subclass: '482',
    name: 'Skills in Demand',
    stream: 'Core Skills',
    category: 'Employer',
    p50: '34 days',
    p90: '4 months',
    icon: 'briefcase-outline',
    color: '#FFCD00',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482',
  },
  {
    subclass: '482',
    name: 'Skills in Demand',
    stream: 'Specialist Skills',
    category: 'Employer',
    p50: '8 days',
    p90: '36 days',
    icon: 'briefcase-outline',
    color: '#FFCD00',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482',
  },
  {
    subclass: '186',
    name: 'Employer Nomination Scheme',
    stream: 'Direct Entry',
    category: 'Employer',
    p50: '8 months',
    p90: '15 months',
    icon: 'briefcase-outline',
    color: '#FFCD00',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186',
  },
  {
    subclass: '186',
    name: 'Employer Nomination Scheme',
    stream: 'Temp Residence Transition',
    category: 'Employer',
    p50: '5 months',
    p90: '10 months',
    icon: 'briefcase-outline',
    color: '#FFCD00',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186',
  },
  {
    subclass: '494',
    name: 'Skilled Employer Regional',
    category: 'Employer',
    p50: '6 months',
    p90: '13 months',
    icon: 'location-outline',
    color: '#FFCD00',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-employer-sponsored-regional-494',
  },

  // ─── Graduate ─────────────────────────────────────────────────────
  {
    subclass: '485',
    name: 'Temporary Graduate',
    stream: 'Post-Vocational',
    category: 'Graduate',
    p50: '3 months',
    p90: '6 months',
    icon: 'ribbon-outline',
    color: '#A78BFA',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485',
  },
  {
    subclass: '485',
    name: 'Temporary Graduate',
    stream: 'Post-Higher Education',
    category: 'Graduate',
    p50: '4 months',
    p90: '8 months',
    icon: 'ribbon-outline',
    color: '#A78BFA',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485',
  },

  // ─── Family ───────────────────────────────────────────────────────
  {
    subclass: '820/801',
    name: 'Partner (Onshore)',
    category: 'Family',
    p50: '20 months',
    p90: '32 months',
    icon: 'heart-outline',
    color: '#FF6B8A',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-820-801',
  },
  {
    subclass: '309/100',
    name: 'Partner (Offshore)',
    category: 'Family',
    p50: '14 months',
    p90: '26 months',
    icon: 'heart-outline',
    color: '#FF6B8A',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-offshore-309-100',
  },
  {
    subclass: '300',
    name: 'Prospective Marriage',
    category: 'Family',
    p50: '13 months',
    p90: '24 months',
    icon: 'heart-outline',
    color: '#FF6B8A',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/prospective-marriage-300',
  },
  {
    subclass: '143',
    name: 'Parent (Contributory)',
    category: 'Family',
    p50: '5 years',
    p90: '6 years',
    icon: 'people-outline',
    color: '#FF6B8A',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/contributory-parent-143',
  },
  {
    subclass: '103',
    name: 'Parent (Non-contributory)',
    category: 'Family',
    p50: '29 years',
    p90: '31 years',
    icon: 'people-outline',
    color: '#FF6B8A',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/parent-103',
  },

  // ─── Student ──────────────────────────────────────────────────────
  {
    subclass: '500',
    name: 'Student',
    stream: 'Higher Education',
    category: 'Student',
    p50: '47 days',
    p90: '4 months',
    icon: 'school-outline',
    color: '#00D68F',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
  },
  {
    subclass: '500',
    name: 'Student',
    stream: 'Vocational Education',
    category: 'Student',
    p50: '2 months',
    p90: '6 months',
    icon: 'school-outline',
    color: '#00D68F',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
  },

  // ─── Visitor ──────────────────────────────────────────────────────
  {
    subclass: '600',
    name: 'Visitor',
    stream: 'Tourist (Online)',
    category: 'Visitor',
    p50: '22 days',
    p90: '47 days',
    icon: 'airplane-outline',
    color: '#FB923C',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600',
  },
  {
    subclass: '417',
    name: 'Working Holiday',
    category: 'Visitor',
    p50: '21 days',
    p90: '53 days',
    icon: 'sunny-outline',
    color: '#FB923C',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/working-holiday',
  },
];

export const CATEGORIES: Array<ProcessingTime['category']> = [
  'Skilled',
  'Employer',
  'Graduate',
  'Family',
  'Student',
  'Visitor',
];
