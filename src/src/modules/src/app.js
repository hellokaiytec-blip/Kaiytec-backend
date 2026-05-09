// App.js — Root Entry
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import useAuthStore from './src/store/authStore';
import LoadingScreen from './src/components/LoadingScreen';

export default function App() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0A3D2A" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

// ─────────────────────────────────────────────────────────────

// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import useAuthStore from '../store/authStore';
import { Colors } from '../theme';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';

// Buyer Screens
import HomeScreen from '../screens/buyer/HomeScreen';
import SearchScreen from '../screens/buyer/SearchScreen';
import MapScreen from '../screens/buyer/MapScreen';
import ProductDetailScreen from '../screens/buyer/ProductDetailScreen';
import ProviderDetailScreen from '../screens/buyer/ProviderDetailScreen';

// Seller Screens
import SellerDashboard from '../screens/seller/SellerDashboard';
import AddProductScreen from '../screens/seller/AddProductScreen';
import SellerRegisterScreen from '../screens/seller/SellerRegisterScreen';

// Provider Screens
import ProviderDashboard from '../screens/provider/ProviderDashboard';
import ProviderRegisterScreen from '../screens/provider/ProviderRegisterScreen';

// Shared
import ProfileScreen from '../screens/shared/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Buyer Tab Navigator ──────────────────────────────────────
function BuyerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabel: ({ color, focused }) => (
          <Text style={{ color, fontSize: 11, fontWeight: focused ? '600' : '400' }}>
            {route.name}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} /> }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarIcon: ({ color }) => <TabIcon emoji="🔍" color={color} /> }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ tabBarIcon: ({ color }) => <TabIcon emoji="📍" color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }} />
    </Tab.Navigator>
  );
}

// ── Seller Tab Navigator ─────────────────────────────────────
function SellerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: Colors.primary }}>
      <Tab.Screen name="Dashboard" component={SellerDashboard} options={{ tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} /> }} />
      <Tab.Screen name="Add Product" component={AddProductScreen} options={{ tabBarIcon: ({ color }) => <TabIcon emoji="➕" color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }} />
    </Tab.Navigator>
  );
}

// ── Provider Tab Navigator ───────────────────────────────────
function ProviderTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: Colors.primary }}>
      <Tab.Screen name="Dashboard" component={ProviderDashboard} options={{ tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }} />
    </Tab.Navigator>
  );
}

const TabIcon = ({ emoji, color }) => (
  <Text style={{ fontSize: 20 }}>{emoji}</Text>
);

// ── Root Navigator ───────────────────────────────────────────
export default function AppNavigator() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          </>
        ) : (
          // Authenticated Stack — route by role
          <>
            {user?.role === 'buyer' && (
              <>
                <Stack.Screen name="BuyerTabs" component={BuyerTabs} />
                <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
                <Stack.Screen name="ProviderDetail" component={ProviderDetailScreen} />
              </>
            )}
            {user?.role === 'seller' && (
              <>
                <Stack.Screen name="SellerRegister" component={SellerRegisterScreen} />
                <Stack.Screen name="SellerTabs" component={SellerTabs} />
                <Stack.Screen name="AddProduct" component={AddProductScreen} />
              </>
            )}
            {user?.role === 'provider' && (
              <>
                <Stack.Screen name="ProviderRegister" component={ProviderRegisterScreen} />
                <Stack.Screen name="ProviderTabs" component={ProviderTabs} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
