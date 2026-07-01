import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { useColors } from '../constants/ThemeContext';
import {
  ALL_VISAS,
  CATEGORY_META,
  ALL_CATEGORIES,
  VisaCategory,
} from '../constants/visaData';
import { ProcessingTime } from '../constants/processingTimes';
import {
  getProcessingTimes,
  getTimesForCode,
} from '../utils/processingTimes';
import { tap as hapticTap } from '../utils/haptics';

type Category = VisaCategory;
type Filter = 'All' | Category;

const CATEGORY_ORDER: Category[] = ALL_CATEGORIES;

const FILTERS: Filter[] = ['All', ...CATEGORY_ORDER];

/** Group visas by category in display order */
function groupByCategory(visas: typeof ALL_VISAS): Array<{ category: Category; items: typeof ALL_VISAS }> {
  const map = new Map<Category, VisaPathway[]>();
  for (const v of visas) {
    if (!map.has(v.category)) map.set(v.category, []);
    map.get(v.category)!.push(v);
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c)! }));
}

export default function VisasScreen() {
  const Colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();
  const initial: Filter =
    params.category && FILTERS.includes(params.category as Filter)
      ? (params.category as Filter)
      : 'All';
  const [filter, setFilter] = useState<Filter>(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const filterRef = useRef<ScrollView>(null);
  const [snapshot, setSnapshot] = useState<{ items: ProcessingTime[] }>({ items: [] });

  useEffect(() => {
    getProcessingTimes().then(setSnapshot);
  }, []);

  const groups = useMemo(() => {
    let visas =
      filter === 'All' ? ALL_VISAS : ALL_VISAS.filter((v) => v.category === filter);
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      visas = visas.filter((v) => 
        v.code.toLowerCase().includes(query) ||
        v.name.toLowerCase().includes(query) ||
        v.conditions.some(c => c.toLowerCase().includes(query)) ||
        v.subclasses.some(s => s.toLowerCase().includes(query))
      );
    }
    
    return groupByCategory(visas);
  }, [filter, searchQuery]);

  const totalCount = useMemo(
    () => groups.reduce((s, g) => s + g.items.length, 0),
    [groups]
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={[styles.container, { backgroundColor: Colors.background }]} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <LinearGradient
          colors={[Colors.primaryDark, Colors.background]}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
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
              <Ionicons name="layers-outline" size={12} color={Colors.accent} />
              <Text style={styles.headerBadgeText}>{totalCount} visas</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>
          <Text style={styles.title}>Visa Pathways</Text>
          <Text style={styles.subtitle}>
            All Australian visa subclasses organised by category — streams, conditions and official links in one place.
          </Text>
        </LinearGradient>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search visas by code, name or conditions..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category tab bar */}
        <ScrollView
          ref={filterRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            const meta = f !== 'All' ? CATEGORY_META[f] : null;
            const count =
              f === 'All'
                ? ALL_VISAS.length
                : ALL_VISAS.filter((v) => v.category === f).length;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.tab, active && styles.tabActive, meta && active ? { borderColor: meta.color + '80' } : null]}
                onPress={() => { hapticTap(); setFilter(f); setExpanded(null); }}
                activeOpacity={0.8}
              >
                {meta && (
                  <Ionicons
                    name={meta.icon as any}
                    size={13}
                    color={active ? meta.color : Colors.textMuted}
                  />
                )}
                <Text style={[styles.tabText, active && styles.tabTextActive, meta && active ? { color: meta.color } : null]}>
                  {f}
                </Text>
                <View style={[styles.tabCount, active && meta ? { backgroundColor: meta.color + '20' } : null]}>
                  <Text style={[styles.tabCountText, active && meta ? { color: meta.color } : null]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Grouped sections */}
        <View style={styles.body}>
          {groups.map(({ category, items }) => {
            const meta = CATEGORY_META[category];
            return (
              <View key={category} style={styles.section}>
                {/* Section header */}
                <View style={[styles.sectionHeader, { borderLeftColor: meta.color }]}>
                  <View style={[styles.sectionIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                  </View>
                  <Text style={styles.sectionTitle}>{category}</Text>
                  <View style={[styles.sectionCount, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.sectionCountText, { color: meta.color }]}>{items.length}</Text>
                  </View>
                </View>

                {/* Points calculator shortcut — only shown under Skilled */}
                {category === 'Skilled' && (
                  <TouchableOpacity
                    style={styles.calcCard}
                    onPress={() => router.push('/(tabs)/calculator' as any)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['rgba(255,205,0,0.12)', 'rgba(255,184,0,0.06)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.calcCardGrad}
                    >
                      <View style={styles.calcCardIcon}>
                        <Ionicons name="calculator-outline" size={18} color={Colors.secondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.calcCardTitle}>Calculate Your Points</Text>
                        <Text style={styles.calcCardSub}>See if you reach the 65-point threshold</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.secondary} />
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {/* Visa cards */}
                <View style={styles.cardList}>
                  {items.map((v) => {
                    const open = expanded === `${category}-${v.code}`;
                    const times = getTimesForCode(snapshot, v.code);
                    // Pick the fastest stream's p50 for the collapsed badge
                    const fastestTime = times.length > 0 ? times[0] : null;
                    return (
                      <View key={v.code} style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                        <TouchableOpacity
                          style={styles.cardHead}
                          activeOpacity={0.85}
                          onPress={() => {
                            hapticTap();
                            setExpanded(open ? null : `${category}-${v.code}`);
                          }}
                        >
                          {/* Left accent strip */}
                          <View style={[styles.cardStrip, { backgroundColor: meta.color }]} />

                          <View style={styles.cardHeadContent}>
                            <View style={styles.codeRow}>
                              <Text style={styles.cardCode}>SC {v.code}</Text>
                              <View style={[styles.typeBadge, v.type === 'Permanent' ? styles.typePerm : v.type === 'Repealed' ? styles.typeRepealed : styles.typeTemp]}>
                                <Text style={[styles.typeText, v.type === 'Permanent' ? styles.typeTextPerm : v.type === 'Repealed' ? styles.typeTextRepealed : styles.typeTextTemp]}>
                                  {v.type}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.cardName}>{v.name}</Text>
                            {fastestTime && (
                              <View style={styles.timeBadgeRow}>
                                <Ionicons name="time-outline" size={11} color={meta.color} />
                                <Text style={[styles.timeBadgeText, { color: meta.color }]}>
                                  {times.length > 1
                                    ? `${fastestTime.p50} – ${times[times.length - 1].p50}`
                                    : fastestTime.p50}
                                  {' '}median
                                </Text>
                                {times.length > 1 && (
                                  <Text style={styles.timeBadgeStreams}>({times.length} streams)</Text>
                                )}
                              </View>
                            )}
                          </View>
                          <Ionicons
                            name={open ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={Colors.textMuted}
                          />
                        </TouchableOpacity>

                        {open && (
                          <View style={styles.cardBody}>
                            {/* Processing time stats */}
                            {times.length > 0 && (
                              <View style={styles.timesSection}>
                                <Text style={styles.bodyLabel}>Processing Times</Text>
                                {times.map((t) => (
                                  <View key={`${t.subclass}|${t.stream ?? ''}`} style={styles.timeRow}>
                                    {t.stream && (
                                      <Text style={styles.timeStream}>{t.stream}</Text>
                                    )}
                                    <View style={styles.timeStats}>
                                      <View style={styles.timeStat}>
                                        <Text style={styles.timeStatLabel}>Median (50%)</Text>
                                        <Text style={[styles.timeStatValue, { color: meta.color }]}>{t.p50}</Text>
                                      </View>
                                      <View style={styles.timeStatDivider} />
                                      <View style={styles.timeStat}>
                                        <Text style={styles.timeStatLabel}>90% within</Text>
                                        <Text style={styles.timeStatValue}>{t.p90}</Text>
                                      </View>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            )}

                            <Text style={[styles.bodyLabel, times.length > 0 ? { marginTop: Spacing.md } : {}]}>Streams</Text>
                            <View style={styles.streamList}>
                              {v.subclasses.map((s) => (
                                <View key={s} style={[styles.streamChip, { borderColor: meta.color + '40' }]}>
                                  <Text style={[styles.streamText, { color: meta.color }]}>{s}</Text>
                                </View>
                              ))}
                            </View>

                            <Text style={[styles.bodyLabel, { marginTop: Spacing.md }]}>Key conditions</Text>
                            <View style={styles.condList}>
                              {v.conditions.map((c) => (
                                <View key={c} style={styles.condRow}>
                                  <View style={[styles.condDot, { backgroundColor: meta.color }]} />
                                  <Text style={styles.condText}>{c}</Text>
                                </View>
                              ))}
                            </View>

                            <TouchableOpacity
                              style={[styles.dhaBtn, { borderColor: meta.color + '40', backgroundColor: meta.bg }]}
                              onPress={() => Linking.openURL(v.url)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="open-outline" size={13} color={meta.color} />
                              <Text style={[styles.dhaBtnText, { color: meta.color }]}>Read full guide on DHA</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.footerText}>
            Information is indicative. For formal advice consult a{' '}
            <Text style={styles.footerLink} onPress={() => Linking.openURL('https://portal.mara.gov.au')}>
              MARA-registered agent
            </Text>.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  /* Header */
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(0,194,255,0.12)',
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: 'rgba(0,194,255,0.25)',
  },
  headerBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold as any, color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 20 },

  /* Tab bar */
  tabBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 0,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: Colors.secondary + '80' },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.textPrimary, fontWeight: '700' },
  tabCount: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    minWidth: 18, alignItems: 'center',
  },
  tabCountText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },

  /* Body */
  body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.xl },

  /* Section */
  section: { gap: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingLeft: 12,
    borderLeftWidth: 3,
  },
  sectionIcon: {
    width: 30, height: 30, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.bold as any, color: Colors.textPrimary },
  sectionCount: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  sectionCountText: { fontSize: 11, fontWeight: '700' },

  /* Card list */
  cardList: { gap: 8 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingRight: Spacing.md, gap: Spacing.sm },
  cardStrip: { width: 3, alignSelf: 'stretch', borderRadius: 0 },
  cardHeadContent: { flex: 1, paddingLeft: Spacing.sm },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  cardCode: {
    fontSize: 10, fontWeight: '800', color: Colors.textPrimary,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  typePerm: { backgroundColor: 'rgba(0,214,143,0.15)' },
  typeTemp: { backgroundColor: 'rgba(0,194,255,0.15)' },
  typeRepealed: { backgroundColor: 'rgba(107,114,128,0.15)' },
  typeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  typeTextPerm: { color: Colors.success },
  typeTextTemp: { color: Colors.accent },
  typeTextRepealed: { color: '#9CA3AF' },
  cardName: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold as any, color: Colors.textPrimary },

  /* Processing time inline badge (collapsed) */
  timeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  timeBadgeText: { fontSize: 11, fontWeight: '700' },
  timeBadgeStreams: { fontSize: 10, color: Colors.textMuted },

  /* Expanded body */
  cardBody: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, paddingTop: 0,
    borderTopWidth: 1, borderTopColor: Colors.divider,
    marginLeft: 3, // align under strip
  },
  bodyLabel: {
    fontSize: 10, fontWeight: '700',
    color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: Spacing.md, marginBottom: Spacing.sm,
  },

  /* Processing time stats (expanded) */
  timesSection: { gap: 8 },
  timeRow: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: 6,
  },
  timeStream: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  timeStats: { flexDirection: 'row', alignItems: 'center' },
  timeStat: { flex: 1, alignItems: 'center' },
  timeStatLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  timeStatValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold as any, color: Colors.textPrimary },
  timeStatDivider: { width: 1, height: 22, backgroundColor: Colors.divider, marginHorizontal: Spacing.sm },
  streamList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  streamChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  streamText: { fontSize: 11, fontWeight: '600' },
  condList: { gap: 6 },
  condRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  condDot: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  condText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  dhaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  dhaBtnText: { fontSize: FontSize.xs, fontWeight: '700' },

  /* Points calculator card (Skilled section) */
  calcCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,205,0,0.25)',
    marginBottom: Spacing.sm,
  },
  calcCardGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  calcCardIcon: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: 'rgba(255,205,0,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  calcCardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold as any, color: Colors.secondary },
  calcCardSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  /* Search */
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
  },

  /* Footer */
  footer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl, paddingBottom: Spacing.md,
  },
  footerText: { flex: 1, fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
  footerLink: { color: Colors.accent, textDecorationLine: 'underline' },
});
