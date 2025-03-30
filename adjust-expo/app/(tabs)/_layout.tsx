import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FlightDataProvider } from '@/context/FlightDataContext'; // Import the provider

export default function TabLayout() {
  return (
    <FlightDataProvider> {/* Wrap Tabs with the provider */}
      <Tabs
        screenOptions={{
          headerShown: false, // Keep headers hidden
          tabBarActiveTintColor: '#00AFFF', // Use the brighter blue for active
          tabBarInactiveTintColor: '#8e8e93', // Standard iOS inactive gray, good contrast on dark
          tabBarStyle: {
            backgroundColor: '#121212', // Dark background for the tab bar
            borderTopColor: '#333', // Optional: subtle top border
            // paddingBottom: 5, // Optional: Adjust padding if needed
            // height: 60, // Optional: Adjust height if needed
          },
          // tabBarLabelStyle: { // Optional: Style the labels if needed
          //   fontSize: 10,
          //   fontWeight: '500',
          // },
      }}>
      <Tabs.Screen
        name="schedule" // Renamed from sleep
        options={{
          title: 'Schedule', // Updated title
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="moon" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="boarding"
        options={{
          title: 'Boarding Pass',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="airplane" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: 'Summary',
          tabBarIcon: ({ size, color }) => (
            <MaterialCommunityIcons name="notebook" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ size, color }) => (
            <MaterialCommunityIcons name="heart-pulse" size={size} color={color} /> // Changed icon
          ),
        }}
      />
        {/* ... other screens ... */}
      </Tabs>
    </FlightDataProvider>
  );
}
