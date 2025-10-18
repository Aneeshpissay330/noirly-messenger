// src/components/ChatBubble/SelectionCheckbox.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from '@react-native-vector-icons/material-design-icons';

type Props = {
  isSelectionMode: boolean;
  isSelected: boolean;
  theme: any;
};

export default function SelectionCheckbox({ isSelectionMode, isSelected, theme }: Props) {
  if (!isSelectionMode) return null;

  return (
    <View style={[
      styles.checkbox, 
      { 
        backgroundColor: isSelected ? theme.colors.primary : 'transparent', 
        borderColor: theme.colors.primary 
      }
    ]}>
      {isSelected && (
        <Icon 
          name="check" 
          size={14} 
          color={theme.colors.onPrimary} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});