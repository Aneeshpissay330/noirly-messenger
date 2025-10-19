import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Platform } from 'react-native';
import type { RootState } from '../../app/store';
import {
  batchDeleteMessages,
  deleteMessage,
  ensureDMChat,
  markChatRead,
  sendAudio,
  sendFile,
  sendImage,
  sendText,
  sendVideo,
  setTyping,
  subscribeMessages,
  subscribePresence,
} from '../../services/chat';
import { Message } from '../../types/chat';
import { formatLastSeen } from '../../utils/date';
import { downloadFileToCache } from '../../utils/download'; // <- new import

type ChatState = {
  chatId?: string;
  messages: Message[];
  presenceText: string;
  status: 'idle' | 'loading' | 'ready' | 'failed';
  error?: string | null;
  // Local-only starred message ids for this conversation
  starredIds?: string[];
};

type MessagesState = {
  byOtherUid: Record<string, ChatState>;
};

const initialState: MessagesState = { byOtherUid: {} };

const unsubMap: Record<string, { msgs?: () => void; presence?: () => void }> =
  {};

export const openDmChat = createAsyncThunk<
  { otherUid: string; chatId: string },
  { otherUid: string }
>('messages/openDmChat', async ({ otherUid }) => {
  const chatId = await ensureDMChat(otherUid);
  return { otherUid, chatId };
});

export const startSubscriptions = createAsyncThunk<
  void,
  { otherUid: string; chatId: string; isSelf: boolean }
