/**
 * Thin wrapper around expo-haptics. Silently no-ops on platforms / devices that
 * don't support haptic feedback (e.g. web).
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

export const tap = () => {
  if (!isSupported) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const success = () => {
  if (!isSupported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

export const warning = () => {
  if (!isSupported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};

export const selection = () => {
  if (!isSupported) return;
  Haptics.selectionAsync().catch(() => {});
};
