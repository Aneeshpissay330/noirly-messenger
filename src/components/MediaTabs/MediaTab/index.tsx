import React, { useEffect, useMemo } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../app/store'; // adjust path to your store

import {
  clearChatState,
  openDmChat,
  selectChatIdByOther,
  selectMessagesByOther,
  startSubscriptions,
} from '../../../features/messages'; // adjust path to your slice

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 16 * 2 - 8 * 2) / 3;

type MediaTabProps = {
  otherUid: string;
}

const MediaTab : React.FC<MediaTabProps> = ({ otherUid }) => {
  const dispatch = useDispatch();

  const chatId = useSelector((s: RootState) =>
    otherUid ? selectChatIdByOther(s, otherUid) : undefined
  );
  const msgs = useSelector((s: RootState) => {
    const authModule = require('@react-native-firebase/auth');
    const me = authModule.default().currentUser?.uid;
    return otherUid ? selectMessagesByOther(s, otherUid, me) : [];
  });

  useEffect(() => {
    if (otherUid && !chatId) {
      dispatch(openDmChat({ otherUid }) as any);
    }
  }, [dispatch, otherUid, chatId]);

  useEffect(() => {
    if (otherUid && chatId) {
      dispatch(startSubscriptions({ otherUid, chatId, isSelf: false }) as any);
      return () => {
        dispatch(clearChatState({ otherUid }));
      };
    }
  }, [dispatch, otherUid, chatId]);

  const images = useMemo(
    () => msgs.filter(m => m.type === 'image' && !!m.url),
    [msgs]
  );

  return (
    <ScrollView contentContainerStyle={styles.grid}>
      {images.map((item) => (
        <Image key={item.id} source={{ uri: item.url! }} style={styles.cell} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  cell: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    backgroundColor: '#e5e5e5',
  },
});

export default MediaTab;
