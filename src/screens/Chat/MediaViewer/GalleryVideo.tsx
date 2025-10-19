import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import { ResumableZoom } from 'react-native-zoom-toolkit';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GalleryVideo = ({ item, _index }: { item: any; _index: number }) => {
  const insets = useSafeAreaInsets();
  const { uri } = item;
  
  // Calculate available height accounting for header (~56px) and safe areas
  const availableHeight = screenHeight - 56 - insets.top - insets.bottom;
  
  return (
    <ResumableZoom>
      <Video
        source={{ uri }}
        style={[styles.video, { height: availableHeight }]}
        controls
        resizeMode="contain"
      />
    </ResumableZoom>
  );
};

const styles = StyleSheet.create({
  video: {
    width: screenWidth,
  },
});

export default GalleryVideo;