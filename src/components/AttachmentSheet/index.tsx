import React from 'react';
import { StyleSheet } from 'react-native';
import { Divider, List, Modal, Portal, useTheme } from 'react-native-paper';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onPickDocument: () => void;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
  onShareLocation?: () => void;
  onPickContact?: () => void;
};

// Define components outside of render function
const CameraIcon = (props: any) => <List.Icon {...props} icon="camera" />;
const GalleryIcon = (props: any) => <List.Icon {...props} icon="image-multiple" />;
const DocumentIcon = (props: any) => <List.Icon {...props} icon="file" />;
const LocationIcon = (props: any) => <List.Icon {...props} icon="map-marker" />;
const ContactIcon = (props: any) => <List.Icon {...props} icon="account-box" />;

export default function AttachmentSheet({
  visible,
  onDismiss,
  onPickDocument,
  onOpenCamera,
  onOpenGallery,
  onShareLocation,
  onPickContact,
}: Props) {
  const theme = useTheme();
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <List.Section>
          <List.Item
            title="Camera"
            left={CameraIcon}
            onPress={onOpenCamera}
          />
          <List.Item
            title="Gallery"
            left={GalleryIcon}
            onPress={onOpenGallery}
          />
          <List.Item
            title="Document"
            left={DocumentIcon}
            onPress={onPickDocument}
          />
          {onShareLocation && (
            <>
              <Divider />
              <List.Item
                title="Location"
                left={LocationIcon}
                onPress={onShareLocation}
              />
            </>
          )}
          {onPickContact && (
            <List.Item
              title="Contact"
              left={ContactIcon}
              onPress={onPickContact}
            />
          )}
        </List.Section>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: { margin: 16, borderRadius: 16, overflow: 'hidden' },
});
