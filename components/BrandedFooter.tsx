/**
 * In-screen branded footer.
 *
 * Purely cosmetic: sits at the bottom of a result card so that any manual
 * screenshot a user takes naturally captures the app's branding + domain —
 * a zero-friction viral loop that doesn't require the user to tap anything.
 *
 * Deliberately subtle (semi-transparent, small type) so it never competes
 * with the actual result content above it.
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useColors } from '../constants/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '../constants/theme';

export function BrandedFooter({ compact = false }: { compact?: boolean }) {
  const Colors = useColors();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: Colors.glass,
          borderColor: Colors.border,
          paddingVertical: compact ? Spacing.sm : Spacing.md,
        },
      ]}
    >
      <Image
        source={require('../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.textCol}>
        <Text style={[styles.brand, { color: Colors.textPrimary }]}>MigrateAU</Text>
        <Text style={[styles.subtitle, { color: Colors.textMuted }]} numberOfLines={1}>
          Australia Skilled Migration Guide • migrateau.app
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  logo: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  textCol: {
    flex: 1,
  },
  brand: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
  },
});
