import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import { ResumableZoom } from 'react-native-zoom-toolkit';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GalleryVideo = ({ uri }: { uri: string }) => {
  const insets = useSafeAreaInsets();
  
  // Calculate available height accounting for header (~56px) and safe areas
  const availableHeight = screenHeight - 56 - insets.top - insets.bottom;
  
  console.log('GalleryVideo rendering with uri:', uri);

  return (
    <ResumableZoom
      pinchEnabled={false} // Disable pinch zoom for videos
      panEnabled={false}   // Disable pan for videos
    >
      <View style={[styles.container, { height: availableHeight }]}>
        <Video
          source={{ uri }}
          style={styles.video}
          controls
          resizeMode="contain"
          paused={false}
          onError={(error) => console.error('Video error:', error)}
          onLoad={() => console.log('Video loaded')}
          poster={undefined}
        />
      </View>
    </ResumableZoom>
  );
};

const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

export default GalleryVideo;