import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';

import { HomeScreen } from '../screens/HomeScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { AlbumDetailScreen } from '../screens/AlbumDetailScreen';
import { ArtistScreen } from '../screens/ArtistScreen';
import { PlaylistDetailScreen } from '../screens/PlaylistDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const HomeStackNav = createNativeStackNavigator();
const SearchStackNav = createNativeStackNavigator();
const LibraryStackNav = createNativeStackNavigator();

const commonStackOptions = {
  headerShown: false,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animation: 'slide_from_right' as const,
};

const HomeStack = () => (
  <HomeStackNav.Navigator screenOptions={commonStackOptions}>
    <HomeStackNav.Screen name="HomeMain" component={HomeScreen} />
    <HomeStackNav.Screen name="AlbumDetail" component={AlbumDetailScreen} />
    <HomeStackNav.Screen name="Artist" component={ArtistScreen} />
    <HomeStackNav.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
    <HomeStackNav.Screen name="Settings" component={SettingsScreen} />
  </HomeStackNav.Navigator>
);

const SearchStack = () => (
  <SearchStackNav.Navigator screenOptions={commonStackOptions}>
    <SearchStackNav.Screen name="SearchMain" component={SearchScreen} />
    <SearchStackNav.Screen name="AlbumDetail" component={AlbumDetailScreen} />
    <SearchStackNav.Screen name="Artist" component={ArtistScreen} />
    <SearchStackNav.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
    <SearchStackNav.Screen name="Settings" component={SettingsScreen} />
  </SearchStackNav.Navigator>
);

const LibraryStack = () => (
  <LibraryStackNav.Navigator screenOptions={commonStackOptions}>
    <LibraryStackNav.Screen name="LibraryMain" component={LibraryScreen} />
    <LibraryStackNav.Screen name="AlbumDetail" component={AlbumDetailScreen} />
    <LibraryStackNav.Screen name="Artist" component={ArtistScreen} />
    <LibraryStackNav.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
    <LibraryStackNav.Screen name="Settings" component={SettingsScreen} />
  </LibraryStackNav.Navigator>
);

export const MainNavigator = () => {
  const insets = useSafeAreaInsets();
  const { getGlassStyle, isDark } = useTheme();
  const glass = getGlassStyle('bar');

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'LibraryTab') {
            iconName = focused ? 'library' : 'library-outline';
          } else if (route.name === 'SearchTab') {
            iconName = focused ? 'search' : 'search-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarActiveTintColor: isDark ? '#FFFFFF' : '#000000',
        tabBarInactiveTintColor: isDark ? '#71717A' : '#8E8E93',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: glass.backgroundColor,
          borderTopColor: glass.borderColor,
          borderTopWidth: glass.borderWidth,
          height: 52 + (insets.bottom > 0 ? insets.bottom : 6),
          paddingTop: 6,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 6,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          elevation: 0,
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStack} 
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="LibraryTab" 
        component={LibraryStack} 
        options={{ tabBarLabel: 'Library' }}
      />
      <Tab.Screen 
        name="SearchTab" 
        component={SearchStack} 
        options={{ tabBarLabel: 'Search' }}
      />
    </Tab.Navigator>
  );
};
