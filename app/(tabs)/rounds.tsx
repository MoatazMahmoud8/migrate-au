import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../constants/theme';
import { useColors } from '../../constants/ThemeContext';
import { openExternalUrl } from '../../utils/openExternalUrl';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OccupationScore {
  name: string;
  anzsco?: string;
  sc189: number | null;
  sc491Family: number | null;
}

// ANZSCO code map for occupation name → code lookup
const ANZSCO_MAP: Record<string, string> = {
  'Actuary': '224111',
  'Agricultural Consultant': '234111',
  'Agricultural Scientist': '234112',
  'Airconditioning and Mechanical Services Plumber': '334112',
  'Architect': '232111',
  'Artistic Director': '212111',
  'Arts Administrator or Manager': '139911',
  'Audiologist': '252711',
  'Automotive Electrician': '321211',
  'Barrister': '271111',
  'Biochemist': '234513',
  'Biotechnologist': '234514',
  'Boat Builder and Repairer': '399111',
  'Botanist': '234515',
  'Bricklayer': '331111',
  'Cabinetmaker': '394111',
  'Cardiologist': '253312',
  'Carpenter': '331212',
  'Carpenter and Joiner': '331211',
  'Cartographer': '232213',
  'Chemical Engineer': '233111',
  'Chemist': '234211',
  'Child Care Centre Manager': '134111',
  'Chiropractor': '252111',
  'Civil Engineering Draftsperson': '312211',
  'Civil Engineering Technician': '312212',
  'Clinical Psychologist': '272311',
  'Construction Project Manager': '133111',
  'Dermatologist': '253911',
  'Diagnostic and Interventional Radiologist': '253917',
  'Drainer': '334113',
  'Early Childhood (Pre-primary School) Teacher': '241111',
  'Economist': '224112',
  'Electrical Engineering Draftsperson': '312311',
  'Electrical Engineering Technician': '312312',
  'Electrician (General)': '341111',
  'Electrician (Special Class)': '341112',
  'Electronic Equipment Trades Worker': '342313',
  'Electronic Instrument Trades Worker (General)': '342314',
  'Electronic Instrument Trades Worker (Special Class)': '342315',
  'Emergency Medicine Specialist': '253912',
  'Engineering Manager': '133211',
  'Environmental Consultant': '234312',
  'Environmental Manager': '139912',
  'Environmental Research Scientist': '234313',
  'Environmental Scientists nec': '234399',
  'Fibrous Plasterer': '333211',
  'Fitter (General)': '323211',
  'Food Technologist': '234212',
  'Forester': '234113',
  'Gasfitter': '334114',
  'General Practitioner': '253111',
  'Geophysicist': '234412',
  'Glazier': '332211',
  'Hydrogeologist': '234413',
  'Intensive Care Specialist': '253317',
  'Joiner': '331213',
  'Land Economist': '224511',
  'Landscape Architect': '232112',
  'Life Scientist (General)': '234511',
  'Life Scientists nec': '234599',
  'Management Consultant': '224711',
  'Marine Biologist': '234516',
  'Materials Engineer': '233112',
  'Medical Diagnostic Radiographer': '251211',
  'Medical Laboratory Scientist': '234611',
  'Medical Oncologist': '253314',
  'Medical Practitioners nec': '253999',
  'Medical Radiation Therapist': '251212',
  'Metal Fabricator': '322311',
  'Metal Machinist (First Class)': '323214',
  'Metallurgist': '234912',
  'Microbiologist': '234517',
  'Midwife': '254111',
  'Mining Engineer (excluding Petroleum)': '233611',
  'Motorcycle Mechanic': '321213',
  'Multimedia Specialist': '261311',
  'Musician (Instrumental)': '211213',
  'Natural and Physical Science Professionals nec': '234999',
  'Neurologist': '253318',
  'Nurse Practitioner': '254411',
  'Obstetrician and Gynaecologist': '253913',
  'Occupational Therapist': '252411',
  'Ophthalmologist': '253914',
  'Optometrist': '251411',
  'Organisational Psychologist': '272313',
  'Orthopaedic Surgeon': '253514',
  'Osteopath': '252112',
  'Other Spatial Scientist': '232214',
  'Paediatrician': '253321',
  'Painting Trades Worker': '332111',
  'Pathologist': '253915',
  'Petroleum Engineer': '233612',
  'Physicist': '234914',
  'Physiotherapist': '252311',
  'Plumber (General)': '334111',
  'Podiatrist': '252511',
  'Primary Health Organisation Manager': '134213',
  'Psychiatrist': '253411',
  'Psychologists nec': '272399',
  'Radiation Oncologist': '253918',
  'Registered Nurse (Aged Care)': '254412',
  'Registered Nurse (Child and Family Health)': '254413',
  'Registered Nurse (Community Health)': '254414',
  'Registered Nurse (Critical Care and Emergency)': '254415',
  'Registered Nurse (Developmental Disability)': '254416',
  'Registered Nurse (Disability and Rehabilitation)': '254417',
  'Registered Nurse (Medical Practice)': '254421',
  'Registered Nurse (Medical)': '254418',
  'Registered Nurse (Mental Health)': '254422',
  'Registered Nurse (Paediatrics)': '254425',
  'Registered Nurse (Perioperative)': '254423',
  'Registered Nurse (Surgical)': '254424',
  'Registered Nurses nec': '254499',
  'Roof Plumber': '334115',
  'Secondary School Teacher': '241411',
  'Social Worker': '272511',
  'Solicitor': '271311',
  'Solid Plasterer': '333212',
  'Sonographer': '251214',
  'Special Education Teachers nec': '241599',
  'Special Needs Teacher': '241511',
  'Specialist Physician (General Medicine)': '253311',
  'Specialist Physicians nec': '253399',
  'Speech Pathologist': '252712',
  'Statistician': '224113',
  'Stonemason': '331112',
  'Surgeon (General)': '253511',
  'Surveyor': '232212',
  'Telecommunications Engineer': '263311',
  'Telecommunications Field Engineer': '313212',
  'Telecommunications Network Engineer': '263312',
  'Telecommunications Network Planner': '313213',
  'Telecommunications Technical Officer or Technologist': '313214',
  'Tennis Coach': '452316',
  'Thoracic Medicine Specialist': '253324',
  'Urologist': '253518',
  'Valuer': '224512',
  'Vascular Surgeon': '253521',
  'Veterinarian': '234913',
  'Wall and Floor Tiler': '333411',
  'Welder (First Class)': '322313',
  'Welfare Centre Manager': '134214',
  'Zoologist': '234518',
};

