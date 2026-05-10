import React, { useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const VISA_CARDS = [
  {
    subclass: '189',
    name: 'Skilled Independent',
    desc: 'No sponsorship required. Apply anywhere in Australia.',
    minPts: 65,
    gradient: ['#0047AB', '#002D62'] as [string, string],
    icon: 'globe-outline',
  },
  {
    subclass: '190',
    name: 'Skilled Nominated',
    desc: 'State or territory sponsorship. +5 bonus points.',
    minPts: 65,
    gradient: ['#005C99', '#003366'] as [string, string],
    icon: 'location-outline',
  },
  {
    subclass: '491',
    name: 'Work Regional',
    desc: 'Regional sponsorship pathway. +15 bonus points.',
    minPts: 65,
    gradient: ['#006080', '#003344'] as [string, string],
    icon: 'map-outline',
  },
];

const QUICK_TILES = [
  { icon: 'calculator', label: 'Calculator', route: '/(tabs)/calculator', color: Colors.secondary, bg: 'rgba(255,205,0,0.12)' },
  { icon: 'sparkles', label: 'Ask Aria', route: '/(tabs)/ai', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  { icon: 'map', label: 'States', route: '/(tabs)/states', color: Colors.accent, bg: 'rgba(0,194,255,0.12)' },
  { icon: 'person-circle', label: 'Profile', route: '/(tabs)/profile', color: Colors.success, bg: 'rgba(0,214,143,0.12)' },
];

function PressableCard({ children, onPress, style }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity onPress={press} activeOpacity={1}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Hero */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <View style={styles.orb1} />
        <View style={styles.orb2} />

        <View style={styles.heroContent}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>🇦🇺 Skilled Migration</Text>
          </View>

          <Text style={styles.heroTitle}>Your Path to{'\n'}Australia Starts Here</Text>

          <Text style={styles.heroSub}>
            Calculate points, explore states, and get instant AI guidance from Aria.
          </Text>

          <TouchableOpacity
            style={styles.heroCta}
            onPress={() => router.push('/(tabs)/calculator')}
          >
            <LinearGradient
              colors={[Colors.secondary, '#FFB800']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heroCtaGrad}
            >
              <Text style={styles.heroCtaText}>Calculate My Points</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.primaryDark} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick tiles */}
      <View style={styles.tilesRow}>
        {QUICK_TILES.map((tile) => (
          <PressableCard
            key={tile.label}
            onPress={() => router.push(tile.route as any)}
            style={styles.tilePressable}
          >
            <View style={[styles.tile, { backgroundColor: tile.bg }]}>
              <View style={[styles.tileIcon, { borderColor: tile.color + '40' }]}>
                <Ionicons name={tile.icon as any} size={22} color={tile.color} />
              </View>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </View>
          </PressableCard>
        ))}
      </View>

      {/* Visa Pathway Cards */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Visa Pathways</Text>
          <View style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>3 options</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsScroll}
          decelerationRate="fast"
          snapToInterval={width * 0.75 + Spacing.md}
          snapToAlignment="start"
        >
          {VISA_CARDS.map((v) => (
            <PressableCard
              key={v.subclass}
              onPress={() => router.push('/(tabs)/calculator')}
            >
              <LinearGradient
                colors={v.gradient}
                style={styles.visaCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardShine} />

                <View style={styles.visaTop}>
                  <View style={styles.visaIconWrap}>
                    <Ionicons name={v.icon as any} size={22} color="rgba(255,255,255,0.9)" />
                  </View>
                  <View style={styles.visaBadge}>
                    <Text style={styles.visaBadgeText}>SC {v.subclass}</Text>
                  </View>
                </View>

                <Text style={styles.visaName}>{v.name}</Text>
                <Text style={styles.visaDesc}>{v.desc}</Text>

                <View style={styles.visaFooter}>
                  <View>
                    <Text style={styles.visaPtsLabel}>Min. points</Text>
                    <Text style={styles.visaPtsNum}>{v.minPts}</Text>
                  </View>
                  <View style={styles.visaArrow}>
                    <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
                  </View>
                </View>
              </LinearGradient>
            </PressableCard>
          ))}
        </ScrollView>
      </View>

      {/* Aria AI promo */}
      <View style={styles.section}>
        <PressableCard onPress={() => router.push('/(tabs)/ai')}>
          <LinearGradient
            colors={['#1A0A3D', '#2D1B6E']}
            style={styles.ariaCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.ariaCardShine} />
            <View style={styles.ariaLeft}>
              <View style={styles.ariaAvatarSmall}>
                <Ionicons name="sparkles" size={20} color={Colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ariaTitle}>Ask Aria AI</Text>
                <Text style={styles.ariaSub}>Your personal migration consultant — available 24/7</Text>
              </View>
            </View>
            <View style={styles.ariaChips}>
              {["What's 189 vs 190?", 'Do I need skills assessment?'].map((q) => (
                <View key={q} style={styles.ariaChip}>
                  <Text style={styles.ariaChipText}>{q}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </PressableCard>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="shield-checkmark-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.disclaimerText}>
          Points are indicative only. Consult a{' '}
          <Text
            style={styles.disclaimerLink}
            onPress={() => Linking.openURL('https://portal.mara.gov.au')}
          >
            MARA-registered agent
          </Text>
          {' '}for formal advice.
        </Text>
      </View>

      {/* Independent guide banner */}
      <View style={styles.independentBanner}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.accent} />
        <Text style={styles.independentText}>
          Independent Guide — Not affiliated with the Australian Government
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  hero: {
    minHeight: height * 0.44,
    backgroundColor: Colors.primaryDark,
    overflow: 'hidden',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  orb1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#003A8C',
    top: -80,
    right: -80,
    opacity: 0.6,
  },
  orb2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FFCD00',
    bottom: -60,
    left: -40,
    opacity: 0.07,
  },
  heroContent: { zIndex: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,205,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,205,0,0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  badgeText: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.display,
    fontWeight: FontWeight.extraBold,
    lineHeight: 44,
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  heroSub: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  heroCta: { alignSelf: 'flex-start', borderRadius: Radius.full, overflow: 'hidden' },
  heroCtaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
  },
  heroCtaText: {
    color: Colors.primaryDark,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },

  tilesRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  tilePressable: { flex: 1 },
  tile: {
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: Spacing.sm,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tileLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },

  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sectionPill: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  sectionPillText: { fontSize: FontSize.xs, color: Colors.textMuted },

  cardsScroll: { gap: Spacing.md, paddingRight: Spacing.lg },
  visaCard: {
    width: width * 0.75,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    overflow: 'hidden',
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  visaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  visaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visaBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  visaBadgeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  visaName: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  visaDesc: { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.xl },
  visaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  visaPtsLabel: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.xs },
  visaPtsNum: { color: Colors.secondary, fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold },
  visaArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ariaCard: { borderRadius: Radius.xl, padding: Spacing.xl, overflow: 'hidden' },
  ariaCardShine: {
    position: 'absolute',
    top: 0, right: 0,
    width: 120, height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(167,139,250,0.15)',
  },
  ariaLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  ariaAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,205,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,205,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ariaTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  ariaSub: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  ariaChips: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  ariaChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  ariaChipText: { color: Colors.textSecondary, fontSize: FontSize.xs },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disclaimerText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },
  disclaimerLink: { color: Colors.accent, textDecorationLine: 'underline' },

  independentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  independentText: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    opacity: 0.7,
    textAlign: 'center',
  },
});
