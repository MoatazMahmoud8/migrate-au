import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getProfile, saveProfile } from '../../utils/storage';
import { UserProfile } from '../../constants/types';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';

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

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  const saveName = async () => {
    const updated = { ...profile, name: nameInput };
    await saveProfile({ name: nameInput });
    setProfile(updated);
    setEditingName(false);
  };

  const handleUpgrade = () => {
    Alert.alert(
      'Upgrade to Premium',
      'Premium features:\n• ANZSCO occupation tracker\n• Custom state notifications\n• AI consultant unlimited access\n\nRevenueCat integration coming soon.',
      [{ text: 'OK' }],
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        {editingName ? (
          <View style={styles.nameEdit}>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor={Colors.white + '80'}
              autoFocus
            />
            <TouchableOpacity onPress={saveName} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => { setNameInput(profile.name); setEditingName(true); }}>
            <Text style={styles.profileName}>
              {profile.name || 'Tap to set your name'} <Ionicons name="pencil" size={14} color={Colors.white + '99'} />
            </Text>
          </TouchableOpacity>
        )}
        <Text style={styles.profileSub}>
          {profile.isPremium ? '⭐ Premium Member' : 'Free Plan'}
        </Text>
      </LinearGradient>

      {/* Premium Banner */}
      {!profile.isPremium && (
        <TouchableOpacity style={styles.premiumBanner} onPress={handleUpgrade}>
          <LinearGradient colors={['#6554C0', '#8777D9']} style={styles.premiumGrad}>
            <View>
              <Text style={styles.premiumTitle}>Upgrade to Premium ⭐</Text>
              <Text style={styles.premiumSub}>Unlock all features — occupation tracking, custom alerts & more</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ANZSCO Occupation */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Occupation (ANZSCO)</Text>
        <View style={styles.lockedRow}>
          <Ionicons name={profile.isPremium ? 'briefcase' : 'lock-closed'} size={20} color={profile.isPremium ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.lockedText, !profile.isPremium && styles.lockedMuted]}>
            {profile.isPremium
              ? (profile.anzscoCode || 'Set your ANZSCO code')
              : 'Premium feature — upgrade to track your occupation'}
          </Text>
        </View>
      </View>

      {/* Notification Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notifications</Text>
        <View style={styles.settingRow}>
          <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.settingText}>State migration news alerts</Text>
          <Text style={styles.comingSoon}>Soon</Text>
        </View>
        <View style={styles.settingRow}>
          <Ionicons name="briefcase-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.settingText}>Occupation list changes</Text>
          <Text style={styles.comingSoon}>Soon</Text>
        </View>
      </View>

      {/* About */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        <View style={styles.settingRow}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.settingText}>MigrateAU v1.0.0</Text>
        </View>
        <View style={styles.settingRow}>
          <Ionicons name="shield-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.settingText}>Privacy Policy</Text>
          <Ionicons name="open-outline" size={16} color={Colors.textMuted} />
        </View>
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <Ionicons name="alert-circle-outline" size={20} color={Colors.textSecondary} />
          <Text style={[styles.settingText, { flex: 1 }]}>
            Information is general in nature. Always consult a registered migration agent (MARA).
          </Text>
        </View>
      </View>

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { alignItems: 'center', padding: Spacing.xl, paddingVertical: Spacing.xxxl },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: FontSize.xxxl, fontWeight: FontWeight.bold, color: Colors.primary },
  profileName: { color: Colors.white, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  profileSub: { color: Colors.white + 'AA', fontSize: FontSize.sm, marginTop: Spacing.xs },
  nameEdit: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nameInput: {
    color: Colors.white,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    borderBottomWidth: 2,
    borderBottomColor: Colors.secondary,
    minWidth: 160,
    paddingBottom: 2,
  },
  saveBtn: { backgroundColor: Colors.secondary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
  saveBtnText: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  premiumBanner: { margin: Spacing.lg, borderRadius: Radius.lg, overflow: 'hidden' },
  premiumGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  premiumTitle: { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  premiumSub: { color: Colors.white + 'CC', fontSize: FontSize.sm, marginTop: 2, maxWidth: '90%' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    margin: Spacing.lg,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.sm },
  lockedText: { fontSize: FontSize.md, color: Colors.textPrimary },
  lockedMuted: { color: Colors.textMuted },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  settingText: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  comingSoon: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: FontWeight.semiBold,
    backgroundColor: Colors.warningLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
});
