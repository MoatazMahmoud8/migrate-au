import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useColors } from '../../constants/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchModal from '../../components/SearchModal';
import { ALL_VISAS, CATEGORY_META, VisaCategory } from '../../constants/visaData';
import { calculatePoints } from '../../utils/pointsCalculator';
import { PointsInput } from '../../constants/types';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const CALC_KEY        = 'calc_input_v1';
const STORAGE_PURPOSE = 'home_visa_purpose_v1';

// ─── Default calc input (mirrors calculator.tsx defaults) ────────────────────

const defaultCalcInput: PointsInput = {
  age: 28, englishLevel: 'proficient',
  australianWorkYears: 0, overseasWorkYears: 3, visaSubclass: '189',
  hasPartnerSkills: false, hasPartnerSuperiorEnglish: false,
  hasProfessionalYear: false, hasNaati: false, hasStateNomination: false,
  hasCommunityLanguage: false, hasAustralianStudy: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: 'Good morning', emoji: '☀️' };
  if (h >= 12 && h < 18) return { text: 'Good afternoon', emoji: '👋' };
  return { text: 'Good evening', emoji: '🌙' };
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

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
  const Colors = useColors();
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
    <View style={[styles.finderSection, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
      <View style={styles.finderHeader}>
        <Ionicons name="compass-outline" size={18} color={Colors.accent} />
        <Text style={[styles.finderTitle, { color: Colors.textPrimary }]}>Find by Goal</Text>
      </View>
      <Text style={[styles.finderSub, { color: Colors.textMuted }]}>Pick what brings you here — we'll show the right visas.</Text>

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
              <Text style={[styles.purposeLabel, { color: Colors.textPrimary }, active && { color: p.color }]}>{p.label}</Text>
              <Text style={[styles.purposeHint, { color: Colors.textMuted }]}>{p.hint}</Text>
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
                <Text style={[styles.recName, { color: Colors.textPrimary }]}>{v.name}</Text>
                <Text style={[styles.recWhy, { color: Colors.textMuted }]}>{v.why}</Text>
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

// ─── Visa Pathways Grid ───────────────────────────────────────────────────────

const PATHWAY_CARDS: Array<{ key: VisaCategory; tagline: string }> = [
  { key: 'Skilled',         tagline: 'Points-tested PR' },
  { key: 'Employer',        tagline: 'Your employer sponsors' },
  { key: 'Family',          tagline: 'Partner, parent & child' },
  { key: 'Graduate',        tagline: 'After studying in AU' },
  { key: 'Working Holiday', tagline: 'Travel & work' },
  { key: 'Business',        tagline: 'Invest & innovate' },
];

function VisaPathwaysGrid() {
  const Colors = useColors();
  const router = useRouter();
  return (
    <View style={pw.section}>
      {/* Header */}
      <TouchableOpacity
        style={pw.header}
        onPress={() => router.push('/visas' as any)}
        activeOpacity={0.7}
      >
        <Text style={[pw.title, { color: Colors.textPrimary }]}>Visa Pathways</Text>
        <View style={{ flex: 1 }} />
        <Text style={pw.viewAll}>View all</Text>
        <Ionicons name="chevron-forward" size={13} color={Colors.accent} />
      </TouchableOpacity>

      {/* 2-column grid */}
      <View style={pw.grid}>
        {PATHWAY_CARDS.map(({ key, tagline }) => {
          const meta = CATEGORY_META[key];
          const count = ALL_VISAS.filter((v) => v.category === key).length;
          return (
            <TouchableOpacity
              key={key}
              style={[pw.card, { borderColor: meta.color + '28', backgroundColor: Colors.surface }]}
              onPress={() => router.push({ pathname: '/visas', params: { category: key } } as any)}
              activeOpacity={0.75}
            >
              {/* Subtle colour wash */}
              <View style={[pw.cardWash, { backgroundColor: meta.color + '0C' }]} />

              {/* Top row: icon + count badge */}
              <View style={pw.cardTop}>
                <View style={[pw.iconWrap, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                </View>
                <View style={[pw.countBadge, { backgroundColor: meta.color + '18' }]}>
                  <Text style={[pw.countText, { color: meta.color }]}>{count}</Text>
                </View>
              </View>

              {/* Labels */}
              <Text style={[pw.cardName, { color: Colors.textPrimary }]}>{key}</Text>
              <Text style={[pw.cardTagline, { color: Colors.textMuted }]}>{tagline}</Text>

              {/* Bottom arrow */}
              <View style={pw.cardArrow}>
                <Ionicons name="arrow-forward-outline" size={12} color={meta.color} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Secondary hint */}
      <TouchableOpacity
        style={pw.moreRow}
        onPress={() => router.push('/visas' as any)}
        activeOpacity={0.7}
      >
        <Text style={pw.moreText}>
          + Student, Visitor, Humanitarian & {ALL_VISAS.length - PATHWAY_CARDS.reduce(
            (acc, { key }) => acc + ALL_VISAS.filter(v => v.category === key).length, 0
          )} more subclasses
        </Text>
        <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Score Card (personalized hero) ──────────────────────────────────────────

function ScoreCard({ input, onCalcPress }: { input: PointsInput | null; onCalcPress: () => void }) {
  if (!input) {
    // CTA state — no score yet
    return (
      <View style={sc.wrapper}>
        <LinearGradient
          colors={['#001A3D', '#000D24']}
          style={sc.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={sc.orb} />
          <View style={sc.badge}>
            <View style={sc.badgeDot} />
            <Text style={sc.badgeText}>🇦🇺 Skilled Migration</Text>
          </View>
          <Text style={sc.ctaTitle}>Your Path to{'\n'}Australia Starts Here</Text>
          <Text style={sc.ctaSub}>
            Calculate your points to see if you qualify for a skilled migration visa.
          </Text>
          <TouchableOpacity style={sc.ctaBtn} onPress={onCalcPress} activeOpacity={0.85}>
            <LinearGradient
              colors={[Colors.accent, '#0099CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={sc.ctaBtnGrad}
            >
              <Text style={sc.ctaBtnText}>Calculate My Points</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.primaryDark} />
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  const breakdown = calculatePoints(input);
  const { total, likelyEligible } = breakdown;
  const pct = Math.min(total / 100, 1);
  const above = total - 65;
  const color = likelyEligible ? Colors.success : total >= 55 ? Colors.warning : '#FF6B6B';
  const gradColors: [string, string] = likelyEligible
    ? ['#00261A', '#001224']
    : total >= 55
    ? ['#26200A', '#001224']
    : ['#260A0A', '#001224'];

  return (
    <TouchableOpacity style={sc.wrapper} onPress={onCalcPress} activeOpacity={0.92}>
      <LinearGradient colors={gradColors} style={sc.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={[sc.glow, { backgroundColor: color + '18' }]} />

        {/* Header row */}
        <View style={sc.cardTopRow}>
          <Text style={sc.cardLabel}>Your SkillSelect Score</Text>
          <View style={[sc.subclassBadge, { borderColor: color + '50', backgroundColor: color + '18' }]}>
            <Text style={[sc.subclassText, { color }]}>SC {input.visaSubclass}</Text>
          </View>
        </View>

        {/* Big score */}
        <View style={sc.scoreRow}>
          <Text style={[sc.scoreNum, { color }]}>{total}</Text>
          <View style={sc.scoreRight}>
            <Text style={sc.scorePts}>points</Text>
            <View style={[sc.statusBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
              <Ionicons
                name={likelyEligible ? 'checkmark-circle' : 'time-outline'}
                size={12}
                color={color}
              />
              <Text style={[sc.statusText, { color }]}>
                {likelyEligible ? 'Likely Eligible' : above >= 0 ? `${above} pts above` : `${Math.abs(above)} pts short`}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={sc.barTrack}>
          <View style={[sc.barFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
          {/* Cutoff marker at 65% */}
          <View style={sc.cutoffMark} />
        </View>
        <View style={sc.barLabels}>
          <Text style={sc.barLbl}>0</Text>
          <Text style={[sc.barLbl, { color, fontWeight: FontWeight.semiBold }]}>65 min</Text>
          <Text style={sc.barLbl}>100</Text>
        </View>

        <Text style={sc.editHint}>Tap to update your inputs →</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── At a Glance Row ──────────────────────────────────────────────────────────

function GlanceRow({ input }: { input: PointsInput | null }) {
  const Colors = useColors();
  const router = useRouter();
  const [latestRound, setLatestRound] = useState({ label: 'Nov 2025', minPoints: 65 });
  const breakdown = input ? calculatePoints(input) : null;
  const above = breakdown ? breakdown.total - 65 : null;
  const color = breakdown
    ? (breakdown.likelyEligible ? Colors.success : breakdown.total >= 55 ? Colors.warning : '#FF6B6B')
    : Colors.textMuted;

  // Load latest round data on component mount
  useEffect(() => {
    const { getLatestRound } = require('../../utils/latestRound');
    (async () => {
      try {
        const round = await getLatestRound();
        setLatestRound({ label: round.label, minPoints: round.minPoints ?? 65 });
      } catch (e) {
        console.warn('[GlanceRow] Failed to load latest round:', e);
      }
    })();
  }, []);

  const cards = [
    {
      icon: 'trophy-outline' as const,
      iconColor: Colors.secondary,
      bg: 'rgba(255,205,0,0.10)',
      label: 'Last Round',
      value: latestRound.label,
      sub: `SC 189 · ${latestRound.minPoints} pts min`,
      route: '/(tabs)/rounds',
    },
    breakdown
      ? {
          icon: (breakdown.likelyEligible ? 'trending-up-outline' : 'trending-down-outline') as const,
          iconColor: color,
          bg: color + '18',
          label: 'vs Cutoff',
          value: above! >= 0 ? `+${above}` : `${above}`,
          sub: above! >= 0 ? 'Above last min' : 'Below last min',
          route: '/(tabs)/calculator',
        }
      : {
          icon: 'calculator-outline' as const,
          iconColor: Colors.accent,
          bg: 'rgba(0,194,255,0.10)',
          label: 'Your Score',
          value: '—',
          sub: 'Not calculated yet',
          route: '/(tabs)/calculator',
        },
    {
      icon: 'map-outline' as const,
      iconColor: '#A78BFA',
      bg: 'rgba(167,139,250,0.10)',
      label: 'States Open',
      value: '8',
      sub: 'Nominations active',
      route: '/(tabs)/states',
    },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={gl.scroll}
    >
      {cards.map((c) => (
        <TouchableOpacity
          key={c.label}
          style={[gl.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
          onPress={() => router.push(c.route as any)}
          activeOpacity={0.75}
        >
          <View style={[gl.iconWrap, { backgroundColor: c.bg }]}>
            <Ionicons name={c.icon} size={18} color={c.iconColor} />
          </View>
          <Text style={[gl.label, { color: Colors.textMuted }]}>{c.label}</Text>
          <Text style={[gl.value, { color: c.iconColor }]}>{c.value}</Text>
          <Text style={[gl.sub, { color: Colors.textMuted }]}>{c.sub}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const Colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchVisible, setSearchVisible] = useState(false);
  const [calcInput, setCalcInput] = useState<PointsInput | null>(null);
  const greeting = getGreeting();

  // Reload score whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(CALC_KEY).then((json) => {
        if (json) {
          try { setCalcInput({ ...defaultCalcInput, ...JSON.parse(json) }); } catch {}
        }
      });
    }, [])
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={[styles.greeting, { color: Colors.textPrimary }]}>{greeting.emoji} {greeting.text}</Text>
          <Text style={[styles.dateText, { color: Colors.textMuted }]}>{formatDate()}</Text>
        </View>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => setSearchVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Personalized score card */}
      <FadeInView delay={0}>
        <ScoreCard
          input={calcInput}
          onCalcPress={() => router.push('/(tabs)/calculator' as any)}
        />
      </FadeInView>

      {/* At a glance strip */}
      <FadeInView delay={80}>
        <View style={styles.glanceSectionHeader}>
          <Text style={[styles.glanceSectionTitle, { color: Colors.textPrimary }]}>At a Glance</Text>
        </View>
        <GlanceRow input={calcInput} />
      </FadeInView>

      {/* Visa Finder */}
      <FadeInView delay={160}>
        <VisaFinder />
      </FadeInView>

      {/* Visa Pathways Grid */}
      <FadeInView delay={220}>
        <VisaPathwaysGrid />
      </FadeInView>

      {/* Aria AI */}
      <FadeInView delay={280} style={styles.section}>
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

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  greeting: {
    color: Colors.textPrimary, fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  dateText: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2 },
  searchBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Glance section label
  glanceSectionHeader: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  glanceSectionTitle: {
    fontSize: FontSize.sm, fontWeight: FontWeight.semiBold,
    color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8,
  },

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
    width: '31%',
    flexShrink: 0,
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

  // Shared section
  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionViewAll: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.semiBold },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },

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

// ─── ScoreCard styles ─────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  wrapper: { marginHorizontal: Spacing.lg, marginTop: Spacing.sm },
  card: {
    borderRadius: Radius.xl, padding: Spacing.xl,
    overflow: 'hidden', position: 'relative',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  orb: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#003A8C', top: -80, right: -60, opacity: 0.5,
  },
  glow: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    top: -50, right: -30,
  },

  // CTA state (no score)
  badge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,205,0,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,205,0,0.25)',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: Radius.full, marginBottom: Spacing.lg, gap: Spacing.xs,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  badgeText: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  ctaTitle: {
    color: Colors.textPrimary, fontSize: FontSize.display,
    fontWeight: FontWeight.extraBold, lineHeight: 44,
    marginBottom: Spacing.md, letterSpacing: -0.5,
  },
  ctaSub: {
    color: Colors.textSecondary, fontSize: FontSize.md,
    lineHeight: 22, marginBottom: Spacing.xl,
  },
  ctaBtn: { alignSelf: 'flex-start', borderRadius: Radius.full, overflow: 'hidden' },
  ctaBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: 14,
  },
  ctaBtnText: { color: Colors.primaryDark, fontSize: FontSize.md, fontWeight: FontWeight.bold },

  // Score state (has score)
  cardTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.md,
  },
  cardLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  subclassBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: Radius.full, borderWidth: 1,
  },
  subclassText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.lg, marginBottom: Spacing.lg },
  scoreNum: {
    fontSize: 72, fontWeight: FontWeight.extraBold,
    lineHeight: 76, letterSpacing: -2,
  },
  scoreRight: { paddingBottom: 6, gap: Spacing.sm },
  scorePts: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1, alignSelf: 'flex-start',
  },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },

  barTrack: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3, overflow: 'visible', marginBottom: 6, position: 'relative',
  },
  barFill: { height: 6, borderRadius: 3 },
  cutoffMark: {
    position: 'absolute', width: 2, height: 12,
    backgroundColor: 'rgba(255,255,255,0.4)',
    top: -3, left: '65%',
  },
  barLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  barLbl: { fontSize: FontSize.xs, color: Colors.textMuted },
  editHint: {
    fontSize: FontSize.xs, color: Colors.textMuted,
    marginTop: Spacing.xs, textAlign: 'right',
  },
});

// ─── GlanceRow styles ─────────────────────────────────────────────────────────

const gl = StyleSheet.create({
  scroll: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xs,
  },
  card: {
    width: 140,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
    gap: 2,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  label: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  value: { fontSize: FontSize.xl, fontWeight: FontWeight.extraBold, lineHeight: 26 },
  sub: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 15 },
});

// ─── VisaPathwaysGrid styles ──────────────────────────────────────────────────

const pw = StyleSheet.create({
  section: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  viewAll: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.semiBold },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  card: {
    width: '48.2%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: 'hidden',
    position: 'relative',
    gap: 2,
  },
  cardWash: {
    ...StyleSheet.absoluteFillObject,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  countBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  countText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  cardName: {
    fontSize: FontSize.md, fontWeight: FontWeight.bold,
    color: Colors.textPrimary, marginTop: 2,
  },
  cardTagline: {
    fontSize: FontSize.xs, color: Colors.textMuted,
    lineHeight: 16, marginTop: 2,
  },
  cardArrow: {
    alignSelf: 'flex-end',
    marginTop: Spacing.sm,
  },

  moreRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  moreText: {
    flex: 1, fontSize: FontSize.xs, color: Colors.textMuted,
  },
});
