// services/fcm.ts
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

const INSTALLATION_ID_KEY = 'app.installationId';
const lastTokenKey = (installationId: string) => `fcm.lastToken.${installationId}`;

async function getInstallationId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
    if (existing) return existing;
  } catch {}
  // Lightweight random ID; stable across app restarts (stored in AsyncStorage)
  const rand = Math.random().toString(36).slice(2);
  const id = `ins_${Date.now().toString(36)}_${rand}`;
  try { await AsyncStorage.setItem(INSTALLATION_ID_KEY, id); } catch {}
  return id;
}

export async function ensureFcmPermission(): Promise<boolean> {
  // iOS: request APNS notification permission via Firebase Messaging
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  // Android: use Notifee to request POST_NOTIFICATIONS on Android 13+
  try {
    const settings = await notifee.requestPermission();
    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    // Fallback: allow proceeding; token retrieval may still work pre-13
    return true;
  }
}

export async function registerFcmToken(uid: string): Promise<string | null> {
  const permissionOk = await ensureFcmPermission();
  if (!permissionOk) return null;

  // iOS: required if you disabled auto-registration or see the getToken error
  // It's harmless to call on Android; only does work on iOS. :contentReference[oaicite:2]{index=2}
  try { await messaging().registerDeviceForRemoteMessages(); } catch {}

  const token = await messaging().getToken(); // unique per app installation
  const apnsToken = Platform.OS === 'ios' ? await messaging().getAPNSToken() : null; // iOS only :contentReference[oaicite:4]{index=4}

  // Store per-installation so token rotations don't create new device docs
  const installationId = await getInstallationId();
  const ref = firestore()
    .collection('users')
    .doc(uid)
    .collection('devices')
    .doc(installationId);

  // Read last stored token to avoid redundant writes
  const lastToken = await AsyncStorage.getItem(lastTokenKey(installationId));

  // Ensure doc existence or update only when token changed
  const snap = await ref.get();
  const isNewDoc = !snap.exists;

  if (isNewDoc || lastToken !== token) {
    await ref.set(
      {
        installationId,
        token,
        platform: Platform.OS,
        apnsToken: apnsToken ?? null,
        updatedAt: firestore.FieldValue.serverTimestamp(),
        ...(isNewDoc ? { createdAt: firestore.FieldValue.serverTimestamp() } : {}),
      },
      { merge: true }
    );
    try { await AsyncStorage.setItem(lastTokenKey(installationId), token); } catch {}
  }

  // Cleanup: if a legacy doc exists with id == token, remove it to avoid duplicates
  try {
    const legacyRef = firestore()
      .collection('users')
      .doc(uid)
      .collection('devices')
      .doc(token);
    const legacySnap = await legacyRef.get();
    if (legacySnap.exists() && legacyRef.id !== installationId) {
      await legacyRef.delete();
    }
  } catch {}

  return token;
}

let tokenRefreshUnsub: (() => void) | null = null;

export function subscribeFcmTokenRefresh(uid: string) {
  // Keep user/devices/{token} up to date when FCM rotates tokens. :contentReference[oaicite:6]{index=6}
  if (tokenRefreshUnsub) tokenRefreshUnsub();
  tokenRefreshUnsub = messaging().onTokenRefresh(async (newToken) => {
    const apnsToken = Platform.OS === 'ios' ? await messaging().getAPNSToken() : null;
    const installationId = await getInstallationId();
    await firestore()
      .collection('users')
      .doc(uid)
      .collection('devices')
      .doc(installationId)
      .set(
        {
          installationId,
          token: newToken,
          platform: Platform.OS,
          apnsToken: apnsToken ?? null,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  });
}

export function unsubscribeFcmTokenRefresh() {
  if (tokenRefreshUnsub) {
    tokenRefreshUnsub();
    tokenRefreshUnsub = null;
  }
}