interface RoundSummary {
  date: string;
  label: string;
  sc189Total?: number;
  sc189TieBreak?: string;
  sc491FamilyTotal?: number;
  sc491FamilyTieBreak?: string;
}

interface StateNominations {
  period: string;
  reportingPeriod?: string;
  metric?: 'nominations-issued';
  sc190: Record<string, number>;
  sc491: Record<string, number>;
}

interface StateAllocation {
  financialYear: string;
  stateCode: string;
  subclass: '190' | '491';
  totalQuota: number;
  issuedCount: number;
  lastUpdated: string;
  isMock?: boolean;
}

interface MigrationProgramPlanning {
  financialYear: string;
  total: number;
  skilled: number;
  family: number;
  specialEligibility: number;
  skilledIndependent: number;
  regional: number;
  employerSponsored: number;
  stateTerritoryNominated: number;
  talentInnovation: number;
  onshore: number;
  offshore: number;
  sourceUrl: string;
  announcedAt: string;
}

interface RoundsData {
  lastUpdated: string;
  sourceUrl: string;
  note: string;
  currentRound: RoundSummary;
  migrationProgramPlanning: MigrationProgramPlanning[];
  stateNominations: StateNominations;
  stateAllocations: StateAllocation[];
  occupationScores: OccupationScore[];
  rounds: RoundSummary[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_KEY = 'rounds_v10';
const CACHE_TS_KEY = 'rounds_v10_ts';
const CACHE_HOURS = 6;
const REMOTE_URL = 'https://swift-shore-238707.web.app/invitation-rounds.json';
const STATE_ORDER = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

const OFFICIAL_STATE_ALLOCATIONS: StateAllocation[] = [
  { financialYear: '2025-26', stateCode: 'NSW', subclass: '190', totalQuota: 2100, issuedCount: 2082, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'NSW', subclass: '491', totalQuota: 1500, issuedCount: 1424, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'VIC', subclass: '190', totalQuota: 2700, issuedCount: 2649, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'VIC', subclass: '491', totalQuota: 700, issuedCount: 694, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'QLD', subclass: '190', totalQuota: 1850, issuedCount: 1602, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'QLD', subclass: '491', totalQuota: 750, issuedCount: 694, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'WA', subclass: '190', totalQuota: 2000, issuedCount: 1742, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'WA', subclass: '491', totalQuota: 1400, issuedCount: 1400, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'SA', subclass: '190', totalQuota: 1350, issuedCount: 1164, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'SA', subclass: '491', totalQuota: 900, issuedCount: 796, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'TAS', subclass: '190', totalQuota: 1200, issuedCount: 1152, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'TAS', subclass: '491', totalQuota: 650, issuedCount: 501, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'ACT', subclass: '190', totalQuota: 800, issuedCount: 715, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'ACT', subclass: '491', totalQuota: 800, issuedCount: 745, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'NT', subclass: '190', totalQuota: 850, issuedCount: 755, lastUpdated: '2026-06-23' },
  { financialYear: '2025-26', stateCode: 'NT', subclass: '491', totalQuota: 800, issuedCount: 532, lastUpdated: '2026-06-23' },
];

const OFFICIAL_PROGRAM_PLANNING: MigrationProgramPlanning[] = [
  {
    financialYear: '2025-26', total: 185000, skilled: 132200, family: 52500,
    specialEligibility: 300, skilledIndependent: 16900, regional: 33000,
    employerSponsored: 44000, stateTerritoryNominated: 33000,
    talentInnovation: 5300, onshore: 0, offshore: 0,
    sourceUrl: 'https://immi.homeaffairs.gov.au/what-we-do/migration-program-planning-levels',
    announcedAt: '2025-05-13',
  },
  {
    financialYear: '2026-27', total: 185000, skilled: 132240, family: 52460,
    specialEligibility: 300, skilledIndependent: 21090, regional: 14110,
    employerSponsored: 58040, stateTerritoryNominated: 35500,
    talentInnovation: 3500, onshore: 129590, offshore: 55110,
    sourceUrl: 'https://immi.homeaffairs.gov.au/what-we-do/migration-program-planning-levels',
    announcedAt: '2026-05-12',
  },
];

// ─── Bundled fallback (13 November 2025 — Dept of Home Affairs) ───────────────

const FALLBACK: RoundsData = {
  lastUpdated: '2026-06-05',
  sourceUrl: 'https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/invitation-rounds',
  note: 'SC 190 and SC 491 (State/Territory Nominated) are managed by states independently — no departmental rounds apply. SC 189 and SC 491 (Family Sponsored) rounds are issued by the Dept of Home Affairs.',
  currentRound: {
    date: '2026-06-04',
    label: '4 June 2026',
    sc189Total: 10000,
    sc189TieBreak: '2026-04',
    sc491FamilyTotal: 0,
    sc491FamilyTieBreak: undefined,
  },
  migrationProgramPlanning: OFFICIAL_PROGRAM_PLANNING,
  stateNominations: {
    period: '2025-26 program year',
    reportingPeriod: '1 Jul 2025 – 31 May 2026',
    metric: 'nominations-issued',
    sc190: { NSW: 2082, VIC: 2649, QLD: 1602, WA: 1742, SA: 1164, TAS: 1152, ACT: 715, NT: 755 },
    sc491: { NSW: 1424, VIC: 694, QLD: 694, WA: 1400, SA: 796, TAS: 501, ACT: 745, NT: 532 },
  },
  stateAllocations: OFFICIAL_STATE_ALLOCATIONS,
  rounds: [
    { date: '2026-06-04', label: '4 June 2026', sc189Total: 10000, sc189TieBreak: '2026-04', sc491FamilyTotal: 0 },
    { date: '2025-11-13', label: '13 November 2025', sc189Total: 10000, sc189TieBreak: '2025-11', sc491FamilyTotal: 300, sc491FamilyTieBreak: '2025-10' },
    { date: '2025-08-21', label: '21 August 2025', sc189Total: 6887, sc491FamilyTotal: 150 },
    { date: '2024-11-07', label: '7 November 2024', sc189Total: 5000, sc491FamilyTotal: 100 },
    { date: '2024-09-05', label: '5 September 2024', sc189Total: 4500, sc491FamilyTotal: 100 },
    { date: '2024-06-13', label: '13 June 2024', sc189Total: 3000, sc491FamilyTotal: 0 },
    { date: '2023-12-18', label: '18 December 2023', sc189Total: 2000, sc491FamilyTotal: 0 },
    { date: '2023-05-25', label: '25 May 2023', sc189Total: 1500, sc491FamilyTotal: 0 },
  ],
  occupationScores: [
    { name: 'Actuary', sc189: 85, sc491Family: null },
    { name: 'Agricultural Consultant', sc189: 85, sc491Family: null },
    { name: 'Agricultural Scientist', sc189: 85, sc491Family: null },
    { name: 'Airconditioning and Mechanical Services Plumber', sc189: 65, sc491Family: 70 },
    { name: 'Architect', sc189: 85, sc491Family: null },
    { name: 'Artistic Director', sc189: 85, sc491Family: null },
    { name: 'Arts Administrator or Manager', sc189: 85, sc491Family: null },
    { name: 'Audiologist', sc189: 75, sc491Family: 80 },
    { name: 'Automotive Electrician', sc189: 85, sc491Family: null },
    { name: 'Barrister', sc189: 90, sc491Family: null },
    { name: 'Biochemist', sc189: 85, sc491Family: null },
    { name: 'Biotechnologist', sc189: 85, sc491Family: null },
    { name: 'Boat Builder and Repairer', sc189: 85, sc491Family: null },
    { name: 'Botanist', sc189: 85, sc491Family: null },
    { name: 'Bricklayer', sc189: 65, sc491Family: 70 },
    { name: 'Cabinetmaker', sc189: 85, sc491Family: null },
    { name: 'Cardiologist', sc189: 80, sc491Family: 80 },
    { name: 'Carpenter', sc189: 65, sc491Family: 65 },
    { name: 'Carpenter and Joiner', sc189: 65, sc491Family: 95 },
    { name: 'Cartographer', sc189: 90, sc491Family: null },
    { name: 'Chemical Engineer', sc189: 85, sc491Family: null },
    { name: 'Chemist', sc189: 85, sc491Family: null },
    { name: 'Child Care Centre Manager', sc189: 75, sc491Family: null },
    { name: 'Chiropractor', sc189: 85, sc491Family: null },
    { name: 'Civil Engineering Draftsperson', sc189: 85, sc491Family: null },
    { name: 'Civil Engineering Technician', sc189: 85, sc491Family: null },
    { name: 'Clinical Psychologist', sc189: 80, sc491Family: null },
    { name: 'Construction Project Manager', sc189: 85, sc491Family: null },
    { name: 'Dermatologist', sc189: 100, sc491Family: null },
    { name: 'Diagnostic and Interventional Radiologist', sc189: 80, sc491Family: null },
    { name: 'Drainer', sc189: 70, sc491Family: null },
    { name: 'Early Childhood (Pre-primary School) Teacher', sc189: 85, sc491Family: 90 },
    { name: 'Economist', sc189: 85, sc491Family: null },
    { name: 'Electrical Engineering Draftsperson', sc189: 85, sc491Family: null },
    { name: 'Electrical Engineering Technician', sc189: 85, sc491Family: null },
    { name: 'Electrician (General)', sc189: 65, sc491Family: 65 },
    { name: 'Electrician (Special Class)', sc189: 70, sc491Family: null },
    { name: 'Electronic Equipment Trades Worker', sc189: 85, sc491Family: null },
    { name: 'Electronic Instrument Trades Worker (General)', sc189: 95, sc491Family: null },
    { name: 'Electronic Instrument Trades Worker (Special Class)', sc189: 95, sc491Family: null },
    { name: 'Emergency Medicine Specialist', sc189: 75, sc491Family: null },
    { name: 'Engineering Manager', sc189: 85, sc491Family: null },
    { name: 'Environmental Consultant', sc189: 85, sc491Family: null },
    { name: 'Environmental Manager', sc189: 85, sc491Family: null },
    { name: 'Environmental Research Scientist', sc189: 85, sc491Family: null },
    { name: 'Environmental Scientists nec', sc189: 85, sc491Family: null },
    { name: 'Fibrous Plasterer', sc189: 65, sc491Family: 65 },
    { name: 'Fitter (General)', sc189: 85, sc491Family: null },
    { name: 'Food Technologist', sc189: 85, sc491Family: null },
    { name: 'Forester', sc189: 85, sc491Family: null },
    { name: 'Gasfitter', sc189: 65, sc491Family: 80 },
    { name: 'General Practitioner', sc189: 75, sc491Family: 85 },
    { name: 'Geophysicist', sc189: 85, sc491Family: null },
    { name: 'Glazier', sc189: 65, sc491Family: null },
    { name: 'Hydrogeologist', sc189: 90, sc491Family: null },
    { name: 'Intensive Care Specialist', sc189: 80, sc491Family: null },
    { name: 'Joiner', sc189: 65, sc491Family: null },
    { name: 'Land Economist', sc189: 85, sc491Family: null },
    { name: 'Landscape Architect', sc189: 85, sc491Family: null },
    { name: 'Life Scientist (General)', sc189: 85, sc491Family: null },
    { name: 'Life Scientists nec', sc189: 85, sc491Family: null },
    { name: 'Management Consultant', sc189: 85, sc491Family: null },
    { name: 'Marine Biologist', sc189: 85, sc491Family: null },
    { name: 'Materials Engineer', sc189: 85, sc491Family: null },
    { name: 'Medical Diagnostic Radiographer', sc189: 75, sc491Family: 85 },
    { name: 'Medical Laboratory Scientist', sc189: 85, sc491Family: null },
    { name: 'Medical Oncologist', sc189: 80, sc491Family: null },
    { name: 'Medical Practitioners nec', sc189: 75, sc491Family: 90 },
    { name: 'Medical Radiation Therapist', sc189: 75, sc491Family: null },
    { name: 'Metal Fabricator', sc189: 85, sc491Family: null },
    { name: 'Metal Machinist (First Class)', sc189: 95, sc491Family: null },
    { name: 'Metallurgist', sc189: 85, sc491Family: null },
    { name: 'Microbiologist', sc189: 85, sc491Family: null },
    { name: 'Midwife', sc189: 75, sc491Family: 75 },
    { name: 'Mining Engineer (excluding Petroleum)', sc189: 85, sc491Family: null },
    { name: 'Motorcycle Mechanic', sc189: 85, sc491Family: null },
    { name: 'Multimedia Specialist', sc189: 90, sc491Family: null },
    { name: 'Musician (Instrumental)', sc189: 90, sc491Family: null },
    { name: 'Natural and Physical Science Professionals nec', sc189: 85, sc491Family: null },
    { name: 'Neurologist', sc189: 80, sc491Family: null },
    { name: 'Nurse Practitioner', sc189: 80, sc491Family: null },
    { name: 'Obstetrician and Gynaecologist', sc189: 75, sc491Family: null },
    { name: 'Occupational Therapist', sc189: 75, sc491Family: 80 },
    { name: 'Ophthalmologist', sc189: 80, sc491Family: null },
    { name: 'Optometrist', sc189: 75, sc491Family: 85 },
    { name: 'Organisational Psychologist', sc189: 80, sc491Family: null },
    { name: 'Orthopaedic Surgeon', sc189: 85, sc491Family: null },
    { name: 'Osteopath', sc189: 100, sc491Family: null },
    { name: 'Other Spatial Scientist', sc189: 85, sc491Family: null },
    { name: 'Paediatrician', sc189: 75, sc491Family: null },
    { name: 'Painting Trades Worker', sc189: 70, sc491Family: 70 },
    { name: 'Pathologist', sc189: 75, sc491Family: null },
    { name: 'Petroleum Engineer', sc189: 85, sc491Family: null },
    { name: 'Physicist', sc189: 85, sc491Family: null },
    { name: 'Physiotherapist', sc189: 75, sc491Family: 75 },
    { name: 'Plumber (General)', sc189: 65, sc491Family: 70 },
    { name: 'Podiatrist', sc189: 75, sc491Family: null },
    { name: 'Primary Health Organisation Manager', sc189: 85, sc491Family: null },
    { name: 'Psychiatrist', sc189: 75, sc491Family: null },
    { name: 'Psychologists nec', sc189: 75, sc491Family: null },
    { name: 'Radiation Oncologist', sc189: null, sc491Family: 85 },
    { name: 'Registered Nurse (Aged Care)', sc189: 75, sc491Family: 80 },
    { name: 'Registered Nurse (Child and Family Health)', sc189: 75, sc491Family: null },
    { name: 'Registered Nurse (Community Health)', sc189: 75, sc491Family: 80 },
    { name: 'Registered Nurse (Critical Care and Emergency)', sc189: 75, sc491Family: 75 },
    { name: 'Registered Nurse (Developmental Disability)', sc189: 80, sc491Family: 80 },
    { name: 'Registered Nurse (Disability and Rehabilitation)', sc189: 75, sc491Family: null },
    { name: 'Registered Nurse (Medical Practice)', sc189: 75, sc491Family: 75 },
    { name: 'Registered Nurse (Medical)', sc189: 75, sc491Family: 75 },
    { name: 'Registered Nurse (Mental Health)', sc189: 75, sc491Family: 80 },
    { name: 'Registered Nurse (Paediatrics)', sc189: 75, sc491Family: 75 },
    { name: 'Registered Nurse (Perioperative)', sc189: 75, sc491Family: 80 },
    { name: 'Registered Nurse (Surgical)', sc189: 75, sc491Family: 80 },
    { name: 'Registered Nurses nec', sc189: 75, sc491Family: 75 },
    { name: 'Roof Plumber', sc189: 70, sc491Family: null },
    { name: 'Secondary School Teacher', sc189: 75, sc491Family: 85 },
    { name: 'Social Worker', sc189: 75, sc491Family: 85 },
    { name: 'Solicitor', sc189: 85, sc491Family: null },
    { name: 'Solid Plasterer', sc189: 65, sc491Family: 65 },
    { name: 'Sonographer', sc189: 75, sc491Family: null },
    { name: 'Special Education Teachers nec', sc189: 75, sc491Family: null },
    { name: 'Special Needs Teacher', sc189: 75, sc491Family: 90 },
    { name: 'Specialist Physician (General Medicine)', sc189: 80, sc491Family: null },
    { name: 'Specialist Physicians nec', sc189: 85, sc491Family: null },
    { name: 'Speech Pathologist', sc189: 75, sc491Family: 85 },
    { name: 'Statistician', sc189: 85, sc491Family: null },
    { name: 'Stonemason', sc189: 65, sc491Family: null },
    { name: 'Surgeon (General)', sc189: 80, sc491Family: null },
    { name: 'Surveyor', sc189: 85, sc491Family: null },
    { name: 'Telecommunications Engineer', sc189: 90, sc491Family: null },
    { name: 'Telecommunications Field Engineer', sc189: 90, sc491Family: null },
    { name: 'Telecommunications Network Engineer', sc189: 90, sc491Family: null },
    { name: 'Telecommunications Network Planner', sc189: 90, sc491Family: null },
    { name: 'Telecommunications Technical Officer or Technologist', sc189: 90, sc491Family: null },
    { name: 'Tennis Coach', sc189: 85, sc491Family: null },
    { name: 'Thoracic Medicine Specialist', sc189: 80, sc491Family: null },
    { name: 'Urologist', sc189: 80, sc491Family: null },
    { name: 'Valuer', sc189: 85, sc491Family: null },
    { name: 'Vascular Surgeon', sc189: 75, sc491Family: null },
    { name: 'Veterinarian', sc189: 85, sc491Family: null },
    { name: 'Wall and Floor Tiler', sc189: 65, sc491Family: 75 },
    { name: 'Welder (First Class)', sc189: 85, sc491Family: null },
    { name: 'Welfare Centre Manager', sc189: 85, sc491Family: null },
    { name: 'Zoologist', sc189: 85, sc491Family: null },
  ],
};

// ─── Data normalisation ───────────────────────────────────────────────────────

/** Normalise a round summary from either nested or flat format */
function normaliseRound(r: any): RoundSummary {
  return {
    date: r.date ?? '',
    label: r.label || fmtDateLabel(r.date),
    sc189Total: r.sc189Total ?? r.sc189?.total ?? undefined,
    sc189TieBreak: r.sc189TieBreak ?? r.sc189?.tieBreak ?? undefined,
    sc491FamilyTotal: r.sc491FamilyTotal ?? r.sc491Family?.total ?? undefined,
    sc491FamilyTieBreak: r.sc491FamilyTieBreak ?? r.sc491Family?.tieBreak ?? undefined,
  };
}

/** Generate a human label from an ISO date string */
function fmtDateLabel(iso: string | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return iso; }
}

/** Normalise entire RoundsData — handles both nested and flat JSON formats */
function normaliseData(raw: any): RoundsData {
  const stateAllocations = Array.isArray(raw.stateAllocations)
    ? raw.stateAllocations.map((allocation: any): StateAllocation => ({
        financialYear: allocation.financialYear ?? allocation.financial_year ?? '',
        stateCode: allocation.stateCode ?? allocation.state_code ?? '',
        subclass: allocation.subclass,
        totalQuota: allocation.totalQuota ?? allocation.total_quota ?? 0,
        issuedCount: allocation.issuedCount ?? allocation.issued_count ?? 0,
        lastUpdated: allocation.lastUpdated ?? allocation.last_updated ?? '',
        isMock: allocation.isMock ?? allocation.is_mock ?? false,
      })).filter((allocation: StateAllocation) =>
        allocation.financialYear &&
        STATE_ORDER.includes(allocation.stateCode) &&
        (allocation.subclass === '190' || allocation.subclass === '491') &&
        allocation.totalQuota >= 0 &&
        allocation.issuedCount >= 0
      )
    : [];

  return {
    lastUpdated: raw.lastUpdated ?? '',
    sourceUrl: raw.sourceUrl ?? 'https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/invitation-rounds',
    note: raw.note ?? FALLBACK.note,
    currentRound: normaliseRound(raw.currentRound ?? {}),
    migrationProgramPlanning: Array.isArray(raw.migrationProgramPlanning)
      ? raw.migrationProgramPlanning
      : FALLBACK.migrationProgramPlanning,
    stateNominations: raw.stateNominations ?? FALLBACK.stateNominations,
    stateAllocations: stateAllocations.length > 0
      ? stateAllocations
      : FALLBACK.stateAllocations,
    occupationScores: raw.occupationScores ?? FALLBACK.occupationScores,
    rounds: (raw.rounds ?? []).map(normaliseRound),
  };
}

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadData(): Promise<RoundsData> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    const cachedData = cached ? normaliseData(JSON.parse(cached)) : null;
    const cacheHasCurrentNominationSchema =
      cachedData?.stateNominations.metric === 'nominations-issued' &&
      Boolean(cachedData.stateNominations.reportingPeriod) &&
      cachedData.stateAllocations.length > 0 &&
      cachedData.stateAllocations.every((allocation) => !allocation.isMock);
    const ts = await AsyncStorage.getItem(CACHE_TS_KEY);
    const stale =
      !ts ||
      (Date.now() - parseInt(ts)) / 3600000 >= CACHE_HOURS ||
      !cacheHasCurrentNominationSchema;
    if (stale) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${REMOTE_URL}?t=${Date.now()}`, {
        signal: ctrl.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      if (res.ok) {
        const raw = await res.json();
        const data = normaliseData(raw);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
        await AsyncStorage.setItem(CACHE_TS_KEY, String(Date.now()));
        return data;
      }
    }
    if (cacheHasCurrentNominationSchema && cachedData) return cachedData;
  } catch (_) {}
  return FALLBACK;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ptsBg(pts: number | null): string {
  if (pts === null) return Colors.surface;
  if (pts <= 65) return Colors.success + '22';
  if (pts <= 75) return Colors.secondary + '22';
  if (pts <= 85) return Colors.warning + '22';
  return '#FF6B6B22';
}

function ptsFg(pts: number | null): string {
  if (pts === null) return Colors.textMuted;
  if (pts <= 65) return Colors.success;
  if (pts <= 75) return Colors.secondary;
  if (pts <= 85) return Colors.warning;
  return '#FF6B6B';
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function fmtTieBreak(ym: string | undefined): string {
  if (!ym) return '—';
  try {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  } catch { return ym; }
}

function financialYearForDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Financial year unavailable';
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 6 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)} financial year`;
}

