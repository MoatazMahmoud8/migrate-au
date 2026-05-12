import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { startFreeTrialIAP, purchaseSubscription, getFormattedPrice, getYearlySavings, syncSubscriptionStatus } from '../utils/iap';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  title: string;
  message: string;
  feature?: string;
}

const BENEFITS = [
  { icon: 'infinite-outline',          text: 'Unlimited Aria AI — your migration consultant' },
  { icon: 'map-outline',               text: 'Golden Path — personalised 5-stage roadmap' },
  { icon: 'shield-checkmark-outline',  text: 'Document expiry & age-bracket alerts' },
  { icon: 'location-outline',          text: 'State-specific occupation intelligence' },
  { icon: 'trending-up-outline',       text: 'Gap Filler — reach 90 / 95+ points' },
  { icon: 'document-text-outline',     text: 'Full Migration Audit Report (PDF)' },
  { icon: 'notifications-outline',     text: 'Instant state nomination alerts' },
];

export function PaywallModal({ visible, onClose, userId, title, message, feature }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('yearly');

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const success = await startFreeTrialIAP(userId);
      if (success) {
        await syncSubscriptionStatus();
        onClose();
      } else { alert('Could not start trial. Please try again.'); }
    } catch { alert('Error starting trial. Please try again.'); }
    finally { setLoading(false); }
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const success = await purchaseSubscription(userId, selectedCycle);
      if (success) {
        await syncSubscriptionStatus();
        onClose();
      } else { alert('Purchase cancelled or failed. Please try again.'); }
    } catch { alert('Error processing purchase. Please try again.'); }
    finally { setLoading(false); }
  };

  const monthlyPrice = getFormattedPrice('monthly');
  const yearlyPrice  = getFormattedPrice('yearly');
  const yearlyDiscount = getYearlySavings();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Hero */}
            <View style={styles.hero}>
              <LinearGradient colors={['#3D1F8A', '#5B2D9E']} style={styles.heroIcon}>
                <Ionicons name="star" size={32} color={Colors.secondary} />
              </LinearGradient>
              <Text style={styles.heroTitle}>{title}</Text>
              <Text style={styles.heroSub}>{message}</Text>
            </View>

            {/* Plan selector */}
            <View style={styles.planRow}>
              {/* Monthly */}
              <TouchableOpacity
                style={[styles.planCard, selectedCycle === 'monthly' && styles.planCardActive]}
                onPress={() => setSelectedCycle('monthly')}
                activeOpacity={0.8}
              >
                {selectedCycle === 'monthly' && (
                  <View style={styles.planCheck}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.secondary} />
                  </View>
                )}
                <Text style={[styles.planCycle, selectedCycle === 'monthly' && styles.planCycleActive]}>Monthly</Text>
                <Text style={[styles.planPrice, selectedCycle === 'monthly' && styles.planPriceActive]}>
                  {monthlyPrice.amount}
                </Text>
                <Text style={styles.planSub}>{monthlyPrice.cycle}</Text>
              </TouchableOpacity>

              {/* Yearly — recommended */}
              <TouchableOpacity
                style={[styles.planCard, styles.planCardYearly, selectedCycle === 'yearly' && styles.planCardActive]}
                onPress={() => setSelectedCycle('yearly')}
                activeOpacity={0.8}
              >
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Save {yearlyDiscount.percent}%</Text>
                </View>
                {selectedCycle === 'yearly' && (
                  <View style={styles.planCheck}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.secondary} />
                  </View>
                )}
                <Text style={[styles.planCycle, selectedCycle === 'yearly' && styles.planCycleActive]}>Yearly</Text>
                <Text style={[styles.planPrice, selectedCycle === 'yearly' && styles.planPriceActive]}>
                  {yearlyPrice.amount}
                </Text>
                <Text style={styles.planSub}>{yearlyPrice.cycle}</Text>
              </TouchableOpacity>
            </View>

            {/* CTAs — above the fold */}
            <View style={styles.actions}>
              {/* Primary: Start Trial */}
              <TouchableOpacity
                style={styles.trialBtn}
                onPress={handleStartTrial}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[Colors.secondary, '#FFB800']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.trialBtnGrad}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="gift-outline" size={18} color={Colors.primaryDark} />
                      <Text style={styles.trialBtnText}>Start 7-Day Free Trial</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Secondary: Subscribe */}
              <TouchableOpacity
                style={styles.subscribeBtn}
                onPress={handlePurchase}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.textPrimary} />
                ) : (
                  <Text style={styles.subscribeBtnText}>
                    Subscribe — {selectedCycle === 'monthly' ? `${monthlyPrice.amount}/mo` : `${yearlyPrice.amount}/yr`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.fineprint}>
              Cancel anytime · Auto-renews · {monthlyPrice.amount}/mo or {yearlyPrice.amount}/yr after trial
            </Text>

            {/* Benefits — below the fold as supporting detail */}
            <View style={styles.benefitsDivider}>
              <View style={styles.benefitsDividerLine} />
              <Text style={styles.benefitsDividerText}>What you get</Text>
              <View style={styles.benefitsDividerLine} />
            </View>
            <View style={styles.benefits}>
              {BENEFITS.map(({ icon, text }) => (
                <View key={text} style={styles.benefitRow}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name={icon as any} size={14} color={Colors.secondary} />
                  </View>
                  <Text style={styles.benefitText}>{text}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 48,
    maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: Colors.divider,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.xl,
    right: Spacing.lg,
    zIndex: 10,
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Hero */
  hero: { alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  heroIcon: {
    width: 52, height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extraBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  heroSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.xl,
  },

  /* Plan cards */
  planRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  planCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    paddingTop: Spacing.lg,
    position: 'relative',
    minHeight: 90,
    justifyContent: 'center',
  },
  planCardYearly: {
    borderColor: Colors.divider,
  },
  planCardActive: {
    borderColor: Colors.secondary,
    backgroundColor: `${Colors.secondary}12`,
  },
  planCheck: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  saveBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  saveBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  planCycle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
  },
  planCycleActive: { color: Colors.secondary },
  planPrice: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extraBold,
    color: Colors.textPrimary,
  },
  planPriceActive: { color: Colors.textPrimary },
  planSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  /* Benefits */
  benefitsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  benefitsDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  benefitsDividerText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  benefits: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  benefitIcon: {
    width: 24, height: 24,
    borderRadius: 6,
    backgroundColor: `${Colors.secondary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 17,
  },

  /* Actions */
  actions: { gap: Spacing.sm, marginBottom: Spacing.sm },
  trialBtn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  trialBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
  },
  trialBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  subscribeBtn: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  subscribeBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
  },

  fineprint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default PaywallModal;
