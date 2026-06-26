import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import {
  subscribeToFeed,
  markAsRead,
  AppNotification,
} from '../../utils/notifications';
import { subscribeToFeedPoll } from '../../utils/notifications-poll';
import { subscribeToNotificationsWeb, initializeFirebaseWeb } from '../../utils/firebaseWeb';
import { getRevenueCatUserId } from '../../utils/iap';
import { SourceValidator } from '../../utils/sourceValidator';
import NotificationDetail from '../../components/NotificationDetail';
import InAppBrowser from '../../components/InAppBrowser';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const CATEGORY_COLORS: Record<string, string> = {
  'Policy Update':          Colors.accent,         // Cyan
  'Visa Change':            Colors.error,          // Red
  'SkillSelect Round':      Colors.secondary,      // Yellow/Gold
  'News':                   Colors.info,           // Cyan
  'Government Update':      Colors.primary,        // Dark Blue
  'Processing Time':        Colors.success,        // Green
  'State Nomination':       '#FB923C',             // Orange
  'ANZSCO Occupation List': Colors.success,        // Green
  'ANZSCO Classification':  Colors.success,        // Green
  'Points Test':            Colors.accentPurple,   // Purple
};

const CATEGORY_ICONS: Record<string, string> = {
  'Policy Update':          'document-text',
  'Visa Change':            'alert-circle',
  'SkillSelect Round':      'trophy',
  'Points Test':            'stats-chart',
  'Processing Time':        'time',
  'State Nomination':       'location',
  'ANZSCO Occupation List': 'briefcase',
  'ANZSCO Classification':  'briefcase',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationCard({
  item,
  onRead,
  onTap,
}: {
  item: AppNotification;
  onRead: (id: string) => void;
  onTap: (notification: AppNotification) => void;
}) {
  const color = CATEGORY_COLORS[item.category] ?? Colors.accent;
  const icon  = (CATEGORY_ICONS[item.category] ?? 'notifications') as any;
  const source = SourceValidator.getSafeSource(item.source);

  const handlePress = useCallback(() => {
    if (!item.read) onRead(item.id);
    // Show detail screen instead of opening URL directly
    onTap(item);
  }, [item, onRead, onTap]);

  return (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread]}
      activeOpacity={0.75}
      onPress={handlePress}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: color }]} />

      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.time}>{timeAgo(item.timestamp)}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.body}  numberOfLines={2}>{item.body}</Text>
        <Text style={styles.source}>Source: {source}</Text>
      </View>

      {/* Unread dot - Sentry Blue */}
      {!item.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [feed, setFeed]           = useState<AppNotification[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [showInAppBrowser, setShowInAppBrowser] = useState(false);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const uid = await getRevenueCatUserId().catch(() => '');
        if (cancelled) return;

        // Use web Firebase on web, native Firebase on mobile
        if (Platform.OS === 'web') {
          initializeFirebaseWeb();
          unsub = subscribeToNotificationsWeb(
            items => {
              try {
                if (!cancelled) {
                  console.log('[notifications.tsx] Web update - items:', items?.length || 0);
                  setFeed(items || []);
                  setLoading(false);
                  setRefreshing(false);
                }
              } catch (err) {
                console.error('[notifications.tsx] Error updating feed from web:', err);
                setLoading(false);
                setRefreshing(false);
              }
            },
            30,
            uid || undefined,
          ) || undefined;
        } else {
          console.log('[notifications.tsx] Using polling-based notification sync');
          unsub = subscribeToFeedPoll(
            items => {
              try {
                if (!cancelled) {
                  console.log('[notifications.tsx] Poll update - items:', items?.length || 0);
                  setFeed(items || []);
                  setLoading(false);
                  setRefreshing(false);
                }
              } catch (err) {
                console.error('[notifications.tsx] Error updating feed from poll:', err);
                setLoading(false);
                setRefreshing(false);
              }
            },
            30,
            uid || undefined,
            5000, // Poll every 5 seconds
          );
        }
      } catch (err) {
        console.error('[notifications.tsx] Error in notification setup:', err);
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (unsub) {
        try {
          unsub();
        } catch (err) {
          console.error('[notifications.tsx] Error unsubscribing:', err);
        }
      }
    };
  }, []);

  const handleRead = useCallback((id: string) => {
    markAsRead(id);
    setFeed(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const handleNotificationTap = useCallback((notification: AppNotification) => {
    setSelectedNotification(notification);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedNotification(null);
    setShowInAppBrowser(false);
    setBrowserUrl(null);
  }, []);

  const handleReadSource = useCallback((url: string) => {
    setBrowserUrl(url);
    setShowInAppBrowser(true);
  }, []);

  const handleCloseInAppBrowser = useCallback(() => {
    setShowInAppBrowser(false);
    setBrowserUrl(null);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  const filteredFeed = useMemo(() => {
    if (stateFilter === 'all') return feed;
    if (stateFilter === 'FED') return feed.filter(n => !n.state || n.state === 'FED' || n.state === 'Federal');
    return feed.filter(n => (n.state ?? '').toUpperCase() === stateFilter);
  }, [feed, stateFilter]);

  const unreadCount = feed.filter(n => !n.read).length;

  const FILTERS: { id: string; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'FED', label: 'Federal' },
    { id: 'NSW', label: 'NSW' },
    { id: 'VIC', label: 'VIC' },
    { id: 'QLD', label: 'QLD' },
    { id: 'WA',  label: 'WA'  },
    { id: 'SA',  label: 'SA'  },
    { id: 'TAS', label: 'TAS' },
    { id: 'ACT', label: 'ACT' },
    { id: 'NT',  label: 'NT'  },
  ];

  // Render based on current state
  if (showInAppBrowser && browserUrl) {
    return (
      <ErrorBoundary>
        <InAppBrowser url={browserUrl} onClose={handleCloseInAppBrowser} />
      </ErrorBoundary>
    );
  }

  if (selectedNotification) {
    return (
      <ErrorBoundary>
        <NotificationDetail
          notification={selectedNotification}
          onClose={handleCloseDetail}
          onReadSource={handleReadSource}
        />
      </ErrorBoundary>
    );
  }

  // Render main notifications list
  return (
    <ErrorBoundary>
    <View style={[styles.screen, { paddingTop: insets.top + 60 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Updates</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* State filter pills */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = stateFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.pill, active && styles.pillActive]}
              activeOpacity={0.8}
              onPress={() => setStateFilter(f.id)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonBar} />
              <View style={styles.skeletonContent}>
                <View style={[styles.skeletonLine, { width: '40%' }]} />
                <View style={[styles.skeletonLine, { width: '85%', marginTop: 8 }]} />
                <View style={[styles.skeletonLine, { width: '60%', marginTop: 6 }]} />
              </View>
            </View>
          ))}
        </View>
      ) : filteredFeed.length === 0 ? (
        <ScrollView contentContainerStyle={styles.empty} scrollEnabled={false}>
          <View style={styles.emptyIconBadge}>
            <Ionicons name="newspaper-outline" size={40} color={Colors.accent} />
          </View>
          <Text style={styles.emptyText}>{feed.length === 0 ? 'No updates yet' : 'No updates for this filter'}</Text>
          <Text style={styles.emptySubtext}>
            {feed.length === 0
              ? "You'll be notified instantly when Home Affairs, states, or occupation lists change."
              : 'Try changing your filter or check back later.'}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredFeed}
          keyExtractor={(item, index) => item?.id || `notification-${index}`}
          renderItem={({ item, index }) => {
            try {
              if (!item) {
                console.warn('[notifications] Null item at index:', index);
                return null;
              }
              return (
                <NotificationCard 
                  item={item} 
                  onRead={handleRead}
                  onTap={handleNotificationTap}
                />
              );
            } catch (err) {
              console.error('[notifications] Error rendering NotificationCard at index', index, ':', err);
              return (
                <View style={styles.errorItem}>
                  <Text style={styles.errorText}>Error loading notification</Text>
                </View>
              );
            }
          }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: 10,
  },
  heading: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
    color: Colors.textPrimary,
  },
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    gap: 12,
    paddingRight: 12,
    paddingVertical: 12,
  },
  cardUnread: {
    backgroundColor: Colors.surfaceRaised,
    borderColor: 'rgba(0,194,255,0.25)',
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginLeft: 0,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
    overflow: 'hidden',
  },
  category: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#8DB4E2',
    marginBottom: 4,
    flexShrink: 1,
  },
  time: {
    fontSize: 11,
    color: '#8DB4E2',
    flexShrink: 0,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold as any,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  body: {
    fontSize: 12,
    color: '#A8BDD8',
    lineHeight: 16,
  },
  source: {
    fontSize: 10,
    color: '#8DB4E2',
    marginTop: 6,
    fontStyle: 'italic',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
    gap: 12,
  },
  emptyIconBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(0, 122, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold as any,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: 2,
    gap: 8,
    flexWrap: 'wrap',
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  filterGradientOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 80,
    height: '100%',
    zIndex: 11,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    borderColor: Colors.secondary,
    backgroundColor: 'rgba(255,205,0,0.15)',
  },
  pillText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  pillTextActive: {
    color: Colors.secondary,
  },
  skeletonCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    minHeight: 84,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skeletonBar: {
    width: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonContent: {
    flex: 1,
    padding: Spacing.md,
  },
  skeletonLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  errorItem: {
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    backgroundColor: Colors.errorLight,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
