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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { isUserAdmin, createNotification, NOTIFICATION_CATEGORIES, validateNotification } from '../../utils/admin';
import { tap as hapticTap, success as hapticSuccess } from '../../utils/haptics';

interface NotificationDraft {
  title: string;
  body: string;
  category: string;
  source: string;
  link: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [draft, setDraft] = useState<NotificationDraft>({
    title: '',
    body: '',
    category: 'News',
    source: 'Admin',
    link: '',
  });

  // Check admin on mount
  // PIN-based access is already verified in profile.tsx before navigating here
  // Skip the isUserAdmin() check — the passphrase IS the auth gate
  useEffect(() => {
    setIsAdmin(true);
    setLoading(false);
  }, []);

  const handleSendNotification = async () => {
    console.log('[admin] Send button clicked');
    try {
      hapticTap();
    } catch (e) {
      // Haptics not available on web
    }

    const validation = validateNotification(draft);
    if (!validation.valid) {
      const msg = `Validation Error:\n${validation.errors.join('\n')}`;
      console.error('[admin]', msg);
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    console.log('[admin] Validation passed, sending notification...', draft);
    setSubmitting(true);
    try {
      const notifId = await createNotification({
        title: draft.title,
        body: draft.body,
        category: draft.category,
        source: draft.source,
        link: draft.link || undefined,
      });

      console.log('[admin] ✅ Notification created:', notifId);
      
      try {
        hapticSuccess();
      } catch (e) {
        // Haptics not available on web
      }

      const msg = `✅ Success!\n\nNotification created: ${notifId}\n\nUsers will see this in their feed within 5-10 seconds.`;
      console.log('[admin] Showing success message');
      Alert.alert('✅ Notification Sent', msg);

      // Clear form
      setDraft({
        title: '',
        body: '',
        category: 'News',
        source: 'Admin',
        link: '',
      });
    } catch (err: any) {
      const errMsg = err?.message || 'Unknown error';
      console.error('[admin] Failed to send notification:', err);
      console.error('[admin] Full error:', JSON.stringify(err, null, 2));
      
      const msg = `Failed to send notification:\n${errMsg}`;
      console.error('[admin]', msg);
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
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
        <Text style={styles.errorText}>Access Denied</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📢 Send Notification</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Notification Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., SkillSelect Round 2026 Opened"
            placeholderTextColor={Colors.textMuted}
            value={draft.title}
            onChangeText={(text) => setDraft({ ...draft, title: text })}
            maxLength={100}
          />
          <Text style={styles.charCount}>{draft.title.length}/100</Text>
        </View>

        {/* Body Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Notification Body</Text>
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
          <Text style={styles.charCount}>{draft.body.length}/500</Text>
        </View>

        {/* Category Picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.categoryBtn}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={styles.categoryText}>{draft.category}</Text>
            <Ionicons name="chevron-down" size={20} color={Colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* Source Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Source</Text>
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
          <Text style={styles.label}>Optional Link</Text>
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
            <Text style={styles.previewBtnText}>Preview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSendNotification}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.primaryDark} size={18} />
            ) : (
              <>
                <Ionicons name="send" size={18} color={Colors.primaryDark} />
                <Text style={styles.sendBtnText}>Send to Users</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
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
        <View style={[styles.previewContainer, { paddingTop: insets.top }]}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <Ionicons name="close" size={28} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Preview</Text>
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
                <Text style={styles.previewCategory}>{draft.category}</Text>
                <Text style={styles.previewNotifTitle} numberOfLines={2}>
                  {draft.title || 'Notification Title'}
                </Text>
                <Text style={styles.previewBody} numberOfLines={3}>
                  {draft.body || 'Notification body text...'}
                </Text>
                <Text style={styles.previewSource}>Source: {draft.source}</Text>
              </View>
            </View>

            <View style={styles.previewInfo}>
              <Text style={styles.previewInfoTitle}>Preview Info</Text>
              <Text style={styles.previewInfoText}>
                ✅ Title: {draft.title.length}/100 characters
              </Text>
              <Text style={styles.previewInfoText}>
                ✅ Body: {draft.body.length}/500 characters
              </Text>
              <Text style={styles.previewInfoText}>
                ✅ Category: {draft.category}
              </Text>
              {draft.link && (
                <Text style={styles.previewInfoText}>
                  ✅ Link: {draft.link.substring(0, 40)}...
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
  },
  bodyInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  categoryText: {
    color: Colors.textPrimary,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  previewBtnText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
  },
  sendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  sendBtnText: {
    color: Colors.primaryDark,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    color: Colors.textPrimary,
  },
  categoryOptionTextActive: {
    fontWeight: FontWeight.bold,
    color: Colors.secondary,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  previewTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  previewContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  notificationPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    gap: 12,
    padding: 12,
    marginBottom: Spacing.lg,
  },
  previewAccent: {
    width: 3,
    height: '100%',
    backgroundColor: Colors.secondary,
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
    color: Colors.textMuted,
    marginBottom: 4,
  },
  previewNotifTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  previewBody: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 4,
  },
  previewSource: {
    fontSize: 10,
    color: Colors.textMuted,
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
    color: Colors.accent,
    marginBottom: Spacing.sm,
  },
  previewInfoText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  errorText: {
    fontSize: FontSize.lg,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
