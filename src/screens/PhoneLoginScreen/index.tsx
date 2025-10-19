// screens/PhoneLoginScreen.tsx
import React, { useState } from 'react';
import { Dimensions, Image, KeyboardAvoidingView, StyleSheet, useColorScheme } from 'react-native';
import {
  Button,
  Card,
  Divider,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { usePhoneAuth } from '../../hooks/usePhoneSignIn';

// const HERO_IMAGE_URL =
  'https://img.freepik.com/free-vector/sign-page-abstract-concept-illustration_335657-2249.jpg'; // example from Freepik "Login illustration" gallery

export default function PhoneLoginScreen() {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';
  const {
    phoneNumber,
    setPhoneNumber,
    code,
    setCode,
    confirmResult,
    isSending,
    isVerifying,
    error,
    sendOtp,
    confirmCode,
    reset,
  } = usePhoneAuth();

  const [snack, setSnack] = useState({ visible: false, message: '' });

  const show = (m: string) => setSnack({ visible: true, message: m });

  const onSend = async () => {
    await sendOtp();
    if (!error) show('OTP sent. Check your messages.');
  };

  const onVerify = async () => {
    await confirmCode();
    if (!error) show('Verified! Signing you in…');
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
      behavior='padding'
    >
      <Image
        source={isDark ? require('../../assets/images/dark-illustration.png') : require('../../assets/images/light-illustration.png')}
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
            Continue with phone
          </Text>
          {!confirmResult ? (
            <>
              <TextInput
                mode="outlined"
                placeholder="+91 9876543210"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                left={<TextInput.Icon icon="phone" />}
              />
              <Button
                mode="contained"
                onPress={onSend}
                loading={isSending}
                disabled={isSending}
              >
                Send OTP
              </Button>
            </>
          ) : (
            <>
              <TextInput
                mode="outlined"
                placeholder="Enter OTP"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                left={<TextInput.Icon icon="shield-key" />}
              />
              <Button
                mode="contained"
                onPress={onVerify}
                loading={isVerifying}
                disabled={isVerifying}
              >
                Verify & Continue
              </Button>
              <Button mode="text" onPress={reset}>
                Change number
              </Button>
            </>
          )}

          <Divider style={styles.divider} />
          <Text variant="bodyMedium" style={styles.privacyText}>
            We'll never share your number.
          </Text>
        </Card.Content>
      </Card>

      <Snackbar
        visible={snack.visible || !!error}
        onDismiss={() => setSnack({ visible: false, message: '' })}
        duration={3000}
        style={styles.snackbar}
      >
        {error || snack.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  image: {
    width: '100%',
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
  divider: {
    marginVertical: 8,
  },
  privacyText: {
    opacity: 0.7,
  },
  snackbar: {
    marginBottom: 24,
  },
});