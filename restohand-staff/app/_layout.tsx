import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import "react-native-reanimated";
import { Provider } from "react-redux";
import { PersistGate } from 'redux-persist/integration/react';
import { Text } from 'react-native';

import { useColorScheme } from "@/hooks/use-color-scheme";
import { store, persistor } from "@/store";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthProvider from "@/components/AuthProvider";

export const unstable_settings = {
  anchor: "(auth)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
      <PersistGate loading={<Text>Loading...</Text>} persistor={persistor}>
        <AuthProvider>
          <ThemeProvider value={colorScheme !== "dark" ? DarkTheme : DefaultTheme}>
            <SafeAreaView
              style={{
                flex: 1,
                // paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
              }}
            >
              <Stack>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(kitchen)" options={{ headerShown: false }} />
                <Stack.Screen name="(service)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: "modal", title: "Modal" }}
                />
              </Stack>
            </SafeAreaView>
          </ThemeProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}
