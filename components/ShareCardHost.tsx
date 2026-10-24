/**
 * Mounts a `ShareableResultCard` off-screen so it can be captured by
 * `captureAndShareCard` without ever being visible to the user. Place one of
 * these near the top of a screen, keep a ref to it, and pass that ref both
 * here and to `captureAndShareCard`.
 */
import React, { forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { ShareableResultCard, ShareCardData } from './ShareableResultCard';

export const ShareCardHost = forwardRef<View, { data: ShareCardData | null; appVersion?: string }>(
  ({ data, appVersion }, ref) => {
    if (!data) return null;
    return (
      <View style={styles.offscreen} pointerEvents="none">
        <ShareableResultCard ref={ref} data={data} appVersion={appVersion} />
      </View>
    );
  }
);
ShareCardHost.displayName = 'ShareCardHost';

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    top: -9999,
    left: -9999,
  },
});
