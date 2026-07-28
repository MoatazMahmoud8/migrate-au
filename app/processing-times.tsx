import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { useColors } from '../constants/ThemeContext';
import { openExternalUrl } from '../utils/openExternalUrl';
import { CATEGORIES, ProcessingTime } from '../constants/processingTimes';
import { VISA_FEES } from '../constants/visaFees';
import {
  getProcessingTimes,
  getLastCheckedAt,
  refreshProcessingTimes,
} from '../utils/processingTimes';
import { tap as hapticTap } from '../utils/haptics';

// Build a lookup map from visaFees (single source of truth)
const FEE_MAP = new Map(VISA_FEES.map((f) => [f.subclass, f]));

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

export default function ProcessingTimesScreen() {
  const Colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ProcessingTime[]>([]);
  const [snapshotDate, setSnapshotDate] = useState<string>('');
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const snap = await getProcessingTimes();
      setItems(snap.items);
      setSnapshotDate(snap.snapshotDate);
      setLastChecked(await getLastCheckedAt());
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    hapticTap();
    const { snapshot } = await refreshProcessingTimes({ force: true });
    setItems(snapshot.items);
    setSnapshotDate(snapshot.snapshotDate);
    setLastChecked(await getLastCheckedAt());
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let result = filter === 'All' ? items : items.filter((i) => i.category === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.subclass.includes(q) ||
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.streams.some((s) => s.name?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, filter, search]);

  const FILTERS = ['All', ...CATEGORIES];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={[styles.container, { backgroundColor: Colors.background }]}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={['#001A3D', '#001224']}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={22} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.headerBadge}>
              <Ionicons name="time-outline" size={12} color={Colors.accent} />
              <Text style={[styles.headerBadgeText, { color: Colors.white }]}>Live data</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>

          <Text style={[styles.title, { color: Colors.white }]}>Visa Processing Times</Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.75)' }]}>
            Median and 90th percentile timeframes for recently decided applications.
          </Text>

          <View style={styles.metaRow}>
            <View style={[styles.metaPill, { backgroundColor: Colors.surface }]}>
              <Ionicons name="calendar-outline" size={11} color={Colors.textMuted} />
              <Text style={[styles.metaText, {color: Colors.textPrimary}]}>Updated {formatSnapshot(snapshotDate)}</Text>
            </View>
            <View style={[styles.metaPill, { backgroundColor: Colors.surface }]}>
              <Ionicons name="refresh-outline" size={11} color={Colors.textMuted} />
              <Text style={[styles.metaText, {color: Colors.textPrimary}]}>Checked {timeAgo(lastChecked)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Search bar */}
        <View style={[styles.searchWrap, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: Colors.textPrimary }]}
            placeholder="Search by visa number or name…"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.pill, active && styles.pillActive, { borderColor: active ? Colors.secondary : Colors.border }]}
                onPress={() => { hapticTap(); setFilter(f); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, { color: active ? Colors.secondary : Colors.textSecondary }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* No results */}
        {filtered.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={32} color={Colors.textMuted} />
            <Text style={[styles.emptyText, { color: Colors.textMuted }]}>No visas match "{search}"</Text>
          </View>
        )}

        {/* List */}
        <View style={styles.list}>
          {filtered.map((p) => {
            const cardKey = p.subclass;
            const isExpanded = expanded === cardKey;
            const singleUnnamed = p.streams.length === 1 && !p.streams[0].name;
            // Always pull fee from single source of truth (visaFees.ts)
            const feeEntry = FEE_MAP.get(p.subclass);
            return (
              <TouchableOpacity
                key={cardKey}
                style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                activeOpacity={0.88}
                onPress={() => { hapticTap(); setExpanded(isExpanded ? null : cardKey); }}
              >
                <View style={[styles.cardAccent, { backgroundColor: p.color }]} />
                <View style={styles.cardInner}>

                  {/* ── Card header ── */}
                  <View style={styles.cardHead}>
                    <View style={[styles.iconWrap, { backgroundColor: `${p.color}18` }]}>
                      <Ionicons name={p.icon as any} size={18} color={p.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.cardTitleRow}>
                        <View style={[styles.cardCodeBadge, { backgroundColor: `${p.color}22` }]}>
                          <Text style={[styles.cardCode, { color: p.color }]}>SC {p.subclass}</Text>
                        </View>
                        <View style={[styles.catBadge, { backgroundColor: Colors.background }]}>
                          <Text style={[styles.cardCat, { color: Colors.textSecondary }]}>{p.category}</Text>
                        </View>
                      </View>
                      <Text style={[styles.cardName, {color: Colors.textPrimary}]}>{p.name}</Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={Colors.textMuted}
                    />
                  </View>

                  {/* ── Streams / Processing times ── */}
                  {singleUnnamed ? (
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={[styles.statLabel, {color: Colors.textSecondary}]}>Median (50%)</Text>
                        <Text style={[styles.statValue, { color: p.color }]}>{p.streams[0].p50}</Text>
                      </View>
                      <View style={[styles.statDivider, { backgroundColor: Colors.border }]} />
                      <View style={styles.statBox}>
                        <Text style={[styles.statLabel, {color: Colors.textSecondary}]}>90% within</Text>
                        <Text style={[styles.statValue, {color: Colors.textPrimary}]}>{p.streams[0].p90}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.streamsSection, { borderColor: Colors.border }]}>
                      <Text style={[styles.sectionHead, { color: Colors.textSecondary }]}>
                        <Ionicons name="git-branch-outline" size={11} /> Streams
                      </Text>
                      {p.streams.map((s, i) => (
                        <View key={i} style={[styles.streamRow, i < p.streams.length - 1 && { borderBottomColor: Colors.border, borderBottomWidth: 1 }]}>
                          <Text style={[styles.streamName, { color: Colors.textPrimary }]} numberOfLines={2}>
                            {s.name ?? `Stream ${i + 1}`}
                          </Text>
                          <View style={styles.streamTimes}>
                            <View style={[styles.streamBadge, { backgroundColor: `${p.color}15` }]}>
                              <Text style={[styles.streamBadgeLabel, { color: Colors.textMuted }]}>50%</Text>
                              <Text style={[styles.streamBadgeVal, { color: p.color }]}>{s.p50}</Text>
                            </View>
                            <View style={[styles.streamBadge, { backgroundColor: Colors.background }]}>
                              <Text style={[styles.streamBadgeLabel, { color: Colors.textMuted }]}>90%</Text>
                              <Text style={[styles.streamBadgeVal, { color: Colors.textPrimary }]}>{s.p90}</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* ── Expandable details ── */}
                  {isExpanded && (
                    <>
                      {/* Key conditions */}
                      {p.conditions && p.conditions.length > 0 && (
                        <View style={[styles.detailSection, { borderColor: Colors.border }]}>
                          <Text style={[styles.sectionHead, { color: Colors.textSecondary }]}>
                            <Ionicons name="checkmark-circle-outline" size={11} /> Key conditions
                          </Text>
                          {p.conditions.map((c, i) => (
                            <View key={i} style={styles.condRow}>
                              <Text style={[styles.condDot, { color: p.color }]}>•</Text>
                              <Text style={[styles.condText, { color: Colors.textPrimary }]}>{c}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Application fee — from visaFees.ts (single source of truth) */}
                      {feeEntry && (
                        <View style={[styles.detailSection, { borderColor: Colors.border }]}>
                          <Text style={[styles.sectionHead, { color: Colors.textSecondary }]}>
                            <Ionicons name="card-outline" size={11} /> Application fee
                          </Text>
                          <View style={styles.feeRow}>
                            <Text style={[styles.feeMain, { color: Colors.textPrimary }]}>{feeEntry.fee}</Text>
                            <Text style={[styles.feeLabel, { color: Colors.textMuted }]}>main applicant</Text>
                          </View>
                          {feeEntry.note && (
                            <Text style={[styles.familyFee, { color: Colors.textSecondary }]}>
                              {feeEntry.note}
                            </Text>
                          )}
                        </View>
                      )}

                      {/* DHA link */}
                      <TouchableOpacity
                        style={[styles.dhaLink, { borderColor: Colors.border }]}
                        onPress={() => void openExternalUrl(p.url)}
                      >
                        <Ionicons name="open-outline" size={12} color={Colors.accent} />
                        <Text style={[styles.dhaLinkText, { color: Colors.accent }]}>View on immi.homeaffairs.gov.au</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
          <Text style={[styles.footerText, {color: Colors.textSecondary}]}>
            Estimates only. Actual processing depends on application completeness and document
            verification. Fees shown are current government charges and exclude agent fees.
            Source:{' '}
            <Text
              style={[styles.footerLink, { color: Colors.accent }]}
              onPress={() =>
                void openExternalUrl(
                  'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/global-visa-processing-times'
                )
              }
            >
              immi.homeaffairs.gov.au
            </Text>
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(0,194,255,0.12)', borderRadius: Radius.full,
    borderWidth: 1, borderColor: 'rgba(0,194,255,0.25)',
  },
  headerBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold as any, marginBottom: 6 },
  subtitle: { fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.md },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1,
  },
  metaText: { fontSize: 10, fontWeight: '600' },

  // Search bar
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: Radius.md, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, padding: 0 },

  filterRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, marginRight: 8 },
  pillActive: { backgroundColor: 'rgba(255,205,0,0.12)' },
  pillText: { fontSize: FontSize.xs, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.sm },

  list: { paddingHorizontal: Spacing.lg, gap: 10 },
  card: { flexDirection: 'row', borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  cardAccent: { width: 4 },
  cardInner: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  iconWrap: { width: 38, height: 38, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' },
  cardCodeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  cardCode: { fontSize: 10, fontWeight: '800' },
  catBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  cardCat: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  cardName: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold as any },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold as any },
  statDivider: { width: 1, height: 24, marginHorizontal: Spacing.sm },

  streamsSection: { borderTopWidth: 1, paddingTop: Spacing.sm },
  streamRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  streamName: { flex: 1, fontSize: FontSize.xs, paddingRight: Spacing.sm },
  streamTimes: { flexDirection: 'row', gap: 6 },
  streamBadge: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  streamBadgeLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  streamBadgeVal: { fontSize: 11, fontWeight: '700' },

  sectionHead: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },

  detailSection: { borderTopWidth: 1, paddingTop: Spacing.sm },
  condRow: { flexDirection: 'row', gap: 6, marginBottom: 3 },
  condDot: { fontSize: 12, fontWeight: '700', lineHeight: 18 },
  condText: { flex: 1, fontSize: FontSize.xs, lineHeight: 18 },

  feeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 2 },
  feeMain: { fontSize: FontSize.sm, fontWeight: FontWeight.bold as any },
  feeLabel: { fontSize: 10 },
  familyFee: { fontSize: FontSize.xs, lineHeight: 16 },

  dhaLink: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderTopWidth: 1, paddingTop: Spacing.sm, marginTop: 2,
  },
  dhaLinkText: { fontSize: 11, fontWeight: '600' },

  footer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md,
  },
  footerText: { flex: 1, fontSize: 11, lineHeight: 16 },
  footerLink: { textDecorationLine: 'underline' },
});
