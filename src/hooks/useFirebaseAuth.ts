// hooks/useFirebaseAuth.ts
import { FirebaseAuthTypes, getAuth, onIdTokenChanged } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';
import { registerFcmToken, subscribeFcmTokenRefresh, unsubscribeFcmTokenRefresh } from '../services/fcm';

// Helper to normalize names
const normalizeName = (name?: string | null) => {
  if (!name) return null;
  const clean = name.replace(/\s+/g, ' ').trim();
  return clean.length ? clean : null;
};

// Single source of truth for display name, prefer Auth -> Google provider
const resolveDisplayName = (firebaseUser: FirebaseAuthTypes.User | null) => {
  if (!firebaseUser) return null;
  const fromAuth = normalizeName(firebaseUser.displayName);

  const googleProvider = firebaseUser.providerData.find(
    p => p.providerId === 'google.com',
  );

  const fromProvider = normalizeName(googleProvider?.displayName);

  return fromAuth ?? fromProvider ?? null;
};

export function useFirebaseAuth() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onIdTokenChanged(auth, async firebaseUser => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const displayName = resolveDisplayName(firebaseUser);

  const ref = firestore().collection('users').doc(firebaseUser.uid);
        const googleProvider = firebaseUser.providerData.find(
          p => p.providerId === 'google.com',
        );
        const existingDoc = await ref.get();
        if (!existingDoc.data()?.email) {
          await ref.set(
            {
              uid: firebaseUser.uid,
              phoneNumber: firebaseUser.phoneNumber ?? null,
              email: firebaseUser.email ?? null,
              displayName, // <- unified, normalized
              photoURL: googleProvider?.photoURL ?? null,
              providers: firebaseUser.providerData.map(p => p.providerId),
              searchablePhones: firebaseUser.phoneNumber
                ? [firebaseUser.phoneNumber]
                : [],
              updatedAt: firestore.FieldValue.serverTimestamp(),
              createdAt: firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        } else {
          // Just update metadata fields like `updatedAt`, providers etc., not user content
          await ref.set(
            {
              providers: firebaseUser.providerData.map(p => p.providerId),
              updatedAt: firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }

        // Move FCM registration here so it always runs when auth is ready
        const uid = firebaseUser.uid;
        await registerFcmToken(uid);
        subscribeFcmTokenRefresh(uid);
      } else {
        // User signed out – stop token refresh updates
        unsubscribeFcmTokenRefresh();
      }

      if (initializing) setInitializing(false);
    });

    return () => {
      unsubscribe();
      // Cleanup any token refresh listener on unmount
      unsubscribeFcmTokenRefresh();
    };
  }, [initializing]);

  return { user, initializing };
}
