import React, { useRef, useState } from 'react';
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
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const VISA_CARDS = [
  {
    subclass: '189',
    name: 'Skilled Independent',
    desc: 'No sponsorship. Apply anywhere.',
    minPts: 65,
    gradient: ['#0047AB', '#002D62'] as [string, string],
    icon: 'globe-outline',
    type: 'Skilled',
  },
  {
    subclass: '190',
    name: 'Skilled Nominated',
    desc: 'State sponsorship. +5 points.',
    minPts: 65,
    gradient: ['#005C99', '#003366'] as [string, string],
    icon: 'location-outline',
    type: 'Skilled',
  },
  {
    subclass: '491',
    name: 'Work Regional',
    desc: 'Regional sponsorship. +15 points.',
    minPts: 65,
    gradient: ['#006080', '#003344'] as [string, string],
    icon: 'map-outline',
    type: 'Skilled',
  },
];

const QUICK_TILES = [
  { icon: 'book-outline',          label: 'English Tests',  route: '/(tabs)/english-tests',  color: Colors.success,   bg: 'rgba(0,214,143,0.12)' },
  { icon: 'list-outline',          label: 'Skills List',    url: 'https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list', color: Colors.accent,    bg: 'rgba(0,194,255,0.12)' },
  { icon: 'notifications-outline', label: 'Updates',        route: '/(tabs)/notifications',  color: Colors.secondary, bg: 'rgba(255,205,0,0.12)' },
  { icon: 'star-outline',          label: 'Go Premium',     route: '/(tabs)/profile',        color: '#FF6B8A',        bg: 'rgba(255,107,154,0.12)' },
];

