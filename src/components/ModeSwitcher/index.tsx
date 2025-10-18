import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import { SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { Mode } from '../../types/camera';

type Props = {
  mode: Mode;
  onChangeMode: (m: Mode) => void;
};

const ModeSwitcher: React.FC<Props> = ({ mode, onChangeMode }) => {
  const theme = useTheme();
  const buttons = useMemo(
    () => [
      { value: 'photo', label: 'Photo', uncheckedColor: theme.colors.onSurface },
      { value: 'video', label: 'Video', uncheckedColor: theme.colors.onSurface },
    ],
    [theme.colors.onSurface]
  );

  return (
    <View style={{ width: '70%', alignSelf: 'center' }}>
      <SegmentedButtons
        value={mode}
        onValueChange={(val) => onChangeMode(val as Mode)}
        buttons={buttons}
        density="regular"
      />
    </View>
  );
};

export default memo(ModeSwitcher);
