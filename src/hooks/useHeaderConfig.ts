import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { IconButton, useTheme } from 'react-native-paper';

interface UseHeaderConfigProps {
  title: string;
  onMenuPress: () => void;
}

export const useHeaderConfig = ({ title, onMenuPress }: UseHeaderConfigProps) => {
  const navigation = useNavigation();
  const theme = useTheme();

  const headerRight = useCallback(
    () => (
      React.createElement(IconButton, {
        icon: "dots-vertical",
        size: 24,
        iconColor: theme.colors.onBackground,
        onPress: onMenuPress,
        testID: "menu-button"
      })
    ),
    [onMenuPress, theme.colors],
  );

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: title,
      headerBackVisible: true,
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: theme.colors.background,
      },
      headerTitleStyle: {
        color: theme.colors.onBackground,
      },
      headerTintColor: theme.colors.onBackground,
      headerRight,
    });
  }, [navigation, title, theme.colors, headerRight]);
};