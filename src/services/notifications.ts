import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
} from '@notifee/react-native';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { navigationRef } from '../navigation/navigationRef';
import { shouldHandleNotificationNav } from '../utils/notificationNav';

// Ensure a default notifications channel exists on Android
export async function ensureNotificationChannel() {
  await notifee.createChannel({
    id: 'default',
    name: 'General',
    importance: AndroidImportance.HIGH,
    lights: true,
    vibration: true,
  });
}

// Request notifications permission (Android 13+ and iOS)
export async function ensureNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

// Convert an FCM RemoteMessage to a displayed local notification via Notifee
export async function displayNotificationForRemoteMessage(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  opts?: { force?: boolean },
) {
  const pickString = (v: unknown, fallback = ''): string =>
    typeof v === 'string' ? v : fallback;

  const title = pickString(
    remoteMessage.notification?.title ?? remoteMessage.data?.title,
    'New message',
  );
  const body = pickString(
    remoteMessage.notification?.body ?? remoteMessage.data?.body,
    '',
  );

  // If the message already contains a notification and we're in background,
  // Android may auto-display it. Only force-show in foreground or when asked.
  const shouldDisplay = opts?.force || !remoteMessage.notification;
  if (!shouldDisplay) return;

  await ensureNotificationChannel();

  await notifee.displayNotification({
    title,
    body,
    data: remoteMessage.data,
    android: {
      channelId: 'default',
      smallIcon: 'ic_launcher',
      pressAction: { id: 'open-chat' },
      // Optional: group chat notifications later
      // groupId: remoteMessage.data?.chatId,
      // badge: true,
    },
    ios: {
      foregroundPresentationOptions: {
        alert: true,
        badge: true,
        sound: true,
      },
      sound: 'default',
    },
  });
}

// Optional: listen for Notifee foreground events to handle taps
notifee.onForegroundEvent(async ({ type, detail }) => {
  if (type !== EventType.PRESS) return;
  const data = (detail.notification?.data || {}) as any;
  const chatId = data.chatId;
  const senderId = data.senderId;
  const chatType = data.chatType; // 'dm' | 'group'
  const messageId = data.messageId;
  if (!shouldHandleNotificationNav(messageId)) return;
  try {
    // Route using payload without fetching Firestore
    if (chatId && navigationRef.isReady()) {
      if (chatType === 'group') {
        navigationRef.navigate('ChatViewGroup', { id: chatId });
        return;
      }
      if (chatType === 'dm' && senderId) {
        navigationRef.navigate('ChatView', { id: senderId });
        return;
      }
      if (senderId) navigationRef.navigate('ChatView', { id: senderId });
    } else if (senderId && navigationRef.isReady()) {
      navigationRef.navigate('ChatView', { id: senderId });
    }
  } catch (e) {
    // non-fatal
  }
});
