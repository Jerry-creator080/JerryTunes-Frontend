import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MainNavigator } from './src/navigation/MainNavigator';
import { NowPlayingScreen } from './src/screens/NowPlayingScreen';
import { SplashScreen } from './src/screens/SplashScreen';
import { ThemeProvider, useThemeContext } from './src/context/ThemeContext';
import { AudioProvider } from './src/context/AudioContext';
import { LibraryProvider } from './src/context/LibraryContext';
import { OfflineProvider } from './src/context/OfflineContext';
import { MiniPlayer } from './src/components/MiniPlayer';
import { HistoryProvider } from './src/context/HistoryContext';
import { SleepTimerProvider } from './src/context/SleepTimerContext';
import { AudioSettingsProvider } from './src/context/AudioSettingsContext';
import { colors as themeColors } from './src/theme/colors';

const Stack = createNativeStackNavigator();

const AppContent = () => {
  const { isDark } = useThemeContext();
  const [isReady, setIsReady] = useState(false);
  const navigationRef = useNavigationContainerRef();
  const [currentRoute, setCurrentRoute] = useState<string>('HomeTab');

  useEffect(() => {
    // Show splash screen for a premium minimal duration
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const MyTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: isDark ? themeColors.dark.background : themeColors.light.background,
      card: isDark ? themeColors.dark.surface : themeColors.light.surface,
      text: isDark ? themeColors.dark.text : themeColors.light.text,
      border: isDark ? themeColors.dark.border : themeColors.light.border,
      primary: isDark ? themeColors.dark.primary : themeColors.light.primary,
    },
  };

  if (!isReady) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={MyTheme}
      onStateChange={() => {
        const route = navigationRef.getCurrentRoute();
        if (route && (route as any).name) {
          setCurrentRoute((route as any).name);
        }
      }}
    >
      <View style={{ flex: 1, backgroundColor: MyTheme.colors.background }}>
        <Stack.Navigator screenOptions={{ headerShown: false, presentation: 'fullScreenModal' }}>
          <Stack.Screen name="Tabs" component={MainNavigator} />
          <Stack.Screen 
            name="NowPlaying" 
            component={NowPlayingScreen} 
            options={{ presentation: 'modal' }} 
          />
          <Stack.Screen 
            name="Video" 
            component={require('./src/screens/VideoScreen').VideoScreen} 
            options={{ presentation: 'fullScreenModal' }} 
          />
          <Stack.Screen name="Subscription" component={require('./src/screens/SubscriptionScreen').SubscriptionScreen} />
        </Stack.Navigator>

        {/* Global MiniPlayer: visible across all tabs and nested screens (Albums, Artists, Library, Search) */}
        {currentRoute !== 'NowPlaying' && currentRoute !== 'Video' && (
          <MiniPlayer navigationRef={navigationRef} />
        )}
      </View>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AudioSettingsProvider>
          <SleepTimerProvider>
            <HistoryProvider>
              <OfflineProvider>
                <LibraryProvider>
                  <AudioProvider>
                    <AppContent />
                  </AudioProvider>
                </LibraryProvider>
              </OfflineProvider>
            </HistoryProvider>
          </SleepTimerProvider>
        </AudioSettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
