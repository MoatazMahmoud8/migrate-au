/**
 * Journey — guided 5-step migration flow accessed from Today.
 *
 * Pattern references:
 *  - Duolingo skill tree: current step glows, past steps are checked, future
 *    steps are locked-styled but tappable so users can peek ahead.
 *  - Notion "getting started" checklist: each step shows a one-line goal and
 *    an outcome preview when complete.
 *  - Apple "Fitness Rings": progress ring under the header shows overall %.
 *
 * Data:
 *  - Profile drives completeness (occupation set, subscribedStates ≥ 1, etc.).
 *  - Each step routes into the existing screen — no logic duplication.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '../constants/ThemeContext';
import { Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { getProfile, saveProfile } from '../utils/storage';
import { UserProfile } from '../constants/types';

type StepKey = 'points' | 'occupation' | 'english' | 'state' | 'documents';

interface Step {
  key: StepKey;
  title: string;
  goal: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const STEPS: Step[] = [
  { key: 'points',      title: 'Points check',      goal: 'Confirm you meet the 65-point threshold.',                icon: 'calculator-outline', route: '/(tabs)/calculator' },
  { key: 'occupation',  title: 'Choose occupation', goal: 'Pick an ANZSCO occupation on the current lists.',         icon: 'briefcase-outline', route: '/occupations' },
  { key: 'english',     title: 'English test',      goal: 'Book / record IELTS, PTE, or an equivalent test score.',  icon: 'language-outline', route: '/(tabs)/english-tests' },
  { key: 'state',       title: 'State program',     goal: 'Follow at least one state or territory nomination program.', icon: 'flag-outline', route: '/(tabs)/states' },
  { key: 'documents',   title: 'Documents ready',   goal: 'Have skills assessment result + identity docs on file.',  icon: 'documents-outline', route: '/(tabs)/skill-assessment' },
];

function computeStatus(profile: UserProfile | null): Record<StepKey, boolean> {
  if (!profile) return { points: false, occupation: false, english: false, state: false, documents: false };
  const manual = profile.journeyManualComplete || {};
  return {
    // Points is done if the calc storage has been touched (Home reads it too).
    points: !!manual.points || !!profile.anzscoCode || !!profile.subscribedOccupation,
    occupation: !!manual.occupation || !!(profile.anzscoCode && profile.anzscoCode.length >= 4),
    // English + Documents are user-driven: the user marks them done from Journey.
    english: !!manual.english,
    state:
      !!manual.state ||
      (Array.isArray(profile.subscribedStates) && profile.subscribedStates.length > 0) ||
      (Array.isArray(profile.pinnedStates) && profile.pinnedStates.length > 0),
    documents:
      !!manual.documents ||
      (Array.isArray(profile.journeyEntries) && profile.journeyEntries.some((e) => e.currentStage >= 1)),
  };
}

export default function JourneyScreen() {
  const Colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const load = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
    } catch {}
  }, []);

  const toggleStepDone = useCallback(async (key: StepKey) => {
    if (!profile) return;
    const nextManual: Record<string, boolean> = {
      ...(profile.journeyManualComplete || {}),
      [key]: !((profile.journeyManualComplete || {})[key]),
    };
    setProfile({ ...profile, journeyManualComplete: nextManual });
    try { await saveProfile({ journeyManualComplete: nextManual }); } catch {}
  }, [profile]);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setTimeout(() => setRefreshing(false), 400);
  }, [load]);

  const status = useMemo(() => computeStatus(profile), [profile]);
  const completed = Object.values(status).filter(Boolean).length;
  const pct = Math.round((completed / STEPS.length) * 100);

  const nextStepKey = STEPS.find((s) => !status[s.key])?.key ?? STEPS[STEPS.length - 1].key;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Journey</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.textSecondary} />}
      >
        {/* Progress hero */}
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>PR readiness</Text>
            <Text style={styles.heroNumber}>{pct}%</Text>
            <Text style={styles.heroSub}>{completed} of {STEPS.length} steps complete</Text>
          </View>
          <View style={styles.heroRingWrap}>
            <View style={[styles.heroRingTrack, { borderColor: 'rgba(255,255,255,0.15)' }]} />
            <View
              style={[
                styles.heroRingTrack,
                {
                  borderColor: 'transparent',
                  borderTopColor: Colors.secondary,
                  borderRightColor: pct >= 25 ? Colors.secondary : 'transparent',
                  borderBottomColor: pct >= 50 ? Colors.secondary : 'transparent',
                  borderLeftColor: pct >= 75 ? Colors.secondary : 'transparent',
                  transform: [{ rotate: '-45deg' }],
                },
              ]}
            />
            <Text style={styles.heroRingText}>{completed}/{STEPS.length}</Text>
          </View>
        </LinearGradient>

        {/* Steps */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your steps</Text>
          {STEPS.map((step, index) => {
            const done = status[step.key];
            const isNext = step.key === nextStepKey && !done;
            return (
              <TouchableOpacity
                key={step.key}
                style={[
                  styles.stepCard,
                  isNext && { borderColor: Colors.accent },
                  done && { opacity: 0.9 },
                ]}
                onPress={() => router.push(step.route as any)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${step.title}: ${done ? 'done' : (isNext ? 'next' : 'not started')}`}
              >
                <View style={[
                  styles.stepBadge,
                  done && { backgroundColor: Colors.successLight, borderColor: Colors.success },
                  isNext && { backgroundColor: Colors.infoLight, borderColor: Colors.accent },
                ]}>
                  {done ? (
                    <Ionicons name="checkmark" size={18} color={Colors.success} />
                  ) : (
                    <Text style={styles.stepBadgeText}>{index + 1}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.stepTitleRow}>
                    <Ionicons name={step.icon} size={18} color={done ? Colors.success : (isNext ? Colors.accent : Colors.textSecondary)} />
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    {isNext && (
                      <View style={styles.nextPill}>
                        <Text style={styles.nextPillText}>NEXT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.stepGoal}>{step.goal}</Text>
                </View>
                <TouchableOpacity
                  onPress={(ev) => { ev.stopPropagation?.(); void toggleStepDone(step.key); }}
                  accessibilityRole="button"
                  accessibilityLabel={done ? `Mark ${step.title} as not done` : `Mark ${step.title} as done`}
                  style={[
                    styles.markPill,
                    done && { backgroundColor: Colors.success + '22', borderColor: Colors.success },
                  ]}
                >
                  <Ionicons
                    name={done ? 'checkmark' : 'ellipse-outline'}
                    size={14}
                    color={done ? Colors.success : Colors.textSecondary}
                  />
                  <Text style={[styles.markPillText, { color: done ? Colors.success : Colors.textSecondary }]}>
                    {done ? 'Done' : 'Mark done'}
                  </Text>
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Foot note */}
        <View style={styles.section}>
          <Text style={styles.foot}>Progress reflects the data saved on this device. Nothing here is legal advice — for formal guidance consult a MARA-registered migration agent.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    },
    back: { padding: 4 },
    headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
    hero: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: Spacing.md, marginTop: Spacing.sm,
      borderRadius: Radius.lg, padding: Spacing.lg,
    },
    heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
    heroNumber: { color: '#FFFFFF', fontSize: FontSize.display, fontWeight: FontWeight.bold, marginTop: 4 },
    heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm, marginTop: 2 },
    heroRingWrap: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
    heroRingTrack: { position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 8 },
    heroRingText: { color: '#FFFFFF', fontSize: FontSize.md, fontWeight: FontWeight.semiBold },
    section: { paddingHorizontal: Spacing.md, marginTop: Spacing.xl },
    sectionLabel: {
      color: Colors.textMuted, fontSize: FontSize.xs, letterSpacing: 1,
      textTransform: 'uppercase', marginBottom: Spacing.sm, fontWeight: FontWeight.semiBold,
    },
    stepCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: Colors.surface,
      borderColor: Colors.border, borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      gap: Spacing.md,
    },
    stepBadge: {
      width: 36, height: 36, borderRadius: 18,
      borderWidth: 1, borderColor: Colors.border,
      backgroundColor: Colors.background,
      alignItems: 'center', justifyContent: 'center',
    },
    stepBadgeText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
    stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semiBold },
    stepGoal: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 4 },
    nextPill: {
      backgroundColor: Colors.infoLight, borderColor: Colors.accent, borderWidth: 1,
      borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2,
    },
    nextPillText: { color: Colors.accent, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
    markPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: Radius.full,
      borderWidth: 1, borderColor: Colors.border,
      backgroundColor: Colors.background,
    },
    markPillText: { fontSize: 11, fontWeight: FontWeight.semiBold, letterSpacing: 0.3 },
    foot: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', lineHeight: 16 },
  });
}
