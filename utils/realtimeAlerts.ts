import messaging from '@react-native-firebase/messaging';

export interface RealTimeAlert {
  id: string;
  type: 'skillselect-round' | 'state-opens' | 'policy-change' | 'age-bracket-alert';
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

/**
 * Enable real-time alerts for premium users
 * Subscribes to Firebase topics for instant notifications
 */
export async function enableRealtimeAlerts(): Promise<void> {
  try {
    // Subscribe to critical topics
    await messaging().subscribeToTopic('skillselect-rounds');
    await messaging().subscribeToTopic('state-allocations');
    await messaging().subscribeToTopic('policy-updates');
    
    console.log('✓ Real-time alerts enabled');
  } catch (error) {
    console.error('Error enabling real-time alerts:', error);
  }
}

/**
 * Disable real-time alerts for free users / on logout
 */
export async function disableRealtimeAlerts(): Promise<void> {
  try {
    await messaging().unsubscribeFromTopic('skillselect-rounds');
    await messaging().unsubscribeFromTopic('state-allocations');
    await messaging().unsubscribeFromTopic('policy-updates');
    
    console.log('✓ Real-time alerts disabled');
  } catch (error) {
    console.error('Error disabling real-time alerts:', error);
  }
}

/**
 * Get real-time alerts preference for current user
 */
export function shouldEnableRealtime(isPremium: boolean): boolean {
  return isPremium; // Only premium users get real-time
}

/**
 * Handle incoming real-time alert notification
 */
export function handleRealtimeAlertNotification(notification: any): RealTimeAlert {
  return {
    id: notification.messageId || Date.now().toString(),
    type: notification.data?.alertType || 'policy-change',
    title: notification.notification?.title || 'Migration Update',
    body: notification.notification?.body || 'New update available',
    timestamp: new Date(),
    read: false,
    actionUrl: notification.data?.actionUrl,
  };
}
