import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OccupationScore {
  name: string;
  sc189: number | null;
  sc491Family: number | null;
}

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
  sc190: Record<string, number>;
  sc491: Record<string, number>;
}

interface RoundsData {
  lastUpdated: string;
  sourceUrl: string;
  note: string;
  currentRound: RoundSummary;
  stateNominations: StateNominations;
  occupationScores: OccupationScore[];
  rounds: RoundSummary[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_KEY = 'rounds_v2';
const CACHE_TS_KEY = 'rounds_v2_ts';
const CACHE_HOURS = 6;
const REMOTE_URL = 'https://migrateau.jsmglobal.xyz/invitation-rounds.json';
const STATE_ORDER = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

// ─── Bundled fallback (13 November 2025 — Dept of Home Affairs) ───────────────

const FALLBACK: RoundsData = {
  lastUpdated: '2025-11-13',
  sourceUrl: 'https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/invitation-rounds',
  note: 'SC 190 and SC 491 (State/Territory Nominated) are managed by states independently — no departmental rounds apply. SC 189 and SC 491 (Family Sponsored) rounds are issued by the Dept of Home Affairs.',
  currentRound: {
    date: '2025-11-13',
    label: '13 November 2025',
    sc189Total: 10000,
    sc189TieBreak: '2025-11',
    sc491FamilyTotal: 300,
    sc491FamilyTieBreak: '2025-10',
  },
  stateNominations: {
    period: '2025-26 (Jul 2025 – Apr 2026)',
    sc190: { NSW: 604, VIC: 1894, QLD: 741, WA: 1254, SA: 911, TAS: 988, ACT: 2237, NT: 1443 },
    sc491: { NSW: 653, VIC: 1049, QLD: 438, WA: 630, SA: 594, TAS: 367, ACT: 656, NT: 1067 },
  },
  rounds: [
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

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadData(): Promise<RoundsData> {
  try {
    const ts = await AsyncStorage.getItem(CACHE_TS_KEY);
    const stale = !ts || (Date.now() - parseInt(ts)) / 3600000 >= CACHE_HOURS;
    if (stale) {
      const res = await fetch(REMOTE_URL, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data: RoundsData = await res.json();
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
        await AsyncStorage.setItem(CACHE_TS_KEY, String(Date.now()));
        return data;
      }
    }
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached) as RoundsData;
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

function numK(n: number | undefined): string {
  if (!n) return '—';
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ScoreBadge = React.memo(({ pts }: { pts: number | null }) => (
  <View style={[styles.scoreBadge, { backgroundColor: ptsBg(pts) }]}>
    <Text style={[styles.scoreVal, { color: ptsFg(pts) }]}>
      {pts === null ? 'N/A' : String(pts)}
    </Text>
  </View>
));

const OccupationRow = React.memo(({ item, index }: { item: OccupationScore; index: number }) => (
  <View style={[styles.occRow, index % 2 === 0 && styles.occRowAlt]}>
    <Text style={styles.occName} numberOfLines={2}>{item.name}</Text>
    <ScoreBadge pts={item.sc189} />
    <ScoreBadge pts={item.sc491Family} />
  </View>
));

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RoundsScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<RoundsData>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [stateExpanded, setStateExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | '189' | '491'>('all');

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

  const filtered = useMemo(() => {
    let list = data.occupationScores;
    if (filter === '189') list = list.filter((o) => o.sc189 !== null);
    if (filter === '491') list = list.filter((o) => o.sc491Family !== null);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((o) => o.name.toLowerCase().includes(q));
    }
    return list;
  }, [data.occupationScores, query, filter]);

  const cr = data.currentRound;
  const sn = data.stateNominations;

  const ListHeader = (
    <View style={{ paddingTop: insets.top }}>
      {/* Page title */}
      <View style={styles.pageHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>SkillSelect Rounds</Text>
          <Text style={styles.pageSub}>Updated {fmtDate(data.lastUpdated)} · Dept of Home Affairs</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchData(true)} activeOpacity={0.7}>
          {refreshing
            ? <ActivityIndicator size="small" color={Colors.accent} />
            : <Ionicons name="refresh" size={18} color={Colors.accent} />}
        </TouchableOpacity>
      </View>

      {/* Current round summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: Colors.accent + '55' }]}>
          <View style={[styles.summaryBadge, { backgroundColor: Colors.accent + '22' }]}>
            <Text style={[styles.summaryBadgeText, { color: Colors.accent }]}>SC 189</Text>
          </View>
          <Text style={styles.summaryLabel}>Skilled Independent</Text>
          <Text style={styles.summaryInv}>{numK(cr.sc189Total)}</Text>
          <Text style={styles.summaryInvLabel}>invitations</Text>
          <Text style={styles.summaryTb}>Tie break: {fmtTieBreak(cr.sc189TieBreak)}</Text>
          <Text style={styles.summaryDate}>{cr.label}</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: Colors.secondary + '55' }]}>
          <View style={[styles.summaryBadge, { backgroundColor: Colors.secondary + '22' }]}>
            <Text style={[styles.summaryBadgeText, { color: Colors.secondary }]}>SC 491</Text>
          </View>
          <Text style={styles.summaryLabel}>Regional (Family Sponsored)</Text>
          <Text style={styles.summaryInv}>{numK(cr.sc491FamilyTotal)}</Text>
          <Text style={styles.summaryInvLabel}>invitations</Text>
          <Text style={styles.summaryTb}>Tie break: {fmtTieBreak(cr.sc491FamilyTieBreak)}</Text>
          <Text style={styles.summaryDate}>{cr.label}</Text>
        </View>
      </View>

      {/* SC 190 note */}
      <View style={styles.noteBox}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.accent} />
        <Text style={styles.noteText}>{data.note}</Text>
      </View>

      {/* State nominations toggle */}
      <TouchableOpacity style={styles.sectionToggle} onPress={() => setStateExpanded((v) => !v)} activeOpacity={0.7}>
        <Ionicons name="map-outline" size={16} color={Colors.success} />
        <Text style={styles.sectionToggleText}>SC 190 & 491 State Nominations</Text>
        <Text style={styles.sectionToggleSub}>{sn.period}</Text>
        <Ionicons name={stateExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {stateExpanded && (
        <View style={styles.stateTable}>
          <View style={[styles.stateRow, styles.tableHeader]}>
            <Text style={[styles.stateNameCell, styles.headerText]}>State</Text>
            <Text style={[styles.tableCell, styles.headerText]}>SC 190</Text>
            <Text style={[styles.tableCell, styles.headerText]}>SC 491</Text>
          </View>
          {STATE_ORDER.map((s) => (
            <View key={s} style={styles.stateRow}>
              <Text style={styles.stateNameCell}>{s}</Text>
              <Text style={[styles.tableCell, { color: Colors.success }]}>{(sn.sc190[s] ?? 0).toLocaleString()}</Text>
              <Text style={[styles.tableCell, { color: Colors.secondary }]}>{(sn.sc491[s] ?? 0).toLocaleString()}</Text>
            </View>
          ))}
          <Text style={styles.tableFootNote}>Nominations 1 Jul 2025 – 30 Apr 2026. States nominate continuously throughout the month.</Text>
        </View>
      )}

      {/* Round history toggle */}
      <TouchableOpacity style={styles.sectionToggle} onPress={() => setHistoryExpanded((v) => !v)} activeOpacity={0.7}>
        <Ionicons name="time-outline" size={16} color={Colors.accentPurple} />
        <Text style={styles.sectionToggleText}>Round History</Text>
        <Text style={styles.sectionToggleSub}>{data.rounds.length} rounds</Text>
        <Ionicons name={historyExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {historyExpanded && (
        <View style={styles.stateTable}>
          <View style={[styles.stateRow, styles.tableHeader]}>
            <Text style={[styles.histDateCell, styles.headerText]}>Date</Text>
            <Text style={[styles.tableCell, styles.headerText]}>SC 189</Text>
            <Text style={[styles.tableCell, styles.headerText]}>SC 491 Fam.</Text>
          </View>
          {data.rounds.map((r) => (
            <View key={r.date} style={styles.stateRow}>
              <Text style={styles.histDateCell}>{r.label}</Text>
              <Text style={[styles.tableCell, { color: Colors.accent }]}>{numK(r.sc189Total)}</Text>
              <Text style={[styles.tableCell, { color: Colors.secondary }]}>{r.sc491FamilyTotal ? numK(r.sc491FamilyTotal) : '—'}</Text>
            </View>
          ))}
          <TouchableOpacity onPress={() => Linking.openURL('https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/previous-rounds')} style={styles.sourceLink}>
            <Text style={styles.sourceLinkText}>View all official previous rounds ↗</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Occupation scores section header */}
      <View style={styles.occSection}>
        <Text style={styles.occSectionTitle}>Min Points by Occupation</Text>
        <Text style={styles.occSectionSub}>Current round · {cr.label} · {data.occupationScores.length} occupations</Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {([['all', 'All'], ['189', 'SC 189'], ['491', 'SC 491 Fam.']] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, filter === key && styles.filterChipActive]}
            onPress={() => setFilter(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, filter === key && styles.filterChipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search your occupation..."
          placeholderTextColor={Colors.textMuted}
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {([{ pts: 65, label: '≤65 pts' }, { pts: 70, label: '70–75 pts' }, { pts: 80, label: '80–85 pts' }, { pts: 90, label: '≥90 pts' }]).map(({ pts, label }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ptsFg(pts) }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Column headers */}
      <View style={styles.occHeaderRow}>
        <Text style={[styles.occHeaderCell, { flex: 1, textAlign: 'left' }]}>Occupation</Text>
        <Text style={styles.occHeaderCell}>SC 189</Text>
        <Text style={styles.occHeaderCell}>SC 491</Text>
      </View>

      {filtered.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={36} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No occupations match "{query}"</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading rounds data…</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={filtered}
      keyExtractor={(item) => item.name}
      ListHeaderComponent={ListHeader}
      renderItem={({ item, index }) => <OccupationRow item={item} index={index} />}
      ListFooterComponent={
        <View style={[styles.footer, { paddingBottom: insets.bottom + 80 }]}>
          <TouchableOpacity onPress={() => Linking.openURL(data.sourceUrl)}>
            <Text style={styles.footerSource}>Source: Dept of Home Affairs ↗</Text>
          </TouchableOpacity>
          <Text style={styles.footerNote}>N/A = no invitations or no eligible EOIs for that visa type in this round.</Text>
          <Text style={styles.footerNote}>Data auto-refreshes every {CACHE_HOURS} hours. Pull down to force refresh.</Text>
        </View>
      }
      onRefresh={() => fetchData(true)}
      refreshing={refreshing}
      removeClippedSubviews
      initialNumToRender={40}
      maxToRenderPerBatch={40}
      windowSize={10}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textMuted, marginTop: Spacing.md, fontSize: FontSize.sm },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold, color: Colors.textPrimary },
  pageSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.md },
  summaryCard: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg,
  },
  summaryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: Radius.full, marginBottom: Spacing.sm,
  },
  summaryBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm },
  summaryInv: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extraBold, color: Colors.textPrimary, lineHeight: 36 },
  summaryInvLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm },
  summaryTb: { fontSize: FontSize.xs, color: Colors.textSecondary },
  summaryDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  noteText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },

  sectionToggle: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.xs,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  sectionToggleText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  sectionToggleSub: { fontSize: FontSize.xs, color: Colors.textMuted },

  stateTable: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  stateRow: {
    flexDirection: 'row', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider, alignItems: 'center',
  },
  tableHeader: { backgroundColor: Colors.primaryDark },
  headerText: { fontWeight: FontWeight.bold, color: Colors.textPrimary },
  tableCell: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  stateNameCell: { flex: 1.2, fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.semiBold },
  histDateCell: { flex: 2.5, fontSize: FontSize.sm, color: Colors.textSecondary },
  tableFootNote: { fontSize: FontSize.xs, color: Colors.textMuted, padding: Spacing.md, textAlign: 'center' },
  sourceLink: { padding: Spacing.md, alignItems: 'center' },
  sourceLinkText: { fontSize: FontSize.xs, color: Colors.accent },

  occSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.sm },
  occSectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  occSectionSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
  filterChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.accent + '22', borderColor: Colors.accent },
  filterChipText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semiBold },
  filterChipTextActive: { color: Colors.accent },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, paddingVertical: 0 },

  legend: {
    flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm, flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSize.xs, color: Colors.textMuted },

  occHeaderRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryDark, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  occHeaderCell: { width: 56, fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },

  occRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  occRowAlt: { backgroundColor: 'rgba(255,255,255,0.02)' },
  occName: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, paddingRight: Spacing.sm },
  scoreBadge: { width: 52, paddingVertical: 4, borderRadius: Radius.sm, alignItems: 'center', marginLeft: Spacing.xs },
  scoreVal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  emptyState: { alignItems: 'center', padding: Spacing.xxxl, gap: Spacing.md },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm },

  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.sm, alignItems: 'center' },
  footerSource: { fontSize: FontSize.xs, color: Colors.accent },
  footerNote: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', lineHeight: 16 },
});
