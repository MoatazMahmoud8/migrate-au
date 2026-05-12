import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { VISA_PATHWAYS, VISA_CATEGORY_META, VisaPathway } from '../constants/visaPathways';
import { tap as hapticTap } from '../utils/haptics';

const FILTERS: Array<'All' | VisaPathway['category']> = [
  'All', 'Employer', 'Graduate', 'Family', 'Student', 'Working Holiday', 'Visitor', 'Humanitarian', 'Training',
];

export default function VisasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();
  const initial = (params.category as any) && FILTERS.includes(params.category as any)
    ? (params.category as VisaPathway['category'])
    : 'All';
  const [filter, setFilter] = useState<'All' | VisaPathway['category']>(initial);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'All') return VISA_PATHWAYS;
    return VISA_PATHWAYS.filter((v) => v.category === filter);
  }, [filter]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <LinearGradient
          colors={[Colors.primaryDark, Colors.background]}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerBadge}>
              <Ionicons name="layers-outline" size={12} color={Colors.accent} />
              <Text style={styles.headerBadgeText}>{VISA_PATHWAYS.length} visas</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>

          <Text style={styles.title}>Visa Pathways</Text>
          <Text style={styles.subtitle}>
            Browse every Australian visa subclass with eligibility conditions — no need to leave the app.
          </Text>
        </LinearGradient>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => { hapticTap(); setFilter(f); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List */}
        <View style={styles.list}>
          {filtered.map((v) => {
            const meta = VISA_CATEGORY_META[v.category];
            const open = expanded === v.code;
            return (
              <View key={v.code} style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHead}
                  activeOpacity={0.85}
                  onPress={() => { hapticTap(); setExpanded(open ? null : v.code); }}
                >
                  <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                    <Ionicons name={v.icon as any} size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.codeRow}>
                      <Text style={styles.cardCode}>SC {v.code}</Text>
                      <View style={[styles.typeBadge, v.type === 'Permanent' ? styles.typePerm : styles.typeTemp]}>
                        <Text style={[styles.typeText, v.type === 'Permanent' ? styles.typeTextPerm : styles.typeTextTemp]}>
                          {v.type}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardName}>{v.name}</Text>
                    <Text style={[styles.cardCat, { color: meta.color }]}>{v.category}</Text>
                  </View>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
                </TouchableOpacity>

                {open && (
                  <View style={styles.cardBody}>
                    <Text style={styles.sectionLabel}>Streams</Text>
                    <View style={styles.streamList}>
                      {v.subclasses.map((s) => (
                        <View key={s} style={styles.streamChip}>
                          <Text style={styles.streamText}>{s}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>Key conditions</Text>
                    <View style={styles.condList}>
                      {v.conditions.map((c) => (
                        <View key={c} style={styles.condRow}>
                          <View style={[styles.condDot, { backgroundColor: meta.color }]} />
                          <Text style={styles.condText}>{c}</Text>
                        </View>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={styles.dhaBtn}
                      onPress={() => Linking.openURL(v.url)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="open-outline" size={14} color={Colors.accent} />
                      <Text style={styles.dhaBtnText}>Read full guide on DHA</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.footerText}>
            Information is indicative. For formal advice consult a{' '}
            <Text style={styles.footerLink} onPress={() => Linking.openURL('https://portal.mara.gov.au')}>
              MARA-registered agent
            </Text>.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(0,194,255,0.12)',
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: 'rgba(0,194,255,0.25)',
  },
  headerBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold as any, color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 20 },

  filterRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  pillActive: { backgroundColor: 'rgba(255,205,0,0.12)', borderColor: Colors.secondary },
  pillText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted },
  pillTextActive: { color: Colors.secondary },

  list: { paddingHorizontal: Spacing.lg, gap: 10 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardCode: {
    fontSize: 10, fontWeight: '800', color: Colors.textPrimary,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  typePerm: { backgroundColor: 'rgba(0,214,143,0.15)' },
  typeTemp: { backgroundColor: 'rgba(0,194,255,0.15)' },
  typeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  typeTextPerm: { color: Colors.success },
  typeTextTemp: { color: Colors.accent },
  cardName: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold as any, color: Colors.textPrimary },
  cardCat: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  cardBody: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, paddingTop: 0,
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: '700',
    color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  streamList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  streamChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  streamText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  condList: { gap: 6 },
  condRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  condDot: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  condText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  dhaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: 'rgba(0,194,255,0.25)',
    backgroundColor: 'rgba(0,194,255,0.08)',
  },
  dhaBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.accent },

  footer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl, paddingBottom: Spacing.md,
  },
  footerText: { flex: 1, fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
  footerLink: { color: Colors.accent, textDecorationLine: 'underline' },
});
