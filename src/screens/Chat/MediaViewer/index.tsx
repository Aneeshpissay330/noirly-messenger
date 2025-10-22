import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import React, { useRef, useState, useCallback } from 'react';
import {
  Alert,
  Modal,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Menu, Snackbar, useTheme } from 'react-native-paper';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import {
  Gallery,
  type GalleryRefType,
} from 'react-native-zoom-toolkit';
import auth from '@react-native-firebase/auth';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import DeleteMessageModal from '../../../components/DeleteMessageModal';
import {
  deleteMessageNow,
  selectMessagesByOther,
} from '../../../features/messages';
import type { Message } from '../../../types/chat';
import { useGalleryCallbacks } from '../../../hooks/useGalleryCallbacks';
import { useHeaderConfig } from '../../../hooks/useHeaderConfig';
import { useMediaViewer } from '../../../hooks/useMediaViewer';
import { mediaViewerStyles } from '../../../styles/mediaViewerStyles';
import GalleryImage from './GalleryImage';
import GalleryVideo from './GalleryVideo';

type MediaItem = { src: string; type: 'image' | 'video' };

type RouteParams = {
  MediaViewer: { 
    items: MediaItem[]; 
    initialIndex?: number; 
    title?: string;
    chatId?: string;
    otherUid?: string;
    messageIds?: string[];
  };
};

