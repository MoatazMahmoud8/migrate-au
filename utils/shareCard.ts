/**
 * Capture utility for `ShareableResultCard`.
 *
 * Flow:
 *  1. Mount `<ShareCardHost>` once near the root of the screen (it renders
 *     nothing visible — the card is positioned off-screen).
 *  2. Call `captureAndShareCard(ref, message)` from a button's onPress.
 *  3. `react-native-view-shot` snapshots the off-screen view to a temp PNG.
 *  4. `expo-sharing` launches the native share sheet with that PNG attached.
 *
 * On web (no native share sheet / no view-shot host rendering), we fall back
 * to the existing text-only share so the button never dead-ends.
 */
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';

export const DEFAULT_SHARE_MESSAGE =
  'Calculated my Australian Skilled Migration points on MigrateAU! Check your pathway here: https://migrateau.app/get';

/**
 * Captures the view behind `ref` as a PNG and opens the native share sheet.
 * Returns true if the share sheet was opened, false if it fell back/no-op'd
 * (e.g. unsupported platform, user cancelled permission, capture failed).
 */
export async function captureAndShareCard(
  ref: React.RefObject<any>,
  message: string = DEFAULT_SHARE_MESSAGE
): Promise<boolean> {
  if (Platform.OS === 'web') {
    // view-shot + the native share sheet aren't available on web; let the
    // caller fall back to the existing text-only share path.
    return false;
  }

  try {
    // Lazy-require so web bundles never pull in the native view-shot module.
    const ViewShot = require('react-native-view-shot');
    const captureRef: (ref: any, options?: any) => Promise<string> =
      ViewShot.captureRef ?? ViewShot.default?.captureRef;

    if (!ref.current || !captureRef) return false;

    const uri = await captureRef(ref.current, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return false;

    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Share your MigrateAU result',
      UTI: 'public.png',
    });
    return true;
  } catch {
    return false;
  }
}
