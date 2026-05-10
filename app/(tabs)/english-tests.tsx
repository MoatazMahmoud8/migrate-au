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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Data ──────────────────────────────────────────────────────────────────

const TEST_CENTERS = [
  {
    name: 'IELTS',
    color: '#4F8EF7',
    icon: 'document-text-outline',
    providers: [
      {
        label: 'IDP Australia (Official Administrator)',
        sublabel: 'Book online — real-time seat availability',
        url: 'https://ielts.idp.com/australia',
        badge: 'Official',
      },
      {
        label: 'IELTS.org — Global Test Centre Search',
        sublabel: 'Find any IELTS-approved venue worldwide',
        url: 'https://www.ielts.org/',
        badge: null,
      },
    ],
  },
  {
    name: 'PTE Academic',
    color: '#00C2FF',
    icon: 'laptop-outline',
    providers: [
      {
        label: 'Pearson PTE — Test Centres & Dates',
        sublabel: 'Computer-based — centres in all major Australian cities',
        url: 'https://www.pearsonpte.com/pte-academic',
        badge: 'Official',
      },
    ],
  },
  {
    name: 'TOEFL iBT',
    color: '#FF6B8A',
    icon: 'school-outline',
    providers: [
      {
        label: 'ETS — Find TOEFL Test Centres',
        sublabel: 'Available at-home and at test centres across Australia',
        url: 'https://www.ets.org/toefl/test-takers/ibt/about/',
        badge: 'Official',
      },
    ],
  },
  {
    name: 'CAE (Cambridge C1)',
    color: '#A78BFA',
    icon: 'ribbon-outline',
    providers: [
      {
        label: 'Cambridge English — Find a Centre',
        sublabel: 'Search approved exam centres in Australia',
        url: 'https://www.cambridgeenglish.org/find-a-centre/',
        badge: 'Official',
      },
    ],
  },
  {
    name: 'OET',
    color: '#00D68F',
    icon: 'medkit-outline',
    providers: [
      {
        label: 'OET — Book a Test',
        sublabel: 'Healthcare professionals only · Computer-delivered',
        url: 'https://oet.com/',
        badge: 'Official',
      },
    ],
  },
];

const APPROVED_TESTS = [
  { name: 'IELTS', full: 'International English Language Testing System', icon: 'document-text-outline', color: '#4F8EF7' },
  { name: 'PTE', full: 'Pearson Test of English Academic', icon: 'laptop-outline', color: '#00C2FF' },
  { name: 'TOEFL iBT', full: 'Test of English as a Foreign Language', icon: 'school-outline', color: '#FF6B8A' },
  { name: 'CAE', full: 'Cambridge C1 Advanced English', icon: 'ribbon-outline', color: '#A78BFA' },
  { name: 'OET', full: 'Occupational English Test (healthcare only)', icon: 'medkit-outline', color: '#00D68F' },
];

// DHA English Proficiency Levels with per-test minimum scores
const LEVELS = [
  {
    level: 'Competent',
    description: 'Minimum for most skilled visas (189, 190, 491, 186)',
    color: Colors.accent,
    scores: {
      'IELTS': '6.0 in each band',
      'PTE': '50 in each communicative skill',
      'TOEFL iBT': 'R 24 · L 21 · W 27 · S 23',
      'CAE': '169 in each component',
      'OET': 'B in each component',
    },
  },
  {
    level: 'Proficient',
    description: '+10 points bonus in EOI (189/190/491)',
    color: Colors.secondary,
    scores: {
      'IELTS': '7.0 in each band',
      'PTE': '65 in each communicative skill',
      'TOEFL iBT': 'R 24 · L 24 · W 27 · S 23',
      'CAE': '185 in each component',
      'OET': 'B in each component',
    },
  },
  {
    level: 'Superior',
    description: '+20 points bonus in EOI (189/190/491)',
    color: '#FF6B8A',
    scores: {
      'IELTS': '8.0 in each band',
      'PTE': '79 in each communicative skill',
      'TOEFL iBT': 'R 24 · L 24 · W 27 · S 23',
      'CAE': '200 in each component',
      'OET': 'Not applicable',
    },
  },
  {
    level: 'Vocational',
    description: 'Required for Subclass 482 (Short-term stream)',
    color: '#FF7043',
    scores: {
      'IELTS': '5.0 average · no band below 4.5',
      'PTE': '36 in each communicative skill',
      'TOEFL iBT': 'R 3 · L 3 · W 14 · S 12',
      'CAE': '154 in each component',
      'OET': 'Not applicable',
    },
  },
];

