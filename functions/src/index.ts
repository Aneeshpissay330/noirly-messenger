import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions'; // used only for functions.config()
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';

admin.initializeApp();
const db = admin.firestore();
console.log('Functions cold start', {
  projectId: (admin.app().options as any)?.projectId || process.env.GCLOUD_PROJECT,
});

type Chat = {
  memberIds: string[];
  lastMessage?: string | null;
};

async function getUserDisplayName(uid: string): Promise<string | null> {
  try {
    const doc = await db.collection('users').doc(uid).get();
    const data = doc.data() as any;
    return (data?.displayName as string) || null;
  } catch {
    return null;
  }
}

// Helper to fetch device tokens for a user
async function getUserDeviceTokens(uid: string): Promise<string[]> {
  const devicesSnap = await db
    .collection('users')
    .doc(uid)
    .collection('devices')
    .get();
  const tokens = new Set<string>();
  devicesSnap.forEach((d: admin.firestore.QueryDocumentSnapshot) => {
    const t = (d.data() as any)?.token;
    if (typeof t === 'string' && t) tokens.add(t);
  });
  return [...tokens];
}

// Send notifications helper
async function sendNotificationToRecipients(opts: {
  chatId: string;
  messageId: string;
  senderId: string;
  messageType: string;
  messageText?: string;
  recipients: string[];
  chatType: 'dm' | 'group';
}) {
  const { chatId, messageId, senderId, messageType, recipients, chatType } = opts;
  // const messageText = opts.messageText; // unused in current implementation

  const senderName = (await getUserDisplayName(senderId)) || 'New message';
  // Use a single, consistent message body for all message types
  const body = 'You received a new message';

  const dataPayload: Record<string, string> = {
    chatId,
    messageId,
    type: messageType || 'text',
    senderId,
    chatType,
  };

  console.log('sendNotificationToRecipients:start', { chatId, messageId, senderId, messageType, recipientsCount: recipients.length });
  const tokenSets = await Promise.all(recipients.map(getUserDeviceTokens));
  const tokens = [...new Set(tokenSets.flat())];
  console.log('sendNotificationToRecipients:tokens', { tokenCount: tokens.length });
  if (!tokens.length) return;

  const chunk = <T,>(arr: T[], size: number) =>
    arr.reduce<T[][]>((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);

  const batches = chunk(tokens, 500);
  // Helper to cleanup invalid tokens
  const cleanupInvalidTokens = async (batchTokens: string[], responses: Array<{ error?: admin.FirebaseError }>) => {
    const removals: Promise<any>[] = [];
    responses.forEach((resp, idx) => {
      const error = resp?.error as admin.FirebaseError | undefined;
      if (!error) return;
      const code = error.code;
      if (
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/registration-token-not-registered'
      ) {
        const badToken = batchTokens[idx];
        recipients.forEach((uid) => {
          const q = db
            .collection('users')
            .doc(uid)
            .collection('devices')
            .where('token', '==', badToken)
            .get()
            .then((qs: admin.firestore.QuerySnapshot) =>
              Promise.all(qs.docs.map((d: admin.firestore.QueryDocumentSnapshot) => d.ref.delete()))
            );
          removals.push(q);
        });
      }
    });
    await Promise.all(removals);
  };

  await Promise.all(
    batches.map(async (batchTokens) => {
      // Modern v1 API call
      try {
        const multicast: admin.messaging.MulticastMessage = {
          tokens: batchTokens,
          notification: { title: senderName, body },
          data: dataPayload,
          android: {
            priority: 'high',
            notification: {
              // Ensure notifications don't overwrite each other when delivered in a burst while offline
              tag: messageId,
              channelId: 'default',
            },
          },
          apns: {
            headers: {
              'apns-priority': '10',
              // Make collapse-id unique per message so iOS doesn't replace earlier notifications
              'apns-collapse-id': messageId,
            },
            payload: {
              aps: {
                // Group by chat thread in Notification Center without collapsing
                'thread-id': chatId,
              } as any,
            },
          },
        };
        const res = await admin.messaging().sendEachForMulticast(multicast);
        console.log('sendEachForMulticast:batchResult', { successCount: res.successCount, failureCount: res.failureCount });
        await cleanupInvalidTokens(batchTokens, res.responses as any);
        return;
      } catch (e: any) {
        const msg = String(e?.message || e);
        const is404 = msg.includes('Status code: 404') || msg.includes('Not Found');
        if (!is404) throw e;
        const legacyKey = ((functions.config?.() as any)?.fcm?.legacy_key as string | undefined) || process.env.FCM_LEGACY_KEY;
        if (!legacyKey) {
          console.error('FCM v1 404 and no legacy key set (functions config fcm.legacy_key or env FCM_LEGACY_KEY)');
          throw e;
        }
        // Fallback to legacy API (best-effort)
        console.warn('FCM v1 returned 404 — falling back to legacy API for this batch');
        const f: any = (globalThis as any).fetch;
        if (!f) {
          console.error('fetch API not available in runtime for legacy fallback');
          throw e;
        }
        const legacyPayload = {
          registration_ids: batchTokens,
          // Unique collapse_key per message prevents FCM from collapsing queued notifications
          collapse_key: messageId,
          notification: {
            title: senderName,
            body,
            // Android-specific fields in legacy API
            tag: messageId,
            android_channel_id: 'default',
          },
          data: dataPayload,
          priority: 'high',
        } as any;
        const resp = await f('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${legacyKey}`,
          },
          body: JSON.stringify(legacyPayload),
        });
        if (!resp.ok) {
          const text = await resp.text();
          console.error('Legacy FCM send failed', { status: resp.status, text });
          throw new Error(`Legacy FCM failed: ${resp.status}`);
        }
        const json = await resp.json();
        console.log('Legacy send:batchResult', json);
      }
    })
  );
}

