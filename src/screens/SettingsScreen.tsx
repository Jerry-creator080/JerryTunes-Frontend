import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Linking, Platform } from 'react-native';
import { useThemeContext, ThemePreference } from '../context/ThemeContext';
import { useTheme } from '../theme/useTheme';
import { useSleepTimer } from '../context/SleepTimerContext';
import { SectionHeader } from '../components/SectionHeader';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheet } from '../components/ActionSheet';
import { useNavigation } from '@react-navigation/native';

export const SettingsScreen = () => {
  const { colors, spacing, typography } = useTheme();
  const { themePreference, setThemePreference } = useThemeContext();
  const { remainingMinutes, setTimer, clearTimer } = useSleepTimer();
  const navigation = useNavigation<any>();
  
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);

  const themeOptions = [
    { label: "Light", onPress: () => setThemePreference('light') },
    { label: "Dark", onPress: () => setThemePreference('dark') },
    { label: "System Default", onPress: () => setThemePreference('system') },
  ];

  const timerOptions = [
    { label: "15 minutes", onPress: () => setTimer(15) },
    { label: "30 minutes", onPress: () => setTimer(30) },
    { label: "45 minutes", onPress: () => setTimer(45) },
    { label: "60 minutes", onPress: () => setTimer(60) },
    { label: "Off", onPress: () => clearTimer(), destructive: true },
  ];

  const handleShare = () => {
    // Native sharing logic placeholder (Web fallback)
    if (Platform.OS === 'web') {
      window.alert("Share JerryTunes: https://jerrytunes.app");
    } else {
      Alert.alert("Share", "Sharing JerryTunes...");
    }
  };

  const handleRate = () => {
    if (Platform.OS === 'web') {
      window.alert("Thank you for using JerryTunes in the browser!");
    } else {
      Alert.alert("Rate App", "Redirecting to App Store...");
    }
  };

  const handleFeedback = () => {
    Linking.openURL('mailto:support@jerrytunes.app');
  };

  const renderRow = (icon: keyof typeof Ionicons.glyphMap, title: string, subtitle?: string, onPress?: () => void) => (
    <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={24} color={colors.textSecondary} style={{ marginRight: spacing.md }} />
        <View>
          <Text style={[styles.rowTitle, { color: colors.text, fontSize: typography.sizes.md }]}>{title}</Text>
          {subtitle && <Text style={[styles.rowSubtitle, { color: colors.primary }]}>{subtitle}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionHeader title="Settings" />
      
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        {renderRow('color-palette-outline', 'Theme', themePreference.charAt(0).toUpperCase() + themePreference.slice(1), () => setShowThemeModal(true))}
        {renderRow('timer-outline', 'Sleep Timer', remainingMinutes ? `${remainingMinutes} mins left` : 'Off', () => setShowTimerModal(true))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        {renderRow('cloud-outline', 'Backup & Restore', 'Save your library', () => Alert.alert("Coming Soon", "Backup & Restore architecture is ready."))}
        {renderRow('star-outline', 'Subscription', '$3/mo or $60/lifetime', () => navigation.navigate('Subscription'))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        {renderRow('share-outline', 'Share App', undefined, handleShare)}
        {renderRow('heart-outline', 'Rate App', undefined, handleRate)}
        {renderRow('mail-outline', 'Feedback', undefined, handleFeedback)}
      </View>

      <Text style={[styles.version, { color: colors.textSecondary }]}>JerryTunes v2.0</Text>

      <ActionSheet visible={showThemeModal} title="Select Theme" options={themeOptions} onClose={() => setShowThemeModal(false)} />
      <ActionSheet visible={showTimerModal} title="Sleep Timer" options={timerOptions} onClose={() => setShowTimerModal(false)} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTitle: {
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    marginBottom: 40,
    fontSize: 12,
  },
});
