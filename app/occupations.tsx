import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Linking,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import {
  SkilledOccupation,
  SkillList,
  SKILL_LISTS,
  StateCode,
  StateRequirement,
  STATE_CODES,
} from '../constants/skilledOccupations';
import {
  getSkilledOccupations,
  getOccupationsLastCheckedAt,
  refreshSkilledOccupations,
  refreshAllAnzscoOccupations,
  refreshStateRequirements,
  mergeStateRequirements,
  searchOccupations,
} from '../utils/skilledOccupations';
import {
  getDailyUpdates,
  buildVisaMetaMap,
  DEFAULT_VISA_META,
  DailyUpdates,
} from '../utils/dailyUpdates';
import { tap as hapticTap, success as hapticSuccess } from '../utils/haptics';
import { getProfile, saveProfile } from '../utils/storage';
import { hasExceededLimit, incrementUsage, getRemainingUses } from '../utils/paywall';
import {
  SalariesSnapshot,
  getSalaries,
  refreshSalaries,
  getSalaryFor,
  formatAnnualShort,
  formatAnnualFull,
} from '../utils/salaries';
import { PaywallModal } from '../components/PaywallModal';

type ListFilter = 'All' | SkillList;
type JurisdictionFilter = 'All' | 'Federal' | StateCode;

/** Deduplicate occupations by ANZSCO code, keeping first occurrence */
function deduplicateOccupations(items: SkilledOccupation[]): SkilledOccupation[] {
  const seen = new Set<string>();
  return items.filter((o) => {
    if (seen.has(o.anzsco)) return false;
    seen.add(o.anzsco);
    return true;
  });
}

const LIST_COLORS: Record<SkillList, string> = {
  CSOL: Colors.accent,
  MLTSSL: Colors.success,
  STSOL: Colors.warning,
  ROL: Colors.accentPurple,
};

const LIST_DESCRIPTIONS: Record<'All' | SkillList, string> = {
  All:   'All federal lists',
  CSOL:  'SC 482 Core Skills stream',
  MLTSSL:'SC 189 · 190 · 491 · 485',
  STSOL: 'SC 482 Short-term (legacy)',
  ROL:   'SC 491 · 494 Regional',
};

const STATE_COLORS: Record<StateCode, string> = {
  NSW: '#4F8EF7',
  VIC: '#00C2FF',
  QLD: '#FF6B8A',
  WA: '#FFCD00',
  SA: '#FF7043',
  TAS: '#00D68F',
  ACT: '#A78BFA',
  NT: '#FFB800',
};

// Australian University Graduate Pathways by State
const STATE_UNIVERSITIES: Record<StateCode, string[]> = {
  NSW: [
    'University of Sydney',
    'UNSW Sydney',
    'University of Technology Sydney (UTS)',
    'Macquarie University',
    'Western Sydney University',
    'University of Newcastle',
    'University of Wollongong',
  ],
  VIC: [
    'University of Melbourne',
    'Monash University',
    'RMIT University',
    'Deakin University',
    'La Trobe University',
    'Swinburne University',
  ],
  QLD: [
    'University of Queensland (UQ)',
    'Queensland University of Technology (QUT)',
    'Griffith University',
    'James Cook University (JCU)',
    'Bond University',
    'Central Queensland University (CQU)',
  ],
  WA: [
    'University of Western Australia (UWA)',
    'Curtin University',
    'Murdoch University',
    'Edith Cowan University (ECU)',
  ],
  SA: [
    'University of Adelaide',
    'Flinders University',
    'University of South Australia (UniSA)',
    'Carnegie Mellon University Adelaide',
    'Torrens University',
  ],
  TAS: [
    'University of Tasmania (UTAS)',
  ],
  ACT: [
    'Australian National University (ANU)',
    'University of Canberra (UC)',
    'UNSW Canberra (ADFA)',
    'Australian Catholic University',
  ],
  NT: [
    'Charles Darwin University (CDU)',
  ],
};

const GRADUATE_BENEFITS: Record<StateCode, string[]> = {
  NSW: [
    'NSW Skills List Stream 2 (Living in NSW)',
    'Wider occupation eligibility',
    'Lower experience requirements',
  ],
  VIC: [
    'Special pathway for researchers (PhD)',
    'Lower salary threshold for academics',
    'Faster processing',
  ],
  QLD: [
    'Access to QLD Skilled Graduate Stream',
    'Lower salary thresholds',
    'Access to regional QLD opportunities',
  ],
  WA: [
    'Access to WA Graduate Stream',
    'Reduced salary requirements',
    'Special pathway for healthcare/STEM',
  ],
  SA: [
    'Exclusive Supplementary Skilled List access',
    'Lower salary threshold',
    'Easier nomination process',
  ],
  TAS: [
    'Lower salary requirement (-15%)',
    'Reduced experience requirement',
    'Exclusive occupations available',
  ],
  ACT: [
    'Access to ACT Critical Skills List',
    'Lower salary requirement',
    'Faster processing through ACT matrix',
  ],
  NT: [
    'Most flexible requirements in Australia',
    'Lower salary threshold',
    'Direct pathway to permanent residence',
  ],
};

// ─── English requirements per visa subclass ───────────────────────────────
interface EnglishReq {
  level: string;
  description: string;
  ielts: string;        // e.g. "6.0 each band"
  pte: string;
  toefl: string;
  color: string;
}
const VISA_ENGLISH: Record<string, EnglishReq> = {
  '189': {
    level: 'Competent English',
    description: 'Required to sit the skills assessment and earn points.',
    ielts: '6.0 each band', pte: '50 each component', toefl: '12 L · 13 R · 21 W · 18 S',
    color: Colors.accent,
  },
  '190': {
    level: 'Competent English',
    description: 'Must be met at time of invitation.',
    ielts: '6.0 each band', pte: '50 each component', toefl: '12 L · 13 R · 21 W · 18 S',
    color: Colors.accent,
  },
  '491': {
    level: 'Competent English',
    description: 'Required for all applicants.',
    ielts: '6.0 each band', pte: '50 each component', toefl: '12 L · 13 R · 21 W · 18 S',
    color: Colors.accent,
  },
  '482': {
    level: 'Proficient English (Core Skills)',
    description: 'Short-term stream occupations need Vocational; Core Skills and Specialist need Proficient.',
    ielts: '7.0 each band', pte: '65 each component', toefl: '24 L · 24 R · 27 W · 23 S',
    color: Colors.success,
  },
  '186': {
    level: 'Competent English',
    description: 'Required for Direct Entry and Agreement streams.',
    ielts: '6.0 each band', pte: '50 each component', toefl: '12 L · 13 R · 21 W · 18 S',
    color: Colors.accent,
  },
  '485': {
    level: 'Competent English',
    description: 'Required unless you studied in Australia for 2+ years.',
    ielts: '6.0 each band', pte: '50 each component', toefl: '12 L · 13 R · 21 W · 18 S',
    color: Colors.accent,
  },
  '494': {
    level: 'Competent English',
    description: 'Required at time of application.',
    ielts: '6.0 each band', pte: '50 each component', toefl: '12 L · 13 R · 21 W · 18 S',
    color: Colors.accent,
  },
};

