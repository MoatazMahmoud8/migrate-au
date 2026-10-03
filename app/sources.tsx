import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../constants/ThemeContext';
import { Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { openExternalUrl } from '../utils/openExternalUrl';

interface Source {
  name: string;
  url: string;
  covers: string;
}

const FEDERAL_SOURCES: Source[] = [
  {
    name: 'Department of Home Affairs — Immigration',
    url: 'https://immi.homeaffairs.gov.au/',
    covers: 'Visa subclasses, fees, forms, checklists.',
  },
  {
    name: 'Home Affairs — SkillSelect',
    url: 'https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect',
    covers: 'Invitation rounds, points thresholds, cutoff scores.',
  },
  {
    name: 'Home Affairs — Fees and Charges',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/fees-and-charges',
    covers: 'Visa application charges and updates.',
  },
  {
    name: 'Home Affairs — Processing Times',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times/global-processing-times',
    covers: 'Median and 90th percentile visa processing times.',
  },
  {
    name: 'Home Affairs — Legislative Instruments & Directions',
    url: 'https://immi.homeaffairs.gov.au/help-support/departmental-forms/legislative-instruments',
    covers: 'Ministerial directions, legislative instruments.',
  },
  {
    name: 'Administrative Review Tribunal (formerly AAT)',
    url: 'https://www.aat.gov.au/',
    covers: 'Migration decisions and merits review.',
  },
  {
    name: 'Federal Register of Legislation',
    url: 'https://www.legislation.gov.au/',
    covers: 'Migration Act, Migration Regulations and amendments.',
  },
  {
    name: 'Australian Bureau of Statistics — ANZSCO',
    url: 'https://www.abs.gov.au/statistics/classifications/anzsco-australian-and-new-zealand-standard-classification-occupations',
    covers: 'ANZSCO occupation classification.',
  },
  {
    name: 'Jobs and Skills Australia',
    url: 'https://www.jobsandskills.gov.au/',
    covers: 'Occupation lists and skills shortages.',
  },
];

const STATE_SOURCES: Source[] = [
  { name: 'NSW — Visas and migration', url: 'https://www.nsw.gov.au/visas-and-migration', covers: 'NSW state nomination criteria.' },
  { name: 'Victoria — Live in Melbourne / Visa Nomination', url: 'https://liveinmelbourne.vic.gov.au/', covers: 'VIC state nomination program.' },
  { name: 'Queensland — Migration Queensland', url: 'https://migration.qld.gov.au/', covers: 'QLD state nomination criteria.' },
  { name: 'Western Australia — Migration WA', url: 'https://www.wa.gov.au/service/community-services/migration/skilled-migration-western-australia-overview', covers: 'WA state nomination criteria.' },
  { name: 'South Australia — Migration SA', url: 'https://www.migration.sa.gov.au/', covers: 'SA state nomination criteria.' },
  { name: 'Tasmania — Migration Tasmania', url: 'https://www.migration.tas.gov.au/', covers: 'TAS state nomination criteria.' },
  { name: 'Australian Capital Territory — Canberra Your Future', url: 'https://www.canberrayourfuture.com.au/', covers: 'ACT state nomination criteria.' },
  { name: 'Northern Territory — The Territory', url: 'https://theterritory.com.au/migrate', covers: 'NT state nomination criteria.' },
];

const ASSESSMENT_SOURCES: Source[] = [
  { name: 'VETASSESS', url: 'https://www.vetassess.com.au/', covers: 'Skills assessment for many professional and trade occupations.' },
  { name: 'Engineers Australia (MSA)', url: 'https://www.engineersaustralia.org.au/migration-skills-assessment', covers: 'Skills assessment for engineering occupations.' },
  { name: 'ACS — Australian Computer Society', url: 'https://www.acs.org.au/msa', covers: 'Skills assessment for ICT occupations.' },
  { name: 'CPA Australia', url: 'https://www.cpaaustralia.com.au/', covers: 'Skills assessment for accounting occupations.' },
  { name: 'AHPRA', url: 'https://www.ahpra.gov.au/', covers: 'Registration for regulated health professions.' },
];

export default function SourcesScreen() {
  const Colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const renderGroup = (title: string, list: Source[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.card}>
        {list.map((source, idx) => (
          <TouchableOpacity
            key={source.url}
            style={[styles.row, idx === list.length - 1 && styles.rowLast]}
            onPress={() => void openExternalUrl(source.url)}
            accessibilityRole="link"
            accessibilityLabel={`Open ${source.name}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{source.name}</Text>
              <Text style={styles.rowCovers}>{source.covers}</Text>
              <Text style={styles.rowUrl}>{source.url}</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: 'Sources & Disclaimer' }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sources & Disclaimer</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <View style={styles.disclaimerCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color={Colors.accent} style={{ marginRight: 8 }} />
          <Text style={styles.disclaimerText}>
            MigrateAU is an independent app.{' '}
            <Text style={styles.disclaimerStrong}>
              We are not affiliated with, endorsed by, or authorised to facilitate services on behalf of the Australian Government or any of its agencies.
            </Text>
            {' '}All migration information is drawn from the official sources listed below.
            For formal advice, consult a{' '}
            <Text style={styles.link} onPress={() => void openExternalUrl('https://portal.mara.gov.au')}>
              MARA-registered migration agent
            </Text>.
          </Text>
        </View>

        {renderGroup('Federal government sources', FEDERAL_SOURCES)}
        {renderGroup('State & territory nomination programs', STATE_SOURCES)}
        {renderGroup('Skills assessment authorities', ASSESSMENT_SOURCES)}

        <View style={[styles.section, { marginTop: Spacing.md }]}>
          <Text style={styles.footnote}>
            This list is refreshed with every app release. If you notice a change we should track, please use "Report issue or bug" from the profile screen.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    backBtn: { padding: 4 },
    headerTitle: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.semiBold,
      color: Colors.textPrimary,
    },
    disclaimerCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: Colors.surface,
      borderColor: Colors.border,
      borderWidth: 1,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.sm,
    },
    disclaimerText: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm, lineHeight: 20 },
    disclaimerStrong: { fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
    link: { textDecorationLine: 'underline', color: Colors.accent },
    section: { paddingHorizontal: Spacing.md, marginTop: Spacing.lg },
    sectionLabel: {
      color: Colors.textMuted,
      fontSize: FontSize.xs,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: Spacing.xs,
    },
    card: {
      backgroundColor: Colors.surface,
      borderColor: Colors.border,
      borderWidth: 1,
      borderRadius: Radius.md,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderBottomColor: Colors.border,
      borderBottomWidth: 1,
    },
    rowLast: { borderBottomWidth: 0 },
    rowTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
    rowCovers: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
    rowUrl: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
    footnote: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  });
}