const VISA_REQUIREMENTS = [
  {
    code: '189',
    name: 'Skilled Independent',
    color: '#4F8EF7',
    icon: 'earth-outline',
    level: 'Competent',
    levelColor: Colors.accent,
    notes: [
      'Minimum: Competent English (6.0 IELTS each band)',
      'Proficient (7.0) adds +10 points to EOI score',
      'Superior (8.0) adds +20 points to EOI score',
      'All 4 bands must meet the minimum — no averaging',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189/points-tested',
  },
  {
    code: '190',
    name: 'Skilled Nominated',
    color: '#00C2FF',
    icon: 'location-outline',
    level: 'Competent',
    levelColor: Colors.accent,
    notes: [
      'Minimum: Competent English (6.0 IELTS each band)',
      'Proficient or Superior earns bonus EOI points',
      'State/territory may require higher English for nomination',
      'All 4 bands must meet the minimum — no averaging',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190',
  },
  {
    code: '491',
    name: 'Skilled Work Regional',
    color: '#A78BFA',
    icon: 'map-outline',
    level: 'Competent',
    levelColor: Colors.accent,
    notes: [
      'Minimum: Competent English (6.0 IELTS each band)',
      'Proficient or Superior earns bonus EOI points (+10/+20)',
      'Regional sponsor may require higher English',
      'All 4 bands must meet the minimum — no averaging',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491',
  },
  {
    code: '482',
    name: 'Temporary Skill Shortage',
    color: '#FF6B8A',
    icon: 'briefcase-outline',
    level: 'Vocational',
    levelColor: '#FF7043',
    notes: [
      'Short-term stream: Vocational English (IELTS 5.0 avg)',
      'Medium-term & Labour Agreement streams: Competent (6.0)',
      'Employer can request exemption via labour agreement',
      'TOEFL iBT accepted for medium-term stream only',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-skill-shortage-482',
  },
  {
    code: '186',
    name: 'Employer Nomination (ENS)',
    color: '#FF7043',
    icon: 'business-outline',
    level: 'Competent',
    levelColor: Colors.accent,
    notes: [
      'Direct Entry stream: Competent English (6.0 IELTS each band)',
      'Transition stream: must hold 457/482 — same test applies',
      'Test result must be no more than 3 years old',
      'All 4 bands must meet the minimum — no averaging',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186',
  },
  {
    code: '485',
    name: 'Graduate Temporary',
    color: '#00D68F',
    icon: 'school-outline',
    level: 'Competent',
    levelColor: Colors.accent,
    notes: [
      'Minimum: Competent English (6.0 IELTS each band)',
      'Applied during final stage of study in Australia',
      'English requirement waived if studied in Australia for ≥2 years',
      'Test must be taken within 3 years of application',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485',
  },
  {
    code: '820/801',
    name: 'Partner Visa',
    color: '#FFB800',
    icon: 'heart-outline',
    level: 'Functional',
    levelColor: '#FFB800',
    notes: [
      'Functional English (IELTS 4.5 avg, no band below 4.0)',
      'OR pay the Biennial Immigration Instruction Package (BIIP) fee',
      'Basic English sufficient for some sub-cases',
      'Citizen partner sponsor may waive the requirement',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-820-801',
  },
  {
    code: '500',
    name: 'Student Visa',
    color: '#7C3AED',
    icon: 'book-outline',
    level: 'Varies',
    levelColor: Colors.textMuted,
    notes: [
      'Set by each education provider, not DHA directly',
      'University degrees: typically IELTS 6.0–6.5',
      'TAFE / VET: typically IELTS 5.5',
      'English schools: typically IELTS 4.5–5.5',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function EnglishTestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedVisa, setExpandedVisa] = useState<string | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
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
          <Text style={styles.headerBadgeText}>DHA Approved Tests</Text>
        </View>
        <Text style={styles.headerTitle}>English Requirements</Text>
        <Text style={styles.headerSub}>
          Approved tests and minimum scores for Australian skilled, employer-sponsored, and partner visas.
        </Text>
      </LinearGradient>

      {/* Approved Tests Pills */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5 Approved Tests</Text>
        <View style={styles.testPills}>
          {APPROVED_TESTS.map((t) => (
            <View key={t.name} style={[styles.testPill, { borderColor: t.color + '40', backgroundColor: t.color + '12' }]}>
              <Ionicons name={t.icon as any} size={14} color={t.color} />
              <View>
                <Text style={[styles.testPillName, { color: t.color }]}>{t.name}</Text>
                <Text style={styles.testPillFull}>{t.full}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Proficiency Levels */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Proficiency Levels & Scores</Text>
        <Text style={styles.sectionSub}>Tap a level to see scores for each test</Text>
        {LEVELS.map((l) => {
          const isOpen = expandedLevel === l.level;
          return (
            <TouchableOpacity
              key={l.level}
              activeOpacity={0.85}
              onPress={() => setExpandedLevel(isOpen ? null : l.level)}
            >
              <View style={[styles.levelCard, isOpen && styles.levelCardOpen]}>
                <View style={[styles.levelAccent, { backgroundColor: l.color }]} />
                <View style={styles.levelCardMain}>
                  <View style={styles.levelCardTop}>
                    <View>
                      <Text style={[styles.levelName, { color: l.color }]}>{l.level}</Text>
                      <Text style={styles.levelDesc}>{l.description}</Text>
                    </View>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={Colors.textMuted}
                    />
                  </View>

                  {isOpen && (
                    <View style={styles.levelScores}>
                      {Object.entries(l.scores).map(([test, score]) => (
                        <View key={test} style={styles.scoreRow}>
                          <Text style={styles.scoreTest}>{test}</Text>
                          <Text style={styles.scoreValue}>{score}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Per-Visa Requirements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By Visa Subclass</Text>
        <Text style={styles.sectionSub}>Tap a visa for detailed requirements</Text>
        {VISA_REQUIREMENTS.map((v) => {
          const isOpen = expandedVisa === v.code;
          return (
            <TouchableOpacity
              key={v.code}
              activeOpacity={0.85}
              onPress={() => setExpandedVisa(isOpen ? null : v.code)}
            >
              <View style={[styles.visaCard, isOpen && styles.visaCardOpen]}>
                <View style={[styles.visaAccent, { backgroundColor: v.color }]} />
                <View style={styles.visaCardMain}>
                  <View style={styles.visaCardTop}>
                    <View style={[styles.visaCodeBadge, { backgroundColor: v.color + '18', borderColor: v.color + '30' }]}>
                      <Text style={[styles.visaCode, { color: v.color }]}>{v.code}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.visaName}>{v.name}</Text>
                      <View style={[styles.levelBadge, { backgroundColor: v.levelColor + '18', borderColor: v.levelColor + '30' }]}>
                        <Text style={[styles.levelBadgeText, { color: v.levelColor }]}>{v.level} English</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={Colors.textMuted}
                    />
                  </View>

                  {isOpen && (
                    <View style={styles.visaDetails}>
                      {v.notes.map((note, i) => (
                        <View key={i} style={styles.noteRow}>
                          <View style={[styles.noteDot, { backgroundColor: v.color }]} />
                          <Text style={styles.noteText}>{note}</Text>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={[styles.officialBtn, { borderColor: v.color + '40' }]}
                        onPress={() => Linking.openURL(v.url)}
                      >
                        <Ionicons name="open-outline" size={13} color={v.color} />
                        <Text style={[styles.officialBtnText, { color: v.color }]}>View on immi.homeaffairs.gov.au</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Find a Test Centre */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Find a Test Centre</Text>
        <Text style={styles.sectionSub}>Direct links to each official booking portal</Text>
        {TEST_CENTERS.map((tc) => (
          <View key={tc.name} style={[styles.centerCard, { borderColor: tc.color + '30' }]}>
            <View style={[styles.centerHeader, { backgroundColor: tc.color + '12' }]}>
              <Ionicons name={tc.icon as any} size={16} color={tc.color} />
              <Text style={[styles.centerTestName, { color: tc.color }]}>{tc.name}</Text>
            </View>
            {tc.providers.map((p) => (
              <TouchableOpacity
                key={p.url}
                style={styles.centerRow}
                activeOpacity={0.75}
                onPress={() => Linking.openURL(p.url)}
              >
                <View style={styles.centerRowLeft}>
                  <Text style={styles.centerRowLabel}>{p.label}</Text>
                  <Text style={styles.centerRowSub}>{p.sublabel}</Text>
                </View>
                <View style={styles.centerRowRight}>
                  {p.badge && (
                    <View style={[styles.officialBadge, { backgroundColor: tc.color + '18', borderColor: tc.color + '30' }]}>
                      <Text style={[styles.officialBadgeText, { color: tc.color }]}>{p.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="open-outline" size={16} color={Colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Partner with us */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.partnerBanner}
        onPress={() => Linking.openURL('mailto:support@jsmglobal.xyz?subject=Test%20Centre%20Partnership%20Enquiry&body=Hi%2C%20I%20am%20interested%20in%20partnering%20with%20MigrateAU%20to%20reach%20skilled%20migration%20applicants%20preparing%20for%20English%20tests.')}
      >
        <LinearGradient
          colors={['#0A1A2E', '#0D2240']}
          style={styles.partnerGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.partnerLeft}>
            <View style={styles.partnerIcon}>
              <Ionicons name="megaphone-outline" size={18} color={Colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partnerTitle}>Are you a test prep centre?</Text>
              <Text style={styles.partnerSub}>Reach thousands of skilled migration applicants — tap to get in touch</Text>
            </View>
          </View>
          <View style={styles.partnerCta}>
            <Ionicons name="mail-outline" size={14} color={Colors.secondary} />
            <Text style={styles.partnerCtaText}>Partner with us</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="alert-circle-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.disclaimerText}>
          Requirements may change. Always verify on{' '}
          <Text
            style={styles.disclaimerLink}
            onPress={() => Linking.openURL('https://immi.homeaffairs.gov.au')}
          >
            immi.homeaffairs.gov.au
          </Text>
          {' '}or consult a{' '}
          <Text
            style={styles.disclaimerLink}
            onPress={() => Linking.openURL('https://portal.mara.gov.au')}
          >
            MARA-registered agent
          </Text>.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  backBtn: {
    position: 'absolute',
    top: 0,
    left: Spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.glassStrong,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerBadgeText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.semiBold },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extraBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  section: { paddingHorizontal: Spacing.xl, marginTop: Spacing.xl },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },

  // Test pills
  testPills: { gap: Spacing.sm },
  testPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  testPillName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  testPillFull: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },

  // Level cards
  levelCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  levelCardOpen: { borderColor: Colors.divider },
  levelAccent: { width: 4, borderRadius: Radius.sm },
  levelCardMain: { flex: 1, padding: Spacing.md },
  levelCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelName: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  levelDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  levelScores: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreTest: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textSecondary },
  scoreValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium, textAlign: 'right', flex: 1, marginLeft: Spacing.md },

  // Visa cards
  visaCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  visaCardOpen: { borderColor: Colors.divider },
  visaAccent: { width: 4 },
  visaCardMain: { flex: 1, padding: Spacing.md },
  visaCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  visaCodeBadge: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 46,
  },
  visaCode: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  visaName: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary, marginBottom: 4 },
  levelBadge: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  levelBadgeText: { fontSize: 10, fontWeight: FontWeight.semiBold },

  visaDetails: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  noteDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  noteText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  officialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  officialBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: Colors.glass,
    borderRadius: Radius.md,
  },
  disclaimerText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },
  disclaimerLink: { color: Colors.accent, textDecorationLine: 'underline' },

  // Test centre cards
  centerCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  centerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  centerTestName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  centerRowLeft: { flex: 1 },
  centerRowLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  centerRowSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  centerRowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  officialBadge: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  officialBadgeText: { fontSize: 10, fontWeight: FontWeight.bold },

  // Partner banner
  partnerBanner: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,205,0,0.2)',
  },
  partnerGrad: { padding: Spacing.xl },
  partnerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  partnerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,205,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,205,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  partnerSub: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16, marginTop: 2 },
  partnerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,205,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,205,0,0.25)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  partnerCtaText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.secondary },
});
