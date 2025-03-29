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
            <Ionicons name={item.iconName} size={24} color="#555" style={styles.icon} />
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
    backgroundColor: '#fff',
    position: 'relative', // For absolute positioning of the timeline
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
  },
  leftColumn: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: 16,
  },
  rightColumn: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 16,
  },
  timeText: {
    fontSize: 16,
    color: '#333',
  },

  // Center container for the timeline item
  centerContainer: {
    width: 150,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, // Make sure the container is above the timeline line and dot
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  icon: {
    marginRight: 8,
  },
  iconLabel: {
    fontSize: 14,
    color: '#555',
  },
});
