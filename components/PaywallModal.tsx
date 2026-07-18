import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { useColors } from '../constants/ThemeContext';
import { startFreeTrialIAP, purchaseSubscription, restorePurchases, getFormattedPrice, getYearlySavings, getLifetimeSavings, syncSubscriptionStatus } from '../utils/iap';

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
  { icon: 'flash-outline',             text: 'Real-time SkillSelect & state alerts' },
  { icon: 'location-outline',          text: 'State subscriptions (unlimited)' },
  { icon: 'document-outline',          text: 'PDF export of your visa journey' },
  { icon: 'shield-checkmark-outline',  text: 'Age-bracket point-drop alerts' },
  { icon: 'map-outline',               text: 'Track up to 10 visa journeys' },
  { icon: 'moon-outline',              text: 'Dark mode support' },
  { icon: 'archive-outline',           text: 'Full 18-month notification history' },
];

export function PaywallModal({ visible, onClose, userId, title, message, feature }: PaywallModalProps) {
  const Colors = useColors();
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
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  const manageSubscriptionsUrl = isAndroid
    ? 'https://play.google.com/store/account/subscriptions?package=com.jsmglobal.migration_au'
    : 'https://apps.apple.com/account/subscriptions';

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
      <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[styles.modal, { backgroundColor: Colors.background }]}>
          {/* Handle bar */}
          <View style={[styles.handle, { backgroundColor: Colors.divider }]} />

          {/* Close */}
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: Colors.surface }]} onPress={onClose}>
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Hero */}
            <View style={styles.hero}>
              <LinearGradient colors={['#3D1F8A', '#5B2D9E']} style={styles.heroIcon}>
                <Ionicons name="star" size={32} color={Colors.secondary} />
              </LinearGradient>
              <Text style={[styles.heroTitle, { color: Colors.textPrimary }]}>{title}</Text>
              <Text style={[styles.heroSub, { color: Colors.textSecondary }]}>{getFeatureMessage()}</Text>
            </View>

            {/* Plan selector */}
            <View style={styles.planRow}>
              {/* Monthly */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  { backgroundColor: Colors.surface, borderColor: Colors.border },
                  selectedCycle === 'monthly' && { backgroundColor: `${Colors.secondary}12`, borderColor: Colors.secondary },
                ]}
                onPress={() => setSelectedCycle('monthly')}
                activeOpacity={0.8}
              >
                {selectedCycle === 'monthly' && (
                  <View style={styles.planCheck}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.secondary} />
                  </View>
                )}
                <Text style={[styles.planCycle, { color: Colors.textMuted }, selectedCycle === 'monthly' && styles.planCycleActive]}>Monthly</Text>
                <Text style={[styles.planPrice, { color: Colors.textPrimary }, selectedCycle === 'monthly' && styles.planPriceActive]}>
                  {monthlyPrice.amount}
                </Text>
                <Text style={[styles.planSub, { color: Colors.textMuted }]}>{monthlyPrice.cycle}</Text>
              </TouchableOpacity>

              {/* Yearly — most popular */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  styles.planCardYearly,
                  { backgroundColor: Colors.surface, borderColor: Colors.border },
                  selectedCycle === 'yearly' && { backgroundColor: `${Colors.secondary}12`, borderColor: Colors.secondary },
                ]}
                onPress={() => setSelectedCycle('yearly')}
                activeOpacity={0.8}
              >
                <View style={styles.badgeWrap} pointerEvents="none">
                  <View style={[styles.saveBadge, { backgroundColor: Colors.secondary }]}
                  >
                    <Text style={[styles.saveBadgeText, { color: Colors.primaryDark }]} numberOfLines={1}>POPULAR</Text>
                  </View>
                </View>
                {selectedCycle === 'yearly' && (
                  <View style={styles.planCheck}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.secondary} />
                  </View>
                )}
                <Text style={[styles.planCycle, { color: Colors.textMuted }, selectedCycle === 'yearly' && styles.planCycleActive]}>Yearly</Text>
                <Text style={[styles.planPrice, { color: Colors.textPrimary }, selectedCycle === 'yearly' && styles.planPriceActive]}>
                  {yearlyPrice.amount}
                </Text>
                <Text style={[styles.planSub, { color: Colors.textMuted }]}>Save {yearlyDiscount.percent}%</Text>
              </TouchableOpacity>

              {/* Lifetime — ultimate choice */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  { backgroundColor: Colors.surface, borderColor: Colors.border },
                  selectedCycle === 'lifetime' && { backgroundColor: `${Colors.secondary}12`, borderColor: Colors.secondary },
                ]}
                onPress={() => setSelectedCycle('lifetime')}
                activeOpacity={0.8}
              >
                <View style={styles.badgeWrap} pointerEvents="none">
                  <View style={[styles.saveBadge, styles.lifetimeBadge, { backgroundColor: Colors.secondary }]}
                  >
                    <Text style={[styles.saveBadgeText, { color: Colors.primaryDark }]} numberOfLines={1}>BEST DEAL</Text>
                  </View>
                </View>
                {selectedCycle === 'lifetime' && (
                  <View style={styles.planCheck}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.secondary} />
                  </View>
                )}
                <Text style={[styles.planCycle, { color: Colors.textMuted }, selectedCycle === 'lifetime' && styles.planCycleActive]}>Lifetime</Text>
                <Text style={[styles.planPrice, { color: Colors.textPrimary }, selectedCycle === 'lifetime' && styles.planPriceActive]}>
                  {lifetimePrice.amount}
                </Text>
                <Text style={[styles.planSub, { color: Colors.textMuted }]}>Pay once · own forever</Text>
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
                      <Text style={[styles.primaryBtnText, { color: Colors.primaryDark }]}>
                        {selectedCycle === 'lifetime'
                          ? `Buy Lifetime — ${lifetimePrice.amount}`
                          : `Subscribe — ${selectedCycle === 'monthly' ? `${monthlyPrice.amount}/mo` : `${yearlyPrice.amount}/yr`}`}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

            </View>

            <Text style={[styles.fineprint, { color: Colors.textMuted }]}>
              {selectedCycle === 'lifetime'
                ? `One-time payment · No recurring charges · ${lifetimePrice.amount}`
                : `Cancel anytime · Auto-renews · ${monthlyPrice.amount}/mo or ${yearlyPrice.amount}/yr`}
            </Text>

            {/* Subscription legal links */}
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={async () => {
                setLoading(true);
                const result = await restorePurchases();
                setLoading(false);
                if (result.restored) { await syncSubscriptionStatus(); onClose(); }
                Alert.alert(result.restored ? 'Restored ✓' : 'Not Found', result.message);
              }}>
                <Text style={[styles.legalLinkText, {color: Colors.accent}]}>Restore Purchases</Text>
              </TouchableOpacity>
              <Text style={[styles.legalSeparator, {color: Colors.textPrimary}]}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://jsmglobal.xyz/migration-privacy.html')}>
                <Text style={[styles.legalLinkText, {color: Colors.textPrimary}]}>Privacy Policy</Text>
              </TouchableOpacity>
              {isIOS && (
                <>
                  <Text style={[styles.legalSeparator, {color: Colors.textPrimary}]}>·</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                    <Text style={[styles.legalLinkText, {color: Colors.textPrimary}]}>Terms of Use (EULA)</Text>
                  </TouchableOpacity>
                </>
              )}
              <Text style={[styles.legalSeparator, {color: Colors.textPrimary}]}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL(manageSubscriptionsUrl)}>
                <Text style={[styles.legalLinkText, {color: Colors.textPrimary}]}>Manage Subscriptions</Text>
              </TouchableOpacity>
            </View>

            {/* Benefits — below the fold as supporting detail */}
            <View style={styles.benefitsDivider}>
              <View style={[styles.benefitsDividerLine, { backgroundColor: Colors.border }]} />
              <Text style={[styles.benefitsDividerText, { color: Colors.textMuted }]}>What you get</Text>
              <View style={[styles.benefitsDividerLine, { backgroundColor: Colors.border }]} />
            </View>
            <View style={styles.benefits}>
              {BENEFITS.map(({ icon, text }) => (
                <View key={text} style={styles.benefitRow}>
                  <View style={[styles.benefitIcon, { backgroundColor: `${Colors.secondary}15` }]}>
                    <Ionicons name={icon as any} size={14} color={Colors.secondary} />
                  </View>
                  <Text style={[styles.benefitText, { color: Colors.textSecondary }]}>{text}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modal: {
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
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  heroSub: {
    fontSize: FontSize.xs,
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
    borderRadius: Radius.xl,
    borderWidth: 2,
    padding: Spacing.md,
    alignItems: 'center',
    paddingTop: Spacing.xl,
    position: 'relative',
    minHeight: 96,
    justifyContent: 'center',
  },
  planCardYearly: {
  },
  planCardActive: {},
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    maxWidth: '95%',
  },
  lifetimeBadge: {
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
  },
  planCycle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
  },
  planCycleActive: { },
  planPrice: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extraBold,
  },
  planPriceActive: { },
  planSub: {
    fontSize: FontSize.xs,
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
  },
  benefitsDividerText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  benefits: {
    borderRadius: Radius.xl,
    borderWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: FontSize.xs,
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
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingVertical: Spacing.md,
  },
  secondaryBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
  },

  fineprint: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },
  legalLinkText: {
    fontSize: FontSize.xs,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: FontSize.xs,
    marginHorizontal: 6,
  },
});

export default PaywallModal;