const OTHER_VISAS_DATA = [
  // ── EMPLOYER-SPONSORED ──────────────────────────────────────────
  {
    code: '482',
    name: 'Skills in Demand (Temp)',
    icon: 'hourglass-outline',
    type: 'Temporary',
    subclasses: ['482 - Core Skills Stream', '482 - Specialist Skills Stream', '482 - Labour Agreement Stream'],
    conditions: [
      'Sponsored by an approved employer',
      'Occupation on eligible skills list',
      'Meet English language requirements',
      'Skills assessment for most occupations',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482',
  },
  {
    code: '186',
    name: 'Employer Nominated (Perm)',
    icon: 'briefcase-outline',
    type: 'Permanent',
    subclasses: ['186 - Direct Entry', '186 - Temporary Residence Transition', '186 - Labour Agreement'],
    conditions: [
      'Nominated by Australian employer',
      'Occupation on eligible list',
      'Skills & qualification assessment',
      'Age under 45 (most streams)',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186',
  },
  {
    code: '494',
    name: 'Skilled Employer Regional (Prov)',
    icon: 'location-outline',
    type: 'Temporary',
    subclasses: ['494 - Employer Sponsored', '494 - Labour Agreement'],
    conditions: [
      'Sponsored by regional employer',
      'Occupation on RSMS occupation list',
      'Live & work in specified regional area',
      'Pathway to permanent residence (191)',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-employer-sponsored-regional-provisional-494',
  },
  {
    code: '407',
    name: 'Training Visa',
    icon: 'school-outline',
    type: 'Temporary',
    subclasses: ['407 - Occupational Training', '407 - Professional Development'],
    conditions: [
      'Sponsored by approved Australian organisation',
      'Training must improve skills in current occupation',
      'Not for general employment',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/training-407',
  },
  // ── GRADUATE & POST-STUDY ────────────────────────────────────────
  {
    code: '485',
    name: 'Temporary Graduate',
    icon: 'ribbon-outline',
    type: 'Temporary',
    subclasses: ['485 - Graduate Work', '485 - Post-Study Work'],
    conditions: [
      'Completed eligible Australian study',
      'Applied within 6 months of completing study',
      'Meet English requirements (IELTS 6+)',
      'Post-Study stream: bachelor or higher degree',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485',
  },
  // ── WORKING HOLIDAY ──────────────────────────────────────────────
  {
    code: '417',
    name: 'Working Holiday',
    icon: 'sunny-outline',
    type: 'Temporary',
    subclasses: ['417 - First Working Holiday', '417 - Second (3 months regional)', '417 - Third (6 months regional)'],
    conditions: [
      'Passport from eligible country',
      'Aged 18–30 (up to 35 for some countries)',
      'Not accompanied by dependent children',
      'Sufficient funds (AUD 5,000+)',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/working-holiday-417',
  },
  {
    code: '462',
    name: 'Work and Holiday',
    icon: 'globe-outline',
    type: 'Temporary',
    subclasses: ['462 - Work and Holiday'],
    conditions: [
      'Passport from participating country (e.g., USA, China)',
      'Aged 18–30',
      'Meet education/language requirements',
      'Supported by home country government',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-462',
  },
  // ── FAMILY ──────────────────────────────────────────────────────
  {
    code: '820 / 801',
    name: 'Partner (Onshore)',
    icon: 'heart-outline',
    type: 'Permanent',
    subclasses: ['820 - Temporary (initial grant)', '801 - Permanent (after 2 years)'],
    conditions: [
      'Spouse or de facto partner of Australian citizen/PR',
      'Genuine, committed relationship',
      'Onshore application (in Australia)',
      'Health & character requirements',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-820-801',
  },
  {
    code: '309 / 100',
    name: 'Partner (Offshore)',
    icon: 'heart-circle-outline',
    type: 'Permanent',
    subclasses: ['309 - Temporary (offshore)', '100 - Permanent'],
    conditions: [
      'Spouse or de facto of Australian citizen/PR',
      'Applied from outside Australia',
      'Genuine & committed relationship',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-309-100',
  },
  {
    code: '300',
    name: 'Prospective Marriage',
    icon: 'diamond-outline',
    type: 'Temporary',
    subclasses: ['300 - Fiancé(e) Visa'],
    conditions: [
      'Intend to marry Australian citizen/PR',
      'Must marry within 9 months of entry',
      'Both parties must be free to marry',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/prospective-marriage-300',
  },
  {
    code: '103 / 143',
    name: 'Parent Visa',
    icon: 'people-outline',
    type: 'Permanent',
    subclasses: ['103 - Parent', '143 - Contributory Parent', '173 - Contributory Temp'],
    conditions: [
      'Child who is Australian citizen/PR/eligible NZ citizen',
      'Pass the balance of family test',
      '143 requires significant financial contribution',
      'Long waiting periods (103: 30+ years; 143: 5–10 years)',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/parent-103',
  },
  {
    code: '101 / 445',
    name: 'Child Visa',
    icon: 'person-add-outline',
    type: 'Permanent',
    subclasses: ['101 - Child (offshore)', '445 - Dependent Child', '102 - Adopted Child'],
    conditions: [
      'Child of Australian citizen/PR',
      'Under 18, or 18–25 if full-time student',
      'Single & dependent if 18+',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/child-101',
  },
  // ── STUDENT ──────────────────────────────────────────────────────
  {
    code: '500',
    name: 'Student Visa',
    icon: 'book-outline',
    type: 'Temporary',
    subclasses: ['500 - Full-time Study', '590 - Student Guardian'],
    conditions: [
      'Enrolled in CRICOS-registered course (CoE)',
      'Hold Overseas Student Health Cover (OSHC)',
      'Genuine Temporary Entrant (GTE)',
      'Sufficient financial means',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
  },
  // ── VISITOR & BUSINESS ──────────────────────────────────────────
  {
    code: '600',
    name: 'Visitor Visa',
    icon: 'airplane-outline',
    type: 'Temporary',
    subclasses: ['600 - Tourist', '600 - Business Visitor', '600 - Family Sponsored', '600 - Approved Destination Status'],
    conditions: [
      'Genuine temporary visit intention',
      'Sufficient funds for stay & departure ticket',
      'Meet health & character requirements',
      'Sponsored stream requires Australian sponsor',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600',
  },
  {
    code: '408',
    name: 'Temporary Activity',
    icon: 'flash-outline',
    type: 'Temporary',
    subclasses: ['408 - Entertainment', '408 - Sports', '408 - Religious', '408 - Research', '408 - Domestic Worker'],
    conditions: [
      'Sponsored by Australian organisation',
      'Specific short-term activity',
      'Not a general work visa',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-activity-408',
  },
  // ── HUMANITARIAN ─────────────────────────────────────────────────
  {
    code: '200 – 204',
    name: 'Refugee & Humanitarian',
    icon: 'shield-outline',
    type: 'Permanent',
    subclasses: ['200 - Refugee', '201 - In-Country Special', '202 - Global Special', '203 - Emergency Rescue', '204 - Woman at Risk'],
    conditions: [
      'Referred by UNHCR or Australian Embassy',
      'Assessed to be a refugee under UN convention',
      'Not applicable for individual applications (offshore)',
      '866 - Protection visa for onshore applicants',
    ],
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/refugee-200',
  },
];

function PressableCard({ children, onPress, style }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity onPress={press} activeOpacity={1}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function FadeInView({ children, delay = 0, style }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, style]}>
      {children}
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedVisa, setExpandedVisa] = useState<string | null>(null);

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

        <View style={styles.heroContent}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>🇦🇺 Skilled Migration</Text>
          </View>

          <Text style={styles.heroTitle}>Your Path to{'\n'}Australia Starts Here</Text>

          <Text style={styles.heroSub}>
            Calculate points, explore states, and get instant AI guidance from Aria.
          </Text>

          <TouchableOpacity
            style={styles.heroCta}
            onPress={() => router.push('/(tabs)/calculator')}
          >
            <LinearGradient
              colors={[Colors.secondary, '#FFB800']}
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

      {/* Quick tiles */}
      <View style={styles.tilesRow}>
        {QUICK_TILES.map((tile) => (
          <PressableCard
            key={tile.label}
            onPress={() => (tile as any).url ? Linking.openURL((tile as any).url) : router.push((tile as any).route as any)}
            style={styles.tilePressable}
          >
            <View style={[styles.tile, { backgroundColor: tile.bg }]}>
              <View style={[styles.tileIcon, { borderColor: tile.color + '40' }]}>
                <Ionicons name={tile.icon as any} size={22} color={tile.color} />
              </View>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </View>
          </PressableCard>
        ))}
      </View>

      {/* Visa Pathway Cards */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Visa Pathways</Text>
          <View style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>3 options</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsScroll}
          decelerationRate="fast"
          snapToInterval={width * 0.75 + Spacing.md}
          snapToAlignment="start"
        >
          {VISA_CARDS.map((v) => (
            <PressableCard
              key={v.subclass}
              onPress={() => router.push('/(tabs)/calculator')}
            >
              <LinearGradient
                colors={v.gradient}
                style={styles.visaCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardShine} />

                <View style={styles.visaTop}>
                  <View style={styles.visaIconWrap}>
                    <Ionicons name={v.icon as any} size={22} color="rgba(255,255,255,0.9)" />
                  </View>
                  <View style={styles.visaBadge}>
                    <Text style={styles.visaBadgeText}>SC {v.subclass}</Text>
                  </View>
                </View>

                <Text style={styles.visaName}>{v.name}</Text>
                <Text style={styles.visaDesc}>{v.desc}</Text>

                <View style={styles.visaFooter}>
                  <View>
                    <Text style={styles.visaPtsLabel}>Min. points</Text>
                    <Text style={styles.visaPtsNum}>{v.minPts}</Text>
                  </View>
                  <View style={styles.visaArrow}>
                    <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
                  </View>
                </View>
              </LinearGradient>
            </PressableCard>
          ))}
        </ScrollView>
      </View>

      {/* English Tests promo */}
      <View style={styles.section}>
        <PressableCard onPress={() => router.push('/(tabs)/english-tests' as any)}>
          <LinearGradient
            colors={['#0A2A1A', '#0D3B2A']}
            style={styles.englishCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.englishLeft}>
              <View style={styles.englishIconWrap}>
                <Ionicons name="book-outline" size={20} color={Colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.englishTitle}>English Test Requirements</Text>
                <Text style={styles.englishSub}>IELTS · PTE · TOEFL · CAE · OET scores for every visa</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.success} />
            </View>
            <View style={styles.englishChips}>
              {['SC 189', 'SC 190', 'SC 482', 'SC 186'].map((v) => (
                <View key={v} style={styles.englishChip}>
                  <Text style={styles.englishChipText}>{v}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </PressableCard>
      </View>

      {/* Processing Times */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Processing Times</Text>
          <View style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>DHA Official</Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => Linking.openURL('https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times')}
          style={styles.processingCard}
        >
          <LinearGradient
            colors={['#0D2137', '#0A3050']}
            style={styles.processingGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.processingLeft}>
              <Ionicons name="calendar-outline" size={18} color={Colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.processingTitle}>Check Current Processing Times</Text>
                <Text style={styles.processingSub}>View official DHA timeframes by visa subclass</Text>
              </View>
            </View>
            <Ionicons name="open-outline" size={14} color={Colors.accent} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Other Visa Types */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Other Visa Pathways</Text>
          <View style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>Family, Employer, Student & more</Text>
          </View>
        </View>
        <Text style={styles.sectionSub}>Not eligible for skilled migration? Explore other options:</Text>
        <View>
          {OTHER_VISAS_DATA.map((visa) => {
            const isExpanded = expandedVisa === visa.code;
            return (
              <View key={visa.code}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setExpandedVisa(isExpanded ? null : visa.code)}
                  style={styles.visaCardExpand}
                >
                  <View style={styles.visaCardHeader}>
                    <View style={styles.visaCardIcon}>
                      <Ionicons name={visa.icon as any} size={18} color={Colors.accent} />
                    </View>
                    <View style={styles.visaCardInfo}>
                      <Text style={styles.visaCode}>{visa.code}</Text>
                      <Text style={styles.visaTitle}>{visa.name}</Text>
                    </View>
                    <View style={styles.visaTypeTag}>
                      <Text style={styles.visaTypeText}>{visa.type}</Text>
                    </View>
                    <Ionicons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={18} 
                      color={Colors.textMuted} 
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.visaExpandedContent}>
                    <View style={styles.visaSubsection}>
                      <Text style={styles.visaSubtitle}>Subclasses:</Text>
                      {visa.subclasses.map((sc, idx) => (
                        <Text key={idx} style={styles.visaListItem}>• {sc}</Text>
                      ))}
                    </View>

                    <View style={styles.visaSubsection}>
                      <Text style={styles.visaSubtitle}>Main Requirements:</Text>
                      {visa.conditions.map((cond, idx) => (
                        <Text key={idx} style={styles.visaListItem}>• {cond}</Text>
                      ))}
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => Linking.openURL(visa.url)}
                      style={styles.visaLinkButton}
                    >
                      <Text style={styles.visaLinkButtonText}>View Full Details on DHA Website</Text>
                      <Ionicons name="open-outline" size={14} color={Colors.accent} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Aria AI promo */}
      <View style={styles.section}>
        <PressableCard onPress={() => router.push('/(tabs)/ai')}>
          <LinearGradient
            colors={['#1A0A3D', '#2D1B6E']}
            style={styles.ariaCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.ariaCardShine} />
            <View style={styles.ariaLeft}>
              <View style={styles.ariaAvatarSmall}>
                <Ionicons name="sparkles" size={20} color={Colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ariaTitle}>Ask Aria AI</Text>
                <Text style={styles.ariaSub}>Your personal migration consultant — available 24/7</Text>
              </View>
            </View>
            <View style={styles.ariaChips}>
              {["What's 189 vs 190?", 'Do I need skills assessment?'].map((q) => (
                <View key={q} style={styles.ariaChip}>
                  <Text style={styles.ariaChipText}>{q}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </PressableCard>
      </View>

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

      {/* Independent guide banner */}
      <View style={styles.independentBanner}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.accent} />
        <Text style={styles.independentText}>
          Independent Guide — Not affiliated with the Australian Government
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  hero: {
    minHeight: height * 0.44,
    backgroundColor: Colors.primaryDark,
    overflow: 'hidden',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  orb1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#003A8C',
    top: -80,
    right: -80,
    opacity: 0.6,
  },
  orb2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FFCD00',
    bottom: -60,
    left: -40,
    opacity: 0.07,
  },
  heroContent: { zIndex: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,205,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,205,0,0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  badgeText: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.display,
    fontWeight: FontWeight.extraBold,
    lineHeight: 44,
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  heroSub: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  heroCta: { alignSelf: 'flex-start', borderRadius: Radius.full, overflow: 'hidden' },
  heroCtaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
  },
  heroCtaText: {
    color: Colors.primaryDark,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },

  tilesRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  tilePressable: { flex: 1 },
  tile: {
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: Spacing.sm,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tileLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },

  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sectionPill: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  sectionPillText: { fontSize: FontSize.xs, color: Colors.textMuted },

  cardsScroll: { gap: Spacing.md, paddingRight: Spacing.lg },
  visaCard: {
    width: width * 0.75,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    overflow: 'hidden',
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  visaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  visaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visaBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  visaBadgeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  visaName: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  visaDesc: { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.xl },
  visaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  visaPtsLabel: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.xs },
  visaPtsNum: { color: Colors.secondary, fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold },
  visaArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // English Tests card
  englishCard: { borderRadius: Radius.xl, padding: Spacing.xl, overflow: 'hidden' },
  englishLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  englishIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,214,143,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0,214,143,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  englishTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  englishSub: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  englishChips: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  englishChip: {
    backgroundColor: 'rgba(0,214,143,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,214,143,0.25)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  englishChipText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },

  // Processing Times card
  processingCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  processingGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  processingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  processingTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  processingSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },

  ariaCard: { borderRadius: Radius.xl, padding: Spacing.xl, overflow: 'hidden' },
  ariaCardShine: {
    position: 'absolute',
    top: 0, right: 0,
    width: 120, height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(167,139,250,0.15)',
  },
  ariaLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  ariaAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,205,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,205,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ariaTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  ariaSub: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  ariaChips: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  ariaChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  ariaChipText: { color: Colors.textSecondary, fontSize: FontSize.xs },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disclaimerText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },
  disclaimerLink: { color: Colors.accent, textDecorationLine: 'underline' },

  independentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  independentText: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    opacity: 0.7,
    textAlign: 'center',
  },

  // Expandable Visa Cards
  visaCardExpand: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,194,255,0.04)',
  },
  visaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  visaCardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0,194,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visaCardInfo: {
    flex: 1,
  },
  visaCode: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
  },
  visaTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  visaTypeTag: {
    backgroundColor: Colors.accent + '20',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  visaTypeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.accent,
  },
  visaExpandedContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.primaryDark + '40',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  visaSubsection: {
    marginBottom: Spacing.md,
  },
  visaSubtitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
    color: Colors.secondary,
    marginBottom: Spacing.xs,
  },
  visaListItem: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  visaLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  visaLinkButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
    color: Colors.accent,
  },
});
