import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getProfile, saveProfile } from '../../utils/storage';
import { UserProfile } from '../../constants/types';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { checkRenewalStatus } from '../../utils/billing';
import { restorePurchases, getRevenueCatUserId, syncSubscriptionStatus } from '../../utils/iap';
import PaywallModal from '../../components/PaywallModal';
import { tap as hapticTap } from '../../utils/haptics';\nimport { SKILLED_OCCUPATIONS } from '../../constants/skilledOccupations';

const JOURNEY_STAGES = [
  { key: 'assess', label: 'Assess',   desc: 'Skills assessment & English test preparation' },
  { key: 'eoi',    label: 'EOI',      desc: 'Submit Expression of Interest on SkillSelect' },
  { key: 'invite', label: 'Invite',   desc: 'Received Invitation to Apply (ITA)' },
  { key: 'apply',  label: 'Apply',    desc: 'Lodge visa application with Home Affairs' },
  { key: 'grant',  label: 'Granted',  desc: '🎉 Visa granted — welcome to Australia!' },
];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    anzscoCode: '',
    isPremium: false,
    subscribedStates: [],
    subscribedOccupation: '',
    journeyStage: 0,
    pinnedStates: [],
    onboardingComplete: false,
  });
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [renewalDays, setRenewalDays] = useState<number | null>(null);
  const [renewalStatus, setRenewalStatus] = useState<'active' | 'expiring_soon' | 'expired'>('expired');
  const [rcUserId, setRcUserId] = useState<string>('');
  const [restoring, setRestoring] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      if (p.isPremium) {
        getRevenueCatUserId().then((uid) => {
          checkRenewalStatus(uid).then((res) => {
            setRenewalStatus(res.status);
            setRenewalDays(res.daysUntilExpiry ?? null);
          });
        });
      }
    });
    getRevenueCatUserId().then(setRcUserId);
  }, []);

  // Refresh profile after paywall closes (purchase may have set isPremium)
  const handlePaywallClose = () => {
    setShowPaywall(false);
    getProfile().then(setProfile);
  };

  const saveName = async () => {
    const updated = { ...profile, name: nameInput };
    await saveProfile({ name: nameInput });
    setProfile(updated);
    setEditingName(false);
  };

  const handleUpgrade = () => setShowPaywall(true);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.restored) {
        const updated = await getProfile();
        setProfile(updated);
      }
      Alert.alert(result.restored ? 'Restored ✓' : 'Not Found', result.message);
    } finally {
      setRestoring(false);
    }
  };

  const handleJourneyStage = async (stage: number) => {
    const updated = { ...profile, journeyStage: stage };
    await saveProfile({ journeyStage: stage });
    setProfile(updated);
    hapticSuccess();
  };

  const initials = profile.name
    ? profile.name.trim().split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header with avatar */}
      <LinearGradient
        colors={[Colors.primaryDark, '#0D1F38']}
        style={[styles.header, { paddingTop: insets.top + 60 }]}
      >
        {/* Decorative orb */}
        <View style={styles.headerOrb} />

        <View style={styles.avatarWrap}>
          <LinearGradient colors={[Colors.secondary, '#FFB800']} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          {profile.isPremium && (
            <View style={styles.premiumBadgeSmall}>
              <Ionicons name="star" size={10} color={Colors.primaryDark} />
            </View>
          )}
        </View>

        {editingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <TouchableOpacity onPress={saveName} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => { setNameInput(profile.name); setEditingName(true); }}
            style={styles.nameRow}
          >
            <Text style={styles.profileName}>{profile.name || 'Tap to set your name'}</Text>
            <Ionicons name="pencil" size={14} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        <View style={styles.planBadge}>
          {profile.isPremium
            ? <><Ionicons name="star" size={12} color={Colors.secondary} /><Text style={styles.planText}>Premium Member</Text></>
            : <><Ionicons name="person-outline" size={12} color={Colors.textMuted} /><Text style={[styles.planText, { color: Colors.textMuted }]}>Free Plan</Text></>
          }
        </View>
      </LinearGradient>

      {/* My Journey */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>My Journey</Text>
        <View style={styles.journeyCard}>
          <Text style={styles.journeyHint}>Tap your current stage to update progress</Text>
          <View style={styles.journeyTrack}>
            {JOURNEY_STAGES.map((stage, index) => {
              const isCompleted = index < (profile.journeyStage ?? 0);
              const isCurrent   = index === (profile.journeyStage ?? 0);
              return (
                <React.Fragment key={stage.key}>
                  <TouchableOpacity
                    style={styles.journeyStep}
                    onPress={() => handleJourneyStage(index)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.journeyDot,
                      isCompleted && styles.journeyDotDone,
                      isCurrent   && styles.journeyDotActive,
                    ]}>
                      {isCompleted
                        ? <Ionicons name="checkmark" size={12} color={Colors.primaryDark} />
                        : <Text style={[styles.journeyDotNum, isCurrent && { color: Colors.primaryDark }]}>{index + 1}</Text>
                      }
                    </View>
                    <Text style={[
                      styles.journeyLabel,
                      isCurrent   && styles.journeyLabelActive,
                      isCompleted && styles.journeyLabelDone,
                    ]}>{stage.label}</Text>
                  </TouchableOpacity>
                  {index < JOURNEY_STAGES.length - 1 && (
                    <View style={[styles.journeyLine, isCompleted && styles.journeyLineDone]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
          <View style={styles.journeyDetail}>
            <Text style={styles.journeyDetailTitle}>
              {JOURNEY_STAGES[profile.journeyStage ?? 0].label}
            </Text>
            <Text style={styles.journeyDetailSub}>
              {JOURNEY_STAGES[profile.journeyStage ?? 0].desc}
            </Text>
          </View>
        </View>
      </View>

      {/* Subscription card */}
      {profile.isPremium ? (
        <View style={styles.section}>
          <LinearGradient
            colors={['#0A3D1F', '#0D5C2E']}
            style={styles.premiumCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.premiumGlow} />
            <View style={styles.premiumLeft}>
              <View style={[styles.premiumIcon, { backgroundColor: 'rgba(0,214,143,0.2)' }]}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.premiumTitle}>Premium Plan</Text>
                {renewalDays !== null ? (
                  <Text style={[
                    styles.premiumSub,
                    renewalStatus === 'expiring_soon' && { color: '#FBBF24' },
                  ]}>
                    {renewalStatus === 'expiring_soon'
                      ? `⚠️ Expires in ${renewalDays} day${renewalDays === 1 ? '' : 's'}`
                      : `Renews in ${renewalDays} days`}
                  </Text>
                ) : (
                  <Text style={styles.premiumSub}>Active subscription</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.manageBillingBtn}
              onPress={() => Alert.alert('Manage Billing', 'To cancel or change your plan, go to:\n\niOS → Settings → Apple ID → Subscriptions\n\nAndroid → Play Store → Subscriptions')}
            >
              <Text style={styles.manageBillingText}>Manage</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      ) : (
        <View style={styles.section}>
          <TouchableOpacity onPress={handleUpgrade} activeOpacity={0.9}>
            <LinearGradient
              colors={['#2D1B6E', '#4C1D95']}
              style={styles.premiumCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.premiumGlow} />
              <View style={styles.premiumLeft}>
                <View style={styles.premiumIcon}>
                  <Ionicons name="star" size={20} color={Colors.secondary} />
                </View>
                <View>
                  <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                  <Text style={styles.premiumSub}>Unlock occupation tracking, custom alerts & more</Text>
                </View>
              </View>
              <View style={styles.premiumArrow}>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Settings rows */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Subscription</Text>
        <View style={styles.card}>
          <SettingRow
            icon={profile.isPremium ? 'star' : 'star-outline'}
            label="Plan"
            value={profile.isPremium ? 'Premium' : 'Free'}
          />
          {profile.isPremium && (
            <SettingRow
              icon="card-outline"
              label="Manage Billing"
              onPress={() => Alert.alert('Manage Billing', 'To cancel or change your plan, go to:\n\niOS → Settings → Apple ID → Subscriptions\n\nAndroid → Play Store → Subscriptions')}
              showArrow
            />
          )}
          <SettingRow
            icon="refresh-outline"
            label="Restore Purchases"
            onPress={handleRestore}
            showArrow
            loading={restoring}
            last
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.card}>
          <SettingRow
            icon="briefcase-outline"
            label="ANZSCO Occupation"
            value={
              profile.anzscoCode
                ? (() => {
                    const occ = SKILLED_OCCUPATIONS.find((o) => o.anzsco === profile.anzscoCode);
                    return occ ? `${profile.anzscoCode} · ${occ.name}` : profile.anzscoCode;
                  })()
                : 'Search occupation lists'
            }
            onPress={() => router.push('/occupations')}
            showArrow
          />
          <SettingRow icon="notifications-outline" label="State migration news" badge="Soon" />
          <SettingRow
            icon="alert-circle-outline"
            label="Occupation list changes"
            value="Active"
            onPress={() => router.push('/occupations')}
            showArrow
            last
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Resources</Text>
        <View style={styles.card}>
          <SettingRow
            icon="globe-outline"
            label="Official Source"
            value="immi.homeaffairs.gov.au"
            onPress={() => Linking.openURL('https://immi.homeaffairs.gov.au')}
            showArrow
          />
          <SettingRow
            icon="person-circle-outline"
            label="Find a MARA Agent"
            value="portal.mara.gov.au"
            onPress={() => Linking.openURL('https://portal.mara.gov.au')}
            showArrow
          />
          <SettingRow
            icon="list-outline"
            label="Skills Occupation List"
            onPress={() => router.push('/occupations')}
            showArrow
            last
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.card}>
          <SettingRow
            icon="chatbubble-ellipses-outline"
            label="Send Feedback"
            value="Ideas, complaints, suggestions"
            onPress={() => setShowFeedback(true)}
            showArrow
            last
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}>
          <SettingRow icon="information-circle-outline" label="MigrateAU" value="v1.0.0" />
          <SettingRow
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://jsmglobal.xyz/migration-privacy.html')}
            showArrow
          />
          <SettingRow icon="logo-github" label="By JSM Global" value="jsmglobal.xyz" />
          <SettingRow icon="key-outline" label="Account ID" value={rcUserId ? rcUserId.slice(0, 18) + '…' : '—'} last />
        </View>
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="alert-circle-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.disclaimerText}>
          Information is general in nature. Always consult a{' '}
          <Text
            style={styles.disclaimerLink}
            onPress={() => Linking.openURL('https://portal.mara.gov.au')}
          >
            MARA-registered migration agent
          </Text>
          {' '}for formal advice.
        </Text>
      </View>

      <PaywallModal
        visible={showPaywall}
        onClose={handlePaywallClose}
        userId={rcUserId || 'anonymous'}
        title="Upgrade to Premium"
        message="Unlock ANZSCO tracking, custom state alerts, and unlimited Aria AI."
        feature="premium"
      />

      {/* Feedback sheet */}
      <Modal
        visible={showFeedback}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFeedback(false)}
      >
        <View style={feedbackStyles.backdrop}>
          <View style={[feedbackStyles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={feedbackStyles.handle} />
            <Text style={feedbackStyles.title}>Get in Touch</Text>
            <Text style={feedbackStyles.subtitle}>We read every message and aim to reply within 48 hours.</Text>

            {([
              {
                icon: 'bulb-outline',
                label: 'Suggestion',
                desc: 'Feature idea or improvement',
                subject: 'MigrateAU – Suggestion',
                body: 'Hi MigrateAU team,\n\nI have a suggestion:\n\n',
              },
              {
                icon: 'happy-outline',
                label: 'Feedback',
                desc: 'Tell us what you think',
                subject: 'MigrateAU – Feedback',
                body: 'Hi MigrateAU team,\n\nHere is my feedback:\n\n',
              },
              {
                icon: 'bug-outline',
                label: 'Report a Bug',
                desc: 'Something not working right',
                subject: 'MigrateAU – Bug Report',
                body: 'Hi MigrateAU team,\n\nI found an issue:\n\nSteps to reproduce:\n1. \n\nExpected behaviour:\n\nActual behaviour:\n\n',
              },
              {
                icon: 'alert-circle-outline',
                label: 'Complaint',
                desc: 'Let us know what went wrong',
                subject: 'MigrateAU – Complaint',
                body: 'Hi MigrateAU team,\n\nI would like to raise a concern:\n\n',
              },
            ] as const).map((item, i, arr) => (
              <TouchableOpacity
                key={item.label}
                style={[feedbackStyles.option, i < arr.length - 1 && feedbackStyles.optionBorder]}
                activeOpacity={0.75}
                onPress={() => {
                  setShowFeedback(false);
                  const mailto = `mailto:support@jsmglobal.xyz?subject=${encodeURIComponent(item.subject)}&body=${encodeURIComponent(item.body)}`;
                  Linking.openURL(mailto);
                }}
              >
                <View style={feedbackStyles.optionIcon}>
                  <Ionicons name={item.icon as any} size={20} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={feedbackStyles.optionLabel}>{item.label}</Text>
                  <Text style={feedbackStyles.optionDesc}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={feedbackStyles.cancelBtn}
              onPress={() => setShowFeedback(false)}
              activeOpacity={0.8}
            >
              <Text style={feedbackStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SettingRow({
  icon, label, value, badge, locked, onPress, showArrow, last, loading,
}: {
  icon: string; label: string; value?: string; badge?: string; locked?: boolean; onPress?: () => void; showArrow?: boolean; last?: boolean; loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[rowStyles.row, !last && rowStyles.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={(!onPress && !showArrow) || loading}
    >
      <View style={rowStyles.iconWrap}>
        <Ionicons name={icon as any} size={18} color={locked ? Colors.textMuted : Colors.textSecondary} />
      </View>
      <Text style={[rowStyles.label, locked && rowStyles.labelMuted]}>{label}</Text>
      <View style={rowStyles.right}>
        {loading
          ? <ActivityIndicator size="small" color={Colors.textMuted} />
          : <>
              {value && <Text style={rowStyles.value}>{value}</Text>}
              {badge && <View style={rowStyles.badge}><Text style={rowStyles.badgeText}>{badge}</Text></View>}
              {locked && <Ionicons name="lock-closed" size={14} color={Colors.textMuted} />}
              {showArrow && <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
            </>
        }
      </View>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  labelMuted: { color: Colors.textMuted },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  value: { fontSize: FontSize.sm, color: Colors.textMuted },
  badge: {
    backgroundColor: Colors.secondary + '20',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: FontSize.xs, color: Colors.secondary, fontWeight: FontWeight.bold },
});

const feedbackStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  handle: {
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  optionIcon: {
    width: 38, height: 38,
    borderRadius: Radius.md,
    backgroundColor: `${Colors.accent}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
  },
  optionDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  cancelBtn: {
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.glass,
    alignItems: 'center',
  },
  cancelText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.semiBold },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    overflow: 'hidden',
  },
  headerOrb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.secondary,
    opacity: 0.04,
    top: -60,
    right: -40,
  },
  avatarWrap: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold, color: Colors.primaryDark },
  manageBillingBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  manageBillingText: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
  },
  premiumBadgeSmall: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryDark,
  },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  profileName: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  nameInput: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    borderBottomWidth: 2,
    borderBottomColor: Colors.secondary,
    minWidth: 160,
    paddingBottom: 2,
  },
  saveBtn: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  saveBtnText: { color: Colors.primaryDark, fontWeight: FontWeight.bold, fontSize: FontSize.sm },

  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  planText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.secondary },

  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Premium card
  premiumCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(167,139,250,0.2)',
    top: -40,
    right: -20,
  },
  premiumLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  premiumIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,205,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,205,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  premiumSub: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2, maxWidth: 200 },
  premiumArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

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

  /* My Journey tracker */
  journeyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  journeyHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  journeyTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  journeyStep: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  journeyDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyDotActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  journeyDotDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  journeyDotNum: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
  },
  journeyLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 0.2,
  },
  journeyLabelActive: { color: Colors.secondary },
  journeyLabelDone:   { color: Colors.success },
  journeyLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginBottom: 18,
  },
  journeyLineDone: { backgroundColor: Colors.success },
  journeyDetail: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  journeyDetailTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  journeyDetailSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
