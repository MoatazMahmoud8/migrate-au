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
              <Text style={[styles.headerBadgeText, {color: Colors.textPrimary}]}>Live data</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>

          <Text style={[styles.title, {color: Colors.textPrimary}]}>Visa Processing Times</Text>
          <Text style={[styles.subtitle, {color: Colors.textPrimary}]}>
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
                      <Text style={[styles.cardCode, {color: Colors.textPrimary}]}>SC {p.subclass}</Text>
                      <Text style={[styles.cardCat, {color: Colors.textPrimary}]}>{p.category}</Text>
                    </View>
                    <Text style={[styles.cardName, {color: Colors.textPrimary}]}>{p.name}</Text>
                    {p.stream && <Text style={[styles.cardStream, {color: Colors.textPrimary}]}>{p.stream}</Text>}
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, {color: Colors.textPrimary}]}>Median (50%)</Text>
                    <Text style={[styles.statValue, { color: p.color }]}>{p.p50}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, {color: Colors.textPrimary}]}>90% within</Text>
                    <Text style={[styles.statValue, {color: Colors.textPrimary}]}>{p.p90}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
          <Text style={[styles.footerText, {color: Colors.textPrimary}]}>
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
  container: { flex: 1 },

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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: FontSize.sm,
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
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  metaText: { fontSize: 10, fontWeight: '600' },

  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: 'rgba(255,205,0,0.12)',
  },
  pillText: { fontSize: FontSize.xs, fontWeight: '600' },
  pillTextActive: { },

  list: { paddingHorizontal: Spacing.lg, gap: 10 },
  card: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cardCat: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardName: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold as any },
  cardStream: { fontSize: 11, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold as any },
  statDivider: { width: 1, height: 24, marginHorizontal: Spacing.sm },

  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  footerText: { flex: 1, fontSize: 11, lineHeight: 16 },
  footerLink: { textDecorationLine: 'underline' },
});
