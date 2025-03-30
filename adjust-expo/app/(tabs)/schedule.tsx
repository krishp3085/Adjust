import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Pressable, Modal, TouchableOpacity } from 'react-native'; // Added Pressable, Modal, TouchableOpacity
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
            // Consider using the device's local timezone or the destination timezone if available
            // timeZone: 'UTC' // Display in UTC for now
        });
    } catch {
        return 'Invalid Time';
    }
}

// Helper to format date header (e.g., "Today", "Tomorrow", "Mon, Mar 30")
const formatDateHeader = (dateKey: string): string => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date
        const eventDate = new Date(dateKey + 'T00:00:00Z'); // Treat dateKey as UTC date start
        eventDate.setHours(0, 0, 0, 0); // Normalize event date

        // Removed logic for "Today" / "Tomorrow"
        // Always return the formatted date
        return eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC' // Keep consistent with grouping logic
        });
    } catch {
        return 'Invalid Date';
    }
}

// Helper to map event titles to Ionicons names
const getEventIcon = (title: string): keyof typeof Ionicons.glyphMap => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('sleep') || lowerTitle.includes('nap') || lowerTitle.includes('bedtime')) {
        return 'moon-outline';
    } else if (lowerTitle.includes('light') || lowerTitle.includes('sun')) {
        return 'sunny-outline';
    } else if (lowerTitle.includes('caffeine') || lowerTitle.includes('coffee') || lowerTitle.includes('tea')) {
        return 'cafe-outline';
    } else if (lowerTitle.includes('meal') || lowerTitle.includes('food') || lowerTitle.includes('eat') || lowerTitle.includes('breakfast') || lowerTitle.includes('lunch') || lowerTitle.includes('dinner')) {
        return 'restaurant-outline';
    } else if (lowerTitle.includes('exercise') || lowerTitle.includes('walk') || lowerTitle.includes('run') || lowerTitle.includes('gym')) {
        return 'barbell-outline';
    } else if (lowerTitle.includes('hydrate') || lowerTitle.includes('water') || lowerTitle.includes('drink')) {
        return 'water-outline';
    } else if (lowerTitle.includes('departure') || lowerTitle.includes('flight') || lowerTitle.includes('arrive') || lowerTitle.includes('arrival')) {
        return 'airplane-outline';
    }
    // Default icon
    return 'time-outline';
};

// Helper to format title for display (remove parentheses and text after semicolon or colon)
const formatDisplayTitle = (title: string): string => {
    if (!title) return '';
    // Remove content within parentheses
    let formatted = title.replace(/\(.*?\)/g, '');
    // Remove content after a semicolon OR a colon
    const semiColonIndex = formatted.indexOf(';');
    const colonIndex = formatted.indexOf(':');

    let stopIndex = -1;
    if (semiColonIndex !== -1 && colonIndex !== -1) {
        stopIndex = Math.min(semiColonIndex, colonIndex);
    } else if (semiColonIndex !== -1) {
        stopIndex = semiColonIndex;
    } else if (colonIndex !== -1) {
        stopIndex = colonIndex;
    }

    if (stopIndex !== -1) {
        formatted = formatted.substring(0, stopIndex);
    }

    return formatted.trim(); // Trim whitespace
};


