import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SegmentedButtons, useTheme } from 'react-native-paper';
import { Mode } from '../../types/camera';

type Props = {
  mode: Mode;
  onChangeMode: (m: Mode) => void;
};

const styles = StyleSheet.create({
  container: {
    width: '70%',
    alignSelf: 'center',
  },
});

const ModeSwitcher: React.FC<Props> = ({ mode, onChangeMode }) => {
  const theme = useTheme();
  const buttons = useMemo(
    () => [
      { 
        value: 'photo', 
        label: 'Photo', 
        uncheckedColor: theme.colors.onSurface,
        checkedColor: theme.colors.primary,
      },
      { 
        value: 'video', 
        label: 'Video', 
        uncheckedColor: theme.colors.onSurface,
        checkedColor: theme.colors.primary,
      },
    ],
    [theme.colors.onSurface, theme.colors.primary]
  );

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={mode}
        onValueChange={(val) => onChangeMode(val as Mode)}
        buttons={buttons}
        density="regular"
        style={{
          backgroundColor: 'transparent',
        }}
        theme={{
          ...theme,
          colors: {
            ...theme.colors,
            // For outlined style - selected state
            secondaryContainer: theme.colors.outline,
            onSecondaryContainer: theme.colors.primary,
            // For outlined style - unselected state  
            surface: 'transparent',
            onSurface: theme.colors.onSurface,
            // Border color
            outline: theme.colors.outline,
          },
        }}
      />
    </View>
  );
};

export default memo(ModeSwitcher);
