"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMessageUpdate = exports.onMessageCreate = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions")); // used only for functions.config()
const firestore_1 = require("firebase-functions/v2/firestore");
admin.initializeApp();
const db = admin.firestore();
console.log('Functions cold start', {
    projectId: admin.app().options?.projectId || process.env.GCLOUD_PROJECT,
});
async function getUserDisplayName(uid) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        const data = doc.data();
        return data?.displayName || null;
    }
    catch {
        return null;
    }
}
// Helper to fetch device tokens for a user
async function getUserDeviceTokens(uid) {
    const devicesSnap = await db
        .collection('users')
        .doc(uid)
        .collection('devices')
        .get();
    const tokens = new Set();
    devicesSnap.forEach((d) => {
        const t = d.data()?.token;
        if (typeof t === 'string' && t)
            tokens.add(t);
    });
    return [...tokens];
}
// Send notifications helper
async function sendNotificationToRecipients(opts) {
    const { chatId, messageId, senderId, messageType, messageText, recipients, chatType } = opts;
    const senderName = (await getUserDisplayName(senderId)) || 'New message';
    // Use a single, consistent message body for all message types
    const body = 'You received a new message';
    const dataPayload = {
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
    if (!tokens.length)
        return;
    const chunk = (arr, size) => arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);
    const batches = chunk(tokens, 500);
    // Helper to cleanup invalid tokens
    const cleanupInvalidTokens = async (batchTokens, responses) => {
        const removals = [];
        responses.forEach((resp, idx) => {
            const error = resp?.error;
            if (!error)
                return;
            const code = error.code;
            if (code === 'messaging/invalid-registration-token' ||
                code === 'messaging/registration-token-not-registered') {
                const badToken = batchTokens[idx];
                recipients.forEach((uid) => {
                    const q = db
                        .collection('users')
                        .doc(uid)
                        .collection('devices')
                        .where('token', '==', badToken)
                        .get()
                        .then((qs) => Promise.all(qs.docs.map((d) => d.ref.delete())));
                    removals.push(q);
                });
            }
        });
        await Promise.all(removals);
    };
    await Promise.all(batches.map(async (batchTokens) => {
        // Modern v1 API call
        try {
            const multicast = {
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
                        },
                    },
                },
            };
            const res = await admin.messaging().sendEachForMulticast(multicast);
            console.log('sendEachForMulticast:batchResult', { successCount: res.successCount, failureCount: res.failureCount });
            await cleanupInvalidTokens(batchTokens, res.responses);
            return;
        }
        catch (e) {
            const msg = String(e?.message || e);
            const is404 = msg.includes('Status code: 404') || msg.includes('Not Found');
            if (!is404)
                throw e;
            const legacyKey = functions.config?.()?.fcm?.legacy_key || process.env.FCM_LEGACY_KEY;
            if (!legacyKey) {
                console.error('FCM v1 404 and no legacy key set (functions config fcm.legacy_key or env FCM_LEGACY_KEY)');
                throw e;
            }
            // Fallback to legacy API (best-effort)
            console.warn('FCM v1 returned 404 — falling back to legacy API for this batch');
            const f = globalThis.fetch;
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
            };
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
    }));
}
// Firestore trigger for new messages (text or already-sent)
exports.onMessageCreate = (0, firestore_1.onDocumentCreated)({
    document: 'chats/{chatId}/messages/{messageId}',
    region: 'asia-south1',
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const message = snap.data();
    const chatId = event.params.chatId;
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
    const chat = chatSnap.data();
    const members = chat.memberIds || [];
    const recipients = members.filter((uid) => uid !== message.senderId);
    const isGroup = !!(chat?.type === 'group' || members.length > 2);
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
exports.onMessageUpdate = (0, firestore_1.onDocumentUpdated)({
    document: 'chats/{chatId}/messages/{messageId}',
    region: 'asia-south1',
}, async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    const chatId = event.params.chatId;
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
    const chat = chatSnap.data();
    const members = chat.memberIds || [];
    const recipients = members.filter((uid) => uid !== after.senderId);
    const isGroup = !!(chat?.type === 'group' || members.length > 2);
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
