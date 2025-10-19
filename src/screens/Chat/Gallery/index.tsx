import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AlbumCard from '../../../components/AlbumCard';
import {
  AlbumWithPhotos,
  getAlbumsGroupedMinimal,
} from '../../../utils/camera-roll';
import { styles as galleryStyles } from './styles';

const Gallery = () => {
  const [groupedPhotos, setGroupedPhotos] = React.useState<AlbumWithPhotos[]>([]);
  const [loading, setLoading] = React.useState(true);

  const getGroupPhotos = async () => {
    try {
      const grouped = await getAlbumsGroupedMinimal({
        perAlbum: 30,
        assetType: 'Photos',
      });
      setGroupedPhotos(grouped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getGroupPhotos();
  }, []);

  const renderAlbum = useCallback(
    ({ item }: { item: AlbumWithPhotos }) => <AlbumCard album={item} />,
    []
  );

  const keyExtractor = useCallback(
    (a: AlbumWithPhotos, index: number) => `${a.album.title}-${index}`,
    []
  );

  return (
    <FlashList
      data={groupedPhotos}
      renderItem={renderAlbum}
      keyExtractor={keyExtractor}
      contentContainerStyle={galleryStyles.listContent}
      ListEmptyComponent={loading ? <LoadingComponent /> : <EmptyComponent />}
      // FlashList v2 handles virtualization; FlatList-only props removed:
      // removeClippedSubviews, windowSize, maxToRenderPerBatch,
      // updateCellsBatchingPeriod, initialNumToRender
    />
  );
};

const LoadingComponent = () => (
  <View style={styles.emptyContainer}>
    <Text>Loading albums…</Text>
  </View>
);

const EmptyComponent = () => (
  <View style={styles.emptyContainer}>
    <Text>No albums found</Text>
  </View>
);

const styles = StyleSheet.create({
  emptyContainer: {
    padding: 24,
  },
});

export default Gallery;
