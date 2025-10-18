import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useRef } from 'react';
import {
  Modal,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Menu, useTheme, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Gallery,
  type GalleryRefType,
} from 'react-native-zoom-toolkit';
import { useMediaViewer } from '../../../hooks/useMediaViewer';
import { useHeaderConfig } from '../../../hooks/useHeaderConfig';
import { useGalleryCallbacks } from '../../../hooks/useGalleryCallbacks';
import { mediaViewerStyles } from '../../../styles/mediaViewerStyles';
import GalleryImage from './GalleryImage';
import GalleryVideo from './GalleryVideo';

type MediaItem = { src: string; type: 'image' | 'video' };

type RouteParams = {
  MediaViewer: { items: MediaItem[]; initialIndex?: number; title?: string };
};

export default function MediaViewer() {
  const route = useRoute<RouteProp<RouteParams, 'MediaViewer'>>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const galleryRef = useRef<GalleryRefType>(null);
  
  const items = route.params?.items ?? [];
  const initial = route.params?.initialIndex ?? 0;
  const title = route.params?.title ?? '';

  const {
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
  } = useMediaViewer({ items, initialIndex: initial, title });

  useHeaderConfig({ title, onMenuPress: openMenu });

  const { keyExtractor, transition } = useGalleryCallbacks();

  // Optimized render item function
  const renderItem = React.useCallback((item: MediaItem, itemIndex: number) => {
    if (item.type === 'image') {
      return <GalleryImage uri={item.src} index={itemIndex} />;
    }
    return <GalleryVideo uri={item.src} index={itemIndex} />;
  }, []);

  return (
    <View
      style={[mediaViewerStyles.container, { backgroundColor: theme.colors.background }]}
    >
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
                onPress={handleDelete}
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
    </View>
  );
}