function financialYearCode(iso: string): string {
  return financialYearForDate(iso).replace(' financial year', '');
}

function numK(n: number | undefined): string {
  if (n === undefined) return '—';
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RoundsScreen() {
  const Colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<RoundsData>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stateExpanded, setStateExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      await AsyncStorage.removeItem(CACHE_TS_KEY);
      setRefreshing(true);
    }
    const result = await loadData();
    setData(result);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cr = data.currentRound;
  const currentRoundYear = financialYearCode(cr.date);
  const currentPlanning = data.migrationProgramPlanning.find(
    (planning) => planning.financialYear === currentRoundYear
  );
  const nextPlanning = data.migrationProgramPlanning.find(
    (planning) => planning.financialYear === '2026-27'
  );
  const currentYearRounds = data.rounds.filter(
    (round) => financialYearCode(round.date) === currentRoundYear
  );
  const currentYear189Invitations = currentYearRounds.reduce(
    (total, round) => total + (round.sc189Total ?? 0), 0
  );
  const currentYear491Invitations = currentYearRounds.reduce(
    (total, round) => total + (round.sc491FamilyTotal ?? 0), 0
  );
  const nextYearRounds = data.rounds.filter(
    (round) => financialYearCode(round.date) === '2026-27'
  );
  const nextYear189Invitations = nextYearRounds.reduce(
    (total, round) => total + (round.sc189Total ?? 0), 0
  );
  const nextYear491Invitations = nextYearRounds.reduce(
    (total, round) => total + (round.sc491FamilyTotal ?? 0), 0
  );
  const historyByFinancialYear = data.rounds.reduce<Record<string, RoundSummary[]>>(
    (groups, round) => {
      const financialYear = financialYearCode(round.date);
      groups[financialYear] = [...(groups[financialYear] ?? []), round];
      return groups;
    },
    {}
  );
  const sn = data.stateNominations;
  const allocations = data.stateAllocations;
  const allocationYear = allocations[0]?.financialYear ?? 'Current year';
  const allocationLastUpdated = allocations.reduce(
    (latest, allocation) => allocation.lastUpdated > latest ? allocation.lastUpdated : latest,
    ''
  );

  const ListHeader = (
    <View style={{ paddingTop: insets.top }}>
      {/* Page title */}
      <View style={styles.pageHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, {color: Colors.textPrimary}]}>SkillSelect Rounds</Text>
          <Text style={[styles.pageSub, { color: Colors.textSecondary }]}>Updated {fmtDate(data.lastUpdated)} · Dept of Home Affairs</Text>
        </View>
        <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: Colors.surface, borderColor: Colors.border }]} onPress={() => fetchData(true)} activeOpacity={0.7}>
          {refreshing
            ? <ActivityIndicator size="small" color={Colors.accent} />
            : <Ionicons name="refresh" size={18} color={Colors.accent} />}
        </TouchableOpacity>
      </View>

      {/* Current round summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: Colors.surface, borderColor: Colors.accent + '55' }]}>
          <View style={[styles.summaryBadge, { backgroundColor: Colors.accent + '22' }]}>
            <Text style={[styles.summaryBadgeText, { color: Colors.accent }]}>SC 189</Text>
          </View>
          <Text style={[styles.summaryLabel, { color: Colors.textSecondary }]}>Skilled Independent</Text>
          <Text style={[styles.summaryRoundPeriod, { color: Colors.accent }]}>LATEST ROUND · {cr.label.toUpperCase()} · {currentRoundYear}</Text>
          <Text style={[styles.summaryInv, {color: Colors.textPrimary}]}>{(cr.sc189Total ?? 0).toLocaleString()}</Text>
          <Text style={[styles.summaryInvLabel, { color: Colors.textSecondary }]}>SC 189 invitations in this round</Text>
          <Text style={[styles.summaryYearTotal, { color: Colors.accent }]}>Included in {currentYear189Invitations.toLocaleString()} total invitations for {currentRoundYear}</Text>
          {currentPlanning && <Text style={[styles.summaryPlanning, { color: Colors.textSecondary }]}>{currentPlanning.skilledIndependent.toLocaleString()} visa-place planning level · not an invitation quota</Text>}
          <Text style={[styles.summaryTb, { color: Colors.textSecondary }]}>EOI tie-break month: {fmtTieBreak(cr.sc189TieBreak)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: Colors.surface, borderColor: Colors.secondary + '55' }]}>
          <View style={[styles.summaryBadge, { backgroundColor: Colors.secondary + '22' }]}>
            <Text style={[styles.summaryBadgeText, { color: Colors.secondary }]}>SC 491</Text>
          </View>
          <Text style={[styles.summaryLabel, { color: Colors.textSecondary }]}>Regional (Family Sponsored)</Text>
          <Text style={[styles.summaryRoundPeriod, { color: Colors.secondary }]}>LATEST ROUND · {cr.label.toUpperCase()} · {currentRoundYear}</Text>
          <Text style={[styles.summaryInv, {color: Colors.textPrimary}]}>{(cr.sc491FamilyTotal ?? 0).toLocaleString()}</Text>
          <Text style={[styles.summaryInvLabel, { color: Colors.textSecondary }]}>SC 491 Family invitations in this round</Text>
          <Text style={[styles.summaryYearTotal, { color: Colors.secondary }]}>Included in {currentYear491Invitations.toLocaleString()} total Family invitations for {currentRoundYear}</Text>
          {currentPlanning && <Text style={[styles.summaryPlanning, { color: Colors.textSecondary }]}>{currentPlanning.regional.toLocaleString()} Regional visa-place planning level · broader category, not a Family Sponsored quota</Text>}
          <Text style={[styles.summaryTb, { color: Colors.textSecondary }]}>EOI tie-break month: {fmtTieBreak(cr.sc491FamilyTieBreak)}</Text>
        </View>
      </View>

      {nextPlanning && (
        <View style={[styles.programPanel, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <View style={styles.programHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.programTitle, { color: Colors.textPrimary }]}>2026-27 Permanent Migration Program</Text>
              <Text style={[styles.programSubtitle, { color: Colors.textSecondary }]}>Next financial year planning · separate from the 2025-26 invitation round above</Text>
            </View>
          </View>
          <View style={styles.programStats}>
            <View style={[styles.programStat, { backgroundColor: Colors.background }]}>
              <Text style={[styles.programStatLabel, { color: Colors.textSecondary }]}>SC 189</Text>
              <Text style={[styles.programStatValue, { color: Colors.accent }]}>{nextPlanning.skilledIndependent.toLocaleString()}</Text>
              <Text style={[styles.programStatNote, { color: Colors.textSecondary }]}>visa places planned</Text>
              <Text style={[styles.programInvited, { color: Colors.textPrimary }]}>{nextYear189Invitations.toLocaleString()} invitations published</Text>
            </View>
            <View style={[styles.programStat, { backgroundColor: Colors.background }]}>
              <Text style={[styles.programStatLabel, { color: Colors.textSecondary }]}>Regional</Text>
              <Text style={[styles.programStatValue, { color: Colors.secondary }]}>{nextPlanning.regional.toLocaleString()}</Text>
              <Text style={[styles.programStatNote, { color: Colors.textSecondary }]}>visa places planned</Text>
              <Text style={[styles.programInvited, { color: Colors.textPrimary }]}>{nextYear491Invitations.toLocaleString()} SC 491 Family invitations published</Text>
            </View>
          </View>
          <Text style={[styles.programBreakdown, { color: Colors.textSecondary }]}>
            Total {nextPlanning.total.toLocaleString()} · Skilled {nextPlanning.skilled.toLocaleString()} · Family {nextPlanning.family.toLocaleString()} · Special Eligibility {nextPlanning.specialEligibility.toLocaleString()}
          </Text>
          <Text style={[styles.programNotice, { color: Colors.textSecondary }]}>
            Planning levels are targets for visas granted, not invitation caps. Remaining invitations cannot be calculated from these figures. The latest published invitation round was 4 June 2026; the next SC 189 round is expected by 30 September 2026.
          </Text>
          <TouchableOpacity onPress={() => void openExternalUrl(nextPlanning.sourceUrl)} style={styles.programSource}>
            <Text style={[styles.sourceLinkText, { color: Colors.accent }]}>Source: Department of Home Affairs ↗</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* SC 190 note */}
      <View style={[styles.noteBox, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.accent} />
        <Text style={[styles.noteText, { color: Colors.textSecondary }]}>{data.note}</Text>
      </View>

      {/* State nominations toggle */}
      <TouchableOpacity style={[styles.sectionToggle, { backgroundColor: Colors.surface, borderColor: Colors.border }]} onPress={() => setStateExpanded((v) => !v)} activeOpacity={0.7}>
        <Ionicons name="map-outline" size={16} color={Colors.success} />
        <Text style={[styles.sectionToggleText, {color: Colors.textPrimary}]}>SC 190 & 491 Nominations Issued</Text>
        <Text style={[styles.sectionToggleSub, { color: Colors.textSecondary }]}>{sn.period}</Text>
        <Ionicons name={stateExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {stateExpanded && (
        <>
          <View style={[styles.stateTable, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={[styles.stateRow, styles.tableHeader, { backgroundColor: Colors.primaryDark }]}>
              <Text style={[styles.stateNameCell, styles.headerText, { color: Colors.white }]}>State</Text>
              <Text style={[styles.tableCell, styles.headerText, { color: Colors.white }]}>SC 190</Text>
              <Text style={[styles.tableCell, styles.headerText, { color: Colors.white }]}>SC 491</Text>
            </View>
            {STATE_ORDER.map((s) => (
              <View key={s} style={[styles.stateRow, { borderBottomColor: Colors.divider }]}>
                <Text style={[styles.stateNameCell, {color: Colors.textPrimary}]}>{s}</Text>
                <Text style={[styles.tableCell, { color: Colors.success }]}>{(sn.sc190[s] ?? 0).toLocaleString()}</Text>
                <Text style={[styles.tableCell, { color: Colors.secondary }]}>{(sn.sc491[s] ?? 0).toLocaleString()}</Text>
              </View>
            ))}
            <Text style={[styles.tableFootNote, { color: Colors.textSecondary }]}>
              Actual EOIs nominated{sn.reportingPeriod ? ` from ${sn.reportingPeriod}` : ` during ${sn.period}`}. These are cumulative outcomes, not annual allocation quotas.
            </Text>
          </View>

          <View style={[styles.allocationPanel, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={styles.allocationHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.allocationTitle, { color: Colors.textPrimary }]}>Latest published allocation usage</Text>
                <Text style={[styles.allocationSubtitle, { color: Colors.textSecondary }]}>SC 190 & 491 · {allocationYear}</Text>
              </View>
              <View style={[styles.officialBadge, { backgroundColor: Colors.success + '18', borderColor: Colors.success + '45' }]}>
                <Text style={[styles.officialBadgeText, { color: Colors.success }]}>OFFICIAL</Text>
              </View>
            </View>

            <View style={[styles.allocationNotice, { backgroundColor: Colors.accent + '0D', borderColor: Colors.accent + '30' }]}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.accent} />
              <Text style={[styles.allocationNoticeText, { color: Colors.textSecondary }]}>
                Official {allocationYear} allocations compared with actual EOIs nominated{sn.reportingPeriod ? ` from ${sn.reportingPeriod}` : ''}. Allocations are not visa grants.
              </Text>
            </View>

            {STATE_ORDER.map((stateCode) => (
              <View key={stateCode} style={[styles.allocationStateGroup, { borderBottomColor: Colors.divider }]}>
                <Text style={[styles.allocationStateHeading, { color: Colors.textPrimary }]}>{stateCode}</Text>
                {(['190', '491'] as const).map((subclass) => {
                const allocation = allocations.find(
                  (item) => item.stateCode === stateCode && item.subclass === subclass
                );
                if (!allocation) return null;
                const remaining = Math.max(allocation.totalQuota - allocation.issuedCount, 0);
                const percentageUsed = allocation.totalQuota > 0
                  ? Math.min((allocation.issuedCount / allocation.totalQuota) * 100, 100)
                  : 0;
                const barColor = subclass === '190' ? Colors.success : Colors.secondary;

                return (
                  <View key={`${stateCode}-${subclass}`} style={styles.allocationRow}>
                    <View style={styles.allocationRowTop}>
                      <View style={styles.allocationIdentity}>
                        <View style={[styles.allocationSubclassBadge, { backgroundColor: barColor + '18' }]}>
                          <Text style={[styles.allocationSubclass, { color: barColor }]}>SC {subclass}</Text>
                        </View>
                      </View>
                      <Text style={[styles.allocationPercent, { color: barColor }]}>{percentageUsed.toFixed(1)}% used</Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: Colors.background }]}>
                      <View style={[styles.progressFill, { backgroundColor: barColor, width: `${percentageUsed}%` }]} />
                    </View>
                    <View style={styles.allocationStats}>
                      <Text style={[styles.allocationStat, { color: Colors.textSecondary }]}>
                        Issued <Text style={{ color: Colors.textPrimary, fontWeight: '700' }}>{allocation.issuedCount.toLocaleString()}</Text>
                      </Text>
                      <Text style={[styles.allocationStat, { color: Colors.textSecondary }]}>
                        Quota <Text style={{ color: Colors.textPrimary, fontWeight: '700' }}>{allocation.totalQuota.toLocaleString()}</Text>
                      </Text>
                      <Text style={[styles.allocationStat, { color: Colors.textSecondary }]}>
                        Remaining <Text style={{ color: Colors.textPrimary, fontWeight: '700' }}>{remaining.toLocaleString()}</Text>
                      </Text>
                    </View>
                  </View>
                );
                })}
              </View>
            ))}

            <Text style={[styles.allocationUpdated, { color: Colors.textMuted }]}>
              Home Affairs data updated {allocationLastUpdated ? fmtDate(allocationLastUpdated) : 'Not available'}
            </Text>
          </View>
        </>
      )}

      {/* Round history toggle */}
      <TouchableOpacity style={[styles.sectionToggle, { backgroundColor: Colors.surface, borderColor: Colors.border }]} onPress={() => setHistoryExpanded((v) => !v)} activeOpacity={0.7}>
        <Ionicons name="time-outline" size={16} color={Colors.accentPurple} />
        <Text style={[styles.sectionToggleText, {color: Colors.textPrimary}]}>Round History</Text>
        <Text style={[styles.sectionToggleSub, { color: Colors.textSecondary }]}>{data.rounds.length} rounds</Text>
        <Ionicons name={historyExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {historyExpanded && (
        <View style={[styles.stateTable, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <View style={[styles.stateRow, styles.tableHeader, { backgroundColor: Colors.primaryDark }]}>
            <Text style={[styles.histDateCell, styles.headerText, { color: Colors.white }]}>Date</Text>
            <Text style={[styles.tableCell, styles.headerText, { color: Colors.white }]}>SC 189</Text>
            <Text style={[styles.tableCell, styles.headerText, { color: Colors.white }]}>SC 491 Fam.</Text>
          </View>
          {Object.entries(historyByFinancialYear).map(([financialYear, rounds]) => {
            const total189 = rounds.reduce((total, round) => total + (round.sc189Total ?? 0), 0);
            const total491 = rounds.reduce((total, round) => total + (round.sc491FamilyTotal ?? 0), 0);
            return (
              <React.Fragment key={financialYear}>
                <View style={[styles.historyYearRow, { backgroundColor: Colors.background, borderBottomColor: Colors.divider }]}>
                  <View style={styles.histDateCell}>
                    <Text style={[styles.historyYearTitle, { color: Colors.textPrimary }]}>{financialYear} financial year</Text>
                    <Text style={[styles.historyYearSubtitle, { color: Colors.textSecondary }]}>{rounds.length} invitation {rounds.length === 1 ? 'round' : 'rounds'} · annual total</Text>
                  </View>
                  <Text style={[styles.tableCell, styles.historyYearTotal, { color: Colors.accent }]}>{total189.toLocaleString()}</Text>
                  <Text style={[styles.tableCell, styles.historyYearTotal, { color: Colors.secondary }]}>{total491.toLocaleString()}</Text>
                </View>
                {rounds.map((round) => (
                  <View
                    key={round.date}
                    style={[
                      styles.stateRow,
                      styles.historyRoundRow,
                      { borderBottomColor: Colors.divider },
                      round.date === cr.date && { backgroundColor: `${Colors.accent}0D` },
                    ]}
                  >
                    <View style={styles.histDateCell}>
                      <Text style={{ color: Colors.textPrimary }}>{round.label}</Text>
                      {round.date === cr.date && <Text style={[styles.historyLatest, { color: Colors.accent }]}>Latest round · shown above</Text>}
                    </View>
                    <Text style={[styles.tableCell, { color: Colors.accent }]}>{(round.sc189Total ?? 0).toLocaleString()}</Text>
                    <Text style={[styles.tableCell, { color: Colors.secondary }]}>{(round.sc491FamilyTotal ?? 0).toLocaleString()}</Text>
                  </View>
                ))}
              </React.Fragment>
            );
          })}
          <TouchableOpacity onPress={() => void openExternalUrl('https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/previous-rounds')} style={styles.sourceLink}>
            <Text style={[styles.sourceLinkText, { color: Colors.accent }]}>View Home Affairs previous rounds ↗</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.occupationsLink, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
        onPress={() => router.push('/occupations')}
        activeOpacity={0.75}
      >
        <View style={[styles.occupationsLinkIcon, { backgroundColor: `${Colors.accent}18` }]}>
          <Ionicons name="search-outline" size={18} color={Colors.accent} />
        </View>
        <View style={styles.occupationsLinkText}>
          <Text style={[styles.occupationsLinkTitle, { color: Colors.textPrimary }]}>Search occupations and cutoffs</Text>
          <Text style={[styles.occupationsLinkSub, { color: Colors.textSecondary }]}>Latest SC 189 and SC 491 points, ANZSCO details and round history</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={[styles.loadingText, {color: Colors.textPrimary}]}>Loading rounds data…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={Colors.accent} />}
    >
      {ListHeader}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 80 }]}>
        <TouchableOpacity onPress={() => void openExternalUrl(data.sourceUrl)}>
          <Text style={[styles.footerSource, { color: Colors.accent }]}>Source: Dept of Home Affairs ↗</Text>
        </TouchableOpacity>
        <Text style={[styles.footerNote, { color: Colors.textSecondary }]}>Data auto-refreshes every {CACHE_HOURS} hours. Pull down to force refresh.</Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: Spacing.md, fontSize: FontSize.sm },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold },
  pageSub: { fontSize: FontSize.xs, marginTop: 2 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.md },
  summaryCard: {
    flex: 1,
    borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg,
  },
  summaryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: Radius.full, marginBottom: Spacing.sm,
  },
  summaryBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  summaryLabel: { fontSize: FontSize.xs, marginBottom: Spacing.sm },
  summaryRoundPeriod: { fontSize: 10, fontWeight: FontWeight.bold, marginBottom: 2 },
  summaryInv: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extraBold, lineHeight: 36 },
  summaryInvLabel: { fontSize: FontSize.xs, marginBottom: Spacing.sm },
  summaryYearTotal: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginBottom: 3 },
  summaryPlanning: { fontSize: 10, lineHeight: 14, marginBottom: Spacing.sm },
  summaryTb: { fontSize: FontSize.xs },
  summaryDate: { fontSize: FontSize.xs, marginTop: 2 },

  programPanel: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md,
  },
  programHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  programTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  programSubtitle: { fontSize: FontSize.xs, marginTop: 2 },
  programStats: { flexDirection: 'row', gap: Spacing.sm },
  programStat: { flex: 1, borderRadius: Radius.sm, padding: Spacing.sm },
  programStatLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  programStatValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extraBold, marginTop: 2 },
  programStatNote: { fontSize: 10 },
  programInvited: { fontSize: 10, fontWeight: FontWeight.semiBold, marginTop: 5 },
  programBreakdown: { fontSize: 10, lineHeight: 15, marginTop: Spacing.sm },
  programNotice: { fontSize: FontSize.xs, lineHeight: 16, marginTop: Spacing.sm },
  programSource: { alignItems: 'center', paddingTop: Spacing.sm },

  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1,
  },
  noteText: { flex: 1, fontSize: FontSize.xs, lineHeight: 16 },

  sectionToggle: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.xs,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1,
  },
  sectionToggleText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, flexShrink: 1 },
  sectionToggleSub: { fontSize: FontSize.xs, flexShrink: 1 },

  stateTable: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden',
  },
  stateRow: {
    flexDirection: 'row', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, alignItems: 'center',
  },
  tableHeader: { },
  headerText: { fontWeight: FontWeight.bold },
  tableCell: { flex: 1, fontSize: FontSize.sm, textAlign: 'center' },
  stateNameCell: { flex: 1.2, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  histDateCell: { flex: 2.5, fontSize: FontSize.sm },
  historyYearRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  historyYearTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  historyYearSubtitle: { fontSize: 10, marginTop: 2 },
  historyYearTotal: { fontWeight: FontWeight.bold },
  historyRoundRow: { paddingLeft: Spacing.xl },
  historyLatest: { fontSize: 10, fontWeight: FontWeight.bold, marginTop: 2 },
  tableFootNote: { fontSize: FontSize.xs, padding: Spacing.md, textAlign: 'center' },
  sourceLink: { padding: Spacing.md, alignItems: 'center' },
  sourceLinkText: { fontSize: FontSize.xs },

  allocationPanel: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md,
  },
  allocationHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  allocationTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  allocationSubtitle: { fontSize: FontSize.xs, marginTop: 2 },
  officialBadge: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 3 },
  officialBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  allocationNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    borderWidth: 1, borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.sm,
  },
  allocationNoticeText: { flex: 1, fontSize: FontSize.xs, lineHeight: 16 },
  allocationStateGroup: { borderBottomWidth: 1, paddingVertical: Spacing.sm },
  allocationStateHeading: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: 2 },
  allocationRow: { paddingVertical: 6 },
  allocationRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  allocationIdentity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  allocationSubclassBadge: { borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 3 },
  allocationSubclass: { fontSize: 10, fontWeight: FontWeight.bold },
  allocationPercent: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  progressTrack: { height: 7, borderRadius: Radius.full, overflow: 'hidden', marginTop: 7 },
  progressFill: { height: '100%', borderRadius: Radius.full },
  allocationStats: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.xs, marginTop: 6 },
  allocationStat: { fontSize: 10 },
  allocationUpdated: { fontSize: 10, textAlign: 'right', marginTop: Spacing.sm },

  occupationsLink: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginTop: Spacing.lg,
    padding: Spacing.md,
    borderWidth: 1, borderRadius: Radius.md,
  },
  occupationsLinkIcon: {
    width: 36, height: 36, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  occupationsLinkText: { flex: 1 },
  occupationsLinkTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  occupationsLinkSub: { fontSize: FontSize.xs, lineHeight: 17, marginTop: 2 },

  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.sm, alignItems: 'center' },
  footerSource: { fontSize: FontSize.xs },
  footerNote: { fontSize: FontSize.xs, textAlign: 'center', lineHeight: 16 },
});