// Firestore trigger for new messages (text or already-sent)
export const onMessageCreate = onDocumentCreated({
  document: 'chats/{chatId}/messages/{messageId}',
  region: 'asia-south1',
}, async (event) => {
  const snap = event.data;
  if (!snap) return;
  const message = snap.data() as any;
  const chatId = event.params.chatId as string;

  if (!message || !message.senderId) {
    console.log('onMessageCreate:skip:missing message or senderId', { chatId, messageId: snap.id });
    return;
  }
  // Skip pending media (notify later on status update)
  if (message.status === 'pending') {
    console.log('onMessageCreate:skip:pending message', { chatId, messageId: snap.id, type: message.type });
    return;
  }

  const chatSnap = await db.collection('chats').doc(chatId).get();
  if (!chatSnap.exists) {
    console.log('onMessageCreate:skip:chat not found', { chatId });
    return;
  }
  const chat = chatSnap.data() as Chat;
  const members = chat.memberIds || [];
  const recipients = members.filter((uid) => uid !== message.senderId);
  const isGroup = !!((chat as any)?.type === 'group' || members.length > 2);
  if (!recipients.length) {
    console.log('onMessageCreate:skip:no recipients', { chatId, membersCount: members.length });
    return;
  }

  await sendNotificationToRecipients({
    chatId,
    messageId: snap.id,
    senderId: message.senderId,
    messageType: message.type || 'text',
    messageText: message.text,
    recipients,
    chatType: isGroup ? 'group' : 'dm',
  });
});

// Firestore trigger for message updates: notify when pending -> sent (e.g., media upload finished)
export const onMessageUpdate = onDocumentUpdated({
  document: 'chats/{chatId}/messages/{messageId}',
  region: 'asia-south1',
}, async (event) => {
  const before = event.data?.before?.data() as any;
  const after = event.data?.after?.data() as any;
  const chatId = event.params.chatId as string;

  if (!after || !after.senderId) {
    console.log('onMessageUpdate:skip:missing after or senderId', { chatId, messageId: event.params.messageId });
    return;
  }
  const transitionedToSent = before?.status === 'pending' && after?.status === 'sent';
  if (!transitionedToSent) {
    console.log('onMessageUpdate:skip:not pending->sent', { chatId, messageId: event.params.messageId, beforeStatus: before?.status, afterStatus: after?.status });
    return;
  }

  const chatSnap = await db.collection('chats').doc(chatId).get();
  if (!chatSnap.exists) {
    console.log('onMessageUpdate:skip:chat not found', { chatId });
    return;
  }
  const chat = chatSnap.data() as Chat;
  const members = chat.memberIds || [];
  const recipients = members.filter((uid) => uid !== after.senderId);
  const isGroup = !!((chat as any)?.type === 'group' || members.length > 2);
  if (!recipients.length) {
    console.log('onMessageUpdate:skip:no recipients', { chatId, membersCount: members.length });
    return;
  }

  await sendNotificationToRecipients({
    chatId,
    messageId: event.params.messageId,
    senderId: after.senderId,
    messageType: after.type || 'file',
    messageText: after.text,
    recipients,
    chatType: isGroup ? 'group' : 'dm',
  });
});
