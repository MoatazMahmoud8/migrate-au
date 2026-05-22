import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/theme';
import { useEffect, useState } from 'react';
import { initNotifications, subscribeToFeed } from '../utils/notifications';
import { initRevenueCat, syncSubscriptionStatus, getRevenueCatUserId } from '../utils/iap';
import { selection } from '../utils/haptics';
import { getProfile, saveProfile } from '../utils/storage';
import OnboardingModal from '../components/OnboardingModal';
import { refreshProcessingTimes } from '../utils/processingTimes';
import { refreshSkilledOccupations } from '../utils/skilledOccupations';

SplashScreen.hideAsync();

function TabIcon({
  name,
  color,
  focused,
  badge,
}: {
  name: any;
  color: string;
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={tabStyles.iconWrap}>
      <View style={[tabStyles.iconInner, focused && tabStyles.iconActive]}>
        <Ionicons name={name} size={20} color={color} />
      </View>
      {badge != null && badge > 0 && (
        <View style={tabStyles.badge}>
          <Text style={tabStyles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

function AriaFab({ focused }: { focused: boolean }) {
  return (
    <View style={tabStyles.fabWrap}>
      <LinearGradient
        colors={focused ? [Colors.secondary, '#FFB800'] : ['#A78BFA', '#7C3AED']}
        style={tabStyles.fab}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="sparkles" size={26} color={focused ? Colors.primaryDark : Colors.white} />
      </LinearGradient>
    </View>
  );
}

export default function RootLayout() {
  const [unread, setUnread] = useState(0);
  const [onboardingVisible, setOnboardingVisible] = useState(false);

  useEffect(() => {
    // Initialise RevenueCat for IAP
    initRevenueCat().then(() => {
      // Sync entitlement → local isPremium on every cold start
      // Handles reinstalls, device switches, and subscription expirations
      syncSubscriptionStatus();
    });

    // Initialise FCM — subscribe to all migration topics + register device for watchlist
    let unsubFeed: (() => void) | undefined;
    (async () => {
      const userId = await getRevenueCatUserId().catch(() => undefined);
      await initNotifications(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'], userId ?? undefined);

      // Track unread count for tab badge — must wait for userId so personalised
      // watchlist alerts are included.
      unsubFeed = subscribeToFeed(
        items => setUnread(items.filter(n => !n.read).length),
        30,
        userId ?? undefined,
      );
    })();

    // First-launch onboarding
    getProfile().then((p) => {
      if (!p.onboardingComplete) setOnboardingVisible(true);
    });

    // Once-per-day processing-time refresh (silent; screen also pull-to-refreshes)
    refreshProcessingTimes()
      .then(async ({ changes }) => {
        if (!changes.length) return;
        try {
          const Notifications = await import('expo-notifications');
          for (const change of changes) {
            const label = change.stream
              ? `${change.name} — ${change.stream}`
              : change.name;
            const direction =
              change.after.p50 < change.before.p50 ? '↓ Faster' : '↑ Slower';
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `SC ${change.subclass} processing time changed`,
                body: `${label}: ${direction} — now ${change.after.p50} (was ${change.before.p50})`,
                data: { route: '/processing-times' },
                sound: 'default',
              },
              trigger: null,
            });
          }
        } catch (e) {
          console.warn('[processing-times] notify failed:', e);
        }
      })
      .catch(() => {});

    // Once-per-day skilled occupations refresh (CSOL / MLTSSL / STSOL / ROL)
    refreshSkilledOccupations()
      .then(async ({ changes }) => {
        if (!changes.length) return;
        try {
          const Notifications = await import('expo-notifications');
          const profile = await getProfile();

          // Build the user's "watch list": anything they care about gets a
          // priority notification; everything else folds into a summary so we
          // don't spam.
          const watchedAnzscos = new Set<string>(
            [
              profile.anzscoCode,
              ...(profile.journeyEntries ?? []).map((e) => e.anzscoCode),
            ].filter((x): x is string => !!x)
          );
          const watchedStates = new Set<string>(profile.pinnedStates ?? []);

          const isWatched = (c: typeof changes[number]): boolean => {
            if (watchedAnzscos.has(c.anzsco)) return true;
            if (watchedStates.size === 0) return false;
            // Mention of a watched state in the change detail counts
            if (c.detail) {
              for (const st of watchedStates) {
                if (c.detail.includes(st)) return true;
              }
            }
            return false;
          };

          const priority = changes.filter(isWatched);
          const others = changes.filter((c) => !isWatched(c));

          // Priority: always individual, with ★ prefix
          for (const c of priority) {
            const icon = c.type === 'added' ? '+' : c.type === 'removed' ? '−' : '~';
            const verb =
              c.type === 'added'
                ? 'added to'
                : c.type === 'removed'
                ? 'removed from'
                : 'updated on';
            const lists = c.lists?.join('/') ?? '';
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `★ ${icon} ${c.name} (${c.anzsco})`,
                body: c.detail
                  ? `${verb} ${lists} · ${c.detail}`
                  : `${verb} ${lists}`,
                data: { route: '/occupations', anzsco: c.anzsco },
                sound: 'default',
              },
              trigger: null,
            });
          }

          // Others: small batch → individual (only if no watched items),
          // otherwise fold into a single summary.
          if (others.length > 0) {
            const shouldSummariseOthers =
              priority.length > 0 || others.length > 4;
            if (shouldSummariseOthers) {
              const added = others.filter((c) => c.type === 'added').length;
              const removed = others.filter((c) => c.type === 'removed').length;
              const updated = others.filter((c) => c.type === 'updated').length;
              const parts: string[] = [];
              if (added) parts.push(`${added} added`);
              if (removed) parts.push(`${removed} removed`);
              if (updated) parts.push(`${updated} updated`);
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Skilled Occupation List updated',
                  body: `${parts.join(' · ')} — tap to view`,
                  data: { route: '/occupations' },
                  sound: 'default',
                },
                trigger: null,
              });
            } else {
              for (const c of others) {
                const icon = c.type === 'added' ? '+' : c.type === 'removed' ? '−' : '~';
                const verb =
                  c.type === 'added'
                    ? 'added to'
                    : c.type === 'removed'
                    ? 'removed from'
                    : 'updated on';
                const lists = c.lists?.join('/') ?? '';
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: `${icon} ${c.name} (${c.anzsco})`,
                    body: c.detail
                      ? `${verb} ${lists} · ${c.detail}`
                      : `${verb} ${lists}`,
                    data: { route: '/occupations' },
                    sound: 'default',
                  },
                  trigger: null,
                });
              }
            }
          }
        } catch (e) {
          console.warn('[skilled-occupations] notify failed:', e);
        }
      })
      .catch(() => {});

    return () => {
      if (unsubFeed) unsubFeed();
    };
  }, []);

  const closeOnboarding = async () => {
    setOnboardingVisible(false);
    try {
      const p = await getProfile();
      await saveProfile({ ...p, onboardingComplete: true });
    } catch {}
  };

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.secondary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarBackground: () => (
            Platform.OS === 'ios'
              ? <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
              : <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.primaryDark }]} />
          ),
          tabBarStyle: {
            position: 'absolute',
            borderTopColor: 'rgba(255,255,255,0.08)',
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 88 : 70,
            paddingBottom: Platform.OS === 'ios' ? 28 : 10,
            paddingTop: 8,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.3,
            marginTop: -4,
          },
          tabBarItemStyle: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          },
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
            color: Colors.textPrimary,
          },
          headerBlurEffect: 'dark',
          headerBackground: () => (
            Platform.OS === 'ios'
              ? <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
              : <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]} />
          ),
          headerShadowVisible: false,
        }}
        screenListeners={{
          tabPress: () => selection(),
        }}
      >
        {/* ── Visible tabs (5) ─────────────────────────────────────────── */}
        <Tabs.Screen
          name="(tabs)/index"
          options={{
            title: 'Home',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="(tabs)/explore"
          options={{
            title: 'Explore',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'compass' : 'compass-outline'} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="(tabs)/ai"
          options={{
            title: '',
            headerShown: false,
            tabBarIcon: ({ focused }) => <AriaFab focused={focused} />,
            tabBarLabelStyle: { height: 0 },
          }}
        />
        <Tabs.Screen
          name="(tabs)/notifications"
          options={{
            title: 'Updates',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name={focused ? 'notifications' : 'notifications-outline'}
                color={color}
                focused={focused}
                badge={unread}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="(tabs)/profile"
          options={{
            title: 'Profile',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'person-circle' : 'person-circle-outline'} color={color} focused={focused} />
            ),
          }}
        />
        {/* ── Hidden screens — accessible via routes, no tab bar entry ── */}
        <Tabs.Screen name="(tabs)/calculator"      options={{ title: 'Points',            href: null }} />
        <Tabs.Screen name="(tabs)/rounds"          options={{ title: 'Rounds',            href: null, headerShown: false }} />
        <Tabs.Screen name="(tabs)/states"          options={{ title: 'States',            href: null, headerShown: false }} />
        <Tabs.Screen name="(tabs)/english-tests"   options={{ title: 'English',           href: null, headerShown: false }} />
        <Tabs.Screen name="(tabs)/skill-assessment" options={{ title: 'Skill Assessment', href: null, headerShown: false }} />
        <Tabs.Screen name="occupations"            options={{ title: 'Occupations',       href: null, headerShown: false }} />
        <Tabs.Screen name="processing-times"       options={{ title: 'Processing Times',  href: null, headerShown: false }} />
        <Tabs.Screen name="visas"                  options={{ title: 'Visa Pathways',     href: null, headerShown: false }} />
        <Tabs.Screen name="watchlist"              options={{ title: 'Watchlist',         href: null, headerShown: false }} />
      </Tabs>
      <OnboardingModal visible={onboardingVisible} onClose={closeOnboarding} />
    </>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: Colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  // kept for backward compat
  iconActive: {
    backgroundColor: 'rgba(255,205,0,0.15)',
  },
  fabWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    marginTop: Platform.OS === 'ios' ? -22 : -18,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    borderWidth: 3,
    borderColor: Colors.primaryDark,
  },
});
