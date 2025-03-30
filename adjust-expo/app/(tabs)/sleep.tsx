import React from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

interface TimelineItem {
  departureTime: string;
  arrivalTime: string;
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
}

const timelineData: TimelineItem[] = [
  { departureTime: '08:00 AM', arrivalTime: '12:00 PM', iconName: 'airplane', label: 'Depart Flight' },
  { departureTime: '09:00 AM', arrivalTime: '01:00 PM', iconName: 'cafe', label: 'Grab Coffee' },
  { departureTime: '10:00 AM', arrivalTime: '02:00 PM', iconName: 'bed', label: 'Rest' },
];

export default function Sleep() {
  const renderItem = ({ item }: { item: TimelineItem }) => {
    return (
      <View style={styles.row}>
        {/* Left: departure time */}
        <View style={styles.leftColumn}>
          <Text style={styles.timeText}>{item.departureTime}</Text>
        </View>

        {/* Center: timeline icon container with label */}
        <View style={styles.centerContainer}>
          <View style={styles.iconTextContainer}>
            <Ionicons name={item.iconName} size={24} color="#fff" style={styles.icon} />
            <Text style={styles.iconLabel}>{item.label}</Text>
          </View>
        </View>

        {/* Right: arrival time */}
        <View style={styles.rightColumn}>
          <Text style={styles.timeText}>{item.arrivalTime}</Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Sleep' }} />
      <View style={styles.container}>
        {/* Vertical timeline line and current time dot */}
        <View style={styles.timelineContainer}>
          <View style={styles.verticalLine} />
          <View style={styles.currentTimeDot} />
        </View>

        <FlatList
          data={timelineData}
          renderItem={renderItem}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark theme background
    position: 'relative', // For absolute positioning of the timeline
    paddingVertical: 20,
  },
  listContent: {
    paddingVertical: 16,
  },

  // Timeline vertical line and current time dot
  timelineContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    alignItems: 'center',
    zIndex: 0, // Behind the timeline items
  },
  verticalLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#ccc',
  },
  currentTimeDot: {
    position: 'absolute',
    top: height * 0.4, // Adjust this to represent the current time position
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'blue',
    marginLeft: -5, // Center the dot on the line
  },

  // Row containing the departure, timeline icon container, and arrival
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
    paddingHorizontal: 20, // Space on left and right
  },
  leftColumn: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rightColumn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 16,
    color: '#fff', // White text for dark mode
  },

  // Center container for the timeline item
  centerContainer: {
    width: 200,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, // Make sure the container is above the timeline line and dot
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444', // Darker background for the container
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#666', // Subtle border color
  },
  icon: {
    marginRight: 8,
  },
  iconLabel: {
    fontSize: 14,
    color: '#fff', // White text for dark mode
  },
});
