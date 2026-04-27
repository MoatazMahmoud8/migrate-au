import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/theme';

SplashScreen.hideAsync();

function TabIcon({ name, color, focused }: { name: any; color: string; focused: boolean }) {
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconActive]}>
      <Ionicons name={name} size={20} color={color} />
    </View>
  );
}

export default function RootLayout() {
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
          name="(tabs)/profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'person-circle' : 'person-circle-outline'} color={color} focused={focused} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    backgroundColor: 'rgba(255,205,0,0.15)',
  },
});
