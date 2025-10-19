// services/chat.ts

import auth from '@react-native-firebase/auth';
import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import type { ChatRow } from '../utils/chat';
import { uploadChatFile } from './media';

export type Chat = {
  id: string;
  memberIds: string[];
  memberHash: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  lastMessage?: string | null;
  lastMessageAt?: FirebaseFirestoreTypes.Timestamp | null;
  unread?: Record<string, number>;
  typing?: Record<string, boolean>;
};

// types: extend status to include "pending"
export type MessageDoc = {
  id: string;
  text?: string;

  // NEW: media / file variants
  type?: 'text' | 'image' | 'video' | 'audio' | 'file';
  url?: string; // downloadURL
  mime?: string;
  name?: string; // original filename
  size?: number; // bytes
  width?: number; // image/video
  height?: number; // image/video
  durationMs?: number; // video/audio
  thumbUrl?: string | null;

  senderId: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;

  // was: 'sent' | 'delivered' | 'read'
  status: 'pending' | 'sent' | 'delivered' | 'read';
  seenBy?: string[];
  deliveredTo?: string[];
  // New: per-user timestamp maps for delivery/read events
  deliveredAt?: Record<string, FirebaseFirestoreTypes.Timestamp>;
  readAt?: Record<string, FirebaseFirestoreTypes.Timestamp>;
  deletedFor?: string[]; // users who have deleted this message for themselves
};

const CHATS = firestore().collection('chats');
const PRESENCE = firestore().collection('presence');

function sortedHash(a: string, b: string) {
  const [x, y] = [a, b].sort();
  return { memberIds: [x, y], memberHash: `${x}_${y}` };
}

function normalizeOtherUid(otherUid: string): string {
  const me = auth().currentUser?.uid;
  if (!me) throw new Error('Not authenticated');
  if (!otherUid || otherUid === 'me' || otherUid === 'self') return me;
  return otherUid;
}

function sanitizeFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  Object.keys(obj).forEach(k => {
    const v = obj[k];
    if (v === undefined) return; // drop undefined
    if (typeof v === 'number' && Number.isNaN(v)) {
      out[k] = null;
      return;
    }
    out[k] = v;
  });
  return out as Partial<T>;
}

export async function ensureDMChat(otherUid: string): Promise<string> {
  const me = auth().currentUser?.uid;
  if (!me) throw new Error('Not authenticated');

  const other = normalizeOtherUid(otherUid);
  const { memberIds, memberHash } = sortedHash(me, other);

  // canonical exists?
  let q = await CHATS.where('memberHash', '==', memberHash).limit(1).get();
  if (!q.empty) return q.docs[0].id;

  // legacy exists? migrate it
  if (other === me) {
    const legacyHash = `${me}_me`;
    q = await CHATS.where('memberHash', '==', legacyHash).limit(1).get();
    if (!q.empty) {
      const ref = q.docs[0].ref;
      await ref.set(
        { memberIds: [me, me], memberHash: `${me}_${me}` },
        { merge: true },
      );
      return ref.id;
    }
  }

  // slow fallback
  const all = await CHATS.where('memberIds', 'array-contains', me).get();
  for (const doc of all.docs) {
    const h = (doc.data() as any)?.memberHash;
    if (h === memberHash) return doc.id;
    if (other === me && h === `${me}_me`) {
      await doc.ref.set(
        { memberIds: [me, me], memberHash: `${me}_${me}` },
        { merge: true },
      );
      return doc.id;
    }
  }

  // create
  const ref = await CHATS.add({
    memberIds,
    memberHash,
    createdAt: firestore.FieldValue.serverTimestamp(),
    unread: { [me]: 0, [other]: 0 },
    typing: { [me]: false, [other]: false },
  });
  return ref.id;
}

