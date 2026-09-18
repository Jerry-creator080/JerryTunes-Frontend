import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const SubscriptionScreen = ({ navigation }: any) => {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const features = [
    "Ad-free listening",
    "High quality audio (320kbps)",
    "HD Video Downloads",
    "Offline playback",
    "Background play",
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 16 }}>
        <Ionicons name="close" size={28} color={colors.text} />
      </TouchableOpacity>
      
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Text style={[styles.title, { color: colors.text, fontSize: typography.sizes.xxl }]}>
          JerryTunes <Text style={{ color: colors.primary }}>Premium</Text>
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Unlock the ultimate music experience.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 32, marginBottom: 40 }}>
        {features.map((feature, idx) => (
          <View key={idx} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        <TouchableOpacity style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View>
            <Text style={[styles.planTitle, { color: colors.text }]}>Monthly</Text>
            <Text style={[styles.planPrice, { color: colors.textSecondary }]}>$3.00 / month</Text>
          </View>
          <View style={[styles.selectBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Select</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 2 }]}>
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>BEST VALUE</Text>
          </View>
          <View>
            <Text style={[styles.planTitle, { color: colors.text }]}>Lifetime</Text>
            <Text style={[styles.planPrice, { color: colors.textSecondary }]}>$60.00 once</Text>
          </View>
          <View style={[styles.selectBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Select</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <Text style={{ textAlign: 'center', marginTop: 40, color: colors.textSecondary, fontSize: 12 }}>
        This is a UI mockup. Payments are not processed.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '500',
  },
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    position: 'relative',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 14,
  },
  selectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  }
});
