import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { setSystemBrightness } from '../services/expo-brightness';

// Define brightness levels
const DAY_BRIGHTNESS = 0.8; // Example: 80% brightness during the day
const NIGHT_BRIGHTNESS = 0.2; // Example: 20% brightness during the night
const DAY_START_HOUR = 7; // Example: Day starts at 7 AM
const NIGHT_START_HOUR = 20; // Example: Night starts at 8 PM (20:00)

/**
 * Custom hook to automatically adjust screen brightness based on the time of day.
 * Currently supports Android only due to expo-brightness limitations.
 */
export function useAutoBrightness() {
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const adjustBrightnessBasedOnTime = useCallback(async () => {
    console.log('[useAutoBrightness] Adjusting brightness based on time...');
    const currentHour = new Date().getHours();
    let targetBrightness: number;

    if (currentHour >= DAY_START_HOUR && currentHour < NIGHT_START_HOUR) {
      targetBrightness = DAY_BRIGHTNESS;
      console.log(`[useAutoBrightness] Setting DAY brightness: ${targetBrightness}`);
    } else {
      targetBrightness = NIGHT_BRIGHTNESS;
      console.log(`[useAutoBrightness] Setting NIGHT brightness: ${targetBrightness}`);
    }

    try {
      await setSystemBrightness(targetBrightness);
      console.log(`[useAutoBrightness] Brightness set to ${targetBrightness}`);
    } catch (error) {
      console.error('[useAutoBrightness] Failed to set brightness:', error);
    }
  }, []);

  useEffect(() => {
    // Function to handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[useAutoBrightness] App has come to the foreground!');
        adjustBrightnessBasedOnTime(); // Adjust brightness immediately when app becomes active
      }
      appState.current = nextAppState;
      console.log('[useAutoBrightness] AppState:', appState.current);
    };

    // Run once on mount
    adjustBrightnessBasedOnTime();

    // Set up interval to check periodically (e.g., every 5 minutes)
    intervalRef.current = setInterval(adjustBrightnessBasedOnTime, 5 * 60 * 1000); // 5 minutes

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup on unmount
    return () => {
      subscription.remove();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('[useAutoBrightness] Cleared interval.');
      }
    };
  }, [adjustBrightnessBasedOnTime]); // Dependency array includes the memoized function

  // This hook doesn't need to return anything for now
}
