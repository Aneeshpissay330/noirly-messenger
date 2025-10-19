// src/components/ChatBubble/MessageAudio.tsx
import React from 'react';
import type { Message } from '../../types/chat';
import AudioFilePlayer from '../AudioFilePlayer';

type Props = {
  message: Message;
  mediaUri?: string;
};

export default function MessageAudio({ message, mediaUri }: Props) {
  const isAudio = message.mime?.includes('audio/') || message.type === 'audio';

  if (!isAudio) return null;

  return <AudioFilePlayer filePath={mediaUri || ''} onDeleted={() => {}} />;
}
