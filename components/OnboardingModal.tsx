import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { useColors } from '../constants/ThemeContext';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'compass-outline',
    title: 'Welcome to MigrateAU',
    desc: 'Find your visa pathway in 3 minutes. Calculate points, explore states, and get instant AI guidance.',
    color: Colors.secondary,
  },
  {
    icon: 'map-outline',
    title: 'Track Your Journey',
    desc: 'Follow the 5-stage Golden Path: Assess → EOI → Invite → Apply → Granted. Pin states for instant alerts.',
    color: Colors.accent,
  },
  {
    icon: 'sparkles-outline',
    title: 'Aria AI — 24/7 Guide',
    desc: 'Ask anything: visa options, points strategy, document deadlines. Like a MARA agent in your pocket.',
    color: '#A78BFA',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ visible, onClose }: Props) {
  const Colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    } else {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <TouchableOpacity style={styles.skipBtn} onPress={onClose}>
          <Text style={[styles.skipText, {color: Colors.textPrimary}]}>Skip</Text>
        </TouchableOpacity>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          {SLIDES.map((s) => (
            <View key={s.title} style={styles.slide}>
              <LinearGradient
                colors={[`${s.color}30`, `${s.color}05`]}
                style={styles.iconWrap}
              >
                <Ionicons name={s.icon as any} size={64} color={s.color} />
              </LinearGradient>
              <Text style={[styles.title, {color: Colors.textPrimary}]}>{s.title}</Text>
              <Text style={[styles.desc, {color: Colors.textPrimary}]}>{s.desc}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <TouchableOpacity onPress={next} activeOpacity={0.8}>
            <LinearGradient
              colors={[Colors.secondary, '#FFB800']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.nextBtn}
            >
              <Text style={[styles.nextText, {color: Colors.textPrimary}]}>
                {index === SLIDES.length - 1 ? "Let's Go" : 'Next'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.primaryDark} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  skipBtn: {
    position: 'absolute',
    top: 60, right: 24,
    zIndex: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  skipText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  iconWrap: {
    width: 140, height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extraBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  desc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 50,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.secondary,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
    borderRadius: Radius.full,
  },
  nextText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
});
