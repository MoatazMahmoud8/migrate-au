import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/theme';
import { useEffect, useState } from 'react';
import { initNotifications, subscribeToFeed } from '../utils/notifications';
import { initRevenueCat } from '../utils/iap';

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

export default function RootLayout() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    // Initialise RevenueCat for IAP
    initRevenueCat();

    // Initialise FCM — subscribe to all migration topics
    initNotifications(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']);

    // Track unread count for tab badge
    const unsub = subscribeToFeed(items => {
      setUnread(items.filter(n => !n.read).length);
    });
    return unsub;
  }, []);

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
      >
        <Tabs.Screen
          name="(tabs)/index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="(tabs)/calculator"
          options={{
            title: 'Points',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'calculator' : 'calculator-outline'} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="(tabs)/states"
          options={{
            title: 'States',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'map' : 'map-outline'} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="(tabs)/ai"
          options={{
            title: 'Aria AI',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'sparkles' : 'sparkles-outline'} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="(tabs)/notifications"
          options={{
            title: 'Updates',
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
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'person-circle' : 'person-circle-outline'} color={color} focused={focused} />
            ),
          }}
        />
        {/* Hidden screen — no tab bar entry */}
        <Tabs.Screen
          name="(tabs)/english-tests"
          options={{
            title: 'English Tests',
            href: null,
            headerShown: false,
          }}
        />
      </Tabs>
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
});
