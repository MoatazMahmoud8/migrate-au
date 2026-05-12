import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Linking,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import {
  subscribeToFeed,
  markAsRead,
  AppNotification,
} from '../../utils/notifications';

const CATEGORY_COLORS: Record<string, string> = {
  'Policy Update':          Colors.accent,
  'Visa Change':            Colors.error,
  'SkillSelect Round':      Colors.secondary,
  'Points Test':            '#A78BFA',
  'Processing Time':        Colors.success,
  'State Nomination':       '#FB923C',
  'ANZSCO Occupation List': '#34D399',
  'ANZSCO Classification':  '#34D399',
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
}: {
  item: AppNotification;
  onRead: (id: string) => void;
}) {
  const color = CATEGORY_COLORS[item.category] ?? Colors.accent;
  const icon  = (CATEGORY_ICONS[item.category] ?? 'notifications') as any;

  const handlePress = useCallback(async () => {
    if (!item.read) onRead(item.id);
    if (item.url) await Linking.openURL(item.url);
  }, [item, onRead]);

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
          <Text style={[styles.category, { color }]}>{item.category}</Text>
          <Text style={styles.time}>{timeAgo(item.timestamp)}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.body}  numberOfLines={2}>{item.body}</Text>
      </View>

      {/* Unread dot */}
      {!item.read && <View style={[styles.dot, { backgroundColor: color }]} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [feed, setFeed]           = useState<AppNotification[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stateFilter, setStateFilter] = useState<string>('all');

  useEffect(() => {
    const unsub = subscribeToFeed(items => {
      setFeed(items);
      setLoading(false);
      setRefreshing(false);
    });
    return unsub;
  }, []);

  const handleRead = useCallback((id: string) => {
    markAsRead(id);
    setFeed(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
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

  return (
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
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
      </ScrollView>

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
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>{feed.length === 0 ? 'No updates yet' : 'No updates for this filter'}</Text>
          <Text style={styles.emptySubtext}>
            {feed.length === 0
              ? "You'll be notified instantly when Home Affairs, states, or occupation lists change."
              : 'Try a different state or tap All to see everything.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFeed}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotificationCard item={item} onRead={handleRead} />
          )}
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
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold as any,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  body: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
    gap: 12,
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: 2,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 8,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    borderColor: Colors.secondary,
    backgroundColor: 'rgba(255,205,0,0.12)',
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
});
