import React from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResumableZoom } from 'react-native-zoom-toolkit';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GalleryImage = ({ uri }: { uri: string }) => {
  const insets = useSafeAreaInsets();

  // Calculate available height accounting for header (~56px) and safe areas
  const availableHeight = screenHeight - 56 - insets.top - insets.bottom;

  console.log('GalleryImage rendering with uri:', uri);

  return (
    <ResumableZoom>
      <Image
        source={{ uri }}
        style={[styles.image, { height: availableHeight }]}
        resizeMode="contain"
      />
    </ResumableZoom>
  );
};

const styles = StyleSheet.create({
  image: {
    width: screenWidth,
  },
});

export default GalleryImage;
