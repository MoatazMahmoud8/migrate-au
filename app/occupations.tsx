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
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import {
  SkilledOccupation,
  SkillList,
  SKILL_LISTS,
  StateCode,
  STATE_CODES,
} from '../constants/skilledOccupations';
import {
  getSkilledOccupations,
  getOccupationsLastCheckedAt,
  refreshSkilledOccupations,
  searchOccupations,
} from '../utils/skilledOccupations';
import { tap as hapticTap, success as hapticSuccess } from '../utils/haptics';
import { getProfile, saveProfile } from '../utils/storage';

type ListFilter = 'All' | SkillList;
type JurisdictionFilter = 'All' | 'Federal' | StateCode;

const LIST_COLORS: Record<SkillList, string> = {
  CSOL: Colors.accent,
  MLTSSL: Colors.success,
  STSOL: Colors.warning,
  ROL: Colors.accentPurple,
};

const STATE_COLORS: Record<StateCode, string> = {
  NSW: '#4F8EF7',
  VIC: '#00C2FF',
  QLD: '#FF6B8A',
  WA: '#FFCD00',
  SA: '#FF7043',
  TAS: '#00D68F',
  ACT: '#A78BFA',
  NT: '#FFB800',
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
  const params = useLocalSearchParams<{ state?: string }>();

  const [items, setItems] = useState<SkilledOccupation[]>([]);
  const [snapshotDate, setSnapshotDate] = useState<string>('');
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ListFilter>('All');
  const [jurisdiction, setJurisdiction] = useState<JurisdictionFilter>(() => {
    const p = (params.state ?? '').toString().toUpperCase();
    return (STATE_CODES as string[]).includes(p) ? (p as StateCode) : 'All';
  });
  const [selected, setSelected] = useState<SkilledOccupation | null>(null);
  const [savedAnzsco, setSavedAnzsco] = useState<string>('');

  useEffect(() => {
    (async () => {
      const snap = await getSkilledOccupations();
      setItems(snap.items);
      setSnapshotDate(snap.snapshotDate);
      setLastChecked(await getOccupationsLastCheckedAt());
      const p = await getProfile();
      setSavedAnzsco(p.anzscoCode ?? '');
    })();
  }, []);

  const handleSetOccupation = async (o: SkilledOccupation) => {
    const code = savedAnzsco === o.anzsco ? '' : o.anzsco;
    await saveProfile({ anzscoCode: code });
    setSavedAnzsco(code);
    hapticSuccess();
  };

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
    let base = items;
    // Jurisdiction filter
    if (jurisdiction !== 'All') {
      if (jurisdiction === 'Federal') {
        base = base.filter((o) => o.lists.length > 0);
      } else {
        base = base.filter((o) => o.states && (o.states as any)[jurisdiction]);
      }
    }
    // List filter (only meaningful for Federal scope)
    if (filter !== 'All') {
      base = base.filter((o) => o.lists.includes(filter));
    }
    return searchOccupations(base, query, 300);
  }, [items, filter, jurisdiction, query]);

  const FILTERS: ListFilter[] = ['All', ...SKILL_LISTS];
  const JURISDICTIONS: JurisdictionFilter[] = ['All', 'Federal', ...STATE_CODES];
  const showListFilter = jurisdiction === 'All' || jurisdiction === 'Federal';

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
            Search every federal and state-nominated list in one place.
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

        {/* Jurisdiction pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {JURISDICTIONS.map((j) => {
            const active = jurisdiction === j;
            const tint =
              j === 'All' || j === 'Federal'
                ? Colors.accent
                : STATE_COLORS[j as StateCode];
            return (
              <TouchableOpacity
                key={j}
                style={[
                  styles.pill,
                  active && { backgroundColor: `${tint}22`, borderColor: tint },
                ]}
                onPress={() => {
                  hapticTap();
                  setJurisdiction(j);
                  // Reset list filter when switching to a state (lists are federal-only)
                  if (j !== 'All' && j !== 'Federal') setFilter('All');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, active && { color: tint, fontWeight: FontWeight.bold }]}>
                  {j}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Federal list pills (hidden when a state is selected) */}
        {showListFilter && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filterRow, styles.filterRowSecondary]}
          >
            {FILTERS.map((f) => {
              const active = filter === f;
              const tint = f === 'All' ? Colors.textSecondary : LIST_COLORS[f as SkillList];
              return (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.pillSm,
                    active && { backgroundColor: `${tint}22`, borderColor: tint },
                  ]}
                  onPress={() => { hapticTap(); setFilter(f); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillTextSm, active && { color: tint }]}>{f}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

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
              style={[styles.card, savedAnzsco === item.anzsco && styles.cardSaved]}
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
                {savedAnzsco === item.anzsco
                  ? <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  : <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                }
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
                  {jurisdiction !== 'All' && jurisdiction !== 'Federal' && item.states?.[jurisdiction as StateCode] && (
                    <View style={[styles.listChip, { backgroundColor: `${STATE_COLORS[jurisdiction as StateCode]}22`, borderColor: STATE_COLORS[jurisdiction as StateCode] }]}>
                      <Text style={[styles.listChipText, { color: STATE_COLORS[jurisdiction as StateCode] }]}>
                        {jurisdiction} {(item.states[jurisdiction as StateCode] ?? []).join('/')}
                      </Text>
                    </View>
                  )}
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

                  <Text style={styles.sectionLabel}>Eligible visas (federal)</Text>
                  <View style={styles.chipRow}>
                    {selected.visas.map((v) => (
                      <View key={v} style={styles.visaChip}>
                        <Text style={styles.visaChipText}>SC {v}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.sectionLabel}>State / territory eligibility</Text>
                  {selected.states && Object.keys(selected.states).length > 0 ? (
                    <View style={styles.stateGrid}>
                      {STATE_CODES.map((s) => {
                        const visas = selected.states?.[s];
                        const available = !!visas && visas.length > 0;
                        return (
                          <View
                            key={s}
                            style={[
                              styles.stateCell,
                              available
                                ? { backgroundColor: `${STATE_COLORS[s]}1A`, borderColor: STATE_COLORS[s] }
                                : { opacity: 0.35 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.stateCellCode,
                                { color: available ? STATE_COLORS[s] : Colors.textMuted },
                              ]}
                            >
                              {s}
                            </Text>
                            <Text style={styles.stateCellVisas}>
                              {available ? visas!.map((v) => v).join(' · ') : '—'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.bodyMuted}>
                      Not currently on any state nomination list.
                    </Text>
                  )}

                  {selected.assessingAuthority && (
                    <>
                      <Text style={styles.sectionLabel}>Assessing authority</Text>
                      <Text style={styles.bodyText}>{selected.assessingAuthority}</Text>
                    </>
                  )}

                  {/* Set as my occupation */}
                  <TouchableOpacity
                    style={[
                      styles.modalCta,
                      savedAnzsco === selected.anzsco && styles.modalCtaSaved,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleSetOccupation(selected)}
                  >
                    <Ionicons
                      name={savedAnzsco === selected.anzsco ? 'checkmark-circle' : 'bookmark-outline'}
                      size={14}
                      color={savedAnzsco === selected.anzsco ? Colors.primaryDark : Colors.primaryDark}
                    />
                    <Text style={styles.modalCtaText}>
                      {savedAnzsco === selected.anzsco ? 'My occupation ✓' : 'Set as my occupation'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalCta, styles.modalCtaSecondary]}
                    activeOpacity={0.85}
                    onPress={() =>
                      Linking.openURL(
                        `https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list?anzsco=${selected.anzsco}`
                      )
                    }
                  >
                    <Ionicons name="open-outline" size={14} color={Colors.textSecondary} />
                    <Text style={[styles.modalCtaText, { color: Colors.textSecondary }]}>View on DHA</Text>
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
  filterRowSecondary: {
    paddingVertical: 0,
    paddingBottom: Spacing.md,
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
  pillSm: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
    marginRight: 6,
  },
  pillTextSm: { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.semiBold, letterSpacing: 0.4 },

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
  cardSaved: {
    borderColor: Colors.success,
    backgroundColor: `${Colors.success}0D`,
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
  bodyMuted: { color: Colors.textMuted, fontSize: FontSize.sm, fontStyle: 'italic' },
  visaChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.sm,
    backgroundColor: Colors.glass,
    borderWidth: 1, borderColor: Colors.border,
  },
  visaChipText: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },

  /* State grid (modal) */
  stateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stateCell: {
    width: '23%',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.glass,
    alignItems: 'center',
  },
  stateCellCode: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.4 },
  stateCellVisas: { fontSize: 9, color: Colors.textSecondary, marginTop: 2 },

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
  modalCtaSaved: {
    backgroundColor: Colors.success,
  },
  modalCtaSecondary: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCtaText: { color: Colors.primaryDark, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
});
