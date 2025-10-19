import auth, { getAuth, signOut } from '@react-native-firebase/auth';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Avatar,
  Divider,
  List,
  Text,
  useTheme
} from 'react-native-paper';
import { useGoogleAuth } from '../../hooks/useGoogleSignIn';
import { useUserDoc } from '../../hooks/useUserDoc';

export type RootNavigationParamList = {
  EditProfile: undefined;
};

// Move components outside of render to avoid nested component warnings
const createAvatarComponent = (avatarUri?: string) => (props: any) =>
  avatarUri ? (
    <Avatar.Image
      size={48}
      source={{ uri: avatarUri }}
      {...props}
    />
  ) : (
    <Avatar.Icon size={48} icon="account" {...props} />
  );

const ChevronRightIcon = (props: any) => <List.Icon {...props} icon="chevron-right" />;

const createLogoutIcon = (errorColor: string) => (props: any) => (
  <List.Icon {...props} icon="logout" color={errorColor} />
);

const Settings = () => {
  const theme = useTheme();
  const { signOutGoogle } = useGoogleAuth();
  const { userDoc } = useUserDoc();
  const authUser = auth().currentUser;

  const navigation = useNavigation<NavigationProp<RootNavigationParamList>>();
  const sectionTitleStyle = useMemo(
    () => ({
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 4,
      opacity: 0.6,
    }),
    [],
  );

  const handleLogout = async () => {
    try {
      await signOutGoogle();
      await signOut(getAuth());
    } catch (error) {
      // Logout failed silently
    }
  };

  const title = userDoc?.displayName ?? authUser?.displayName ?? 'Your profile';
  const description =
    userDoc?.email ?? authUser?.email ?? authUser?.phoneNumber ?? '';
  const avatarUri = userDoc?.photoURL ?? authUser?.photoURL ?? undefined;

  const containerStyle = useMemo(
    () => ({ flex: 1, backgroundColor: theme.colors.background }),
    [theme.colors.background],
  );

  const logoutTitleStyle = useMemo(
    () => ({ color: theme.colors.error }),
    [theme.colors.error],
  );

  // Create component instances
  const AvatarComponent = createAvatarComponent(avatarUri);
  const LogoutIcon = createLogoutIcon(theme.colors.error);

  return (
    <View style={containerStyle}>
      <ScrollView>
        <Text variant="labelSmall" style={sectionTitleStyle}>
          ACCOUNT
        </Text>
        <List.Section>
          <List.Item
            onPress={() => navigation.navigate('EditProfile')}
            title={title}
            description={description}
            left={AvatarComponent}
            right={ChevronRightIcon}
          />
        </List.Section>

        {/* <Divider />

        <Text variant="labelSmall" style={sectionTitleStyle}>
          THEME
        </Text>
        <RadioButton.Group
          onValueChange={v => setThemeChoice(v as any)}
          value={themeChoice}
        >
          <List.Section>
            <List.Item
              title="System Default"
              left={props => <List.Icon {...props} icon="cellphone" />}
              right={() => <RadioButton value="system" />}
              onPress={() => setThemeChoice('system')}
            />
            <List.Item
              title="Light"
              left={props => (
                <List.Icon {...props} icon="white-balance-sunny" />
              )}
              right={() => <RadioButton value="light" />}
              onPress={() => setThemeChoice('light')}
            />
            <List.Item
              title="Dark"
              left={props => <List.Icon {...props} icon="weather-night" />}
              right={() => <RadioButton value="dark" />}
              onPress={() => setThemeChoice('dark')}
            />
          </List.Section>
        </RadioButton.Group>

        <Divider />

        <Text variant="labelSmall" style={sectionTitleStyle}>
          NOTIFICATIONS
        </Text>
        <List.Section>
          <List.Item
            title="Message Notifications"
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch value={msgNotifs} onValueChange={setMsgNotifs} />
            )}
          />
          <List.Item
            title="Notification Tone"
            description="Default"
            onPress={open('notification tones')}
            left={props => <List.Icon {...props} icon="volume-high" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />
          <List.Item
            title="Vibrate"
            left={props => <List.Icon {...props} icon="cellphone-vibrate" />}
            right={() => <Switch value={vibrate} onValueChange={setVibrate} />}
          />
          <List.Item
            title="Mention Notifications"
            left={props => <List.Icon {...props} icon="at" />}
            right={() => (
              <Switch value={mentions} onValueChange={setMentions} />
            )}
          />
        </List.Section>

        <Divider />

        <Text variant="labelSmall" style={sectionTitleStyle}>
          DATA & STORAGE
        </Text>
        <List.Section>
          <List.Item
            title="Auto-Download Media"
            description="Wi‑Fi only"
            left={props => <List.Icon {...props} icon="download" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={open('media settings')}
          />
          <List.Item
            title="Storage Usage"
            description="2.4 GB"
            left={props => <List.Icon {...props} icon="harddisk" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={open('storage usage')}
          />
        </List.Section>

        <Divider />

        <Text variant="labelSmall" style={sectionTitleStyle}>
          PRIVACY & SECURITY
        </Text>
        <List.Section>
          <List.Item
            title="Blocked Contacts"
            description="3 blocked"
            left={props => <List.Icon {...props} icon="account-cancel" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={open('blocked contacts')}
          />
          <List.Item
            title="Read Receipts"
            left={props => <List.Icon {...props} icon="check-all" />}
            right={() => (
              <Switch value={readReceipts} onValueChange={setReadReceipts} />
            )}
          />
          <List.Item
            title="Two-Factor Authentication"
            description="Enabled"
            left={props => <List.Icon {...props} icon="shield-half-full" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={open('two-factor auth')}
          />
        </List.Section>

        <Divider />

        <Text variant="labelSmall" style={sectionTitleStyle}>
          BACKUP & SYNC
        </Text>
        <List.Section>
          <List.Item
            title="Chat Backup"
            description="Daily"
            left={props => <List.Icon {...props} icon="cloud-upload" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={open('backup settings')}
          />
          <List.Item
            title="Auto Sync"
            left={props => <List.Icon {...props} icon="sync" />}
            right={() => (
              <Switch value={autoSync} onValueChange={setAutoSync} />
            )}
          />
          <List.Item
            title="Restore from Backup"
            left={props => <List.Icon {...props} icon="cloud-download" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={open('restore backup')}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Item
            title="About"
            left={props => <List.Icon {...props} icon="information" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={open('about')}
          />
          <List.Item
            title="Help & Support"
            left={props => <List.Icon {...props} icon="help-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={open('help')}
          />
        </List.Section> */}

        <Divider />

        {/* Logout (added explicitly) */}
        <List.Section>
          <List.Item
            title="Logout"
            titleStyle={logoutTitleStyle}
            left={LogoutIcon}
            onPress={handleLogout}
          />
        </List.Section>
      </ScrollView>
    </View>
  );
};

export default Settings;
