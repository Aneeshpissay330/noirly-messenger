import { pick } from '@react-native-documents/picker';
import { useHeaderHeight } from '@react-navigation/elements';
import {
  RouteProp,
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React,
  {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import { Avatar, Chip, IconButton, List, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatBubble from '../../../../components/ChatBubble';
import ChatInput from '../../../../components/ChatInput';
import DeleteMessageModal from '../../../../components/DeleteMessageModal';
import SelectionToolbar from '../../../../components/SelectionToolbar';
import { useKeyboardStatus } from '../../../../hooks/useKeyboardStatus';
import type { Message } from '../../../../types/chat';

import auth from '@react-native-firebase/auth';
import RNFS from 'react-native-fs';
import { useAppDispatch, useAppSelector } from '../../../../app/hooks';
import { FrequencyChart } from '../../../../components/FrequencyChart';
import {
  batchDeleteMessagesNow,
  clearChatState,
  deleteMessageNow,
  markReadNow,
  openDmChat,
  selectChatIdByOther,
  selectMessagesByOther,
  selectPresenceByOther,
  sendFileNow,
  sendImageNow,
  sendTextNow,
  sendVideoNow,
  setTypingNow,
  startSubscriptions,
  toggleStarred
} from '../../../../features/messages';
import { useAudioRecorder } from '../../../../hooks/useAudioRecorder';
import { useUserDoc } from '../../../../hooks/useUserDoc';
import { sendAudio } from '../../../../services/chat';
import { FFT_SIZE } from '../../../../utils/audio';
import { formatChatDate } from '../../../../utils/date';

type ChatRouteParams = {
  ChatView: { id: string; type?: 'group'; name?: string; avatar?: string };
};

type ChatPersonalNavigationParams = {
  CameraScreen: { id: string };
  PersonalChatContact: { id: string };
  VideoViewer: { uri: string; title?: string; chatId?: string; otherUid?: string; messageId?: string };
  MediaViewer: { items: any[]; initialIndex?: number; title?: string; chatId?: string; otherUid?: string; messageIds?: string[] };
};

export default function ChatView() {
  //Theming
  const theme = useTheme();
  // Routing / params
  const route = useRoute<RouteProp<ChatRouteParams, 'ChatView'>>();
  const navigation =
    useNavigation<StackNavigationProp<ChatPersonalNavigationParams>>();
  const otherUid = route.params?.id;
  const otherName = route.params?.name ?? 'Chat';
  const otherAvatar = route.params?.avatar;
  const isGroup = route.params?.type === 'group';

  // listRef is declared below with ChatListItem typing

  // Me
  const me = auth().currentUser?.uid;
  const { userDoc: meDoc } = useUserDoc();

  // Redux
  const dispatch = useAppDispatch();
  const messages = useAppSelector(s => selectMessagesByOther(s, otherUid, me));
  const chatId = useAppSelector(s => selectChatIdByOther(s, otherUid));
  const presenceText = useAppSelector(s => selectPresenceByOther(s, otherUid));
  const starredIds = useAppSelector(s => (s.messages.byOtherUid[otherUid]?.starredIds ?? []));
  const starredCount = starredIds.length;

  // UI env (for header offsets if you later add KeyboardAvoidingView)
  const isKeyboardOpen = useKeyboardStatus();
  const headerHeight = useHeaderHeight();

  // Derived
  const isSelf = useMemo(
    () => otherUid === me || otherUid === 'me',
    [otherUid, me],
  );

  const nav = navigation;

  // Build a simple array of image/video items for the media viewer
  const mediaItems = useMemo(() => {
    const items = messages
      .filter(m => m.type === 'image' || m.type === 'video')
      .map(m => ({ 
        src: m.localPath || m.url || '', 
        type: m.type as 'image' | 'video', 
        id: m.id 
      }));
    
    console.log('mediaItems created:', { messagesCount: messages.length, itemsCount: items.length, items });
    return items;
  }, [messages]);

  // Delete message modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Multi-selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  // Latest chatId for async/cleanup
  const chatIdRef = useRef<string | undefined>(chatId ?? undefined);
  useEffect(() => {
    chatIdRef.current = chatId ?? undefined;
  }, [chatId]);

  /**
   * Combined: ensure chat, subscribe to messages, subscribe to presence
   * One effect => one subscription teardown
   */
  useFocusEffect(
    useCallback(() => {
      if (!otherUid) return;

      (async () => {
        try {
          const { chatId: dmChatId } = await dispatch(openDmChat({ otherUid })).unwrap();
          await dispatch(startSubscriptions({ otherUid, chatId: dmChatId, isSelf }));
        } catch (e: any) {
          Alert.alert('Chat error', e?.message ?? 'Failed to open chat');
        }
      })();

      return () => {
        dispatch(clearChatState({ otherUid }));
      };
    }, [dispatch, otherUid, isSelf]),
  );

  // If new messages arrive while this screen is focused, ensure they're
  // immediately marked as read so the Personal list shows correct counts
  // when navigating back. This complements the focus-based markReadNow
  // (which runs when the screen gains focus) by reacting to incoming
  // message changes while focused.
  const isFocused = useIsFocused();
  useEffect(() => {
    const id = chatId;
    if (!id) return;
    if (!isFocused) return;
    if (isSelf) return;
    dispatch(markReadNow({ chatId: id }));
  }, [dispatch, chatId, isFocused, messages.length, isSelf]);
  /**
   * Mark read and reset typing on focus/blur of the screen instead of reacting to message changes.
   */
  useFocusEffect(
    useCallback(() => {
      const id = chatIdRef.current;
      if (id) {
        dispatch(markReadNow({ chatId: id }));
        dispatch(setTypingNow({ chatId: id, typing: false }));
      }
      return () => {
        const id2 = chatIdRef.current;
        if (id2) dispatch(setTypingNow({ chatId: id2, typing: false }));
      };
    }, [dispatch]),
  );

  // We'll build a flattened list mixing date-separator "items" with messages.
  type DateItem = { kind: 'date'; id: string; dateLabel: string };
  type ChatListItem = DateItem | Message;

  const listRef = useRef<FlatList<ChatListItem>>(null);

  const listData = useMemo(() => {
    // We need to account for the FlatList being inverted. To make the
    // Chip appear visually above a date-group (nearer the newer messages),
    // insert the date separator AFTER the last message of that date in
    // the data array. When inverted, that separator will render above the
    // message group.
    const out: ChatListItem[] = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      out.push(m);

      // Determine if next message is a different date (or no next message)
      const next = messages[i + 1];
      const d = new Date(m.createdAt);
      const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      let nextDateKey: string | null = null;
      if (next) {
        const nd = new Date(next.createdAt);
        nextDateKey = `${nd.getFullYear()}-${nd.getMonth() + 1}-${nd.getDate()}`;
      }

      if (!next || nextDateKey !== dateKey) {
        // push separator after the last message of this date
        out.push({ kind: 'date', id: `date-${dateKey}`, dateLabel: formatChatDate(m.createdAt) });
      }
    }

    return out;
  }, [messages]);

  const isDateItem = useCallback((i: ChatListItem): i is DateItem => (i as any).kind === 'date', []);

  const keyExtractor = useCallback((item: ChatListItem) => {
    return isDateItem(item) ? item.id : item.id;
  }, [isDateItem]);

  const renderItem: ListRenderItem<ChatListItem> = useCallback(
    ({ item, index }) => {
      if (isDateItem(item)) {
        return (
          <View style={styles.dateContainer}>
            <Chip mode="outlined">{item.dateLabel}</Chip>
          </View>
        );
      }

      const message = item as Message;
      const isMe = !!me && message.userId === me;

      // find the next message item in the flattened list (next chronological)
      let prevMsg: Message | undefined;
      for (let i = index + 1; i < listData.length; i++) {
        const it = listData[i];
        if (!isDateItem(it)) {
          prevMsg = it as Message;
          break;
        }
      }

      const showAvatar = !isMe && (!prevMsg || prevMsg.userId !== message.userId);

      const onOpenMedia = (items: { src: string; type: 'image' | 'video' }[], idx: number) => {
        console.log('onOpenMedia called with:', { items, idx, messageId: message.id });
        
        // Check if the clicked item is a video
        const clickedItem = items[idx];
        if (clickedItem && clickedItem.type === 'video') {
          console.log('Opening VideoViewer for video:', { src: clickedItem.src, title: otherName });
          (nav as any).navigate('VideoViewer', { 
            uri: clickedItem.src, 
            title: otherName,
            chatId,
            otherUid,
            messageId: message.id
          });
          return;
        }
        
        // For images, use the existing MediaViewer logic (which now filters to images only)
        // If the message exists in the larger mediaItems list, open full list at that index.
        const globalIndex = mediaItems.findIndex(mi => mi.id === message.id);
        console.log('Global index search:', { globalIndex, mediaItems });
        
        if (globalIndex >= 0) {
          const payload = mediaItems.map(mi => ({ src: mi.src, type: mi.type }));
          const payloadMessageIds = mediaItems.map(mi => mi.id);
          console.log('Opening MediaViewer with payload:', { payload, globalIndex, title: otherName });
          (nav as any).navigate('MediaViewer', { 
            items: payload, 
            initialIndex: globalIndex, 
            title: otherName,
            chatId,
            otherUid,
            messageIds: payloadMessageIds
          });
          return;
        }
        // fallback: open the small array passed directly
        console.log('Opening MediaViewer with fallback items:', { items, idx, title: otherName });
        (nav as any).navigate('MediaViewer', { 
          items, 
          initialIndex: idx, 
          title: otherName,
          chatId,
          otherUid,
          messageIds: [message.id] 
        });
      };

      return (
        <ChatBubble
          message={message}
          isMe={isMe}
          otherUid={otherUid}
          _showAvatar={showAvatar}
          showName={isGroup && !isMe}
          onOpenMedia={onOpenMedia}
          onLongPress={(msg: Message) => {
            console.log('Long press on message:', { id: msg.id, type: msg.type, userId: msg.userId, senderId: msg.senderId });
            if (!isSelectionMode) {
              // Enter selection mode and select this message
              setIsSelectionMode(true);
              setSelectedMessages(new Set([msg.id]));
            }
          }}
          isSelectionMode={isSelectionMode}
          isSelected={selectedMessages.has(message.id)}
          onToggleSelect={(messageId: string) => {
            if (!isSelectionMode) return;
            
            setSelectedMessages(prev => {
              const newSet = new Set(prev);
              if (newSet.has(messageId)) {
                newSet.delete(messageId);
              } else {
                newSet.add(messageId);
              }
              return newSet;
            });
          }}
          onToggleStar={(msg) => {
            dispatch(toggleStarred({ otherUid, id: msg.id }));
          }}
          isStarred={starredIds.includes(message.id)}
        />
      );
    },
    [listData, me, isGroup, mediaItems, nav, otherName, isSelectionMode, selectedMessages, dispatch, isDateItem, otherUid, starredIds, chatId],
  );

  const handleDeleteForMe = useCallback(async () => {
    if ((!selectedMessage && selectedMessages.size === 0) || !chatId) return;
    
    const messageIds = selectedMessages.size > 0 
      ? Array.from(selectedMessages) 
      : selectedMessage ? [selectedMessage.id] : [];
    
    console.log('Delete for me:', { messageIds, me });
    
    try {
      if (messageIds.length > 1) {
        // Use batch delete for multiple messages
        const messagesToDelete = messageIds.map(id => messages.find(m => m.id === id)).filter(Boolean) as Message[];
        await dispatch(batchDeleteMessagesNow({
          chatId: chatId,
          messageIds,
          otherUid,
          deleteForEveryone: false,
          messages: messagesToDelete,
        })).unwrap();
      } else {
        // Use single delete for one message
        const message = messages.find(m => m.id === messageIds[0]);
        if (message) {
          await dispatch(deleteMessageNow({
            chatId: chatId,
            messageId: messageIds[0],
            otherUid,
            deleteForEveryone: false,
            message,
          })).unwrap();
        }
      }
      console.log('Delete for me completed successfully');
    } catch (error) {
      console.error('Delete for me failed:', error);
      Alert.alert('Error', 'Failed to delete messages: ' + (error as any)?.message);
    }
    
    setDeleteModalVisible(false);
    setSelectedMessage(null);
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  }, [selectedMessage, selectedMessages, chatId, otherUid, dispatch, messages, me]);

  const handleDeleteForEveryone = useCallback(async () => {
    if ((!selectedMessage && selectedMessages.size === 0) || !chatId) return;
    
    const messageIds = selectedMessages.size > 0 
      ? Array.from(selectedMessages) 
      : selectedMessage ? [selectedMessage.id] : [];
    
    console.log('Delete for everyone:', { messageIds, me });
    
    try {
      // Check if user can delete all selected messages
      const messagesData = messageIds.map(id => messages.find(m => m.id === id)).filter(Boolean);
      const canDeleteAll = messagesData.every(m => m?.userId === me || m?.senderId === me);
      
      if (!canDeleteAll) {
        Alert.alert('Error', 'You can only delete your own messages for everyone');
        return;
      }
      
      if (messageIds.length > 1) {
        // Use batch delete for multiple messages
        await dispatch(batchDeleteMessagesNow({
          chatId,
          messageIds,
          otherUid,
          deleteForEveryone: true,
          messages: messagesData as Message[],
        })).unwrap();
      } else {
        // Use single delete for one message
        const message = messagesData[0];
        if (message) {
          await dispatch(deleteMessageNow({
            chatId,
            messageId: messageIds[0],
            otherUid,
            deleteForEveryone: true,
            message,
          })).unwrap();
        }
      }
      console.log('Delete for everyone completed successfully');
    } catch (error) {
      console.error('Delete for everyone failed:', error);
      Alert.alert('Error', 'Failed to delete messages: ' + (error as any)?.message);
    }
    
    setDeleteModalVisible(false);
    setSelectedMessage(null);
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  }, [selectedMessage, selectedMessages, chatId, otherUid, dispatch, messages, me]);

  const handleDismissDeleteModal = useCallback(() => {
    setDeleteModalVisible(false);
    setSelectedMessage(null);
  }, []);

  const handleExitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!isSelectionMode) return;
    const allMessageIds = new Set(messages.map(m => m.id));
    setSelectedMessages(allMessageIds);
  }, [isSelectionMode, messages]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedMessages.size === 0) return;
    
    // For multiple messages, we'll show the modal with the first selected message
    // but handle batch deletion
    const firstSelectedMessage = messages.find(m => selectedMessages.has(m.id));
    if (firstSelectedMessage) {
      setSelectedMessage(firstSelectedMessage);
      setDeleteModalVisible(true);
    }
  }, [selectedMessages, messages]);

  // Handle back button in selection mode
  useEffect(() => {
    if (!isSelectionMode) return;
    
    const handleBackPress = () => {
      if (isSelectionMode) {
        handleExitSelectionMode();
        return true; // Prevent default back action
      }
      return false;
    };
    
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    return () => subscription.remove();
  }, [isSelectionMode, handleExitSelectionMode]);

  const onSend = useCallback(
    async (text: string) => {
      const id = chatIdRef.current;
      if (!id) return;
      await dispatch(sendTextNow({ chatId: id, text }));
      // you can scroll list to top in your render layer
      listRef.current?.scrollToOffset({ animated: true, offset: 0 });
    },
    [dispatch],
  );

  const onTyping = useCallback(
    (typing: boolean) => {
      const id = chatIdRef.current;
      if (id) dispatch(setTypingNow({ chatId: id, typing }));
    },
    [dispatch],
  );

  const onPickDocument = useCallback(async () => {
    try {
      const result = await pick({ 
        mode: 'open',
        allowMultiSelection: false,
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ]
      });
      
      if (!result || result.length === 0) return;
      
      const doc = result[0];
      if (!doc) return;
      
      const id = chatIdRef.current;
      if (!id) return;

      console.log('Document picked:', { uri: doc.uri, name: doc.name, type: doc.type, size: doc.size });

      // Normalize and ensure we have access to the file on Android.
      // Some providers return content:// URIs which later native readers (Firebase
      // Storage, RNFS) cannot read unless the app copies the file to a private
      // path obtained via ACTION_OPEN_DOCUMENT or uses a content resolver. To be
      // robust, copy content:// URIs into the app cache and pass that path on.
      let localPath: string = doc.uri;

      // Strip file:// prefix if present to make path compatible with RNFS usages
      if (localPath.startsWith('file://')) {
        localPath = localPath.replace(/^file:\/\//, '');
      }

      if (Platform.OS === 'android' && doc.uri.startsWith('content://')) {
        // Attempt to copy the content URI into the app cache directory so
        // downstream native code can read it without permission errors.
        const filename = doc.name?.replace(/\s+/g, '_') || `document-${Date.now()}`;
        const dest = `${RNFS.CachesDirectoryPath}/${filename}`;
        try {
          // copyFile supports content:// URIs on some RNFS builds by using
          // Android's ContentResolver internally. Try this first.
          // dest is plain path (no file://) which our other code expects.
           
          // @ts-ignore
          await RNFS.copyFile(doc.uri, dest);
          localPath = dest;
          console.log('Document copied to cache:', dest);
        } catch (err) {
          console.error('Copy file failed, trying base64 method:', err);
          // Fallback: try reading as base64 and writing out. Some RNFS
          // versions support readFile for content URIs.
          try {
             
            // @ts-ignore
            const data = await RNFS.readFile(doc.uri, 'base64');
            await RNFS.writeFile(dest, data, 'base64');
            localPath = dest;
            console.log('Document written via base64:', dest);
          } catch (err2) {
            console.error('Base64 copy also failed:', err2);
            // Failed to copy picked document to cache
            Alert.alert(
              'File access error',
              'Unable to access the selected file. Try picking the file again or choose a different file.',
            );
            return;
          }
        }
      }

      // Ensure file:// prefix for consistent handling
      const finalPath = localPath.startsWith('file://') ? localPath : `file://${localPath}`;
      
      console.log('Sending document:', { finalPath, mime: doc.type, size: doc.size, name: doc.name });

      await dispatch(
        sendFileNow({
          chatId: id,
          localPath: finalPath,
          mime: doc.type || 'application/octet-stream',
          size: doc.size || 0,
          name: doc.name || 'document',
        }),
      );
    } catch (error) {
      console.error('Document picker error:', error);
      if (error && (error as any).message && !(error as any).message.includes('cancelled')) {
        Alert.alert('Error', 'Failed to pick document. Please try again.');
      }
    }
  }, [dispatch]);

  const onOpenCamera = useCallback(() => {
    navigation.navigate('CameraScreen', { id: otherUid });
  }, [navigation, otherUid]);

  const onOpenGallery = useCallback(async () => {
    try {
      console.log('Opening gallery...');
      
      // Check storage permissions first
      const { handleStoragePermission } = await import('../../../../permission');
      const permission = await handleStoragePermission('check');
      
      if (permission !== 'granted') {
        console.log('Storage permission not granted, requesting...');
        const requestResult = await handleStoragePermission('request');
        if (requestResult !== 'granted') {
          console.log('Storage permission denied');
          Alert.alert('Permission Required', 'Please grant storage permission to access gallery');
          return;
        }
      }

      console.log('Opening image picker...');
      const media: any = await ImagePicker.openPicker({
        mediaType: 'any',
        cropping: false,
        includeBase64: false,
        includeExif: false,
        maxFiles: 1,
      });
      
      console.log('Media selected:', { path: media?.path, mime: media?.mime, size: media?.size });
      
      const id = chatIdRef.current;
      if (!id) {
        console.error('No chat ID available');
        return;
      }
      
      if (!media?.mime || !media?.path) {
        console.error('Invalid media selection');
        return;
      }

      // Ensure proper file path format
      let localPath = media.path;
      if (!localPath.startsWith('file://')) {
        localPath = `file://${localPath}`;
      }

      console.log('Sending media with localPath:', localPath);

      if (media.mime.startsWith('image/')) {
        console.log('Dispatching sendImageNow...');
        const result = await dispatch(
          sendImageNow({
            chatId: id,
            localPath,
            mime: media.mime,
            width: media.width,
            height: media.height,
            size: media.size,
          }),
        );
        console.log('Image send result:', result);
        return;
      }
      if (media.mime.startsWith('video/')) {
        console.log('Dispatching sendVideoNow...');
        const result = await dispatch(
          sendVideoNow({
            chatId: id,
            localPath,
            mime: media.mime,
            width: media.width,
            height: media.height,
            size: media.size,
            durationMs:
              typeof media.duration === 'number' ? media.duration : undefined,
          }),
        );
        console.log('Video send result:', result);
        return;
      }
      // unsupported type
      console.warn('Unsupported media type:', media.mime);
    } catch (error) {
      console.error('Gallery error:', error);
      if (error && (error as any).code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Failed to open gallery. Please try again.');
      }
    }
  }, [dispatch]);

  const { start, stop, isRecording, freqs, filePath, togglePause, isPaused } =
    useAudioRecorder({
      sampleRate: 16000,
      bufferLengthInSamples: 16000,
      fftSize: 512,
      smoothing: 0.8,
      monitor: false,
    });

  const onRecordAudio = useCallback(async () => {
    await start();
  }, [start]);

  const onCancelRecording = useCallback(async () => {
    // stop() now returns the saved file path (or null). Use that to avoid
    // reading stale hook state which may not update synchronously.
    let savedPath: string | null = null;
    if (isRecording) {
      try {
        // stop may return the path of the saved WAV
        // @ts-ignore
        savedPath = await stop();
      } catch {}
    }
    const pathToDelete = savedPath ?? filePath;
    if (pathToDelete) await RNFS.unlink(pathToDelete).catch(() => {});
  }, [isRecording, stop, filePath]);

  const onSendRecording = useCallback(async () => {
    // stop() returns the saved file path (or null). Use it to ensure we send
    // the actual file written on disk rather than relying on hook state.
    let savedPath: string | null = null;
    if (isRecording) {
      // @ts-ignore
      savedPath = await stop();
    }
    const pathToSend = savedPath ?? filePath;
    if (pathToSend) {
      const id = chatIdRef.current;
      if (!id) return;
  const stats = await RNFS.stat(pathToSend);
  // Pass plain file system path. UI components will convert to file:// when needed.
  await sendAudio(id, { localPath: pathToSend, size: stats.size });
    }
  }, [isRecording, stop, filePath]);

  // Header values memoized so useLayoutEffect only runs when inputs truly change
  const headerTitle = useMemo(
    () => (isSelf ? `You (@${meDoc?.username ?? 'you'})` : otherName),
    [isSelf, meDoc?.username, otherName],
  );
  const headerSubtitle = useMemo(
    () => (isSelf ? '' : presenceText || ' '),
    [isSelf, presenceText],
  );
  const avatarUri = useMemo(
    () => (isSelf ? meDoc?.photoURL : otherAvatar),
    [isSelf, meDoc?.photoURL, otherAvatar],
  );

  const renderHeaderAvatar = React.useCallback((props: any) => 
    avatarUri ? (
      <Avatar.Image {...props} size={40} source={{ uri: avatarUri }} />
    ) : (
      <Avatar.Text
        {...props}
        size={40}
        label={(isSelf ? meDoc?.username ?? 'You' : otherName)
          .slice(0, 2)
          .toUpperCase()}
      />
    ), [avatarUri, isSelf, meDoc?.username, otherName]);

  const renderHeaderTitle = React.useCallback(() => (
    <List.Item
      title={headerTitle}
      description={headerSubtitle}
      left={renderHeaderAvatar}
      onPress={() => {
        if (!isSelf)
          navigation.navigate('PersonalChatContact', { id: otherUid });
      }}
    />
  ), [headerTitle, headerSubtitle, renderHeaderAvatar, isSelf, navigation, otherUid]);

  const renderHeaderRight = React.useCallback(() => (
    <IconButton
      icon={starredCount > 0 ? 'star' : 'star-outline'}
      size={24}
      onPress={() => (navigation as any).navigate('StarredMessages', { id: otherUid, name: otherName })}
    />
  ), [starredCount, navigation, otherUid, otherName]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: renderHeaderTitle,
      headerRight: renderHeaderRight,
    });
  }, [
    navigation,
    renderHeaderTitle,
    renderHeaderRight,
  ]);

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SelectionToolbar
        visible={isSelectionMode}
        selectedCount={selectedMessages.size}
        onClose={handleExitSelectionMode}
        onSelectAll={handleSelectAll}
        onDelete={handleDeleteSelected}
        canSelectAll={selectedMessages.size < messages.length}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.container}
        keyboardVerticalOffset={
          !isKeyboardOpen
            ? headerHeight
            : headerHeight - Dimensions.get('window').height * 0.04
        }
      >
        <View style={[
          styles.messageListContainer,
          isSelectionMode && styles.selectionModeMargin
        ]}>
          <FlatList
            ref={listRef}
            data={listData}
            inverted
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContentContainer}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={() => Keyboard.dismiss()}
            style={styles.container}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
          />
          {isRecording ? (
            <View style={styles.recordingContainer}>
              <FrequencyChart data={freqs} dataSize={FFT_SIZE / 2} />
              <View
                style={styles.recordingControls}
              >
                <IconButton
                  icon="trash-can-outline"
                  onPress={onCancelRecording}
                />
                <IconButton
                  icon={!isPaused ? 'pause' : 'microphone-outline'}
                  iconColor="red"
                  size={30}
                  onPress={togglePause}
                />
                <IconButton
                  icon="send-circle"
                  iconColor={theme.colors.primary}
                  size={45}
                  onPress={onSendRecording}
                />
              </View>
            </View>
          ) : (
            <ChatInput
              onSend={onSend}
              onPickDocument={onPickDocument}
              onOpenCamera={onOpenCamera}
              onOpenGallery={onOpenGallery}
              onRecordAudio={onRecordAudio}
              onTyping={onTyping}
            />
          )}
        </View>
      </KeyboardAvoidingView>
      
      <DeleteMessageModal
        visible={deleteModalVisible}
        message={selectedMessage}
        messageCount={selectedMessages.size > 0 ? selectedMessages.size : 1}
        isMe={(() => {
          if (selectedMessages.size > 0) {
            // For multiple selection, check if ALL selected messages are from current user
            const selectedMessageObjects = messages.filter(m => selectedMessages.has(m.id));
            return selectedMessageObjects.every(msg => 
              msg.userId === me || msg.senderId === me
            );
          } else {
            // For single selection
            return selectedMessage?.userId === me || selectedMessage?.senderId === me;
          }
        })()}
        onDismiss={handleDismissDeleteModal}
        onDeleteForMe={handleDeleteForMe}
        onDeleteForEveryone={handleDeleteForEveryone}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dateContainer: { alignItems: 'center', paddingVertical: 8 },
  messageListContainer: { flex: 1 },
  listContentContainer: { paddingVertical: 8 },
  recordingContainer: { flex: 1, maxHeight: 140 },
  recordingControls: {
    justifyContent: 'space-between',
    columnGap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectionModeMargin: { marginTop: 56 },
});
