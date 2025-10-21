import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAppSelector } from '../app/hooks';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import GoogleLoginScreen from '../screens/GoogleLoginScreen';
import PhoneLoginScreen from '../screens/PhoneLoginScreen';
import { useTheme } from '../theme';
import Stacks from './stacks';
import OnboardingStack from './stacks/Onboarding';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const Navigation = () => {
  const { user, initializing } = useFirebaseAuth();
  const onboardingCompleted = useAppSelector((s) => s.onboarding?.completed ?? false);
  const theme = useTheme();

  // If onboarding hasn't been completed, show it first regardless of auth state
  if (!onboardingCompleted) {
    return <OnboardingStack />;
  }

  if (initializing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors?.background }]}>
        <ActivityIndicator size="large" color={theme.colors?.primary} />
      </View>
    );
  }

  if (!user?.phoneNumber) {
    return <PhoneLoginScreen />;
  }

  if (!user?.email) {
    return <GoogleLoginScreen />;
  }

  if (!onboardingCompleted) {
    return <OnboardingStack />;
  }

  return <Stacks />;
};

export default Navigation;
