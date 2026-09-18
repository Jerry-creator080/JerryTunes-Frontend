import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}

export const ActionSheet = ({ visible, title, options, onClose }: ActionSheetProps) => {
  const { colors, spacing, typography, radius } = useTheme();

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: spacing.xl }]}>
              {title && (
                <Text style={[styles.title, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                  {title}
                </Text>
              )}
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.option, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    option.onPress();
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.optionText, 
                    { 
                      color: option.destructive ? colors.primary : colors.text, 
                      fontSize: typography.sizes.md 
                    }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 14,
    textAlign: 'center',
  },
  option: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    textAlign: 'center',
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 16,
    marginTop: 8,
  },
  cancelText: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  }
});