>(
  'messages/startSubscriptions',
  async ({ otherUid, chatId, isSelf }, thunkApi) => {
    // cleanup previous subscriptions
    try {
      unsubMap[otherUid]?.msgs?.();
      unsubMap[otherUid]?.presence?.();
    } catch (e) {
      // ignore cleanup errors
    }

    unsubMap[otherUid] = {};

    // ...existing code...
    unsubMap[otherUid].msgs = subscribeMessages(chatId, docs => {
      // helpers for URL detection (leave these as-is)
      const isRemoteUrl = (u?: string) =>
        typeof u === 'string' && /^https?:\/\//i.test(u);

      // Treat file:// coming from Firestore as NOT-local for remote users
      // (don't expose into Redux). However, for the local user (isSelf)
      // we should treat file:// as local so the sender sees their own image
      // immediately. Consider content://, data:, file:// (when isSelf),
      // or absolute paths (starting with /) as local.
      const isLocalPath = (u?: string, senderId?: string) =>
        typeof u === 'string' &&
        (u.startsWith('content://') ||
          u.startsWith('data:') ||
          // treat file:// as local when this subscription belongs to the sender
          // or when the message sender is not the `otherUid` (i.e. it's from
          // the current user in a DM). This makes the behavior robust if
          // `isSelf` isn't reliably passed.
          ((isSelf || (senderId && senderId !== otherUid)) && u.startsWith('file://')) ||
          // absolute paths like /storage/emulated/...
          /^\//.test(u));

      // --- NEW: grab any existing messages from Redux for this otherUid ---
      const state = thunkApi.getState() as RootState;
      const reduxMessages = state.messages.byOtherUid[otherUid]?.messages ?? [];
      // build a quick lookup: messageId -> localPath
      const reduxLocalMap: Record<string, string | undefined> = {};
      for (const rm of reduxMessages) {
        if (rm.localPath) reduxLocalMap[rm.id] = rm.localPath;
      }

      // Map firestore docs -> internal Message shape
      // Helper: normalize local filesystem paths into explicit URI form
      const normalizeLocalUri = (p?: string) => {
        if (!p) return p;
        // leave explicit schemes as-is
        if (p.startsWith('file://') || p.startsWith('content://') || p.startsWith('data:')) return p;
        // absolute paths on Android should be prefixed with file:// for RN components
        if (p.startsWith('/') && Platform.OS === 'android') return `file://${p}`;
        // otherwise return as-is
        return p;
      };

      const mapped = docs.map(d => {
        const rawUrl = typeof d.url === 'string' ? d.url : undefined;

        // if Redux already has localPath for this message id, use that and never attempt download
        const reduxLocal = reduxLocalMap[d.id];

        // only treat as local if reduxLocal exists OR url matches content://, data:, or absolute path
  const alreadyLocal = !!reduxLocal || isLocalPath(rawUrl, d.senderId);
        // if alreadyLocal is true we will prefer reduxLocal (if present) else rawUrl
        const chosenLocalPathRaw =
          reduxLocal ?? (alreadyLocal ? rawUrl : undefined);
        const chosenLocalPath = normalizeLocalUri(chosenLocalPathRaw);

  // Only mark for download if:
  // - we do not have a local path (redux or local url)
  // - AND the stored url looks like a remote HTTP(S) URL
  const needsDownload = !chosenLocalPath && isRemoteUrl(rawUrl);

  // Expose remote HTTP(S) URLs for immediate preview only for images/videos.
  // For document/file types we avoid exposing remote URLs in Redux so the
  // background downloader (below) can fetch and populate `localPath`.
  const isDocLike = (m?: string) =>
    !m ? false : !(m.startsWith('image/') || m.startsWith('video/') || m.startsWith('audio/'));
  const exposeRemoteForPreview = isRemoteUrl(rawUrl) && (d.type === 'image' || d.type === 'video');
  const urlToStore = chosenLocalPath ?? (exposeRemoteForPreview ? rawUrl : undefined);

        // Background downloader: proactively download audio and document/file
        // attachments for receivers so the UI can open them via native viewers.
        // Images/videos are shown via remote preview and are not background-downloaded.
        const shouldBackgroundDownload =
          needsDownload && (d.type === 'audio' || d.type === 'file' || isDocLike(d.mime));
        const remoteUrl = shouldBackgroundDownload ? rawUrl : undefined;

        // Convert timestamp maps to ISO strings if present
        const deliveredAtIso: Record<string, string> | undefined = d.deliveredAt
          ? Object.fromEntries(
              Object.entries(d.deliveredAt as any).map(([k, v]: any) => [
                k,
                typeof v?.toDate === 'function'
                  ? v.toDate().toISOString()
                  : undefined,
              ]).filter(([, v]) => !!v)
            )
          : undefined;
        const readAtIso: Record<string, string> | undefined = d.readAt
          ? Object.fromEntries(
              Object.entries(d.readAt as any).map(([k, v]: any) => [
                k,
                typeof v?.toDate === 'function'
                  ? v.toDate().toISOString()
                  : undefined,
              ]).filter(([, v]) => !!v)
            )
          : undefined;

        return {
          id: d.id,
          text: d.text,
          createdAt: d.createdAt.toDate().toISOString(),
          userId: d.senderId, // maintain compatibility
          senderId: d.senderId, // include Firestore field
          type: d.type,
          url: urlToStore,
          // prefer reduxLocal if present, otherwise set localPath only when rawUrl was local
          localPath: chosenLocalPath ? chosenLocalPath : undefined,
          // keep remoteUrl for the downloader; UI/Redux won't expose remote http(s) urls until downloaded
          remoteUrl,
          // If we already have local path, mark 'idle'; else 'pending' only if remote
          downloadStatus: chosenLocalPath
            ? 'idle'
            : shouldBackgroundDownload
            ? 'pending'
            : 'idle',
          width: d.width,
          height: d.height,
          size: d.size,
          name: d.name,
          mime: d.mime,
          deliveredAt: deliveredAtIso,
          readAt: readAtIso,
        } as any;
      });

      // Immediately dispatch so UI can render messages and per-message loaders
      thunkApi.dispatch(setMessages({ otherUid, messages: mapped }));
      // Debug: print mapping for receivers to help explain missing localPath
      try {
        // eslint-disable-next-line no-console
        console.debug('messages mapped for', otherUid, mapped.map(m => ({ id: m.id, type: m.type, remoteUrl: m.remoteUrl, downloadStatus: m.downloadStatus, localPath: m.localPath })));
      } catch (e) {}

      // Fire-and-forget sequential downloader for messages that have remote URLs
      (async () => {
        // Process messages that are pending and have a remoteUrl. This will
        // include audio and document/file types (we excluded images/videos
        // earlier when deciding remoteUrl). Downloads happen sequentially.
        const toDownload = mapped.filter(
          m => m.downloadStatus === 'pending' && m.remoteUrl,
        );
        // Debug: list what we'll download
        try {
          // eslint-disable-next-line no-console
          console.debug('toDownload list for', otherUid, toDownload.map(d => ({ id: d.id, remoteUrl: d.remoteUrl, name: d.name })));
        } catch (e) {}

        for (const msg of toDownload) {
          // mark downloading (so chat bubble shows spinner)
          thunkApi.dispatch(
            updateMessage({
              otherUid,
              id: msg.id,
              patch: { downloadStatus: 'downloading' as const },
            }),
          );

          try {
            const filename = msg.name || `${msg.id}`;

            // downloadFileToCache MUST accept only remote http(s) URLs
            const localUri = await downloadFileToCache({
              url: msg.remoteUrl!, // use remoteUrl saved for download
              filename,
            });

            // update the message with local path and mark done
            thunkApi.dispatch(
              updateMessage({
                otherUid,
                id: msg.id,
                patch: {
                  downloadStatus: 'done' as const,
                  localPath: localUri,
                  url: localUri, // replace url so UI consumes local path directly
                },
              }),
            );
            try {
              // eslint-disable-next-line no-console
              // Downloaded successfully
            } catch (e) {}
          } catch (err: any) {
            // Message download failed
            thunkApi.dispatch(
              updateMessage({
                otherUid,
                id: msg.id,
                patch: { downloadStatus: 'failed' as const },
              }),
            );
            try {
              // eslint-disable-next-line no-console
              // Download failed logging
            } catch (e) {}
          }

          // small await to yield to the event loop / UI
          // eslint-disable-next-line no-await-in-loop
          await Promise.resolve();
        }
      })();
    });

    // presence subscription (unchanged)
    if (!isSelf) {
      unsubMap[otherUid].presence = subscribePresence(
        otherUid,
        (isOnline, lastActive) => {
          const txt = isOnline
            ? 'Online'
            : lastActive
            ? formatLastSeen(lastActive)
            : 'Offline';
          thunkApi.dispatch(setPresence({ otherUid, presenceText: txt }));
        },
      );
    } else {
      thunkApi.dispatch(setPresence({ otherUid, presenceText: '' }));
    }
  },
);

export const markReadNow = createAsyncThunk<void, { chatId: string }>(
  'messages/markReadNow',
  async ({ chatId }) => {
    await markChatRead(chatId);
  },
);

export const setTypingNow = createAsyncThunk<
  void,
  { chatId: string; typing: boolean }
>('messages/setTypingNow', async ({ chatId, typing }) => {
  await setTyping(chatId, typing);
});

export const sendTextNow = createAsyncThunk<
  void,
  { chatId: string; text: string }
>('messages/sendTextNow', async ({ chatId, text }) => {
  await sendText(chatId, text);
});

// Convenience media thunks
export const sendImageNow = createAsyncThunk<
  void,
  {
    chatId: string;
    localPath: string;
    mime?: string;
    width?: number;
    height?: number;
    size?: number;
  }
>('messages/sendImageNow', async p => {
  await sendImage(p.chatId, p);
});
export const sendVideoNow = createAsyncThunk<
  void,
  {
    chatId: string;
    localPath: string;
    mime?: string;
    width?: number;
    height?: number;
    size?: number;
    durationMs?: number;
  }
>('messages/sendVideoNow', async p => {
  await sendVideo(p.chatId, p);
});
export const sendAudioNow = createAsyncThunk<
  void,
  {
    chatId: string;
    localPath: string;
    size?: number;
    mime?: string;
    durationMs?: number;
    name?: string;
  }
>('messages/sendAudioNow', async p => {
  await sendAudio(p.chatId, p);
});
export const sendFileNow = createAsyncThunk<
  void,
  {
    chatId: string;
    localPath: string;
    mime?: string;
    size?: number;
    name?: string;
  }
>('messages/sendFileNow', async p => {
  await sendFile(p.chatId, p);
});

export const deleteMessageNow = createAsyncThunk<
  void,
  {
    chatId: string;
    messageId: string;
    otherUid: string;
    deleteForEveryone?: boolean;
    message?: Message; // pass the full message to handle all file types
  }
>('messages/deleteMessageNow', async ({ chatId, messageId, otherUid, deleteForEveryone = false, message }, thunkApi) => {
  console.log('Starting message deletion:', { messageId, deleteForEveryone, messageType: message?.type });
  
  try {
    // Delete from Firestore and Firebase Storage
    await deleteMessage(chatId, messageId, deleteForEveryone);
    console.log('Firestore deletion completed');
  } catch (error) {
    console.error('Failed to delete message from Firestore:', error);
    throw error;
  }
  
  // Delete local cached files if they exist
  if (message && message.type !== 'text') {
    try {
      const RNFS = (await import('react-native-fs')).default;
      
      // Delete main media file
      if (message.localPath) {
        const exists = await RNFS.exists(message.localPath);
        if (exists) {
          await RNFS.unlink(message.localPath);
        }
      }
      
      // Delete thumbnail file if it exists (for videos/images)
      if (message.type === 'video' && message.url) {
        // Create potential thumbnail path based on original file
        const thumbnailPath = message.localPath?.replace(/\.[^/.]+$/, '_thumb.jpg');
        if (thumbnailPath) {
          const thumbExists = await RNFS.exists(thumbnailPath);
          if (thumbExists) {
            await RNFS.unlink(thumbnailPath);
          }
        }
      }
      
    } catch (error) {
      console.warn('Failed to delete local files:', error);
      // Don't throw error as the main deletion from Firestore succeeded
    }
  }

  // Update local state based on delete type
  if (deleteForEveryone) {
    // Remove from local state immediately for better UX
    thunkApi.dispatch(removeMessage({ otherUid, messageId }));
  } else {
    // For "delete for me", just mark as deleted in local state
    // The selector will filter it out
    const state = thunkApi.getState() as any;
    const currentUserId = (await import('@react-native-firebase/auth')).default().currentUser?.uid;
    
    if (currentUserId) {
      thunkApi.dispatch(updateMessage({
        otherUid,
        id: messageId,
        patch: {
          deletedFor: [...(message?.deletedFor || []), currentUserId]
        }
      }));
    }
  }
});

export const batchDeleteMessagesNow = createAsyncThunk<
  void,
  {
    chatId: string;
    messageIds: string[];
    otherUid: string;
    deleteForEveryone?: boolean;
    messages?: Message[]; // pass the full messages to handle all file types
  }
>('messages/batchDeleteMessagesNow', async ({ chatId, messageIds, otherUid, deleteForEveryone = false, messages = [] }, thunkApi) => {
  console.log('Starting batch message deletion:', { messageIds, deleteForEveryone, count: messageIds.length });
  
  try {
    // Delete from Firestore and Firebase Storage
    await batchDeleteMessages(chatId, messageIds, deleteForEveryone);
    console.log('Firestore batch deletion completed');
  } catch (error) {
    console.error('Failed to batch delete messages from Firestore:', error);
    throw error;
  }
  
  // Delete local cached files if they exist
  for (const message of messages) {
    if (message && message.type !== 'text') {
      try {
        const RNFS = (await import('react-native-fs')).default;
        
        // Delete main media file
        if (message.localPath) {
          const exists = await RNFS.exists(message.localPath);
          if (exists) {
            await RNFS.unlink(message.localPath);
          }
        }
        
        // Delete thumbnail file if it exists (for videos/images)
        if (message.type === 'video' && message.url) {
          const thumbnailPath = message.localPath?.replace(/\.[^/.]+$/, '_thumb.jpg');
          if (thumbnailPath) {
            const thumbExists = await RNFS.exists(thumbnailPath);
            if (thumbExists) {
              await RNFS.unlink(thumbnailPath);
            }
          }
        }
        
      } catch (error) {
        console.warn('Failed to delete local files for message:', message.id, error);
      }
    }
  }

  // Update local state based on delete type
  if (deleteForEveryone) {
    // Remove all messages from local state immediately for better UX
    for (const messageId of messageIds) {
      thunkApi.dispatch(removeMessage({ otherUid, messageId }));
    }
  } else {
    // For "delete for me", mark all messages as deleted in local state
    const currentUserId = (await import('@react-native-firebase/auth')).default().currentUser?.uid;
    
    if (currentUserId) {
      for (const messageId of messageIds) {
        const message = messages.find(m => m.id === messageId);
        thunkApi.dispatch(updateMessage({
          otherUid,
          id: messageId,
          patch: {
            deletedFor: [...(message?.deletedFor || []), currentUserId]
          }
        }));
      }
    }
  }
});

const slice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setMessages(
      state,
      action: PayloadAction<{ otherUid: string; messages: Message[] }>,
    ) {
      const s = state.byOtherUid[action.payload.otherUid] ?? {
        messages: [],
        presenceText: '',
        status: 'idle',
        starredIds: [],
      };
      s.messages = action.payload.messages;
      s.status = 'ready';
      state.byOtherUid[action.payload.otherUid] = s as ChatState;
    },
    setPresence(
      state,
      action: PayloadAction<{ otherUid: string; presenceText: string }>,
    ) {
      const s = state.byOtherUid[action.payload.otherUid] ?? {
        messages: [],
        presenceText: '',
        status: 'idle',
        starredIds: [],
      };
      s.presenceText = action.payload.presenceText;
      state.byOtherUid[action.payload.otherUid] = s as ChatState;
    },
    updateMessage(
      state,
      action: PayloadAction<{
        otherUid: string;
        id: string;
        patch: Partial<Message>;
      }>,
    ) {
      const { otherUid, id, patch } = action.payload;
      const chat = state.byOtherUid[otherUid];
      if (!chat) return;
      const idx = chat.messages.findIndex(m => m.id === id);
      if (idx === -1) return;
      chat.messages[idx] = { ...chat.messages[idx], ...patch };
    },
    removeMessage(
      state,
      action: PayloadAction<{
        otherUid: string;
        messageId: string;
      }>,
    ) {
      const { otherUid, messageId } = action.payload;
      const chat = state.byOtherUid[otherUid];
      if (!chat) return;
      chat.messages = chat.messages.filter(m => m.id !== messageId);
      if (chat.starredIds) {
        chat.starredIds = chat.starredIds.filter(id => id !== messageId);
      }
    },
    removeBatchMessages(
      state,
      action: PayloadAction<{
        otherUid: string;
        messageIds: string[];
      }>,
    ) {
      const { otherUid, messageIds } = action.payload;
      const chat = state.byOtherUid[otherUid];
      if (!chat) return;
      const idsToRemove = new Set(messageIds);
      chat.messages = chat.messages.filter(m => !idsToRemove.has(m.id));
      if (chat.starredIds) {
        chat.starredIds = chat.starredIds.filter(id => !idsToRemove.has(id));
      }
    },
    toggleStarred(
      state,
      action: PayloadAction<{ otherUid: string; id: string }>,
    ) {
      const { otherUid, id } = action.payload;
      const existing = state.byOtherUid[otherUid];
      const chat: ChatState = existing ?? {
        messages: [],
        presenceText: '',
        status: 'idle',
        starredIds: [],
      };
      const set = new Set(chat.starredIds ?? []);
      if (set.has(id)) set.delete(id); else set.add(id);
      chat.starredIds = Array.from(set);
      state.byOtherUid[otherUid] = chat;
    },
    clearChatState(state, action) {
      const key = action.payload.otherUid;
      unsubMap[key]?.msgs?.();
      unsubMap[key]?.presence?.();
      delete unsubMap[key];
      // keep messages cached for instant reload
    },
  },
  extraReducers: b => {
    b.addCase(openDmChat.pending, (state, action) => {
      const otherUid = (action.meta.arg as any).otherUid;
      const existing = state.byOtherUid[otherUid];
      if (!existing) {
        state.byOtherUid[otherUid] = {
          chatId: undefined,
          messages: [],
          presenceText: '',
          status: 'loading',
          starredIds: [],
        };
      } else {
        // preserve cached messages/presence while we load/open the chat
        existing.status = 'loading';
        existing.chatId = undefined;
      }
    });
    b.addCase(openDmChat.fulfilled, (state, { payload }) => {
      const s = state.byOtherUid[payload.otherUid] ?? {
        messages: [],
        presenceText: '',
        status: 'idle',
      };
      s.chatId = payload.chatId;
      s.status = 'ready';
      state.byOtherUid[payload.otherUid] = s;
    });
    b.addCase(openDmChat.rejected, (state, { meta, error }) => {
      const otherUid = (meta.arg as any).otherUid;
      state.byOtherUid[otherUid] = {
        chatId: undefined,
        messages: [],
        presenceText: '',
        status: 'failed',
        error: error.message ?? 'Failed to open chat',
      };
    });
  },
});

