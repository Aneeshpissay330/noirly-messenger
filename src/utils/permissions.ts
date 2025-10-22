import { Platform, Alert } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export const checkAndRequestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    // iOS doesn't need explicit storage permission for image picker
    return true;
  }

  try {
    const androidVersion = Platform.Version as number;
    
    if (androidVersion >= 33) {
      // Android 13+ uses scoped storage
      const imagePermission = await check(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
      const videoPermission = await check(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO);
      
      if (imagePermission === RESULTS.GRANTED && videoPermission === RESULTS.GRANTED) {
        return true;
      }
      
      // Request permissions
      const imageRequest = await request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
      const videoRequest = await request(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO);
      
      return imageRequest === RESULTS.GRANTED && videoRequest === RESULTS.GRANTED;
    } else {
      // Android 12 and below
      const permission = await check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
      
      if (permission === RESULTS.GRANTED) {
        return true;
      }
      
      const result = await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
      return result === RESULTS.GRANTED;
    }
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
};

export const showPermissionDeniedAlert = () => {
  Alert.alert(
    'Permission Required',
    'Please grant storage permission to access photos and videos from your gallery.',
    [
      { text: 'OK', style: 'default' }
    ]
  );
};