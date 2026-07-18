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
import { useColors, useTheme } from '../../constants/ThemeContext';
import { recordEngagement } from '../../utils/rateApp';

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
  const Colors = useColors();
  return (
    <View style={[seg.container, { backgroundColor: Colors.surfaceRaised }]}>
      {options.map((opt, i) => (
        <TouchableOpacity
          key={opt}
          style={[seg.btn, value === opt && { backgroundColor: `${Colors.secondary}18` }]}
          onPress={() => onChange(opt)}
        >
          <Text style={[seg.text, { color: Colors.textSecondary }, value === opt && { color: Colors.secondary, fontWeight: FontWeight.semiBold }]}>
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
  const Colors = useColors();
  return (
    <View style={[styles.row, { borderTopColor: Colors.divider }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, {color: Colors.textPrimary}]}>{label}</Text>
        {hint ? <Text style={[styles.rowHint, {color: Colors.textSecondary}]}>{hint}</Text> : null}
      </View>
      <View style={styles.stepper}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(min, value - 1))}
          style={[styles.stepBtn, { borderColor: Colors.border }, value <= min && styles.stepBtnDisabled]}
        >
          <Ionicons name="remove" size={16} color={value <= min ? Colors.textMuted : Colors.secondary} />
        </TouchableOpacity>
        <Text style={[styles.stepValue, {color: Colors.textPrimary}]}>{value}</Text>
        <TouchableOpacity
          onPress={() => onChange(Math.min(max, value + 1))}
          style={[styles.stepBtn, { borderColor: Colors.border }, value >= max && styles.stepBtnDisabled]}
        >
          <Ionicons name="add" size={16} color={value >= max ? Colors.textMuted : Colors.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SwitchRow({ label, value, onChange, pts }: { label: string; value: boolean; onChange: (v: boolean) => void; pts?: number }) {
  const Colors = useColors();
  return (
    <View style={[styles.row, { borderTopColor: Colors.divider }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, {color: Colors.textPrimary}]}>{label}</Text>
        {pts !== undefined && <Text style={[styles.rowHint, {color: Colors.textSecondary}]}>+{pts} points when enabled</Text>}
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
  const Colors = useColors();
  const { isDark } = useTheme();
  const pct = Math.min(score / 100, 1);
  const color = eligible ? Colors.success : score >= 50 ? Colors.warning : Colors.error;

  return (
    <View style={ring.container}>
      <LinearGradient
        colors={isDark ? (eligible ? ['#003D2A', '#001224'] : ['#2A0B14', '#001224']) : [Colors.surface, Colors.surface]}
        style={[ring.bg, { borderColor: Colors.border }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Glow orb */}
        <View style={[ring.glow, { backgroundColor: color + '20' }]} />

        <View style={ring.inner}>
          <Text style={[ring.label, {color: Colors.textPrimary}]}>Your Score</Text>
          <Text style={[ring.score, { color }]}>{score}</Text>
          <Text style={[ring.pts, {color: Colors.textPrimary}]}>points</Text>
          <View style={[ring.badge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
            <Text style={[ring.badgeText, { color }]}>
              {eligible ? '✓ Eligible' : `Need ${65 - score} more`}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[ring.barTrack, { backgroundColor: Colors.divider }]}>
          <View style={[ring.barFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
        </View>
        <View style={ring.barLabels}>
          <Text style={[ring.barLabel, {color: Colors.textPrimary}]}>0</Text>
          <Text style={[ring.barLabel, { color }]}>65 min</Text>
          <Text style={[ring.barLabel, {color: Colors.textPrimary}]}>100+</Text>
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
    recordEngagement('calculator_result');

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
          <Text style={[styles.cardTitle, {color: Colors.textPrimary}]}>Visa Subclass</Text>
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
          <Text style={[styles.cardTitle, {color: Colors.textPrimary}]}>Age</Text>
          <View style={styles.cardBadge}>
            <Text style={[styles.cardBadgeText, {color: Colors.textPrimary}]}>{breakdown.age} pts</Text>
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
          <Text style={[styles.cardTitle, {color: Colors.textPrimary}]}>English Proficiency</Text>
          <View style={styles.cardBadge}>
            <Text style={[styles.cardBadgeText, {color: Colors.textPrimary}]}>{breakdown.english} pts</Text>
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
          <Text style={[styles.cardTitle, {color: Colors.textPrimary}]}>Work Experience</Text>
          <View style={styles.cardBadge}>
            <Text style={[styles.cardBadgeText, {color: Colors.textPrimary}]}>{breakdown.australianWork + breakdown.overseasWork} pts</Text>
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
          <Text style={[styles.cardTitle, {color: Colors.textPrimary}]}>Partner Skills</Text>
          <View style={styles.cardBadge}>
            <Text style={[styles.cardBadgeText, {color: Colors.textPrimary}]}>{breakdown.partner} pts</Text>
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
          <Text style={[styles.cardTitle, {color: Colors.textPrimary}]}>Bonus Points</Text>
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
          <Text style={[styles.cardTitle, {color: Colors.textPrimary}]}>Full Breakdown</Text>
        </View>
        {BREAKDOWN_ITEMS.map(({ label, pts, icon }) => (
          <View key={label} style={[styles.breakdownRow, { borderTopColor: Colors.divider }]}>
            <View style={styles.breakdownLeft}>
              <Ionicons name={icon as any} size={16} color={pts > 0 ? Colors.secondary : Colors.textMuted} />
              <Text style={[styles.breakdownLabel, { color: pts > 0 ? Colors.textPrimary : Colors.textSecondary }]}>{label}</Text>
            </View>
            <View style={[styles.breakdownPill, { backgroundColor: Colors.surfaceRaised }, pts > 0 && { backgroundColor: `${Colors.secondary}18` }]}>
              <Text style={[styles.breakdownPts, { color: pts > 0 ? Colors.secondary : Colors.textSecondary }]}>{pts}</Text>
            </View>
          </View>
        ))}
        <View style={[styles.breakdownTotal, { borderTopColor: Colors.border }]}>
          <Text style={[styles.breakdownTotalLabel, {color: Colors.textPrimary}]}>Total Score</Text>
          <Text style={[styles.breakdownTotalNum, { color: breakdown.likelyEligible ? Colors.success : Colors.textPrimary }]}>
            {breakdown.total} pts
          </Text>
        </View>
      </View>

      {/* Gap Filler — Points Improvement Tips */}
      {((): React.ReactElement | null => {
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
            pts: breakdown.english < 20 ? 20 - breakdown.english : 0,
            available: breakdown.english < 20,
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
            available: breakdown.partner < 10,
          },
        ].filter((t) => t.available && t.pts > 0);

        if (tips.length === 0) return null;

        return (
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="trending-up" size={18} color={Colors.warning} />
              <Text style={[styles.cardTitle, {color: Colors.textPrimary}]}>🏆 Gap Filler — Reach {nextBracket}+ Points</Text>
            </View>
            <Text style={[styles.rowHint, { marginBottom: 12, color: Colors.textSecondary }]}>
              You need {gap} more point{gap === 1 ? '' : 's'} for the next bracket. Here's how:
            </Text>
            {tips.slice(0, 5).map((tip) => (
              <View key={tip.label} style={[styles.gapRow, { borderBottomColor: Colors.divider }]}>
                <View style={styles.gapLeft}>
                  <Ionicons name="add-circle-outline" size={16} color={Colors.success} />
                  <Text style={[styles.gapLabel, {color: Colors.textPrimary}]}>{tip.label}</Text>
                </View>
                <View style={[styles.gapPill, { borderColor: Colors.success + '45', backgroundColor: Colors.successLight }]}>
                  <Text style={[styles.gapPts, {color: Colors.success}]}>+{tip.pts} pts</Text>
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
  label: { fontSize: FontSize.sm, letterSpacing: 1, textTransform: 'uppercase' },
  score: { fontSize: 80, fontWeight: FontWeight.extraBold, lineHeight: 88, letterSpacing: -2 },
  pts: { fontSize: FontSize.md, marginTop: -4, marginBottom: Spacing.md },
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
  barLabel: { fontSize: FontSize.xs },
});

const seg = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 3,
    marginTop: Spacing.sm,
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  text: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, textAlign: 'center', lineHeight: 16 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },

  card: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    margin: Spacing.lg,
    marginBottom: 0,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  cardBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  cardBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  rowLabel: { fontSize: FontSize.md },
  rowHint: { fontSize: FontSize.xs, marginTop: 2 },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, minWidth: 28, textAlign: 'center' },

  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
    borderTopWidth: 1,
  },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  breakdownLabel: { fontSize: FontSize.sm },
  breakdownLabelActive: { },
  breakdownPill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    minWidth: 32,
    alignItems: 'center',
  },
  breakdownPillActive: { },
  breakdownPts: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  breakdownPtsActive: { },
  breakdownTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 2,
  },
  breakdownTotalLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  breakdownTotalNum: { fontSize: FontSize.xl, fontWeight: FontWeight.extraBold },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  gapLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  gapLabel: { fontSize: FontSize.sm, flex: 1 },
  gapPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
  },
  gapPts: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});

