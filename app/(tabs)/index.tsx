import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';

const { width } = Dimensions.get('window');

const quickActions = [
  { icon: 'calculator', label: 'Points\nCalculator', route: '/(tabs)/calculator', color: Colors.primary },
  { icon: 'map', label: 'State\nNews', route: '/(tabs)/states', color: '#0052CC' },
  { icon: 'sparkles', label: 'AI\nConsultant', route: '/(tabs)/ai', color: '#6554C0' },
  { icon: 'person', label: 'My\nProfile', route: '/(tabs)/profile', color: '#00875A' },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Banner */}
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.hero}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🇦🇺 Skilled Migration</Text>
        </View>
        <Text style={styles.heroTitle}>Your Australian{'\n'}Migration Journey</Text>
        <Text style={styles.heroSubtitle}>
          Calculate your points, track state news, and get AI-powered advice.
        </Text>
        <TouchableOpacity
          style={styles.heroBtn}
          onPress={() => router.push('/(tabs)/calculator')}
        >
          <Text style={styles.heroBtnText}>Calculate My Points →</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
                <Ionicons name={action.icon as any} size={26} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Info Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Visa Pathways</Text>
        {[
          { visa: 'Subclass 189', desc: 'Skilled Independent — no sponsorship needed', points: 65 },
          { visa: 'Subclass 190', desc: 'Skilled Nominated — state/territory sponsorship', points: 65 },
          { visa: 'Subclass 491', desc: 'Skilled Work Regional — regional sponsorship', points: 65 },
        ].map((v) => (
          <TouchableOpacity
            key={v.visa}
            style={styles.visaCard}
            onPress={() => router.push('/(tabs)/calculator')}
          >
            <View style={styles.visaLeft}>
              <Text style={styles.visaName}>{v.visa}</Text>
              <Text style={styles.visaDesc}>{v.desc}</Text>
            </View>
            <View style={styles.visaPoints}>
              <Text style={styles.visaPointsNum}>{v.points}</Text>
              <Text style={styles.visaPointsLabel}>min pts</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
  },
  badge: {
    backgroundColor: Colors.secondary + '30',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },
  badgeText: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  heroTitle: {
    color: Colors.white,
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extraBold,
    lineHeight: 38,
    marginBottom: Spacing.md,
  },
  heroSubtitle: {
    color: Colors.white + 'CC',
    fontSize: FontSize.md,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  heroBtn: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignSelf: 'flex-start',
  },
  heroBtnText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  section: { padding: Spacing.lg, paddingBottom: 0 },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
  visaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  visaLeft: { flex: 1, marginRight: Spacing.md },
  visaName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary },
  visaDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  visaPoints: { alignItems: 'center' },
  visaPointsNum: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.primary },
  visaPointsLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
});
