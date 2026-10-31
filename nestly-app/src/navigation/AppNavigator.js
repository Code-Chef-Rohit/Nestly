import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import colors from "../theme/colors";

import SplashScreen from "../screens/SplashScreen";
import AuthScreen from "../screens/AuthScreen";
import LocationSelectionScreen from "../screens/LocationSelectionScreen";
import JoinCommunityScreen from "../screens/JoinCommunityScreen";
import HomeScreen from "../screens/HomeScreen";
import CommunityFeedScreen from "../screens/CommunityFeedScreen";
import CreatePostScreen from "../screens/CreatePostScreen";
import ReportIssueScreen from "../screens/ReportIssueScreen";
import ServicesScreen from "../screens/ServicesScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: "home",
  Feed: "newspaper",
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
        tabBarStyle: { borderTopColor: colors.border, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? TAB_ICONS[route.name] : `${TAB_ICONS[route.name]}-outline`}
            size={22}
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
      <Stack.Screen name="CreatePost" component={CreatePostScreen} presentation="modal" />
      <Stack.Screen name="ReportIssue" component={ReportIssueScreen} presentation="modal" />
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
  const { isAuthenticated, hasCommunity, loading } = useAuth();

  if (loading) {
    return (
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {!isAuthenticated ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
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