export async function findDMChat(otherUid: string): Promise<string | null> {
  const me = auth().currentUser?.uid;
  if (!me) throw new Error('Not authenticated');

  const other = normalizeOtherUid(otherUid);
  const { memberHash } = sortedHash(me, other);

  // canonical
  let q = await CHATS.where('memberHash', '==', memberHash).limit(1).get();
  if (!q.empty) return q.docs[0].id;

  // legacy: self chat stored as uid_me
  if (other === me) {
    const legacyHash = `${me}_me`;
    q = await CHATS.where('memberHash', '==', legacyHash).limit(1).get();
    if (!q.empty) return q.docs[0].id;
  }

  // slow fallback
  const all = await CHATS.where('memberIds', 'array-contains', me).get();
  for (const doc of all.docs) {
    const h = (doc.data() as any)?.memberHash;
    if (h === memberHash) return doc.id;
    if (other === me && h === `${me}_me`) return doc.id;
  }
  return null;
}

/** Subscribe to single chat metadata */
export function subscribeChat(chatId: string, onData: (chat: Chat) => void) {
  return CHATS.doc(chatId).onSnapshot(snap => {
    if (!snap.exists) return;
    onData({ id: snap.id, ...(snap.data() as any) });
  });
}

/** Subscribe to latest N messages in a chat */
export function subscribeMessages(
  chatId: string,
  onData: (msgs: MessageDoc[]) => void,
  pageSize = 50,
) {
  const me = auth().currentUser?.uid;
  if (!me) throw new Error('Not authenticated');

  return CHATS.doc(chatId)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(pageSize)
    .onSnapshot(async snap => {
      let msgs = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any),
      })) as MessageDoc[];

      // IMPORTANT: do not expose "pending" messages to other users.
      // Keep pending messages visible to the sender (me), but filter
      // them out for receivers until the upload completes and the
      // message status is updated to 'sent'.
      msgs = msgs.filter(m => !(m.senderId !== me && m.status === 'pending'));

      // Auto mark as delivered
      const batch = firestore().batch();
      let hasWrites = false;

      msgs.forEach(m => {
        if (m.senderId !== me && m.status === 'sent') {
          const ref = CHATS.doc(chatId).collection('messages').doc(m.id);
          // Use dot-path to set deliveredAt.<uid> server timestamp
          batch.update(ref, {
            status: 'delivered',
            deliveredTo: firestore.FieldValue.arrayUnion(me),
            [(`deliveredAt.${me}`) as any]: firestore.FieldValue.serverTimestamp(),
          } as any);
          hasWrites = true;
        }
      });

      if (hasWrites) await batch.commit();
      onData(msgs);
    });
}

/** Send a message */
export async function sendText(chatId: string, text: string) {
  const me = auth().currentUser?.uid;
  if (!me) throw new Error('Not authenticated');

  const msgRef = CHATS.doc(chatId).collection('messages').doc();
  const chatRef = CHATS.doc(chatId);

  await firestore().runTransaction(async tx => {
    const createdAt = firestore.FieldValue.serverTimestamp() as any;

    // Set the message
    tx.set(msgRef, {
      id: msgRef.id,
      text,
      senderId: me,
      createdAt,
      status: 'sent',
      seenBy: [me],
      deliveredTo: [],
      type: 'text',
    });

    // Get chat to find members
    const chatSnap = await tx.get(chatRef);
    const chat = chatSnap.exists() ? (chatSnap.data() as any) : {};
    const others = (chat.memberIds || []).filter((id: string) => id !== me);

    const unread: Record<string, number> = { ...(chat.unread || {}) };
    others.forEach((uid: string) => {
      unread[uid] = (unread[uid] || 0) + 1;
    });
    unread[me] = 0;
    // Set metadata updates
    tx.set(
      chatRef,
      {
        lastMessage: text,
        lastMessageAt: createdAt,
        unread
      },
      { merge: true },
    );
  });

  return msgRef.id;
}

