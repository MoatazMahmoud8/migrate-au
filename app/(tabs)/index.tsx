import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchModal from '../../components/SearchModal';
import { ALL_VISAS, CATEGORY_META, ALL_CATEGORIES } from '../../constants/visaData';

const { width, height } = Dimensions.get('window');

// ─── Visa Finder Data ─────────────────────────────────────────────────────────

const VISA_PURPOSES = [
  {
    id: 'skilled',
    icon: 'briefcase-outline' as const,
    label: 'Skilled Work',
    hint: 'Points-tested PR',
    color: Colors.accent,
    bg: 'rgba(0,194,255,0.12)',
    visas: [
      { code: '189', name: 'Skilled Independent',  why: 'Points-tested permanent visa — no employer or state sponsor needed.' },
      { code: '190', name: 'State Nominated',       why: 'Earn 5 extra points with a state nomination. Popular choice.' },
      { code: '491', name: 'Regional Sponsored',    why: 'Live & work regionally for 3 years, then apply for PR via 191.' },
    ],
  },
  {
    id: 'family',
    icon: 'people-outline' as const,
    label: 'Join Family',
    hint: 'Partner, parent, child',
    color: '#F472B6',
    bg: 'rgba(244,114,182,0.12)',
    visas: [
      { code: '820/801', name: 'Partner Visa',   why: 'For partners of Australian citizens or PRs — temporary then permanent.' },
      { code: '103',     name: 'Parent Visa',     why: 'Join your child who is an Australian citizen or permanent resident.' },
      { code: '101',     name: 'Child Visa',       why: 'Permanent visa for children of Australian citizens or PRs.' },
    ],
  },
  {
    id: 'study',
    icon: 'school-outline' as const,
    label: 'Study',
    hint: 'Student & graduate',
    color: Colors.success,
    bg: 'rgba(0,214,143,0.12)',
    visas: [
      { code: '500', name: 'Student Visa',        why: 'Study full-time at any registered Australian institution.' },
      { code: '485', name: 'Temporary Graduate',  why: 'Stay and work in Australia after completing your degree.' },
    ],
  },
  {
    id: 'business',
    icon: 'trending-up-outline' as const,
    label: 'Business / Invest',
    hint: 'Innovation & investment',
    color: Colors.secondary,
    bg: 'rgba(255,205,0,0.12)',
    visas: [
      { code: '188', name: 'Business Innovation', why: 'For business owners, investors and entrepreneurs with strong track records.' },
      { code: '888',  name: 'Business Talent PR',  why: 'Permanent residency after demonstrating successful business outcomes.' },
    ],
  },
  {
    id: 'holiday',
    icon: 'airplane-outline' as const,
    label: 'Working Holiday',
    hint: 'Travel & work',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.12)',
    visas: [
      { code: '417', name: 'Working Holiday',   why: 'Live and work in Australia for up to a year (UK, Ireland, most of Europe).' },
      { code: '462', name: 'Work and Holiday',  why: 'Similar to 417 but for different nationalities including USA and China.' },
    ],
  },
  {
    id: 'employer',
    icon: 'business-outline' as const,
    label: 'Employer Sponsored',
    hint: 'Your employer sponsors',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.12)',
    visas: [
      { code: '482', name: 'TSS Visa',   why: 'Temporary 2–4 year work visa sponsored by an approved Australian employer.' },
      { code: '186', name: 'ENS Visa',   why: 'Permanent residency sponsored directly by your Australian employer.' },
      { code: '494', name: 'SESR Visa',  why: 'Employer-sponsored regional visa — leads to PR after 3 years.' },
    ],
  },
] as const;

type PurposeId = typeof VISA_PURPOSES[number]['id'];

// ─── Checklist Data ───────────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  { id: 'calc',   label: 'Calculate your points score',   icon: 'calculator-outline' as const, route: '/(tabs)/calculator', color: Colors.accent     },
  { id: 'occ',    label: 'Check your occupation',          icon: 'briefcase-outline'  as const, route: '/occupations',        color: '#A78BFA'          },
  { id: 'state',  label: 'Compare state requirements',     icon: 'map-outline'        as const, route: '/(tabs)/states',      color: Colors.success     },
  { id: 'rounds', label: 'Check invitation rounds',        icon: 'trophy-outline'     as const, route: '/(tabs)/rounds',      color: Colors.secondary   },
];

const STORAGE_PURPOSE  = 'home_visa_purpose_v1';
const STORAGE_CHECKLIST = 'home_checklist_done_v1';

