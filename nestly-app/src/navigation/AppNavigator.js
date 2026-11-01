import React from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import colors from "../theme/colors";

import AuthScreen from "../screens/AuthScreen";
import LocationSelectionScreen from "../screens/LocationSelectionScreen";
import JoinCommunityScreen from "../screens/JoinCommunityScreen";
import HomeScreen from "../screens/HomeScreen";
import CommunityFeedScreen from "../screens/CommunityFeedScreen";
import CreatePostScreen from "../screens/CreatePostScreen";
import ReportIssueScreen from "../screens/ReportIssueScreen";
import ServicesScreen from "../screens/ServicesScreen";
import AddServiceScreen from "../screens/AddServiceScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: "home",
  Feed: "chatbubbles",
  Services: "construct",
  Profile: "person",
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12.5,
          fontWeight: "700",
          marginTop: -2,
        },
        tabBarStyle: {
          borderTopColor: colors.borderLight,
          borderTopWidth: 1.5,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: colors.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 8,
        },
        tabBarIcon: ({ color, focused }) => (
          <Ionicons
            name={focused ? TAB_ICONS[route.name] : `${TAB_ICONS[route.name]}-outline`}
            size={24}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Feed" component={CommunityFeedScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ presentation: Platform.OS === "ios" ? "modal" : "card" }}
      />
      <Stack.Screen
        name="ReportIssue"
        component={ReportIssueScreen}
        options={{ presentation: Platform.OS === "ios" ? "modal" : "card" }}
      />
      <Stack.Screen
        name="AddService"
        component={AddServiceScreen}
        options={{ presentation: Platform.OS === "ios" ? "modal" : "card" }}
      />
      <Stack.Screen name="LocationSelection" component={LocationSelectionScreen} />
      <Stack.Screen name="JoinCommunity" component={JoinCommunityScreen} />
    </Stack.Navigator>
  );
}

function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LocationSelection" component={LocationSelectionScreen} />
      <Stack.Screen name="JoinCommunity" component={JoinCommunityScreen} />
    </Stack.Navigator>
  );
}

const linking = {
  prefixes: ["nestly://", "https://nestly.app"],
  config: {
    screens: {
      JoinCommunity: "join",
    },
  },
};

export default function AppNavigator() {
  const { isAuthenticated, hasCommunity } = useAuth();

  return (
    <NavigationContainer linking={linking}>
      {!isAuthenticated ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      ) : !hasCommunity ? (
        <OnboardingStack />
      ) : (
        <MainStack />
      )}
    </NavigationContainer>
  );
}
