import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useColors } from '../../constants/ThemeContext';
import { saveDraft, approveDraft, rejectDraft, editDraft, deleteNotification, deleteDraft, getDrafts, getPublishedNotifications, NOTIFICATION_CATEGORIES, validateNotification } from '../../utils/admin';
import { tap as hapticTap, success as hapticSuccess } from '../../utils/haptics';

interface NotificationDraft {
  title: string;
  body: string;
  category: string;
  source: string;
  link: string;
}

export default function AdminDashboard() {
  const Colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'manage' | 'security'>('compose');
  const [drafts, setDrafts] = useState<any[]>([]);
  const [published, setPublished] = useState<any[]>([]);
  const [loadingManage, setLoadingManage] = useState(false);
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totpSecret, setTotpSecret] = useState<FirebaseAuthTypes.TotpSecret | null>(null);
  const [totpUrl, setTotpUrl] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [securityBusy, setSecurityBusy] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  const [draft, setDraft] = useState<NotificationDraft>({
    title: '',
    body: '',
    category: 'News',
    source: 'Admin',
    link: '',
  });

  useEffect(() => {
    return auth().onAuthStateChanged(async (user) => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        router.replace('/admin/login' as any);
        return;
      }

      try {
        const token = await user.getIdTokenResult(true);
        const hasAdminClaim = token.claims.admin === true;
        setIsAdmin(hasAdminClaim);
        if (!hasAdminClaim) {
          await auth().signOut();
          router.replace('/admin/login' as any);
          return;
        }
        const factors = await auth.multiFactor(auth());
        setMfaEnabled(factors.enrolledFactors.some((factor) => factor.factorId === 'totp'));
      } catch {
        setIsAdmin(false);
        router.replace('/admin/login' as any);
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  // Load manage data when tab switches
  useEffect(() => {
    if (activeTab === 'manage') {
      loadManageData();
    }
  }, [activeTab]);

  const loadManageData = async () => {
    setLoadingManage(true);
    try {
      const [d, p] = await Promise.all([getDrafts(), getPublishedNotifications()]);
      setDrafts(d);
      setPublished(p);
    } catch (err) {
      console.error('[admin] Failed to load manage data:', err);
    } finally {
      setLoadingManage(false);
    }
  };

  const handleSaveDraft = async () => {
    try { hapticTap(); } catch (e) {}

    const validation = validateNotification(draft);
    if (!validation.valid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    setSubmitting(true);
    try {
      const draftId = await saveDraft({
        title: draft.title,
        body: draft.body,
        category: draft.category,
        source: draft.source,
        link: draft.link || undefined,
      });

      try { hapticSuccess(); } catch (e) {}
      Alert.alert('📝 Draft Saved', `Saved as draft: ${draftId}\n\nGo to Manage tab to review and publish.`);
      setDraft({ title: '', body: '', category: 'News', source: 'Admin', link: '' });
    } catch (err: any) {
      Alert.alert('Error', `Failed to save draft: ${err?.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (draftId: string, title: string) => {
    Alert.alert('Publish Notification', `Send "${title}" to all users?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        style: 'default',
        onPress: async () => {
          setBusyDraftId(draftId);
          try {
            const notifId = await approveDraft(draftId);
            try { hapticSuccess(); } catch (e) {}
            Alert.alert('✅ Published', `Notification sent to all users.\nID: ${notifId}`);
            await loadManageData();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to publish');
          } finally {
            setBusyDraftId(null);
          }
        },
      },
    ]);
  };

  const openDraftEditor = (item: any) => {
    setEditingDraft(item);
    setEditTitle(item.title || '');
    setEditBody(item.body || '');
    setEditCategory(item.category || 'News');
    setRejectionReason('');
  };

  const closeDraftEditor = () => {
    if (busyDraftId) return;
    setEditingDraft(null);
  };

  const handleEditDraft = async () => {
    if (!editingDraft) return;
    const validation = validateNotification({ title: editTitle, body: editBody, category: editCategory });
    if (!validation.valid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    setBusyDraftId(editingDraft.id);
    try {
      await editDraft(editingDraft.id, {
        title: editTitle,
        body: editBody,
        category: editCategory,
      });
      setEditingDraft(null);
      await loadManageData();
      Alert.alert('Draft Updated', 'The draft changes were saved.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update draft');
    } finally {
      setBusyDraftId(null);
    }
  };

  const handleRejectDraft = async () => {
    if (!editingDraft) return;
    const draftId = editingDraft.id;
    setBusyDraftId(draftId);
    try {
      await rejectDraft(draftId, rejectionReason);
      setEditingDraft(null);
      await loadManageData();
      Alert.alert('Draft Rejected', 'The draft was removed and the decision was recorded.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to reject draft');
    } finally {
      setBusyDraftId(null);
    }
  };

  const handleDeletePublished = async (notifId: string, title: string) => {
    Alert.alert('Delete Notification', `Remove "${title}" from all users? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNotification(notifId);
            Alert.alert('🗑️ Deleted', 'Notification removed from all users.');
            loadManageData();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await deleteDraft(draftId);
      loadManageData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to delete draft');
    }
  };

  const reauthenticateAdmin = async () => {
    const user = auth().currentUser;
    if (!user?.email || !currentPassword) throw new Error('Enter your current password.');
    const credential = auth.EmailAuthProvider.credential(user.email, currentPassword);
    await user.reauthenticateWithCredential(credential);
    return user;
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 12) {
      Alert.alert('Password Too Short', 'Use at least 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Re-enter the new password.');
      return;
    }

    setSecurityBusy(true);
    try {
      const user = await reauthenticateAdmin();
      await user.updatePassword(newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password Updated', 'Your Firebase admin password has been changed.');
    } catch (error: any) {
      Alert.alert('Password Not Changed', error?.message || 'Please try again.');
    } finally {
      setSecurityBusy(false);
    }
  };

  const handleStartTotpEnrollment = async () => {
    setSecurityBusy(true);
    try {
      await reauthenticateAdmin();
      const factors = await auth.multiFactor(auth());
      const session = await factors.getSession();
      const secret = await (auth as any).TotpMultiFactorGenerator.generateSecret(session, auth());
      const qrUrl = await secret.generateQrCodeUrl(auth().currentUser?.email ?? 'admin', 'MigrateAU');
      setTotpSecret(secret);
      setTotpUrl(qrUrl);
      setTotpCode('');
      await Linking.openURL(qrUrl).catch(() => {});
    } catch (error: any) {
      Alert.alert('2FA Setup Failed', error?.message || 'Please try again.');
    } finally {
      setSecurityBusy(false);
    }
  };

  const handleConfirmTotpEnrollment = async () => {
    if (!totpSecret || !/^\d{6}$/.test(totpCode)) {
      Alert.alert('Invalid Code', 'Enter the 6-digit code from your authenticator app.');
      return;
    }

    setSecurityBusy(true);
    try {
      const assertion = (auth as any).TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, totpCode);
      const factors = await auth.multiFactor(auth());
      await factors.enroll(assertion, 'MigrateAU Admin');
      setMfaEnabled(true);
      setTotpSecret(null);
      setTotpUrl('');
      setTotpCode('');
      setCurrentPassword('');
      Alert.alert('2FA Enabled', 'Future admin sign-ins require your authenticator code.');
    } catch (error: any) {
      Alert.alert('Code Not Accepted', error?.message || 'Generate a new code and try again.');
    } finally {
      setSecurityBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={[styles.errorText, {color: Colors.textPrimary}]}>Access Denied</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, backgroundColor: Colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: Colors.textPrimary}]}>📢 Admin Dashboard</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'compose' && styles.tabActive]}
          onPress={() => setActiveTab('compose')}
        >
          <Text style={[styles.tabText, activeTab === 'compose' && styles.tabTextActive]}>Compose</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'manage' && styles.tabActive]}
          onPress={() => setActiveTab('manage')}
        >
          <Text style={[styles.tabText, activeTab === 'manage' && styles.tabTextActive]}>
            Manage {drafts.length > 0 ? `(${drafts.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'security' && styles.tabActive]}
          onPress={() => setActiveTab('security')}
        >
          <Text style={[styles.tabText, activeTab === 'security' && styles.tabTextActive]}>Security</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'compose' ? (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Input */}
        <View style={styles.section}>
          <Text style={[styles.label, {color: Colors.textPrimary}]}>Notification Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., SkillSelect Round 2026 Opened"
            placeholderTextColor={Colors.textMuted}
            value={draft.title}
            onChangeText={(text) => setDraft({ ...draft, title: text })}
            maxLength={100}
          />
          <Text style={[styles.charCount, {color: Colors.textPrimary}]}>{draft.title.length}/100</Text>
        </View>

        {/* Body Input */}
        <View style={styles.section}>
          <Text style={[styles.label, {color: Colors.textPrimary}]}>Notification Body</Text>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            placeholder="Message content (markdown supported)"
            placeholderTextColor={Colors.textMuted}
            value={draft.body}
            onChangeText={(text) => setDraft({ ...draft, body: text })}
            maxLength={500}
            multiline
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, {color: Colors.textPrimary}]}>{draft.body.length}/500</Text>
        </View>

        {/* Category Picker */}
        <View style={styles.section}>
          <Text style={[styles.label, {color: Colors.textPrimary}]}>Category</Text>
          <TouchableOpacity
            style={styles.categoryBtn}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={[styles.categoryText, {color: Colors.textPrimary}]}>{draft.category}</Text>
            <Ionicons name="chevron-down" size={20} color={Colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* Source Input */}
        <View style={styles.section}>
          <Text style={[styles.label, {color: Colors.textPrimary}]}>Source</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Department of Home Affairs"
            placeholderTextColor={Colors.textMuted}
            value={draft.source}
            onChangeText={(text) => setDraft({ ...draft, source: text })}
          />
        </View>

        {/* Link Input */}
        <View style={styles.section}>
          <Text style={[styles.label, {color: Colors.textPrimary}]}>Optional Link</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com"
            placeholderTextColor={Colors.textMuted}
            value={draft.link}
            onChangeText={(text) => setDraft({ ...draft, link: text })}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.previewBtn}
            onPress={() => {
              hapticTap();
              setShowPreview(true);
            }}
          >
            <Ionicons name="eye" size={18} color={Colors.textPrimary} />
            <Text style={[styles.previewBtnText, {color: Colors.textPrimary}]}>Preview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSaveDraft}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.primaryDark} size={18} />
            ) : (
              <>
                <Ionicons name="document-text" size={18} color={Colors.primaryDark} />
                <Text style={[styles.sendBtnText, {color: Colors.textPrimary}]}>Save as Draft</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      ) : activeTab === 'manage' ? (
      /* Manage Tab */
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loadingManage ? (
          <ActivityIndicator size="large" color={Colors.secondary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Drafts Section */}
            <View style={styles.section}>
              <Text style={[styles.label, {color: Colors.textPrimary}]}>📝 Pending Drafts ({drafts.length})</Text>
              {drafts.length === 0 && (
                <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 8 }}>No drafts. Compose a notification first.</Text>
              )}
              {drafts.map(d => (
                <View key={d.id} style={styles.manageCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.manageTitle, {color: Colors.textPrimary}]}>{d.title}</Text>
                    <Text style={[styles.manageBody, {color: Colors.textPrimary}]} numberOfLines={2}>{d.body}</Text>
                    <Text style={[styles.manageMeta, {color: Colors.textPrimary}]}>{d.category} · {d.timestamp?.substring(0, 16)}</Text>
                  </View>
                  <View style={styles.manageActions}>
                    <TouchableOpacity style={styles.manageIconBtn} onPress={() => openDraftEditor(d)} disabled={!!busyDraftId} accessibilityLabel={`Edit ${d.title}`}>
                      <Ionicons name="create-outline" size={22} color={Colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.manageIconBtn} onPress={() => handleApprove(d.id, d.title)} disabled={!!busyDraftId} accessibilityLabel={`Publish ${d.title}`}>
                      {busyDraftId === d.id ? <ActivityIndicator size="small" color={Colors.success} /> : <Ionicons name="checkmark-circle" size={22} color={Colors.success} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.manageIconBtn} onPress={() => handleDeleteDraft(d.id)} disabled={!!busyDraftId} accessibilityLabel={`Delete ${d.title}`}>
                      <Ionicons name="trash" size={22} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Published Section */}
            <View style={[styles.section, { marginTop: Spacing.xl }]}>
              <Text style={[styles.label, {color: Colors.textPrimary}]}>📤 Published ({published.length})</Text>
              {published.map(n => (
                <View key={n.id} style={styles.manageCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.manageTitle, {color: Colors.textPrimary}]}>{n.title}</Text>
                    <Text style={[styles.manageMeta, {color: Colors.textPrimary}]}>{n.category} · {n.timestamp?.substring(0, 16)}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeletePublished(n.id, n.title)}>
                    <Ionicons name="trash" size={22} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
      ) : (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={[styles.label, { color: Colors.textPrimary }]}>Admin account</Text>
          <Text style={[styles.securityValue, { color: Colors.textSecondary }]}>{auth().currentUser?.email}</Text>
          <TouchableOpacity
            style={[styles.signOutButton, { borderColor: Colors.border }]}
            onPress={async () => { await auth().signOut(); router.replace('/admin/login' as any); }}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
            <Text style={[styles.signOutText, { color: Colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: Colors.textPrimary }]}>Change password</Text>
          <TextInput
            style={[styles.input, { color: Colors.textPrimary, borderColor: Colors.border, backgroundColor: Colors.surface }]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />
          <TextInput
            style={[styles.input, { color: Colors.textPrimary, borderColor: Colors.border, backgroundColor: Colors.surface }]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password (12+ characters)"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />
          <TextInput
            style={[styles.input, { color: Colors.textPrimary, borderColor: Colors.border, backgroundColor: Colors.surface }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />
          <TouchableOpacity style={[styles.securityButton, { backgroundColor: Colors.secondary }]} onPress={handleChangePassword} disabled={securityBusy}>
            <Text style={[styles.securityButtonText, { color: Colors.primaryDark }]}>Update Password</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: Colors.textPrimary }]}>Authenticator app (TOTP)</Text>
          <Text style={[styles.securityValue, { color: mfaEnabled ? Colors.success : Colors.textSecondary }]}>
            {mfaEnabled ? 'Enabled' : 'Not enabled'}
          </Text>
          {!mfaEnabled && !totpSecret && (
            <TouchableOpacity style={[styles.securityButton, { backgroundColor: Colors.accent }]} onPress={handleStartTotpEnrollment} disabled={securityBusy}>
              <Text style={[styles.securityButtonText, { color: Colors.primaryDark }]}>Set Up Authenticator</Text>
            </TouchableOpacity>
          )}
          {!!totpSecret && (
            <View style={[styles.totpSetup, { borderColor: Colors.border, backgroundColor: Colors.surface }]}>
              <Text style={[styles.securityValue, { color: Colors.textSecondary }]}>Add this key to your authenticator if it did not open automatically:</Text>
              <Text selectable style={[styles.secretKey, { color: Colors.textPrimary }]}>{totpSecret.secretKey}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(totpUrl)}>
                <Text style={[styles.openAuthenticator, { color: Colors.accent }]}>Open authenticator app</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, styles.totpInput, { color: Colors.textPrimary, borderColor: Colors.border, backgroundColor: Colors.background }]}
                value={totpCode}
                onChangeText={(value) => setTotpCode(value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity style={[styles.securityButton, { backgroundColor: Colors.success }]} onPress={handleConfirmTotpEnrollment} disabled={securityBusy}>
                <Text style={[styles.securityButtonText, { color: Colors.primaryDark }]}>Confirm and Enable 2FA</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {securityBusy && <ActivityIndicator color={Colors.secondary} style={{ marginTop: Spacing.lg }} />}
        <View style={{ height: 40 }} />
      </ScrollView>
      )}

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <Text style={[styles.modalTitle, {color: Colors.textPrimary}]}>Select Category</Text>
            <ScrollView style={styles.categoryList}>
              {NOTIFICATION_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    draft.category === cat && styles.categoryOptionActive,
                  ]}
                  onPress={() => {
                    setDraft({ ...draft, category: cat });
                    setShowCategoryPicker(false);
                    hapticTap();
                  }}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      draft.category === cat && styles.categoryOptionTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                  {draft.category === cat && (
                    <Ionicons name="checkmark" size={20} color={Colors.secondary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={[styles.previewContainer, { paddingTop: insets.top, backgroundColor: Colors.background }]}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <Ionicons name="close" size={28} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.previewTitle, {color: Colors.textPrimary}]}>Preview</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.previewContent} showsVerticalScrollIndicator={false}>
            {/* Notification Card Preview */}
            <View style={styles.notificationPreview}>
              <View style={styles.previewAccent} />
              <View style={styles.previewIcon}>
                <Ionicons name="notifications" size={18} color={Colors.accent} />
              </View>

              <View style={styles.previewText}>
                <Text style={[styles.previewCategory, {color: Colors.textPrimary}]}>{draft.category}</Text>
                <Text style={[styles.previewNotifTitle, {color: Colors.textPrimary}]} numberOfLines={2}>
                  {draft.title || 'Notification Title'}
                </Text>
                <Text style={[styles.previewBody, {color: Colors.textPrimary}]} numberOfLines={3}>
                  {draft.body || 'Notification body text...'}
                </Text>
                <Text style={[styles.previewSource, {color: Colors.textPrimary}]}>Source: {draft.source}</Text>
              </View>
            </View>

            <View style={styles.previewInfo}>
              <Text style={[styles.previewInfoTitle, {color: Colors.textPrimary}]}>Preview Info</Text>
              <Text style={[styles.previewInfoText, {color: Colors.textPrimary}]}>
                ✅ Title: {draft.title.length}/100 characters
              </Text>
              <Text style={[styles.previewInfoText, {color: Colors.textPrimary}]}>
                ✅ Body: {draft.body.length}/500 characters
              </Text>
              <Text style={[styles.previewInfoText, {color: Colors.textPrimary}]}>
                ✅ Category: {draft.category}
              </Text>
              {draft.link && (
                <Text style={[styles.previewInfoText, {color: Colors.textPrimary}]}>
                  ✅ Link: {draft.link.substring(0, 40)}...
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={!!editingDraft}
        transparent
        animationType="slide"
        onRequestClose={closeDraftEditor}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.editModalContent, { backgroundColor: Colors.surface }]}>
            <View style={styles.editModalHeader}>
              <Text style={[styles.modalTitleText, { color: Colors.textPrimary }]}>Review Draft</Text>
              <TouchableOpacity onPress={closeDraftEditor} disabled={!!busyDraftId} accessibilityLabel="Close draft editor">
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: Colors.textPrimary }]}>Title</Text>
              <TextInput style={[styles.input, { color: Colors.textPrimary, borderColor: Colors.border }]} value={editTitle} onChangeText={setEditTitle} maxLength={100} />
              <Text style={[styles.label, styles.editFieldLabel, { color: Colors.textPrimary }]}>Body</Text>
              <TextInput style={[styles.input, styles.bodyInput, { color: Colors.textPrimary, borderColor: Colors.border }]} value={editBody} onChangeText={setEditBody} maxLength={500} multiline textAlignVertical="top" />
              <Text style={[styles.label, styles.editFieldLabel, { color: Colors.textPrimary }]}>Category</Text>
              <TextInput style={[styles.input, { color: Colors.textPrimary, borderColor: Colors.border }]} value={editCategory} onChangeText={setEditCategory} maxLength={80} />
              <Text style={[styles.label, styles.editFieldLabel, { color: Colors.textPrimary }]}>Rejection reason (optional)</Text>
              <TextInput style={[styles.input, { color: Colors.textPrimary, borderColor: Colors.border }]} value={rejectionReason} onChangeText={setRejectionReason} maxLength={500} placeholder="Reason recorded in the audit trail" placeholderTextColor={Colors.textMuted} />
              <View style={styles.editModalActions}>
                <TouchableOpacity style={[styles.reviewAction, { borderColor: Colors.error }]} onPress={handleRejectDraft} disabled={!!busyDraftId}>
                  <Ionicons name="close-circle-outline" size={19} color={Colors.error} />
                  <Text style={[styles.reviewActionText, { color: Colors.error }]}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.reviewAction, { backgroundColor: Colors.secondary }]} onPress={handleEditDraft} disabled={!!busyDraftId}>
                  {busyDraftId ? <ActivityIndicator size="small" color={Colors.primaryDark} /> : <Ionicons name="save-outline" size={19} color={Colors.primaryDark} />}
                  <Text style={[styles.reviewActionText, { color: Colors.primaryDark }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginTop: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
  },
  bodyInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  categoryText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  previewBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
  },
  sendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  sendBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  securityValue: { fontSize: FontSize.sm, lineHeight: 19, marginBottom: Spacing.md },
  securityButton: { minHeight: 46, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  securityButtonText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, minHeight: 44 },
  signOutText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  totpSetup: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md },
  secretKey: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, letterSpacing: 1, marginBottom: Spacing.md },
  openAuthenticator: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, marginBottom: Spacing.md },
  totpInput: { textAlign: 'center', fontSize: FontSize.xl, letterSpacing: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  categoryList: {
    paddingHorizontal: Spacing.lg,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginVertical: Spacing.xs,
  },
  categoryOptionActive: {
    backgroundColor: 'rgba(0,194,255,0.15)',
  },
  categoryOptionText: {
    fontSize: FontSize.md,
  },
  categoryOptionTextActive: {
    fontWeight: FontWeight.bold,
  },
  previewContainer: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  previewTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  previewContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  notificationPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 12,
    padding: 12,
    marginBottom: Spacing.lg,
  },
  previewAccent: {
    width: 3,
    height: '100%',
    borderRadius: 2,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,194,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    flex: 1,
  },
  previewCategory: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  previewNotifTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    lineHeight: 18,
  },
  previewBody: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  previewSource: {
    fontSize: 10,
    marginTop: 6,
    fontStyle: 'italic',
  },
  previewInfo: {
    backgroundColor: 'rgba(0,194,255,0.1)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,194,255,0.2)',
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  previewInfoTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  previewInfoText: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  errorText: {
    fontSize: FontSize.lg,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
  },
  tabTextActive: {
  },
  manageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
  },
  manageTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  manageBody: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  manageMeta: {
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  manageActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  manageIconBtn: {
    padding: 6,
  },
  deleteBtn: {
    padding: 6,
  },
  editModalContent: {
    maxHeight: '88%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  modalTitleText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  editFieldLabel: {
    marginTop: Spacing.md,
  },
  editModalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  reviewAction: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  reviewActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});
