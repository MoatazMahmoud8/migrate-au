import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';
import { ChatMessage } from '../../constants/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey ?? process.env.GEMINI_API_KEY ?? '';

const SYSTEM_PROMPT = `You are Aria, an expert Australian skilled migration consultant. 
You help users understand the points-based migration system (subclasses 189, 190, 491), 
state nomination, occupation lists (MLTSSL, STSOL), English requirements, and visa pathways.
Be concise, accurate, and always recommend consulting a registered migration agent (MARA) 
for formal advice. If you don't know something, say so honestly.`;

const SUGGESTIONS = [
  'How do I get 65 points for 189?',
  'What is state nomination for 190?',
  'Explain MLTSSL vs STSOL',
  'What is a skills assessment?',
];

export default function AiScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const chatRef = useRef<any>(null);

  const initChat = () => {
    if (!GEMINI_API_KEY) return null;
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    return model.startChat({
      history: [],
      systemInstruction: SYSTEM_PROMPT,
    });
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (!GEMINI_API_KEY) {
      alert('Gemini API key not configured. Set GEMINI_API_KEY in your environment.');
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      if (!chatRef.current) chatRef.current = initChat();
      const result = await chatRef.current.sendMessage(trimmed);
      const responseText = result.response.text();

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Sorry, I encountered an error. Please try again.',
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
              <Text style={styles.userText}>{item.text}</Text>
            </LinearGradient>
          ) : (
            <Text style={styles.bubbleText}>{item.text}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
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

          <Text style={styles.emptyTitle}>Hi, I'm Aria ✨</Text>
          <Text style={styles.emptySub}>Your AI-powered Australian migration consultant</Text>

          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s} style={styles.chip} onPress={() => send(s)}>
                <Ionicons name="chevron-forward-circle-outline" size={14} color={Colors.accent} />
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.disclaimer}>
            <Ionicons name="shield-checkmark-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.disclaimerText}>For general guidance only. Consult a MARA agent for formal advice.</Text>
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
          <View style={styles.typingDots}>
            <ActivityIndicator size="small" color={Colors.accent} />
          </View>
          <Text style={styles.typingText}>Aria is thinking…</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
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
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disclaimerText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },

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
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  sendBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: {},
});