// ─── Assessing authority details ──────────────────────────────────────────
interface AuthorityInfo {
  name: string;
  assesses: string;
  website: string;
  typicalTime: string;
  notes: string[];
}
const AUTHORITY_INFO: Record<string, AuthorityInfo> = {
  'VETASSESS': {
    name: 'VETASSESS',
    assesses: 'General professionals (management, health, science, education, legal, and more)',
    website: 'https://www.vetassess.com.au',
    typicalTime: '8–12 weeks',
    notes: [
      'Requires evidence of qualifications and employment history',
      'Some occupations require a Technical Interview',
      'Assessment result valid for 3 years',
    ],
  },
  'ACS': {
    name: 'ACS (Australian Computer Society)',
    assesses: 'ICT / Information Technology professionals',
    website: 'https://www.acs.org.au/msa',
    typicalTime: '4–8 weeks',
    notes: [
      'Assesses ICT qualifications and relevant work experience',
      'RPL (Recognition of Prior Learning) pathway available',
      'Result valid for 3 years',
    ],
  },
  'Engineers Australia': {
    name: 'Engineers Australia',
    assesses: 'Engineering professionals (civil, mechanical, electrical, software, etc.)',
    website: 'https://www.engineersaustralia.org.au/msa',
    typicalTime: '10–16 weeks',
    notes: [
      'Must demonstrate competency against Stage 1 competency standards',
      'CDR (Competency Demonstration Report) required for most pathways',
      'Fast-track option may be available for chartered engineers',
    ],
  },
  'ANMAC': {
    name: 'ANMAC (Australian Nursing & Midwifery Accreditation Council)',
    assesses: 'Registered nurses, enrolled nurses, and midwives',
    website: 'https://www.anmac.org.au',
    typicalTime: '3–6 months',
    notes: [
      'Must also register with AHPRA after migration',
      'English requirement: OET B in all 4 components or IELTS 7.0',
      'Assessment valid for 2 years',
    ],
  },
  'AASW': {
    name: 'AASW (Australian Association of Social Workers)',
    assesses: 'Social workers',
    website: 'https://www.aasw.asn.au',
    typicalTime: '8–12 weeks',
    notes: ['Must hold a qualifying social work degree'],
  },
  'TRA': {
    name: 'TRA (Trades Recognition Australia)',
    assesses: 'Trade occupations (electricians, plumbers, motor mechanics, etc.)',
    website: 'https://www.tra.gov.au',
    typicalTime: '3–6 months',
    notes: [
      'Practical skills assessment (on-the-job) may be required',
      'Outcome is an AQF Certificate III or equivalent',
      'State licensing required separately after migration',
    ],
  },
  'CPAA': {
    name: 'CPA Australia',
    assesses: 'Accountants and finance professionals',
    website: 'https://www.cpaaustralia.com.au',
    typicalTime: '4–8 weeks',
    notes: ['Recognised for SC 189/190/491 skills assessment'],
  },
  'CAANZ': {
    name: 'Chartered Accountants Australia & New Zealand',
    assesses: 'Accountants (CA/ACA pathway)',
    website: 'https://www.charteredaccountantsanz.com',
    typicalTime: '4–8 weeks',
    notes: [],
  },
  'IPA': {
    name: 'IPA (Institute of Public Accountants)',
    assesses: 'Accountants',
    website: 'https://www.publicaccountants.org.au',
    typicalTime: '4–8 weeks',
    notes: [],
  },
  'AITSL': {
    name: 'AITSL (Australian Institute for Teaching and School Leadership)',
    assesses: 'Teachers (primary and secondary)',
    website: 'https://www.aitsl.edu.au',
    typicalTime: '3–4 months',
    notes: [
      'Must demonstrate qualification is comparable to Australian teaching standards',
      'State teacher registration required separately',
    ],
  },
  'AHPRA': {
    name: 'AHPRA (Australian Health Practitioner Regulation Agency)',
    assesses: 'Medical doctors, dentists, physiotherapists, psychologists, pharmacists, and other regulated health professions',
    website: 'https://www.ahpra.gov.au',
    typicalTime: '3–6 months',
    notes: [
      'Covers 16 regulated health professions',
      'Registration required to practise in Australia',
      'Assessment and registration are handled together',
    ],
  },
  'AACA': {
    name: 'AACA (Architects Accreditation Council of Australia)',
    assesses: 'Architects',
    website: 'https://www.aaca.org.au',
    typicalTime: '8–16 weeks',
    notes: [
      'Overseas architects must pass the OAA (Overseas Architects Assessment)',
      'State Board registration required to practise',
    ],
  },
  'NAATI': {
    name: 'NAATI (National Accreditation Authority for Translators and Interpreters)',
    assesses: 'Translators and interpreters',
    website: 'https://www.naati.com.au',
    typicalTime: '4–8 weeks',
    notes: ['Credential Recognition for translators/interpreters', 'NAATI points bonus available on points test'],
  },
  'AIQS': {
    name: 'AIQS (Australian Institute of Quantity Surveyors)',
    assesses: 'Quantity surveyors and construction economists',
    website: 'https://www.aiqs.com.au',
    typicalTime: '6–10 weeks',
    notes: [],
  },
  'ACECQA': {
    name: 'ACECQA (Australian Children\'s Education & Care Quality Authority)',
    assesses: 'Early childhood educators and childcare workers',
    website: 'https://www.acecqa.gov.au',
    typicalTime: '6–10 weeks',
    notes: [],
  },
  'SPA': {
    name: 'SPA (Surveying and Spatial Sciences Institute)',
    assesses: 'Surveyors and spatial scientists',
    website: 'https://www.sssi.org.au',
    typicalTime: '6–10 weeks',
    notes: [],
  },
  'AIPM': {
    name: 'AIPM (Australian Institute of Project Management)',
    assesses: 'Project managers and program managers',
    website: 'https://www.aipm.com.au',
    typicalTime: '4–8 weeks',
    notes: [],
  },
};

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatSnapshot(date: string): string {
  try {
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}

export default function OccupationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ state?: string }>();

  const [items, setItems] = useState<SkilledOccupation[]>([]);
  const [snapshotDate, setSnapshotDate] = useState<string>('');
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ListFilter>('All');
  const [jurisdiction, setJurisdiction] = useState<JurisdictionFilter>(() => {
    const p = (params.state ?? '').toString().toUpperCase();
    return (STATE_CODES as string[]).includes(p) ? (p as StateCode) : 'All';
  });
  const [selected, setSelected] = useState<SkilledOccupation | null>(null);
  const [savedAnzsco, setSavedAnzsco] = useState<string>('');
  const [expandedState, setExpandedState] = useState<StateCode | null>(null);
  const [selectedVisa, setSelectedVisa] = useState<'190' | '491' | '482'>('190');
  const [profile, setProfile] = useState<any>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdates | null>(null);
  const visaMeta = useMemo(() => buildVisaMetaMap(dailyUpdates), [dailyUpdates]);
  const [salaries, setSalaries] = useState<SalariesSnapshot>({
    snapshotDate: '1970-01-01',
    salaries: {},
  });

  useEffect(() => {
    (async () => {
      const snap = await getSkilledOccupations();
      const reqSnap = await refreshStateRequirements();
      const merged = mergeStateRequirements(snap.items, reqSnap.snapshot);
      setItems(deduplicateOccupations(merged));
      setSnapshotDate(snap.snapshotDate);
      setLastChecked(await getOccupationsLastCheckedAt());
      const p = await getProfile();
      setProfile(p);
      setSavedAnzsco(p.anzscoCode ?? '');
      // Salaries: show cache first, refresh in background.
      setSalaries(await getSalaries());
      refreshSalaries().then((s) => setSalaries(s)).catch(() => {});
      // Daily-monitor data (cost, processing cutoff, next invitation round)
      getDailyUpdates().then((u) => setDailyUpdates(u)).catch(() => {});
      // Refresh comprehensive all-anzsco list in background
      refreshAllAnzscoOccupations()
        .then((res) => {
          if (res.updated) {
            const merged2 = mergeStateRequirements(res.snapshot.items, reqSnap.snapshot);
            setItems(deduplicateOccupations(merged2));
            setSnapshotDate(res.snapshot.snapshotDate);
          }
        })
        .catch(() => {});
    })();
  }, []);

  const handleSetOccupation = async (o: SkilledOccupation) => {
    if (!profile) return;

    // Check if user has exceeded ANZSCO search limit
    if (hasExceededLimit('anzscoSearches', profile)) {
      setShowPaywall(true);
      return;
    }

    const code = savedAnzsco === o.anzsco ? '' : o.anzsco;
    await saveProfile({ anzscoCode: code });
    setSavedAnzsco(code);
    
    // Increment usage after successful save
    const updated = incrementUsage('anzscoSearches', profile);
    setProfile(updated);
    await saveProfile(updated);
    
    hapticSuccess();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    hapticTap();
    const [{ snapshot }, { updated: allAnzscoUpdated, snapshot: allAnzscoSnap }, reqResult, salarySnap] = await Promise.all([
      refreshSkilledOccupations({ force: true }),
      refreshAllAnzscoOccupations({ force: true }),
      refreshStateRequirements({ force: true }),
      refreshSalaries({ force: true }),
    ]);
    const finalSnapshot = allAnzscoUpdated ? allAnzscoSnap : snapshot;
    setItems(deduplicateOccupations(mergeStateRequirements(finalSnapshot.items, reqResult.snapshot)));
    setSnapshotDate(finalSnapshot.snapshotDate);
    setLastChecked(await getOccupationsLastCheckedAt());
    setSalaries(salarySnap);
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let base = items;
    // Jurisdiction filter
    if (jurisdiction !== 'All') {
      if (jurisdiction === 'Federal') {
        base = base.filter((o) => o.lists.length > 0);
      } else {
        base = base.filter((o) => o.states && (o.states as any)[jurisdiction]);
      }
    }
    // List filter (only meaningful for Federal scope)
    if (filter !== 'All') {
      base = base.filter((o) => o.lists.includes(filter));
    }
    return searchOccupations(base, query, 300);
  }, [items, filter, jurisdiction, query]);

  const FILTERS: ListFilter[] = ['All', ...SKILL_LISTS];
  const JURISDICTIONS: JurisdictionFilter[] = ['All', 'Federal', ...STATE_CODES];
  const showListFilter = jurisdiction === 'All' || jurisdiction === 'Federal';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={[Colors.primaryDark, Colors.background]}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerBadge}>
              <Ionicons name="briefcase-outline" size={12} color={Colors.accent} />
              <Text style={styles.headerBadgeText}>Federal lists</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>

          <Text style={styles.title}>Skilled Occupations</Text>
          <Text style={styles.subtitle}>
            Search every federal and state-nominated list in one place.
          </Text>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={Colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ANZSCO code, occupation, visa, authority…"
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="calendar-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.metaText}>Updated {formatSnapshot(snapshotDate)}</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="refresh-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.metaText}>Checked {timeAgo(lastChecked)}</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="list-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.metaText}>{filtered.length} results</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Jurisdiction pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {JURISDICTIONS.map((j) => {
            const active = jurisdiction === j;
            const tint =
              j === 'All' || j === 'Federal'
                ? Colors.accent
                : STATE_COLORS[j as StateCode];
            return (
              <TouchableOpacity
                key={j}
                style={[
                  styles.pill,
                  active && { backgroundColor: `${tint}22`, borderColor: tint },
                ]}
                onPress={() => {
                  hapticTap();
                  setJurisdiction(j);
                  // Reset list filter when switching to a state (lists are federal-only)
                  if (j !== 'All' && j !== 'Federal') setFilter('All');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, active && { color: tint, fontWeight: FontWeight.bold }]}>
                  {j}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Federal list pills (hidden when a state is selected) */}
        {showListFilter && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filterRow, styles.filterRowSecondary]}
            style={styles.filterScroll}
          >
            {FILTERS.map((f) => {
              const active = filter === f;
              const tint = f === 'All' ? Colors.textSecondary : LIST_COLORS[f as SkillList];
              return (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.pillSm,
                    active && { backgroundColor: `${tint}22`, borderColor: tint },
                  ]}
                  onPress={() => { hapticTap(); setFilter(f); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillTextSm, active && { color: tint }]}>{f}</Text>
                  <Text style={[styles.pillDescSm, active && { color: tint, opacity: 0.75 }]}>
                    {LIST_DESCRIPTIONS[f]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.anzsco}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const salary = getSalaryFor(salaries, item.anzsco);
            return (
            <TouchableOpacity
              style={[styles.card, savedAnzsco === item.anzsco && styles.cardSaved]}
              activeOpacity={0.85}
              onPress={() => { hapticTap(); setSelected(item); setExpandedState(null); }}
            >
              <View style={styles.cardHead}>
                <View style={styles.codePill}>
                  <Text style={styles.codePillText}>{item.anzsco}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.cardGroup}>{item.group}</Text>
                </View>
                {savedAnzsco === item.anzsco
                  ? <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  : <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                }
              </View>
              <View style={styles.cardFoot}>
                <View style={styles.chipRow}>
                  {item.lists.map((l) => (
                    <View
                      key={l}
                      style={[styles.listChip, { backgroundColor: `${LIST_COLORS[l]}22`, borderColor: LIST_COLORS[l] }]}
                    >
                      <Text style={[styles.listChipText, { color: LIST_COLORS[l] }]}>{l}</Text>
                    </View>
                  ))}
                  {jurisdiction !== 'All' && jurisdiction !== 'Federal' && item.states?.[jurisdiction as StateCode] && (
                    <View style={[styles.listChip, { backgroundColor: `${STATE_COLORS[jurisdiction as StateCode]}22`, borderColor: STATE_COLORS[jurisdiction as StateCode] }]}>
                      <Text style={[styles.listChipText, { color: STATE_COLORS[jurisdiction as StateCode] }]}>
                        {jurisdiction} {(item.states[jurisdiction as StateCode] ?? []).join('/')}
                      </Text>
                    </View>
                  )}
                  {salary && (
                    <View style={styles.salaryChip}>
                      <Ionicons name="cash-outline" size={11} color={Colors.success} />
                      <Text style={styles.salaryChipText}>{formatAnnualShort(salary.annualSalary)}/yr</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.visasText} numberOfLines={1}>
                  {item.visas.map((v) => `SC ${v}`).join(' · ')}
                </Text>
              </View>
            </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No occupations match your search.</Text>
            </View>
          }
        />
      </View>

      {/* Detail modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            {selected && (
              <>
                <View style={styles.modalHandle} />
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.modalHead}>
                    <View style={styles.codePillLg}>
                      <Text style={styles.codePillLgText}>ANZSCO {selected.anzsco}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalTitle}>{selected.name}</Text>
                  <Text style={styles.modalGroup}>{selected.group}</Text>

                  {(() => {
                    const salary = getSalaryFor(salaries, selected.anzsco);
                    if (!salary) return null;
                    return (
                      <View style={styles.salaryCard}>
                        <View style={styles.salaryCardHead}>
                          <Ionicons name="cash-outline" size={16} color={Colors.success} />
                          <Text style={styles.salaryCardTitle}>Median earnings (national)</Text>
                        </View>
                        <View style={styles.salaryCardRow}>
                          <Text style={styles.salaryCardValue}>
                            {formatAnnualFull(salary.annualSalary)}
                          </Text>
                          <Text style={styles.salaryCardUnit}>AUD / year</Text>
                        </View>
                        <Text style={styles.salaryCardSub}>
                          ${salary.weeklyEarnings.toLocaleString('en-AU')} / week
                          {salary.sourceLevel === '4-digit' ? ' · unit-group figure' : ''}
                        </Text>
                        <TouchableOpacity
                          onPress={() => { hapticTap(); Linking.openURL(salary.sourceUrl); }}
                          style={styles.salaryCardLink}
                        >
                          <Text style={styles.salaryCardLinkText}>
                            Source: Jobs and Skills Australia
                          </Text>
                          <Ionicons name="open-outline" size={12} color={Colors.accent} />
                        </TouchableOpacity>
                      </View>
                    );
                  })()}

                  <Text style={styles.sectionLabel}>Appears on</Text>
                  <View style={styles.chipRow}>
                    {selected.lists.map((l) => (
                      <View
                        key={l}
                        style={[styles.listChip, { backgroundColor: `${LIST_COLORS[l]}22`, borderColor: LIST_COLORS[l] }]}
                      >
                        <Text style={[styles.listChipText, { color: LIST_COLORS[l] }]}>{l}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.sectionLabel}>Eligible visas (federal)</Text>
                  <View style={styles.chipRow}>
                    {selected.visas.map((v) => (
                      <View key={v} style={styles.visaChip}>
                        <Text style={styles.visaChipText}>SC {v}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.sectionLabel}>State / territory eligibility</Text>
                  {selected.states && Object.keys(selected.states).length > 0 ? (
                    <>
                      <View style={styles.stateGrid}>
                        {STATE_CODES.map((s) => {
                          const visas = selected.states?.[s];
                          const available = !!visas && visas.length > 0;
                          const hasReqs = !!selected.stateRequirements?.[s];
                          const isOpen = expandedState === s;
                          return (
                            <TouchableOpacity
                              key={s}
                              activeOpacity={available ? 0.75 : 1}
                              disabled={!available}
                              onPress={() => {
                                setExpandedState(isOpen ? null : s);
                                hapticTap();
                              }}
                              style={[
                                styles.stateCell,
                                available
                                  ? { backgroundColor: `${STATE_COLORS[s]}1A`, borderColor: isOpen ? STATE_COLORS[s] : `${STATE_COLORS[s]}88` }
                                  : { opacity: 0.35 },
                              ]}
                            >
                              <Text style={[styles.stateCellCode, { color: available ? STATE_COLORS[s] : Colors.textMuted }]}>
                                {s}
                              </Text>
                              <Text style={styles.stateCellVisas}>
                                {available ? visas!.join(' · ') : '—'}
                              </Text>
                              {available && hasReqs && (
                                <Ionicons
                                  name={isOpen ? 'chevron-up' : 'information-circle-outline'}
                                  size={10}
                                  color={STATE_COLORS[s]}
                                  style={{ marginTop: 2 }}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Expanded state requirements panel with visa tabs */}
                      {expandedState && selected.stateRequirements?.[expandedState] && (() => {
                        const stateReqs = selected.stateRequirements[expandedState]!;
                        const req = (stateReqs as any)?.[selectedVisa];
                        const col = STATE_COLORS[expandedState];
                        
                        const VISA_LABELS: Record<'190' | '491' | '482', string> = {
                          '190': 'SC 190\nPermanent',
                          '491': 'SC 491\nRegional',
                          '482': 'SC 482\nEmployer',
                        };
                        
                        const VISA_DESCRIPTIONS: Record<'190' | '491' | '482', string> = {
                          '190': 'Skilled Independent — Permanent visa',
                          '491': 'Skilled Regional — 5-year provisional',
                          '482': 'Temporary Skill Shortage — Employer-sponsored',
                        };
                        
                        return (
                          <View style={[styles.stateReqPanel, { borderColor: `${col}40` }]}>
                            <View style={styles.stateReqHeader}>
                              <View style={[styles.stateReqDot, { backgroundColor: col }]} />
                              <Text style={[styles.stateReqTitle, { color: col }]}>
                                {expandedState} — Visa Requirements
                              </Text>
                            </View>

                            {/* Visa type tabs */}
                            <View style={styles.visaTabs}>
                              {(['190', '491', '482'] as const).map((visa) => (
                                <TouchableOpacity
                                  key={visa}
                                  onPress={() => setSelectedVisa(visa)}
                                  style={[
                                    styles.visaTab,
                                    selectedVisa === visa && { 
                                      backgroundColor: `${col}20`,
                                      borderBottomColor: col,
                                      borderBottomWidth: 2,
                                    }
                                  ]}
                                >
                                  <Text style={[
                                    styles.visaTabLabel,
                                    { color: selectedVisa === visa ? col : Colors.textMuted }
                                  ]}>
                                    {visa}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            {/* Requirements for selected visa */}
                            {req && req.status === 'not_sponsored' && (
                              <View style={styles.notSponsoredCard}>
                                <View style={styles.notSponsoredHeader}>
                                  <Ionicons name="close-circle" size={18} color={Colors.warning} />
                                  <Text style={styles.notSponsoredTitle}>
                                    Not eligible — SC {selectedVisa} in {expandedState}
                                  </Text>
                                </View>
                                <Text style={styles.notSponsoredReason}>
                                  {req.reason || `This occupation is not on the ${expandedState} nomination list for SC ${selectedVisa}.`}
                                </Text>
                                {req.notes && req.notes.length > 0 && (
                                  <View style={styles.notSponsoredNotes}>
                                    {req.notes.map((n: string, i: number) => (
                                      <Text key={i} style={styles.notSponsoredNoteText}>• {n}</Text>
                                    ))}
                                  </View>
                                )}
                                {req.sourceUrl ? (
                                  <Text style={styles.notSponsoredSource}>
                                    Official source: {req.sourceUrl}
                                  </Text>
                                ) : null}
                              </View>
                            )}
                            {req && req.status !== 'not_sponsored' && (
                              <>
                                <Text style={[styles.visaDescription, { color: Colors.textMuted }]}>
                                  {VISA_DESCRIPTIONS[selectedVisa]}
                                </Text>

                                {/* Live visa metadata (cost, processing cutoff) */}
                                {(() => {
                                  const meta = visaMeta[selectedVisa];
                                  if (!meta) return null;
                                  return (
                                    <View style={styles.visaMetaStrip}>
                                      {meta.cost && (
                                        <View style={styles.visaMetaPill}>
                                          <Ionicons name="card-outline" size={11} color={col} />
                                          <Text style={[styles.visaMetaText, { color: col }]}>
                                            {meta.cost}
                                          </Text>
                                        </View>
                                      )}
                                      {meta.processingCutoffLabel && (
                                        <View style={styles.visaMetaPill}>
                                          <Ionicons name="time-outline" size={11} color={col} />
                                          <Text style={[styles.visaMetaText, { color: col }]}>
                                            Processing: {meta.processingCutoffLabel}
                                          </Text>
                                        </View>
                                      )}
                                      {meta.stayDuration && (
                                        <View style={styles.visaMetaPill}>
                                          <Ionicons name="hourglass-outline" size={11} color={col} />
                                          <Text style={[styles.visaMetaText, { color: col }]}>
                                            Stay: {meta.stayDuration}
                                          </Text>
                                        </View>
                                      )}
                                      {/* Federal SkillSelect rounds only invite SC 189 (and SC 491 family-sponsored).
                                          SC 190 / state-nominated 491 use each state's own selection process — no federal "next round". */}
                                    </View>
                                  );
                                })()}

                                <View style={styles.stateReqRows}>
                                  {req.minSalary != null ? (
                                    <View style={styles.stateReqRow}>
                                      <Ionicons name="cash-outline" size={13} color={Colors.textMuted} />
                                      <Text style={styles.stateReqKey}>Min. salary</Text>
                                      <Text style={[styles.stateReqVal, { color: col }]}>
                                        ${req.minSalary.toLocaleString('en-AU')} AUD/yr
                                      </Text>
                                    </View>
                                  ) : req.salaryDataAvailable === false ? (
                                    <View style={styles.stateReqRow}>
                                      <Ionicons name="cash-outline" size={13} color={Colors.textMuted} />
                                      <Text style={styles.stateReqKey}>Min. salary</Text>
                                      <Text style={[styles.stateReqVal, { color: Colors.textMuted, fontStyle: 'italic' }]}>
                                        Data not available
                                      </Text>
                                    </View>
                                  ) : null}
                                  {req.minExperienceYears != null && (
                                    <View style={styles.stateReqRow}>
                                      <Ionicons name="briefcase-outline" size={13} color={Colors.textMuted} />
                                      <Text style={styles.stateReqKey}>Min. experience</Text>
                                      <Text style={[styles.stateReqVal, { color: col }]}>
                                        {req.minExperienceYears} year{req.minExperienceYears !== 1 ? 's' : ''}
                                      </Text>
                                    </View>
                                  )}
                                  {req.minPoints != null ? (
                                    <View style={styles.stateReqRow}>
                                      <Ionicons name="stats-chart-outline" size={13} color={Colors.textMuted} />
                                      <Text style={styles.stateReqKey}>Min. EOI points</Text>
                                      <Text style={[styles.stateReqVal, { color: col }]}>{req.minPoints} pts</Text>
                                    </View>
                                  ) : (
                                    <View style={styles.stateReqRow}>
                                      <Ionicons name="stats-chart-outline" size={13} color={Colors.textMuted} />
                                      <Text style={styles.stateReqKey}>Points test</Text>
                                      <Text style={[styles.stateReqVal, { color: Colors.success }]}>Not required</Text>
                                    </View>
                                  )}
                                  {req.maxAge != null && (
                                    <View style={styles.stateReqRow}>
                                      <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
                                      <Text style={styles.stateReqKey}>Max. age</Text>
                                      <Text style={[styles.stateReqVal, { color: col }]}>{req.maxAge}</Text>
                                    </View>
                                  )}
                                  <View style={styles.stateReqRow}>
                                    <Ionicons name="checkmark-circle-outline" size={13} color={Colors.textMuted} />
                                    <Text style={styles.stateReqKey}>Skills assessment</Text>
                                    <Text style={[styles.stateReqVal, { color: req.skillsAssessmentRequired ? Colors.warning : Colors.success }]}>
                                      {req.skillsAssessmentRequired ? 'Required' : 'Check with state'}
                                    </Text>
                                  </View>
                                  <View style={styles.stateReqRow}>
                                    <Ionicons name="document-text-outline" size={13} color={req.jobOfferRequired ? Colors.warning : Colors.success} />
                                    <Text style={styles.stateReqKey}>Job offer</Text>
                                    <Text style={[styles.stateReqVal, { color: req.jobOfferRequired ? Colors.warning : Colors.success }]}>
                                      {req.jobOfferRequired ? '🔴 REQUIRED' : 'Not required'}
                                    </Text>
                                  </View>
                                  {req.residencyRequired && (
                                    <View style={styles.stateReqRow}>
                                      <Ionicons name="home-outline" size={13} color={Colors.textMuted} />
                                      <Text style={styles.stateReqKey}>State residency</Text>
                                      <Text style={[styles.stateReqVal, { color: Colors.warning }]}>Required</Text>
                                    </View>
                                  )}
                                </View>

                                {req.notes && req.notes.length > 0 && (
                                  <View style={styles.stateReqNotes}>
                                    {req.notes.map((n, i) => (
                                      <View key={i} style={styles.stateReqNoteRow}>
                                        <View style={[styles.stateReqNoteDot, { backgroundColor: col }]} />
                                        <Text style={styles.stateReqNoteText}>{n}</Text>
                                      </View>
                                    ))}
                                  </View>
                                )}

                                {/* Australian University Graduate Pathway */}
                                {req.hasGraduatePathway && (
                                  <View style={[styles.gradPathwayCard, { borderColor: `${col}60`, backgroundColor: `${col}0D` }]}>
                                    <View style={styles.gradPathwayHeader}>
                                      <Ionicons name="school" size={16} color={col} />
                                      <Text style={[styles.gradPathwayTitle, { color: col }]}>
                                        🎓 {expandedState} Graduate Pathway Available
                                      </Text>
                                    </View>
                                    <Text style={styles.gradPathwayDesc}>
                                      Graduates of {expandedState} universities get an easier, faster nomination pathway with reduced salary requirements.
                                    </Text>
                                    <Text style={[styles.gradPathwaySubtitle, { color: col }]}>
                                      Eligible Universities:
                                    </Text>
                                    <View style={styles.gradPathwayUnis}>
                                      {(STATE_UNIVERSITIES[expandedState] || []).slice(0, 4).map((uni, i) => (
                                        <View key={i} style={styles.gradPathwayUniRow}>
                                          <Ionicons name="checkmark-circle" size={12} color={col} />
                                          <Text style={styles.gradPathwayUniText}>{uni}</Text>
                                        </View>
                                      ))}
                                      {STATE_UNIVERSITIES[expandedState]?.length > 4 && (
                                        <Text style={styles.gradPathwayUniMore}>
                                          +{STATE_UNIVERSITIES[expandedState].length - 4} more universities
                                        </Text>
                                      )}
                                    </View>
                                    <Text style={[styles.gradPathwaySubtitle, { color: col, marginTop: 8 }]}>
                                      Pathway Benefits:
                                    </Text>
                                    {(GRADUATE_BENEFITS[expandedState] || []).map((benefit, i) => (
                                      <View key={i} style={styles.gradPathwayBenefitRow}>
                                        <Text style={[styles.gradPathwayBenefitDot, { color: col }]}>⚡</Text>
                                        <Text style={styles.gradPathwayBenefitText}>{benefit}</Text>
                                      </View>
                                    ))}
                                  </View>
                                )}

                                <TouchableOpacity
                                  style={[styles.stateReqLink, { borderColor: `${col}40` }]}
                                  onPress={() => Linking.openURL(req.sourceUrl)}
                                  activeOpacity={0.8}
                                >
                                  <Ionicons name="open-outline" size={12} color={col} />
                                  <Text style={[styles.stateReqLinkText, { color: col }]}>View {expandedState} nomination page</Text>
                                  <Text style={styles.stateReqUpdated}>Updated {req.updatedAt}</Text>
                                </TouchableOpacity>
                              </>
                            )}

                            {!req && (
                              <Text style={[styles.bodyMuted, { padding: Spacing.md }]}>
                                SC {selectedVisa} requirements not available
                              </Text>
                            )}
                          </View>
                        );
                      })()}

                      {/* Fallback: state selected but no requirements found */}
                      {expandedState && !selected.stateRequirements?.[expandedState] && (
                        <View style={[styles.stateReqPanel, { borderColor: `${STATE_COLORS[expandedState]}40` }]}>
                          <View style={styles.stateReqHeader}>
                            <View style={[styles.stateReqDot, { backgroundColor: STATE_COLORS[expandedState] }]} />
                            <Text style={[styles.stateReqTitle, { color: STATE_COLORS[expandedState] }]}>
                              {expandedState} — No requirements found
                            </Text>
                          </View>
                          <Text style={styles.bodyMuted}>
                            State-specific requirements for this occupation are not currently available. Contact the {expandedState} state migration authority for nomination eligibility criteria.
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={styles.bodyMuted}>
                      Not currently on any state nomination list.
                    </Text>
                  )}

                  {/* ─── English Requirements ─────────────────────────── */}
                  {selected.visas.length > 0 && (() => {
                    const uniqueVisas = [...new Set(selected.visas)];
                    const reqs = uniqueVisas.map(v => ({ visa: v, req: VISA_ENGLISH[v] })).filter(x => x.req);
                    if (reqs.length === 0) return null;
                    // deduplicate by level
                    const seen = new Set<string>();
                    const deduped = reqs.filter(({ req }) => {
                      if (seen.has(req!.level)) return false;
                      seen.add(req!.level);
                      return true;
                    });
                    return (
                      <>
                        <Text style={styles.sectionLabel}>English requirements</Text>
                        {deduped.map(({ req }) => (
                          <View key={req!.level} style={[styles.engCard, { borderLeftColor: req!.color }]}>
                            <View style={styles.engCardTop}>
                              <View style={[styles.engLevelBadge, { backgroundColor: `${req!.color}20` }]}>
                                <Ionicons name="language-outline" size={12} color={req!.color} />
                                <Text style={[styles.engLevelText, { color: req!.color }]}>{req!.level}</Text>
                              </View>
                            </View>
                            <Text style={styles.engDesc}>{req!.description}</Text>
                            <View style={styles.engScores}>
                              <View style={styles.engScore}>
                                <Text style={styles.engScoreLabel}>IELTS</Text>
                                <Text style={styles.engScoreVal}>{req!.ielts}</Text>
                              </View>
                              <View style={styles.engDivider} />
                              <View style={styles.engScore}>
                                <Text style={styles.engScoreLabel}>PTE Academic</Text>
                                <Text style={styles.engScoreVal}>{req!.pte}</Text>
                              </View>
                              <View style={styles.engDivider} />
                              <View style={styles.engScore}>
                                <Text style={styles.engScoreLabel}>TOEFL iBT</Text>
                                <Text style={styles.engScoreVal}>{req!.toefl}</Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </>
                    );
                  })()}

                  {/* ─── Skills Assessment ────────────────────────────── */}
                  {selected.assessingAuthority && (() => {
                    const authorityKey = Object.keys(AUTHORITY_INFO).find(k =>
                      selected.assessingAuthority!.toLowerCase().includes(k.toLowerCase())
                    );
                    const info = authorityKey ? AUTHORITY_INFO[authorityKey] : null;
                    return (
                      <>
                        <Text style={styles.sectionLabel}>Skills assessment</Text>
                        <View style={styles.authCard}>
                          <View style={styles.authHeader}>
                            <View style={styles.authIcon}>
                              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.authName}>{info ? info.name : selected.assessingAuthority}</Text>
                              {info && <Text style={styles.authAssesses}>{info.assesses}</Text>}
                            </View>
                          </View>

                          {info && (
                            <>
                              <View style={styles.authRow}>
                                <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                                <Text style={styles.authRowKey}>Typical time</Text>
                                <Text style={styles.authRowVal}>{info.typicalTime}</Text>
                              </View>

                              {info.notes.length > 0 && (
                                <View style={styles.authNotes}>
                                  {info.notes.map((n, i) => (
                                    <View key={i} style={styles.authNoteRow}>
                                      <View style={styles.authNoteDot} />
                                      <Text style={styles.authNoteText}>{n}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}

                              <TouchableOpacity
                                style={styles.authLink}
                                activeOpacity={0.8}
                                onPress={() => Linking.openURL(info.website)}
                              >
                                <Ionicons name="open-outline" size={12} color={Colors.accent} />
                                <Text style={styles.authLinkText}>Visit {info.name} website</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </>
                    );
                  })()}

                  {/* Set as my occupation */}
                  <TouchableOpacity
                    style={[
                      styles.modalCta,
                      savedAnzsco === selected.anzsco && styles.modalCtaSaved,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleSetOccupation(selected)}
                  >
                    <Ionicons
                      name={savedAnzsco === selected.anzsco ? 'checkmark-circle' : 'bookmark-outline'}
                      size={14}
                      color={savedAnzsco === selected.anzsco ? Colors.primaryDark : Colors.primaryDark}
                    />
                    <Text style={styles.modalCtaText}>
                      {savedAnzsco === selected.anzsco ? 'My occupation ✓' : 'Set as my occupation'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalCta, styles.modalCtaSecondary]}
                    activeOpacity={0.85}
                    onPress={() =>
                      Linking.openURL(
                        `https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list?anzsco=${selected.anzsco}`
                      )
                    }
                  >
                    <Ionicons name="open-outline" size={14} color={Colors.textSecondary} />
                    <Text style={[styles.modalCtaText, { color: Colors.textSecondary }]}>View on DHA</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        userId={profile?.userId || 'local_user'}
        title="Unlock Advanced Occupation Search"
        message="You've used your 10 free ANZSCO searches for this month. Upgrade to Pro for unlimited access to explore all occupations across states and visa categories."
        feature="anzscoSearches"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  /* Header */
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.glass,
  },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: Radius.full, backgroundColor: Colors.glass,
  },
  headerBadgeText: { color: Colors.accent, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5 },

  title: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: 4 },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.md },

  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    padding: 0,
  },

  /* Meta pills */
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    backgroundColor: Colors.glass, borderRadius: Radius.full,
  },
  metaText: { fontSize: 10, color: Colors.textSecondary, fontWeight: FontWeight.semiBold },

  /* Filter pills */
  filterScroll: { flexShrink: 0 },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 8,
  },
  filterRowSecondary: {
    paddingVertical: 0,
    paddingBottom: Spacing.md,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  pillText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.semiBold },
  pillSm: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
    marginRight: 6,
    alignItems: 'center',
  },
  pillTextSm: { fontSize: 11, color: Colors.textSecondary, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  pillDescSm: { fontSize: 9, color: Colors.textMuted, marginTop: 1, letterSpacing: 0.2 },

  /* English card */
  engCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  engCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  engLevelBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  engLevelText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.4 },
  engDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm, lineHeight: 16 },
  engScores: { flexDirection: 'row', alignItems: 'flex-start', gap: 0 },
  engScore: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  engScoreLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: FontWeight.semiBold, marginBottom: 2, letterSpacing: 0.4 },
  engScoreVal: { fontSize: 9.5, color: Colors.textPrimary, fontWeight: FontWeight.bold, textAlign: 'center', lineHeight: 13 },
  engDivider: { width: 1, backgroundColor: Colors.divider, alignSelf: 'stretch', marginVertical: 4 },

  /* Skills assessment card */
  authCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: `${Colors.accent}0D`,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  authIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${Colors.accent}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  authName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 2 },
  authAssesses: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },
  authRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  authRowKey: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted },
  authRowVal: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  authNotes: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  authNoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  authNoteDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.accent, marginTop: 4 },
  authNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  authLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    margin: Spacing.md,
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: `${Colors.accent}40`,
    backgroundColor: `${Colors.accent}0D`,
  },
  authLinkText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, color: Colors.accent, flex: 1 },

  /* List */
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardSaved: {
    borderColor: Colors.success,
    backgroundColor: `${Colors.success}0D`,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codePill: {
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: Colors.glassStrong,
    borderRadius: Radius.sm,
  },
  codePillText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.bold, letterSpacing: 0.3 },
  cardName: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: FontWeight.semiBold },
  cardGroup: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    gap: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  listChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  listChipText: { fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.4 },
  visasText: { fontSize: 11, color: Colors.textSecondary, flexShrink: 1, textAlign: 'right' },

  salaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    backgroundColor: `${Colors.success}1A`,
    borderColor: `${Colors.success}66`,
  },
  salaryChipText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.success,
    letterSpacing: 0.2,
  },
  salaryCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: `${Colors.success}10`,
    borderWidth: 1,
    borderColor: `${Colors.success}40`,
    gap: 4,
  },
  salaryCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  salaryCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  salaryCardRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  salaryCardValue: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  salaryCardUnit: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  salaryCardSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  salaryCardLink: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  salaryCardLinkText: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    textDecorationLine: 'underline',
  },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codePillLg: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: Colors.glassStrong,
    borderRadius: Radius.md,
  },
  codePillLgText: { color: Colors.accent, fontWeight: FontWeight.bold, fontSize: FontSize.xs, letterSpacing: 0.5 },
  modalTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: Spacing.md },
  modalGroup: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 4 },

  sectionLabel: {
    fontSize: 10, fontWeight: FontWeight.bold,
    color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  bodyText: { color: Colors.textPrimary, fontSize: FontSize.sm },
  bodyMuted: { color: Colors.textMuted, fontSize: FontSize.sm, fontStyle: 'italic' },
  visaChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.sm,
    backgroundColor: Colors.glass,
    borderWidth: 1, borderColor: Colors.border,
  },
  visaChipText: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },

  /* State grid (modal) */
  stateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stateCell: {
    width: '23%',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.glass,
    alignItems: 'center',
  },
  stateCellCode: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.4 },
  stateCellVisas: { fontSize: 9, color: Colors.textSecondary, marginTop: 2 },

  // State requirements panel
  stateReqPanel: {
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  stateReqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  stateReqDot: { width: 8, height: 8, borderRadius: 4 },
  stateReqTitle: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  closedBadge: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  closedBadgeText: { fontSize: 10, color: '#EF4444', fontWeight: FontWeight.bold },
  stateReqRows: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  stateReqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  stateReqKey: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted },
  stateReqVal: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  stateReqNotes: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  stateReqNoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  stateReqNoteDot: { width: 5, height: 5, borderRadius: 3, marginTop: 5 },
  stateReqNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  stateReqLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  stateReqLinkText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, flex: 1 },
  stateReqUpdated: { fontSize: 10, color: Colors.textMuted },

  // Visa tabs
  visaTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.glass,
  },
  visaTab: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visaTabLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
  },
  visaDescription: {
    fontSize: FontSize.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    lineHeight: 16,
  },
  visaMetaStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  visaMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  visaMetaText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Not-sponsored card (occupation not on official list)
  notSponsoredCard: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${Colors.warning}55`,
    backgroundColor: `${Colors.warning}0D`,
  },
  notSponsoredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  notSponsoredTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.warning,
  },
  notSponsoredReason: {
    fontSize: FontSize.xs,
    color: Colors.text,
    marginBottom: 6,
  },
  notSponsoredNotes: {
    marginTop: 4,
  },
  notSponsoredNoteText: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  notSponsoredSource: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Australian Graduate Pathway Card
  gradPathwayCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  gradPathwayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  gradPathwayTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    flex: 1,
  },
  gradPathwayDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: Spacing.sm,
  },
  gradPathwaySubtitle: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  gradPathwayUnis: {
    gap: 4,
  },
  gradPathwayUniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gradPathwayUniText: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    flex: 1,
  },
  gradPathwayUniMore: {
    fontSize: 10,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  gradPathwayBenefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 3,
  },
  gradPathwayBenefitDot: {
    fontSize: 12,
    marginTop: -1,
  },
  gradPathwayBenefitText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },

  modalCta: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.secondary,
  },
  modalCtaSaved: {
    backgroundColor: Colors.success,
  },
  modalCtaSecondary: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCtaText: { color: Colors.primaryDark, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
});
