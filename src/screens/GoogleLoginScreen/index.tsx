// GoogleLoginScreen.tsx
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import React, { useState } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { Card, Snackbar, Text, useTheme } from 'react-native-paper';
import { useGoogleAuth } from '../../hooks/useGoogleSignIn';

export default function GoogleLoginScreen({ _navigation }: any) {
  const theme = useTheme();
  const { signInOrLink, loading } = useGoogleAuth();
  const [snack, setSnack] = useState({ visible: false, message: '' });

  // screens/GoogleLoginScreen.tsx
  const onPress = async () => {
    const { error } = await signInOrLink();
    if (error && error !== 'cancelled') {
      setSnack({ visible: true, message: error });
      return;
    }
    if (error === 'cancelled') return;
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <Image
        source={require('../../assets/images/light-illustration.png')}
        resizeMode="contain"
        style={styles.image}
      />

      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text
            variant="titleMedium"
            style={[styles.welcomeText, { color: theme.colors.primary }]}
          >
            Welcome!
          </Text>
          <Text variant="bodyMedium" style={styles.descriptionText}>
            Sign in or get started on your journey — we're glad you're here.
          </Text>

          <Text variant="headlineSmall" style={styles.headlineText}>
            Continue with Google
          </Text>

          <GoogleSigninButton
            size={GoogleSigninButton.Size.Standard}
            color={GoogleSigninButton.Color.Dark}
            onPress={onPress}
            disabled={loading}
            style={styles.googleButton}
          />
        </Card.Content>
      </Card>

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack(s => ({ ...s, visible: false }))}
        duration={3000}
        style={styles.snackbar}
      >
        {snack.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  image: {
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height * 0.4,
    marginBottom: 16,
    borderRadius: 16,
  },
  card: {
    borderRadius: 20,
  },
  cardContent: {
    gap: 14,
  },
  welcomeText: {
    fontWeight: '600',
  },
  descriptionText: {
    opacity: 0.7,
    marginBottom: 8,
  },
  headlineText: {
    fontWeight: '700',
  },
  googleButton: {
    alignSelf: 'center',
    width: '100%',
    height: 48,
    marginTop: 8,
  },
  snackbar: {
    marginBottom: 24,
  },
});