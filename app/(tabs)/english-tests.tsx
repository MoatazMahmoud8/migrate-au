import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useColors } from '../../constants/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ProficiencyLevel {
  label: string;
  score: string;
  description: string;
  pointsBonus?: string;
  color: string;
}

interface VisaReq {
  code: string;
  name: string;
  color: string;
  level: string;
  score: string;
  notes: string[];
  url: string;
}

interface TestCenter {
  label: string;
  sublabel: string;
  url: string;
  badge?: string;
}

interface TestData {
  name: string;
  full: string;
  icon: string;
  color: string;
  format: string;
  delivery: string;
  validity: string;
  scoreRange: string;
  website: string;
  overview: string;
  proficiency: ProficiencyLevel[];
  visaRequirements: VisaReq[];
  centers: TestCenter[];
}

// ─── Data ──────────────────────────────────────────────────────────────────

const TESTS: TestData[] = [
  {
    name: 'IELTS',
    full: 'International English Language Testing System',
    icon: 'document-text-outline',
    color: '#4F8EF7',
    format: 'Paper-based & Computer-delivered',
    delivery: 'Test centre',
    validity: '2 years',
    scoreRange: '0–9 band scale (L · R · W · S)',
    website: 'https://www.ielts.org',
    overview: 'The most widely accepted English test for Australian skilled visas. Four skills assessed separately — all four bands must individually meet the minimum, no averaging allowed.',
    proficiency: [
      { label: 'Vocational', score: '5.0 avg · no band below 4.5', description: 'SC 482 Short-term stream', color: '#FF7043' },
      { label: 'Functional', score: '4.5 avg · no band below 4.0', description: 'SC 820/801 Partner visa', color: '#FFB800' },
      { label: 'Competent',  score: '6.0 in each band',            description: 'Minimum for most skilled & employer visas', pointsBonus: '0 pts', color: Colors.accent },
      { label: 'Proficient', score: '7.0 in each band',            description: 'EOI bonus points', pointsBonus: '+10 pts', color: Colors.secondary },
      { label: 'Superior',   score: '8.0 in each band',            description: 'EOI bonus points', pointsBonus: '+20 pts', color: '#FF6B8A' },
    ],
    visaRequirements: [
      { code: '189',     name: 'Skilled Independent',      color: '#4F8EF7', level: 'Competent',  score: '6.0 each band',       notes: ['All 4 bands must individually meet 6.0 — no averaging', 'Proficient (7.0) earns +10 pts in EOI', 'Superior (8.0) earns +20 pts in EOI'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189' },
      { code: '190',     name: 'Skilled Nominated',        color: '#00C2FF', level: 'Competent',  score: '6.0 each band',       notes: ['Same band rule as 189 — no averaging', 'State may require higher English for nomination'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190' },
      { code: '491',     name: 'Skilled Work Regional',    color: '#A78BFA', level: 'Competent',  score: '6.0 each band',       notes: ['Same as 189/190 minimum', 'Regional sponsor may impose higher requirements'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491' },
      { code: '482',     name: 'Skills in Demand (TSS)',   color: '#FF6B8A', level: 'Vocational', score: '5.0 avg · 4.5 min',   notes: ['Short-term stream: 5.0 avg, no band below 4.5', 'Core Skills & Specialist streams: Competent (6.0 each)'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482' },
      { code: '186',     name: 'Employer Nominated (ENS)', color: '#FF7043', level: 'Competent',  score: '6.0 each band',       notes: ['Direct Entry stream: 6.0 in each band', 'Result must be no more than 3 years old'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186' },
      { code: '485',     name: 'Temporary Graduate',       color: '#00D68F', level: 'Competent',  score: '6.0 each band',       notes: ['Waived if 2+ years of study completed in Australia', 'Test must be taken within 3 years of application date'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485' },
      { code: '820/801', name: 'Partner Visa',             color: '#FFB800', level: 'Functional', score: '4.5 avg · 4.0 min',   notes: ['Functional English or pay language fee (BIIP)', 'Sponsor may waive in some circumstances'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-820-801' },
      { code: '500',     name: 'Student Visa',             color: '#7C3AED', level: 'Varies',     score: 'Set by institution',  notes: ['University degrees: typically IELTS 6.0–6.5', 'TAFE/VET: typically 5.5', 'English schools: typically 4.5–5.5'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500' },
    ],
    centers: [
      { label: 'IDP Australia — Book IELTS',      sublabel: 'Official administrator · real-time seat availability', url: 'https://ielts.idp.com/australia', badge: 'Official' },
      { label: 'British Council Australia',       sublabel: 'Co-owner of IELTS · centres in major cities',         url: 'https://www.britishcouncil.org.au/exam/ielts', badge: 'Official' },
      { label: 'IELTS.org — Test Centre Search',  sublabel: 'Find any approved venue worldwide',                    url: 'https://www.ielts.org' },
    ],
  },
  {
    name: 'PTE',
    full: 'Pearson Test of English Academic',
    icon: 'laptop-outline',
    color: '#00C2FF',
    format: 'Computer-based (AI-scored)',
    delivery: 'Test centre',
    validity: 'No official expiry (DHA accepts up to 3 years)',
    scoreRange: '10–90 per communicative skill',
    website: 'https://www.pearsonpte.com',
    overview: 'Fully computer-based and AI-scored. Fast results (usually 48 hrs). Accepted by all Australian skilled visa types. Each of the four communicative skills must individually meet the minimum.',
    proficiency: [
      { label: 'Vocational', score: '36 in each communicative skill', description: 'SC 482 Short-term stream', color: '#FF7043' },
      { label: 'Competent',  score: '50 in each communicative skill', description: 'Minimum for skilled & employer visas', pointsBonus: '0 pts', color: Colors.accent },
      { label: 'Proficient', score: '65 in each communicative skill', description: 'EOI bonus points', pointsBonus: '+10 pts', color: Colors.secondary },
      { label: 'Superior',   score: '79 in each communicative skill', description: 'EOI bonus points', pointsBonus: '+20 pts', color: '#FF6B8A' },
    ],
    visaRequirements: [
      { code: '189', name: 'Skilled Independent',      color: '#4F8EF7', level: 'Competent',  score: '50 each skill', notes: ['All 4 skills must individually reach 50 — no averaging', 'Proficient (65) earns +10 pts; Superior (79) earns +20 pts'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189' },
      { code: '190', name: 'Skilled Nominated',        color: '#00C2FF', level: 'Competent',  score: '50 each skill', notes: ['Same as 189 — each skill must individually reach 50', 'State nomination may require higher scores'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190' },
      { code: '491', name: 'Skilled Work Regional',    color: '#A78BFA', level: 'Competent',  score: '50 each skill', notes: ['Same as 189/190 minimum', 'Regional sponsor may require higher scores'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491' },
      { code: '482', name: 'Skills in Demand (TSS)',   color: '#FF6B8A', level: 'Vocational', score: '36 each skill', notes: ['Short-term stream: 36 in each skill', 'Core Skills & Specialist streams: 50 in each skill'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482' },
      { code: '186', name: 'Employer Nominated (ENS)', color: '#FF7043', level: 'Competent',  score: '50 each skill', notes: ['50 in each communicative skill', 'Results accepted up to 3 years from application date'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186' },
      { code: '485', name: 'Temporary Graduate',       color: '#00D68F', level: 'Competent',  score: '50 each skill', notes: ['Waived if 2+ years of Australian study completed', 'Must be within 3 years of application'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485' },
      { code: '500', name: 'Student Visa',             color: '#7C3AED', level: 'Varies',     score: 'Set by institution', notes: ['Minimum set by education provider, not DHA', 'Most universities: equivalent to IELTS 6.0–6.5'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500' },
    ],
    centers: [
      { label: 'Pearson PTE — Book a Test', sublabel: 'Computer-based · centres in all major Australian cities', url: 'https://www.pearsonpte.com/pte-academic', badge: 'Official' },
    ],
  },
  {
    name: 'TOEFL iBT',
    full: 'Test of English as a Foreign Language – Internet-Based',
    icon: 'school-outline',
    color: '#FF6B8A',
    format: 'Internet-based (iBT)',
    delivery: 'Test centre & At-home option',
    validity: '2 years',
    scoreRange: 'R 0–30 · L 0–30 · W 0–30 · S 0–30 (Total 0–120)',
    website: 'https://www.ets.org/toefl',
    overview: 'Internet-based test accepted for most skilled visas. Note: TOEFL iBT does not qualify for Superior English (+20 pts) bonus in EOI. Available at test centres and via home delivery option.',
    proficiency: [
      { label: 'Vocational', score: 'R 3 · L 3 · W 14 · S 12',  description: 'SC 482 Short-term stream', color: '#FF7043' },
      { label: 'Competent',  score: 'R 24 · L 21 · W 27 · S 23', description: 'Minimum for skilled & employer visas', pointsBonus: '0 pts', color: Colors.accent },
      { label: 'Proficient', score: 'R 24 · L 24 · W 27 · S 23', description: 'EOI bonus points', pointsBonus: '+10 pts', color: Colors.secondary },
      { label: 'Superior',   score: 'Not applicable',              description: 'TOEFL iBT does not qualify for Superior English', color: '#6B7280' },
    ],
    visaRequirements: [
      { code: '189', name: 'Skilled Independent',      color: '#4F8EF7', level: 'Competent',  score: 'R 24 · L 21 · W 27 · S 23', notes: ['Each section score must meet the minimum individually', 'Proficient qualifies for +10 pts; Superior NOT available via TOEFL iBT'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189' },
      { code: '190', name: 'Skilled Nominated',        color: '#00C2FF', level: 'Competent',  score: 'R 24 · L 21 · W 27 · S 23', notes: ['Same as 189 per-section minimums', 'State nomination may require higher scores'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190' },
      { code: '491', name: 'Skilled Work Regional',    color: '#A78BFA', level: 'Competent',  score: 'R 24 · L 21 · W 27 · S 23', notes: ['Same as 189/190 Competent minimums', 'TOEFL iBT does not qualify for Superior English level'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491' },
      { code: '482', name: 'Skills in Demand (TSS)',   color: '#FF6B8A', level: 'Vocational', score: 'R 3 · L 3 · W 14 · S 12',   notes: ['Short-term stream: vocational minimums per section', 'Core Skills & Specialist: R 24 · L 21 · W 27 · S 23'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482' },
      { code: '186', name: 'Employer Nominated (ENS)', color: '#FF7043', level: 'Competent',  score: 'R 24 · L 21 · W 27 · S 23', notes: ['Each section must meet the minimum individually', 'Valid for up to 3 years from test date'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186' },
      { code: '485', name: 'Temporary Graduate',       color: '#00D68F', level: 'Competent',  score: 'R 24 · L 21 · W 27 · S 23', notes: ['Test waived if 2+ years of Australian study', 'Must be within 3 years of application date'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485' },
    ],
    centers: [
      { label: 'ETS — Find TOEFL Test Centres', sublabel: 'At-home & test centre options across Australia', url: 'https://www.ets.org/toefl/test-takers/ibt/about/', badge: 'Official' },
    ],
  },
  {
    name: 'Cambridge C1',
    full: 'Cambridge C1 Advanced English (CAE)',
    icon: 'ribbon-outline',
    color: '#A78BFA',
    format: 'Paper-based & Computer-based',
    delivery: 'Approved test centre',
    validity: 'Results do not expire (DHA accepts)',
    scoreRange: 'Cambridge Scale 100–210 per component',
    website: 'https://www.cambridgeenglish.org',
    overview: 'Globally recognised academic English certificate. Cambridge Scale scores map to CEFR levels. Each component must individually meet the minimum — no overall average accepted by DHA.',
    proficiency: [
      { label: 'Vocational', score: '154 in each component', description: 'SC 482 Short-term stream', color: '#FF7043' },
      { label: 'Competent',  score: '169 in each component', description: 'Minimum for skilled & employer visas', pointsBonus: '0 pts', color: Colors.accent },
      { label: 'Proficient', score: '185 in each component', description: 'EOI bonus points', pointsBonus: '+10 pts', color: Colors.secondary },
      { label: 'Superior',   score: '200 in each component', description: 'EOI bonus points', pointsBonus: '+20 pts', color: '#FF6B8A' },
    ],
    visaRequirements: [
      { code: '189', name: 'Skilled Independent',      color: '#4F8EF7', level: 'Competent',  score: '169 each component', notes: ['Each component (L, R, W, S, Use of English) must reach 169', 'Proficient (185) earns +10 pts; Superior (200) earns +20 pts'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189' },
      { code: '190', name: 'Skilled Nominated',        color: '#00C2FF', level: 'Competent',  score: '169 each component', notes: ['Same as 189 — each component individually', 'State/territory nomination may set higher requirement'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190' },
      { code: '491', name: 'Skilled Work Regional',    color: '#A78BFA', level: 'Competent',  score: '169 each component', notes: ['Same as 189/190 minimum per component', 'Regional sponsor may require higher scores'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491' },
      { code: '482', name: 'Skills in Demand (TSS)',   color: '#FF6B8A', level: 'Vocational', score: '154 each component', notes: ['Short-term stream: 154 each component', 'Core Skills & Specialist streams: 169 each component'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482' },
      { code: '186', name: 'Employer Nominated (ENS)', color: '#FF7043', level: 'Competent',  score: '169 each component', notes: ['Each component must meet 169 individually', 'Cambridge results do not have an expiry date'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186' },
      { code: '485', name: 'Temporary Graduate',       color: '#00D68F', level: 'Competent',  score: '169 each component', notes: ['Waived if 2+ years of Australian study completed', 'Test must be within 3 years of application'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485' },
    ],
    centers: [
      { label: 'Cambridge English — Find a Centre', sublabel: 'Search approved exam centres across Australia', url: 'https://www.cambridgeenglish.org/find-a-centre/', badge: 'Official' },
    ],
  },
  {
    name: 'CELPIP',
    full: 'Canadian English Language Proficiency Index Program',
    icon: 'flag-outline',
    color: '#FF6B8A',
    format: 'Computer-based',
    delivery: 'Designated test centres',
    validity: '2 years',
    scoreRange: 'Level 1–9 per skill (R · W · L · S)',
    website: 'https://www.celpip.ca',
    overview: 'Computer-based English test accepted by DHA for Australian skilled visas. CELPIP scores each of the four communicative skills separately — all must individually meet the minimum. Note: CELPIP does not qualify for Superior English (+20 pts) bonus.',
    proficiency: [
      { label: 'Vocational', score: '4 in each skill', description: 'SC 482 Short-term stream', color: '#FF7043' },
      { label: 'Competent',  score: '7 in each skill', description: 'Minimum for skilled & employer visas', pointsBonus: '0 pts', color: Colors.accent },
      { label: 'Proficient', score: '8 in each skill', description: 'EOI bonus points', pointsBonus: '+10 pts', color: Colors.secondary },
      { label: 'Superior',   score: 'Not applicable',  description: 'CELPIP does not qualify for Superior English level', color: '#6B7280' },
    ],
    visaRequirements: [
      { code: '189', name: 'Skilled Independent',      color: '#4F8EF7', level: 'Competent',  score: '7 in each skill', notes: ['All 4 skills must individually reach Level 7 — no averaging', 'Proficient (8) earns +10 pts; Superior NOT available via CELPIP'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189' },
      { code: '190', name: 'Skilled Nominated',        color: '#00C2FF', level: 'Competent',  score: '7 in each skill', notes: ['Same as 189 — each skill must individually reach 7', 'State nomination may require higher scores'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190' },
      { code: '491', name: 'Skilled Work Regional',    color: '#A78BFA', level: 'Competent',  score: '7 in each skill', notes: ['Same as 189/190 minimum per skill', 'Regional sponsor may require higher scores'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491' },
      { code: '482', name: 'Skills in Demand (TSS)',   color: '#FF6B8A', level: 'Vocational', score: '4 in each skill', notes: ['Short-term stream: 4 in each skill', 'Core Skills & Specialist streams: 7 in each skill'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482' },
      { code: '186', name: 'Employer Nominated (ENS)', color: '#FF7043', level: 'Competent',  score: '7 in each skill', notes: ['Each skill must individually meet 7', 'Results must not be more than 2 years old at time of application'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186' },
      { code: '485', name: 'Temporary Graduate',       color: '#00D68F', level: 'Competent',  score: '7 in each skill', notes: ['Waived if 2+ years of Australian study completed', 'Test must be within 2 years of application'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485' },
    ],
    centers: [
      { label: 'CELPIP — Book a Test', sublabel: 'Computer-delivered · centres across Australia', url: 'https://www.celpip.ca/', badge: 'Official' },
    ],
  },
  {
    name: 'OET',
    full: 'Occupational English Test (Healthcare Only)',
    icon: 'medkit-outline',
    color: '#00D68F',
    format: 'Computer-based & Paper-based',
    delivery: 'Test centre',
    validity: '2 years',
    scoreRange: '0–500 per sub-test (A · B · C · D)',
    website: 'https://oet.com',
    overview: 'Designed exclusively for healthcare professionals. Accepted by DHA for health-related occupations applying for skilled and employer-sponsored visas. OET does not qualify for Superior English (+20 pts) in EOI.',
    proficiency: [
      { label: 'Competent',  score: 'B in each sub-test', description: 'Minimum for skilled & employer visas (healthcare occupations)', pointsBonus: '0 pts', color: Colors.accent },
      { label: 'Proficient', score: 'B in each sub-test', description: 'Same score required — does not earn additional EOI points via OET', pointsBonus: '+10 pts*', color: Colors.secondary },
      { label: 'Superior',   score: 'Not applicable',     description: 'OET does not qualify for Superior English level', color: '#6B7280' },
    ],
    visaRequirements: [
      { code: '189', name: 'Skilled Independent',      color: '#4F8EF7', level: 'Competent', score: 'B in each sub-test', notes: ['Available for health professions on MLTSSL/STSOL', 'B in all four sub-tests (L, R, W, S)', 'OET does not qualify for Superior (+20 pts) English'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189' },
      { code: '190', name: 'Skilled Nominated',        color: '#00C2FF', level: 'Competent', score: 'B in each sub-test', notes: ['Same requirement as 189 for health professions', 'State/territory may require additional evidence'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190' },
      { code: '491', name: 'Skilled Work Regional',    color: '#A78BFA', level: 'Competent', score: 'B in each sub-test', notes: ['B in all four OET sub-tests', 'Healthcare occupations on the relevant skilled list only'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491' },
      { code: '482', name: 'Skills in Demand (TSS)',   color: '#FF6B8A', level: 'Competent', score: 'B in each sub-test', notes: ['Available for healthcare occupations under Core Skills / Specialist streams', 'B in all four sub-tests required'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482' },
      { code: '186', name: 'Employer Nominated (ENS)', color: '#FF7043', level: 'Competent', score: 'B in each sub-test', notes: ['B in each of the four OET sub-tests', 'Result must not be more than 2 years old at time of application'], url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186' },
    ],
    centers: [
      { label: 'OET — Book a Test', sublabel: 'Computer-delivered · healthcare professionals only', url: 'https://oet.com/', badge: 'Official' },
    ],
  },
];

// ─── Helper ────────────────────────────────────────────────────────────────

function OverviewRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={ov.row}>
      <Ionicons name={icon as any} size={13} color={Colors.textMuted} style={{ width: 18 }} />
      <Text style={[ov.label, {color: Colors.textPrimary}]}>{label}</Text>
      <Text style={[ov.value, {color: Colors.textPrimary}]}>{value}</Text>
    </View>
  );
}

const ov = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  label: { fontSize: FontSize.xs, color: Colors.textMuted, width: 86 },
  value: { flex: 1, fontSize: FontSize.xs, color: Colors.textPrimary, fontWeight: FontWeight.semiBold as any, textAlign: 'right' },
});

// ─── Screen ────────────────────────────────────────────────────────────────

export default function EnglishTestsScreen() {
  const Colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedTest, setSelectedTest] = useState<TestData | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expandedVisa, setExpandedVisa] = useState<string | null>(null);

  const selectTest = (t: TestData) => {
    setSelectedTest(t);
    setDropdownOpen(false);
    setExpandedVisa(null);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.background]}
        style={[styles.header, { paddingTop: insets.top + 60 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerBadge}>
          <Ionicons name="language" size={14} color={Colors.accent} />
          <Text style={[styles.headerBadgeText, {color: Colors.textPrimary}]}>DHA Approved Tests</Text>
        </View>
        <Text style={[styles.headerTitle, {color: Colors.textPrimary}]}>English Requirements</Text>
        <Text style={[styles.headerSub, {color: Colors.textPrimary}]}>
          Select a test to see proficiency levels, visa score requirements and booking centres.
        </Text>
      </LinearGradient>

      {/* ── Test selector ── */}
      <View style={styles.selectorSection}>
        <Text style={[styles.selectorLabel, {color: Colors.textPrimary}]}>Select an approved test</Text>

        <TouchableOpacity
          style={[
            styles.selectorBtn,
            dropdownOpen && styles.selectorBtnOpen,
            selectedTest ? { borderColor: selectedTest.color + '60' } : null,
          ]}
          onPress={() => setDropdownOpen(!dropdownOpen)}
          activeOpacity={0.85}
        >
          <View style={[styles.selectorIcon, { backgroundColor: selectedTest ? selectedTest.color + '18' : 'rgba(255,255,255,0.06)' }]}>
            <Ionicons
              name={(selectedTest ? selectedTest.icon : 'list-outline') as any}
              size={16}
              color={selectedTest ? selectedTest.color : Colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            {selectedTest ? (
              <>
                <Text style={[styles.selectorName, { color: selectedTest.color }]}>{selectedTest.name}</Text>
                <Text style={[styles.selectorFull, {color: Colors.textPrimary}]} numberOfLines={1}>{selectedTest.full}</Text>
              </>
            ) : (
              <Text style={[styles.selectorPlaceholder, {color: Colors.textPrimary}]}>Choose a test…</Text>
            )}
          </View>
          <Ionicons
            name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={selectedTest ? selectedTest.color : Colors.textMuted}
          />
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={[styles.dropdown, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            {TESTS.map((t, i) => (
              <TouchableOpacity
                key={t.name}
                style={[
                  styles.dropdownItem,
                  i < TESTS.length - 1 && styles.dropdownDivider,
                  selectedTest?.name === t.name ? { backgroundColor: t.color + '10' } : null,
                ]}
                onPress={() => selectTest(t)}
                activeOpacity={0.8}
              >
                <View style={[styles.dropdownIcon, { backgroundColor: t.color + '18' }]}>
                  <Ionicons name={t.icon as any} size={15} color={t.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dropdownName, { color: t.color }]}>{t.name}</Text>
                  <Text style={[styles.dropdownFull, {color: Colors.textPrimary}]} numberOfLines={1}>{t.full}</Text>
                </View>
                {selectedTest?.name === t.name && (
                  <Ionicons name="checkmark-circle" size={16} color={t.color} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── Empty state ── */}
      {!selectedTest && !dropdownOpen && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="language-outline" size={32} color={Colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, {color: Colors.textPrimary}]}>6 DHA-approved tests</Text>
          <Text style={[styles.emptySub, {color: Colors.textPrimary}]}>
            Select a test above to see proficiency scores, visa requirements and how to book.
          </Text>
          <View style={styles.emptyPills}>
            {TESTS.map((t) => (
              <TouchableOpacity
                key={t.name}
                style={[styles.emptyPill, { borderColor: t.color + '50', backgroundColor: t.color + '10' }]}
                onPress={() => selectTest(t)}
                activeOpacity={0.8}
              >
                <Ionicons name={t.icon as any} size={12} color={t.color} />
                <Text style={[styles.emptyPillText, { color: t.color }]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Detail card ── */}
      {selectedTest && (
        <View style={styles.detailWrap}>
          {/* ① Overview */}
          <View style={[styles.card, { borderColor: selectedTest.color + '35' }]}>
            <View style={[styles.cardTopStrip, { backgroundColor: selectedTest.color }]} />
            <View style={styles.cardInner}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.cardTitleIcon, { backgroundColor: selectedTest.color + '18' }]}>
                  <Ionicons name={selectedTest.icon as any} size={20} color={selectedTest.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardMainTitle, { color: selectedTest.color }]}>{selectedTest.name}</Text>
                  <Text style={[styles.cardFullName, {color: Colors.textPrimary}]}>{selectedTest.full}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.webBtn, { borderColor: selectedTest.color + '40' }]}
                  onPress={() => Linking.openURL(selectedTest.website)}
                >
                  <Ionicons name="open-outline" size={12} color={selectedTest.color} />
                  <Text style={[styles.webBtnText, { color: selectedTest.color }]}>Website</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.overviewText, {color: Colors.textPrimary}]}>{selectedTest.overview}</Text>

              <OverviewRow icon="construct-outline"  label="Format"      value={selectedTest.format} />
              <OverviewRow icon="location-outline"   label="Delivery"    value={selectedTest.delivery} />
              <OverviewRow icon="time-outline"       label="Validity"    value={selectedTest.validity} />
              <OverviewRow icon="bar-chart-outline"  label="Score range" value={selectedTest.scoreRange} />
            </View>
          </View>

          {/* ② Proficiency levels */}
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={styles.cardInner}>
              <Text style={[styles.sectionHead, {color: Colors.textPrimary}]}>Proficiency Levels</Text>
              <Text style={[styles.sectionSub, {color: Colors.textPrimary}]}>DHA-defined thresholds for {selectedTest.name}</Text>
              {selectedTest.proficiency.map((lv) => (
                <View key={lv.label} style={[styles.levelRow, { borderLeftColor: lv.color }]}>
                  <View style={styles.levelTop}>
                    <Text style={[styles.levelName, { color: lv.color }]}>{lv.label}</Text>
                    {lv.pointsBonus && (
                      <View style={[styles.bonusBadge, { backgroundColor: lv.color + '18', borderColor: lv.color + '40' }]}>
                        <Text style={[styles.bonusText, { color: lv.color }]}>{lv.pointsBonus}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.levelScore, {color: Colors.textPrimary}]}>{lv.score}</Text>
                  <Text style={[styles.levelDesc, {color: Colors.textPrimary}]}>{lv.description}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ③ Visa requirements */}
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={styles.cardInner}>
              <Text style={[styles.sectionHead, {color: Colors.textPrimary}]}>Visa Subclass Requirements</Text>
              <Text style={[styles.sectionSub, {color: Colors.textPrimary}]}>Minimum {selectedTest.name} scores per visa — tap to expand</Text>
              {selectedTest.visaRequirements.map((v) => {
                const open = expandedVisa === v.code;
                return (
                  <TouchableOpacity
                    key={v.code}
                    style={[styles.visaRow, open && styles.visaRowOpen]}
                    onPress={() => setExpandedVisa(open ? null : v.code)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.visaStrip, { backgroundColor: v.color }]} />
                    <View style={styles.visaBody}>
                      <View style={styles.visaTop}>
                        <View style={[styles.visaCodePill, { backgroundColor: v.color + '18', borderColor: v.color + '30' }]}>
                          <Text style={[styles.visaCode, { color: v.color }]}>{v.code}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.visaName, {color: Colors.textPrimary}]}>{v.name}</Text>
                          <View style={styles.visaScoreRow}>
                            <Ionicons name="checkmark-circle-outline" size={11} color={v.color} />
                            <Text style={[styles.visaScore, { color: v.color }]}>{v.score}</Text>
                          </View>
                        </View>
                        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
                      </View>
                      {open && (
                        <View style={styles.visaNotes}>
                          {v.notes.map((n, i) => (
                            <View key={i} style={styles.noteRow}>
                              <View style={[styles.noteDot, { backgroundColor: v.color }]} />
                              <Text style={[styles.noteText, {color: Colors.textPrimary}]}>{n}</Text>
                            </View>
                          ))}
                          <TouchableOpacity
                            style={[styles.dhaBtn, { borderColor: v.color + '40', backgroundColor: v.color + '08' }]}
                            onPress={() => Linking.openURL(v.url)}
                          >
                            <Ionicons name="open-outline" size={12} color={v.color} />
                            <Text style={[styles.dhaBtnText, { color: v.color }]}>View on DHA website</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ④ Test centres */}
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={styles.cardInner}>
              <Text style={[styles.sectionHead, {color: Colors.textPrimary}]}>Book a Test</Text>
              <Text style={[styles.sectionSub, {color: Colors.textPrimary}]}>Official booking portals for {selectedTest.name}</Text>
              {selectedTest.centers.map((c) => (
                <TouchableOpacity
                  key={c.url}
                  style={[styles.centerRow, { borderColor: selectedTest.color + '30' }]}
                  onPress={() => Linking.openURL(c.url)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.centerIcon, { backgroundColor: selectedTest.color + '18' }]}>
                    <Ionicons name="location-outline" size={16} color={selectedTest.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.centerLabel, {color: Colors.textPrimary}]}>{c.label}</Text>
                    <Text style={[styles.centerSub, {color: Colors.textPrimary}]}>{c.sublabel}</Text>
                  </View>
                  <View style={styles.centerRight}>
                    {c.badge && (
                      <View style={[styles.officialBadge, { backgroundColor: selectedTest.color + '18', borderColor: selectedTest.color + '30' }]}>
                        <Text style={[styles.officialBadgeText, { color: selectedTest.color }]}>{c.badge}</Text>
                      </View>
                    )}
                    <Ionicons name="open-outline" size={15} color={Colors.textMuted} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Partner banner */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.partnerBanner}
        onPress={() => Linking.openURL('mailto:support@jsmglobal.xyz?subject=Test%20Centre%20Partnership%20Enquiry')}
      >
        <LinearGradient colors={['#0A1A2E', '#0D2240']} style={styles.partnerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.partnerLeft}>
            <View style={styles.partnerIconWrap}>
              <Ionicons name="megaphone-outline" size={18} color={Colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.partnerTitle, {color: Colors.textPrimary}]}>Are you a test prep centre?</Text>
              <Text style={[styles.partnerSub, {color: Colors.textPrimary}]}>Reach thousands of skilled migration applicants — tap to get in touch</Text>
            </View>
          </View>
          <View style={styles.partnerCta}>
            <Ionicons name="mail-outline" size={14} color={Colors.secondary} />
            <Text style={[styles.partnerCtaText, {color: Colors.textPrimary}]}>Partner with us</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <Ionicons name="alert-circle-outline" size={14} color={Colors.textMuted} />
        <Text style={[styles.disclaimerText, {color: Colors.textPrimary}]}>
          Requirements may change. Always verify on{' '}
          <Text style={[styles.disclaimerLink, {color: Colors.textPrimary}]} onPress={() => Linking.openURL('https://immi.homeaffairs.gov.au')}>immi.homeaffairs.gov.au</Text>
          {' '}or consult a{' '}
          <Text style={[styles.disclaimerLink, {color: Colors.textPrimary}]} onPress={() => Linking.openURL('https://portal.mara.gov.au')}>MARA-registered agent</Text>.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  backBtn: {
    position: 'absolute', top: 0, left: Spacing.lg,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.glass, alignItems: 'center', justifyContent: 'center',
  },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.glassStrong, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: Spacing.md,
  },
  headerBadgeText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.semiBold as any },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold as any, color: Colors.textPrimary, marginBottom: Spacing.sm },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  selectorSection: { paddingHorizontal: Spacing.xl, marginTop: Spacing.xl },
  selectorLabel: {
    fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semiBold as any,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: Spacing.sm,
  },
  selectorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  selectorBtnOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  selectorIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  selectorName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold as any },
  selectorFull: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  selectorPlaceholder: { fontSize: FontSize.sm, color: Colors.textMuted },

  dropdown: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderTopWidth: 0, borderColor: Colors.border,
    borderBottomLeftRadius: Radius.lg, borderBottomRightRadius: Radius.lg,
    overflow: 'hidden',
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md + 2 },
  dropdownDivider: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  dropdownIcon: { width: 34, height: 34, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  dropdownName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold as any },
  dropdownFull: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },

  emptyState: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxxl, paddingBottom: Spacing.xl },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
  },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold as any, color: Colors.textPrimary, marginBottom: Spacing.xs },
  emptySub: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  emptyPills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  emptyPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1 },
  emptyPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold as any },

  detailWrap: { paddingHorizontal: Spacing.xl, marginTop: Spacing.xl, gap: Spacing.lg },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  cardTopStrip: { height: 3 },
  cardInner: { padding: Spacing.lg },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  cardTitleIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardMainTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold as any },
  cardFullName: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, lineHeight: 16 },
  webBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
  },
  webBtnText: { fontSize: 10, fontWeight: FontWeight.semiBold as any },
  overviewText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.md },

  sectionHead: { fontSize: FontSize.md, fontWeight: FontWeight.bold as any, color: Colors.textPrimary, marginBottom: 2 },
  sectionSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.md },

  levelRow: {
    borderLeftWidth: 3, paddingLeft: Spacing.md,
    paddingVertical: Spacing.sm, marginBottom: Spacing.sm,
  },
  levelTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 3 },
  levelName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold as any },
  bonusBadge: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  bonusText: { fontSize: 10, fontWeight: FontWeight.bold as any },
  levelScore: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semiBold as any },
  levelDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  visaRow: {
    flexDirection: 'row', backgroundColor: Colors.background,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden', marginBottom: Spacing.sm,
  },
  visaRowOpen: { borderColor: Colors.divider },
  visaStrip: { width: 3 },
  visaBody: { flex: 1, padding: Spacing.md },
  visaTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  visaCodePill: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3, minWidth: 50, alignItems: 'center' },
  visaCode: { fontSize: 10, fontWeight: FontWeight.bold as any },
  visaName: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold as any, color: Colors.textPrimary },
  visaScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  visaScore: { fontSize: 11, fontWeight: FontWeight.bold as any },
  visaNotes: { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: Spacing.md, gap: Spacing.sm },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  noteDot: { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
  noteText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  dhaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    alignSelf: 'flex-start', marginTop: Spacing.xs,
  },
  dhaBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold as any },

  centerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  centerIcon: { width: 38, height: 38, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  centerLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold as any, color: Colors.textPrimary },
  centerSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  centerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  officialBadge: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  officialBadgeText: { fontSize: 10, fontWeight: FontWeight.bold as any },

  partnerBanner: {
    marginHorizontal: Spacing.xl, marginTop: Spacing.xl,
    borderRadius: Radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,205,0,0.2)',
  },
  partnerGrad: { padding: Spacing.xl },
  partnerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  partnerIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,205,0,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,205,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  partnerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold as any, color: Colors.textPrimary },
  partnerSub: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16, marginTop: 2 },
  partnerCta: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(255,205,0,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,205,0,0.25)',
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  partnerCtaText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold as any, color: Colors.secondary },

  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    marginHorizontal: Spacing.xl, marginTop: Spacing.xl,
    padding: Spacing.md, backgroundColor: Colors.glass, borderRadius: Radius.md,
  },
  disclaimerText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },
  disclaimerLink: { color: Colors.accent, textDecorationLine: 'underline' },
});
