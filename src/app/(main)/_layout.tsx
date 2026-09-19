import React from "react";
import { Stack } from "expo-router";

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen name="explore" options={{ headerShown: false }} />
      <Stack.Screen
        name="recipe-detail"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="cooking-mode"
        options={{
          headerShown: false,
          animation: "fade_from_bottom",
        }}
      />
    </Stack>
  );
}
