import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, List, Menu, Text, useTheme } from 'react-native-paper';

type Props = {
  sendMessagesPolicy: 'all' | 'admins';
  editInfoPolicy: 'admins' | 'all';
  onChangeSendPolicy: (v: 'all' | 'admins') => void;
  onChangeEditPolicy: (v: 'admins' | 'all') => void;
};

export default function GroupPolicies({
  sendMessagesPolicy,
  editInfoPolicy,
  onChangeSendPolicy,
  onChangeEditPolicy,
}: Props) {
  const theme = useTheme();
  const [menu1, setMenu1] = React.useState(false);
  const [menu2, setMenu2] = React.useState(false);

  const sendLabel =
    sendMessagesPolicy === 'all' ? 'All Members' : 'Admins Only';
  const editLabel = editInfoPolicy === 'admins' ? 'Admins Only' : 'All Members';

  const renderSendMessagesMenu = React.useCallback(() => (
    <SendMessagesMenu 
      visible={menu1}
      onDismiss={() => setMenu1(false)}
      onShow={() => setMenu1(true)}
      onChangeSendPolicy={onChangeSendPolicy}
    />
  ), [menu1, onChangeSendPolicy]);

  const renderEditInfoMenu = React.useCallback(() => (
    <EditInfoMenu 
      visible={menu2}
      onDismiss={() => setMenu2(false)}
      onShow={() => setMenu2(true)}
      onChangeEditPolicy={onChangeEditPolicy}
    />
  ), [menu2, onChangeEditPolicy]);

  return (
    <View
      style={[styles.section, { backgroundColor: theme.colors.background }]}
    >
      <Text variant="titleMedium" style={styles.title}>
        Group Policies
      </Text>

      <List.Item
        title="Send Messages"
        description={sendLabel}
        right={renderSendMessagesMenu}
      />

      <List.Item
        title="Edit Group Info"
        description={editLabel}
        right={renderEditInfoMenu}
      />
    </View>
  );
}

const SendMessagesMenu = ({ visible, onDismiss, onShow, onChangeSendPolicy }: {
  visible: boolean;
  onDismiss: () => void;
  onShow: () => void;
  onChangeSendPolicy: (v: 'all' | 'admins') => void;
}) => (
  <Menu
    visible={visible}
    onDismiss={onDismiss}
    anchor={<IconButton icon="chevron-down" onPress={onShow} />}
  >
    <Menu.Item
      onPress={() => {
        onDismiss();
        onChangeSendPolicy('all');
      }}
      title="All Members"
    />
    <Menu.Item
      onPress={() => {
        onDismiss();
        onChangeSendPolicy('admins');
      }}
      title="Admins Only"
    />
  </Menu>
);

const EditInfoMenu = ({ visible, onDismiss, onShow, onChangeEditPolicy }: {
  visible: boolean;
  onDismiss: () => void;
  onShow: () => void;
  onChangeEditPolicy: (v: 'admins' | 'all') => void;
}) => (
  <Menu
    visible={visible}
    onDismiss={onDismiss}
    anchor={<IconButton icon="chevron-down" onPress={onShow} />}
  >
    <Menu.Item
      onPress={() => {
        onDismiss();
        onChangeEditPolicy('admins');
      }}
      title="Admins Only"
    />
    <Menu.Item
      onPress={() => {
        onDismiss();
        onChangeEditPolicy('all');
      }}
      title="All Members"
    />
  </Menu>
);

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, paddingVertical: 10 },
  title: { marginBottom: 8 },
});
