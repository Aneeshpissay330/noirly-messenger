// src/components/ChatBubble/MessageAudio.tsx
import React from 'react';
import AudioFilePlayer from '../AudioFilePlayer';
import type { Message } from '../../types/chat';

type Props = {
  message: Message;
  mediaUri?: string;
};

export default function MessageAudio({ message, mediaUri }: Props) {
  const isAudio = message.mime?.includes('audio/') || message.type === 'audio';
  
  if (!isAudio) return null;

  return <AudioFilePlayer filePath={mediaUri || ''} onDeleted={() => {}} />;
}