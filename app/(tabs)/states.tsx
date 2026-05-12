import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATES = [
  {
    code: 'NSW', name: 'New South Wales', color: '#4F8EF7',
    portalUrl: 'https://www.nsw.gov.au/visas-and-migration',
    occupationUrl: 'https://www.nsw.gov.au/visas-and-migration/skilled-worker-visas',
    visas: ['190', '491'],
    desc: 'Victorian Managed Admission Scheme (VMAS)',
  },
  {
    code: 'VIC', name: 'Victoria', color: '#00C2FF',
    portalUrl: 'https://liveinmelbourne.vic.gov.au/skilled-migration',
    occupationUrl: 'https://liveinmelbourne.vic.gov.au/skilled-migration/victorian-skilled-migration-program',
    visas: ['190', '491'],
    desc: 'Victorian Skilled Migration Program (VSMP)',
  },
  {
    code: 'QLD', name: 'Queensland', color: '#FF6B8A',
    portalUrl: 'https://migration.qld.gov.au/',
    occupationUrl: 'https://migration.qld.gov.au/visa-options/skilled-migration/skilled-nominated-visa-subclass-190/',
    visas: ['190', '491'],
    desc: 'Queensland Skilled Visa program',
  },
  {
    code: 'SA', name: 'South Australia', color: '#FF7043',
    portalUrl: 'https://migration.sa.gov.au/',
    occupationUrl: 'https://migration.sa.gov.au/skilled-migration/occupation-lists',
    visas: ['190', '491'],
    desc: 'SA Skilled & Business Migration',
  },
  {
    code: 'WA', name: 'Western Australia', color: '#FFCD00',
    portalUrl: 'https://migration.wa.gov.au/',
    occupationUrl: 'https://migration.wa.gov.au/skilled-migration/occupation-list',
    visas: ['190', '491'],
    desc: 'WA Skilled Migration program',
  },
  {
    code: 'TAS', name: 'Tasmania', color: '#00D68F',
    portalUrl: 'https://www.migration.tas.gov.au/',
    occupationUrl: 'https://www.migration.tas.gov.au/applicants/skilled_nominated_190',
    visas: ['190', '491'],
    desc: 'Tasmanian Skilled Migration program',
  },
  {
    code: 'ACT', name: 'Australian Capital Territory', color: '#A78BFA',
    portalUrl: 'https://www.act.gov.au/migration',
    occupationUrl: 'https://www.act.gov.au/migration/skilled-migrants/critical-skills-list',
    visas: ['190'],
    desc: 'ACT Critical Skills — Skilled Nominated',
  },
  {
    code: 'NT', name: 'Northern Territory', color: '#FFB800',
    portalUrl: 'https://australiasnorthernterritory.com.au/move',
    occupationUrl: 'https://australiasnorthernterritory.com.au/move/work/migrate-to-the-nt',
    visas: ['190', '491'],
    desc: 'NT Skilled & Business migration',
  },
];

export default function StatesScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header */}
      <LinearGradient
        colors={[Colors.primaryDark, Colors.background]}
        style={[styles.header, { paddingTop: insets.top + 60 }]}
      >
        <View style={styles.headerBadge}>
          <Ionicons name="map" size={14} color={Colors.accent} />
          <Text style={styles.headerBadgeText}>8 States & Territories</Text>
        </View>
        <Text style={styles.headerTitle}>State Nomination</Text>
        <Text style={styles.headerSub}>
          Explore migration programs across Australia and visit official portals.
        </Text>
      </LinearGradient>

      <View style={styles.list}>
        {STATES.map((state) => {
          const isOpen = expanded === state.code;
          return (
            <TouchableOpacity
              key={state.code}
              onPress={() => setExpanded(isOpen ? null : state.code)}
              activeOpacity={0.85}
            >
              <View style={[styles.card, isOpen && styles.cardOpen]}>
                {/* Left color accent */}
                <View style={[styles.cardAccent, { backgroundColor: state.color }]} />

                <View style={styles.cardMain}>
                  <View style={styles.cardTop}>
                    {/* Code badge */}
                    <View style={[styles.codeBadge, { backgroundColor: state.color + '18', borderColor: state.color + '30' }]}>
                      <Text style={[styles.codeText, { color: state.color }]}>{state.code}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.stateName}>{state.name}</Text>
                      <Text style={styles.stateDesc} numberOfLines={isOpen ? undefined : 1}>
                        {state.desc}
                      </Text>
                    </View>

                    <View style={[styles.chevron, isOpen && styles.chevronOpen]}>
                      <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
                    </View>
                  </View>

                  {isOpen && (
                    <View style={styles.cardBody}>
                      <View style={styles.divider} />

                      {/* Visa subclass chips */}
                      <View style={styles.visaChips}>
                        {state.visas.map((v) => (
                          <View key={v} style={[styles.visaChip, { backgroundColor: state.color + '18', borderColor: state.color + '35' }]}>
                            <Text style={[styles.visaChipText, { color: state.color }]}>SC {v}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Occupation List */}
                      <TouchableOpacity
                        style={[styles.linkBtn, { borderColor: state.color + '40' }]}
                        onPress={() => Linking.openURL(state.occupationUrl)}
                      >
                        <LinearGradient
                          colors={[state.color + '20', state.color + '0A']}
                          style={styles.linkBtnGrad}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Ionicons name="list-outline" size={16} color={state.color} />
                          <Text style={[styles.linkText, { color: state.color }]}>
                            Occupation List
                          </Text>
                          <Ionicons name="arrow-forward" size={14} color={state.color} />
                        </LinearGradient>
                      </TouchableOpacity>

                      {/* Official Portal */}
                      <TouchableOpacity
                        style={[styles.linkBtn, { borderColor: Colors.border }]}
                        onPress={() => Linking.openURL(state.portalUrl)}
                      >
                        <View style={[styles.linkBtnGrad, { backgroundColor: Colors.surface }]}>
                          <Ionicons name="globe-outline" size={16} color={Colors.textSecondary} />
                          <Text style={[styles.linkText, { color: Colors.textSecondary }]}>
                            Official Migration Portal
                          </Text>
                          <Ionicons name="open-outline" size={14} color={Colors.textMuted} />
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: Colors.infoLight,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },
  headerBadgeText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.xxxl, fontWeight: FontWeight.extraBold, marginBottom: Spacing.sm, letterSpacing: -0.5 },
  headerSub: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 22 },

  list: { padding: Spacing.lg, gap: Spacing.md },

  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardOpen: { borderColor: Colors.divider },
  cardAccent: { width: 4 },
  cardMain: { flex: 1, padding: Spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },

  codeBadge: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: { fontSize: FontSize.sm, fontWeight: FontWeight.extraBold, letterSpacing: 0.5 },
  stateName: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  stateDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  chevron: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chevronOpen: { transform: [{ rotate: '180deg' }] },

  cardBody: { marginTop: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.divider, marginBottom: Spacing.md },

  visaChips: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  visaChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  visaChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.5 },

  linkBtn: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  linkBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  linkText: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },

  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  noticeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textMuted },
  noticeText: { fontSize: FontSize.xs, color: Colors.textMuted, flex: 1, lineHeight: 16 },
});
