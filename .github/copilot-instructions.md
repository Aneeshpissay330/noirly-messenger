# Copilot Instructions for Chat App

## Project Overview
A React Native chat application built with TypeScript, Firebase, and Redux Toolkit. Features real-time messaging, media sharing, voice/video calls via Stream Video SDK, and comprehensive camera/media handling.

## Architecture

### State Management
- **Redux Toolkit** with Redux Persist for offline-first chat state
- Slices: `contacts`, `chats`, `messages`, `onboarding` in `src/features/`
- Firebase real-time subscriptions managed via Redux async thunks
- Store configuration: `src/app/store.ts` with AsyncStorage persistence

### Firebase Integration
- **Authentication**: Google Sign-in flow with automatic Firestore user document creation
- **Firestore**: Collections for `users`, `chats`, `messages` with real-time subscriptions
- **Storage**: Media uploads with automatic thumbnail generation
- **FCM**: Push notifications with device token management in `users/{uid}/devices/`
- **Project ID**: `chat-app-e1129` (visible in `google-services.json`)

### Navigation Flow
1. **Onboarding** → **Google Auth** → **Main App** (conditional rendering in `src/navigation/index.tsx`)
2. Stack-based navigation with bottom tabs for main chat interface
3. Camera screens use modal-style presentation

## Key Development Patterns

### Firebase Service Layer
Located in `src/services/`:
- `chat.ts`: Chat creation, message CRUD, real-time subscriptions
- `fcm.ts`: Push notification token management 
- `avatar.ts`: Profile image upload with Firebase Storage
- `media.ts`: File uploads with automatic compression/thumbnails

### Custom Hooks Architecture
Comprehensive hook library in `src/hooks/`:
- **Media**: `useAudioPlayer`, `useAudioRecorder`, `useMediaViewer`
- **Camera**: `useCameraPermissions`, `useCameraLifecycle`, `useRecordingControls`
- **Firebase**: `useFirebaseAuth`, `useUserDoc`, `useGoogleSignIn`
- **UI**: `useTimer`, `useKeyboardStatus`, `useHeaderConfig`

### Media Handling
- **Vision Camera**: Full-featured camera with photo/video capture in `src/screens/Chat/CameraScreen/`
- **Image Picker**: Gallery access with cropping capabilities
- **Audio Recording**: Custom recorder with real-time frequency visualization
- **Permissions**: Platform-specific permission handling in `src/permission/index.tsx`

### Message Types & State
Messages support multiple types: `text`, `image`, `video`, `audio`, `file`
Status progression: `pending` → `sent` → `delivered` → `read`
Real-time status updates via Firestore listeners

## Development Workflows

### Running the App
```bash
# Start Metro bundler
npm start

# iOS (requires CocoaPods)
bundle install && bundle exec pod install
npm run ios

# Android
npm run android
```

### Firebase Configuration
- Android: `android/app/google-services.json` 
- iOS: Firebase configuration in Xcode project
- FCM tokens automatically registered on auth state change

### Build Configuration
- **Minimum SDK**: Android 24, iOS 15.1
- **NDK Version**: 27.1.12297006
- **Target SDK**: Android 36
- Signing keys: `android/app/chat-app.keystore`

## Critical Implementation Details

### Real-time Subscriptions
Firebase listeners are managed in Redux thunks with automatic cleanup:
```typescript
// Pattern used throughout features/
const unsubscribe = subscribeMessages(chatId, (messages) => {
  dispatch(setMessages(messages));
});
```

### Media Upload Flow
1. Capture/select media → 2. Local preview → 3. Upload to Firebase Storage → 4. Send message with downloadURL
Key files: `services/media.ts`, `utils/download.ts`

### Theme System
Custom theme based on React Native Paper with platform-specific font handling:
- Android: Custom DotGothic16 font family
- iOS/Web: Fallback to system fonts
- Dark/light mode support with automatic switching

### Permission Handling
Complex permission management for Android 13+ scoped storage:
- `READ_MEDIA_IMAGES` + `READ_MEDIA_VIDEO` for Android 13+
- `READ_EXTERNAL_STORAGE` for Android <13
- Camera/microphone permissions via react-native-vision-camera

## Common Gotchas

1. **File paths**: Use `file://` prefix consistently for local media files
2. **Android permissions**: Check both image AND video permissions for Android 13+
3. **FCM registration**: Happens automatically on auth state change, not app launch
4. **Redux persistence**: State automatically persists; avoid manual AsyncStorage calls
5. **Camera lifecycle**: Camera component only active when screen is focused AND app is foreground

## Key Files to Understand
- `src/navigation/index.tsx`: App navigation flow logic
- `src/hooks/useFirebaseAuth.ts`: Authentication state management
- `src/features/messages/index.ts`: Chat message state & async actions
- `src/services/chat.ts`: Core Firebase chat operations
- `src/components/ChatBubble/index.tsx`: Message rendering with media support