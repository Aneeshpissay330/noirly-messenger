import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { List, Switch, useTheme } from 'react-native-paper';

type Props = {
  notificationsEnabled: boolean;
  muteGroup: boolean;
  onToggleNotifications: (v: boolean) => void;
  onToggleMute: (v: boolean) => void;
};

// Define icon components outside render
const NotificationIcon = (props: any) => <List.Icon {...props} icon="bell" />;
const MuteIcon = (props: any) => <List.Icon {...props} icon="volume-off" />;

export default function GroupChatSettings({
  notificationsEnabled,
  muteGroup,
  onToggleNotifications,
  onToggleMute,
}: Props) {
  const theme = useTheme();

  // Define switch components to avoid nested components
  const renderNotificationSwitch = () => (
    <Switch
      value={notificationsEnabled}
      onValueChange={onToggleNotifications}
    />
  );

  const renderMuteSwitch = () => (
    <Switch value={muteGroup} onValueChange={onToggleMute} />
  );

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.background }]}>
      <List.Item
        title="Notifications"
        left={NotificationIcon}
        right={renderNotificationSwitch}
      />
      <List.Item
        title="Mute Group"
        left={MuteIcon}
        right={renderMuteSwitch}
      />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { marginTop: 8 } });
