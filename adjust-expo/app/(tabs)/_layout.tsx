import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FlightDataProvider } from '@/context/FlightDataContext'; // Import the provider

export default function TabLayout() {
  return (
    <FlightDataProvider> {/* Wrap Tabs with the provider */}
      <Tabs
        screenOptions={{
          headerShown: false, // Keep existing options or adjust as needed
        tabBarActiveTintColor: '#007AFF',
      }}>
      <Tabs.Screen
        name="sleep"
        options={{
          title: 'Sleep',
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
            <MaterialCommunityIcons name="notebook" size={size} color={color} />
          ),
        }}
      />
        {/* ... other screens ... */}
      </Tabs>
    </FlightDataProvider>
  );
}
