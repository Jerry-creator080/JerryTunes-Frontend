import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Switch,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useSleepTimer } from '../context/SleepTimerContext';
import { useTheme } from '../theme/useTheme';

interface SleepTimerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({ visible, onClose }) => {
  const { colors, typography } = useTheme();
  const {
    timerEndMs,
    remainingSeconds,
    totalDurationSeconds,
    isEndOfTrack,
    enableFadeOut,
    setEnableFadeOut,
    setTimer,
    setEndOfTrackTimer,
    clearTimer,
  } = useSleepTimer();

  const [customMinutes, setCustomMinutes] = useState(30);

  const formatSeconds = (sec: number | null): string => {
    if (!sec || sec <= 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalDurationSeconds && remainingSeconds
    ? Math.max(0, Math.min(100, (remainingSeconds / totalDurationSeconds) * 100))
    : 100;

  const presets = [
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '45 min', minutes: 45 },
    { label: '60 min', minutes: 60 },
  ];

  const handleStartCustom = () => {
    setTimer(customMinutes);
  };

  const isTimerActive = Boolean(timerEndMs || isEndOfTrack);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Ionicons name="moon" size={22} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.title, { color: colors.text }]}>Sleep Timer</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Active Timer Countdown View */}
              {isTimerActive ? (
                <View style={styles.activeTimerContainer}>
                  <View style={styles.ringWrapper}>
                    {/* Visual Progress Ring Container */}
                    <View style={[styles.outerRing, { borderColor: 'rgba(255,255,255,0.1)' }]}>
                      <View
                        style={[
                          styles.progressRingFill,
                          {
                            borderColor: colors.primary,
                            opacity: isEndOfTrack ? 0.7 : 1,
                          },
                        ]}
                      />
                      <View style={styles.ringCenterText}>
                        {isEndOfTrack ? (
                          <>
                            <Ionicons name="musical-note" size={28} color={colors.primary} />
                            <Text style={[styles.endTrackLabel, { color: colors.text }]}>
                              End of Song
                            </Text>
                            <Text style={[styles.remainingSubtext, { color: colors.textSecondary }]}>
                              Pauses when track ends
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text style={[styles.timerDigits, { color: colors.text }]}>
                              {formatSeconds(remainingSeconds)}
                            </Text>
                            <Text style={[styles.remainingSubtext, { color: colors.textSecondary }]}>
                              Time Remaining
                            </Text>
                            {remainingSeconds && remainingSeconds <= 30 && enableFadeOut && (
                              <Text style={styles.fadingBadge}>Fading out audio...</Text>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Cancel Button */}
                  <TouchableOpacity
                    style={[styles.cancelTimerBtn, { backgroundColor: '#FF3B3015', borderColor: '#FF3B3040' }]}
                    onPress={() => clearTimer()}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="stop-circle-outline" size={20} color="#FF3B30" style={{ marginRight: 6 }} />
                    <Text style={[styles.cancelTimerText, { color: '#FF3B30' }]}>Turn Off Sleep Timer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Preset Selection & Custom Slider */
                <View style={styles.setupContainer}>
                  {/* Quick Presets */}
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>QUICK PRESETS</Text>
                  <View style={styles.presetRow}>
                    {presets.map(item => (
                      <TouchableOpacity
                        key={item.minutes}
                        style={[styles.presetChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={() => setTimer(item.minutes)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.presetChipText, { color: colors.text }]}>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* End of Track Option */}
                  <TouchableOpacity
                    style={[styles.endOfTrackBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setEndOfTrackTimer()}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="musical-notes-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.endOfTrackTitle, { color: colors.text }]}>End of Current Track</Text>
                      <Text style={[styles.endOfTrackDesc, { color: colors.textSecondary }]}>
                        Stop playback immediately after this song finishes
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {/* Custom Minute Slider */}
                  <View style={[styles.sliderBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.sliderHeaderRow}>
                      <Text style={[styles.sliderTitle, { color: colors.text }]}>Custom Duration</Text>
                      <Text style={[styles.sliderValue, { color: colors.primary }]}>{customMinutes} mins</Text>
                    </View>
                    <Slider
                      style={{ width: '100%', height: 40 }}
                      minimumValue={5}
                      maximumValue={120}
                      step={5}
                      value={customMinutes}
                      onValueChange={setCustomMinutes}
                      minimumTrackTintColor={colors.primary}
                      maximumTrackTintColor="rgba(255, 255, 255, 0.15)"
                      thumbTintColor={colors.primary}
                    />
                    <TouchableOpacity
                      style={[styles.startCustomBtn, { backgroundColor: colors.primary }]}
                      onPress={handleStartCustom}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.startCustomText}>Start {customMinutes} Min Timer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Fade Out Toggle */}
              <View style={[styles.toggleRow, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.toggleTitle, { color: colors.text }]}>Smooth Volume Fade-Out</Text>
                  <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
                    Gradually reduces volume over the final 30s to gently transition into sleep
                  </Text>
                </View>
                <Switch
                  value={enableFadeOut}
                  onValueChange={setEnableFadeOut}
                  trackColor={{ false: '#3A3A3C', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  activeTimerContainer: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  ringWrapper: {
    marginVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressRingFill: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 6,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  ringCenterText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerDigits: {
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  remainingSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  endTrackLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  fadingBadge: {
    marginTop: 6,
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '600',
  },
  cancelTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 12,
    width: '100%',
  },
  cancelTimerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  setupContainer: {
    marginVertical: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 0.5,
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  endOfTrackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 0.5,
    marginBottom: 14,
  },
  endOfTrackTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  endOfTrackDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  sliderBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 0.5,
    marginBottom: 14,
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  startCustomBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  startCustomText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
