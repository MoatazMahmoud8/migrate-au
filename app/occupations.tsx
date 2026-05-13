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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import {
  SkilledOccupation,
  SkillList,
  SKILL_LISTS,
} from '../constants/skilledOccupations';
import {
  getSkilledOccupations,
  getOccupationsLastCheckedAt,
  refreshSkilledOccupations,
  searchOccupations,
} from '../utils/skilledOccupations';
import { tap as hapticTap } from '../utils/haptics';

type ListFilter = 'All' | SkillList;

const LIST_COLORS: Record<SkillList, string> = {
  CSOL: Colors.accent,
  MLTSSL: Colors.success,
  STSOL: Colors.warning,
  ROL: Colors.accentPurple,
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

  const [items, setItems] = useState<SkilledOccupation[]>([]);
  const [snapshotDate, setSnapshotDate] = useState<string>('');
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ListFilter>('All');
  const [selected, setSelected] = useState<SkilledOccupation | null>(null);

  useEffect(() => {
    (async () => {
      const snap = await getSkilledOccupations();
      setItems(snap.items);
      setSnapshotDate(snap.snapshotDate);
      setLastChecked(await getOccupationsLastCheckedAt());
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    hapticTap();
    const { snapshot } = await refreshSkilledOccupations({ force: true });
    setItems(snapshot.items);
    setSnapshotDate(snapshot.snapshotDate);
    setLastChecked(await getOccupationsLastCheckedAt());
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const base = filter === 'All' ? items : items.filter((o) => o.lists.includes(filter));
    return searchOccupations(base, query, 300);
  }, [items, filter, query]);

  const FILTERS: ListFilter[] = ['All', ...SKILL_LISTS];

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
            Search the full ANZSCO list across CSOL, MLTSSL, STSOL and ROL.
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

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            const tint = f === 'All' ? Colors.accent : LIST_COLORS[f as SkillList];
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.pill,
                  active && { backgroundColor: `${tint}22`, borderColor: tint },
                ]}
                onPress={() => { hapticTap(); setFilter(f); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, active && { color: tint }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => { hapticTap(); setSelected(item); }}
            >
              <View style={styles.cardHead}>
                <View style={styles.codePill}>
                  <Text style={styles.codePillText}>{item.anzsco}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.cardGroup}>{item.group}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
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
                </View>
                <Text style={styles.visasText} numberOfLines={1}>
                  {item.visas.map((v) => `SC ${v}`).join(' · ')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
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

                  <Text style={styles.sectionLabel}>Eligible visas</Text>
                  <View style={styles.chipRow}>
                    {selected.visas.map((v) => (
                      <View key={v} style={styles.visaChip}>
                        <Text style={styles.visaChipText}>SC {v}</Text>
                      </View>
                    ))}
                  </View>

                  {selected.assessingAuthority && (
                    <>
                      <Text style={styles.sectionLabel}>Assessing authority</Text>
                      <Text style={styles.bodyText}>{selected.assessingAuthority}</Text>
                    </>
                  )}

                  <TouchableOpacity
                    style={styles.modalCta}
                    activeOpacity={0.85}
                    onPress={() =>
                      Linking.openURL(
                        `https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list?anzsco=${selected.anzsco}`
                      )
                    }
                  >
                    <Ionicons name="open-outline" size={14} color={Colors.primaryDark} />
                    <Text style={styles.modalCtaText}>View on DHA</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 8,
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
  visaChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.sm,
    backgroundColor: Colors.glass,
    borderWidth: 1, borderColor: Colors.border,
  },
  visaChipText: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },

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
  modalCtaText: { color: Colors.primaryDark, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
});
