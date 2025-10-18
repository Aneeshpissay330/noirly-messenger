/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/app/store';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import { ensureNotificationChannel, ensureNotificationPermission, displayNotificationForRemoteMessage } from './src/services/notifications';
import { navigationRef, waitForNavigationReady } from './src/navigation/navigationRef';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { shouldHandleNotificationNav } from './src/utils/notificationNav';

const Main = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </GestureHandlerRootView>
);

AppRegistry.registerComponent(appName, () => Main);

// Background message handler: must be defined at the entry point
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // On Android, if the message contains notification, the system may show it.
  // We can still ensure our channel exists for consistency.
  await ensureNotificationChannel();
});

// App start: set up permissions and foreground handler
(async () => {
  try {
    await ensureNotificationChannel();
    await ensureNotificationPermission();

    // Foreground messages: show a local notification so users see alerts
    messaging().onMessage(async remoteMessage => {
      await displayNotificationForRemoteMessage(remoteMessage, { force: true });
    });

    // Helper: navigate to a chat based on FCM data payload
    const navigateFromMessage = async (remoteMessage) => {
      try {
  const data = remoteMessage?.data || {};
        const chatId = data.chatId;
        const senderId = data.senderId; // fallback if needed
        const chatType = data.chatType; // 'dm' | 'group'
  const messageId = data.messageId;
  if (!shouldHandleNotificationNav(messageId)) return;
        await ensureNotificationChannel();
        const ready = await waitForNavigationReady(8000);
        if (!ready) {
          console.warn('Navigation not ready in time for notification tap');
          return;
        }
        if (chatId) {
          if (chatType === 'group') {
            navigationRef.navigate('ChatViewGroup', { id: chatId });
            return;
          }
          if (chatType === 'dm') {
            // DM expects other user's uid, use senderId if available
            if (senderId) {
              navigationRef.navigate('ChatView', { id: senderId });
              return;
            }
          }
          // If chatType missing, fallback to old behavior (best effort via senderId)
          if (senderId) {
            navigationRef.navigate('ChatView', { id: senderId });
            return;
          }
          navigationRef.navigate('Tabs');
          return;
        }
        if (senderId) {
          navigationRef.navigate('ChatView', { id: senderId });
          return;
        }
        navigationRef.navigate('Tabs');
      } catch (e) {
        console.warn('Notification navigation error', e);
      }
    };

    // User tapped a notification while app in background
    messaging().onNotificationOpenedApp(navigateFromMessage);

    // App opened from quit state by tapping a notification
    const initial = await messaging().getInitialNotification();
    if (initial) {
      await navigateFromMessage(initial);
    }
  } catch (e) {
    // Non-fatal: prefer not to crash app startup for notifications setup
    console.warn('Notification setup error', e);
  }
})();