export const { setMessages, setPresence, clearChatState, updateMessage, removeMessage, removeBatchMessages, toggleStarred } =
  slice.actions;

export const selectChatIdByOther = (s: RootState, otherUid: string) =>
  s.messages.byOtherUid[otherUid]?.chatId;

export const selectMessagesByOther = (s: RootState, otherUid: string, currentUserId?: string) => {
  const messages = s.messages.byOtherUid[otherUid]?.messages ?? [];
  
  // Filter out messages that are deleted for the current user
  if (currentUserId) {
    return messages.filter(message => 
      !message.deletedFor || !message.deletedFor.includes(currentUserId)
    );
  }
  
  return messages;
};

export const selectPresenceByOther = (s: RootState, otherUid: string) =>
  s.messages.byOtherUid[otherUid]?.presenceText ?? '';

export const selectMsgStatusByOther = (s: RootState, otherUid: string) =>
  s.messages.byOtherUid[otherUid]?.status ?? 'idle';

export const selectStarredIdsByOther = (s: RootState, otherUid: string) =>
  s.messages.byOtherUid[otherUid]?.starredIds ?? [];

export const selectStarredMessagesByOther = (s: RootState, otherUid: string, currentUserId?: string) => {
  const ids = new Set(selectStarredIdsByOther(s, otherUid));
  const messages = selectMessagesByOther(s, otherUid, currentUserId);
  return messages.filter(m => ids.has(m.id));
};

export default slice.reducer;
