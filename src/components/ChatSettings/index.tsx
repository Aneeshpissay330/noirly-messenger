import * as React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { IconButton, List, Switch, useTheme } from 'react-native-paper';

type Props = {
  notificationsEnabled: boolean;
  onToggleNotifications: (v: boolean) => void;
  onClearChat: () => void;
};

// Move these components outside the render function
const NotificationSwitch = ({ value, onValueChange }: { value: boolean; onValueChange: (value: boolean) => void }) => (
  <Switch value={value} onValueChange={onValueChange} />
);

const EncryptionIcon = ({ iconColor }: { iconColor: string }) => (
  <IconButton icon="lock" iconColor={iconColor} onPress={() => {}} />
);

export default function ChatSettings({ notificationsEnabled, onToggleNotifications, onClearChat }: Props) {
  const theme = useTheme();

  const confirmClear = () => {
    Alert.alert('Clear Chat', 'Are you sure you want to clear this chat? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: onClearChat },
    ]);
  };

  const renderNotificationIcon = (props: any) => <List.Icon {...props} icon="bell" />;
  const renderEncryptionIcon = (props: any) => <List.Icon {...props} icon="shield-lock" />;
  const renderDeleteIcon = (props: any) => <List.Icon {...props} color={theme.colors.error} icon="trash-can" />;

  // Define these functions to avoid nested components
  const renderNotificationSwitch = () => (
    <NotificationSwitch value={notificationsEnabled} onValueChange={onToggleNotifications} />
  );

  const renderEncryptionRightIcon = () => (
    <EncryptionIcon iconColor={theme.colors.secondary} />
  );

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.background }]}>
      <List.Item
        title="Notifications"
        left={renderNotificationIcon}
        right={renderNotificationSwitch}
      />

      <List.Item
        title="Encryption"
        description="Messages are end-to-end encrypted"
        left={renderEncryptionIcon}
        right={renderEncryptionRightIcon}
      />

      <List.Item
        title="Clear Chat"
        left={renderDeleteIcon}
        titleStyle={{ color: theme.colors.error }}
        onPress={confirmClear}
      />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { marginTop: 8 } });