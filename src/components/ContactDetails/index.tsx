import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, List, useTheme } from 'react-native-paper';

type Props = {
  phone: string;
  email: string;
  onPressPhone: () => void;
  onPressEmail: () => void;
};

const PhoneIcon = (props: any) => <List.Icon {...props} icon="phone" />;
const EmailIcon = (props: any) => <List.Icon {...props} icon="email" />;

const PhoneButton = ({ theme, onPress }: { theme: any; onPress: () => void }) => (
  <IconButton icon="phone" iconColor={theme.colors.primary} onPress={onPress} />
);

const EmailButton = ({ theme, onPress }: { theme: any; onPress: () => void }) => (
  <IconButton icon="email" iconColor={theme.colors.primary} onPress={onPress} />
);

export default function ContactDetails({ phone, email, onPressPhone, onPressEmail }: Props) {
  const theme = useTheme();
  
  const renderPhoneButton = React.useCallback(() => (
    <PhoneButton theme={theme} onPress={onPressPhone} />
  ), [theme, onPressPhone]);
  
  const renderEmailButton = React.useCallback(() => (
    <EmailButton theme={theme} onPress={onPressEmail} />
  ), [theme, onPressEmail]);
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <List.Item
        title={phone}
        description="Phone"
        left={PhoneIcon}
        right={renderPhoneButton}
      />
      <List.Item
        title={email}
        description="Email"
        left={EmailIcon}
        right={renderEmailButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // backgroundColor is applied dynamically from theme
  },
});