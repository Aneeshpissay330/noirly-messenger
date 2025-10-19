import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as React from 'react';

import Chat from '../../screens/Chat';
import Settings from '../../screens/Settings';
import { useTheme } from '../../theme';
import PaperBottomTabBar from './PaperBottomTabBar';

export type RootTabParamList = {
  Chat: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// Move icon components outside to avoid nested component warnings
const ChatIcon = ({ color, size = 26 }: { color: string; size?: number }) => (
  <MaterialCommunityIcons name="home-outline" color={color} size={size} />
);

const SettingsIcon = ({ color, size = 26 }: { color: string; size?: number }) => (
  <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
);

// Extract the tabBar component to avoid inline function
const TabBarComponent = (props: any) => <PaperBottomTabBar {...props} />;

export default function Tabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        animation: 'shift',
        headerStyle: { elevation: 0, shadowOpacity: 0, backgroundColor: theme.colors?.background },
        headerTintColor: (theme.colors as any)?.onSurface ?? theme.colors?.primary,
        headerTitleStyle: {
          fontFamily: 'Lexend-Medium',
          fontSize: 18,
        },
      }}
      tabBar={TabBarComponent}
    >
      <Tab.Screen
        name="Chat"
        component={Chat}
        options={{
          tabBarIcon: ChatIcon,
          title: 'Chat',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={Settings}
        options={{
          tabBarIcon: SettingsIcon,
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}
