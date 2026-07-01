import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculatePoints } from '../../utils/pointsCalculator';
import { hasExceededLimit, getRemainingUses, incrementUsage } from '../../utils/paywall';
import { getProfile, saveProfile } from '../../utils/storage';
import { PaywallModal } from '../../components/PaywallModal';
import { UsageMeter } from '../../components/UsageMeter';
import { PointsInput, VisaSubclass, EnglishLevel } from '../../constants/types';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useColors } from '../../constants/ThemeContext';

const CALC_STORAGE_KEY = 'calc_input_v1';

const defaultInput: PointsInput = {
  age: 28,
  englishLevel: 'proficient',
  australianWorkYears: 0,
  overseasWorkYears: 3,
  visaSubclass: '189',
  hasPartnerSkills: false,
  hasPartnerSuperiorEnglish: false,
  hasProfessionalYear: false,
  hasNaati: false,
  hasStateNomination: false,
  hasCommunityLanguage: false,
  hasAustralianStudy: false,
};



function SegmentControl<T extends string>({
  options, value, onChange, labels,
}: { options: T[]; value: T; onChange: (v: T) => void; labels?: string[] }) {
  return (
    <View style={seg.container}>
      {options.map((opt, i) => (
        <TouchableOpacity
          key={opt}
          style={[seg.btn, value === opt && seg.active]}
          onPress={() => onChange(opt)}
        >
          <Text style={[seg.text, value === opt && seg.activeText]}>
            {labels ? labels[i] : opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function StepperRow({
  label, value, onChange, min = 0, max = 20, hint,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; hint?: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <View style={styles.stepper}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(min, value - 1))}
          style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
        >
          <Ionicons name="remove" size={16} color={value <= min ? Colors.textMuted : Colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.stepValue}>{value}</Text>
        <TouchableOpacity
          onPress={() => onChange(Math.min(max, value + 1))}
          style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
        >
          <Ionicons name="add" size={16} color={value >= max ? Colors.textMuted : Colors.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SwitchRow({ label, value, onChange, pts }: { label: string; value: boolean; onChange: (v: boolean) => void; pts?: number }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {pts !== undefined && <Text style={styles.rowHint}>+{pts} points when enabled</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.secondary + '50' }}
        thumbColor={value ? Colors.secondary : Colors.textMuted}
      />
    </View>
  );
}

function ScoreRing({ score, eligible }: { score: number; eligible: boolean }) {
  const pct = Math.min(score / 100, 1);
  const color = eligible ? Colors.success : score >= 50 ? Colors.warning : Colors.accent;

  return (
    <View style={ring.container}>
      <LinearGradient
        colors={eligible ? ['#003D2A', '#001224'] : ['#001A3D', '#001224']}
        style={ring.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Glow orb */}
        <View style={[ring.glow, { backgroundColor: color + '20' }]} />

        <View style={ring.inner}>
          <Text style={ring.label}>Your Score</Text>
          <Text style={[ring.score, { color }]}>{score}</Text>
          <Text style={ring.pts}>points</Text>
          <View style={[ring.badge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
            <Text style={[ring.badgeText, { color }]}>
              {eligible ? '✓ Eligible' : `Need ${65 - score} more`}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={ring.barTrack}>
          <View style={[ring.barFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
        </View>
        <View style={ring.barLabels}>
          <Text style={ring.barLabel}>0</Text>
          <Text style={[ring.barLabel, { color }]}>65 min</Text>
          <Text style={ring.barLabel}>100+</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Calculator screen ───────────────────────────────────────────────────────

export default function CalculatorScreen() {
  const Colors = useColors();
  const [input, setInput] = useState<PointsInput>(defaultInput);
  const [showPaywall, setShowPaywall] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const breakdown = calculatePoints(input);

  // Load profile and usage on mount
  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setProfile(p);
      const rem = getRemainingUses('calculator', p);
      setRemaining(rem);
    })();

    AsyncStorage.getItem(CALC_STORAGE_KEY).then((json) => {
      if (json) {
        try { setInput((p) => ({ ...p, ...JSON.parse(json) })); } catch {}
      }
    });
  }, []);

  // Persist input whenever it changes
  useEffect(() => {
    AsyncStorage.setItem(CALC_STORAGE_KEY, JSON.stringify(input));
  }, [input]);

  const set = (patch: Partial<PointsInput>) => setInput((p) => ({ ...p, ...patch }));

  const handleShowResults = async () => {
    if (!profile) return;

    // Check if user has exceeded limit
    if (hasExceededLimit('calculator', profile)) {
      setShowPaywall(true);
      return;
    }

    // Increment usage for free users
    const updated = incrementUsage('calculator', profile);
    setProfile(updated);
    await saveProfile(updated);
    const rem = getRemainingUses('calculator', updated);
    setRemaining(rem);

    // Scroll to breakdown (you could use a ref here if needed)
    Alert.alert('Score calculated', `Your visa points: ${breakdown.total}`);
  };

  const BREAKDOWN_ITEMS = [
    { label: 'Age', pts: breakdown.age, icon: 'person-outline' },
    { label: 'English', pts: breakdown.english, icon: 'chatbubble-ellipses-outline' },
    { label: 'AU Work', pts: breakdown.australianWork, icon: 'briefcase-outline' },
    { label: 'Overseas Work', pts: breakdown.overseasWork, icon: 'globe-outline' },
    { label: 'Partner', pts: breakdown.partner, icon: 'heart-outline' },
    { label: 'State Nomination', pts: breakdown.stateNomination, icon: 'location-outline' },
    { label: 'Professional Year', pts: breakdown.professionalYear, icon: 'school-outline' },
    { label: 'NAATI', pts: breakdown.naati, icon: 'language-outline' },
    { label: 'Community Lang.', pts: breakdown.communityLanguage, icon: 'people-outline' },
    { label: 'AU Study', pts: breakdown.australianStudy, icon: 'library-outline' },
  ];

  return (
    <>
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100, paddingTop: Platform.OS === 'ios' ? 110 : 96 }}
    >
      {/* Remaining Uses Badge */}
      {profile && remaining !== null && !profile.isPremium && (
        <UsageMeter
          feature="calculator"
          remaining={remaining}
          onUpgradePress={() => setShowPaywall(true)}
          isPremium={profile.isPremium}
        />
      )}

      <ScoreRing score={breakdown.total} eligible={breakdown.likelyEligible} />

      {/* Visa Type */}
      <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="card-outline" size={18} color={Colors.secondary} />
          <Text style={styles.cardTitle}>Visa Subclass</Text>
        </View>
        <SegmentControl<VisaSubclass>
          options={['189', '190', '491']}
          labels={['189 — Independent', '190 — Nominated', '491 — Regional']}
          value={input.visaSubclass}
          onChange={(v) => set({ visaSubclass: v })}
        />
      </View>

      {/* Age */}
      <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={18} color={Colors.secondary} />
          <Text style={styles.cardTitle}>Age</Text>
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{breakdown.age} pts</Text>
          </View>
        </View>
        <StepperRow
          label="Your age"
          value={input.age}
          onChange={(v) => set({ age: v })}
          min={18}
          max={60}
          hint="Best score: 25–32 (30 pts)"
        />
      </View>

      {/* English */}
      <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.secondary} />
          <Text style={styles.cardTitle}>English Proficiency</Text>
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{breakdown.english} pts</Text>
          </View>
        </View>
        <SegmentControl<EnglishLevel>
          options={['competent', 'proficient', 'superior']}
          labels={['Competent\n0 pts', 'Proficient\n10 pts', 'Superior\n20 pts']}
          value={input.englishLevel}
          onChange={(v) => set({ englishLevel: v })}
        />
      </View>

      {/* Work Experience */}
      <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="briefcase-outline" size={18} color={Colors.secondary} />
          <Text style={styles.cardTitle}>Work Experience</Text>
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{breakdown.australianWork + breakdown.overseasWork} pts</Text>
          </View>
        </View>
        <StepperRow
          label="Australian work"
          value={input.australianWorkYears}
          onChange={(v) => set({ australianWorkYears: v })}
          max={10}
          hint={`${breakdown.australianWork} pts`}
        />
        <StepperRow
          label="Overseas work"
          value={input.overseasWorkYears}
          onChange={(v) => set({ overseasWorkYears: v })}
          max={10}
          hint={`${breakdown.overseasWork} pts`}
        />
      </View>

      {/* Partner */}
      <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="heart-outline" size={18} color={Colors.secondary} />
          <Text style={styles.cardTitle}>Partner Skills</Text>
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{breakdown.partner} pts</Text>
          </View>
        </View>
        <SwitchRow
          label="Partner has skilled nomination"
          value={input.hasPartnerSkills}
          onChange={(v) => set({ hasPartnerSkills: v, hasPartnerSuperiorEnglish: v ? false : input.hasPartnerSuperiorEnglish })}
          pts={5}
        />
        <SwitchRow
          label="Partner has superior English"
          value={input.hasPartnerSuperiorEnglish}
          onChange={(v) => set({ hasPartnerSuperiorEnglish: v, hasPartnerSkills: v ? false : input.hasPartnerSkills })}
          pts={10}
        />
      </View>

      {/* Bonus Points */}
      <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="star-outline" size={18} color={Colors.secondary} />
          <Text style={styles.cardTitle}>Bonus Points</Text>
        </View>
        {input.visaSubclass !== '189' && (
          <SwitchRow
            label="State/Territory Nomination"
            value={input.hasStateNomination}
            onChange={(v) => set({ hasStateNomination: v })}
            pts={input.visaSubclass === '491' ? 15 : 5}
          />
        )}
        <SwitchRow
          label="Professional Year"
          value={input.hasProfessionalYear}
          onChange={(v) => set({ hasProfessionalYear: v })}
          pts={5}
        />
        <SwitchRow
          label="NAATI Accreditation"
          value={input.hasNaati}
          onChange={(v) => set({ hasNaati: v })}
          pts={5}
        />
        <SwitchRow
          label="Community Language"
          value={input.hasCommunityLanguage}
          onChange={(v) => set({ hasCommunityLanguage: v })}
          pts={5}
        />
        <SwitchRow
          label="Australian Study (2+ yrs regional)"
          value={input.hasAustralianStudy}
          onChange={(v) => set({ hasAustralianStudy: v })}
          pts={5}
        />
      </View>

      {/* Breakdown */}
      <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="bar-chart-outline" size={18} color={Colors.secondary} />
          <Text style={styles.cardTitle}>Full Breakdown</Text>
        </View>
        {BREAKDOWN_ITEMS.map(({ label, pts, icon }) => (
          <View key={label} style={styles.breakdownRow}>
            <View style={styles.breakdownLeft}>
              <Ionicons name={icon as any} size={16} color={pts > 0 ? Colors.secondary : Colors.textMuted} />
              <Text style={[styles.breakdownLabel, pts > 0 && styles.breakdownLabelActive]}>{label}</Text>
            </View>
            <View style={[styles.breakdownPill, pts > 0 && styles.breakdownPillActive]}>
              <Text style={[styles.breakdownPts, pts > 0 && styles.breakdownPtsActive]}>{pts}</Text>
            </View>
          </View>
        ))}
        <View style={styles.breakdownTotal}>
          <Text style={styles.breakdownTotalLabel}>Total Score</Text>
          <Text style={[styles.breakdownTotalNum, breakdown.likelyEligible && { color: Colors.success }]}>
            {breakdown.total} pts
          </Text>
        </View>
      </View>

      {/* Gap Filler — Points Improvement Tips */}
      {((): JSX.Element | null => {
        const score = breakdown.total;
        const TARGET_BRACKETS = [65, 70, 75, 80, 85, 90, 95];
        const nextBracket = TARGET_BRACKETS.find((b) => b > score) ?? 100;
        const gap = nextBracket - score;

        const tips: Array<{ label: string; pts: number; available: boolean }> = [
          {
            label: 'NAATI CCL Credential',
            pts: 5,
            available: !input.hasNaati,
          },
          {
            label: 'Professional Year Program',
            pts: 5,
            available: !input.hasProfessionalYear,
          },
          {
            label: 'Superior English (IELTS 8+/PTE 79+)',
            pts: input.english < 20 ? 20 - input.english : 0,
            available: input.english < 20,
          },
          {
            label: 'State Nomination 190 (+5)',
            pts: 5,
            available: input.visaSubclass === '189' || (!input.hasStateNomination && input.visaSubclass === '190'),
          },
          {
            label: 'State Nomination 491 (+15)',
            pts: 15,
            available: input.visaSubclass === '189' && !input.hasStateNomination,
          },
          {
            label: 'Regional Study Bonus',
            pts: 5,
            available: !input.hasAustralianStudy,
          },
          {
            label: 'Partner Skills Assessment',
            pts: 5,
            available: input.partner < 10,
          },
        ].filter((t) => t.available && t.pts > 0);

        if (tips.length === 0) return null;

        return (
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="trending-up" size={18} color={Colors.warning} />
              <Text style={styles.cardTitle}>🏆 Gap Filler — Reach {nextBracket}+ Points</Text>
            </View>
            <Text style={[styles.rowHint, { marginBottom: 12 }]}>
              You need {gap} more point{gap === 1 ? '' : 's'} for the next bracket. Here's how:
            </Text>
            {tips.slice(0, 5).map((tip) => (
              <View key={tip.label} style={styles.gapRow}>
                <View style={styles.gapLeft}>
                  <Ionicons name="add-circle-outline" size={16} color={Colors.success} />
                  <Text style={styles.gapLabel}>{tip.label}</Text>
                </View>
                <View style={styles.gapPill}>
                  <Text style={styles.gapPts}>+{tip.pts} pts</Text>
                </View>
              </View>
            ))}
            <Text style={[styles.rowHint, { marginTop: 10, textAlign: 'center', fontSize: 11 }]}>
              Ask Aria for a personalised Gap Audit 🇦🇺
            </Text>
          </View>
        );
      })()}

    </ScrollView>

    <PaywallModal
      visible={showPaywall}
      onClose={() => setShowPaywall(false)}
      userId={profile?.userId || 'local_user'}
      title="Unlock Unlimited Calculations"
        message="You've used your 3 free calculations for this month. Upgrade to Pro for unlimited access and start planning your visa strategy without limits."
      feature="calculator"
    />
    </>
  );
}

const ring = StyleSheet.create({
  container: { marginHorizontal: Spacing.lg, marginTop: Spacing.md },
  bg: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -60,
    right: -40,
  },
  inner: { alignItems: 'center', paddingVertical: Spacing.md },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, letterSpacing: 1, textTransform: 'uppercase' },
  score: { fontSize: 80, fontWeight: FontWeight.extraBold, lineHeight: 88, letterSpacing: -2 },
  pts: { color: Colors.textMuted, fontSize: FontSize.md, marginTop: -4, marginBottom: Spacing.md },
  badge: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  badgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  barTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginTop: Spacing.xl,
    overflow: 'hidden',
  },
  barFill: { height: 4, borderRadius: 2 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  barLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
});

const seg = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: 3,
    marginTop: Spacing.sm,
    gap: 2,
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  active: { backgroundColor: Colors.primary },
  text: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium, textAlign: 'center', lineHeight: 16 },
  activeText: { color: Colors.secondary, fontWeight: FontWeight.semiBold },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    margin: Spacing.lg,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  cardBadge: {
    backgroundColor: Colors.secondary + '20',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  cardBadgeText: { fontSize: FontSize.xs, color: Colors.secondary, fontWeight: FontWeight.bold },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  rowLabel: { fontSize: FontSize.md, color: Colors.textPrimary },
  rowHint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, minWidth: 28, textAlign: 'center' },

  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  breakdownLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  breakdownLabelActive: { color: Colors.textPrimary },
  breakdownPill: {
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    minWidth: 32,
    alignItems: 'center',
  },
  breakdownPillActive: { backgroundColor: Colors.secondary + '20' },
  breakdownPts: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textMuted },
  breakdownPtsActive: { color: Colors.secondary },
  breakdownTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
  },
  breakdownTotalLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  breakdownTotalNum: { fontSize: FontSize.xl, fontWeight: FontWeight.extraBold, color: Colors.secondary },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  gapLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  gapLabel: { fontSize: FontSize.sm, color: Colors.textPrimary, flex: 1 },
  gapPill: {
    backgroundColor: Colors.success + '20',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  gapPts: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.success },
});

