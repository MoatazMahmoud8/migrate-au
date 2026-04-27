import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';

const STATES = [
  {
    code: 'VIC',
    name: 'Victoria',
    color: '#003087',
    newsUrl: 'https://www.vic.gov.au/skilled-migration-victoria',
    desc: 'VMAS — Victorian Skilled Migration program with multiple streams',
  },
  {
    code: 'NSW',
    name: 'New South Wales',
    color: '#00539C',
    newsUrl: 'https://www.nsw.gov.au/living-and-working/migration',
    desc: 'NSW Skilled Nominated Visa program',
  },
  {
    code: 'QLD',
    name: 'Queensland',
    color: '#6D1A36',
    newsUrl: 'https://migration.qld.gov.au/',
    desc: 'Queensland Skilled Visa program',
  },
  {
    code: 'SA',
    name: 'South Australia',
    color: '#D4002A',
    newsUrl: 'https://migration.sa.gov.au/',
    desc: 'SA Skilled & Business Migration',
  },
  {
    code: 'WA',
    name: 'Western Australia',
    color: '#F5A800',
    newsUrl: 'https://www.wa.gov.au/service/employment/workplace-policy-and-standards/skilled-migration-western-australia',
    desc: 'WA Skilled Migration program',
  },
  {
    code: 'TAS',
    name: 'Tasmania',
    color: '#006B3F',
    newsUrl: 'https://www.migration.tas.gov.au/',
    desc: 'Tasmanian Skilled Migration program',
  },
  {
    code: 'ACT',
    name: 'Australian Capital Territory',
    color: '#004F9F',
    newsUrl: 'https://www.act.gov.au/skilled-migration',
    desc: 'ACT Skilled Migration — Critical Skills list',
  },
  {
    code: 'NT',
    name: 'Northern Territory',
    color: '#BE6A14',
    newsUrl: 'https://migration.nt.gov.au/',
    desc: 'NT Skilled & Business migration',
  },
];

export default function StatesScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>State Migration News</Text>
        <Text style={styles.headerSub}>
          Tap a state to see details and visit official migration pages.
        </Text>
      </View>

      {STATES.map((state) => {
        const isOpen = expanded === state.code;
        return (
          <TouchableOpacity
            key={state.code}
            style={styles.card}
            onPress={() => setExpanded(isOpen ? null : state.code)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.codeTag, { backgroundColor: state.color + '18' }]}>
                <Text style={[styles.codeText, { color: state.color }]}>{state.code}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.stateName}>{state.name}</Text>
                <Text style={styles.stateDesc} numberOfLines={isOpen ? undefined : 1}>
                  {state.desc}
                </Text>
              </View>
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.textMuted}
              />
            </View>

            {isOpen && (
              <View style={styles.cardBody}>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => Linking.openURL(state.newsUrl)}
                >
                  <Ionicons name="open-outline" size={16} color={Colors.primary} />
                  <Text style={styles.linkText}>View Official Migration Page</Text>
                </TouchableOpacity>
                <View style={styles.noticeBox}>
                  <Ionicons name="notifications-outline" size={16} color={Colors.textMuted} />
                  <Text style={styles.noticeText}>
                    Push notifications for {state.code} coming soon. Subscribe in Profile.
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  headerTitle: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  headerSub: { color: Colors.white + 'CC', fontSize: FontSize.sm, marginTop: Spacing.xs },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    margin: Spacing.lg,
    marginBottom: 0,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  codeTag: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  cardMeta: { flex: 1 },
  stateName: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  stateDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  cardBody: { marginTop: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.divider, marginBottom: Spacing.md },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  linkText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  noticeText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
});
