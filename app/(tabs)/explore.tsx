import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useColors } from '../../constants/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_W = (width - Spacing.lg * 2 - Spacing.md) / 2;

const TOOLS = [
  {
    icon: 'calculator-outline' as const,
    label: 'Points Calculator',
    desc: 'Estimate your SkillSelect score',
    route: '/(tabs)/calculator',
    color: Colors.accent,
    bg: 'rgba(0,194,255,0.12)',
    border: 'rgba(0,194,255,0.25)',
  },
  {
    icon: 'briefcase-outline' as const,
    label: 'Occupations',
    desc: 'MLTSSL, STSOL & ROL lists',
    route: '/occupations',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.12)',
    border: 'rgba(167,139,250,0.25)',
  },
  {
    icon: 'map-outline' as const,
    label: 'State Requirements',
    desc: 'Compare nomination criteria',
    route: '/(tabs)/states',
    color: Colors.success,
    bg: 'rgba(0,214,143,0.12)',
    border: 'rgba(0,214,143,0.25)',
  },
  {
    icon: 'trophy-outline' as const,
    label: 'Invitation Rounds',
    desc: 'SkillSelect round history',
    route: '/(tabs)/rounds',
    color: Colors.secondary,
    bg: 'rgba(255,205,0,0.12)',
    border: 'rgba(255,205,0,0.25)',
  },
  {
    icon: 'book-outline' as const,
    label: 'English Tests',
    desc: 'IELTS, PTE & TOEFL guides',
    route: '/(tabs)/english-tests',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.25)',
  },
  {
    icon: 'ribbon-outline' as const,
    label: 'Skill Assessment',
    desc: 'Find your assessing body',
    route: '/(tabs)/skill-assessment',
    color: '#F472B6',
    bg: 'rgba(244,114,182,0.12)',
    border: 'rgba(244,114,182,0.25)',
  },
  {
    icon: 'earth-outline' as const,
    label: 'Visa Pathways',
    desc: 'Browse all visa subclasses',
    route: '/visas',
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.12)',
    border: 'rgba(96,165,250,0.25)',
  },
  {
    icon: 'time-outline' as const,
    label: 'Processing Times',
    desc: 'Current DHA processing times',
    route: '/processing-times',
    color: '#FB923C',
    bg: 'rgba(251,146,60,0.12)',
    border: 'rgba(251,146,60,0.25)',
  },
] as const;

export default function ExploreScreen() {
  const Colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 64, paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <Text style={styles.headerSub}>All migration tools in one place</Text>
      </View>

      {/* Tool grid */}
      <View style={styles.grid}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.route}
            style={[styles.card, { borderColor: tool.border }]}
            onPress={() => router.push(tool.route as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.cardIcon, { backgroundColor: tool.bg }]}>
              <Ionicons name={tool.icon} size={26} color={tool.color} />
            </View>
            <Text style={styles.cardLabel}>{tool.label}</Text>
            <Text style={styles.cardDesc}>{tool.desc}</Text>
            <View style={styles.cardArrow}>
              <Ionicons name="arrow-forward" size={13} color={tool.color} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg },

  header: { marginBottom: Spacing.xl },
  headerTitle: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.extraBold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  card: {
    width: CARD_W,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  cardLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  cardDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  cardArrow: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-end',
  },
});
