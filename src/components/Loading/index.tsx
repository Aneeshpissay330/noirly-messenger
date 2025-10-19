import React from 'react';
import { View } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import { styles } from './styles';

const Loading = () => {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator animating={true} color={theme.colors.primary} size="large" />
    </View>
  );
};

export default Loading;
