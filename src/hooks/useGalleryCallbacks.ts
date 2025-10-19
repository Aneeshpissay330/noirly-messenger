import { useCallback } from 'react';
import { stackTransition } from 'react-native-zoom-toolkit';

type MediaItem = { src: string; type: 'image' | 'video' };

export const useGalleryCallbacks = () => {
  const renderItem = useCallback((item: MediaItem, itemIndex: number) => {
    // This will be imported from the components
    if (item.type === 'image') {
      const GalleryImage =
        require('../screens/Chat/MediaViewer/GalleryImage').default;
      return GalleryImage({ uri: item.src, index: itemIndex });
    }
    const GalleryVideo =
      require('../screens/Chat/MediaViewer/GalleryVideo').default;
    return GalleryVideo({ uri: item.src, index: itemIndex });
  }, []);

  const keyExtractor = useCallback((item: MediaItem, itemIndex: number) => {
    return `${item.src}-${itemIndex}`;
  }, []);

  const transition = useCallback(stackTransition, []);

  return {
    renderItem,
    keyExtractor,
    transition,
  };
};
