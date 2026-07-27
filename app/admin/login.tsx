import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../constants/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '../../constants/theme';

async function requireAdmin(user: FirebaseAuthTypes.User): Promise<void> {
  const token = await user.getIdTokenResult(true);
  if (token.claims.admin !== true) {
    await auth().signOut();
    throw new Error('This account does not have administrator access.');
  }
}

export default function AdminLogin() {
  const Colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [resolver, setResolver] = useState<FirebaseAuthTypes.MultiFactorResolver | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const completeLogin = async (user: FirebaseAuthTypes.User) => {
    await requireAdmin(user);
    router.replace('/admin/dashboard' as any);
  };

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password) {
      setError('Enter your admin email and password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const credential = await auth().signInWithEmailAndPassword(email.trim(), password);
      await completeLogin(credential.user);
    } catch (loginError: any) {
      const mfaResolver = auth.getMultiFactorResolver(auth(), loginError);
      if (mfaResolver) {
        const totpFactor = mfaResolver.hints.find((hint) => hint.factorId === 'totp');
        if (!totpFactor) {
          setError('This account requires an unsupported second factor.');
        } else {
          setResolver(mfaResolver);
        }
      } else {
        setError(loginError?.message || 'Sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTotpLogin = async () => {
    const factor = resolver?.hints.find((hint) => hint.factorId === 'totp');
    if (!resolver || !factor || !/^\d{6}$/.test(totpCode)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const assertion = (auth as any).TotpMultiFactorGenerator.assertionForSignIn(factor.uid, totpCode);
      const credential = await resolver.resolveSignIn(assertion);
      await completeLogin(credential.user);
    } catch (totpError: any) {
      setError(totpError?.message || 'The authenticator code was not accepted.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: Colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>

      <View style={[styles.panel, { backgroundColor: Colors.surface, borderColor: Colors.border }]}> 
        <View style={[styles.icon, { backgroundColor: `${Colors.secondary}20` }]}> 
          <Ionicons name="shield-checkmark" size={28} color={Colors.secondary} />
        </View>
        <Text style={[styles.title, { color: Colors.textPrimary }]}>Admin Sign In</Text>
        <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Firebase verifies your password and administrator access.</Text>

        {!resolver ? (
          <>
            <TextInput
              style={[styles.input, { color: Colors.textPrimary, backgroundColor: Colors.background, borderColor: Colors.border }]}
              value={email}
              onChangeText={setEmail}
              placeholder="Admin email"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextInput
              style={[styles.input, { color: Colors.textPrimary, backgroundColor: Colors.background, borderColor: Colors.border }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoComplete="current-password"
              onSubmitEditing={handlePasswordLogin}
            />
          </>
        ) : (
          <>
            <Text style={[styles.mfaLabel, { color: Colors.textSecondary }]}>Authenticator code</Text>
            <TextInput
              style={[styles.input, styles.codeInput, { color: Colors.textPrimary, backgroundColor: Colors.background, borderColor: Colors.border }]}
              value={totpCode}
              onChangeText={(value) => setTotpCode(value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              onSubmitEditing={handleTotpLogin}
            />
          </>
        )}

        {!!error && <Text style={[styles.error, { color: Colors.error }]}>{error}</Text>}

        <TouchableOpacity
          style={[styles.submit, { backgroundColor: Colors.secondary }, loading && styles.disabled]}
          onPress={resolver ? handleTotpLogin : handlePasswordLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.primaryDark} />
            : <Text style={[styles.submitText, { color: Colors.primaryDark }]}>{resolver ? 'Verify Code' : 'Sign In'}</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  backButton: { position: 'absolute', top: 54, left: Spacing.lg, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  panel: { borderWidth: 1, borderRadius: Radius.xl, padding: Spacing.xl },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  subtitle: { fontSize: FontSize.sm, lineHeight: 19, marginTop: Spacing.xs, marginBottom: Spacing.xl },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 13, fontSize: FontSize.md, marginBottom: Spacing.md },
  codeInput: { textAlign: 'center', fontSize: FontSize.xxl, letterSpacing: 6 },
  mfaLabel: { fontSize: FontSize.sm, marginBottom: Spacing.sm },
  error: { fontSize: FontSize.sm, lineHeight: 18, marginBottom: Spacing.md },
  submit: { minHeight: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  disabled: { opacity: 0.6 },
});