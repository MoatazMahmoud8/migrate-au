import React, { useState, useEffect, useMemo } from 'react';
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
import { useColors } from '../../constants/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getProfile, saveProfile } from '../../utils/storage';
import { tap as hapticTap } from '../../utils/haptics';
import PaywallModal from '../../components/PaywallModal';

interface StateVisa { sub: string; label: string; desc: string }
interface StateVisaGroup { category: string; icon: string; visas: StateVisa[] }
interface StateEntry {
  code: string; name: string; color: string;
  portalUrl: string; occupationUrl: string;
  visas: string[]; // kept for occupations.tsx grid compatibility
  desc: string;
  visaGroups: StateVisaGroup[];
}

const STATES: StateEntry[] = [
  {
    code: 'NSW', name: 'New South Wales', color: '#4F8EF7',
    portalUrl: 'https://www.nsw.gov.au/visas-and-migration',
    occupationUrl: 'https://www.nsw.gov.au/visas-and-migration/skilled-visas',
    visas: ['190', '491'],
    desc: 'NSW Skilled Visa nomination — 190 & 491',
    visaGroups: [
      {
        category: 'Skilled Nomination', icon: 'ribbon-outline', visas: [
          { sub: '190', label: 'Skilled Nominated', desc: 'Permanent · points-tested' },
          { sub: '491', label: 'Skilled Work Regional', desc: 'Provisional 5yr → PR pathway' },
        ],
      },
      {
        category: 'Business & Investment', icon: 'briefcase-outline', visas: [
          { sub: '188A', label: 'Business Innovation', desc: 'Established business history' },
          { sub: '188B', label: 'Investor', desc: '$1.5M+ designated state investment' },
          { sub: '188C', label: 'Significant Investor', desc: '$5M complying investment' },
          { sub: '132',  label: 'Business Talent', desc: 'Significant business history or VC' },
        ],
      },
    ],
  },
  {
    code: 'VIC', name: 'Victoria', color: '#00C2FF',
    portalUrl: 'https://liveinmelbourne.vic.gov.au/migrate',
    occupationUrl: 'https://liveinmelbourne.vic.gov.au/migrate/visas-and-immigrating/visa-nomination',
    visas: ['190', '491'],
    desc: 'Victorian Skilled Migration Program (VSMP)',
    visaGroups: [
      {
        category: 'Skilled Nomination', icon: 'ribbon-outline', visas: [
          { sub: '190', label: 'Skilled Nominated', desc: 'Permanent · points-tested' },
          { sub: '491', label: 'Skilled Work Regional', desc: 'Provisional 5yr → PR pathway' },
        ],
      },
      {
        category: 'Business & Investment', icon: 'briefcase-outline', visas: [
          { sub: '188A', label: 'Business Innovation', desc: 'Established business history' },
          { sub: '188B', label: 'Investor', desc: '$1.5M+ designated state investment' },
          { sub: '188C', label: 'Significant Investor', desc: '$5M complying investment' },
        ],
      },
    ],
  },
  {
    code: 'QLD', name: 'Queensland', color: '#FF6B8A',
    portalUrl: 'https://migration.qld.gov.au/',
    occupationUrl: 'https://migration.qld.gov.au/visa-options/skilled/',
    visas: ['190', '491'],
    desc: 'Queensland Skilled Visa program',
    visaGroups: [
      {
        category: 'Skilled Nomination', icon: 'ribbon-outline', visas: [
          { sub: '190', label: 'Skilled Nominated', desc: 'Permanent · points-tested' },
          { sub: '491', label: 'Skilled Work Regional', desc: 'Provisional 5yr → PR pathway' },
        ],
      },
      {
        category: 'Business & Investment', icon: 'briefcase-outline', visas: [
          { sub: '188A', label: 'Business Innovation', desc: 'Established business history' },
          { sub: '188B', label: 'Investor', desc: '$1.5M+ designated state investment' },
          { sub: '188C', label: 'Significant Investor', desc: '$5M complying investment' },
        ],
      },
    ],
  },
  {
    code: 'SA', name: 'South Australia', color: '#FF7043',
    portalUrl: 'https://migration.sa.gov.au/',
    occupationUrl: 'https://migration.sa.gov.au/skilled-migrants/occupation-lists',
    visas: ['190', '491'],
    desc: 'SA Skilled & Business Migration',
    visaGroups: [
      {
        category: 'Skilled Nomination', icon: 'ribbon-outline', visas: [
          { sub: '190', label: 'Skilled Nominated', desc: 'Permanent · points-tested' },
          { sub: '491', label: 'Skilled Work Regional', desc: 'Provisional 5yr → PR pathway' },
        ],
      },
      {
        category: 'Business & Investment', icon: 'briefcase-outline', visas: [
          { sub: '188A', label: 'Business Innovation', desc: 'Established business history' },
          { sub: '188B', label: 'Investor', desc: '$1.5M+ designated state investment' },
          { sub: '188C', label: 'Significant Investor', desc: '$5M complying investment' },
          { sub: '132',  label: 'Business Talent', desc: 'Significant business history' },
        ],
      },
    ],
  },
  {
    code: 'WA', name: 'Western Australia', color: '#FFCD00',
    portalUrl: 'https://migration.wa.gov.au/',
    occupationUrl: 'https://migration.wa.gov.au/our-services-support/state-nominated-migration-program',
    visas: ['190', '491'],
    desc: 'WA State Nominated Migration Program',
    visaGroups: [
      {
        category: 'Skilled Nomination', icon: 'ribbon-outline', visas: [
          { sub: '190', label: 'Skilled Nominated', desc: 'Permanent · points-tested' },
          { sub: '491', label: 'Skilled Work Regional', desc: 'Provisional 5yr → PR pathway' },
        ],
      },
      {
        category: 'Business & Investment', icon: 'briefcase-outline', visas: [
          { sub: '188A', label: 'Business Innovation', desc: 'Established business history' },
          { sub: '188B', label: 'Investor', desc: '$1.5M+ designated state investment' },
          { sub: '188C', label: 'Significant Investor', desc: '$5M complying investment' },
          { sub: '132',  label: 'Business Talent', desc: 'Significant business history or VC' },
        ],
      },
    ],
  },
  {
    code: 'TAS', name: 'Tasmania', color: '#00D68F',
    portalUrl: 'https://www.migration.tas.gov.au/',
    occupationUrl: 'https://www.migration.tas.gov.au/skilled_migration',
    visas: ['190', '491'],
    desc: 'Tasmanian Skilled Migration program',
    visaGroups: [
      {
        category: 'Skilled Nomination', icon: 'ribbon-outline', visas: [
          { sub: '190', label: 'Skilled Nominated', desc: 'Permanent · points-tested' },
          { sub: '491', label: 'Skilled Work Regional', desc: 'Provisional 5yr → PR pathway' },
        ],
      },
      {
        category: 'Business & Investment', icon: 'briefcase-outline', visas: [
          { sub: '188A', label: 'Business Innovation', desc: 'Established business history' },
          { sub: '188B', label: 'Investor', desc: '$1.5M+ designated state investment' },
          { sub: '188C', label: 'Significant Investor', desc: '$5M complying investment' },
        ],
      },
    ],
  },
  {
    code: 'ACT', name: 'Australian Capital Territory', color: '#A78BFA',
    portalUrl: 'https://www.act.gov.au/migration',
    occupationUrl: 'https://www.act.gov.au/migration/skilled-migrants',
    visas: ['190', '491'],
    desc: 'ACT Canberra Matrix — Skilled Nomination',
    visaGroups: [
      {
        category: 'Skilled Nomination', icon: 'ribbon-outline', visas: [
          { sub: '190', label: 'Skilled Nominated', desc: 'Canberra Matrix — permanent' },
          { sub: '491', label: 'Skilled Work Regional', desc: 'Provisional 5yr → PR pathway' },
        ],
      },
      {
        category: 'Business & Investment', icon: 'briefcase-outline', visas: [
          { sub: '188B', label: 'Investor', desc: '$1.5M+ designated ACT investment' },
          { sub: '188C', label: 'Significant Investor', desc: '$5M complying investment' },
        ],
      },
    ],
  },
  {
    code: 'NT', name: 'Northern Territory', color: '#FFB800',
    portalUrl: 'https://australiasnorthernterritory.com.au/move',
    occupationUrl: 'https://australiasnorthernterritory.com.au/move/work/migrate-to-the-nt',
    visas: ['190', '491'],
    desc: 'NT Skilled & Business migration',
    visaGroups: [
      {
        category: 'Skilled Nomination', icon: 'ribbon-outline', visas: [
          { sub: '190', label: 'Skilled Nominated', desc: 'Permanent · points-tested' },
          { sub: '491', label: 'Skilled Work Regional', desc: 'Provisional 5yr → PR pathway' },
        ],
      },
      {
        category: 'Business & Investment', icon: 'briefcase-outline', visas: [
          { sub: '188A', label: 'Business Innovation', desc: 'Established business history' },
          { sub: '188B', label: 'Investor', desc: '$1.5M+ designated NT investment' },
          { sub: '188C', label: 'Significant Investor', desc: '$5M complying investment' },
        ],
      },
    ],
  },
];

