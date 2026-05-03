import { Stack } from "expo-router";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export default function InterviewLayout() {
  useOfflineSync();
  return <Stack screenOptions={{ headerShown: false }} />;
}
