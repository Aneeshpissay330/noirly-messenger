import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Avatar,
  IconButton,
  List,
  Menu,
  Text,
  useTheme,
} from 'react-native-paper';

export type Member = {
  id: string;
  name: string;
  role?: 'admin' | 'moderator' | 'member';
  avatar?: string;
  presence?: 'online' | 'offline' | string;
};

type Props = {
  members: Member[];
  onPromote?: (id: string) => void;
  onDemote?: (id: string) => void;
  onRemove?: (id: string) => void;
};

const RoleBadge = ({ role, theme }: { role?: Member['role']; theme: any }) => {
  if (!role || role === 'member') return null;
  const label = role === 'admin' ? 'Admin' : 'Moderator';
  const bg = role === 'admin' ? theme.colors.primary : theme.colors.secondary;
  return (
    <Text
      style={[
        styles.roleBadge,
        {
          backgroundColor: bg,
        },
      ]}
    >
      {label}
    </Text>
  );
};

const AvatarLeft = ({ member }: { member: Member }) => {
  if (member.avatar) {
    return <Avatar.Image size={48} source={{ uri: member.avatar }} />;
  }
  return (
    <Avatar.Text
      size={48}
      label={member.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)}
    />
  );
};

const ItemRight = ({
  member,
  theme,
  openFor,
  setOpenFor,
  onPromote,
  onDemote,
  onRemove,
}: {
  member: Member;
  theme: any;
  openFor: string | null;
  setOpenFor: (id: string | null) => void;
  onPromote?: (id: string) => void;
  onDemote?: (id: string) => void;
  onRemove?: (id: string) => void;
}) => (
  <View style={styles.rightContainer}>
    <RoleBadge role={member.role} theme={theme} />
    <Menu
      visible={openFor === member.id}
      onDismiss={() => setOpenFor(null)}
      anchor={
        <IconButton
          icon="dots-vertical"
          onPress={() => setOpenFor(member.id)}
        />
      }
    >
      {onPromote && (
        <Menu.Item
          onPress={() => {
            setOpenFor(null);
            onPromote(member.id);
          }}
          title="Make Admin"
        />
      )}
      {onDemote && (
        <Menu.Item
          onPress={() => {
            setOpenFor(null);
            onDemote(member.id);
          }}
          title="Remove Admin"
        />
      )}
      {onRemove && (
        <Menu.Item
          onPress={() => {
            setOpenFor(null);
            onRemove(member.id);
          }}
          title="Remove from Group"
        />
      )}
    </Menu>
  </View>
);

export default function GroupMemberList({
  members,
  onPromote,
  onDemote,
  onRemove,
}: Props) {
  const theme = useTheme();
  const [openFor, setOpenFor] = React.useState<string | null>(null);

  const renderAvatarLeft = React.useCallback((member: Member) => {
    return <AvatarLeft member={member} />;
  }, []);

  const renderItemRight = React.useCallback((member: Member) => {
    return (
      <ItemRight
        member={member}
        theme={theme}
        openFor={openFor}
        setOpenFor={setOpenFor}
        onPromote={onPromote}
        onDemote={onDemote}
        onRemove={onRemove}
      />
    );
  }, [theme, openFor, onPromote, onDemote, onRemove]);

  return (
    <View style={styles.container}>
      {members.map(m => (
        <List.Item
          key={m.id}
          title={m.name}
          description={`${
            m.role ? m.role[0].toUpperCase() + m.role.slice(1) : 'Member'
          } • ${m.presence ?? ''}`.trim()}
          left={() => renderAvatarLeft(m)}
          right={() => renderItemRight(m)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 12,
  },
});
