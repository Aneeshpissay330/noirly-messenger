import React from 'react';
import { Image, StyleProp, View, ViewStyle, StyleSheet } from 'react-native';
import { MinimalPhoto } from '../../utils/camera-roll';

type Props = {
  item: MinimalPhoto;
  size: number;
  style?: StyleProp<ViewStyle>;
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});

const MemoImage = React.memo(Image);

const PhotoItemBase = ({ item, size, style }: Props) => {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <MemoImage
        source={{ uri: item.url }}
        style={styles.image}
        resizeMode="cover"
        resizeMethod="resize" // Android: decode closer to target size
        // fadeDuration={0 as any} // Android: avoid white fade-in
      />
    </View>
  );
};

const PhotoItem = React.memo(
  PhotoItemBase,
  (prev, next) =>
    prev.size === next.size &&
    prev.item.url === next.item.url && // compare only what the view actually uses
    prev.style === next.style,
);

export default PhotoItem;
