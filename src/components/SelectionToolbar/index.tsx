import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, Text, useTheme } from 'react-native-paper';

type Props = {
  visible: boolean;
  selectedCount: number;
  onClose: () => void;
  onSelectAll: () => void;
  onDelete: () => void;
  canSelectAll: boolean;
};

export default function SelectionToolbar({
  visible,
  selectedCount,
  onClose,
  onSelectAll,
  onDelete,
  canSelectAll,
}: Props) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Appbar.Header style={{ backgroundColor: 'transparent', elevation: 0 }}>
        <Appbar.Action icon="close" onPress={onClose} />
        <Appbar.Content 
          title={`${selectedCount} selected`}
          titleStyle={{ color: theme.colors.onSurface }}
        />
        {canSelectAll && (
          <Appbar.Action 
            icon="select-all" 
            onPress={onSelectAll}
            iconColor={theme.colors.primary}
          />
        )}
        <Appbar.Action 
          icon="delete" 
          onPress={onDelete}
          iconColor={theme.colors.error}
          disabled={selectedCount === 0}
        />
      </Appbar.Header>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});