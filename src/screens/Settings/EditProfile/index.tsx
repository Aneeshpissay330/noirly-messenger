// screens/Settings/EditProfile/index.tsx
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  Divider,
  IconButton,
  List,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserDoc } from '../../../hooks/useUserDoc';
import {
  pickAvatarFromGallery,
  takeAvatarPhoto,
  uploadAvatar,
} from '../../../services/avatar';
import { updateUserProfile } from '../../../services/user';

const MAX_BIO = 150;

const EditProfile = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { userDoc } = useUserDoc();

  // UI state
  const [photoUri, setPhotoUri] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [photoActionsVisible, setPhotoActionsVisible] = useState(false);
  const [_qrVisible, _setQrVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const authUser = auth().currentUser;
  const email = userDoc?.email ?? authUser?.email ?? '';
  const phone = userDoc?.phoneNumber ?? authUser?.phoneNumber ?? '';

  // Seed from Firestore doc (preferred) with Auth fallback
  useEffect(() => {
    setPhotoUri(userDoc?.photoURL ?? authUser?.photoURL ?? photoUri);
    setDisplayName(userDoc?.displayName ?? authUser?.displayName ?? '');
    setUsername(userDoc?.username ?? '');
    setBio(userDoc?.bio ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userDoc?.photoURL,
    userDoc?.displayName,
    userDoc?.username,
    userDoc?.bio,
  ]);

  const sectionTitleStyle = useMemo(
    () => ({
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 4,
      opacity: 0.6,
    }),
    [],
  );

  const normalizeUsername = (val: string) =>
    val.toLowerCase().replace(/[^a-z0-9_]/g, '');

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      await updateUserProfile({
        displayName: displayName.trim(),
        username: normalizeUsername(username),
        bio: bio.trim(),
        photoURL: photoUri || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [displayName, username, bio, photoUri, navigation]);

  const changeAvatarFromGallery = async () => {
    try {
      const img = await pickAvatarFromGallery();
      const url = await uploadAvatar(img.path);
      setPhotoUri(url);
      await updateUserProfile({ photoURL: url });
      setPhotoActionsVisible(false);
    } catch (e: any) {
      if (e?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Photo error', e?.message ?? 'Could not update photo.');
      }
    }
  };

  const changeAvatarFromCamera = async () => {
    try {
      const img = await takeAvatarPhoto();
      const url = await uploadAvatar(img.path);
      setPhotoUri(url);
      await updateUserProfile({ photoURL: url });
      setPhotoActionsVisible(false);
    } catch (e: any) {
      if (e?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Photo error', e?.message ?? 'Could not update photo.');
      }
    }
  };

  const renderHeaderLeft = useCallback(() => (
    <IconButton
      icon="arrow-left"
      size={20}
      onPress={() => navigation.goBack()}
    />
  ), [navigation]);

  const renderHeaderRight = useCallback(() => (
    <Button
      onPress={handleSave}
      mode="text"
      loading={saving}
      disabled={saving}
    >
      Save
    </Button>
  ), [handleSave, saving]);

  const renderDisplayNameInput = useCallback(() => (
    <View style={styles.inputContainer}>
      <TextInput
        mode="outlined"
        label="Display Name"
        value={displayName}
        onChangeText={setDisplayName}
      />
    </View>
  ), [displayName]);

  const renderUsernameInput = useCallback(() => (
    <View style={styles.inputContainer}>
      <TextInput
        mode="outlined"
        label="Username"
        value={username}
        onChangeText={t => setUsername(normalizeUsername(t))}
        left={<TextInput.Affix text="@" />}
      />
      <Text variant="bodySmall" style={styles.hintText}>
        Others can find you by this username
      </Text>
    </View>
  ), [username]);

  const renderBioInput = useCallback(() => (
    <View style={styles.inputContainer}>
      <TextInput
        mode="outlined"
        label="About"
        value={bio}
        multiline
        numberOfLines={3}
        onChangeText={t => setBio(t.slice(0, MAX_BIO))}
      />
      <View style={styles.bioHintContainer}>
        <Text variant="bodySmall" style={styles.hintText}>
          Write a few words about yourself
        </Text>
        <Text variant="bodySmall" style={styles.hintText}>
          {bio.length}/{MAX_BIO}
        </Text>
      </View>
    </View>
  ), [bio]);

  const renderEmailInput = useCallback(() => (
    <View style={styles.inputContainer}>
      <TextInput
        mode="outlined"
        label="Email"
        value={email}
        disabled
      />
      <Text variant="bodySmall" style={styles.hintText}>
        Linked to account
      </Text>
    </View>
  ), [email]);

  const renderPhoneInput = useCallback(() => (
    <View style={styles.inputContainer}>
      <TextInput
        mode="outlined"
        label="Phone Number"
        value={phone}
        disabled
      />
      <Text variant="bodySmall" style={styles.hintText}>
        Used for account verification
      </Text>
    </View>
  ), [phone]);

  const renderCameraIcon = useCallback((props: any) => (
    <List.Icon {...props} icon="camera" />
  ), []);

  const renderGalleryIcon = useCallback((props: any) => (
    <List.Icon {...props} icon="image" />
  ), []);

  const photoSectionStyle = useMemo(
    () => [
      styles.photoSection,
      {
        borderBottomColor: theme.dark
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(0,0,0,0.05)',
      },
    ],
    [theme.dark],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Edit Profile',
      headerLeft: renderHeaderLeft,
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderLeft, renderHeaderRight]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        {/* Photo section */}
        <View style={photoSectionStyle}>
          <View style={styles.avatarContainer}>
            {photoUri ? (
              <Avatar.Image size={96} source={{ uri: photoUri }} />
            ) : (
              <Avatar.Icon size={96} icon="account" />
            )}
            <IconButton
              icon="camera"
              size={16}
              onPress={() => setPhotoActionsVisible(true)}
              style={[
                styles.cameraButton,
                { backgroundColor: theme.colors.primary },
              ]}
              iconColor="white"
            />
          </View>
          <Text variant="bodySmall" style={styles.photoHint}>
            Tap to change photo
          </Text>
        </View>

        {/* Basic Information */}
        <Text variant="labelSmall" style={sectionTitleStyle}>
          BASIC INFORMATION
        </Text>
        <List.Section>
          <List.Item title={renderDisplayNameInput} />
          <List.Item title={renderUsernameInput} />
          <List.Item title={renderBioInput} />
        </List.Section>

        <Divider />

        {/* Contact Information (read-only) */}
        <Text variant="labelSmall" style={sectionTitleStyle}>
          CONTACT INFORMATION
        </Text>
        <List.Section>
          <List.Item title={renderEmailInput} />
          <List.Item title={renderPhoneInput} />
        </List.Section>
      </ScrollView>

      {/* Photo action sheet */}
      <Portal>
        <Modal
          visible={photoActionsVisible}
          onDismiss={() => setPhotoActionsVisible(false)}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.elevation.level2 },
          ]}
        >
          <Text variant="titleMedium" style={styles.modalTitle}>
            Change Profile Photo
          </Text>
          <List.Item
            title="Take Photo"
            left={renderCameraIcon}
            onPress={changeAvatarFromCamera}
          />
          <List.Item
            title="Choose from Gallery"
            left={renderGalleryIcon}
            onPress={changeAvatarFromGallery}
          />
          {/* <List.Item
            title="Remove Photo"
            titleStyle={{ color: theme.colors.error }}
            left={props => (
              <List.Icon
                {...props}
                icon="trash-can-outline"
                color={theme.colors.error}
              />
            )}
            onPress={async () => {
              setPhotoUri('');
              await updateUserProfile({ photoURL: '' });
              setPhotoActionsVisible(false);
            }}
          /> */}
          <Button
            mode="outlined"
            onPress={() => setPhotoActionsVisible(false)}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </Modal>
      </Portal>

      {/* (Your QR modal stays as-is) */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    width: 96,
    height: 96,
  },
  cameraButton: {
    position: 'absolute',
    right: -6,
    bottom: -6,
  },
  photoHint: {
    marginTop: 8,
    opacity: 0.7,
  },
  inputContainer: {
    width: '100%',
  },
  hintText: {
    marginTop: 4,
    opacity: 0.6,
  },
  bioHintContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  modal: {
    margin: 16,
    borderRadius: 16,
    padding: 12,
  },
  modalTitle: {
    marginBottom: 12,
  },
  cancelButton: {
    marginTop: 8,
  },
});

export default EditProfile;
