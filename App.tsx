import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { lightTheme, darkTheme } from './src/theme';
import Navigation from './src/navigation';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import { StatusBar, useColorScheme } from 'react-native';

const App = () => {
  const isDark = useColorScheme() === 'dark';
  return (
    <PaperProvider theme={isDark ? darkTheme : lightTheme}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <NavigationContainer ref={navigationRef}>
        <Navigation />
      </NavigationContainer>
    </PaperProvider>
  );
};

export default App;
