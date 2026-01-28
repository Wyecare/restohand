import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useStaffLoginMutation } from '@/store/api/authApi';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staffLogin, { isLoading }] = useStaffLoginMutation();
  const dispatch = useAppDispatch();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Details', 'Please enter both email and password');
      return;
    }

    try {
      const { access_token, refresh_token, user, expires_in } = await staffLogin({ email, password }).unwrap();

      // Create session info from user data
      const sessionInfo = {
        id: user.uid,
        userId: user.uid,
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        roles: user.roles,
        permissions: [], // Add permissions if available
        displayName: user.displayName,
        email: user.email,
        phone: undefined, // Not provided in response
        isActive: true,
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store credentials
      dispatch(setCredentials({
        idToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        session: sessionInfo,
      }));

      // Navigate based on role
      if (user.roles.includes('chef')) {
        router.replace('/(kitchen)');
      } else if (user.roles.includes('waiter') || user.roles.includes('cashier')) {
        router.replace('/(service)');
      } else {
        Alert.alert('Access Denied', 'You do not have permission to access this app');
      }
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error?.data?.message || error?.message || 'Failed to sign in'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Staff Login</Text>
            <Text style={styles.subtitle}>Sign in to access your workspace</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your.email@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  loginButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  loginButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});