// sendMediaInternal: write pending first, then upload, then patch to sent
async function sendMediaInternal(
  chatId: string,
  payload: {
    kind: 'image' | 'video' | 'audio' | 'file';
    localPath: string;
    mime?: string;
    name?: string;
    size?: number;
    width?: number;
    height?: number;
    durationMs?: number;
    lastMessageText?: string; // e.g., "[Photo]" "[Video]" …
  },
) {
  try {
    const me = auth().currentUser?.uid;
    if (!me) throw new Error('Not authenticated');

    const msgRef = CHATS.doc(chatId).collection('messages').doc();
    const chatRef = CHATS.doc(chatId);

    // 1) Fast path: write a "pending" message immediately + update chat meta
    await firestore().runTransaction(async tx => {
      const createdAt = firestore.FieldValue.serverTimestamp() as any;

      // Inside the transaction — step 1: create Firestore doc with localPath as `url`
      const pendingMessage = sanitizeFirestore({
        type: payload.kind,
        url: payload.localPath, // ✅ Show local media immediately
        mime: payload.mime,
        name: payload.name,
        size: payload.size,
        width: payload.width,
        height: payload.height,
        durationMs: payload.durationMs,

        text: '',
        senderId: me,
        createdAt,
        status: 'pending',
        seenBy: [me],
        deliveredTo: [],
      });

      tx.set(msgRef, pendingMessage);

      const chatSnap = await tx.get(chatRef);
      const chat = chatSnap.exists() ? (chatSnap.data() as any) : {};
      const others = (chat.memberIds || []).filter((id: string) => id !== me);

      const unread = { ...(chat.unread || {}) };
      others.forEach((uid: string) => (unread[uid] = (unread[uid] || 0) + 1));

      const lm =
        payload.lastMessageText ??
        (payload.kind === 'image'
          ? '[Photo]'
          : payload.kind === 'video'
          ? '[Video]'
          : payload.kind === 'audio'
          ? '[Audio]'
          : payload.name
          ? `[File] ${payload.name}`
          : '[File]');

      const chatUpdate = sanitizeFirestore({
        lastMessage: lm,
        lastMessageAt: createdAt,
        unread,
      });

      tx.set(chatRef, chatUpdate, { merge: true });
    });

    // 2) Upload to Storage (can take time)
    const uploaded = await uploadChatFile(chatId, {
      localPath: payload.localPath,
      mime: payload.mime,
      name: payload.name,
      size: payload.size,
      width: payload.width,
      height: payload.height,
      durationMs: payload.durationMs,
    });

    // 3) Patch the same message doc with storage fields + flip to "sent"
    const sentPatch = sanitizeFirestore({
      url: uploaded.url, // ✅ Overwrite local URI with cloud URL
      mime: uploaded.contentType ?? payload.mime,
      name: uploaded.name ?? payload.name,
      size: uploaded.size ?? payload.size,
      width: uploaded.width ?? payload.width,
      height: uploaded.height ?? payload.height,
      durationMs: uploaded.durationMs ?? payload.durationMs,
      status: 'sent',
    });

    await msgRef.set(sentPatch, { merge: true });

    return msgRef.id;
  } catch (error) {
    // Optional: consider marking a separate field like { uploadError: true }
    // while keeping status as 'pending' so the UI can expose a retry.
  }
}

/** Mark messages as read + reset unread counter */
export async function markChatRead(chatId: string) {
  const me = auth().currentUser?.uid;
  if (!me) throw new Error('Not authenticated');

  const chatRef = CHATS.doc(chatId);
  const msgsRef = chatRef.collection('messages');

  // 1) Fetch incoming messages (can't combine != with IN on another field).
  // Firestore requires orderBy on the same field when using '!='.
  const incomingSnap = await msgsRef
    .where('senderId', '!=', me)
    .orderBy('senderId')
    .get();

  // 2) Batch-update only those with status 'sent' or 'delivered'
  const batch = firestore().batch();
  incomingSnap.forEach(d => {
    const data = d.data() as any;
    if (data.status === 'sent' || data.status === 'delivered') {
      // Set read status, add me to seenBy, and record per-user read timestamp
      batch.update(d.ref, {
        status: 'read',
        seenBy: firestore.FieldValue.arrayUnion(me),
        [(`readAt.${me}`) as any]: firestore.FieldValue.serverTimestamp(),
      } as any);
    }
  });
  await batch.commit();

  // 3) Option A: read chat, compute the whole unread map, write it back
  await firestore().runTransaction(async tx => {
    const now = firestore.FieldValue.serverTimestamp() as any;

    const snap = await tx.get(chatRef);
    const chat = snap.exists() ? (snap.data() as any) : {};

    const unread: Record<string, number> = { ...(chat.unread || {}) };
    unread[me] = 0; // I’ve read everything in this chat
    tx.set(
      chatRef,
      {
        unread,                    // write the whole map (Option A)
        updatedAt: now,
        // optional but handy per-user read marker:
        lastReadAt: { ...(chat.lastReadAt || {}), [me]: now },
      },
      { merge: true },
    );
  });
}
/** Set typing state in chat doc */
export async function setTyping(chatId: string, isTyping: boolean) {
  const me = auth().currentUser?.uid;
  if (!me) return;

  await CHATS.doc(chatId).set({ typing: { [me]: isTyping } }, { merge: true });
}

