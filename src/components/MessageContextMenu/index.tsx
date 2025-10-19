// src/components/MessageContextMenu/index.tsx
import Clipboard from '@react-native-clipboard/clipboard';
import Icon from '@react-native-vector-icons/material-design-icons';
import React from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import type { Message } from '../../types/chat';

type Props = {
  visible: boolean;
  onClose: () => void;
  message: Message;
  position: { x: number; y: number };
  isMe: boolean; // Whether the current user sent this message
  onDelete: (message: Message) => void;
  // Future props for other actions
  onInfo?: (message: Message) => void;
  onCopy?: (message: Message) => void;
  onStar?: (message: Message) => void;
  onUnstar?: (message: Message) => void;
  onTranslate?: (message: Message) => void;
  isStarred?: boolean;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// We'll build menu items dynamically to reflect Star/Unstar

export default function MessageContextMenu({
  visible,
  onClose,
  message,
  position,
  isMe,
  onDelete,
  onInfo,
  onCopy,
  onStar,
  onUnstar,
  onTranslate,
  isStarred,
}: Props) {
  const theme = useTheme();

  const handleAction = (actionId: string) => {
    onClose();
    
    switch (actionId) {
      case 'delete':
        onDelete(message);
        break;
      case 'info':
        onInfo?.(message);
        break;
      case 'copy':
        if (message.text) {
          Clipboard.setString(message.text);
        }
        onCopy?.(message);
        break;
      case 'star':
        onStar?.(message);
        break;
      case 'unstar':
        onUnstar?.(message);
        break;
      case 'translate':
        onTranslate?.(message);
        break;
    }
  };

  // Filter menu items based on user permissions
  const starToggleItem = isStarred
    ? { id: 'unstar', label: 'Unstar', icon: 'star-off-outline' }
    : { id: 'star', label: 'Star', icon: 'star-outline' };

  const menuItems = [
    { id: 'info', label: 'Info', icon: 'information-outline' },
    { id: 'copy', label: 'Copy', icon: 'content-copy' },
    starToggleItem,
    { id: 'translate', label: 'Translate', icon: 'translate' },
    { id: 'delete', label: 'Delete', icon: 'delete-outline', isDestructive: true },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    // Only show delete and info options for messages sent by current user
    if ((item.id === 'delete' || item.id === 'info') && !isMe) {
      return false;
    }
    // Only show copy option for messages with text content
    if (item.id === 'copy' && !message.text) {
      return false;
    }
    return true;
  });

  // Calculate menu position to ensure it stays within screen bounds
  const menuWidth = 150;
  const menuHeight = filteredMenuItems.length * 48;
  
  let adjustedX = position.x;
  let adjustedY = position.y;
  
  // Adjust horizontal position
  if (position.x + menuWidth > screenWidth - 20) {
    adjustedX = screenWidth - menuWidth - 20;
  }
  
  // Adjust vertical position
  if (position.y + menuHeight > screenHeight - 100) {
    adjustedY = position.y - menuHeight - 20;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[
            styles.menu,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              left: adjustedX,
              top: adjustedY,
            },
          ]}
        >
          {filteredMenuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                {
                  borderBottomColor: theme.colors.outline,
                  borderBottomWidth: index < filteredMenuItems.length - 1 ? 0.5 : 0,
                },
              ]}
              onPress={() => handleAction(item.id)}
              // Enable actionable items including info
              disabled={!(item.id === 'delete' || item.id === 'copy' || item.id === 'star' || item.id === 'unstar' || item.id === 'info')}
            >
              <Icon
                name={item.icon as any}
                size={20}
                color={
                  item.id === 'delete'
                    ? '#ef4444'
                    : item.id === 'copy' || item.id === 'star' || item.id === 'unstar' || item.id === 'info' || item.id === 'translate'
                    ? theme.colors.onSurface
                    : theme.colors.outline // Fallback disabled color
                }
              />
              <Text
                style={[
                  styles.menuItemText,
                  {
                    color: item.id === 'delete'
                      ? '#ef4444'
                      : item.id === 'copy' || item.id === 'star' || item.id === 'unstar' || item.id === 'info' || item.id === 'translate'
                      ? theme.colors.onSurface
                      : theme.colors.outline, // Disabled items are grayed out
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  menu: {
    position: 'absolute',
    minWidth: 150,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '400',
  },
});