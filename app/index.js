// app/index.js — entry point, redirects based on Clerk auth state
import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { View, ActivityIndicator } from "react-native";
import { T } from "../src/styles/tokens";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: T.bg }}>
        <ActivityIndicator size="large" color={T.brand} />
      </View>
    );
  }

  return <Redirect href={isSignedIn ? "/(tabs)" : "/(auth)/sign-in"} />;
}