/** Send presence heartbeat */
export async function heartbeatPresence(online: boolean) {
  const me = auth().currentUser?.uid;
  if (!me) return;

  await PRESENCE.doc(me).set(
    {
      online,
      lastActive: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/** Subscribe to a user's presence */
export function subscribePresence(
  uid: string,
  onUpdate: (isOnline: boolean, lastActive?: Date) => void,
  thresholdSec = 60,
) {
  return firestore()
    .collection('presence')
    .doc(uid)
    .onSnapshot(snap => {
      const data = snap.exists() ? (snap.data() as any) : undefined;
      const ts = data?.lastActive;
      const lastActive =
        ts && typeof ts.toDate === 'function' ? ts.toDate() : undefined;

      const fresh =
        lastActive && (Date.now() - lastActive.getTime()) / 1000 < thresholdSec;

      onUpdate(!!data?.online && !!fresh, lastActive);
    });
}

/** Get chatId for self-chat (if it exists). Returns null if not found. */
export async function getSelfChatId(): Promise<string | null> {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  return await findDMChat(uid); // may return null
}

/** Fetch metadata of self-chat. Throws if chat doesn't exist. */
export async function getSelfChatMeta(): Promise<{
  chatId: string;
  lastMessage: string;
  lastMessageAt: FirebaseFirestoreTypes.Timestamp | null;
  unread: Record<string, number>;
}> {
  const chatId = await getSelfChatId();
  if (!chatId) throw new Error('Self chat does not exist');

  const chatSnap = await CHATS.doc(chatId).get();
  if (!chatSnap.exists) throw new Error('Self chat document not found');

  const data = chatSnap.data()!;
  return {
    chatId,
    lastMessage: data.lastMessage ?? '',
    lastMessageAt: data.lastMessageAt ?? null,
    unread: data.unread ?? {},
  };
}

export async function sendImage(
  chatId: string,
  args: {
    localPath: string;
    mime?: string;
    width?: number;
    height?: number;
    size?: number;
  },
) {
  try {
    return sendMediaInternal(chatId, {
      kind: 'image',
      localPath: args.localPath,
      mime: args.mime,
      width: args.width,
      height: args.height,
      size: args.size,
      lastMessageText: '[Photo]',
    });
  } catch (error) {
    // Handle image send error silently
  }
}

export async function sendVideo(
  chatId: string,
  args: {
    localPath: string;
    mime?: string;
    width?: number;
    height?: number;
    size?: number;
    durationMs?: number;
  },
) {
  try {
    return sendMediaInternal(chatId, {
      kind: 'video',
      localPath: args.localPath,
      mime: args.mime,
      width: args.width,
      height: args.height,
      size: args.size,
      durationMs: Number.isFinite(args.durationMs)
        ? args.durationMs
        : undefined,
      lastMessageText: '[Video]',
    });
  } catch (error) {
    // Handle video send error silently
  }
}

export async function sendAudio(
  chatId: string,
  args: {
    localPath: string;
    mime?: string;
    size?: number;
    durationMs?: number;
    name?: string;
  },
) {
  return sendMediaInternal(chatId, {
    kind: 'audio',
    localPath: args.localPath,
    mime: args.mime ?? 'audio/mpeg',
    size: args.size,
    durationMs: args.durationMs,
    lastMessageText: '[Audio]',
    name: args.name,
  });
}

export async function sendFile(
  chatId: string,
  args: {
    localPath: string;
    mime?: string;
    size?: number;
    name?: string;
  },
) {
  return sendMediaInternal(chatId, {
    kind: 'file',
    localPath: args.localPath,
    mime: args.mime,
    size: args.size,
    lastMessageText: args.name ? `[File] ${args.name}` : '[File]',
    name: args.name,
  });
}

export function subscribeMyChats(
  onRows: (rows: ChatRow[]) => void,
  limitCount = 100,
) {
  const me = auth().currentUser?.uid;
  if (!me) throw new Error('Not authenticated');

  return (
    firestore()
      .collection('chats')
      .where('memberIds', 'array-contains', me)
      // .orderBy('lastMessageAt', 'desc') // enable after creating index
      .limit(limitCount)
      .onSnapshot(async snap => {
        const rows: ChatRow[] = [];

        for (const d of snap.docs) {
          const c = d.data() as any;
          const memberIds: string[] = Array.isArray(c.memberIds)
            ? c.memberIds
            : [];
          const unique = [...new Set(memberIds)];

          const isSelfChat =
            (unique.length === 1 && unique[0] === me) ||
            c.memberHash === `${me}_${me}` ||
            c.memberHash === `${me}_me`;
          if (isSelfChat) continue;

          const others = unique.filter(u => u !== me);
          const otherUid = others[0]; // DM only

          let name = c.title || 'Chat';
          let avatar: string | undefined;

          if (!c.title && otherUid) {
            try {
              const userSnap = await firestore()
                .collection('users')
                .doc(otherUid)
                .get();
              if (userSnap.exists()) {
                const user = userSnap.data() as any;
                name =
                  user?.displayName ??
                  user?.username ??
                  user?.phoneNumber ??
                  'Chat';
                avatar = user?.photoURL;
              }
            } catch (e) {
              // Failed to fetch user doc, using fallback values
            }
          }

          rows.push({
            id: otherUid, // using UID for ChatView navigation (DMs)
            name,
            avatar,
            lastMessage: c.lastMessage ?? '',
            date:
              c.lastMessageAt?.toDate?.()?.toISOString?.() ??
              c.createdAt?.toDate?.()?.toISOString?.() ??
              new Date().toISOString(),
            unreadCount: (c.unread && c.unread[me]) || 0,
            pinned: !!c.pinned,
            online: false,
          });
        }

        onRows(rows);
      })
  );
}

/** Delete a message from chat and remove associated files */
export async function deleteMessage(
  chatId: string,
  messageId: string,
  deleteForEveryone: boolean = false
) {
  const me = auth().currentUser?.uid;
  if (!me) throw new Error('Not authenticated');

  const msgRef = CHATS.doc(chatId).collection('messages').doc(messageId);
  const chatRef = CHATS.doc(chatId);

  // First get the message to check ownership and get file URLs
  const msgSnap = await msgRef.get();
  if (!msgSnap.exists) {
    throw new Error('Message not found');
  }

  const message = msgSnap.data() as MessageDoc;
  console.log('Deleting message:', { messageId, deleteForEveryone, messageType: message.type });

  // Check permissions before starting transaction
  if (!deleteForEveryone && message.senderId !== me) {
    throw new Error('You can only delete your own messages');
  }

  if (deleteForEveryone && message.senderId !== me) {
    throw new Error('Only the sender can delete for everyone');
  }

  // Run the database transaction
  await firestore().runTransaction(async tx => {
    if (deleteForEveryone) {
      // Delete the message document entirely
      tx.delete(msgRef);

      // Update chat last message if this was the last message
      const chatSnap = await tx.get(chatRef);
      if (chatSnap.exists()) {
        const chatData = chatSnap.data() as Chat;
        if (chatData.lastMessage === message.text || 
            (message.type !== 'text' && chatData.lastMessage?.startsWith('['))) {
          // Find the previous message to update last message
          // This is a simplified approach - in production you might want to 
          // query for the next most recent message
          tx.update(chatRef, {
            lastMessage: 'Message deleted',
            lastMessageAt: firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    } else {
      // "Delete for me" - mark as deleted for this user only
      const deletedFor = message.deletedFor || [];
      if (!deletedFor.includes(me)) {
        tx.update(msgRef, {
          deletedFor: firestore.FieldValue.arrayUnion(me),
        });
      }
    }
  });

  // Delete associated files from Firebase Storage after transaction completes
  if (deleteForEveryone && message.url && message.type !== 'text') {
    try {
      await _deleteMessageFiles(message);
      console.log('Successfully deleted message files from storage');
    } catch (error) {
      console.warn('Failed to delete message files from storage:', error);
      // Don't throw error as the message deletion succeeded
    }
  }

  console.log('Message deletion completed successfully');
}

/** Delete multiple messages from chat and remove associated files */
export async function batchDeleteMessages(
  chatId: string,
  messageIds: string[],
  deleteForEveryone: boolean = false
) {
  const me = auth().currentUser?.uid;
  if (!me) throw new Error('Not authenticated');

  if (messageIds.length === 0) return;

  const chatRef = CHATS.doc(chatId);
  const messagesToDelete: MessageDoc[] = [];
  
  // First get all messages to check ownership and get file URLs
  for (const messageId of messageIds) {
    const msgRef = CHATS.doc(chatId).collection('messages').doc(messageId);
    const msgSnap = await msgRef.get();
    
    if (msgSnap.exists()) {
      const message = msgSnap.data() as MessageDoc;
      
      // Check permissions
      if (deleteForEveryone && message.senderId !== me) {
        throw new Error(`You can only delete your own messages for everyone (message: ${messageId})`);
      }
      
      messagesToDelete.push({ ...message, id: messageId });
    }
  }

  console.log('Batch deleting messages:', { messageIds, deleteForEveryone, count: messagesToDelete.length });

  // Run the database transaction for all messages
  await firestore().runTransaction(async (tx) => {
    for (const message of messagesToDelete) {
      const msgRef = CHATS.doc(chatId).collection('messages').doc(message.id);
      
      if (deleteForEveryone) {
        // Delete the message document entirely
        tx.delete(msgRef);
      } else {
        // "Delete for me" - mark as deleted for this user only
        const deletedFor = message.deletedFor || [];
        if (!deletedFor.includes(me)) {
          tx.update(msgRef, {
            deletedFor: firestore.FieldValue.arrayUnion(me),
          });
        }
      }
    }
    
    // Update chat metadata if deleting for everyone
    if (deleteForEveryone && messagesToDelete.length > 0) {
      const chatSnap = await tx.get(chatRef);
      if (chatSnap.exists()) {
        tx.update(chatRef, {
          lastMessage: 'Messages deleted',
          lastMessageAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  });

  // Delete associated files from Firebase Storage after transaction completes
  if (deleteForEveryone) {
    for (const message of messagesToDelete) {
      if (message.url && message.type !== 'text') {
        try {
          await _deleteMessageFiles(message);
          console.log('Successfully deleted files for message:', message.id);
        } catch (error) {
          console.warn('Failed to delete files for message:', message.id, error);
        }
      }
    }
  }

  console.log('Batch message deletion completed successfully');
}

// Helper function to delete files from Firebase Storage
async function _deleteMessageFiles(message: MessageDoc) {
  try {
    if (message.url) {
      // Import Firebase Storage
      const storage = (await import('@react-native-firebase/storage')).default;
      
      // Extract file path from URL and delete
      const fileRef = storage().refFromURL(message.url);
      await fileRef.delete();
    }

    if (message.thumbUrl) {
      const storage = (await import('@react-native-firebase/storage')).default;
      const thumbRef = storage().refFromURL(message.thumbUrl);
      await thumbRef.delete();
    }
  } catch (error) {
    console.warn('Failed to delete message files from storage:', error);
    // Don't throw error as message deletion should still succeed
  }
}
