import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { useColors } from '../constants/ThemeContext';
import { UserProfile } from '../constants/types';

interface UsageMeterProps {
  feature: 'calculator' | 'aiMessages' | 'anzscoSearches';
  remaining: number | null;
  onUpgradePress: () => void;
  isPremium: boolean;
}

export function UsageMeter({ feature, remaining, onUpgradePress, isPremium }: UsageMeterProps) {
  const Colors = useColors();
  if (isPremium || remaining === null) return null;

  const featureLabel: Record<typeof feature, { name: string; icon: string }> = {
    calculator: { name: 'Points Calculations', icon: 'calculator-outline' },
    aiMessages: { name: 'AI Consultations', icon: 'sparkles-outline' },
    anzscoSearches: { name: 'Occupation Searches', icon: 'briefcase-outline' },
  };

  const { name, icon } = featureLabel[feature];
  const total = { calculator: 3, aiMessages: 3, anzscoSearches: 10 }[feature];
  const isLow = remaining === 0;
  const isWarning = remaining === 1;

  return (
    <View style={[styles.meter, isLow && styles.meterCritical, isWarning && styles.meterWarning]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={icon as any} 
            size={16} 
            color={isLow ? Colors.error : isWarning ? Colors.warning : Colors.secondary}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.label, {color: Colors.textPrimary}]}>{name}</Text>
          <Text style={[styles.remaining, {color: Colors.textPrimary}]}>
            {remaining > 0 ? `${remaining} of ${total} remaining this month` : 'Free tier exhausted'}
          </Text>
        </View>
      </View>

      {remaining === 0 && (
        <TouchableOpacity onPress={onUpgradePress}>
          <Text style={[styles.upgradeBtn, {color: Colors.textPrimary}]}>Upgrade →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  meter: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.secondary + '10',
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  meterWarning: {
    backgroundColor: Colors.warning + '15',
    borderLeftColor: Colors.warning,
  },
  meterCritical: {
    backgroundColor: Colors.error + '15',
    borderLeftColor: Colors.error,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  remaining: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  upgradeBtn: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.secondary,
  },
});
