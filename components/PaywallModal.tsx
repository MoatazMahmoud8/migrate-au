import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { startFreeTrialIAP, purchaseSubscription, getFormattedPrice, getYearlySavings } from '../../utils/iap';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  title: string;
  message: string;
  feature?: string; // 'scenarios' | 'ai' | 'pdf_export' etc.
}

export function PaywallModal({
  visible,
  onClose,
  userId,
  title,
  message,
  feature,
}: PaywallModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const success = await startFreeTrialIAP(userId);
      if (success) {
        onClose();
      } else {
        alert('Failed to start trial. Please try again.');
      }
    } catch (err) {
      alert('Error starting trial. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    // Mobile: use IAP (RevenueCat)
    setLoading(true);
    try {
      const success = await purchaseSubscription(userId, selectedCycle);
      if (success) {
        onClose();
      } else {
        alert('Purchase failed or cancelled');
      }
    } catch (err) {
      alert('Error processing purchase');
    } finally {
      setLoading(false);
    }
  };

  const monthlyPrice = getFormattedPrice('monthly');
  const yearlyPrice = getFormattedPrice('yearly');
  const yearlyDiscount = getYearlySavings();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {/* Feature Icon */}
            {feature && (
              <View style={styles.iconBox}>
                <Ionicons
                  name={
                    feature === 'scenarios' ? 'checkmark-done-circle' :
                    feature === 'ai' ? 'sparkles' :
                    feature === 'pdf_export' ? 'document' :
                    'lock'
                  }
                  size={48}
                  color={Colors.accent}
                />
              </View>
            )}
          </View>

          {/* Pricing Options */}
          <View style={styles.pricingSection}>
            {/* Monthly */}
            <TouchableOpacity
              style={[
                styles.priceCard,
                selectedCycle === 'monthly' && styles.priceCardSelected,
              ]}
              onPress={() => setSelectedCycle('monthly')}
            >
              <View style={styles.priceContent}>
                <Text style={styles.cycleLabel}>Monthly</Text>
                <Text style={styles.priceAmount}>{monthlyPrice.amount}</Text>
                <Text style={styles.priceSubtext}>{monthlyPrice.cycle}</Text>
              </View>
              {selectedCycle === 'monthly' && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.secondary} />
                </View>
              )}
            </TouchableOpacity>

            {/* Yearly */}
            <TouchableOpacity
              style={[
                styles.priceCard,
                selectedCycle === 'yearly' && styles.priceCardSelected,
              ]}
              onPress={() => setSelectedCycle('yearly')}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Save {yearlyDiscount.percent}%</Text>
              </View>
              <View style={styles.priceContent}>
                <Text style={styles.cycleLabel}>Yearly</Text>
                <Text style={styles.priceAmount}>{yearlyPrice.amount}</Text>
                <Text style={styles.priceSubtext}>{yearlyPrice.cycle}</Text>
              </View>
              {selectedCycle === 'yearly' && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.secondary} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Pro Benefits */}
          <View style={styles.benefits}>
            <BenefitRow icon="zap" text="Unlimited calculations & AI" />
            <BenefitRow icon="bell" text="Instant state alerts" />
            <BenefitRow icon="trending-up" text="Advanced analytics" />
            <BenefitRow icon="download" text="Export as PDF/CSV" />
          </View>

          {/* CTA Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.trialButton}
              onPress={handleStartTrial}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Text style={styles.trialButtonText}>Try 7 Days Free</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={handlePurchase}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.subscribeButtonText}>
                    Subscribe to {selectedCycle === 'monthly' ? 'Monthly' : 'Yearly'}
                  </Text>
                  <Text style={styles.subscribeButtonSubtext}>
                    After {selectedCycle === 'monthly' ? monthlyPrice.amount : yearlyPrice.amount}/month
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Fine Print */}
          <Text style={styles.fineprint}>
            Cancel anytime. 7-day free trial, then {monthlyPrice.amount}/month or {yearlyPrice.amount}/year.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function BenefitRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Ionicons name={icon as any} size={18} color={Colors.success} />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 60,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.lg,
  },
  content: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingSection: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  priceCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceCardSelected: {
    borderColor: Colors.secondary,
    backgroundColor: `${Colors.secondary}10`,
  },
  badge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.md,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  priceContent: {
    flex: 1,
  },
  cycleLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceAmount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
    color: Colors.textPrimary,
  },
  priceSubtext: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  checkmark: {
    marginLeft: Spacing.md,
  },
  benefits: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  benefitText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  actions: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  trialButton: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  trialButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: Colors.accent,
  },
  subscribeButton: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold as any,
    color: Colors.primary,
  },
  subscribeButtonSubtext: {
    fontSize: FontSize.xs,
    color: `${Colors.primary}80`,
    marginTop: 2,
  },
  fineprint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
});
