import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { useColors } from '../../constants/ThemeContext';
import { ChatMessage } from '../../constants/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { hasExceededLimit, getRemainingUses, incrementUsage } from '../../utils/paywall';
import { getProfile, saveProfile } from '../../utils/storage';
import { PaywallModal } from '../../components/PaywallModal';
import { UsageMeter } from '../../components/UsageMeter';
import { sendAriaMessage, AriaHistoryMessage } from '../../utils/aria';
import { recordEngagement } from '../../utils/rateApp';
import Markdown from 'react-native-markdown-display';

// System prompt and Gemini key live on the server (functions/index.js).
// The client only forwards the conversation history.

const SUGGESTIONS = [
  '🗺️ Map my Golden Path — I have 85 points',
  '⚠️ My IELTS expires in 4 months, what should I do?',
  '📍 Best state for ANZSCO 261313?',
  '🏆 How do I reach 95+ points?',
];

export default function AiScreen() {
  const Colors = useColors();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // Load profile on mount
  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setProfile(p);
      const rem = getRemainingUses('aiMessages', p);
      setRemaining(rem);
    })();
  }, []);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (!profile) {
      alert('Loading profile... Please try again.');
      return;
    }

    // Check if user has exceeded AI message limit
    if (hasExceededLimit('aiMessages', profile)) {
      setShowPaywall(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
    };

    // Snapshot prior conversation for the server (last 20 turns sanitized server-side)
    const history: AriaHistoryMessage[] = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const responseText = await sendAriaMessage(trimmed, history);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Increment usage after successful message
      const updated = incrementUsage('aiMessages', profile);
      setProfile(updated);
      await saveProfile(updated);
      const rem = getRemainingUses('aiMessages', updated);
      setRemaining(rem);

      // Track engagement for review prompt
      recordEngagement('ai_chat');
    } catch (e: any) {
      console.error('Aria error:', e?.message);
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `Sorry, I encountered an error: ${e?.message || 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <LinearGradient colors={['#2D1B6E', '#1A0A3D']} style={styles.aiAvatarGrad}>
              <Ionicons name="sparkles" size={14} color={Colors.secondary} />
            </LinearGradient>
          </View>
        )}
        <View style={[styles.bubbleInner, isUser ? styles.userInner : styles.aiInner]}>
          {isUser ? (
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.userBubbleGrad}>
              <Text style={[styles.userText, {color: Colors.textPrimary}]}>{item.text}</Text>
            </LinearGradient>
          ) : (
            <Markdown style={markdownStyles}>{item.text}</Markdown>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, backgroundColor: Colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Usage meter for free users */}
      {profile && remaining !== null && !profile.isPremium && (
        <UsageMeter
          feature="aiMessages"
          remaining={remaining}
          onUpgradePress={() => setShowPaywall(true)}
          isPremium={profile.isPremium}
        />
      )}

      {messages.length === 0 ? (
        <View style={styles.empty}>
          {/* Aria avatar */}
          <LinearGradient
            colors={['#2D1B6E', '#1A0A3D']}
            style={styles.ariaAvatar}
          >
            <View style={styles.ariaAvatarRing}>
              <Ionicons name="sparkles" size={34} color={Colors.secondary} />
            </View>
          </LinearGradient>

          <Text style={[styles.emptyTitle, {color: Colors.textPrimary}]}>Hi, I'm Aria ✨</Text>
          <Text style={[styles.emptySub, {color: Colors.textPrimary}]}>Your AI-powered Australian migration consultant</Text>

          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s} style={[styles.chip, { backgroundColor: Colors.surface, borderColor: Colors.border }]} onPress={() => send(s)}>
                <Ionicons name="chevron-forward-circle-outline" size={14} color={Colors.accent} />
                <Text style={[styles.chipText, {color: Colors.textPrimary}]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.disclaimer, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Ionicons name="shield-checkmark-outline" size={13} color={Colors.textMuted} />
            <Text style={[styles.disclaimerText, {color: Colors.textPrimary}]}>
              Aria provides info based on official docs. Double-check on{' '}
              <Text
                style={styles.disclaimerLink}
                onPress={() => Linking.openURL('https://immi.homeaffairs.gov.au')}
              >
                immi.homeaffairs.gov.au
              </Text>
              {' '}before making decisions.
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {loading && (
        <View style={styles.typing}>
          <View style={[styles.typingDots, { backgroundColor: Colors.surface }]}>
            <ActivityIndicator size="small" color={Colors.accent} />
          </View>
          <Text style={[styles.typingText, {color: Colors.textPrimary}]}>Aria is thinking…</Text>
        </View>
      )}

      <View style={styles.sourceNote}>
        <Ionicons name="globe-outline" size={11} color={Colors.accent} style={{ opacity: 0.6 }} />
        <Text style={[styles.sourceNoteText, {color: Colors.textPrimary}]}>
          Verify on{' '}
          <Text
            style={styles.sourceNoteLink}
            onPress={() => Linking.openURL('https://immi.homeaffairs.gov.au')}
          >
            immi.homeaffairs.gov.au
          </Text>
        </Text>
      </View>

      <View style={[styles.inputRow, { marginBottom: tabBarHeight }]}>
        <TextInput
          style={[styles.input, { backgroundColor: Colors.surface, borderColor: Colors.border, color: Colors.textPrimary }]}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your visa options…"
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={!input.trim() || loading}
        >
          <LinearGradient
            colors={input.trim() && !loading ? [Colors.secondary, '#FFB800'] : [Colors.surface, Colors.surface]}
            style={styles.sendBtnGrad}
          >
            <Ionicons name="send" size={18} color={input.trim() && !loading ? Colors.primaryDark : Colors.textMuted} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        userId={profile?.userId || 'local_user'}
        title="Unlock Aria AI Premium"
        message="Your 3 free AI questions per month is exhausted."
        feature="aiMessages"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  ariaAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  ariaAvatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,205,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  emptySub: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 22 },

  suggestions: { width: '100%', gap: Spacing.sm, marginBottom: Spacing.xl },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
  },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  disclaimerText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },
  disclaimerLink: { color: Colors.accent, textDecorationLine: 'underline' },

  sourceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  sourceNoteText: { fontSize: 10, color: Colors.textMuted },
  sourceNoteLink: { fontSize: 10, color: Colors.accent, textDecorationLine: 'underline' },

  // Messages
  list: { padding: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.md },
  bubble: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden' },
  aiAvatarGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bubbleInner: { maxWidth: '80%', borderRadius: Radius.xl },
  userInner: { overflow: 'hidden', borderBottomRightRadius: 4 },
  aiInner: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    padding: Spacing.md,
  },
  userBubbleGrad: { padding: Spacing.md, borderRadius: Radius.xl, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 22 },
  userText: { fontSize: FontSize.md, color: Colors.white, lineHeight: 22 },

  // Typing
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  typingDots: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingText: { fontSize: FontSize.sm, color: Colors.textMuted },

  // Input bar
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    maxHeight: 120,
    borderWidth: 1,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  sendBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: {},
});

const markdownStyles = StyleSheet.create({
  body: { color: Colors.textPrimary, fontSize: FontSize.md, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 8, color: Colors.textPrimary },
  heading1: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginTop: 8, marginBottom: 6 },
  heading2: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginTop: 8, marginBottom: 4 },
  heading3: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, marginTop: 6, marginBottom: 4 },
  strong: { fontWeight: '700', color: Colors.textPrimary },
  em: { fontStyle: 'italic' },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginBottom: 4 },
  link: { color: Colors.accent, textDecorationLine: 'underline' },
  code_inline: {
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: FontSize.sm,
  },
  fence: {
    borderRadius: 6,
    padding: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: FontSize.sm,
    marginVertical: 6,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 6,
  },
  table: { borderWidth: 1, borderColor: Colors.border, borderRadius: 6, marginVertical: 6 },
  thead: { backgroundColor: Colors.background },
  th: { padding: 6, fontWeight: '700', color: Colors.textPrimary },
  td: { padding: 6, color: Colors.textPrimary },
  hr: { backgroundColor: Colors.border, height: 1, marginVertical: 8 },
});
