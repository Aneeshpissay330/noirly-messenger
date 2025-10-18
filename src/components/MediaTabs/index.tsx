import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import { useTheme } from '../../theme';
import MediaTab from './MediaTab';
import AudioTab from './AudioTab/index';
import DocsTab from './DocsTab';
import LinksTab from './LinksTab';
import { RouteProp, useRoute } from '@react-navigation/native';

type MediaTabsRouteParams = {
  MediaTabs: { id: string };
};

const MediaTabs = () => {
  const theme = useTheme();
  const route = useRoute<RouteProp<MediaTabsRouteParams, 'MediaTabs'>>();
  const otherUid = route.params?.id;
  const [selectedTab, setSelectedTab] = useState('media');

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'media':
        return <MediaTab otherUid={otherUid} />;
      case 'audio':
        return <AudioTab otherUid={otherUid} />;
      case 'documents':
        return <DocsTab otherUid={otherUid} />;
      case 'links':
        return <LinksTab otherUid={otherUid} />;
      default:
        return <MediaTab otherUid={otherUid} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors?.background }]}>
      <View style={styles.segmentedButtonsContainer}>
        <SegmentedButtons
          value={selectedTab}
          onValueChange={setSelectedTab}
          buttons={[
            {
              value: 'media',
              label: 'Media',
              icon: 'image',
            },
            {
              value: 'audio',
              label: 'Audio',
              icon: 'music',
            },
            {
              value: 'documents',
              label: 'Docs',
              icon: 'file-document',
            },
            {
              value: 'links',
              label: 'Links',
              icon: 'link',
            },
          ]}
          style={{
            backgroundColor: theme.colors?.surface,
            borderRadius: 8,
          }}
          theme={{
            colors: {
              primary: theme.colors?.primary,
              onSurface: theme.colors?.onSurface,
              surface: theme.colors?.surface,
              outline: (theme.colors as any)?.outline || 'rgba(0,0,0,0.2)',
              secondaryContainer: theme.colors?.primary,
              onSecondaryContainer: (theme.colors as any)?.onPrimary || '#FFFFFF',
            },
          }}
        />
      </View>
      <View style={styles.contentContainer}>
        {renderTabContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentedButtonsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contentContainer: {
    flex: 1,
  },
});

export default MediaTabs;
