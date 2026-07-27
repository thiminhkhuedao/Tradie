import { Tabs } from "expo-router";
import { View, Text, Platform } from "react-native";

const BRAND = "#E8500A";
const MUTED = "#6B6460";

function Icon({ emoji, label, focused }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 4 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>
      <Text style={{ fontSize: 10, marginTop: 2, color: focused ? BRAND : MUTED, fontWeight: focused ? "700" : "400" }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: {
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.08)",
        height: Platform.OS === "ios" ? 85 : 68,
        paddingBottom: Platform.OS === "ios" ? 24 : 8,
      },
    }}>
      <Tabs.Screen name="index"       options={{ tabBarIcon: ({ focused }) => <Icon emoji="🏠" label="Home"     focused={focused}/> }}/>
      <Tabs.Screen name="jobs"        options={{ tabBarIcon: ({ focused }) => <Icon emoji="📋" label="Jobs"     focused={focused}/> }}/>
      <Tabs.Screen name="clients"     options={{ tabBarIcon: ({ focused }) => <Icon emoji="👥" label="Clients"  focused={focused}/> }}/>
      <Tabs.Screen name="invoices"    options={{ tabBarIcon: ({ focused }) => <Icon emoji="🧾" label="Invoices" focused={focused}/> }}/>
      <Tabs.Screen name="more"        options={{ tabBarIcon: ({ focused }) => <Icon emoji="☰"  label="More"     focused={focused}/> }}/>
      <Tabs.Screen name="marketplace" options={{ href: null }}/>
      <Tabs.Screen name="settings"    options={{ href: null }}/>
    </Tabs>
  );
}