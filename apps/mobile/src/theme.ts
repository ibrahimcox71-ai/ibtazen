import { useColorScheme } from "react-native";
import { darkTheme, lightTheme, type AppTheme } from "@ibtatech/utils";

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkTheme : lightTheme;
}
