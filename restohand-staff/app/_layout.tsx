import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { Text } from "react-native";
import "react-native-reanimated";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import AuthProvider from "@/components/AuthProvider";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { persistor, store } from "@/store";
import { StatusBar } from "expo-status-bar";

export const unstable_settings = {
  anchor: "(auth)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
      <PersistGate loading={<Text>Loading...</Text>} persistor={persistor}>
        <AuthProvider>
          <ThemeProvider
            value={colorScheme !== "dark" ? DarkTheme : DefaultTheme}
          >
            <StatusBar style="dark" />

            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(kitchen)" options={{ headerShown: false }} />
              <Stack.Screen name="(service)" options={{ headerShown: false }} />
              <Stack.Screen name="(cashier)" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
            </Stack>
          </ThemeProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}
