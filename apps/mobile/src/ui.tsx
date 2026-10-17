import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme";

type Children = { children: ReactNode };

export function Screen({
  title,
  eyebrow,
  children,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const canGoBack = router.canGoBack();

  return (
    <View style={{ flex: 1, backgroundColor: t.surface }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          paddingTop: insets.top + 10,
          paddingBottom: 10,
          paddingHorizontal: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: t.border,
          backgroundColor: t.surface,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          disabled={!canGoBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 22, color: canGoBack ? t.accent : "transparent" }}>‹</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Ibtatech home"
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.text, letterSpacing: -0.2 }}>
            Ibtatech
          </Text>
        </Pressable>
        <View style={{ minWidth: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 48,
          gap: 16,
        }}
      >
        {eyebrow ? (
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 1.4,
              color: t.accent,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </Text>
        ) : null}
        {title ? (
          <Text
            style={{
              fontSize: 30,
              lineHeight: 36,
              fontWeight: "700",
              color: t.text,
              letterSpacing: -0.5,
            }}
          >
            {title}
          </Text>
        ) : null}
        {children}
      </ScrollView>
    </View>
  );
}

export function Body({ children }: Children) {
  const t = useAppTheme();
  return <Text style={{ fontSize: 16, lineHeight: 24, color: t.textSecondary }}>{children}</Text>;
}

export function SectionTitle({ children }: Children) {
  const t = useAppTheme();
  return (
    <Text
      style={{
        fontSize: 20,
        lineHeight: 26,
        fontWeight: "700",
        color: t.text,
        letterSpacing: -0.3,
        marginTop: 8,
      }}
    >
      {children}
    </Text>
  );
}

export function Card({ children, onPress }: Children & { onPress?: () => void }) {
  const t = useAppTheme();
  const content = (
    <View
      style={{
        gap: 6,
        padding: 16,
        borderRadius: 16,
        backgroundColor: t.surfaceSunken,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.border,
      }}
    >
      {children}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}
    >
      {content}
    </Pressable>
  );
}

export function CardTitle({ children }: Children) {
  const t = useAppTheme();
  return <Text style={{ fontSize: 16, fontWeight: "600", color: t.text }}>{children}</Text>;
}

export function CardText({ children }: Children) {
  const t = useAppTheme();
  return <Text style={{ fontSize: 14, lineHeight: 21, color: t.textSecondary }}>{children}</Text>;
}

export function Bullet({ children }: Children) {
  const t = useAppTheme();
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <Text style={{ fontSize: 15, lineHeight: 22, color: t.accent }}>•</Text>
      <Text style={{ flex: 1, fontSize: 15, lineHeight: 22, color: t.textSecondary }}>
        {children}
      </Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}) {
  const t = useAppTheme();
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          minHeight: 52,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
          borderRadius: 14,
          backgroundColor: primary ? t.accent : t.surfaceSunken,
          borderWidth: primary ? 0 : StyleSheet.hairlineWidth,
          borderColor: t.border,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: primary ? t.onAccent : t.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          minHeight: 44,
          justifyContent: "center",
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 999,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.border,
          backgroundColor: pressed ? t.surfaceSunken : t.surface,
        },
      ]}
    >
      <Text style={{ fontSize: 14, fontWeight: "600", color: t.text }}>{label}</Text>
    </Pressable>
  );
}
