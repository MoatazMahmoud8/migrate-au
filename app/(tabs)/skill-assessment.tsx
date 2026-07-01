import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useColors } from '../../constants/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap as hapticTap } from '../../utils/haptics';

// ─── Types ────────────────────────────────────────────────────────────────────
type AuthCategory =
  | 'All'
  | 'General'
  | 'Health & Medical'
  | 'Engineering & IT'
  | 'Trades'
  | 'Education & Social'
  | 'Business & Finance'
  | 'Built Environment'
  | 'Arts & Language';

interface Authority {
  id: string;
  abbr: string;
  name: string;
  category: Exclude<AuthCategory, 'All'>;
  assesses: string;
  website: string;
  typicalTime: string;
  feeRange: string;
  notes: string[];
  color: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const CATEGORIES: AuthCategory[] = [
  'All', 'General', 'Health & Medical', 'Engineering & IT',
  'Trades', 'Education & Social', 'Business & Finance',
  'Built Environment', 'Arts & Language',
];

const CAT_ICONS: Record<AuthCategory, string> = {
  'All':                'apps-outline',
  'General':            'briefcase-outline',
  'Health & Medical':   'medkit-outline',
  'Engineering & IT':   'hardware-chip-outline',
  'Trades':             'construct-outline',
  'Education & Social': 'school-outline',
  'Business & Finance': 'bar-chart-outline',
  'Built Environment':  'business-outline',
  'Arts & Language':    'language-outline',
};

const AUTHORITIES: Authority[] = [
  // ── General ──────────────────────────────────────────────────────────────
  {
    id: 'vetassess', abbr: 'VETASSESS', name: 'VETASSESS',
    category: 'General', color: '#A78BFA',
    assesses: 'General professionals across management, health support, science, education, legal, communications, social sciences, sport, and many other fields not covered by specialist bodies',
    website: 'https://www.vetassess.com.au',
    typicalTime: '8–12 weeks', feeRange: '$600–$900',
    notes: [
      'Largest authority — covers most occupation groups not assessed elsewhere',
      'Technical Interview required for some occupations',
      'Assessment valid for 3 years',
      'Qualifications-only assessment also available',
    ],
  },

  // ── Health & Medical ─────────────────────────────────────────────────────
  {
    id: 'ahpra', abbr: 'AHPRA', name: 'Australian Health Practitioner Regulation Agency',
    category: 'Health & Medical', color: '#FF6B8A',
    assesses: 'Medical doctors, dentists, physiotherapists, psychologists, pharmacists, nurses, optometrists, osteopaths, chiropractors, podiatrists, Chinese medicine practitioners, medical radiation practitioners, occupational therapists, paramedicine practitioners',
    website: 'https://www.ahpra.gov.au',
    typicalTime: '3–6 months', feeRange: '$400–$800',
    notes: [
      'Covers 16 regulated health professions',
      'Registration and assessment handled together — must register to practise',
      'Each profession has its own national board under AHPRA',
    ],
  },
  {
    id: 'anmac', abbr: 'ANMAC', name: 'Australian Nursing & Midwifery Accreditation Council',
    category: 'Health & Medical', color: '#FF6B8A',
    assesses: 'Registered nurses, enrolled nurses, and midwives (immigration skills assessment)',
    website: 'https://www.anmac.org.au',
    typicalTime: '3–6 months', feeRange: '$500–$900',
    notes: [
      'AHPRA registration required separately to practise',
      'English: OET B in all 4 components, or IELTS 7.0 minimum',
      'Assessment valid for 2 years',
    ],
  },
  {
    id: 'apc', abbr: 'APC', name: 'Australian Pharmacy Council',
    category: 'Health & Medical', color: '#FF6B8A',
    assesses: 'Pharmacists',
    website: 'https://www.pharmacycouncil.org.au',
    typicalTime: '3–6 months', feeRange: '$500–$1,200',
    notes: [
      'Overseas-trained pharmacists must pass KAPS (Knowledge Assessment of Pharmaceutical Sciences) exams',
      'AHPRA registration required after passing assessment',
    ],
  },
  {
    id: 'ocanz', abbr: 'OCANZ', name: 'Optometry Council of Australia and New Zealand',
    category: 'Health & Medical', color: '#FF6B8A',
    assesses: 'Optometrists',
    website: 'https://www.ocanz.org',
    typicalTime: '3–6 months', feeRange: '$300–$700',
    notes: [
      'AHPRA Optometry Board registration required after assessment',
      'Competency-based assessment includes written and clinical exams',
    ],
  },
  {
    id: 'acpsem', abbr: 'ACPSEM', name: 'Australasian College of Physical Scientists & Engineers in Medicine',
    category: 'Health & Medical', color: '#FF6B8A',
    assesses: 'Medical physicists and radiation therapists',
    website: 'https://www.acpsem.org.au',
    typicalTime: '3–4 months', feeRange: '$500–$800',
    notes: ['TEAP (Training, Education and Assessment Program) pathway available'],
  },
  {
    id: 'avbc', abbr: 'AVBC', name: 'Australasian Veterinary Boards Council',
    category: 'Health & Medical', color: '#FF6B8A',
    assesses: 'Veterinarians',
    website: 'https://www.avbc.asn.au',
    typicalTime: '3–6 months', feeRange: '$300–$600',
    notes: [
      'May require additional exams for full registration with a state board',
      'State or territory veterinary board registration required to practise',
    ],
  },
  {
    id: 'da', abbr: 'DA', name: 'Dietitians Australia',
    category: 'Health & Medical', color: '#FF6B8A',
    assesses: 'Dietitians and nutritionists',
    website: 'https://www.dietitiansaustralia.org.au',
    typicalTime: '6–10 weeks', feeRange: '$300–$600',
    notes: [
      'APD (Accredited Practising Dietitian) status required for most clinical roles',
      'Bridging programs may be required for partial recognition',
    ],
  },
  {
    id: 'spa-health', abbr: 'SPA', name: 'Speech Pathology Australia',
    category: 'Health & Medical', color: '#FF6B8A',
    assesses: 'Speech pathologists',
    website: 'https://www.speechpathologyaustralia.org.au',
    typicalTime: '6–10 weeks', feeRange: '$300–$500',
    notes: [
      'CPSP (Certified Practising Speech Pathologist) status required for practice',
      'Competency-based assessment of qualifications and work experience',
    ],
  },
  {
    id: 'audiology', abbr: 'Audiology AU', name: 'Audiology Australia',
    category: 'Health & Medical', color: '#FF6B8A',
    assesses: 'Audiologists and audiometrists',
    website: 'https://www.audiology.asn.au',
    typicalTime: '6–10 weeks', feeRange: '$300–$600',
    notes: ['CAud (Certified Audiologist) certification required for practice'],
  },

  // ── Engineering & IT ─────────────────────────────────────────────────────
  {
    id: 'ea', abbr: 'Engineers Australia', name: 'Engineers Australia',
    category: 'Engineering & IT', color: '#00C2FF',
    assesses: 'Civil, mechanical, electrical, software, chemical, mining, structural, environmental, and all other engineering disciplines',
    website: 'https://www.engineersaustralia.org.au/msa',
    typicalTime: '10–16 weeks', feeRange: '$700–$1,100',
    notes: [
      'CDR (Competency Demonstration Report) required for most pathways',
      'Fast-track option available for chartered or equivalent engineers',
      'Assessment valid for 5 years',
      'Three categories: Professional Engineer, Engineering Technologist, Engineering Associate',
    ],
  },
  {
    id: 'acs', abbr: 'ACS', name: 'Australian Computer Society',
    category: 'Engineering & IT', color: '#00C2FF',
    assesses: 'Software engineers, network engineers, IT project managers, business analysts, developers, data scientists, cybersecurity specialists, database administrators',
    website: 'https://www.acs.org.au/msa',
    typicalTime: '4–8 weeks', feeRange: '$500–$700',
    notes: [
      'Both qualifications and work experience are assessed',
      'RPL (Recognition of Prior Learning) pathway available',
      'Assessment valid for 3 years',
      'ICT-related occupations on both MLTSSL and CSOL lists',
    ],
  },

  // ── Trades ───────────────────────────────────────────────────────────────
  {
    id: 'tra', abbr: 'TRA', name: 'Trades Recognition Australia',
    category: 'Trades', color: '#FFB800',
    assesses: 'Electricians, plumbers, refrigeration mechanics, motor mechanics, automotive electricians, carpenters, joiners, metal fabricators, bricklayers, tilers, and other trade occupations',
    website: 'https://www.tra.gov.au',
    typicalTime: '3–6 months', feeRange: '$400–$700',
    notes: [
      'Practical on-the-job assessment may be required in Australia',
      'Outcome is AQF Certificate III or equivalent',
      'State or territory trade licensing required separately after migration',
      'VETASSESS also assesses some trade occupations',
    ],
  },

  // ── Education & Social ───────────────────────────────────────────────────
  {
    id: 'aitsl', abbr: 'AITSL', name: 'Australian Institute for Teaching and School Leadership',
    category: 'Education & Social', color: '#00D68F',
    assesses: 'Primary teachers, secondary teachers, early childhood teachers',
    website: 'https://www.aitsl.edu.au',
    typicalTime: '3–4 months', feeRange: '$200–$500',
    notes: [
      'Qualifications compared against Australian Professional Standards for Teachers',
      'State or territory teacher registration required after migration',
      'Bridging programs may be required for partial recognition',
    ],
  },
  {
    id: 'aasw', abbr: 'AASW', name: 'Australian Association of Social Workers',
    category: 'Education & Social', color: '#00D68F',
    assesses: 'Social workers',
    website: 'https://www.aasw.asn.au',
    typicalTime: '8–12 weeks', feeRange: '$400–$700',
    notes: [
      'Must hold a qualifying social work degree',
      'Both academic qualifications and field education are assessed',
    ],
  },
  {
    id: 'acecqa', abbr: 'ACECQA', name: 'Australian Children\'s Education & Care Quality Authority',
    category: 'Education & Social', color: '#00D68F',
    assesses: 'Early childhood educators and childcare workers',
    website: 'https://www.acecqa.gov.au',
    typicalTime: '6–10 weeks', feeRange: '$100–$300',
    notes: [
      'Certificate III or Diploma in Early Childhood Education and Care required',
      'State or territory WWCC (Working With Children Check) required separately',
    ],
  },

  // ── Business & Finance ───────────────────────────────────────────────────
  {
    id: 'cpaa', abbr: 'CPA Australia', name: 'CPA Australia',
    category: 'Business & Finance', color: '#FFCD00',
    assesses: 'Accountants, finance managers, management consultants',
    website: 'https://www.cpaaustralia.com.au',
    typicalTime: '4–8 weeks', feeRange: '$400–$600',
    notes: [
      'Assesses equivalence of overseas qualifications to Australian CPA standards',
      'CPA membership available after migration — enhances career recognition',
    ],
  },
  {
    id: 'caanz', abbr: 'CA ANZ', name: 'Chartered Accountants Australia & New Zealand',
    category: 'Business & Finance', color: '#FFCD00',
    assesses: 'Accountants, auditors, finance professionals',
    website: 'https://www.charteredaccountantsanz.com',
    typicalTime: '4–8 weeks', feeRange: '$400–$600',
    notes: [
      'CA / ACA pathway available post-migration',
      'Internationally recognised membership credential',
    ],
  },
  {
    id: 'ipa', abbr: 'IPA', name: 'Institute of Public Accountants',
    category: 'Business & Finance', color: '#FFCD00',
    assesses: 'Accountants',
    website: 'https://www.publicaccountants.org.au',
    typicalTime: '4–8 weeks', feeRange: '$300–$500',
    notes: ['MIPA or FIPA membership available after assessment'],
  },
  {
    id: 'aipm', abbr: 'AIPM', name: 'Australian Institute of Project Management',
    category: 'Business & Finance', color: '#FFCD00',
    assesses: 'Project managers, program managers, portfolio managers',
    website: 'https://www.aipm.com.au',
    typicalTime: '4–8 weeks', feeRange: '$400–$700',
    notes: [
      'CPPM (Certified Practising Project Manager) credential available',
      'Both qualifications and work experience are assessed',
    ],
  },
  {
    id: 'finsia', abbr: 'FINSIA', name: 'Financial Services Institute of Australasia',
    category: 'Business & Finance', color: '#FFCD00',
    assesses: 'Financial services professionals, investment bankers, wealth managers',
    website: 'https://www.finsia.com',
    typicalTime: '4–8 weeks', feeRange: '$400–$700',
    notes: ['Specialist financial services credential recognised across Asia-Pacific'],
  },

  // ── Built Environment ────────────────────────────────────────────────────
  {
    id: 'aaca', abbr: 'AACA', name: 'Architects Accreditation Council of Australia',
    category: 'Built Environment', color: '#FF7043',
    assesses: 'Architects',
    website: 'https://www.aaca.org.au',
    typicalTime: '8–16 weeks', feeRange: '$500–$900',
    notes: [
      'Overseas architects must complete the OAA (Overseas Architects Assessment)',
      'Portfolio, experience review, and possible interviews required',
      'State Board of Architects registration required to practise',
    ],
  },
  {
    id: 'aiqs', abbr: 'AIQS', name: 'Australian Institute of Quantity Surveyors',
    category: 'Built Environment', color: '#FF7043',
    assesses: 'Quantity surveyors, construction cost managers, construction economists',
    website: 'https://www.aiqs.com.au',
    typicalTime: '6–10 weeks', feeRange: '$400–$700',
    notes: ['Graduate and Fellow membership pathways available after assessment'],
  },
  {
    id: 'sssi', abbr: 'SSSI', name: 'Surveying & Spatial Sciences Institute',
    category: 'Built Environment', color: '#FF7043',
    assesses: 'Land surveyors, geospatial scientists, remote sensing specialists, hydrographers, cartographers',
    website: 'https://www.sssi.org.au',
    typicalTime: '6–10 weeks', feeRange: '$300–$600',
    notes: ['Registration as a Licensed Surveyor required by state boards for cadastral surveying'],
  },
  {
    id: 'rics', abbr: 'RICS', name: 'Royal Institution of Chartered Surveyors',
    category: 'Built Environment', color: '#FF7043',
    assesses: 'Quantity surveyors, property valuers, project managers, facilities managers, infrastructure specialists',
    website: 'https://www.rics.org/en-au',
    typicalTime: '3–6 months', feeRange: '$500–$1,000',
    notes: [
      'APC (Assessment of Professional Competence) pathway to MRICS',
      'MRICS and FRICS credentials internationally recognised',
    ],
  },
  {
    id: 'pia', abbr: 'PIA', name: 'Planning Institute of Australia',
    category: 'Built Environment', color: '#FF7043',
    assesses: 'Urban and regional planners, town planners',
    website: 'https://www.planning.org.au',
    typicalTime: '6–10 weeks', feeRange: '$300–$600',
    notes: ['MPIA (Member of the Planning Institute of Australia) credential available after assessment'],
  },

  // ── Arts & Language ──────────────────────────────────────────────────────
  {
    id: 'naati', abbr: 'NAATI', name: 'National Accreditation Authority for Translators and Interpreters',
    category: 'Arts & Language', color: '#4F8EF7',
    assesses: 'Translators, interpreters, and language professionals',
    website: 'https://www.naati.com.au',
    typicalTime: '4–8 weeks', feeRange: '$200–$500',
    notes: [
      'NAATI certification earns 5 bonus points on the points test',
      'CCL (Credential for Community Language) test — popular for points boost',
      'Certification levels: Certified, Professional, Senior',
      'Covers 70+ languages',
    ],
  },
  {
    id: 'alia', abbr: 'ALIA', name: 'Australian Library and Information Association',
    category: 'Arts & Language', color: '#4F8EF7',
    assesses: 'Librarians, information managers, knowledge managers',
    website: 'https://www.alia.org.au',
    typicalTime: '6–10 weeks', feeRange: '$200–$400',
    notes: ['ALIA membership and AALIA (Associate) credential available after assessment'],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function SkillAssessmentScreen() {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<AuthCategory>('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return AUTHORITIES.filter((a) => {
      const matchesCat = category === 'All' || a.category === category;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        a.abbr.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.assesses.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  const toggle = (id: string) => {
    hapticTap();
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 110 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.background]}
        style={[styles.header, { paddingTop: insets.top + 60 }]}
      >
        <View style={styles.headerBadge}>
          <Ionicons name="ribbon-outline" size={14} color={Colors.secondary} />
          <Text style={styles.headerBadgeText}>{AUTHORITIES.length} assessment bodies</Text>
        </View>
        <Text style={styles.headerTitle}>Skills Assessment</Text>
        <Text style={styles.headerSub}>
          Find the right assessing authority for your occupation and understand what your assessment involves.
        </Text>
      </LinearGradient>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by authority, occupation…"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catScroll}
      >
        {CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => { hapticTap(); setCategory(cat); }}
              activeOpacity={0.8}
              style={[styles.catChip, active && styles.catChipActive]}
            >
              <Ionicons
                name={CAT_ICONS[cat] as any}
                size={12}
                color={active ? Colors.primaryDark : Colors.textMuted}
              />
              <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Result count */}
      <View style={styles.resultRow}>
        <Text style={styles.resultText}>
          {filtered.length} {filtered.length === 1 ? 'authority' : 'authorities'}
          {query ? ` for "${query}"` : category !== 'All' ? ` in ${category}` : ''}
        </Text>
      </View>

      {/* Authority list */}
      <View style={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No authorities match your search</Text>
            <TouchableOpacity onPress={() => { setQuery(''); setCategory('All'); }}>
              <Text style={styles.emptyReset}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((auth) => {
            const isOpen = expanded === auth.id;
            return (
              <TouchableOpacity
                key={auth.id}
                onPress={() => toggle(auth.id)}
                activeOpacity={0.85}
              >
                <View style={[styles.card, isOpen && { borderColor: `${auth.color}50` }]}>
                  {/* Accent bar */}
                  <View style={[styles.cardAccent, { backgroundColor: auth.color }]} />

                  <View style={styles.cardMain}>
                    {/* Top row */}
                    <View style={styles.cardTop}>
                      <View style={[styles.abbrBadge, { backgroundColor: `${auth.color}18`, borderColor: `${auth.color}30` }]}>
                        <Text style={[styles.abbrText, { color: auth.color }]} numberOfLines={1}>
                          {auth.abbr}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.authName} numberOfLines={isOpen ? undefined : 1}>
                          {auth.name}
                        </Text>
                        <View style={styles.catRow}>
                          <Ionicons name={CAT_ICONS[auth.category] as any} size={10} color={Colors.textMuted} />
                          <Text style={styles.catLabel}>{auth.category}</Text>
                        </View>
                      </View>
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={Colors.textMuted}
                      />
                    </View>

                    {/* Assesses summary (always visible) */}
                    <Text style={styles.assessesSummary} numberOfLines={isOpen ? undefined : 2}>
                      {auth.assesses}
                    </Text>

                    {/* Expanded detail */}
                    {isOpen && (
                      <View style={styles.detail}>
                        <View style={styles.metaRow}>
                          <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                            <View>
                              <Text style={styles.metaLabel}>Typical time</Text>
                              <Text style={[styles.metaVal, { color: auth.color }]}>{auth.typicalTime}</Text>
                            </View>
                          </View>
                          <View style={styles.metaDivider} />
                          <View style={styles.metaItem}>
                            <Ionicons name="cash-outline" size={13} color={Colors.textMuted} />
                            <View>
                              <Text style={styles.metaLabel}>Approx. fee</Text>
                              <Text style={[styles.metaVal, { color: auth.color }]}>{auth.feeRange}</Text>
                            </View>
                          </View>
                        </View>

                        {auth.notes.length > 0 && (
                          <View style={styles.notes}>
                            {auth.notes.map((n, i) => (
                              <View key={i} style={styles.noteRow}>
                                <View style={[styles.noteDot, { backgroundColor: auth.color }]} />
                                <Text style={styles.noteText}>{n}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        <TouchableOpacity
                          style={[styles.websiteBtn, { borderColor: `${auth.color}40`, backgroundColor: `${auth.color}0D` }]}
                          activeOpacity={0.8}
                          onPress={() => Linking.openURL(auth.website)}
                        >
                          <Ionicons name="open-outline" size={13} color={auth.color} />
                          <Text style={[styles.websiteBtnText, { color: auth.color }]}>
                            Visit {auth.abbr} website
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Footer note */}
      <View style={styles.footerNote}>
        <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.footerNoteText}>
          Fees and processing times are indicative. Always confirm current requirements on the authority's official website.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,205,0,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,205,0,0.25)',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: Radius.full, marginBottom: Spacing.md,
  },
  headerBadgeText: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.xxxl, fontWeight: FontWeight.extraBold, marginBottom: Spacing.sm, letterSpacing: -0.5 },
  headerSub: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 22 },

  searchWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.md },

  catScroll: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  catChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  catChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, color: Colors.textMuted },
  catChipTextActive: { color: Colors.primaryDark },

  resultRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xs },
  resultText: { fontSize: FontSize.xs, color: Colors.textMuted },

  list: { paddingHorizontal: Spacing.lg },

  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  cardAccent: { width: 3 },
  cardMain: { flex: 1, padding: Spacing.md },

  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.xs },
  abbrBadge: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: Radius.sm, borderWidth: 1,
    maxWidth: 110, alignItems: 'center',
  },
  abbrText: { fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.3 },
  authName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, flex: 1, lineHeight: 18 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  catLabel: { fontSize: 10, color: Colors.textMuted },

  assessesSummary: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17, marginBottom: 2 },

  detail: { marginTop: Spacing.sm },
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.glass,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.sm, overflow: 'hidden',
  },
  metaItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  metaDivider: { width: 1, height: 32, backgroundColor: Colors.divider },
  metaLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: FontWeight.semiBold, letterSpacing: 0.3 },
  metaVal: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  notes: { marginBottom: Spacing.sm },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginBottom: 6 },
  noteDot: { width: 5, height: 5, borderRadius: 3, marginTop: 5 },
  noteText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },

  websiteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm, borderWidth: 1,
  },
  websiteBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, flex: 1 },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.md },
  emptyReset: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, marginTop: 4 },

  footerNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
  },
  footerNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },
});