// ─── Shared sub-components ────────────────────────────────────────────────────

function FadeInView({ children, delay = 0, style }: any) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── Visa Finder ──────────────────────────────────────────────────────────────

function VisaFinder() {
  const router = useRouter();
  const [selected, setSelected] = useState<PurposeId | null>(null);
  const recAnim = useRef(new Animated.Value(0)).current;

  // Persist selection
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_PURPOSE).then((v) => {
      if (v) setSelected(v as PurposeId);
    });
  }, []);

  const handleSelect = (id: PurposeId) => {
    const next = selected === id ? null : id;
    setSelected(next);
    AsyncStorage.setItem(STORAGE_PURPOSE, next ?? '');
    Animated.spring(recAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };

  const purpose = VISA_PURPOSES.find((p) => p.id === selected) ?? null;

  return (
    <View style={styles.finderSection}>
      <View style={styles.finderHeader}>
        <Ionicons name="compass-outline" size={18} color={Colors.accent} />
        <Text style={styles.finderTitle}>What brings you to Australia?</Text>
      </View>
      <Text style={styles.finderSub}>Tap your goal and we'll suggest the right visa.</Text>

      {/* 3-column purpose grid */}
      <View style={styles.purposeGrid}>
        {VISA_PURPOSES.map((p) => {
          const active = selected === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.purposeBtn,
                { backgroundColor: active ? p.bg : 'rgba(255,255,255,0.04)' },
                active && { borderColor: p.color + '60' },
              ]}
              onPress={() => handleSelect(p.id)}
              activeOpacity={0.75}
            >
              <View style={[styles.purposeIconWrap, { backgroundColor: p.bg }]}>
                <Ionicons name={p.icon} size={18} color={p.color} />
              </View>
              <Text style={[styles.purposeLabel, active && { color: p.color }]}>{p.label}</Text>
              <Text style={styles.purposeHint}>{p.hint}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Recommendation panel */}
      {purpose && (
        <Animated.View
          style={[
            styles.recPanel,
            { borderColor: purpose.color + '40' },
            {
              opacity: recAnim,
              transform: [{ translateY: recAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            },
          ]}
        >
          <View style={styles.recHeader}>
            <View style={[styles.recIconWrap, { backgroundColor: purpose.bg }]}>
              <Ionicons name={purpose.icon} size={16} color={purpose.color} />
            </View>
            <Text style={[styles.recTitle, { color: purpose.color }]}>
              Recommended for "{purpose.label}"
            </Text>
          </View>

          {purpose.visas.map((v) => (
            <TouchableOpacity
              key={v.code}
              style={styles.recRow}
              onPress={() => router.push('/visas' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.recCode, { backgroundColor: purpose.color + '20' }]}>
                <Text style={[styles.recCodeText, { color: purpose.color }]}>SC {v.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recName}>{v.name}</Text>
                <Text style={styles.recWhy}>{v.why}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.recViewAll}
            onPress={() => router.push('/visas' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.recViewAllText}>Explore all visa subclasses</Text>
            <Ionicons name="arrow-forward" size={13} color={Colors.accent} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Migration Checklist ──────────────────────────────────────────────────────

function MigrationChecklist() {
  const router = useRouter();
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_CHECKLIST).then((v) => {
      if (v) setDone(new Set(JSON.parse(v)));
    });
  }, []);

  const handleTap = async (item: typeof CHECKLIST_ITEMS[number]) => {
    const next = new Set(done);
    next.add(item.id);
    setDone(next);
    await AsyncStorage.setItem(STORAGE_CHECKLIST, JSON.stringify([...next]));
    router.push(item.route as any);
  };

  const count = done.size;
  const total = CHECKLIST_ITEMS.length;
  const progress = count / total;

  return (
    <View style={styles.checklistSection}>
      <View style={styles.checklistHeader}>
        <View>
          <Text style={styles.checklistTitle}>Your Migration Journey</Text>
          <Text style={styles.checklistSub}>{count} of {total} steps completed</Text>
        </View>
        {count === total && (
          <View style={styles.checklistBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.checklistBadgeText}>All done!</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Items */}
      {CHECKLIST_ITEMS.map((item) => {
        const ticked = done.has(item.id);
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.checkItem, ticked && styles.checkItemDone]}
            onPress={() => handleTap(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkIconWrap, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon} size={16} color={ticked ? Colors.success : item.color} />
            </View>
            <Text style={[styles.checkLabel, ticked && styles.checkLabelDone]}>{item.label}</Text>
            <View style={[styles.checkbox, ticked && styles.checkboxDone]}>
              {ticked && <Ionicons name="checkmark" size={11} color="#fff" />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchVisible, setSearchVisible] = useState(false);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Hero */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <View style={styles.orb1} />
        <View style={styles.orb2} />

        <TouchableOpacity
          style={[styles.heroSearchBtn, { top: insets.top + 12 }]}
          onPress={() => setSearchVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.heroContent}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>🇦🇺 Skilled Migration</Text>
          </View>

          <Text style={styles.heroTitle}>Your Path to{'\n'}Australia Starts Here</Text>

          <Text style={styles.heroSub}>
            Find your visa, calculate your points, and get instant AI guidance from Aria.
          </Text>

          <TouchableOpacity
            style={styles.heroCta}
            onPress={() => router.push('/(tabs)/calculator' as any)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.accent, '#0099CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heroCtaGrad}
            >
              <Text style={styles.heroCtaText}>Calculate My Points</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.primaryDark} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Visa Finder */}
      <FadeInView delay={60}>
        <VisaFinder />
      </FadeInView>

      {/* Migration Checklist */}
      <FadeInView delay={140}>
        <MigrationChecklist />
      </FadeInView>

      {/* Visa Pathways */}
      <FadeInView delay={200} style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => router.push('/visas' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>Visa Pathways</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.sectionViewAll}>{ALL_VISAS.length} subclasses</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
        </TouchableOpacity>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.visaChipScroll}
        >
          {ALL_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.visaCategoryChip, { backgroundColor: meta.bg }]}
                onPress={() => router.push({ pathname: '/visas', params: { category: cat } } as any)}
                activeOpacity={0.7}
              >
                <Ionicons name={meta.icon as any} size={13} color={meta.color} />
                <Text style={[styles.visaCategoryText, { color: meta.color }]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </FadeInView>

      {/* Latest SkillSelect Round */}
      <FadeInView delay={260} style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => router.push('/(tabs)/rounds' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>SkillSelect Rounds</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.sectionViewAll}>May 2026</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
        </TouchableOpacity>
        <View style={styles.roundsCard}>
          <View style={styles.roundsRow}>
            {([
              { sub: '189', label: 'Skilled Indep.',     pts: '65',  color: Colors.success },
              { sub: '190', label: 'State Nominated',    pts: '65+', color: Colors.accent  },
              { sub: '491', label: 'Regional Sponsored', pts: '65',  color: '#A78BFA'      },
            ] as const).map((r, i, arr) => (
              <View
                key={r.sub}
                style={[
                  styles.roundsPill,
                  i < arr.length - 1 && { borderRightWidth: 1, borderRightColor: Colors.divider },
                ]}
              >
                <Text style={[styles.roundsPillSub, { color: r.color }]}>SC {r.sub}</Text>
                <Text style={styles.roundsPillPts}>{r.pts}</Text>
                <Text style={styles.roundsPillPtsUnit}>pts min</Text>
                <Text style={styles.roundsPillLabel}>{r.label}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.roundsViewAll}
            onPress={() => router.push('/(tabs)/rounds' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.roundsViewAllText}>View all rounds &amp; occupation breakdowns</Text>
            <Ionicons name="arrow-forward" size={13} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      </FadeInView>

      {/* Aria AI */}
      <FadeInView delay={320} style={styles.section}>
        <TouchableOpacity
          style={styles.ariaCard}
          onPress={() => router.push('/(tabs)/ai' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.ariaCardShine} />
          <View style={styles.ariaLeft}>
            <View style={styles.ariaAvatarSmall}>
              <Ionicons name="sparkles" size={22} color={Colors.secondary} />
            </View>
            <View>
              <Text style={styles.ariaTitle}>Ask Aria</Text>
              <Text style={styles.ariaSub}>AI migration guide · instant answers</Text>
            </View>
          </View>
          <View style={styles.ariaChips}>
            {['Am I eligible for PR?', 'Best visa for my job?', 'Which state to nominate?'].map((q) => (
              <View key={q} style={styles.ariaChip}>
                <Text style={styles.ariaChipText}>{q}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </FadeInView>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="shield-checkmark-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.disclaimerText}>
          Points are indicative only. Consult a{' '}
          <Text
            style={styles.disclaimerLink}
            onPress={() => Linking.openURL('https://portal.mara.gov.au')}
          >
            MARA-registered agent
          </Text>
          {' '}for formal advice.
        </Text>
      </View>

      <View style={styles.independentBanner}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.accent} />
        <Text style={styles.independentText}>
          Independent Guide — Not affiliated with the Australian Government
        </Text>
      </View>

      <SearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Hero
  hero: {
    minHeight: height * 0.42,
    backgroundColor: Colors.primaryDark,
    overflow: 'hidden',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  orb1: {
    position: 'absolute',
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#003A8C',
    top: -80, right: -80, opacity: 0.6,
  },
  orb2: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#FFCD00',
    bottom: -60, left: -40, opacity: 0.07,
  },
  heroContent: { zIndex: 2 },
  heroSearchBtn: {
    position: 'absolute', right: Spacing.lg, zIndex: 3,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,205,0,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,205,0,0.25)',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: Radius.full, marginBottom: Spacing.lg, gap: Spacing.xs,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  badgeText: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  heroTitle: {
    color: Colors.textPrimary, fontSize: FontSize.display,
    fontWeight: FontWeight.extraBold, lineHeight: 44,
    marginBottom: Spacing.md, letterSpacing: -0.5,
  },
  heroSub: {
    color: Colors.textSecondary, fontSize: FontSize.md,
    lineHeight: 22, marginBottom: Spacing.xl,
  },
  heroCta: { alignSelf: 'flex-start', borderRadius: Radius.full, overflow: 'hidden' },
  heroCtaGrad: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: 14,
  },
  heroCtaText: { color: Colors.primaryDark, fontSize: FontSize.md, fontWeight: FontWeight.bold },

  // Visa Finder
  finderSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  finderHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  finderTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  finderSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.lg },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  purposeBtn: {
    width: (width - Spacing.lg * 2 - Spacing.xl * 2 - Spacing.sm * 2) / 3,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 4,
  },
  purposeIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  purposeLabel: {
    fontSize: FontSize.xs, fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary, textAlign: 'center',
  },
  purposeHint: {
    fontSize: 9, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 12,
  },

  // Recommendation panel
  recPanel: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  recHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  recIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  recTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  recRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  recCode: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: Radius.sm, minWidth: 52, alignItems: 'center',
  },
  recCodeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  recName: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  recWhy: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, lineHeight: 15 },
  recViewAll: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: Spacing.md,
  },
  recViewAllText: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: FontWeight.semiBold },

  // Checklist
  checklistSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checklistHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.sm,
  },
  checklistTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  checklistSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  checklistBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,214,143,0.12)',
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  checklistBadgeText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semiBold },
  progressTrack: {
    height: 4, backgroundColor: Colors.divider,
    borderRadius: 2, marginBottom: Spacing.lg, overflow: 'hidden',
  },
  progressFill: {
    height: 4, backgroundColor: Colors.success,
    borderRadius: 2,
  },
  checkItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  checkItemDone: { opacity: 0.6 },
  checkIconWrap: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  checkLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  checkLabelDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: Colors.success, borderColor: Colors.success },

  // Shared section
  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionViewAll: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.semiBold },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },

  // Visa category chips
  visaChipScroll: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.lg },
  visaCategoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  visaCategoryText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },

  // SkillSelect Rounds card
  roundsCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  roundsRow: { flexDirection: 'row' },
  roundsPill: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xs },
  roundsPillSub: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  roundsPillPts: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extraBold, color: Colors.textPrimary, lineHeight: 38 },
  roundsPillPtsUnit: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: -2 },
  roundsPillLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'center' },
  roundsViewAll: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  roundsViewAllText: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: FontWeight.semiBold },

  // Aria card
  ariaCard: {
    borderRadius: Radius.xl, padding: Spacing.xl, overflow: 'hidden',
    backgroundColor: Colors.surface, borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.18)', position: 'relative',
  },
  ariaCardShine: {
    position: 'absolute', top: 0, right: 0,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(167,139,250,0.15)',
  },
  ariaLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  ariaAvatarSmall: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,205,0,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,205,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  ariaTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  ariaSub: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  ariaChips: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  ariaChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
  },
  ariaChipText: { color: Colors.textSecondary, fontSize: FontSize.xs },

  // Footer
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginTop: Spacing.xl,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  disclaimerText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },
  disclaimerLink: { color: Colors.accent, textDecorationLine: 'underline' },
  independentBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  independentText: { fontSize: FontSize.xs, color: Colors.accent, opacity: 0.7, textAlign: 'center' },
});
