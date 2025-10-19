import React from 'react';
import { StyleSheet, View } from 'react-native';
import MediaPreviewRow from '../../../../MediaPreviewRow';

export default function Media() {
  return (
    <View style={styles.container}>
      <MediaPreviewRow />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
