import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, FAB, Text, useTheme } from 'react-native-paper';

type Props = {
  name: string;
  status: string;
  avatarUrl?: string;
  online?: boolean;
  onCall: () => void;
  onVideoCall: () => void;
  onMute: () => void;
  onBlock: () => void;
};

export default function ContactProfile(props: Props) {
  const { name, status, avatarUrl, online, onCall, onVideoCall, onMute, onBlock } = props;
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.avatarWrap}>
        {avatarUrl ? (
          <Avatar.Image size={96} source={{ uri: avatarUrl }} />
        ) : (
          <Avatar.Text size={96} label={name.split(' ').map((n) => n[0]).join('').slice(0, 2)} />
        )}
        {online && <View style={[styles.badge, styles.onlineBadge, { borderColor: theme.colors.surface }]} />}
      </View>
      <Text variant="headlineSmall" style={styles.name} numberOfLines={1}>{name}</Text>
      <Text style={[styles.statusText, { color: theme.colors.secondary }]}>{status}</Text>

      <View style={styles.actionsRow}>
        <FAB 
          size="small" 
          icon="phone" 
          onPress={onCall} 
          style={[
            styles.fab,
            styles.fabWithBorder,
            { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            }
          ]}
          color={theme.colors.primary}
        />
        <FAB 
          size="small" 
          icon="video" 
          onPress={onVideoCall} 
          style={[
            styles.fab,
            styles.fabWithBorder,
            { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            }
          ]}
          color={theme.colors.primary}
        />
        <FAB 
          size="small" 
          icon="bell-off" 
          onPress={onMute} 
          style={[
            styles.fab,
            styles.fabWithBorder,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            }
          ]}
          color={theme.colors.primary}
        />
        <FAB 
          size="small" 
          icon="account-cancel" 
          onPress={onBlock} 
          style={[
            styles.fab,
            styles.fabWithBorder,
            { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.error,
            }
          ]}
          color={theme.colors.error}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 16 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    // backgroundColor will be set dynamically in component
  },
  onlineBadge: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    marginBottom: 12,
  },
  name: { fontWeight: '700', textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  fab: { marginHorizontal: 6 },
  fabWithBorder: {
    borderWidth: 1,
  },
});