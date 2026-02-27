import { Colors } from "@/constants/theme";
import { useStaffLoginMutation } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { useFCMToken } from "@/hooks/useFCMToken";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staffLogin, { isLoading }] = useStaffLoginMutation();
  const dispatch = useAppDispatch();
  const { registerToken } = useFCMToken();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Details", "Please enter both email and password");
      return;
    }

    try {
      const { access_token, refresh_token, user, expires_in } =
        await staffLogin({ email, password }).unwrap();

      const sessionInfo = {
        id: user.uid,
        userId: user.uid,
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        roles: user.roles,
        permissions: [],
        displayName: user.displayName,
        email: user.email,
        phone: undefined,
        isActive: true,
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dispatch(
        setCredentials({
          idToken: access_token,
          refreshToken: refresh_token,
          expiresIn: expires_in,
          session: sessionInfo,
        }),
      );

      // Register FCM token after successful login
      setTimeout(() => {
        registerToken().catch((error) => {
          console.warn('FCM token registration failed after login:', error);
        });
      }, 1000); // Small delay to ensure auth state is fully set

      if (user.roles.includes("chef")) {
        router.replace("/(kitchen)");
      } else if (user.roles.includes("cashier")) {
        router.replace("/(cashier)");
      } else if (user.roles.includes("waiter")) {
        router.replace("/(service)");
      } else {
        Alert.alert(
          "Access Denied",
          "You do not have permission to access this app",
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Login Failed",
        error?.data?.message || error?.message || "Failed to sign in",
      );
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.header}>
            <Image
              source={
                colorScheme === "dark"
                  ? require("../../assets/images/logo_white.png")
                  : require("../../assets/images/logo_black.png")
              }
              style={styles.brandLogo}
              contentFit="contain"
            />
            <Text style={[styles.welcomeText, { color: theme.icon }]}>
              Welcome back
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderColor: colorScheme === "dark" ? "#374151" : "#e5e7eb",
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="your.email@example.com"
                placeholderTextColor={theme.icon}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                Password
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderColor: colorScheme === "dark" ? "#374151" : "#e5e7eb",
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.icon}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                {
                  backgroundColor:
                    colorScheme === "dark" ? "#ffffff" : "#111827",
                },
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.9}
            >
              {isLoading ? (
                <ActivityIndicator
                  color={colorScheme === "dark" ? "#111827" : "#ffffff"}
                />
              ) : (
                <Text
                  style={[
                    styles.loginButtonText,
                    { color: colorScheme === "dark" ? "#111827" : "#ffffff" },
                  ]}
                >
                  Sign in
                </Text>
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
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 32,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
  },
  logo: {
    width: 140,
    height: 140,
  },
  brandLogo: {
    width: 160,
    height: 42,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: "500",
  },
  form: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  loginButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0.05,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
