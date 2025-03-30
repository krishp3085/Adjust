import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Define and EXPORT the structure of a calendar event we expect from the backend
export interface CalendarEvent { // Added export keyword
  id: string;
  title: string;
  startTime: string; // ISO 8601 format (e.g., "2024-03-30T10:00:00Z")
  endTime: string;   // ISO 8601 format
  description?: string;
}

// Configure default notification behavior (optional, but recommended)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests permission to send notifications.
 * Returns true if permission is granted, false otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  console.log('[NotificationService] Requesting permissions...');
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[NotificationService] Notification permissions not granted.');
    // Optionally, inform the user why permissions are needed
    // Alert.alert('Permission Required', 'Please enable notifications in settings to receive schedule reminders.');
    return false;
  }

  // Required for Android notifications
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250], // Optional vibration pattern
      lightColor: '#FF231F7C', // Optional light color
    });
  }

  console.log('[NotificationService] Permissions granted.');
  return true;
}

/**
 * Cancels all previously scheduled notifications for this app.
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[NotificationService] All previously scheduled notifications cancelled.');
  } catch (error) {
    console.error('[NotificationService] Error cancelling notifications:', error);
  }
}

/**
 * Schedules notifications based on a list of calendar events.
 * @param events An array of CalendarEvent objects.
 */
export async function scheduleNotificationsForEvents(events: CalendarEvent[]): Promise<void> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('[NotificationService] Cannot schedule notifications without permission.');
    return;
  }

  // First, cancel any old notifications to avoid duplicates
  await cancelAllScheduledNotifications();

  console.log(`[NotificationService] Scheduling ${events.length} notifications...`);

  for (const event of events) {
    try {
      const triggerDate = new Date(event.startTime);
      const now = new Date();

      // Don't schedule notifications for events in the past
      if (triggerDate <= now) {
        console.log(`[NotificationService] Skipping past event: ${event.title} at ${event.startTime}`);
        continue;
      }

      // Schedule the notification slightly before the event start time (e.g., 5 minutes)
      // Adjust the lead time as needed
      const notificationTime = new Date(triggerDate.getTime() - 5 * 60 * 1000); // 5 minutes before

      // Ensure notification time is still in the future
      if (notificationTime <= now) {
         console.log(`[NotificationService] Skipping event notification too close to now: ${event.title}`);
         continue;
      }


      await Notifications.scheduleNotificationAsync({
        content: {
          title: event.title,
          body: event.description || `Starts at ${triggerDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          sound: 'default', // Use default sound
          data: { eventId: event.id }, // Optional data payload
        },
        // Casting to 'any' to bypass strict type checking, assuming runtime handles Date
        trigger: notificationTime as any,
      });

      console.log(`[NotificationService] Scheduled: "${event.title}" for ${notificationTime.toISOString()}`);

    } catch (error) {
      console.error(`[NotificationService] Error scheduling notification for event "${event.title}":`, error);
      // Consider how to handle individual scheduling errors (e.g., log, skip, retry?)
    }
  }
  console.log('[NotificationService] Finished scheduling notifications.');
}
