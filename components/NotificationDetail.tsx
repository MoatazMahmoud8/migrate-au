/**
 * NotificationDetail.tsx
 *
 * Full-screen detail view for a notification/news update.
 * Displays headline, body, metadata, and action button to view official source.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { AppNotification } from '../utils/notifications';

const CATEGORY_COLORS: Record<string, { main: string; bg: string }> = {
  'Policy Update': { main: Colors.accent, bg: 'rgba(0, 194, 255, 0.2)' },
  'Visa Change': { main: Colors.error, bg: 'rgba(255, 71, 87, 0.2)' },
  'SkillSelect Round': { main: Colors.secondary, bg: 'rgba(255, 205, 0, 0.2)' },
  'News': { main: Colors.info, bg: 'rgba(0, 194, 255, 0.2)' },
  'Government Update': { main: Colors.primary, bg: 'rgba(0, 45, 98, 0.3)' },
};

interface NotificationDetailProps {
  notification: AppNotification;
  onClose: () => void;
  onReadSource?: (url: string) => void;
}

export default function NotificationDetail({ notification, onClose, onReadSource }: NotificationDetailProps) {
  const categoryColorObj = CATEGORY_COLORS[notification.category] || { main: Colors.accent, bg: 'rgba(0, 194, 255, 0.2)' };
  const categoryColor = categoryColorObj.main;
  const categoryBg = categoryColorObj.bg;
  const timeAgo = formatTimeAgo(notification.timestamp);

  const handleReadSource = () => {
    if (notification.sourceUrl && onReadSource) {
      onReadSource(notification.sourceUrl);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* Header with close button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Category badge */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: categoryBg, borderColor: categoryColor }]}>
            <Text style={[styles.badgeText, { color: categoryColor }]}>
              {notification.category}
            </Text>
          </View>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>{notification.title}</Text>

        {/* Source attribution */}
        {notification.source && (
          <View style={styles.sourceSection}>
            <View style={[styles.sourceDot, { backgroundColor: categoryColor }]} />
            <Text style={styles.sourceText}>Source: {notification.source}</Text>
          </View>
        )}

        {/* Body/Summary */}
        <View style={styles.bodySection}>
          <Text style={styles.bodyText}>{notification.body}</Text>
        </View>

        {/* Spacer */}
        <View style={{ height: Spacing.xl * 2 }} />
      </ScrollView>

      {/* Bottom action button - only show if we have a valid source URL */}
      {notification.sourceUrl && notification.sourceUrl.trim() && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: Colors.primary }]}
            onPress={handleReadSource}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Read Official Source</Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color="white"
              style={{ marginLeft: Spacing.sm }}
            />
          </TouchableOpacity>
        </View>
      )}
      {/* If no source URL, show alternative message */}
      {(!notification.sourceUrl || !notification.sourceUrl.trim()) && (
        <View style={[styles.footer, { backgroundColor: 'rgba(0,194,255,0.1)' }]}>
          <Text style={[styles.buttonText, { color: Colors.textMuted, textAlign: 'center' }]}>
            No official source link available
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

/**
 * Format timestamp to relative time (e.g., "2h ago", "1d ago")
 */
function formatTimeAgo(timestamp: string | number): string {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;

    return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
  } catch {
    return 'Unknown';
  }
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
  },
  timeAgo: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: FontWeight.regular,
  },
  headline: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    lineHeight: 28,
  },
  sourceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  sourceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  sourceText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.regular,
  },
  bodySection: {
    marginBottom: Spacing.lg,
  },
  bodyText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 22,
    fontWeight: FontWeight.regular,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    color: 'white',
  },
});
