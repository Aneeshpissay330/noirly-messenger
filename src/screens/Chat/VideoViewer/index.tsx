import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import React, { useState, useCallback } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Menu, Snackbar, useTheme } from 'react-native-paper';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import DeleteMessageModal from '../../../components/DeleteMessageModal';
import {
  deleteMessageNow,
  selectMessagesByOther,
} from '../../../features/messages';
import type { Message } from '../../../types/chat';
import { useHeaderConfig } from '../../../hooks/useHeaderConfig';
import { useMediaViewer } from '../../../hooks/useMediaViewer';
import GalleryVideo from '../MediaViewer/GalleryVideo';

type RouteParams = {
  VideoViewer: { 
    uri: string; 
    title?: string;
    chatId?: string;
    otherUid?: string;
    messageId?: string;
  };
};

export default function VideoViewer() {
  const route = useRoute<RouteProp<RouteParams, 'VideoViewer'>>();
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  // Route params
  const uri = route.params?.uri ?? '';
  const title = route.params?.title ?? '';
  const chatId = route.params?.chatId;
  const otherUid = route.params?.otherUid;
  const messageId = route.params?.messageId;
  
  // Redux and auth
  const dispatch = useAppDispatch();
  const me = auth().currentUser?.uid;
  const messages = useAppSelector(s => 
    otherUid ? selectMessagesByOther(s, otherUid, me) : []
  );
  
  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedMessageForDelete, setSelectedMessageForDelete] = useState<Message | null>(null);
  
  console.log('VideoViewer params:', { uri, title });

  // Create a single video item for the useMediaViewer hook
  const videoItem = { src: uri, type: 'video' as const };
  const items = [videoItem];

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

  const {
    menuVisible,
    openMenu,
    closeMenu,
    handleShare,
    handleDownload,
    onTap,
    snackbarVisible,
    snackbarMessage,
    hideSnackbar,
  } = useMediaViewer({ items, initialIndex: 0, title });

  const handleDeletePress = useCallback(() => {
    closeMenu();
    
    if (!messageId) {
      Alert.alert('Error', 'Cannot delete this video');
      return;
    }
    
    const messageToDelete = messages.find(msg => msg.id === messageId);
    if (!messageToDelete) {
      Alert.alert('Error', 'Message not found');
      return;
    }
    
    setSelectedMessageForDelete(messageToDelete);
    setDeleteModalVisible(true);
  }, [closeMenu, messageId, messages]);

  useHeaderConfig({ title, onMenuPress: openMenu });

  const containerStyle = [
    styles.container, 
    { backgroundColor: theme.colors.background }
  ];

  const handleTap = () => {
    onTap(null, 0);
  };

  return (
    <SafeAreaView 
      style={containerStyle}
      edges={['bottom']}
    >
      <View style={containerStyle}>
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={styles.videoContainer}>
          <GalleryVideo uri={uri} />
        </View>
      </TouchableWithoutFeedback>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.menuModal,
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuModal: {
    borderRadius: 8,
    padding: 8,
    minWidth: 200,
  },
});