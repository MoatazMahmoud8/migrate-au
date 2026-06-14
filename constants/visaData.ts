/**
 * Comprehensive Australian visa dataset.
 * Source: https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing
 * Last verified: June 2026
 *
 * ALL visas are now SEPARATED and INDIVIDUALLY LISTED.
 * Repealed/Historical visas are marked in the 'type' field.
 * This file is the single source of truth for visa info in the app.
 */

export type VisaCategory =
  | 'Skilled'
  | 'Employer'
  | 'Graduate'
  | 'Working Holiday'
  | 'Business'
  | 'Family'
  | 'Student'
  | 'Visitor'
  | 'Humanitarian'
  | 'Bridging'
  | 'Other'
  | 'Historical';

export interface VisaEntry {
  code: string;
  name: string;
  icon: string;
  /** 'Permanent' | 'Temporary' | 'Repealed' — used for the badge */
  type: 'Permanent' | 'Temporary' | 'Repealed';
  category: VisaCategory;
  subclasses: string[];
  conditions: string[];
  url: string;
}

export const ALL_VISAS: VisaEntry[] = [

  // ─────────────────────────────────────────────────────────────────
  // SKILLED (7 ACTIVE + 1 REPEALED)
  // ─────────────────────────────────────────────────────────────────
  {
    code: '189', name: 'Skilled Independent', icon: 'globe-outline', type: 'Permanent', category: 'Skilled',
    subclasses: ['189 – Points-tested stream', '189 – New Zealand stream'],
    conditions: ['No sponsorship required', 'Occupation on MLTSSL', 'Points score ≥ 65', 'Age under 45'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189',
  },
  {
    code: '190', name: 'Skilled Nominated', icon: 'location-outline', type: 'Permanent', category: 'Skilled',
    subclasses: ['190 – State/Territory Nominated'],
    conditions: ['Nominated by a state or territory', 'Occupation on state occupation list', 'Points score ≥ 65 (+5 nomination bonus)', 'Must live & work in nominating state for 2 years'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190',
  },
  {
    code: '191', name: 'Permanent Residence (Skilled Regional)', icon: 'home-outline', type: 'Permanent', category: 'Skilled',
    subclasses: ['191 – Permanent (from 491 or 494)'],
    conditions: ['Hold 491 or 494 for at least 3 years', 'Lived & worked in regional Australia', 'Meet income threshold requirement'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/permanent-residence-skilled-regional-191',
  },
  {
    code: '192', name: 'Pacific Engagement Visa', icon: 'island-outline', type: 'Permanent', category: 'Skilled',
    subclasses: ['192 – Ballot-based permanent residence'],
    conditions: ['Citizen of eligible Pacific Island country or Timor-Leste', 'Selected through annual ballot', 'Must meet health, character, English requirements'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/pacific-engagement',
  },
  {
    code: '491', name: 'Skilled Work Regional (Provisional)', icon: 'map-outline', type: 'Temporary', category: 'Skilled',
    subclasses: ['491 – State/Territory Nominated', '491 – Family Sponsored (regional)'],
    conditions: ['Live & work in designated regional area', '+15 points for nomination/family sponsorship', 'Pathway to permanent 191 after 3 years', 'Occupation on MLTSSL/STSOL/ROL'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491',
  },
  {
    code: '858', name: 'National Innovation Visa', icon: 'bulb-outline', type: 'Permanent', category: 'Skilled',
    subclasses: ['858 – Distinguished talent/innovation'],
    conditions: ['Internationally recognised record of exceptional achievement', 'Nominated by an approved Australian body', 'Benefit to Australia in your field'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/national-innovation-visa-858',
  },
  {
    code: '887', name: 'Skilled Regional', icon: 'home-outline', type: 'Permanent', category: 'Skilled',
    subclasses: ['887 – Permanent skilled regional'],
    conditions: ['Held an eligible provisional visa', 'Lived ≥ 2 years in specified regional area', 'Worked full-time ≥ 1 year in regional area'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-regional-887',
  },

  // ─────────────────────────────────────────────────────────────────
  // EMPLOYER-SPONSORED (10 ACTIVE + 1 REPEALED)
  // ─────────────────────────────────────────────────────────────────
  {
    code: '186', name: 'Employer Nomination Scheme (ENS)', icon: 'briefcase-outline', type: 'Permanent', category: 'Employer',
    subclasses: ['186 – Direct Entry', '186 – Temporary Residence Transition', '186 – Labour Agreement'],
    conditions: ['Nominated by approved Australian employer', 'Occupation on eligible list', 'Skills & qualification assessment', 'Age under 45 (most streams)'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186',
  },
  {
    code: '187', name: 'Regional Sponsored Migration Scheme (RSMS) – REPEALED', icon: 'location-outline', type: 'Repealed', category: 'Employer',
    subclasses: ['187 – Direct Entry (CLOSED)', '187 – Temporary Residence Transition (transition only)'],
    conditions: ['REPEALED 16 November 2019', 'Replaced by subclass 494 (provisional) and 191 (permanent)', 'Transition applications only for existing holders'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/regional-sponsor-migration-scheme-187',
  },
  {
    code: '188', name: 'Business Innovation and Investment (Provisional)', icon: 'trending-up-outline', type: 'Temporary', category: 'Business',
    subclasses: ['188A – Business Innovation', '188B – Investor', '188C – Significant Investor', '188E – Entrepreneur'],
    conditions: ['State/territory nomination required', 'Business or investment background', 'Minimum net assets and business turnover thresholds', 'Pathway to permanent 888 visa'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/business-innovation-and-investment-188',
  },
  {
    code: '400', name: 'Temporary Work (Short Stay Specialist)', icon: 'time-outline', type: 'Temporary', category: 'Employer',
    subclasses: ['400 – Short Stay Specialist'],
    conditions: ['Highly specialised, non-ongoing work', 'Stay up to 6 months', 'Sponsored or self-sponsored', 'Not for full-time employment'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-work-400',
  },
  {
    code: '403', name: 'Temporary Work (International Relations)', icon: 'earth-outline', type: 'Temporary', category: 'Employer',
    subclasses: ['403 – Government Agreement', '403 – Domestic Worker (Diplomatic)', '403 – Seasonal Worker Program', '403 – Pacific Labour Scheme'],
    conditions: ['Tied to government agreements or international programs', 'Includes PALM scheme workers', 'Specific employer sponsorship required'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-work-403',
  },
  {
    code: '407', name: 'Training Visa', icon: 'school-outline', type: 'Temporary', category: 'Employer',
    subclasses: ['407 – Occupational Training', '407 – Professional Development'],
    conditions: ['Sponsored by approved Australian organisation', 'Training must improve skills in current occupation', 'Not a general work visa'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/training-407',
  },
  {
    code: '408', name: 'Temporary Activity', icon: 'flash-outline', type: 'Temporary', category: 'Employer',
    subclasses: ['408 – Entertainment', '408 – Sports', '408 – Religious/Charity', '408 – Research', '408 – Domestic Worker (Exec)', '408 – Exchange/Cultural'],
    conditions: ['Sponsored by Australian organisation for a specific activity', 'Short-term, non-ongoing activity', 'Not a general work visa'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-activity-408',
  },
  {
    code: '417', name: 'Working Holiday', icon: 'sunny-outline', type: 'Temporary', category: 'Working Holiday',
    subclasses: ['417 – First Working Holiday', '417 – Second (3 months regional work)', '417 – Third (6 months regional work)'],
    conditions: ['Passport from eligible country', 'Aged 18–30 (up to 35 for some countries)', 'Not accompanied by dependent children', 'Sufficient funds (AUD 5,000+)'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/working-holiday-417',
  },
  {
    code: '462', name: 'Work and Holiday', icon: 'globe-outline', type: 'Temporary', category: 'Working Holiday',
    subclasses: ['462 – Work and Holiday'],
    conditions: ['Passport from participating country (e.g. USA, China, India)', 'Aged 18–30', 'Meet education/language requirements per country'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-462',
  },
  {
    code: '482', name: 'Skills in Demand', icon: 'briefcase-outline', type: 'Temporary', category: 'Employer',
    subclasses: ['482 – Core Skills Stream', '482 – Specialist Skills Stream', '482 – Labour Agreement Stream'],
    conditions: ['Sponsored by an approved employer', 'Occupation on eligible skills list', 'Meet English language requirements'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482',
  },
  {
    code: '494', name: 'Skilled Employer Sponsored Regional (Provisional)', icon: 'location-outline', type: 'Temporary', category: 'Employer',
    subclasses: ['494 – Employer Sponsored', '494 – Labour Agreement'],
    conditions: ['Sponsored by approved regional employer', 'Occupation on RSMS occupation list', 'Live & work in specified regional area', 'Pathway to permanent 191 after 3 years'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-employer-sponsored-regional-provisional-494',
  },

  // ─────────────────────────────────────────────────────────────────
  // BUSINESS & INVESTMENT (3 ACTIVE)
  // ─────────────────────────────────────────────────────────────────
  {
    code: '132', name: 'Business Talent (Permanent)', icon: 'trophy-outline', type: 'Permanent', category: 'Business',
    subclasses: ['132A – Significant Business History', '132B – Venture Capital Entrepreneur'],
    conditions: ['State/territory nomination required', 'Significant business background', 'Net assets of AUD 1.5M+'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/business-talent-permanent-132',
  },
  {
    code: '888', name: 'Business Innovation and Investment (Permanent)', icon: 'trending-up-outline', type: 'Permanent', category: 'Business',
    subclasses: ['888A – Business Innovation', '888B – Investor', '888C – Significant Investor', '888E – Entrepreneur'],
    conditions: ['Hold or held a 188 visa', 'Carried on business/investment activity in Australia', 'Meet ongoing financial and business requirements'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/business-innovation-and-investment-888',
  },

  // ─────────────────────────────────────────────────────────────────
  // GRADUATE (1 ACTIVE)
  // ─────────────────────────────────────────────────────────────────
  {
    code: '485', name: 'Temporary Graduate', icon: 'ribbon-outline', type: 'Temporary', category: 'Graduate',
    subclasses: ['485 – Graduate Work stream', '485 – Post-Study Work stream'],
    conditions: ['Completed eligible Australian study', 'Applied within 6 months of completing study', 'Meet English requirements (IELTS 6.0+)'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485',
  },

  // ─────────────────────────────────────────────────────────────────
  // FAMILY & PARTNER (18 ACTIVE + 3 REPEALED/CLOSED)
  // ─────────────────────────────────────────────────────────────────
  {
    code: '100', name: 'Partner (Offshore - Permanent)', icon: 'heart-outline', type: 'Permanent', category: 'Family',
    subclasses: ['100 – Permanent (after 2 years on 309)'],
    conditions: ['Transition from 309 (Temporary)', 'After 2 years relationship duration', 'Continue living with sponsor in Australia'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-offshore',
  },
  {
    code: '101', name: 'Child (Offshore)', icon: 'person-add-outline', type: 'Permanent', category: 'Family',
    subclasses: ['101 – Child (offshore)'],
    conditions: ['Child of Australian citizen/PR', 'Under 18 (or 18–25 if full-time student & dependent)', 'Apply from outside Australia'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/child-101',
  },
  {
    code: '102', name: 'Adoption', icon: 'person-add-outline', type: 'Permanent', category: 'Family',
    subclasses: ['102 – Adoption'],
    conditions: ['Child being adopted by Australian citizen/PR', 'Adoption in compliance with laws of home country & Australia', 'Under 18 at time of application'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/adoption-102',
  },
  {
    code: '103', name: 'Parent', icon: 'people-outline', type: 'Permanent', category: 'Family',
    subclasses: ['103 – Parent (Permanent)'],
    conditions: ['Child who is Australian citizen/PR', 'Pass balance of family test', 'No significant financial contribution', 'Processing: 30+ years (very long queue)'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/parent-103',
  },
  {
    code: '114', name: 'Aged Dependent Relative (Offshore)', icon: 'people-outline', type: 'Permanent', category: 'Family',
    subclasses: ['114 – Aged Dependent Relative (offshore)'],
    conditions: ['Elderly relative of Australian citizen/PR', 'Dependent on relative for financial support', 'Very long processing times (15+ years)'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/aged-dependent-relative-114',
  },
  {
    code: '115', name: 'Remaining Relative (Offshore)', icon: 'people-outline', type: 'Permanent', category: 'Family',
    subclasses: ['115 – Remaining Relative (offshore)'],
    conditions: ['No remaining close relatives outside Australia', 'Close relative who is Australian citizen/PR/eligible NZ', 'Very long processing times'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/remaining-relative-115',
  },
  {
    code: '116', name: 'Carer (Offshore)', icon: 'medical-outline', type: 'Permanent', category: 'Family',
    subclasses: ['116 – Carer (offshore)'],
    conditions: ['Provide care to relative in Australia', 'Relative has long-term medical need', 'No other suitable carer available'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/carer-116',
  },
  {
    code: '117', name: 'Orphan Relative (Offshore)', icon: 'person-add-outline', type: 'Permanent', category: 'Family',
    subclasses: ['117 – Orphan Relative (offshore)'],
    conditions: ['Child orphaned by death/incapacity of parents', 'Relative in Australia who is citizen/PR', 'Under 18'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/orphan-relative-117',
  },
  {
    code: '143', name: 'Contributory Parent (Permanent)', icon: 'people-outline', type: 'Permanent', category: 'Family',
    subclasses: ['143 – Contributory Parent (Permanent)'],
    conditions: ['Child who is Australian citizen/PR', 'Pass balance of family test', 'Significant financial contribution required (~AUD 45,000+)', 'Processing: 5–10 years approximately'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/contributory-parent-143',
  },
  {
    code: '151', name: 'Former Resident', icon: 'home-outline', type: 'Permanent', category: 'Family',
    subclasses: ['151 – Former Resident'],
    conditions: ['Was an Australian permanent resident', 'Lost status but has strong ties to Australia', 'Relative in Australia who is citizen/PR'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/former-resident-151',
  },
  {
    code: '173', name: 'Contributory Parent (Temporary - Initial)', icon: 'people-outline', type: 'Temporary', category: 'Family',
    subclasses: ['173 – Contributory Parent (Temporary – initial)'],
    conditions: ['Temporary visa while 143 processed', 'Transition from 173 to 143 after approval'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/contributory-parent-143',
  },
  {
    code: '300', name: 'Prospective Marriage (Fiancé)', icon: 'diamond-outline', type: 'Temporary', category: 'Family',
    subclasses: ['300 – Prospective Marriage'],
    conditions: ['Intend to marry Australian citizen/PR/eligible NZ citizen', 'Must marry within 9 months of entry', 'Both parties must be free to marry', 'Apply from outside Australia'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/prospective-marriage-300',
  },
  {
    code: '309', name: 'Partner (Offshore - Temporary)', icon: 'heart-circle-outline', type: 'Temporary', category: 'Family',
    subclasses: ['309 – Temporary (offshore initial grant - 2 years)'],
    conditions: ['Spouse or de facto of Australian citizen/PR/eligible NZ citizen', 'Apply from outside Australia', 'Genuine & committed relationship', 'Transition to 100 after 2 years'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-offshore',
  },
  {
    code: '445', name: 'Dependent Child (Partner Visa)', icon: 'person-add-outline', type: 'Temporary', category: 'Family',
    subclasses: ['445 – Dependent Child'],
    conditions: ['Child of a partner visa applicant', 'Dependent on parent who holds 309, 100, 820, or 801 visa'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/dependent-child-445',
  },
  {
    code: '461', name: 'New Zealand Citizen Family Relationship (Temporary)', icon: 'globe-outline', type: 'Temporary', category: 'Family',
    subclasses: ['461 – NZ Citizen Family Relationship'],
    conditions: ['Non-NZ family member of NZ citizen with special category visa 444', 'Apply from inside Australia', 'Live in Australia with NZ citizen family member'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/new-zealand-citizen-family-relationship-temporary-461',
  },
  {
    code: '801', name: 'Partner (Onshore - Permanent)', icon: 'heart-outline', type: 'Permanent', category: 'Family',
    subclasses: ['801 – Permanent (after 2 years on 820)'],
    conditions: ['Transition from 820 (Temporary)', 'After 2 years relationship duration', 'Continue living with sponsor in Australia'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-onshore',
  },
  {
    code: '802', name: 'Child (Onshore)', icon: 'person-add-outline', type: 'Permanent', category: 'Family',
    subclasses: ['802 – Child (onshore)'],
    conditions: ['Child of Australian citizen/PR', 'Under 18 (or 18–25 if full-time student & dependent)', 'Apply from inside Australia'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/child-101',
  },
  {
    code: '804', name: 'Aged Parent (Onshore)', icon: 'people-outline', type: 'Permanent', category: 'Family',
    subclasses: ['804 – Aged Parent (onshore)'],
    conditions: ['Parent must be of retirement age', 'Apply & be in Australia', 'Child who is Australian citizen/PR', 'Very long processing times (15+ years)'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/aged-parent-804',
  },
  {
    code: '820', name: 'Partner (Onshore - Temporary)', icon: 'heart-outline', type: 'Temporary', category: 'Family',
    subclasses: ['820 – Temporary (onshore initial grant - 2 years)'],
    conditions: ['Spouse or de facto partner of Australian citizen/PR/eligible NZ citizen', 'Apply from inside Australia', 'Genuine, committed relationship', 'Health & character requirements', 'Transition to 801 after 2 years'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-onshore',
  },
  {
    code: '835', name: 'Remaining Relative (Onshore)', icon: 'people-outline', type: 'Permanent', category: 'Family',
    subclasses: ['835 – Remaining Relative (onshore)'],
    conditions: ['No remaining close relatives outside Australia', 'Close relative in Australia who is citizen/PR/eligible NZ'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/remaining-relative-115',
  },
  {
    code: '836', name: 'Carer (Onshore)', icon: 'medical-outline', type: 'Permanent', category: 'Family',
    subclasses: ['836 – Carer (onshore)'],
    conditions: ['Provide care to relative in Australia', 'Relative has long-term medical need', 'No other suitable carer available'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/carer-116',
  },
  {
    code: '837', name: 'Orphan Relative (Onshore)', icon: 'person-add-outline', type: 'Permanent', category: 'Family',
    subclasses: ['837 – Orphan Relative (onshore)'],
    conditions: ['Child orphaned by death/incapacity of parents', 'Relative in Australia who is citizen/PR', 'Under 18'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/orphan-relative-117',
  },
  {
    code: '838', name: 'Aged Dependent Relative (Onshore)', icon: 'people-outline', type: 'Permanent', category: 'Family',
    subclasses: ['838 – Aged Dependent Relative (onshore)'],
    conditions: ['Elderly relative of Australian citizen/PR', 'Dependent on relative for financial support'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/aged-dependent-relative-114',
  },
  {
    code: '864', name: 'Contributory Aged Parent (Permanent)', icon: 'people-outline', type: 'Permanent', category: 'Family',
    subclasses: ['864 – Contributory Aged Parent (Permanent)'],
    conditions: ['Parent must be of retirement age', 'Child who is Australian citizen/PR', 'Pass balance of family test', 'Significant financial contribution required'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/contributory-aged-parent-864',
  },
  {
    code: '870', name: 'Sponsored Parent (Temporary)', icon: 'people-outline', type: 'Temporary', category: 'Family',
    subclasses: ['870 – Sponsored Parent'],
    conditions: ['Sponsored by eligible Australian child', 'Stay up to 3 or 5 years', 'Sponsor must be Australian citizen/PR/eligible NZ citizen', 'Cannot work on this visa'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/sponsored-parent-temporary-870',
  },
  {
    code: '884', name: 'Contributory Aged Parent (Temporary - Initial)', icon: 'people-outline', type: 'Temporary', category: 'Family',
    subclasses: ['884 – Contributory Aged Parent (Temporary – initial)'],
    conditions: ['Temporary visa while 864 processed', 'Transition from 884 to 864 after approval'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/contributory-aged-parent-864',
  },

  // ─────────────────────────────────────────────────────────────────
  // STUDENT (1 ACTIVE)
  // ─────────────────────────────────────────────────────────────────
  {
    code: '500', name: 'Student', icon: 'book-outline', type: 'Temporary', category: 'Student',
    subclasses: ['500 – Full-time Study (all sectors)'],
    conditions: ['Enrolled in CRICOS-registered course (CoE required)', 'Overseas Student Health Cover (OSHC)', 'Genuine Temporary Entrant (GTE) requirement', 'Sufficient financial means for fees & living'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
  },
  {
    code: '590', name: 'Student Guardian', icon: 'shield-checkmark-outline', type: 'Temporary', category: 'Student',
    subclasses: ['590 – Student Guardian'],
    conditions: ['Guardian of a student visa holder under 18', 'Must accompany student', 'Cannot work full-time', 'Apply from outside Australia'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-590',
  },

  // ─────────────────────────────────────────────────────────────────
  // VISITOR (5 ACTIVE)
  // ─────────────────────────────────────────────────────────────────
  {
    code: '600', name: 'Visitor', icon: 'airplane-outline', type: 'Temporary', category: 'Visitor',
    subclasses: ['600 – Tourist (offshore)', '600 – Tourist (onshore)', '600 – Business Visitor', '600 – Sponsored Family'],
    conditions: ['Genuine temporary visit intention', 'Sufficient funds for stay & departure ticket', 'Meet health & character requirements'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600',
  },
  {
    code: '601', name: 'Electronic Travel Authority (ETA)', icon: 'phone-portrait-outline', type: 'Temporary', category: 'Visitor',
    subclasses: ['601 – ETA (via Australian ETA app)'],
    conditions: ['Eligible passport country (e.g. USA, UK, Canada, Japan, Singapore)', 'Apply via Australian ETA app (AUD 20 service charge)', 'Stay up to 3 months per visit in a 12-month period'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601',
  },
  {
    code: '602', name: 'Medical Treatment', icon: 'medical-outline', type: 'Temporary', category: 'Visitor',
    subclasses: ['602 – Medical Treatment'],
    conditions: ['Need medical treatment or assessment in Australia', 'Sufficient funds to cover treatment', 'May sponsor accompanying family member'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/medical-treatment-602',
  },
  {
    code: '651', name: 'eVisitor', icon: 'globe-outline', type: 'Temporary', category: 'Visitor',
    subclasses: ['651 – eVisitor'],
    conditions: ['Eligible European passport holders', 'Apply online, no charge', 'Stay up to 3 months per visit in a 12-month period', 'Multiple entries allowed'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/evisitor-651',
  },
  {
    code: '771', name: 'Transit', icon: 'swap-horizontal-outline', type: 'Temporary', category: 'Visitor',
    subclasses: ['771 – Transit'],
    conditions: ['Transit through Australia only', 'Stay up to 72 hours', 'Onward ticket required'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/transit-771',
  },

  // ─────────────────────────────────────────────────────────────────
  // HUMANITARIAN (6 ACTIVE)
  // ─────────────────────────────────────────────────────────────────
  {
    code: '200', name: 'Refugee Visa', icon: 'shield-outline', type: 'Permanent', category: 'Humanitarian',
    subclasses: ['200 – Refugee (UNHCR referred)'],
    conditions: ['Referred by UNHCR or Australian Embassy (offshore)', 'Assessed as refugee under UN convention', 'Cannot apply as an individual from offshore', 'Resettlement places allocated annually by Government'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/refugee-200',
  },
  {
    code: '201', name: 'In-Country Special Humanitarian', icon: 'shield-outline', type: 'Permanent', category: 'Humanitarian',
    subclasses: ['201 – In-Country Special Humanitarian'],
    conditions: ['Referred by UNHCR for onshore humanitarian protection', 'In Australia when referred', 'Severe human rights concerns'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/refugee-200',
  },
  {
    code: '202', name: 'Global Special Humanitarian', icon: 'shield-outline', type: 'Permanent', category: 'Humanitarian',
    subclasses: ['202 – Global Special Humanitarian'],
    conditions: ['For resettlement of humanitarian cases', 'Referred through humanitarian program pathways', 'Severe human rights concerns'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/global-special-humanitarian-202',
  },
  {
    code: '203', name: 'Emergency Rescue', icon: 'shield-outline', type: 'Permanent', category: 'Humanitarian',
    subclasses: ['203 – Emergency Rescue'],
    conditions: ['Emergency humanitarian circumstances', 'Urgent protection needed', 'Severe human rights violations'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/refugee-200',
  },
  {
    code: '204', name: 'Woman at Risk', icon: 'shield-outline', type: 'Permanent', category: 'Humanitarian',
    subclasses: ['204 – Woman at Risk'],
    conditions: ['Woman with no male relative in country', 'Facing persecution in home country', 'Part of humanitarian resettlement program'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/refugee-200',
  },
  {
    code: '449', name: 'Humanitarian Stay (Temporary)', icon: 'shield-half-outline', type: 'Temporary', category: 'Humanitarian',
    subclasses: ['449 – Humanitarian Stay'],
    conditions: ['Granted to people in humanitarian circumstances', 'Usually granted automatically in some situations', 'Temporary stay while situation is assessed'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing',
  },
  {
    code: '785', name: 'Temporary Protection (TPV)', icon: 'shield-half-outline', type: 'Temporary', category: 'Humanitarian',
    subclasses: ['785 – Temporary Protection'],
    conditions: ['Applied for protection in Australia after arriving unlawfully', 'Found to meet refugee criteria', 'Temporary (3 years) and must reapply', 'Work rights included'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-protection-785',
  },
  {
    code: '790', name: 'Safe Haven Enterprise (SHEV)', icon: 'shield-half-outline', type: 'Temporary', category: 'Humanitarian',
    subclasses: ['790 – Safe Haven Enterprise'],
    conditions: ['Applied for protection after arriving unlawfully', 'Commit to living/working/studying in regional area', 'Pathway to certain other visas after 5 years', 'Work rights included'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/safe-haven-enterprise-790',
  },
  {
    code: '851', name: 'Resolution of Status', icon: 'shield-checkmark-outline', type: 'Permanent', category: 'Humanitarian',
    subclasses: ['851 – Resolution of Status'],
    conditions: ['Former holder of a temporary safe haven visa', 'Allows permanent residence', 'No new applications – existing cases only'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/resolution-of-status-851',
  },
  {
    code: '866', name: 'Protection (Permanent)', icon: 'shield-outline', type: 'Permanent', category: 'Humanitarian',
    subclasses: ['866 – Protection (onshore)'],
    conditions: ['Onshore application for protection', 'Meet refugee or complementary protection criteria', 'No other safe country to go to'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/protection-866',
  },

  // ─────────────────────────────────────────────────────────────────
  // BRIDGING VISAS (7 ACTIVE)
  // ─────────────────────────────────────────────────────────────────
  {
    code: '010', name: 'Bridging Visa A (BVA)', icon: 'timer-outline', type: 'Temporary', category: 'Bridging',
    subclasses: ['010 – Bridging Visa A'],
    conditions: ['Automatically granted in some cases when you apply for another visa', 'Allows lawful stay while substantive visa is processed', 'Must apply from inside Australia'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/bridging-visa-a-010',
  },
  {
    code: '020', name: 'Bridging Visa B (BVB)', icon: 'timer-outline', type: 'Temporary', category: 'Bridging',
    subclasses: ['020 – Bridging Visa B'],
    conditions: ['Allows travel outside Australia while substantive visa is being processed', 'Must return before BVB travel facility expires', 'Available to BVA holders'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/bridging-visa-b-020',
  },
  {
    code: '030', name: 'Bridging Visa C (BVC)', icon: 'timer-outline', type: 'Temporary', category: 'Bridging',
    subclasses: ['030 – Bridging Visa C'],
    conditions: ['Granted to unlawful non-citizens who apply for a visa', 'No work rights by default (can apply separately)', 'No travel outside Australia'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/bridging-visa-c-030',
  },
  {
    code: '050', name: 'Bridging Visa E (BVE) – General', icon: 'timer-outline', type: 'Temporary', category: 'Bridging',
    subclasses: ['050 – BVE (general)'],
    conditions: ['For people who need to resolve immigration status', 'May include people in the community awaiting removal', 'No work rights by default', 'No travel outside Australia'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/bridging-visa-e-050-051',
  },
  {
    code: '051', name: 'Bridging Visa E (BVE) – Specific', icon: 'timer-outline', type: 'Temporary', category: 'Bridging',
    subclasses: ['051 – BVE (specific circumstances)'],
    conditions: ['For people who need to resolve immigration status', 'Specific circumstances (work eligibility possible)', 'No travel outside Australia unless permitted'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/bridging-visa-e-050-051',
  },
  {
    code: '405', name: 'Investor Retirement Visa – REPEALED', icon: 'cash-outline', type: 'Repealed', category: 'Other',
    subclasses: ['405 – Investor Retirement (closed)'],
    conditions: ['CLOSED TO NEW APPLICATIONS', 'Required AUD 750K investment', 'Existing holders may extend in some states'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/repealed-visas/investor-retirement-visa-subclass-405',
  },
  {
    code: '444', name: 'Special Category (New Zealand Citizens)', icon: 'flag-outline', type: 'Temporary', category: 'Other',
    subclasses: ['444 – Special Category Visa'],
    conditions: ['New Zealand citizens arriving in Australia', 'Granted automatically at the border', 'Allows indefinite stay & work', 'Not a pathway to Australian citizenship directly'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/special-category-visa-subclass-444',
  },
  {
    code: '155', name: 'Resident Return Visa (5-year)', icon: 'return-down-back-outline', type: 'Temporary', category: 'Other',
    subclasses: ['155 – Resident Return (5-year)'],
    conditions: ['Current Australian permanent resident who has travelled abroad', 'Must apply if PR travel facility has expired', 'Strong ties to Australia'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/resident-return-visa-155-157',
  },
  {
    code: '157', name: 'Resident Return Visa (3-month)', icon: 'return-down-back-outline', type: 'Temporary', category: 'Other',
    subclasses: ['157 – Resident Return (3-month)'],
    conditions: ['Current Australian permanent resident for short-term re-entry', 'Short-term re-entry only', 'Renewal available if needed'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/resident-return-visa-155-157',
  },
  {
    code: '942', name: 'Crew Travel Authority', icon: 'boat-outline', type: 'Temporary', category: 'Other',
    subclasses: ['942 – Crew Travel Authority'],
    conditions: ['For crew members of ships or aircraft', 'Stay while vessel is in Australian waters/airport', 'Cannot engage in other work'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/crew-travel-authority-942',
  },
  {
    code: '988', name: 'Maritime Crew', icon: 'boat-outline', type: 'Temporary', category: 'Other',
    subclasses: ['988 – Maritime Crew'],
    conditions: ['Crew of foreign vessel in Australian waters', 'Granted automatically on arrival', 'Stay while vessel remains in Australian waters'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/maritime-crew-988',
  },

  // ─────────────────────────────────────────────────────────────────
  // HISTORICAL & REPEALED (9 REPEALED/CLOSED)
  // ─────────────────────────────────────────────────────────────────
  {
    code: '457', name: 'Temporary Work (Skilled) – REPEALED', icon: 'archive-outline', type: 'Repealed', category: 'Historical',
    subclasses: ['457 – Temporary Work (Skilled)'],
    conditions: ['REPEALED 18 March 2018', 'Replaced by Temporary Skill Shortage (482) visa', 'Transition arrangements applied for existing holders'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/repealed-visas/temporary-work-skilled-457',
  },
  {
    code: '476', name: 'Skilled Recognised Graduate – REPEALED', icon: 'archive-outline', type: 'Repealed', category: 'Historical',
    subclasses: ['476 – Skilled Recognised Graduate (Engineering)'],
    conditions: ['REPEALED 21 March 2021', 'Was for engineering graduates from recognised institutions', 'Replaced by post-study options under 485 visa'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/repealed-visas/skilled-recognised-graduate-visa-subclass-476',
  },
  {
    code: '489', name: 'Skilled Regional (Provisional) – CLOSED', icon: 'archive-outline', type: 'Repealed', category: 'Historical',
    subclasses: ['489 – Skilled Regional (Provisional)'],
    conditions: ['CLOSED TO NEW APPLICATIONS 16 November 2019', 'Replaced by Skilled Work Regional (491) visa', 'Transition to permanent 887 visa available for holders'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-regional-provisional-489',
  },
  {
    code: '808', name: 'Confirmatory Residence – REPEALED', icon: 'archive-outline', type: 'Repealed', category: 'Historical',
    subclasses: ['808 – Confirmatory (Residence)'],
    conditions: ['REPEALED', 'Was for permanent residents who lost status through administrative error', 'No new applications'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/repealed-visas/confirmatory-residence-subclass-808',
  },
  {
    code: '890', name: 'Business Owner – REPEALED', icon: 'archive-outline', type: 'Repealed', category: 'Historical',
    subclasses: ['890 – Business Owner'],
    conditions: ['REPEALED 1 July 2021', 'Replaced by Business Innovation and Investment visas (188/888)', 'No new applications accepted'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/repealed-visas/business-owner-subclass-890-visa',
  },
  {
    code: '891', name: 'Investor – REPEALED', icon: 'archive-outline', type: 'Repealed', category: 'Historical',
    subclasses: ['891 – Investor'],
    conditions: ['REPEALED 1 July 2021', 'Replaced by Business Innovation and Investment visas (188/888)', 'No new applications accepted'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/repealed-visas/investor-subclass-891-visa',
  },
  {
    code: '892', name: 'State/Territory Sponsored Business Owner – REPEALED', icon: 'archive-outline', type: 'Repealed', category: 'Historical',
    subclasses: ['892 – State/Territory Sponsored Business Owner'],
    conditions: ['REPEALED 1 July 2021', 'Replaced by Business Innovation and Investment visas (188/888)', 'No new applications accepted'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/repealed-visas/state-or-territory-sponsored-business-owner-subclass-892-visa',
  },
  {
    code: '893', name: 'State/Territory Sponsored Investor – REPEALED', icon: 'archive-outline', type: 'Repealed', category: 'Historical',
    subclasses: ['893 – State/Territory Sponsored Investor'],
    conditions: ['REPEALED 1 July 2021', 'Replaced by Business Innovation and Investment visas (188/888)', 'No new applications accepted'],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/repealed-visas/state-or-territory-sponsored-investor-subclass-893-visa',
  },
];

export const CATEGORY_META: Record<VisaCategory, { color: string; bg: string; icon: string }> = {
  Skilled:           { color: '#00C2FF', bg: 'rgba(0,194,255,0.12)',   icon: 'star-outline' },
  Employer:          { color: '#FFCD00', bg: 'rgba(255,205,0,0.12)',   icon: 'briefcase-outline' },
  Graduate:          { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', icon: 'ribbon-outline' },
  'Working Holiday': { color: '#00D68F', bg: 'rgba(0,214,143,0.12)',   icon: 'sunny-outline' },
  Business:          { color: '#F97316', bg: 'rgba(249,115,22,0.12)',   icon: 'trending-up-outline' },
  Family:            { color: '#FF6B8A', bg: 'rgba(255,107,154,0.12)', icon: 'heart-outline' },
  Student:           { color: '#FFB800', bg: 'rgba(255,184,0,0.12)',   icon: 'school-outline' },
  Visitor:           { color: '#7A9BBF', bg: 'rgba(255,255,255,0.08)', icon: 'airplane-outline' },
  Humanitarian:      { color: '#FF4757', bg: 'rgba(255,71,87,0.12)',   icon: 'shield-outline' },
  Bridging:          { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', icon: 'timer-outline' },
  Other:             { color: '#64748B', bg: 'rgba(100,116,139,0.12)', icon: 'ellipsis-horizontal-outline' },
  Historical:        { color: '#6B7280', bg: 'rgba(107,114,128,0.12)', icon: 'archive-outline' },
};

export const ALL_CATEGORIES: VisaCategory[] = [
  'Skilled', 'Employer', 'Graduate', 'Working Holiday', 'Business',
  'Family', 'Student', 'Visitor', 'Humanitarian', 'Bridging', 'Other', 'Historical',
];
