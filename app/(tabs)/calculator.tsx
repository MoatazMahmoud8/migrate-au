import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { calculatePoints } from '../../utils/pointsCalculator';
import { PointsInput, VisaSubclass, EnglishLevel } from '../../constants/types';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';

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
  label, value, onChange, min = 0, max = 20,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(min, value - 1))}
          style={styles.stepBtn}
        >
          <Ionicons name="remove" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.stepValue}>{value}</Text>
        <TouchableOpacity
          onPress={() => onChange(Math.min(max, value + 1))}
          style={styles.stepBtn}
        >
          <Ionicons name="add" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
        thumbColor={value ? Colors.primary : Colors.textMuted}
      />
    </View>
  );
}

export default function CalculatorScreen() {
  const [input, setInput] = useState<PointsInput>(defaultInput);
  const breakdown = calculatePoints(input);

  const set = (patch: Partial<PointsInput>) => setInput((p) => ({ ...p, ...patch }));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Score Banner */}
      <LinearGradient
        colors={breakdown.likelyEligible ? [Colors.success, '#006644'] : [Colors.primary, Colors.primaryDark]}
        style={styles.scoreBanner}
      >
        <Text style={styles.scoreLabel}>Your Points Score</Text>
        <Text style={styles.scoreNum}>{breakdown.total}</Text>
        <Text style={styles.scoreStatus}>
          {breakdown.likelyEligible ? '✓ Likely Eligible (65+ pts)' : `Need ${65 - breakdown.total} more points`}
        </Text>
      </LinearGradient>

      {/* Visa Type */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Visa Subclass</Text>
        <SegmentControl<VisaSubclass>
          options={['189', '190', '491']}
          labels={['189', '190', '491']}
          value={input.visaSubclass}
          onChange={(v) => set({ visaSubclass: v })}
        />
      </View>

      {/* Age */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Age</Text>
        <StepperRow label="Age (years)" value={input.age} onChange={(v) => set({ age: v })} min={18} max={60} />
        <Text style={styles.hint}>Score: {breakdown.age} pts  |  Best score: age 25–32 (30 pts)</Text>
      </View>

      {/* English */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>English Proficiency</Text>
        <SegmentControl<EnglishLevel>
          options={['competent', 'proficient', 'superior']}
          labels={['Competent\n0 pts', 'Proficient\n10 pts', 'Superior\n20 pts']}
          value={input.englishLevel}
          onChange={(v) => set({ englishLevel: v })}
        />
      </View>

      {/* Work Experience */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Work Experience</Text>
        <StepperRow
          label="Australian work (years)"
          value={input.australianWorkYears}
          onChange={(v) => set({ australianWorkYears: v })}
          max={10}
        />
        <StepperRow
          label="Overseas work (years)"
          value={input.overseasWorkYears}
          onChange={(v) => set({ overseasWorkYears: v })}
          max={10}
        />
        <Text style={styles.hint}>AU work: {breakdown.australianWork} pts  |  Overseas: {breakdown.overseasWork} pts</Text>
      </View>

      {/* Partner */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Partner Skills</Text>
        <SwitchRow
          label="Partner has skilled nomination"
          value={input.hasPartnerSkills}
          onChange={(v) => set({ hasPartnerSkills: v, hasPartnerSuperiorEnglish: v ? false : input.hasPartnerSuperiorEnglish })}
        />
        <SwitchRow
          label="Partner has superior English"
          value={input.hasPartnerSuperiorEnglish}
          onChange={(v) => set({ hasPartnerSuperiorEnglish: v, hasPartnerSkills: v ? false : input.hasPartnerSkills })}
        />
      </View>

      {/* Bonus Points */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bonus Points</Text>
        {input.visaSubclass !== '189' && (
          <SwitchRow
            label="State/Territory Nomination"
            value={input.hasStateNomination}
            onChange={(v) => set({ hasStateNomination: v })}
          />
        )}
        <SwitchRow
          label="Professional Year (IT/Accounting/Engineering)"
          value={input.hasProfessionalYear}
          onChange={(v) => set({ hasProfessionalYear: v })}
        />
        <SwitchRow
          label="NAATI Accreditation"
          value={input.hasNaati}
          onChange={(v) => set({ hasNaati: v })}
        />
        <SwitchRow
          label="Community Language"
          value={input.hasCommunityLanguage}
          onChange={(v) => set({ hasCommunityLanguage: v })}
        />
        <SwitchRow
          label="Australian Study (2+ years regional)"
          value={input.hasAustralianStudy}
          onChange={(v) => set({ hasAustralianStudy: v })}
        />
      </View>

      {/* Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Points Breakdown</Text>
        {[
          { label: 'Age', pts: breakdown.age },
          { label: 'English', pts: breakdown.english },
          { label: 'AU Work', pts: breakdown.australianWork },
          { label: 'Overseas Work', pts: breakdown.overseasWork },
          { label: 'Partner', pts: breakdown.partner },
          { label: 'State Nomination', pts: breakdown.stateNomination },
          { label: 'Professional Year', pts: breakdown.professionalYear },
          { label: 'NAATI', pts: breakdown.naati },
          { label: 'Community Language', pts: breakdown.communityLanguage },
          { label: 'Australian Study', pts: breakdown.australianStudy },
        ].map(({ label, pts }) => (
          <View key={label} style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{label}</Text>
            <Text style={[styles.breakdownPts, pts > 0 && styles.breakdownPtsActive]}>{pts}</Text>
          </View>
        ))}
        <View style={styles.breakdownTotal}>
          <Text style={styles.breakdownTotalLabel}>Total</Text>
          <Text style={styles.breakdownTotalNum}>{breakdown.total}</Text>
        </View>
      </View>

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const seg = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: 3,
    marginTop: Spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  active: { backgroundColor: Colors.primary },
  text: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium, textAlign: 'center' },
  activeText: { color: Colors.white, fontWeight: FontWeight.semiBold },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scoreBanner: {
    padding: Spacing.xl,
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  scoreLabel: { color: Colors.white + 'CC', fontSize: FontSize.md },
  scoreNum: { color: Colors.white, fontSize: 72, fontWeight: FontWeight.extraBold, lineHeight: 80 },
  scoreStatus: { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.semiBold, marginTop: Spacing.xs },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    margin: Spacing.lg,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rowLabel: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary, minWidth: 28, textAlign: 'center' },
  hint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.sm },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  breakdownLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  breakdownPts: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium },
  breakdownPtsActive: { color: Colors.success, fontWeight: FontWeight.bold },
  breakdownTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    marginTop: Spacing.xs,
  },
  breakdownTotalLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  breakdownTotalNum: { fontSize: FontSize.xl, fontWeight: FontWeight.extraBold, color: Colors.primary },
});
