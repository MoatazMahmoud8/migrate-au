/**
 * app/watchlist.tsx
 *
 * Pro feature: Occupation Watchlist.
 *
 * The user picks occupations + visa subclass + minimum points + (optional)
 * states. The backend pushes a targeted FCM message the moment a SkillSelect
 * round invites that occupation at-or-below the chosen points threshold for
 * one of the matching states.
 *
 * Paywall:
 *   - Free users can save 1 item.
 *   - Pro users (entitlement `premium`) can save unlimited items.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { useColors } from '../constants/ThemeContext';
import {
  WatchlistItem,
  listWatchlist,
  saveWatchlistItem,
  removeWatchlistItem,
} from '../utils/watchlist';
import {
  getSkilledOccupations,
  searchOccupations,
} from '../utils/skilledOccupations';
import type { SkilledOccupation } from '../constants/skilledOccupations';
import { getProfile } from '../utils/storage';
import { getRevenueCatUserId } from '../utils/iap';
import { PaywallModal } from '../components/PaywallModal';
import { tap as hapticTap, success as hapticSuccess } from '../utils/haptics';

const FREE_LIMIT = 1;
const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
const VISA_SUBCLASSES = ['189', '190', '491', '186', '494'];

export default function WatchlistScreen() {
  const Colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [userId, setUserId] = useState<string>('');
  const [isPremium, setIsPremium] = useState(false);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-flow state
  const [adding, setAdding] = useState(false);
  const [allOccs, setAllOccs] = useState<SkilledOccupation[]>([]);
  const [query, setQuery] = useState('');
  const [selectedOcc, setSelectedOcc] = useState<SkilledOccupation | null>(null);
  const [subclass, setSubclass] = useState('189');
  const [minPoints, setMinPoints] = useState('75');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [uid, profile, snap] = await Promise.all([
          getRevenueCatUserId().catch(() => ''),
          getProfile(),
          getSkilledOccupations(),
        ]);
        setUserId(uid || '');
        setIsPremium(!!profile.isPremium);
        setAllOccs(snap.items);
        if (uid) {
          const list = await listWatchlist(uid);
          setItems(list);
        }
      } catch (e) {
        console.warn('[watchlist] load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Filtered occupation search ───────────────────────────────────────────
  const results = useMemo(() => {
    if (!adding) return [];
    return searchOccupations(allOccs, query, 30);
  }, [allOccs, query, adding]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAddPress = () => {
    if (!isPremium && items.length >= FREE_LIMIT) {
      setPaywallVisible(true);
      return;
    }
    hapticTap();
    setAdding(true);
    setSelectedOcc(null);
    setQuery('');
    setSubclass('189');
    setMinPoints('75');
    setSelectedStates([]);
  };

  const handleSave = async () => {
    if (!userId || !selectedOcc) return;
    const points = parseInt(minPoints, 10);
    if (Number.isNaN(points) || points < 50 || points > 130) {
      Alert.alert('Invalid points', 'Enter a value between 50 and 130.');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveWatchlistItem(userId, {
        anzsco: selectedOcc.anzsco,
        anzscoTitle: selectedOcc.name,
        visaSubclass: subclass,
        minPoints: points,
        states: selectedStates,
      });
      // Replace-or-insert by id
      setItems((prev) => {
        const i = prev.findIndex((it) => it.id === saved.id);
        if (i >= 0) {
          const next = [...prev];
          next[i] = saved;
          return next;
        }
        return [...prev, saved];
      });
      hapticSuccess();
      setAdding(false);
    } catch (e) {
      console.warn('[watchlist] save error', e);
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (item: WatchlistItem) => {
    Alert.alert(
      'Remove from watchlist?',
      `${item.anzscoTitle} (${item.anzsco}) — ${item.visaSubclass}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeWatchlistItem(userId, item.id);
              setItems((prev) => prev.filter((it) => it.id !== item.id));
            } catch (e) {
              console.warn('[watchlist] remove error', e);
            }
          },
        },
      ],
    );
  };

  const toggleState = (code: string) => {
    // Premium feature: State-filtered watchlist alerts
    if (!isPremium && !selectedStates.includes(code)) {
      // Free user trying to ADD a state - block it
      setPaywallVisible(true);
      return;
    }
    // Premium user or removing an already-selected state
    setSelectedStates((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.secondary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: Colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Watchlist</Text>
        <View style={{ width: 26 }} />
      </View>

      {!adding ? (
        <>
          {/* Tier banner */}
          <View style={styles.banner}>
            <Ionicons
              name={isPremium ? 'star' : 'star-outline'}
              size={18}
              color={Colors.secondary}
            />
            <Text style={styles.bannerText}>
              {isPremium
                ? 'Pro — unlimited watchlist items'
                : `Free — ${items.length}/${FREE_LIMIT} item${
                    FREE_LIMIT === 1 ? '' : 's'
                  } used`}
            </Text>
          </View>

          {/* List */}
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 120 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="notifications-outline" size={42} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No watchlist items yet</Text>
                <Text style={styles.emptyBody}>
                  Add an occupation to get pinged the moment its SkillSelect round drops at-or-below your points.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.anzscoTitle}
                  </Text>
                  <Text style={styles.cardMeta}>
                    ANZSCO {item.anzsco} · Subclass {item.visaSubclass} · ≤{item.minPoints} pts
                  </Text>
                  {item.states && item.states.length > 0 && (
                    <Text style={styles.cardStates}>{item.states.join(' · ')}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleRemove(item)} hitSlop={12}>
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            )}
          />

          {/* Add button */}
          <TouchableOpacity
            style={[styles.addBtn, { bottom: insets.bottom + Spacing.lg }]}
            onPress={handleAddPress}
          >
            <Ionicons name="add" size={22} color={Colors.primaryDark} />
            <Text style={styles.addBtnText}>Add to watchlist</Text>
          </TouchableOpacity>
        </>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Occupation</Text>
            {selectedOcc ? (
              <View style={[styles.selectedOcc, { backgroundColor: Colors.surface }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{selectedOcc.name}</Text>
                  <Text style={styles.cardMeta}>ANZSCO {selectedOcc.anzsco}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedOcc(null)} hitSlop={10}>
                  <Ionicons name="close-circle" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search by code or title (e.g. 261313)"
                  placeholderTextColor={Colors.textMuted}
                  style={[styles.input, { backgroundColor: Colors.surface, borderColor: Colors.border, color: Colors.textPrimary }]}
                  autoCorrect={false}
                />
                <View style={[styles.resultsBox, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                  {results.slice(0, 8).map((occ) => (
                    <TouchableOpacity
                      key={occ.anzsco}
                      style={styles.resultRow}
                      onPress={() => {
                        setSelectedOcc(occ);
                        setQuery('');
                      }}
                    >
                      <Text style={styles.resultCode}>{occ.anzsco}</Text>
                      <Text style={styles.resultName} numberOfLines={1}>
                        {occ.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {query && results.length === 0 && (
                    <Text style={styles.noResults}>No matches</Text>
                  )}
                </View>
              </>
            )}

            <Text style={styles.label}>Visa subclass</Text>
            <View style={styles.chipRow}>
              {VISA_SUBCLASSES.map((vc) => (
                <TouchableOpacity
                  key={vc}
                  onPress={() => setSubclass(vc)}
                  style={[styles.chip, subclass === vc && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      subclass === vc && styles.chipTextActive,
                    ]}
                  >
                    {vc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Notify when round cutoff is at or below</Text>
            <View style={styles.pointsRow}>
              <TextInput
                value={minPoints}
                onChangeText={setMinPoints}
                keyboardType="number-pad"
                style={[styles.input, { flex: 1 }]}
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.pointsSuffix}>points</Text>
            </View>
            <Text style={styles.hint}>
              Tip: enter your own EOI points so you only get alerted when you'd realistically be invited.
            </Text>

            {(subclass === '190' || subclass === '491') && (
              <>
                <View style={{ opacity: isPremium ? 1 : 0.5 }}>
                  <Text style={styles.label}>
                    States (optional{!isPremium ? ' — Premium feature' : ' — leave empty for all'})
                  </Text>
                  <View style={styles.chipRow}>
                    {STATES.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => { if (isPremium) toggleState(s); else if (selectedStates.includes(s)) toggleState(s); else setPaywallVisible(true); }}
                        disabled={!isPremium && !selectedStates.includes(s)}
                        style={[
                          styles.chip,
                          selectedStates.includes(s) && styles.chipActive,
                          !isPremium && !selectedStates.includes(s) && { opacity: 0.5 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selectedStates.includes(s) && styles.chipTextActive,
                          ]}
                        >
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Action bar */}
          <View style={[styles.actionBar, { paddingBottom: insets.bottom + Spacing.md }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: Colors.surface }]}
              onPress={() => setAdding(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!selectedOcc || saving) && { opacity: 0.5 },
              ]}
              onPress={handleSave}
              disabled={!selectedOcc || saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.primaryDark} />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        userId={userId}
        title="Unlock unlimited watchlist"
        message="Pro lets you watch every occupation that matters to your migration journey and get instant alerts the moment your round drops."
        feature="watchlist"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.glass,
    borderRadius: Radius.md,
  },
  bannerText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    marginTop: Spacing.md,
  },
  emptyBody: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
  },
  cardMeta: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  cardStates: {
    color: Colors.accent,
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  addBtn: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
  },
  addBtnText: {
    color: Colors.primaryDark,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  // Add form
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: FontSize.md,
  },
  selectedOcc: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  resultsBox: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  resultCode: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
    width: 60,
  },
  resultName: { color: Colors.textPrimary, fontSize: FontSize.sm, flex: 1 },
  noResults: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    padding: Spacing.md,
    textAlign: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  chipText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  chipTextActive: { color: Colors.primaryDark, fontWeight: FontWeight.bold },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pointsSuffix: { color: Colors.textSecondary, fontSize: FontSize.md },
  hint: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: Spacing.sm, lineHeight: 16 },
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: FontWeight.semiBold, fontSize: FontSize.md },
  saveBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
  },
  saveBtnText: { color: Colors.primaryDark, fontWeight: FontWeight.bold, fontSize: FontSize.md },
});
