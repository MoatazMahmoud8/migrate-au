/**
 * InAppBrowser.tsx
 *
 * In-app browser component that displays web content without leaving the app.
 * Uses native WebView on mobile platforms and iframe approach on web.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../constants/theme';
import { useColors } from '../constants/ThemeContext';

// Lazy load WebView only on native platforms
let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    // WebView not available, will use fallback
  }
}

interface InAppBrowserProps {
  url: string;
  onClose: () => void;
  title?: string;
}

export default function InAppBrowser({ url, onClose, title }: InAppBrowserProps) {
  const Colors = useColors();
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = React.useRef<any>(null);

  const handleGoBack = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  };

  // On web, render an embedded iframe
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Official Source'}
          </Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Iframe container */}
        <View style={styles.webContainer}>
          <iframe
            src={url}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: 0,
            }}
            title="External Content"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </View>
      </SafeAreaView>
    );
  }

  // On native, render WebView if available
  if (WebView) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={canGoBack ? handleGoBack : onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Official Source'}
          </Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading content...</Text>
          </View>
        )}

        {/* WebView */}
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={(navState: any) => setCanGoBack(navState.canGoBack)}
          style={{ flex: 1 }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
          // Security settings
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
        />
      </SafeAreaView>
    );
  }

  // Fallback: show message that WebView is not available
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Official Source</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.fallbackContainer}>
        <Ionicons name="warning-outline" size={48} color={Colors.warning} />
        <Text style={styles.fallbackTitle}>Unable to Load</Text>
        <Text style={styles.fallbackText}>
          The in-app browser is not available. Please update the app to use this feature.
        </Text>
        <TouchableOpacity
          style={[styles.fallbackButton, { backgroundColor: Colors.primary }]}
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Text style={styles.fallbackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
    flex: 1,
    marginHorizontal: Spacing.md,
    textAlign: 'center',
  },
  webContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: FontWeight.regular,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  fallbackTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  fallbackText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  fallbackButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    minWidth: 200,
    alignItems: 'center',
  },
  fallbackButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    color: 'white',
  },
});
