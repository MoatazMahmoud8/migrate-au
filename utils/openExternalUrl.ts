import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking, Platform } from 'react-native';

const WEB_URL_PATTERN = /^https?:\/\//i;

export async function openExternalUrl(rawUrl: string): Promise<boolean> {
  const url = rawUrl.trim();

  try {
    if (!url) throw new Error('Missing URL');

    if (WEB_URL_PATTERN.test(url) && Platform.OS !== 'web') {
      await WebBrowser.openBrowserAsync(url);
      return true;
    }

    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error(`Unsupported URL: ${url}`);

    await Linking.openURL(url);
    return true;
  } catch {
    if (WEB_URL_PATTERN.test(url) && Platform.OS !== 'web') {
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return true;
        }
      } catch {
        // The user-facing message below handles both browser attempts failing.
      }
    }

    Alert.alert('Unable to open link', 'Please check your connection and try again.');
    return false;
  }
}