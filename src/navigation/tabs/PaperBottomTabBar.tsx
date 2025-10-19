import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import * as React from 'react';
import {
  StyleSheet,
} from 'react-native';
import {
  BottomNavigation,
} from 'react-native-paper';
import { MONO, useTheme } from '../../theme';

const styles = StyleSheet.create({
  activeIndicator: {
    backgroundColor: 'transparent',
    opacity: 0.1,
    borderRadius: 16,
  },
});

export default function PaperBottomTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const theme = useTheme();

  return (
    <BottomNavigation.Bar
      navigationState={state}
      safeAreaInsets={insets}
      style={{
        backgroundColor: theme.colors?.background,
      }}
      activeColor={theme.colors?.primary ?? MONO.black}
      activeIndicatorStyle={styles.activeIndicator}
      inactiveColor={(theme.colors as any)?.secondary ?? MONO.gray500}
      onTabPress={({ route, preventDefault }) => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });

        if (event.defaultPrevented) {
          preventDefault();
        } else {
          navigation.dispatch({
            ...CommonActions.navigate(route.name, (route as any).params),
            target: state.key,
          });
        }
      }}
      renderIcon={({ route, focused, color }) =>
        descriptors[route.key].options.tabBarIcon?.({
          focused,
          color,
          size: 24,
        }) || null
      }
      getLabelText={({ route }) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options.title === 'string'
            ? options.title
            : route.name;
        return label;
      }}
    />
  );
}
