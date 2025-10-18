export type Message = {
  id: string;
  text?: string;
  createdAt: string;
  userId: string; // legacy field for UI compatibility
  senderId?: string; // Firestore field
  userName?: string;
  userAvatar?: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'file';
  url?: string; // original/remote url or local file path after download
  localPath?: string; // local filesystem path if downloaded
  downloadStatus?: 'idle' | 'pending' | 'downloading' | 'done' | 'failed';
  width?: number;
  height?: number;
  size?: number;
  name?: string;
  mime?: string;
  deletedFor?: string[]; // users who have deleted this message for themselves
  /** Local-only flag: whether the user starred this message. Persisted via redux-persist, not Firestore. */
  starred?: boolean;
  /** Optional per-user delivery timestamps (ISO strings) keyed by uid */
  deliveredAt?: Record<string, string>;
  /** Optional per-user read timestamps (ISO strings) keyed by uid */
  readAt?: Record<string, string>;
};

export type SendPayload = {
  text?: string;
  files?: Array<{ uri: string; name: string; type: string; size?: number }>;
  image?: { uri: string };
  audio?: { uri: string; duration?: number };
};

// types/chat.ts

export type ChatRow = {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  date: string;
  unreadCount: number;
  pinned: boolean;
  online: boolean;
};
