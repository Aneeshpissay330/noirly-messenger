import { useAppState } from '@react-native-community/hooks';
import { useIsFocused } from '@react-navigation/native';

export function useCameraLifecycle() {
  const isFocused = useIsFocused();
  const appState = useAppState();
  const isActive = isFocused && appState === 'active';
  return isActive;
}
