import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VISA_JOURNEYS, ENGLISH_TESTS, getVisaJourney } from '../constants/visaJourney';
import { getAssessingAuthority } from '../constants/assessingAuthorities';
import { tap as hapticTap } from '../utils/haptics';
import { useColors } from '../constants/ThemeContext';
import { Spacing, Radius, FontSize, FontWeight } from '../constants/theme';

export default function VisaJourneyScreen() {
  const Colors = useColors();
  const { visa, anzsco, authority } = useLocalSearchParams<{ visa?: string; anzsco?: string; authority?: string }>();
  const [expandedStep, setExpandedStep] = useState<string | null>('english');
  const [selectedVisa, setSelectedVisa] = useState(visa || '189');

  const journey = getVisaJourney(selectedVisa);

  // Determine the user's assessing authority (from param or derived from ANZSCO)
  const userAuthority = useMemo(() => {
    if (authority) return authority;
    if (anzsco) {
      const derived = getAssessingAuthority(anzsco);
      return derived;
    }
    return undefined;
  }, [authority, anzsco]);

  const visaOptions = VISA_JOURNEYS.map(v => ({
    code: v.visaCode,
    name: `${v.visaCode} - ${v.visaName}`,
  }));

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Visa Journey',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.textPrimary,
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: Colors.background }]}>
        {/* Visa Selector */}
        <View style={[styles.selectorContainer, { borderBottomColor: Colors.border }]}>
          <Text style={[styles.selectorLabel, { color: Colors.textMuted }]}>Select Visa Subclass</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {visaOptions.map(v => (
              <TouchableOpacity
                key={v.code}
                style={[
                  styles.visaChip,
                  { backgroundColor: Colors.surfaceRaised, borderColor: Colors.border },
                  selectedVisa === v.code && { backgroundColor: Colors.accent, borderColor: Colors.accent },
                ]}
                onPress={() => {
                  hapticTap();
                  setSelectedVisa(v.code);
                }}
              >
                <Text style={[
                  styles.visaChipText,
                  { color: Colors.textSecondary },
                  selectedVisa === v.code && { color: '#fff' },
                ]}>
                  {v.code}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {journey && (
          <>
            {/* Visa Header */}
            <View style={styles.header}>
              <Text style={[styles.visaTitle, { color: Colors.textPrimary }]}>{journey.visaName}</Text>
              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: journey.type === 'Permanent' ? `${Colors.success}20` : `${Colors.warning}20` }]}>
                  <Text style={[styles.badgeText, { color: journey.type === 'Permanent' ? Colors.success : Colors.warning }]}>
                    {journey.type}
                  </Text>
                </View>
                {journey.pointsTested && (
                  <View style={[styles.badge, { backgroundColor: `${Colors.accent}20` }]}>
                    <Text style={[styles.badgeText, { color: Colors.accent }]}>{journey.minPoints}+ Points</Text>
                  </View>
                )}
              </View>
            </View>

            {/* English Requirements Quick View */}
            <View style={[styles.englishCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="language" size={18} color={Colors.success} />
                <Text style={[styles.cardTitle, { color: Colors.textPrimary }]}>
                  English Requirement: {journey.englishLevel}
                </Text>
              </View>
              <View style={styles.englishGrid}>
                {ENGLISH_TESTS.slice(0, 4).map(test => {
                  const level = journey.englishLevel.toLowerCase() as 'competent' | 'proficient' | 'superior';
                  const scores = test[level];
                  return (
                    <View key={test.code} style={styles.englishItem}>
                      <Text style={[styles.englishTestName, { color: Colors.textMuted }]}>{test.code}</Text>
                      <Text style={[styles.englishScore, { color: Colors.success }]}>{scores.overall}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* User's Authority Note */}
            {userAuthority && typeof userAuthority === 'object' && (
              <View style={[styles.authorityNote, { backgroundColor: `${Colors.accent}10`, borderColor: `${Colors.accent}30` }]}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.accent} />
                <Text style={[styles.authorityNoteText, { color: Colors.textPrimary }]}>
                  Your skills assessment: <Text style={{ fontWeight: FontWeight.bold, color: Colors.accent }}>{userAuthority.code}</Text>
                  {' '}({userAuthority.name})
                </Text>
              </View>
            )}

            {/* Journey Steps */}
            <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Your Journey to Australia</Text>
            {journey.steps.map((step, index) => (
              <TouchableOpacity
                key={step.id}
                style={[styles.stepCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                onPress={() => {
                  hapticTap();
                  setExpandedStep(expandedStep === step.id ? null : step.id);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.stepHeader}>
                  <View style={[styles.stepNumber, { backgroundColor: Colors.accent }]}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={[styles.stepTitle, { color: Colors.textPrimary }]}>{step.title}</Text>
                    <View style={styles.stepMetaRow}>
                      <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                      <Text style={[styles.stepDuration, { color: Colors.textMuted }]}>
                        {step.duration}
                        {step.cost && ` · ${step.cost}`}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={expandedStep === step.id ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.textMuted}
                  />
                </View>

                {expandedStep === step.id && (
                  <View style={[styles.stepExpanded, { borderTopColor: Colors.border }]}>
                    <Text style={[styles.stepDescription, { color: Colors.textSecondary }]}>{step.description}</Text>

                    {step.documents && step.documents.length > 0 && (
                      <View style={styles.docSection}>
                        <View style={styles.docTitleRow}>
                          <Ionicons name="document-text" size={14} color={Colors.accent} />
                          <Text style={[styles.docTitle, { color: Colors.accent }]}>Documents Required</Text>
                        </View>
                        {step.documents.map((doc, i) => (
                          <Text key={i} style={[styles.docItem, { color: Colors.textSecondary }]}>• {doc}</Text>
                        ))}
                      </View>
                    )}

                    {step.tips && step.tips.length > 0 && (
                      <View style={[styles.tipsSection, { backgroundColor: `${Colors.warning}10`, borderColor: `${Colors.warning}30` }]}>
                        <View style={styles.tipsTitleRow}>
                          <Ionicons name="bulb" size={14} color={Colors.warning} />
                          <Text style={[styles.tipsTitle, { color: Colors.warning }]}>Tips</Text>
                        </View>
                        {step.tips.map((tip, i) => (
                          <Text key={i} style={[styles.tipItem, { color: Colors.textSecondary }]}>💡 {tip}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  selectorContainer: { padding: Spacing.md, borderBottomWidth: 1 },
  selectorLabel: { fontSize: FontSize.xs, marginBottom: Spacing.xs },
  visaChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    marginRight: Spacing.xs,
    borderWidth: 1,
  },
  visaChipText: { fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  header: { padding: Spacing.md },
  visaTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  badges: { flexDirection: 'row', gap: Spacing.xs },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  englishCard: { margin: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  englishGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  englishItem: { alignItems: 'center' },
  englishTestName: { fontSize: FontSize.xs },
  englishScore: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  authorityNote: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  authorityNoteText: { fontSize: FontSize.sm, flex: 1 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  stepCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  stepNumber: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm,
  },
  stepNumberText: { color: '#fff', fontWeight: FontWeight.bold },
  stepInfo: { flex: 1 },
  stepTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  stepMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  stepDuration: { fontSize: FontSize.xs },
  stepExpanded: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, borderTopWidth: 1 },
  stepDescription: { marginTop: Spacing.sm, lineHeight: 20, fontSize: FontSize.sm },
  docSection: { marginTop: Spacing.md },
  docTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs },
  docTitle: { fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  docItem: { marginLeft: Spacing.sm, marginBottom: 4, fontSize: FontSize.sm },
  tipsSection: { marginTop: Spacing.md, padding: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1 },
  tipsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs },
  tipsTitle: { fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  tipItem: { marginBottom: 4, fontSize: FontSize.sm },
});
