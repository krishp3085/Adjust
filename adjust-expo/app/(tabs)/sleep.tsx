// sleep.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

const { height, width } = Dimensions.get('window');

interface TimelineItem {
  departureTime: string;
  arrivalTime: string;
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  section?: string;
}

const timelineData: TimelineItem[] = [
  { departureTime: '08:00 AM', arrivalTime: '12:00 PM', iconName: 'airplane', label: 'Depart Flight', section: 'Pre-Flight' },
  { departureTime: '09:00 AM', arrivalTime: '01:00 PM', iconName: 'cafe', label: 'Grab Coffee', section: 'In-Flight' },
  { departureTime: '10:00 AM', arrivalTime: '02:00 PM', iconName: 'bed', label: 'Rest', section: 'In-Flight' },
];

export default function Sleep() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const positionAnim = useRef(new Animated.Value(height * 0.2)).current;

  const shiftingColors: { outer: [string, string] }[] = [
    { outer: ['#FFE299', '#2376DD'] },
    { outer: ['#E0C3FC', '#B2C8FF'] },
    { outer: ['#CF8BF3', '#FFB6B9'] },
    { outer: ['#F8CDDA', '#1D2B64'] },
  ];

  const getTimeIndex = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 8) return 0;
    if (hour >= 8 && hour < 17) return 1;
    if (hour >= 17 && hour < 20) return 2;
    return 3;
  };

  const [outerColors, setOuterColors] = useState<[string, string]>(shiftingColors[getTimeIndex()].outer);

  const flightStart = new Date();
  flightStart.setHours(8, 0, 0, 0);
  const flightEnd = new Date();
  flightEnd.setHours(14, 0, 0, 0);

  const getProgress = (): number => {
    const now = new Date();
    const total = flightEnd.getTime() - flightStart.getTime();
    const elapsed = now.getTime() - flightStart.getTime();
    return Math.max(0, Math.min(1, elapsed / total));
  };

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 3000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0.4, duration: 3000, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.6, duration: 3000, useNativeDriver: true }),
        ]),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 15000,
        useNativeDriver: true,
      })
    ).start();

    const interval = setInterval(() => {
      const progress = getProgress();
      const y = height * (0.2 + progress * 0.6);
      Animated.timing(positionAnim, {
        toValue: y,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }, 1000);

    const updateColor = () => {
      const nextIndex = getTimeIndex();
      setOuterColors(shiftingColors[nextIndex].outer);
    };

    updateColor();
    const colorInterval = setInterval(updateColor, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(colorInterval);
    };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderSectionHeader = (section: string) => (
    <View style={styles.sectionHeaderContainer}>
      <Text style={styles.sectionHeaderText}>{section}</Text>
    </View>
  );

  const renderItem = ({ item, index }: { item: TimelineItem; index: number }) => {
    const showSection = index === 0 || timelineData[index - 1].section !== item.section;
    return (
      <>
        {showSection && renderSectionHeader(item.section || '')}
        <View style={styles.row}>
          <View style={styles.leftColumn}>
            <Text style={styles.timeText}>{item.departureTime}</Text>
          </View>
          <View style={styles.centerContainerOverlay}>
            <View style={styles.iconTextContainer}>
              <Ionicons name={item.iconName} size={24} color="#fff" style={styles.icon} />
              <Text style={styles.iconLabel}>{item.label}</Text>
            </View>
          </View>
          <View style={styles.rightColumn}>
            <Text style={styles.timeText}>{item.arrivalTime}</Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Sleep' }} />
      <View style={styles.container}>
        <Animated.View
          style={[styles.pulsingGlow, {
            transform: [
              { translateX: -150 },
              { translateY: -150 },
              { scale: pulseAnim },
              { rotate: spin },
            ],
            opacity: opacityAnim,
          }]}
        >
        </Animated.View>

        <View style={styles.timelineContainer}>
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 2,
              height: positionAnim,
              backgroundColor: '#b67ee6',
              borderRadius: 1,
              zIndex: 1,
            }}
          />
          <View style={styles.verticalLine} />
          <Animated.View
            style={[styles.timeCircle, {
              top: positionAnim,
              transform: [{ translateX: -10 }],
            }]}
          />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    position: 'relative',
    justifyContent: 'center',
  },
  pulsingGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 300,
    height: 300,
    borderRadius: 150,
    zIndex: 0,
    overflow: 'hidden',
  },
  listContent: {
    paddingVertical: 16,
    zIndex: 3,
  },
  timelineContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    alignItems: 'center',
    zIndex: 1,
  },
  verticalLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#ccc',
  },
  timeCircle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#b67ee6',
    left: '50%',
    zIndex: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
    paddingHorizontal: 20,
    zIndex: 3,
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
    color: '#fff',
  },
  centerContainerOverlay: {
    width: 200,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#666',
  },
  icon: {
    marginRight: 8,
  },
  iconLabel: {
    fontSize: 14,
    color: '#fff',
  },
  sectionHeaderContainer: {
    marginTop: 30,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  sectionHeaderText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
});
