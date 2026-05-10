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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getProfile, saveProfile } from '../../utils/storage';
import { UserProfile } from '../../constants/types';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checkRenewalStatus } from '../../utils/billing';
import PaywallModal from '../../components/PaywallModal';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    anzscoCode: '',
    isPremium: false,
    subscribedStates: [],
    subscribedOccupation: '',
  });
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [renewalDays, setRenewalDays] = useState<number | null>(null);
  const [renewalStatus, setRenewalStatus] = useState<'active' | 'expiring_soon' | 'expired'>('expired');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      if (p.isPremium) {
        // Use a placeholder userId — replace with real auth uid when auth is wired
        checkRenewalStatus('local_user').then((res) => {
          setRenewalStatus(res.status);
          setRenewalDays(res.daysUntilExpiry ?? null);
        });
      }
    });
  }, []);

  const saveName = async () => {
    const updated = { ...profile, name: nameInput };
    await saveProfile({ name: nameInput });
    setProfile(updated);
    setEditingName(false);
  };

  const handleUpgrade = () => setShowPaywall(true);

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
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <SettingRow
            icon="briefcase-outline"
            label="ANZSCO Occupation"
            value={profile.isPremium ? (profile.anzscoCode || 'Not set') : 'Premium only'}
            locked={!profile.isPremium}
            onPress={profile.isPremium ? undefined : handleUpgrade}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <SettingRow icon="notifications-outline" label="State migration news" badge="Soon" />
          <SettingRow icon="briefcase-outline" label="Occupation list changes" badge="Soon" last />
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
          <SettingRow
            icon="globe-outline"
            label="Official Source"
            value="immi.homeaffairs.gov.au"
            onPress={() => Linking.openURL('https://immi.homeaffairs.gov.au')}
            showArrow
          />
          <SettingRow icon="logo-github" label="By JSM Global" value="jsmglobal.xyz" last />
        </View>
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="alert-circle-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.disclaimerText}>
          Information is general in nature. Always consult a MARA-registered migration agent for formal advice.
        </Text>
      </View>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        userId="local_user"
        title="Upgrade to Premium"
        message="Unlock ANZSCO tracking, custom state alerts, and unlimited Aria AI."
        feature="premium"
      />
    </ScrollView>
  );
}

function SettingRow({
  icon, label, value, badge, locked, onPress, showArrow, last,
}: {
  icon: string; label: string; value?: string; badge?: string; locked?: boolean; onPress?: () => void; showArrow?: boolean; last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[rowStyles.row, !last && rowStyles.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !showArrow}
    >
      <View style={rowStyles.iconWrap}>
        <Ionicons name={icon as any} size={18} color={locked ? Colors.textMuted : Colors.textSecondary} />
      </View>
      <Text style={[rowStyles.label, locked && rowStyles.labelMuted]}>{label}</Text>
      <View style={rowStyles.right}>
        {value && <Text style={rowStyles.value}>{value}</Text>}
        {badge && <View style={rowStyles.badge}><Text style={rowStyles.badgeText}>{badge}</Text></View>}
        {locked && <Ionicons name="lock-closed" size={14} color={Colors.textMuted} />}
        {showArrow && <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
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
});
