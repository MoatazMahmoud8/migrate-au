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
import { startFreeTrialIAP, purchaseSubscription, getFormattedPrice, getYearlySavings, getLifetimeSavings, syncSubscriptionStatus } from '../utils/iap';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  title: string;
  message: string;
  feature?: string;
}

const BENEFITS = [
  { icon: 'sparkles-outline',          text: 'Aria AI — unlimited expert visa consultant' },
  { icon: 'calculator-outline',        text: 'Unlimited points calculations' },
  { icon: 'briefcase-outline',         text: 'Unlimited ANZSCO occupation searches' },
  { icon: 'lightning-outline',         text: 'Real-time SkillSelect & state alerts' },
  { icon: 'location-outline',          text: 'State subscriptions (unlimited)' },
  { icon: 'document-outline',          text: 'PDF export of your visa journey' },
  { icon: 'shield-checkmark-outline',  text: 'Age-bracket point-drop alerts' },
  { icon: 'map-outline',               text: 'Track up to 10 visa journeys' },
  { icon: 'moon-outline',              text: 'Dark mode support' },
  { icon: 'archive-outline',           text: 'Full 18-month notification history' },
];

export function PaywallModal({ visible, onClose, userId, title, message, feature }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const success = await startFreeTrialIAP(userId);
      if (success) {
        await syncSubscriptionStatus();
        onClose();
      } else { alert('Could not start trial. Please try again.'); }
    } catch (e: any) { alert('Error starting trial: ' + (e?.message || 'unknown error')); }
    finally { setLoading(false); }
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const result = await purchaseSubscription(userId, selectedCycle);
      if (result.success) {
        await syncSubscriptionStatus();
        onClose();
      } else if (result.cancelled) {
        // user dismissed sheet — stay silent
      } else {
        alert(result.message || 'Purchase failed. Please try again.');
      }
    } catch (e: any) { alert('Error: ' + (e?.message || 'unknown error')); }
    finally { setLoading(false); }
  };

  const monthlyPrice = getFormattedPrice('monthly');
  const yearlyPrice  = getFormattedPrice('yearly');
  const lifetimePrice = getFormattedPrice('lifetime');
  const yearlyDiscount = getYearlySavings();

  // Context-specific messaging
  const getFeatureMessage = () => {
    switch (feature) {
      case 'aiMessages':
        return '3 expert consultation questions per month isn\'t enough for your visa journey. Aria is here 24/7 to guide you through every step.';
      case 'calculator':
        return 'Track every point in your visa strategy. 3 calculations per month limits your planning. Go unlimited with Premium.';
      case 'anzscoSearches':
        return 'Find the perfect occupation for your visa. Free tier limits research. Search unlimited occupations.';
      case 'journey':
        return 'One visa application? You deserve to track multiple pathways (189, 491, state nomination) simultaneously.';
      case 'realtimeAlerts':
        return 'Miss one SkillSelect round and you\'re waiting 6+ months. Get real-time alerts on your phone, not daily summaries.';
      case 'pdfExport':
        return 'Export your visa journey as a PDF — keep official records, share with agents, save offline.';
      default:
        return message;
    }
  };

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
              <Text style={styles.heroSub}>{getFeatureMessage()}</Text>
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

              {/* Yearly — most popular */}
              <TouchableOpacity
                style={[styles.planCard, styles.planCardYearly, selectedCycle === 'yearly' && styles.planCardActive]}
                onPress={() => setSelectedCycle('yearly')}
                activeOpacity={0.8}
              >
                <View style={styles.badgeWrap} pointerEvents="none">
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText} numberOfLines={1}>POPULAR</Text>
                  </View>
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
                <Text style={styles.planSub}>Save {yearlyDiscount.percent}%</Text>
              </TouchableOpacity>

              {/* Lifetime — ultimate choice */}
              <TouchableOpacity
                style={[styles.planCard, selectedCycle === 'lifetime' && styles.planCardActive]}
                onPress={() => setSelectedCycle('lifetime')}
                activeOpacity={0.8}
              >
                <View style={styles.badgeWrap} pointerEvents="none">
                  <View style={[styles.saveBadge, styles.lifetimeBadge]}>
                    <Text style={styles.saveBadgeText} numberOfLines={1}>BEST DEAL</Text>
                  </View>
                </View>
                {selectedCycle === 'lifetime' && (
                  <View style={styles.planCheck}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.secondary} />
                  </View>
                )}
                <Text style={[styles.planCycle, selectedCycle === 'lifetime' && styles.planCycleActive]}>Lifetime</Text>
                <Text style={[styles.planPrice, selectedCycle === 'lifetime' && styles.planPriceActive]}>
                  {lifetimePrice.amount}
                </Text>
                <Text style={styles.planSub}>Pay once · own forever</Text>
              </TouchableOpacity>
            </View>

            {/* CTAs — above the fold */}
            <View style={styles.actions}>
              {/* Primary: Subscribe (highlighted) */}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handlePurchase}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[Colors.secondary, '#FFB800']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGrad}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.primaryDark} />
                  ) : (
                    <>
                      <Ionicons name="flash" size={18} color={Colors.primaryDark} />
                      <Text style={styles.primaryBtnText}>
                        {selectedCycle === 'lifetime'
                          ? `Buy Lifetime — ${lifetimePrice.amount}`
                          : `Subscribe — ${selectedCycle === 'monthly' ? `${monthlyPrice.amount}/mo` : `${yearlyPrice.amount}/yr`}`}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

            </View>

            <Text style={styles.fineprint}>
              {selectedCycle === 'lifetime'
                ? `One-time payment · No recurring charges · ${lifetimePrice.amount}`
                : `Cancel anytime · Auto-renews · ${monthlyPrice.amount}/mo or ${yearlyPrice.amount}/yr`}
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
    paddingTop: Spacing.xl,
    position: 'relative',
    minHeight: 96,
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
  badgeWrap: {
    position: 'absolute',
    top: -10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  saveBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    maxWidth: '95%',
  },
  lifetimeBadge: {
    backgroundColor: Colors.secondary,
  },
  saveBadgeText: {
    fontSize: FontSize.xxs ?? 10,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    letterSpacing: 0.4,
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
  primaryBtn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  primaryBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 4,
  },
  primaryBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
  },
  secondaryBtnText: {
    fontSize: FontSize.sm,
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
