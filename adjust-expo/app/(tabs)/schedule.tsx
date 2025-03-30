import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'; // Added RefreshControl
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Use the same base URL as your other API calls
const API_BASE_URL = 'http://172.16.202.117:5000'; // Ensure this matches your backend IP/port

// Define Event Structure (matching backend)
interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  description?: string;
}

// Helper to format time as HH:MM AM/PM
const formatTime = (isoString: string): string => {
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'UTC' // Display in UTC for now
        });
    } catch {
        return 'Invalid Time';
    }
}

// Helper to format date as "Mon, Mar 30"
const formatDateHeader = (isoString: string): string => {
     try {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC'
        });
    } catch {
        return 'Invalid Date';
    }
}

export default function ScheduleScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false); // For pull-to-refresh

  // Fetch events function
  const fetchEvents = async () => {
    console.log("Fetching calendar events...");
    // Don't set isLoading true if refreshing, let RefreshControl handle indicator
    if (!refreshing) {
        setIsLoading(true);
    }
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/calendar/events`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      let data: CalendarEvent[] = await response.json();
      // Sort events by start time before setting state
      data.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setEvents(data);
      console.log(`Fetched ${data.length} events.`);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch events');
      console.error("Fetch Events Error:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false); // End pull-to-refresh indicator
    }
  };

  // Fetch events on initial mount
  useEffect(() => {
    fetchEvents();
  }, []);

  // Handler for pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, []); // Empty dependency array means this function is stable

  // Group events by date
  const eventsGroupedByDate = useMemo(() => {
    const groups: { [key: string]: CalendarEvent[] } = {};
    events.forEach(event => {
      try {
        const dateKey = event.startTime.split('T')[0]; // YYYY-MM-DD
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(event);
      } catch (e) {
        console.error("Error grouping event date:", event, e);
      }
    });
    // Sort the groups by date key
    return Object.entries(groups).sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
  }, [events]); // Re-group when events change


  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.content}>
        <Text style={styles.title}>Daily Schedule</Text>

        {/* Show loading indicator only on initial load */}
        {isLoading && !refreshing && events.length === 0 && <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />}
        {error && <Text style={styles.errorText}>Error loading schedule: {error}</Text>}

        <ScrollView
          style={styles.scrollView}
          refreshControl={ // Add pull-to-refresh
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff" // iOS spinner color
              colors={['#fff']} // Android spinner color
            />
          }
        >
          {!isLoading && eventsGroupedByDate.length === 0 && !error && (
            <Text style={styles.noEventsText}>No schedule available yet. Pull down to refresh.</Text>
          )}

          {eventsGroupedByDate.map(([dateKey, dayEvents]) => (
            <View key={dateKey} style={styles.dayGroup}>
              <Text style={styles.dateHeader}>{formatDateHeader(dayEvents[0].startTime)}</Text>
              {dayEvents.map(event => (
                <View key={event.id} style={styles.eventItem}>
                  <View style={styles.eventTiming}>
                     <Ionicons name="time-outline" size={14} color="#aaa" />
                     <Text style={styles.eventTimeText}>{formatTime(event.startTime)} - {formatTime(event.endTime)}</Text>
                  </View>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {event.description && <Text style={styles.eventDescription}>{event.description}</Text>}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// Styles remain largely the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  dayGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00AFFF',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  eventItem: {
    backgroundColor: '#282828',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  eventTiming: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
  },
  eventTimeText: {
      color: '#aaa',
      fontSize: 13,
      marginLeft: 5,
  },
  eventTitle: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  eventDescription: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 4,
  },
  errorText: {
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  noEventsText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    fontStyle: 'italic',
  },
});