export default function StatesScreen() {
  const Colors = useColors();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    getProfile().then((p) => {
      setPinned(p.pinnedStates ?? []);
      setIsPremium(p.isPremium ?? false);
    });
  }, []);

  const togglePin = async (code: string) => {
    hapticTap();

    // Premium feature: State intelligence/pinning
    if (!isPremium && !pinned.includes(code)) {
      setShowPaywall(true);
      return;
    }

    const next = pinned.includes(code)
      ? pinned.filter((c) => c !== code)
      : [...pinned, code];
    setPinned(next);
    await saveProfile({ pinnedStates: next });
  };

  const orderedStates = useMemo(() => {
    return [...STATES].sort((a, b) => {
      const aP = pinned.includes(a.code) ? 0 : 1;
      const bP = pinned.includes(b.code) ? 0 : 1;
      return aP - bP;
    });
  }, [pinned]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header */}
      <LinearGradient
        colors={['#001A3D', '#001224']}
        style={[styles.header, { paddingTop: insets.top + 60 }]}
      >
        <View style={styles.headerBadge}>
          <Ionicons name="map" size={14} color={Colors.accent} />
          <Text style={[styles.headerBadgeText, { color: Colors.white }]}>8 States & Territories</Text>
        </View>
        <Text style={[styles.headerTitle, { color: Colors.white }]}>State Nomination</Text>
        <Text style={[styles.headerSub, { color: 'rgba(255,255,255,0.75)' }]}>
          Explore migration programs across Australia and visit official portals.
        </Text>
      </LinearGradient>

      {/* Trust badge */}
      <View style={[styles.trustBadge, { backgroundColor: `${Colors.success}10`, borderColor: `${Colors.success}35` }]}>
        <Ionicons name="shield-checkmark-outline" size={14} color={Colors.success} />
        <Text style={[styles.trustText, { color: Colors.textSecondary }]}>All links go directly to official state government portals</Text>
      </View>

      <View style={styles.list}>
        {orderedStates.map((state) => {
          const isOpen = expanded === state.code;
          const isPinned = pinned.includes(state.code);
          return (
            <TouchableOpacity
              key={state.code}
              onPress={() => setExpanded(isOpen ? null : state.code)}
              activeOpacity={0.85}
            >
              <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: isOpen ? `${state.color}70` : Colors.border }]}>
                {/* Left color accent */}
                <View style={[styles.cardAccent, { backgroundColor: state.color }]} />

                <View style={styles.cardMain}>
                  <View style={styles.cardTop}>
                    {/* Code badge */}
                    <View style={[styles.codeBadge, { backgroundColor: state.color + '18', borderColor: state.color + '30' }]}>
                      <Text style={[styles.codeText, { color: state.color }]}>{state.code}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stateName, {color: Colors.textPrimary}]}>{state.name}</Text>
                      <Text style={[styles.stateDesc, { color: Colors.textSecondary }]} numberOfLines={isOpen ? undefined : 1}>
                        {state.desc}
                      </Text>
                    </View>

                    {/* Pin toggle */}
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation?.(); togglePin(state.code); }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.pinBtn}
                    >
                      <Ionicons
                        name={isPinned ? 'star' : 'star-outline'}
                        size={18}
                        color={isPinned ? Colors.secondary : Colors.textMuted}
                      />
                    </TouchableOpacity>

                    <View style={[styles.chevron, isOpen && styles.chevronOpen]}>
                      <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
                    </View>
                  </View>

                  {isOpen && (
                    <View style={styles.cardBody}>
                      <View style={[styles.divider, { backgroundColor: Colors.divider }]} />

                      {/* Visa groups */}
                      {state.visaGroups.map((group, gi) => (
                        <View key={group.category} style={[styles.visaGroup, gi > 0 && { marginTop: Spacing.sm }]}>
                          <View style={styles.visaGroupHeader}>
                            <Ionicons name={group.icon as any} size={12} color={state.color} />
                            <Text style={[styles.visaGroupLabel, { color: state.color }]}>{group.category}</Text>
                          </View>
                          {group.visas.map((v) => (
                            <View key={v.sub} style={[styles.visaRow, { backgroundColor: Colors.surfaceRaised, borderColor: state.color + '35' }]}>
                              <View style={[styles.visaSubBadge, { backgroundColor: state.color + '20', borderColor: state.color + '40' }]}>
                                <Text style={[styles.visaSubText, { color: state.color }]}>SC {v.sub}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.visaRowName, {color: Colors.textPrimary}]}>{v.label}</Text>
                                <Text style={[styles.visaRowDesc, { color: Colors.textSecondary }]}>{v.desc}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      ))}

                      {/* Occupation List */}
                      <TouchableOpacity
                        style={[styles.linkBtn, { borderColor: state.color + '40' }]}
                        onPress={() => {
                          hapticTap();
                          router.push({ pathname: '/occupations', params: { state: state.code } });
                        }}
                      >
                        <LinearGradient
                          colors={[state.color + '20', state.color + '0A']}
                          style={styles.linkBtnGrad}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Ionicons name="list-outline" size={16} color={state.color} />
                          <Text style={[styles.linkText, { color: state.color }]}>
                            {state.code} Occupation List
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

      {/* Footer source note */}
      <View style={[styles.sourceNote, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
        <Text style={[styles.sourceNoteText, { color: Colors.textSecondary }]}>
          Data sourced from official state/territory migration portals. Eligibility criteria change — always confirm on the official site.
        </Text>
      </View>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        userId={''}
        title="Unlock State Intelligence"
        message="Pin your favorite states and filter alerts by state. Premium feature."
        feature="states"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },
  headerBadgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  headerTitle: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extraBold, marginBottom: Spacing.sm, letterSpacing: -0.5 },
  headerSub: { fontSize: FontSize.md, lineHeight: 22 },

  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,214,143,0.07)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,214,143,0.15)',
  },
  trustText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: '500',
    lineHeight: 16,
  },
  sourceNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  sourceNoteText: {
    flex: 1,
    fontSize: FontSize.xs,
    lineHeight: 16,
  },

  list: { padding: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.md },

  card: {
    flexDirection: 'row',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardOpen: { },
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
  stateName: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold },
  stateDesc: { fontSize: FontSize.sm, marginTop: 2 },

  chevron: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  pinBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardBody: { marginTop: Spacing.md },
  divider: { height: 1, marginBottom: Spacing.md },

  visaChips: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  visaChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  visaChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.5 },

  visaGroup: { marginBottom: Spacing.sm },
  visaGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  visaGroupLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  visaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginBottom: 4,
  },
  visaSubBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minWidth: 52,
    alignItems: 'center',
  },
  visaSubText: { fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.4 },
  visaRowName: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  visaRowDesc: { fontSize: 10, marginTop: 1 },

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
  noticeDot: { width: 6, height: 6, borderRadius: 3 },
  noticeText: { fontSize: FontSize.xs, flex: 1, lineHeight: 16 },
});
