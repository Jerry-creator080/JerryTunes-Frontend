import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (Platform.OS === 'web') return 'http://localhost:3001';
  
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
  if (!localhost) return 'http://localhost:3001';
  
  return `http://${localhost}:3001`;
};

export const API_URL = getApiUrl();

/**
 * A fetch wrapper that supports timeout and abort signals.
 * Differentiates between Timeout, Abort, and normal Network errors.
 */
export const fetchWithTimeout = async (
  resource: string,
  options: RequestInit & { timeout?: number } = {}
) => {
  const { timeout = 10000, ...fetchOptions } = options;
  
  // Create an internal abort controller if the user didn't provide a signal,
  // or wrap the existing signal to also handle timeouts.
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  // If a signal was passed in, listen to it
  if (options.signal) {
    options.signal.addEventListener('abort', () => {
      controller.abort();
    });
  }

  try {
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      // Check if it was our timeout that aborted it
      if (!options.signal?.aborted) {
        throw new Error('Request Timeout');
      }
    }
    throw error;
  }
};