export default function MediaViewer() {
  const route = useRoute<RouteProp<RouteParams, 'MediaViewer'>>();
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const galleryRef = useRef<GalleryRefType>(null);
  
  // Route params
  const allItems = React.useMemo(() => route.params?.items ?? [], [route.params?.items]);
  const items = React.useMemo(() => allItems.filter(item => item.type === 'image'), [allItems]); // Only show images, not videos
  const initial = route.params?.initialIndex ?? 0;
  const title = route.params?.title ?? '';
  const chatId = route.params?.chatId;
  const otherUid = route.params?.otherUid;
  const messageIds = React.useMemo(() => route.params?.messageIds ?? [], [route.params?.messageIds]);
  
  // Redux and auth
  const dispatch = useAppDispatch();
  const me = auth().currentUser?.uid;
  const messages = useAppSelector(s => 
    otherUid ? selectMessagesByOther(s, otherUid, me) : []
  );
  
  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedMessageForDelete, setSelectedMessageForDelete] = useState<Message | null>(null);
  
  console.log('MediaViewer params:', { items, initial, title });

  const {
    index,
    menuVisible,
    openMenu,
    closeMenu,
    handleShare,
    handleDownload,
    onIndexChange,
    onTap,
    snackbarVisible,
    snackbarMessage,
    hideSnackbar,
  } = useMediaViewer({ items, initialIndex: initial, title });

  useHeaderConfig({ title, onMenuPress: openMenu });

  const { keyExtractor, transition } = useGalleryCallbacks();

  // Delete handlers
  const handleDeleteForMe = useCallback(async () => {
    if (!selectedMessageForDelete || !chatId || !otherUid) return;
    
    try {
      await dispatch(deleteMessageNow({
        chatId,
        messageId: selectedMessageForDelete.id,
        otherUid,
        deleteForEveryone: false,
        message: selectedMessageForDelete,
      })).unwrap();
      console.log('Delete for me completed successfully');
      
      // Navigate back to previous screen
      navigation.goBack();
    } catch (error) {
      console.error('Delete for me failed:', error);
      Alert.alert('Error', 'Failed to delete message: ' + (error as any)?.message);
    }
    
    setDeleteModalVisible(false);
    setSelectedMessageForDelete(null);
  }, [selectedMessageForDelete, chatId, otherUid, dispatch, navigation]);

  const handleDeleteForEveryone = useCallback(async () => {
    if (!selectedMessageForDelete || !chatId || !otherUid) return;
    
    // Check if user can delete this message
    const canDelete = selectedMessageForDelete.userId === me || selectedMessageForDelete.senderId === me;
    
    if (!canDelete) {
      Alert.alert('Error', 'You can only delete your own messages for everyone');
      return;
    }
    
    try {
      await dispatch(deleteMessageNow({
        chatId,
        messageId: selectedMessageForDelete.id,
        otherUid,
        deleteForEveryone: true,
        message: selectedMessageForDelete,
      })).unwrap();
      console.log('Delete for everyone completed successfully');
      
      // Navigate back to previous screen
      navigation.goBack();
    } catch (error) {
      console.error('Delete for everyone failed:', error);
      Alert.alert('Error', 'Failed to delete message: ' + (error as any)?.message);
    }
    
    setDeleteModalVisible(false);
    setSelectedMessageForDelete(null);
  }, [selectedMessageForDelete, chatId, otherUid, dispatch, me, navigation]);

  const handleDismissDeleteModal = useCallback(() => {
    setDeleteModalVisible(false);
    setSelectedMessageForDelete(null);
  }, []);

  const handleDeletePress = useCallback(() => {
    closeMenu();
    // Find the message corresponding to current media item
    const currentItem = items[index];
    if (!currentItem || messageIds.length === 0) {
      Alert.alert('Error', 'Cannot delete this media');
      return;
    }
    const currentMediaIndex = items.findIndex(item => item.src === currentItem.src);
    let messageId: string | undefined;
    if (messageIds.length > currentMediaIndex) {
      // Use the messageId mapping if available
      messageId = messageIds[currentMediaIndex];
    } else {
      // Fallback: try to find the message by matching the media URL
      const matchingMessage = messages.find(msg => 
        (msg.type === 'image' || msg.type === 'video') && 
        (msg.localPath === currentItem.src || msg.url === currentItem.src)
      );
      messageId = matchingMessage?.id;
    }
    if (!messageId) {
      Alert.alert('Error', 'Cannot find message to delete');
      return;
    }
    const messageToDelete = messages.find(msg => msg.id === messageId);
    if (!messageToDelete) {
      Alert.alert('Error', 'Message not found');
      return;
    }
    setSelectedMessageForDelete(messageToDelete);
    setDeleteModalVisible(true);
  }, [closeMenu, items, index, messageIds, messages]);

  // Optimized render item function
  const renderItem = React.useCallback((item: MediaItem, itemIndex: number) => {
    console.log('MediaViewer renderItem:', { item, itemIndex });
    if (item.type === 'image') {
      return <GalleryImage uri={item.src} />;
    }
    return <GalleryVideo uri={item.src} />;
  }, []);

  return (
    <SafeAreaView 
      style={[mediaViewerStyles.container, { backgroundColor: theme.colors.background }]}
      edges={['bottom']}
    >
      <View style={[mediaViewerStyles.container, { backgroundColor: theme.colors.background }]}>
      <Gallery
        ref={galleryRef}
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onTap={onTap}
        onIndexChange={onIndexChange}
        initialIndex={index}
        customTransition={transition}
      />

      <View
        style={[
          mediaViewerStyles.paginationOverlay,
          { bottom: Math.max(insets.bottom + 10, 30) },
        ]}
      >
        <Text style={mediaViewerStyles.paginationText}>
          {index + 1} of {items.length}
        </Text>
      </View>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={mediaViewerStyles.modalOverlay}>
            <View
              style={[
                mediaViewerStyles.menuModal,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Menu.Item
                leadingIcon="share-variant"
                onPress={handleShare}
                title="Share"
              />
              <Menu.Item
                leadingIcon="download"
                onPress={handleDownload}
                title="Download"
              />
              <Menu.Item
                leadingIcon="delete"
                onPress={handleDeletePress}
                title="Delete"
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={hideSnackbar}
        duration={3000}
        style={{ marginBottom: insets.bottom }}
      >
        {snackbarMessage}
      </Snackbar>
      
      <DeleteMessageModal
        visible={deleteModalVisible}
        message={selectedMessageForDelete}
        messageCount={1}
        isMe={selectedMessageForDelete?.userId === me || selectedMessageForDelete?.senderId === me}
        onDismiss={handleDismissDeleteModal}
        onDeleteForMe={handleDeleteForMe}
        onDeleteForEveryone={handleDeleteForEveryone}
      />
      </View>
    </SafeAreaView>
  );
}