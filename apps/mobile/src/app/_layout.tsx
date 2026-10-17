import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme";

export default function RootLayout() {
  const scheme = useColorScheme();
  const t = useAppTheme();

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: t.surface },
        }}
      />
    </SafeAreaProvider>
  );
}
