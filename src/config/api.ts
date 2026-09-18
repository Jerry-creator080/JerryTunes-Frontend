import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (Platform.OS === 'web') return 'http://localhost:3000';
  
  // Try to use hostUri first, which is standard in Expo Go
  let localhost = Constants.expoConfig?.hostUri?.split(':')[0];
  
  // Fallback: extract LAN IP from experienceUrl if on a physical device without hostUri
  if (!localhost && Constants.experienceUrl) {
    const matches = Constants.experienceUrl.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
    if (matches && matches[0]) {
      localhost = matches[0];
    }
  }
  
  // If all else fails, use localhost (will only work on simulator/web)
  if (!localhost) return 'http://localhost:3000';
  
  return `http://${localhost}:3000`;
};

export const API_URL = getApiUrl();
