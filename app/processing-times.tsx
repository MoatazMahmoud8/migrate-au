import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { useColors } from '../constants/ThemeContext';
import { CATEGORIES, ProcessingTime } from '../constants/processingTimes';
import {
  getProcessingTimes,
  getLastCheckedAt,
  refreshProcessingTimes,
} from '../utils/processingTimes';
import { tap as hapticTap } from '../utils/haptics';

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
    if (filter === 'All') return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

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
          colors={[Colors.primaryDark, Colors.background]}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerBadge}>
              <Ionicons name="time-outline" size={12} color={Colors.accent} />
              <Text style={styles.headerBadgeText}>Live data</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>

          <Text style={styles.title}>Visa Processing Times</Text>
          <Text style={styles.subtitle}>
            Median and 90th percentile timeframes for recently decided applications.
          </Text>

          <View style={styles.metaRow}>
            <View style={[styles.metaPill, { backgroundColor: Colors.surface }]}>
              <Ionicons name="calendar-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.metaText}>Updated {formatSnapshot(snapshotDate)}</Text>
            </View>
            <View style={[styles.metaPill, { backgroundColor: Colors.surface }]}>
              <Ionicons name="refresh-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.metaText}>Checked {timeAgo(lastChecked)}</Text>
            </View>
          </View>
        </LinearGradient>

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
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => { hapticTap(); setFilter(f); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List */}
        <View style={styles.list}>
          {filtered.map((p, idx) => (
            <TouchableOpacity
              key={`${p.subclass}-${p.stream ?? idx}`}
              style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
              activeOpacity={0.85}
              onPress={() => Linking.openURL(p.url)}
            >
              <View style={[styles.cardAccent, { backgroundColor: p.color }]} />
              <View style={styles.cardInner}>
                <View style={styles.cardHead}>
                  <View style={[styles.iconWrap, { backgroundColor: `${p.color}18` }]}>
                    <Ionicons name={p.icon as any} size={18} color={p.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardCode}>SC {p.subclass}</Text>
                      <Text style={styles.cardCat}>{p.category}</Text>
                    </View>
                    <Text style={styles.cardName}>{p.name}</Text>
                    {p.stream && <Text style={styles.cardStream}>{p.stream}</Text>}
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Median (50%)</Text>
                    <Text style={[styles.statValue, { color: p.color }]}>{p.p50}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>90% within</Text>
                    <Text style={styles.statValue}>{p.p90}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.footerText}>
            Estimates only. Actual processing depends on application completeness and document
            verification. Source:{' '}
            <Text
              style={styles.footerLink}
              onPress={() =>
                Linking.openURL(
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
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,194,255,0.12)',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,194,255,0.25)',
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metaText: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },

  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
  pillActive: {
    backgroundColor: 'rgba(255,205,0,0.12)',
    borderColor: Colors.secondary,
  },
  pillText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted },
  pillTextActive: { color: Colors.secondary },

  list: { paddingHorizontal: Spacing.lg, gap: 10 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardAccent: { width: 4 },
  cardInner: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  iconWrap: {
    width: 38, height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardCode: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textPrimary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cardCat: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardName: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold as any, color: Colors.textPrimary },
  cardStream: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold as any, color: Colors.textPrimary },
  statDivider: { width: 1, height: 24, backgroundColor: Colors.divider, marginHorizontal: Spacing.sm },

  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  footerText: { flex: 1, fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
  footerLink: { color: Colors.accent, textDecorationLine: 'underline' },
});
