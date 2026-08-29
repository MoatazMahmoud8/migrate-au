import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VISA_JOURNEYS, ENGLISH_TESTS, getVisaJourney } from '../constants/visaJourney';
import { getAssessingAuthority, ASSESSING_AUTHORITIES } from '../constants/assessingAuthorities';

export default function VisaJourneyScreen() {
  const { visa } = useLocalSearchParams<{ visa?: string }>();
  const [expandedStep, setExpandedStep] = useState<string | null>('english');
  const [selectedVisa, setSelectedVisa] = useState(visa || '189');

  const journey = getVisaJourney(selectedVisa);

  const visaOptions = VISA_JOURNEYS.map(v => ({
    code: v.visaCode,
    name: `${v.visaCode} - ${v.visaName}`,
  }));

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Visa Journey',
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView style={styles.container}>
        {/* Visa Selector */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorLabel}>Select Visa Subclass</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {visaOptions.map(v => (
              <TouchableOpacity
                key={v.code}
                style={[styles.visaChip, selectedVisa === v.code && styles.visaChipActive]}
                onPress={() => setSelectedVisa(v.code)}
              >
                <Text style={[styles.visaChipText, selectedVisa === v.code && styles.visaChipTextActive]}>
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
              <Text style={styles.visaTitle}>{journey.visaName}</Text>
              <View style={styles.badges}>
                <View style={[styles.badge, journey.type === 'Permanent' ? styles.badgePR : styles.badgeTemp]}>
                  <Text style={styles.badgeText}>{journey.type}</Text>
                </View>
                {journey.pointsTested && (
                  <View style={styles.badgePoints}>
                    <Text style={styles.badgeText}>{journey.minPoints}+ Points</Text>
                  </View>
                )}
              </View>
            </View>

            {/* English Requirements Quick View */}
            <View style={styles.englishCard}>
              <Text style={styles.cardTitle}>
                <Ionicons name="language" size={18} color="#4ade80" /> English Requirement: {journey.englishLevel}
              </Text>
              <View style={styles.englishGrid}>
                {ENGLISH_TESTS.slice(0, 4).map(test => {
                  const level = journey.englishLevel.toLowerCase() as 'competent' | 'proficient' | 'superior';
                  const scores = test[level];
                  return (
                    <View key={test.code} style={styles.englishItem}>
                      <Text style={styles.englishTestName}>{test.code}</Text>
                      <Text style={styles.englishScore}>{scores.overall}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Journey Steps */}
            <Text style={styles.sectionTitle}>Your Journey to Australia</Text>
            {journey.steps.map((step, index) => (
              <TouchableOpacity
                key={step.id}
                style={styles.stepCard}
                onPress={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                activeOpacity={0.8}
              >
                <View style={styles.stepHeader}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDuration}>
                      <Ionicons name="time-outline" size={12} color="#9ca3af" /> {step.duration}
                      {step.cost && ` · ${step.cost}`}
                    </Text>
                  </View>
                  <Ionicons
                    name={expandedStep === step.id ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#9ca3af"
                  />
                </View>

                {expandedStep === step.id && (
                  <View style={styles.stepExpanded}>
                    <Text style={styles.stepDescription}>{step.description}</Text>

                    {step.documents && step.documents.length > 0 && (
                      <View style={styles.docSection}>
                        <Text style={styles.docTitle}>
                          <Ionicons name="document-text" size={14} color="#60a5fa" /> Documents Required
                        </Text>
                        {step.documents.map((doc, i) => (
                          <Text key={i} style={styles.docItem}>• {doc}</Text>
                        ))}
                      </View>
                    )}

                    {step.tips && step.tips.length > 0 && (
                      <View style={styles.tipsSection}>
                        <Text style={styles.tipsTitle}>
                          <Ionicons name="bulb" size={14} color="#fbbf24" /> Tips
                        </Text>
                        {step.tips.map((tip, i) => (
                          <Text key={i} style={styles.tipItem}>💡 {tip}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Assessing Authorities */}
            <Text style={styles.sectionTitle}>Assessing Authorities</Text>
            <View style={styles.authoritiesGrid}>
              {Object.values(ASSESSING_AUTHORITIES).slice(0, 6).map(auth => (
                <TouchableOpacity key={auth.code} style={styles.authorityCard}>
                  <Text style={styles.authorityCode}>{auth.code}</Text>
                  <Text style={styles.authorityName}>{auth.name}</Text>
                  <Text style={styles.authorityTime}>{auth.processingTime}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  selectorContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  selectorLabel: { color: '#9ca3af', fontSize: 12, marginBottom: 8 },
  visaChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#1f2937', marginRight: 8,
  },
  visaChipActive: { backgroundColor: '#3b82f6' },
  visaChipText: { color: '#9ca3af', fontWeight: '600' },
  visaChipTextActive: { color: '#fff' },
  header: { padding: 16 },
  visaTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgePR: { backgroundColor: '#166534' },
  badgeTemp: { backgroundColor: '#854d0e' },
  badgePoints: { backgroundColor: '#1e40af', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  englishCard: { margin: 16, padding: 16, backgroundColor: '#1a1a2e', borderRadius: 12 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  englishGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  englishItem: { alignItems: 'center' },
  englishTestName: { color: '#9ca3af', fontSize: 12 },
  englishScore: { color: '#4ade80', fontSize: 20, fontWeight: 'bold' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  stepCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1a1a2e', borderRadius: 12, overflow: 'hidden' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  stepNumber: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#3b82f6',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  stepNumberText: { color: '#fff', fontWeight: 'bold' },
  stepInfo: { flex: 1 },
  stepTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  stepDuration: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  stepExpanded: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#2d2d4a' },
  stepDescription: { color: '#d1d5db', marginTop: 12, lineHeight: 20 },
  docSection: { marginTop: 16 },
  docTitle: { color: '#60a5fa', fontWeight: '600', marginBottom: 8 },
  docItem: { color: '#9ca3af', marginLeft: 8, marginBottom: 4 },
  tipsSection: { marginTop: 16, padding: 12, backgroundColor: '#1f2937', borderRadius: 8 },
  tipsTitle: { color: '#fbbf24', fontWeight: '600', marginBottom: 8 },
  tipItem: { color: '#d1d5db', marginBottom: 4, fontSize: 13 },
  authoritiesGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12 },
  authorityCard: {
    width: '47%', margin: '1.5%', padding: 12, backgroundColor: '#1a1a2e',
    borderRadius: 12, alignItems: 'center',
  },
  authorityCode: { color: '#3b82f6', fontSize: 18, fontWeight: 'bold' },
  authorityName: { color: '#fff', fontSize: 12, textAlign: 'center', marginTop: 4 },
  authorityTime: { color: '#9ca3af', fontSize: 11, marginTop: 4 },
});
