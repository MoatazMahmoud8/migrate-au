/**
 * Today screen — daily home following best-app UX patterns:
 *
 * - Personal greeting header with streak (Duolingo).
 * - Next-best-action hero card (Notion/Linear).
 * - Points progress ring snapshot (fitness apps).
 * - Latest 3 official updates (news apps).
 * - Quick-actions grid (Apple HIG).
 * - Skeleton loaders + pull-to-refresh (Instagram).
 * - Empty-state that teaches one thing and offers one CTA (Headspace).
 *
 * All data is optional — if any piece is missing, the section degrades to a
 * teach-and-CTA empty state rather than blanking.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, usePathname } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculatePoints } from '../utils/pointsCalculator';
import { PointsInput } from '../constants/types';

import { useColors } from '../constants/ThemeContext';
import { Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { getProfile } from '../utils/storage';
import { UserProfile } from '../constants/types';
import { tickStreak } from '../utils/streak';
import { subscribeToFeedPoll } from '../utils/notifications-poll';
import { openExternalUrl } from '../utils/openExternalUrl';
import { shareReferral, sharePointsCard } from '../utils/growth';
import { getApprovedNews, NewsItem } from '../utils/newsFeed';
import { getNewsHeadline, getNewsSourceLabel, getNewsSummaryBullets, getNewsVisaPills, getNewsUrl, requiresVerification, isGovAuSource } from '../utils/newsDisplay';

const CALC_STORAGE_KEY = 'calc_input_v1';

const defaultCalcInput: PointsInput = {
  age: 28, englishLevel: 'proficient',
  australianWorkYears: 0, overseasWorkYears: 3, visaSubclass: '189',
  hasPartnerSkills: false, hasPartnerSuperiorEnglish: false,
  hasProfessionalYear: false, hasNaati: false, hasStateNomination: false,
  hasCommunityLanguage: false, hasAustralianStudy: false,
};

interface FeedItem {
  id: string;
  title: string;
  body?: string;
  category?: string;
  timestamp?: string;
  url?: string;
  sourceUrl?: string;
  read?: boolean;
}

function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ─── Next best action derivation ─────────────────────────────────────────────
interface NextAction {
  label: string;
  helper: string;
  cta: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: (router: ReturnType<typeof useRouter>) => void;
  isCelebration?: boolean;
}

function deriveNextAction(
  profile: UserProfile | null,
  hasScore = false,
  latestUnread: FeedItem | null = null,
  pointsTotal = 0,
): NextAction {
  if (!profile || !profile.onboardingComplete) {
    return {
      label: 'Set up your profile',
      helper: 'Answer a few questions so we can tailor eligibility and alerts.',
      cta: 'Start onboarding',
      iconName: 'sparkles-outline',
      onPress: (router) => router.push('/(tabs)/profile' as any),
    };
  }
  if (!profile.anzscoCode) {
    return {
      label: 'Pick your occupation',
      helper: 'We\'ll match invitation rounds, state programs and fees to your ANZSCO.',
      cta: 'Choose occupation',
      iconName: 'briefcase-outline',
      onPress: (router) => router.push('/occupations' as any),
    };
  }
  const followedStates = ((profile.subscribedStates && profile.subscribedStates.length ? profile.subscribedStates : profile.pinnedStates) || []);
  if (followedStates.length === 0) {
    return {
      label: 'Follow a state program',
      helper: 'Get an alert the moment your state opens nominations or changes criteria.',
      cta: 'Browse states',
      iconName: 'flag-outline',
      onPress: (router) => router.push('/(tabs)/states' as any),
    };
  }
  if (!hasScore) {
    return {
      label: 'Compute your points',
      helper: 'Answer age, English, and work — takes about a minute.',
      cta: 'Open calculator',
      iconName: 'calculator-outline',
      onPress: (router) => router.push('/(tabs)/calculator' as any),
    };
  }
  // Fully set up. Give users something USEFUL — a real unread update if we have
  // one, otherwise rotate through a productive suggestion so this card is never
  // a nag to "open Alerts again and again".
  if (latestUnread) {
    return {
      label: latestUnread.title || 'New official update',
      helper: latestUnread.body || 'Tap to read the details.',
      cta: 'View update',
      iconName: 'newspaper-outline',
      onPress: (router) => {
        const url = latestUnread.url || latestUnread.sourceUrl;
        if (url) void openExternalUrl(url);
        else router.push('/(tabs)/notifications' as any);
      },
    };
  }
  const rotators: NextAction[] = [
    {
      label: 'You\'re all set',
      helper: 'Occupation, state and points are saved. New official updates will appear here as soon as they land.',
      cta: 'View sources',
      iconName: 'checkmark-circle-outline',
      onPress: (router) => router.push('/sources' as any),
      isCelebration: true,
    },
    {
      label: 'Share your points score',
      helper: 'Send a snapshot to a friend also thinking about migrating.',
      cta: 'Share now',
      iconName: 'share-social-outline',
      onPress: () => { void sharePointsCard({ total: pointsTotal, eligibleThreshold: 65 }); },
      isCelebration: true,
    },
    {
      label: 'Refer a friend',
      helper: 'Send MigrateAU to someone who\'d benefit.',
      cta: 'Send invite',
      iconName: 'gift-outline',
      onPress: () => { void shareReferral(); },
      isCelebration: true,
    },
  ];
  // Rotate by day-of-year so the same suggestion doesn't repeat every launch.
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return rotators[day % rotators.length];
}

// ─── Progress ring ───────────────────────────────────────────────────────────
function ProgressRing({ value, size = 84, stroke = 8, colorFilled, colorTrack, label, sub }: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  colorFilled: string;
  colorTrack: string;
  label: string;
  sub?: string;
}) {
  // We use two overlaid views instead of SVG to avoid an extra dep. A radial
  // segment is approximated visually via a rotated arc-ish effect using a
  // circular border trick.
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: colorTrack,
          position: 'absolute',
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: 'transparent',
          borderTopColor: colorFilled,
          borderRightColor: clamped >= 25 ? colorFilled : 'transparent',
          borderBottomColor: clamped >= 50 ? colorFilled : 'transparent',
          borderLeftColor: clamped >= 75 ? colorFilled : 'transparent',
          transform: [{ rotate: '-45deg' }],
          position: 'absolute',
        }}
      />
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: FontSize.lg, fontWeight: FontWeight.bold }}>{label}</Text>
        {sub ? <Text style={{ fontSize: FontSize.xs, opacity: 0.7 }}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function TodayScreen() {
  const Colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [streak, setStreak] = useState(0);
  const [calcInput, setCalcInput] = useState<PointsInput | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const loadStatic = useCallback(async () => {
    try {
      const [p, s, calcJson] = await Promise.all([
        getProfile(),
        tickStreak(),
        AsyncStorage.getItem(CALC_STORAGE_KEY).catch(() => null),
      ]);
      setProfile(p);
      setStreak(s.streakDays);
      if (calcJson) {
        try {
          const parsed = JSON.parse(calcJson);
          setCalcInput({ ...defaultCalcInput, ...parsed });
        } catch {
          setCalcInput(null);
        }
      } else {
        setCalcInput(null);
      }
      try {
        const approved = await getApprovedNews(5);
        setNews(approved);
      } catch {
        setNews([]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    void loadStatic();

    if (Platform.OS === 'web') {
      setLoading(false);
      return;
    }

    const unsub = subscribeToFeedPoll(
      (items) => {
        setFeed((items as FeedItem[]).slice(0, 3));
        setLoading(false);
      },
      10,
      undefined,
      10_000,
    );
    return () => {
      try { unsub(); } catch {}
    };
  }, [loadStatic]);

  useFocusEffect(useCallback(() => { void loadStatic(); }, [loadStatic]));

  const pathname = usePathname();
  useEffect(() => { void loadStatic(); }, [pathname, loadStatic]);

  // Web fallback: poll every 2s while Today is visible so occupation and
  // calc updates propagate even without focus events firing on web.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const id = setInterval(() => { void loadStatic(); }, 2000);
    return () => clearInterval(id);
  }, [loadStatic]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStatic();
    setTimeout(() => setRefreshing(false), 500);
  }, [loadStatic]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const firstName = (profile?.name || '').split(' ')[0] || 'there';

  const pointsRing = useMemo(() => {
    if (!calcInput) return { total: 0, percent: 0, hasScore: false };
    try {
      const breakdown = calculatePoints(calcInput);
      const total = breakdown.total;
      return { total, percent: Math.round((total / 65) * 100), hasScore: true };
    } catch {
      return { total: 0, percent: 0, hasScore: false };
    }
  }, [calcInput]);

  const latestUnread = useMemo<FeedItem | null>(() => feed.find((f) => !f.read) ?? null, [feed]);
  const action = useMemo(() => deriveNextAction(profile, pointsRing.hasScore, latestUnread, pointsRing.total), [profile, pointsRing.hasScore, pointsRing.total, latestUnread]);

  // Unified Home feed: merges official laws/directions (`feed`, native-only
  // `notifications` collection) with approved media news (`news`, `news_items`
  // collection) into one sorted, safely-rendered list. This keeps Home and
  // the Updates tab showing the same underlying data instead of two
  // disconnected sources.
  interface UnifiedUpdate {
    id: string;
    headline: string;
    badge: string;
    sourceLabel: string;
    body?: string;
    bullets: { label: string; text: string }[];
    visaPills: string[];
    timestamp?: string;
    url?: string;
    needsVerification: boolean;
    isGovSource: boolean;
  }

  const unifiedUpdates = useMemo<UnifiedUpdate[]>(() => {
    const officialCards: UnifiedUpdate[] = feed.map((item) => ({
      id: `official-${item.id}`,
      headline: item.title || 'Official migration update',
      badge: item.category || 'Update',
      sourceLabel: 'Official Government Update',
      body: item.body,
      bullets: [],
      visaPills: [],
      timestamp: item.timestamp,
      url: item.url || item.sourceUrl,
      needsVerification: false,
      isGovSource: true,
    }));

    const newsCards: UnifiedUpdate[] = news.map((item) => ({
      id: `news-${item.id}`,
      headline: getNewsHeadline(item),
      badge: item.category || 'News',
      sourceLabel: getNewsSourceLabel(item),
      body: item.body,
      bullets: getNewsSummaryBullets(item),
      visaPills: getNewsVisaPills(item),
      timestamp: item.createdAt || item.timestamp,
      url: getNewsUrl(item),
      needsVerification: requiresVerification(item),
      isGovSource: isGovAuSource(item),
    }));

    return [...officialCards, ...newsCards]
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, 3);
  }, [feed, news]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.textSecondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Greeting + streak (Duolingo) ─── */}
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.greetingCard}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingHi}>{greeting()}, {firstName} 👋</Text>
            <Text style={styles.greetingSub}>
              {profile?.anzscoCode
                ? `ANZSCO ${profile.anzscoCode}${profile.subscribedOccupation ? ' · ' + profile.subscribedOccupation : ''}`
                : "Here's what matters for your migration today."}
            </Text>
          </View>
          <View style={styles.streakPill}>
            <Ionicons name="flame" size={16} color={Colors.warning} />
            <Text style={styles.streakText}>{streak}-day streak</Text>
          </View>
        </LinearGradient>

        {/* ─── Next best action hero (Notion) ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{action.isCelebration ? "Today's suggestion" : 'Next best action'}</Text>
          <TouchableOpacity
            style={styles.heroCard}
            onPress={() => action.onPress(router)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${action.label}. ${action.cta}`}
          >
            <View style={styles.heroIcon}>
              <Ionicons name={action.iconName} size={24} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{action.label}</Text>
              <Text style={styles.heroHelper}>{action.helper}</Text>
              <View style={styles.heroCta}>
                <Text style={styles.heroCtaText}>{action.cta}</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.accent} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── Points snapshot (fitness ring) ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Points snapshot</Text>
          <View style={styles.snapshotRow}>
            <ProgressRing
              value={pointsRing.percent}
              size={92}
              stroke={9}
              colorFilled={Colors.accent}
              colorTrack={Colors.divider}
              label={String(pointsRing.total || 0)}
              sub="/ 65"
            />
            <View style={{ flex: 1, marginLeft: Spacing.lg }}>
              <Text style={styles.snapshotTitle}>
                {!pointsRing.hasScore
                  ? 'No score yet'
                  : pointsRing.total >= 65
                    ? 'Above indicative threshold'
                    : 'Below indicative threshold'}
              </Text>
              <Text style={styles.snapshotHelper}>
                {pointsRing.hasScore
                  ? 'Cutoffs move round to round. Open the calculator to recompute after any change to age, English, or work experience.'
                  : 'Open the calculator to compute your first score — takes about a minute.'}
              </Text>
              <Pressable onPress={() => router.push('/(tabs)/calculator' as any)}>
                <Text style={styles.link}>Open calculator →</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ─── Quick actions (Apple HIG grid) — moved above updates so the ─── */}
        {/* grid is reachable without scrolling past the news feed.          */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Quick actions</Text>
          <View style={styles.quickGrid}>
            <QuickTile
              Colors={Colors}
              icon="calculator-outline"
              label="Points"
              onPress={() => router.push('/(tabs)/calculator' as any)}
            />
            <QuickTile
              Colors={Colors}
              icon="briefcase-outline"
              label="Occupations"
              onPress={() => router.push('/occupations' as any)}
            />
            <QuickTile
              Colors={Colors}
              icon="ribbon-outline"
              label="Rounds"
              onPress={() => router.push('/(tabs)/rounds' as any)}
            />
            <QuickTile
              Colors={Colors}
              icon="flag-outline"
              label="States"
              onPress={() => router.push('/(tabs)/states' as any)}
            />
            <QuickTile
              Colors={Colors}
              icon="notifications-outline"
              label="Alerts"
              onPress={() => router.push('/(tabs)/notifications' as any)}
            />
            <QuickTile
              Colors={Colors}
              icon="map-outline"
              label="Journey"
              onPress={() => router.push('/journey' as any)}
            />
            <QuickTile
              Colors={Colors}
              icon="library-outline"
              label="Sources"
              onPress={() => router.push('/sources' as any)}
            />
          </View>
        </View>

        {/* ─── Latest updates (compact feed) ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Latest official updates</Text>
            <Pressable onPress={() => router.push('/(tabs)/notifications' as any)}>
              <Text style={styles.link}>See all</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.skeletonCard}>
              <ActivityIndicator color={Colors.accent} />
              <Text style={styles.skeletonText}>Loading updates…</Text>
            </View>
          ) : unifiedUpdates.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="notifications-off-outline" size={22} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Nothing yet</Text>
              <Text style={styles.emptyHelper}>
                We only surface official laws and directions from Home Affairs and state programs. When one lands, it'll appear here.
              </Text>
              <Pressable onPress={() => router.push('/sources' as any)}>
                <Text style={styles.link}>See our sources →</Text>
              </Pressable>
            </View>
          ) : (
            unifiedUpdates.map((item) => {
              const expanded = expandedIds.has(item.id);
              const [firstBullet, ...restBullets] = item.bullets;
              return (
                <View key={item.id} style={styles.feedCard}>
                  <View style={styles.feedBadgeRow}>
                    <View style={styles.feedBadge}>
                      <Text style={styles.feedBadgeText}>{item.badge}</Text>
                    </View>
                    <View style={item.isGovSource ? styles.officialBadge : styles.mediaBadge}>
                      <Text style={item.isGovSource ? styles.officialBadgeText : styles.mediaBadgeText}>
                        {item.isGovSource ? '✓ Official Notice' : 'Media Report'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.feedTitle} numberOfLines={2}>{item.headline}</Text>

                  {item.visaPills.length > 0 ? (
                    <View style={styles.pillRow}>
                      {item.visaPills.map((v) => (
                        <View key={v} style={styles.visaPill}>
                          <Text style={styles.visaPillText}>{v}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {firstBullet ? (
                    <View style={styles.bulletRow}>
                      <Text style={styles.bulletLabel}>{firstBullet.label}: </Text>
                      <Text style={styles.feedBody} numberOfLines={2}>{firstBullet.text}</Text>
                    </View>
                  ) : item.body ? (
                    <Text style={styles.feedBody} numberOfLines={2}>{item.body}</Text>
                  ) : null}

                  {expanded && restBullets.map((b) => (
                    <View key={b.label} style={styles.bulletRow}>
                      <Text style={styles.bulletLabel}>{b.label}: </Text>
                      <Text style={styles.feedBody}>{b.text}</Text>
                    </View>
                  ))}

                  {restBullets.length > 0 ? (
                    <Pressable onPress={() => toggleExpanded(item.id)} hitSlop={8}>
                      <Text style={styles.showMoreLink}>{expanded ? 'Show less ︿' : 'Show more ⌄'}</Text>
                    </Pressable>
                  ) : null}

                  <View style={styles.feedFooterRow}>
                    <Text style={styles.feedMeta}>{item.sourceLabel} · {timeAgo(item.timestamp)}</Text>
                    {item.url ? (
                      <Pressable onPress={() => void openExternalUrl(item.url!)}>
                        <Text style={styles.readMoreLink}>Read full article ↗</Text>
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => router.push('/(tabs)/notifications' as any)}>
                        <Text style={styles.readMoreLink}>View details ↗</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ─── Trust footnote ─── */}
        <View style={styles.section}>
          <Text style={styles.trustNote}>
            MigrateAU is independent and not affiliated with the Australian Government. Info is drawn from official sources.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function QuickTile({
  Colors, icon, label, onPress,
}: {
  Colors: ReturnType<typeof useColors>;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        {
          flexBasis: '31%',
          backgroundColor: Colors.surface,
          borderColor: Colors.border,
          borderWidth: 1,
          borderRadius: Radius.md,
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.sm,
          alignItems: 'center',
          marginBottom: Spacing.sm,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={Colors.accent} />
      <Text style={{ marginTop: 6, color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    greetingCard: {
      marginHorizontal: Spacing.md,
      marginTop: Spacing.sm,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
    },
    greetingHi: { color: '#FFFFFF', fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    greetingSub: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm, marginTop: 4 },
    streakPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.12)',
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: Radius.full,
    },
    streakText: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
    section: { paddingHorizontal: Spacing.md, marginTop: Spacing.xl },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionLabel: {
      color: Colors.textMuted,
      fontSize: FontSize.xs,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: Spacing.sm,
      fontWeight: FontWeight.semiBold,
    },
    heroCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.surface,
      borderColor: Colors.border,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: Radius.md,
      backgroundColor: Colors.infoLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    heroTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.semiBold },
    heroHelper: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
    heroCta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
    heroCtaText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
    snapshotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.surface,
      borderColor: Colors.border,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
    },
    snapshotTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semiBold },
    snapshotHelper: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 4 },
    link: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, marginTop: 6 },
    skeletonCard: {
      backgroundColor: Colors.surface,
      borderColor: Colors.border,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skeletonText: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 8 },
    emptyCard: {
      backgroundColor: Colors.surface,
      borderColor: Colors.border,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      alignItems: 'center',
    },
    emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semiBold, marginTop: 6 },
    emptyHelper: { color: Colors.textSecondary, fontSize: FontSize.xs, textAlign: 'center', marginTop: 4 },
    feedCard: {
      backgroundColor: Colors.surface,
      borderColor: Colors.border,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
    },
    feedBadge: {
      alignSelf: 'flex-start',
      backgroundColor: Colors.infoLight,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
      marginBottom: 6,
    },
    feedBadgeText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
    feedTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semiBold },
    feedBody: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 4 },
    feedMeta: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 6 },
    feedBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    officialBadge: {
      alignSelf: 'flex-start',
      backgroundColor: '#DCFCE7',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
      marginBottom: 6,
    },
    officialBadgeText: { color: '#15803D', fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
    mediaBadge: {
      alignSelf: 'flex-start',
      backgroundColor: Colors.surfaceRaised,
      borderColor: Colors.border,
      borderWidth: 1,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
      marginBottom: 6,
    },
    mediaBadgeText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
    showMoreLink: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, marginTop: 4 },
    bulletRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
    bulletLabel: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
    visaPill: {
      backgroundColor: Colors.surfaceRaised,
      borderColor: Colors.border,
      borderWidth: 1,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
    },
    visaPillText: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
    feedFooterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    readMoreLink: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    newsBadgeLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 1, fontWeight: FontWeight.semiBold },
    trustNote: {
      color: Colors.textMuted,
      fontSize: FontSize.xs,
      textAlign: 'center',
      lineHeight: 16,
    },
  });
}