export default function ScheduleScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Fetch events function (remains the same)
  const fetchEvents = async () => {
    console.log("Fetching calendar events...");
    if (!refreshing) setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/calendar/events`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      let data: CalendarEvent[] = await response.json();
      data.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setEvents(data);
      console.log(`Fetched ${data.length} events.`);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch events');
      console.error("Fetch Events Error:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, []);

  // Group events by date (remains the same)
  const eventsGroupedByDate = useMemo(() => {
    const groups: { [key: string]: CalendarEvent[] } = {};
    events.forEach(event => {
      try {
        const dateKey = event.startTime.split('T')[0]; // YYYY-MM-DD
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(event);
      } catch (e) { console.error("Error grouping event date:", event, e); }
    });
    return Object.entries(groups).sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
  }, [events]);

  // Handle opening the modal
  const handleEventPress = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  // Handle closing the modal
  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedEvent(null); // Clear selected event
  };

  // Component to render the event content (icon + text)
  // Added margin directly to button based on side
  const EventContent = ({ event, side }: { event: CalendarEvent, side: 'left' | 'right' }) => (
    <Pressable
      style={[
        styles.eventContentPressable,
        side === 'left' ? styles.eventContentLeft : styles.eventContentRight
      ]}
      onPress={() => handleEventPress(event)}
    >
      <View style={[
          styles.eventButton,
          // Apply margin between button and text based on side
          side === 'left' ? { marginLeft: 15 } : { marginRight: 15 }
        ]}>
        <Ionicons name={getEventIcon(event.title)} size={24} color="#00AFFF" />
      </View>
      <Text
        style={[
          styles.eventTitleText,
          // Apply text alignment based on side
          side === 'left' ? { textAlign: 'right' } : { textAlign: 'left' }
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {formatDisplayTitle(event.title)}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.content}>
        {/* Keep the title, but maybe adjust styling if needed */}
        {/* <Text style={styles.title}>Daily Schedule</Text> */}

        {isLoading && !refreshing && events.length === 0 && <ActivityIndicator color="#fff" style={{ marginTop: 50 }} />}
        {error && <Text style={styles.errorText}>Error loading schedule: {error}</Text>}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" colors={['#fff']} />
          }
        >
          {!isLoading && eventsGroupedByDate.length === 0 && !error && (
            <Text style={styles.noEventsText}>No schedule available yet. Pull down to refresh.</Text>
          )}

          {/* Iterate through grouped events */}
          {eventsGroupedByDate.map(([dateKey, dayEvents], dayIndex) => (
            <View key={dateKey} style={styles.dayGroup}>
              {/* Date Header - Now at the top of the group */}
              <Text style={styles.dateHeaderText}>{formatDateHeader(dateKey)}</Text>

              {/* Timeline Events Area */}
              <View style={styles.timelineEventsContainer}>
                {dayEvents.map((event, eventIndex) => (
                  <View key={event.id} style={styles.timelineEventRow}>
                    {/* Left Content Area */}
                    <View style={styles.leftContentArea}>
                      {eventIndex % 2 === 0 && <EventContent event={event} side="left" />}
                    </View>

                    {/* Timeline Line and Dot - Centered */}
                    <View style={styles.timelineLineContainer}>
                      {/* Only draw line above if not the first event of the day */}
                      {eventIndex > 0 && <View style={styles.timelineLineUpper} />}
                      <View style={styles.timelineDot} />
                      {/* Only draw line below if not the last event of the day */}
                      {eventIndex < dayEvents.length - 1 && <View style={styles.timelineLineLower} />}
                    </View>

                    {/* Right Content Area */}
                    <View style={styles.rightContentArea}>
                       {eventIndex % 2 !== 0 && <EventContent event={event} side="right" />}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={handleCloseModal}
        >
          <Pressable style={styles.modalBackdrop} onPress={handleCloseModal}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalView}>
                <View style={styles.modalHeader}>
                  <Ionicons name={getEventIcon(selectedEvent.title)} size={28} color="#00AFFF" style={styles.modalIcon} />
                  <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
                </View>
                <Text style={styles.modalTimeText}>
                  {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}
                </Text>
                {selectedEvent.description && (
                  <Text style={styles.modalDescriptionText}>{selectedEvent.description}</Text>
                )}
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Match summary screen background
  },
  content: {
    flex: 1,
    paddingTop: 60, // Adjust top padding as needed
    // Removed horizontal padding, handled by dayGroup
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
     paddingHorizontal: 15, // Add horizontal padding to scroll content
     paddingBottom: 40, // Padding at the bottom
  },
  dayGroup: {
    // flexDirection: 'row', // REMOVED - Now column layout
    marginBottom: 35, // Increased space between date groups
    // alignItems: 'flex-start', // Not needed for column
  },
  // dateHeaderContainer REMOVED - integrated into dayGroup
  dateHeaderText: {
    fontSize: 24, // Further increased date header size
    fontWeight: 'bold',
    color: '#00AFFF', // Accent color
    marginBottom: 15, // Space below date header
    // textAlign: 'center', // Center if desired, or keep left
  },
  timelineEventsContainer: { // New container for the events below the date
    // Styles if needed, e.g., padding
  },
  timelineArea: { // This style might be redundant now or repurposed
    flex: 1,
    // paddingLeft: 5, // REMOVED - Handled differently now
  },
  timelineEventRow: {
    flexDirection: 'row', // Use row layout for left/center/right areas
    alignItems: 'center', // Vertically align items in the row
    minHeight: 70, // Keep minimum height
    width: '100%', // Ensure row takes full width
    // backgroundColor: 'rgba(0, 255, 0, 0.1)', // Debugging row bounds
  },
  leftContentArea: {
    flex: 1, // Take up space to the left of the line
    // backgroundColor: 'rgba(0, 0, 255, 0.1)', // Debugging
    paddingRight: 25, // Consistent gap from center line
  },
  rightContentArea: {
    flex: 1, // Take up space to the right of the line
    // backgroundColor: 'rgba(255, 255, 0, 0.1)', // Debugging
    paddingLeft: 25, // Consistent gap from center line
  },
  timelineLineContainer: {
    // position: 'absolute', // REMOVED - Now part of flex row
    // left: '50%',
    // top: 0,
    // bottom: 0,
    width: 30, // Keep width for dot centering
    // marginLeft: -15, // REMOVED
    height: '100%', // Ensure it spans the row height for line drawing
    alignItems: 'center', // Center dot within this container
    // backgroundColor: 'rgba(255, 0, 0, 0.1)', // Debugging line container bounds
  },
  timelineLineUpper: {
    flex: 1, // Takes space above the dot
    width: 3, // Thicker line
    backgroundColor: '#555', // Slightly lighter line color
  },
  timelineDot: {
    width: 16, // Larger dot
    height: 16, // Larger dot
    borderRadius: 8, // Keep it circular
    backgroundColor: '#00AFFF', // Dot color (accent)
    marginVertical: 5, // Slightly more space around the dot
    zIndex: 1, // Ensure dot is above lines
    borderWidth: 2, // Add border to dot
    borderColor: '#121212', // Match background to make it look 'hollow' if line passes behind
  },
  timelineLineLower: {
    flex: 1, // Takes space below the dot
    width: 3, // Thicker line
    backgroundColor: '#555', // Slightly lighter line color
  },
  // eventButtonContainer and its variants REMOVED - Replaced by EventContent component and left/right areas
  eventContentPressable: { // Style for the Pressable containing icon and text
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: 'rgba(255, 0, 255, 0.1)', // Debugging
    minHeight: 48, // Ensure pressable area is decent size
  },
  eventContentLeft: {
    justifyContent: 'flex-end', // Align content to the right (near the line)
    flexDirection: 'row-reverse', // Text then Button
  },
  eventContentRight: {
    justifyContent: 'flex-start', // Align content to the left (near the line)
    // flexDirection: 'row', // Default
  },
  eventButton: {
    padding: 12,
    backgroundColor: '#282828',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
    // Margin applied inline based on side
  },
  eventTitleText: { // Base style for event title
    fontSize: 16,
    fontWeight: '500',
    color: '#E0E0E0',
    flexShrink: 1, // Important for text truncation
    flex: 1, // Allow text to take available space within its container
    // Text alignment applied inline based on side
  },
  // eventTitleTextLeft/Right REMOVED - Handled inline
  errorText: {
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  noEventsText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 60,
    fontSize: 16,
    fontStyle: 'italic',
  },
  // --- Modal Styles (adapted from CustomAlertModal) ---
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Slightly darker backdrop
  },
  modalView: {
    margin: 20,
    backgroundColor: '#282828', // Dark background
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
    borderWidth: 1,
    borderColor: '#444',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    justifyContent: 'center',
  },
  modalIcon: {
    marginRight: 10,
  },
  modalTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E0E0E0',
    flexShrink: 1, // Allow title to wrap if long
  },
  modalTimeText: {
    fontSize: 15,
    color: '#aaa',
    marginBottom: 15,
  },
  modalDescriptionText: {
    marginBottom: 25, // More space before button
    textAlign: 'center',
    fontSize: 16,
    color: '#cccccc',
    lineHeight: 22,
  },
  modalButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 35,
    elevation: 2,
    marginTop: 10,
    backgroundColor: '#007AFF', // Consistent button color
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});
