import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext, ThemeStyle } from '../context/ThemeContext';
import { useTheme } from '../theme/useTheme';
import { useSleepTimer } from '../context/SleepTimerContext';
import { useOffline } from '../context/OfflineContext';
import { useAudioSettings, AudioQuality, EqualizerPreset } from '../context/AudioSettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheet } from '../components/ActionSheet';
import { SleepTimerModal } from '../components/SleepTimerModal';
import { useNavigation } from '@react-navigation/native';

export const SettingsScreen = () => {
  const { colors, spacing, typography } = useTheme();
  const {
    themePreference,
    setThemePreference,
    themeStyle,
    setThemeStyle,
    glassOpacity,
    setGlassOpacity,
    isDark,
    getGlassStyle,
  } = useThemeContext();

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const { remainingMinutes, isEndOfTrack, timerEndMs } = useSleepTimer();
  const { isOfflineOnly, setOfflineOnly } = useOffline();
  const {
    streamingQuality,
    downloadQuality,
    equalizerPreset,
    setStreamingQuality,
    setDownloadQuality,
    setEqualizerPreset,
    getQualityLabel,
    getPresetLabel,
  } = useAudioSettings();

  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);
  const [showStreamQualityModal, setShowStreamQualityModal] = useState(false);
  const [showDownloadQualityModal, setShowDownloadQualityModal] = useState(false);
  const [showEqModal, setShowEqModal] = useState(false);

  const themeStyles: {
    id: ThemeStyle;
    name: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    {
      id: 'liquid_glass',
      name: 'Liquid Glass',
      subtitle: 'Translucent glass surfaces, layered reflections & soft blur',
      icon: 'water-outline',
    },
    {
      id: 'ios',
      name: 'iOS Inspired',
      subtitle: 'Clean Apple interface, subtle translucency & smooth curves',
      icon: 'phone-portrait-outline',
    },
    {
      id: 'macos',
      name: 'macOS Inspired',
      subtitle: 'Desktop-style panels, refined spacing & subtle depth',
      icon: 'laptop-outline',
    },
    {
      id: 'classic',
      name: 'Classic JerryTunes',
      subtitle: 'Original solid high-contrast interface',
      icon: 'cube-outline',
    },
  ];

  const colorSchemes = [
    { id: 'dark' as const, label: 'Dark', icon: 'moon-outline' as const },
    { id: 'light' as const, label: 'Light', icon: 'sunny-outline' as const },
    { id: 'system' as const, label: 'System', icon: 'hardware-chip-outline' as const },
  ];

  const opacityPresets = [
    { label: '35%', value: 0.35 },
    { label: '55%', value: 0.55 },
    { label: '75%', value: 0.75 },
    { label: '90%', value: 0.90 },
    { label: '100%', value: 1.0 },
  ];

  const qualityOptions = (onSelect: (q: AudioQuality) => void) => [
    { label: "Normal (128 kbps) — Data Saver", onPress: () => onSelect('normal') },
    { label: "High (256 kbps) — Standard High Quality", onPress: () => onSelect('high') },
    { label: "Ultra HD (320 kbps) — Studio Master Quality", onPress: () => onSelect('ultra') },
  ];

  const eqOptions = [
    { label: "Flat (Balanced)", onPress: () => setEqualizerPreset('flat') },
    { label: "Bass Boost ⚡ (Punchy Low-end)", onPress: () => setEqualizerPreset('bass_boost') },
    { label: "Vocal Clarity 🎤 (Crisp Vocals)", onPress: () => setEqualizerPreset('vocal') },
    { label: "Acoustic 🎸 (Warm Instruments)", onPress: () => setEqualizerPreset('acoustic') },
    { label: "Rock & Drive 🎸 (Mid-forward Energy)", onPress: () => setEqualizerPreset('rock') },
    { label: "Electronic / Dance 🎛️ (Sub-bass & Treble)", onPress: () => setEqualizerPreset('electronic') },
    { label: "Classical / Orchestral 🎻 (Dynamic Range)", onPress: () => setEqualizerPreset('classical') },
  ];

  const handleShare = () => {
    if (Platform.OS === 'web') {
      window.alert("Share JerryTunes: https://jerrytunes.app");
    } else {
      Alert.alert("Share JerryTunes", "Invite your friends to experience JerryTunes!");
    }
  };

  const handleRate = () => {
    if (Platform.OS === 'web') {
      window.alert("Thank you for using JerryTunes!");
    } else {
      Alert.alert("Rate App", "Thank you for rating JerryTunes 5 stars!");
    }
  };

  const handleFeedback = () => {
    Linking.openURL('mailto:support@jerrytunes.app');
  };

  const getSleepTimerSummary = () => {
    if (isEndOfTrack) return 'End of song';
    if (remainingMinutes) return `${remainingMinutes} mins left`;
    return 'Off';
  };

  const renderRow = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    iconColor?: string
  ) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <Ionicons
          name={icon}
          size={22}
          color={iconColor || colors.textSecondary}
          style={{ marginRight: spacing.md }}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: colors.text, fontSize: typography.sizes.md }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.rowSubtitle, { color: colors.primary }]}>{subtitle}</Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Header with Back button */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.navBackBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Playback & Offline Mode */}
        <Text style={[styles.groupHeader, { color: colors.textSecondary }]}>PLAYBACK & OFFLINE</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={styles.rowLeft}>
              <Ionicons
                name={isOfflineOnly ? "cloud-offline" : "cloud-outline"}
                size={22}
                color={isOfflineOnly ? "#FF9500" : colors.textSecondary}
                style={{ marginRight: spacing.md }}
              />
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.rowTitle, { color: colors.text, fontSize: typography.sizes.md }]}>Offline Mode Only</Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                  Only play and show downloaded tracks & albums
                </Text>
              </View>
            </View>
            <Switch
              value={isOfflineOnly}
              onValueChange={setOfflineOnly}
              trackColor={{ false: '#3A3A3C', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {renderRow(
            'moon-outline',
            'Sleep Timer',
            getSleepTimerSummary(),
            () => setShowSleepTimerModal(true),
            (timerEndMs || isEndOfTrack) ? colors.primary : undefined
          )}
        </View>

        {/* Audio Quality & Equalizer */}
        <Text style={[styles.groupHeader, { color: colors.textSecondary }]}>AUDIO QUALITY & SOUND</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {renderRow(
            'wifi-outline',
            'Streaming Quality',
            getQualityLabel(streamingQuality),
            () => setShowStreamQualityModal(true)
          )}
          {renderRow(
            'download-outline',
            'Download Quality',
            getQualityLabel(downloadQuality),
            () => setShowDownloadQualityModal(true)
          )}
          {renderRow(
            'options-outline',
            'Equalizer Preset',
            getPresetLabel(equalizerPreset),
            () => setShowEqModal(true)
          )}
        </View>

        {/* Appearance & Theme Section (Requirement 9) */}
        <Text style={[styles.groupHeader, { color: colors.textSecondary }]}>APPEARANCE & THEME</Text>
        
        {/* Color Scheme Picker */}
        <View style={[styles.cardSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardSectionLabel, { color: colors.textSecondary }]}>COLOR MODE</Text>
          <View style={styles.colorSchemeRow}>
            {colorSchemes.map((item) => {
              const isSelected = themePreference === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.colorSchemePill,
                    {
                      backgroundColor: isSelected ? colors.primary : isDark ? '#2C2C2E' : '#E5E5EA',
                      borderColor: isSelected ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => setThemePreference(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.colorSchemeText,
                      { color: isSelected ? '#FFFFFF' : colors.text }
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Theme Style Grid */}
        <View style={[styles.cardSection, { backgroundColor: colors.surface, marginTop: 10 }]}>
          <Text style={[styles.cardSectionLabel, { color: colors.textSecondary }]}>DESIGN THEME</Text>
          <View style={styles.themeGrid}>
            {themeStyles.map((item) => {
              const isSelected = themeStyle === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
                      borderColor: isSelected ? colors.primary : 'transparent',
                    },
                    isSelected && styles.themeCardActive,
                  ]}
                  onPress={() => setThemeStyle(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.themeCardHeader}>
                    <View style={[styles.themeIconBox, { backgroundColor: isSelected ? colors.primary : isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={isSelected ? '#FFFFFF' : colors.primary}
                      />
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    )}
                  </View>
                  <Text style={[styles.themeCardTitle, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.themeCardSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Liquid Glass Opacity Slider */}
        <View style={[styles.cardSection, { backgroundColor: colors.surface, marginTop: 10 }]}>
          <View style={styles.sliderHeaderRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.cardSectionLabel, { color: colors.textSecondary, marginBottom: 2 }]}>
                LIQUID GLASS OPACITY
              </Text>
              <Text style={[styles.sliderDesc, { color: colors.textSecondary }]}>
                Controls translucency of mini-player, tabs & panels
              </Text>
            </View>
            <View style={[styles.percentageBadge, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
              <Text style={[styles.percentageText, { color: colors.primary }]}>
                {Math.round(glassOpacity * 100)}%
              </Text>
            </View>
          </View>

          <Slider
            style={styles.sliderBar}
            minimumValue={0.2}
            maximumValue={1.0}
            step={0.01}
            value={glassOpacity}
            onValueChange={(val) => setGlassOpacity(val)}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={isDark ? '#3A3A3C' : '#D1D1D6'}
            thumbTintColor="#FFFFFF"
          />

          {/* Quick Presets */}
          <View style={styles.presetRow}>
            {opacityPresets.map((preset) => {
              const isSelected = Math.abs(glassOpacity - preset.value) < 0.04;
              return (
                <TouchableOpacity
                  key={preset.label}
                  style={[
                    styles.presetChip,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? 'rgba(10, 132, 255, 0.15)' : 'transparent',
                    }
                  ]}
                  onPress={() => setGlassOpacity(preset.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      { color: isSelected ? colors.primary : colors.textSecondary }
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Live Glass Preview Card */}
          <View style={[styles.previewCard, getGlassStyle('card')]}>
            <View style={styles.previewHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="sparkles" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.previewTitle, { color: colors.text }]}>Live Glass Surface</Text>
              </View>
              <Text style={[styles.previewBadgeText, { color: colors.textSecondary }]}>
                {themeStyle.toUpperCase().replace('_', ' ')}
              </Text>
            </View>
            <Text style={[styles.previewBody, { color: colors.textSecondary }]}>
              Text and audio controls dynamically adapt contrast and blur for optimal readability at {Math.round(glassOpacity * 100)}% opacity.
            </Text>
          </View>
        </View>

        {/* Account & Library */}
        <Text style={[styles.groupHeader, { color: colors.textSecondary }]}>ACCOUNT & LIBRARY</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {renderRow(
            'cloud-upload-outline',
            'Backup & Restore',
            'Cloud sync ready',
            () => Alert.alert("Backup & Restore", "Your local playlists and favorites are safely backed up in device storage.")
          )}
          {renderRow(
            'star-outline',
            'Subscription',
            '$3/mo or $60/lifetime',
            () => navigation.navigate('Subscription'),
            '#FFD700'
          )}
        </View>

        {/* About & Support */}
        <Text style={[styles.groupHeader, { color: colors.textSecondary }]}>ABOUT & SUPPORT</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {renderRow('share-social-outline', 'Share JerryTunes', undefined, handleShare)}
          {renderRow('heart-outline', 'Rate JerryTunes', undefined, handleRate)}
          {renderRow('mail-outline', 'Help & Feedback', undefined, handleFeedback)}
        </View>

        <Text style={[styles.version, { color: colors.textSecondary }]}>JerryTunes v2.0 (Build 58.0.25)</Text>
      </ScrollView>

      {/* Modals & Action Sheets */}
      <ActionSheet
        visible={showStreamQualityModal}
        title="Select Streaming Quality"
        options={qualityOptions(setStreamingQuality)}
        onClose={() => setShowStreamQualityModal(false)}
      />

      <ActionSheet
        visible={showDownloadQualityModal}
        title="Select Download Audio Quality"
        options={qualityOptions(setDownloadQuality)}
        onClose={() => setShowDownloadQualityModal(false)}
      />

      <ActionSheet
        visible={showEqModal}
        title="Equalizer Sound Profile"
        options={eqOptions}
        onClose={() => setShowEqModal(false)}
      />

      <SleepTimerModal
        visible={showSleepTimerModal}
        onClose={() => setShowSleepTimerModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBackBtn: {
    padding: 6,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  groupHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  section: {
    marginBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardSection: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  colorSchemeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorSchemePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  colorSchemeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeCard: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  themeCardActive: {
    borderWidth: 1.5,
  },
  themeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  themeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  themeCardSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sliderDesc: {
    fontSize: 12,
  },
  percentageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sliderBar: {
    width: '100%',
    height: 38,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 14,
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    marginHorizontal: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewCard: {
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  previewBody: {
    fontSize: 12,
    lineHeight: 17,
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
    flex: 1,
  },
  rowTitle: {
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  rowDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    marginVertical: 32,
    fontSize: 12,
  },
});
