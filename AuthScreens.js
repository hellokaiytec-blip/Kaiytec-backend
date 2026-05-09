// ============================================================
// src/screens/auth/LoginScreen.js
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuthStore from '../../store/authStore';
import { Colors, Typography, Spacing, Radius } from '../../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Navigation is handled by AppNavigator via auth state change
    } catch (err) {
      Alert.alert(
        'Login Failed',
        err.response?.data?.error || err.message || 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>K</Text>
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your Kaiytec account</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                  <Text style={styles.eyeText}>{showPass ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.btnText}>Sign In</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scroll: { flexGrow: 1, padding: Spacing.xl },
  header: { alignItems: 'center', marginTop: Spacing.xxl, marginBottom: Spacing.xxl },
  logo: {
    width: 64, height: 64, borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  logoText: { color: Colors.white, fontSize: 32, fontWeight: '800' },
  title: { fontSize: Typography.xl, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center' },
  form: { gap: Spacing.base },
  inputGroup: { gap: Spacing.xs },
  label: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.base, paddingVertical: 13,
    fontSize: Typography.base, color: Colors.textPrimary,
    backgroundColor: Colors.offWhite,
  },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 13 },
  eyeText: { fontSize: 18 },
  forgotBtn: { alignSelf: 'flex-end' },
  forgotText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '500' },
  btn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 15, alignItems: 'center', marginTop: Spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: Typography.base, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { fontSize: Typography.base, color: Colors.textSecondary },
  footerLink: { fontSize: Typography.base, color: Colors.primary, fontWeight: '700' },
});


// ============================================================
// src/screens/auth/RegisterScreen.js
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuthStore from '../../store/authStore';
import { Colors, Typography, Spacing, Radius } from '../../theme';

export function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [role, setRole] = useState('buyer');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleRegister = async () => {
    const { name, email, phone, password } = form;
    if (!name || !email || !phone || !password) {
      return Alert.alert('Missing Info', 'Please fill in all fields.');
    }
    if (password.length < 6) {
      return Alert.alert('Weak Password', 'Password must be at least 6 characters.');
    }
    setLoading(true);
    try {
      await register({ name, email, phone, password, role });
    } catch (err) {
      Alert.alert('Registration Failed', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const ROLES = [
    { id: 'buyer', label: 'Buyer', icon: '🛍', desc: 'Browse and buy products' },
    { id: 'seller', label: 'Seller', icon: '🏪', desc: 'Sell your products' },
    { id: 'provider', label: 'Provider', icon: '🔧', desc: 'Offer services' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join the Kaiytec marketplace</Text>

          {/* Role Selection */}
          <View style={styles.roleSection}>
            <Text style={styles.sectionLabel}>I am a...</Text>
            <View style={styles.roleRow}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roleCard, role === r.id && styles.roleCardActive]}
                  onPress={() => setRole(r.id)}
                >
                  <Text style={styles.roleIcon}>{r.icon}</Text>
                  <Text style={[styles.roleLabel, role === r.id && styles.roleLabelActive]}>{r.label}</Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {[
              { field: 'name', label: 'Full Name', placeholder: 'Your full name', type: 'default' },
              { field: 'email', label: 'Email Address', placeholder: 'you@example.com', type: 'email-address' },
              { field: 'phone', label: 'Phone Number', placeholder: '+232 76 000 000', type: 'phone-pad' },
              { field: 'password', label: 'Password', placeholder: 'Min. 6 characters', type: 'default', secure: true },
            ].map(({ field, label, placeholder, type, secure }) => (
              <View key={field} style={styles.inputGroup}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={form[field]}
                  onChangeText={v => update(field, v)}
                  placeholder={placeholder}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType={type}
                  secureTextEntry={!!secure}
                  autoCapitalize={field === 'name' ? 'words' : 'none'}
                />
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>

          <Text style={styles.terms}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scroll: { flexGrow: 1, padding: Spacing.xl },
  backBtn: { marginBottom: Spacing.lg },
  backText: { fontSize: Typography.base, color: Colors.primary, fontWeight: '500' },
  title: { fontSize: Typography.xxl, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: Typography.base, color: Colors.textSecondary, marginBottom: Spacing.xl },
  roleSection: { marginBottom: Spacing.xl },
  sectionLabel: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.md },
  roleRow: { flexDirection: 'row', gap: Spacing.sm },
  roleCard: {
    flex: 1, padding: Spacing.md, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', backgroundColor: Colors.offWhite,
  },
  roleCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  roleIcon: { fontSize: 22, marginBottom: 4 },
  roleLabel: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textSecondary },
  roleLabelActive: { color: Colors.primary },
  roleDesc: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
  form: { gap: Spacing.md, marginBottom: Spacing.xl },
  inputGroup: { gap: Spacing.xs },
  label: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.base, paddingVertical: 13,
    fontSize: Typography.base, color: Colors.textPrimary, backgroundColor: Colors.offWhite,
  },
  btn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: Typography.base, fontWeight: '700' },
  terms: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.base, lineHeight: 18 },
  termsLink: { color: Colors.primary, fontWeight: '600' },
});

export default RegisterScreen;
