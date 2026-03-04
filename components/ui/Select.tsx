import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import { ChevronDown } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: SelectOption[];
  error?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export function Select({
  value,
  onValueChange,
  placeholder = 'Select...',
  options,
  error = false,
  style,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setIsOpen(false);
    setIsFocused(false);
  };

  return (
    <View style={style}>
      <Pressable
        onPress={() => {
          setIsOpen(true);
          setIsFocused(true);
        }}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.selectButton,
          isFocused ? styles.selectButtonFocused : styles.selectButtonUnfocused,
          error && styles.selectButtonError,
        ]}
      >
        <Text
          style={[
            styles.selectText,
            value ? styles.selectTextValue : styles.selectTextPlaceholder,
          ]}
        >
          {displayText}
        </Text>
        <ChevronDown
          size={20}
          color={colors.mutedForeground}
          style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsOpen(false);
          setIsFocused(false);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setIsOpen(false);
            setIsFocused(false);
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {placeholder}
              </Text>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleSelect(option.value)}
                  style={[
                    styles.optionItem,
                    value === option.value && styles.optionItemSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  selectButton: {
    backgroundColor: colors.input,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: 1,
  },
  selectButtonFocused: {
    borderColor: colors.primary,
  },
  selectButtonUnfocused: {
    borderColor: colors.border,
  },
  selectButtonError: {
    borderColor: colors.destructive,
  },
  selectText: {
    fontSize: fontSize.base,
  },
  selectTextValue: {
    color: colors.foreground,
  },
  selectTextPlaceholder: {
    color: colors.mutedForeground,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080', // 50% opacity black
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
    maxHeight: '50%',
  },
  modalHeader: {
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  modalScrollView: {
    maxHeight: 240, // 60 * 4 (spacing equivalent)
  },
  optionItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionItemSelected: {
    backgroundColor: `${colors.primary}1A`, // 10% opacity
  },
  optionText: {
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
