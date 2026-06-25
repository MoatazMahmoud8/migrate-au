import { useColorScheme } from 'react-native';
import { UserProfile } from '../constants/types';

/**
 * Check if user has dark mode enabled
 */
export function hasDarkMode(profile: UserProfile): boolean {
  return profile.isPremium; // Only premium users can use dark mode
}

/**
 * Get the device's system color scheme preference
 */
export function getSystemColorScheme(): 'light' | 'dark' | null {
  return useColorScheme(); // Returns 'light', 'dark', or null
}

/**
 * Check if dark mode should be active
 * Priority: User preference (if premium) > System preference
 */
export function shouldUseDarkMode(profile: UserProfile | null, userPreference?: boolean): boolean {
  if (!profile) return false;
  
  // If user is premium and has dark mode enabled, use their preference
  if (hasDarkMode(profile) && userPreference !== undefined) {
    return userPreference;
  }

  // Otherwise use system preference
  const systemScheme = getSystemColorScheme();
  return systemScheme === 'dark';
}

/**
 * Dark mode colors (when enabled)
 */
export const DarkModeColors = {
  background: '#0F1419',
  surface: '#1A1F2E',
  border: '#2D3748',
  textPrimary: '#F0F4F8',
  textSecondary: '#A0AEC0',
  textMuted: '#718096',
};
