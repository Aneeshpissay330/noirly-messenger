import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import Share from 'react-native-share';
import { handleStoragePermission } from '../permission';
import { convertToBase64 } from '../utils/download';

type MediaItem = { src: string; type: 'image' | 'video' };

interface UseMediaViewerProps {
  items: MediaItem[];
  initialIndex: number;
  title: string;
}

export const useMediaViewer = ({ items, initialIndex, title }: UseMediaViewerProps) => {
  const navigation = useNavigation();
  const [index, setIndex] = useState(
    Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1)),
  );
  const [menuVisible, setMenuVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const openMenu = useCallback(() => {
    setMenuVisible(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const showSnackbar = useCallback((message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbarVisible(false);
  }, []);

  const handleShare = useCallback(async () => {
    closeMenu();
    try {
      const currentItem = items[index];
      if (!currentItem?.src) {
        Alert.alert('Error', 'No media to share');
        return;
      }
      const fileUri = currentItem.src;
      const base64String = await convertToBase64(fileUri);
      const shareOptions = {
        title: 'Share file',
        url: `data:image/jpeg;base64,${base64String}`,
        failOnCancel: false,
      };
      await Share.open(shareOptions);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage !== 'User did not share' &&
        !errorMessage.includes('cancelled') &&
        !errorMessage.includes('dismiss')
      ) {
        Alert.alert('Share Failed', 'Could not share media. Please try again.');
      }
    }
  }, [items, index, closeMenu]);

  const handleDownload = useCallback(async () => {
    closeMenu();
    try {
      const currentItem = items[index];
      if (!currentItem?.src) {
        showSnackbar('No media to download');
        return;
      }

      const permissionStatus = await handleStoragePermission('check');

      if (permissionStatus !== 'granted') {
        const requestResult = await handleStoragePermission('request');

        if (requestResult !== 'granted') {
          showSnackbar('Storage permission is required to save media to your gallery');
          return;
        }
      }

      await CameraRoll.saveAsset(currentItem.src, {
        type: currentItem.type === 'video' ? 'video' : 'photo',
        album: 'ChatApp',
      });

      showSnackbar(`${currentItem.type === 'video' ? 'Video' : 'Image'} saved to gallery!`);
    } catch (error) {
      showSnackbar('Could not save media to gallery. Please check permissions.');
    }
  }, [items, index, closeMenu, showSnackbar]);

  const handleDelete = useCallback(() => {
    closeMenu();
    // Add delete functionality here
  }, [closeMenu]);

  const onIndexChange = useCallback((newIndex: number) => {
    setIndex(newIndex);
  }, []);

  const onTap = useCallback((_: any, itemIndex: number) => {
    // Handle tap event
  }, []);

  // Reset menu state when component unmounts or navigation changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      setMenuVisible(false);
    });

    return unsubscribe;
  }, [navigation]);

  return {
    index,
    menuVisible,
    openMenu,
    closeMenu,
    handleShare,
    handleDownload,
    handleDelete,
    onIndexChange,
    onTap,
    snackbarVisible,
    snackbarMessage,
    hideSnackbar,
  };
};