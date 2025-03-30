import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image, Keyboard, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router'; // Use useRouter for navigation
import { useFlightData } from '../../context/FlightDataContext'; // Import the context hook

export default function BoardingScreen() {
  // Local state for inputs ONLY
  const [carrierCode, setCarrierCode] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [departureDate, setDepartureDate] = useState('');

  // Get context functions and state
  const { fetchFlightData, isLoading, error } = useFlightData();
  const router = useRouter(); // Use router for navigation

  const handleFetchAndNavigate = async () => {
    Keyboard.dismiss(); // Dismiss keyboard before fetching

    // Basic validation (context also validates, but good to have here too)
    if (!carrierCode || !flightNumber || !departureDate) {
      Alert.alert('Missing Information', 'Please enter Carrier Code, Flight Number, and Departure Date.');
      return;
    }
     if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
        Alert.alert('Invalid Date Format', 'Please enter the date in YYYY-MM-DD format.');
        return;
    }


    const success = await fetchFlightData(carrierCode.toUpperCase(), flightNumber, departureDate); // Convert carrier code to uppercase
    if (success) {
      // Navigate to the summary tab after successful fetch
      router.push('/(tabs)/summary'); // Use router.push for tab navigation
    } else {
      // Error is handled by displaying the 'error' state from context below
      // Optionally show an alert here too if desired
      // Alert.alert('Error', 'Failed to fetch flight data. Please check details and try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05' }} // Keep background image
        style={[StyleSheet.absoluteFillObject, { opacity: 0.2 }]}
      />
      <LinearGradient colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.content}>
        <Text style={styles.title}>Enter Flight Information</Text>

        <TextInput
          style={styles.input}
          placeholder="Carrier Code (e.g., UA, AA)"
          placeholderTextColor="#888"
          value={carrierCode}
          onChangeText={setCarrierCode}
          autoCapitalize="characters" // Helps with carrier codes
          maxLength={2} // Carrier codes are usually 2 letters
        />

        <TextInput
          style={styles.input}
          placeholder="Flight Number (e.g., 1234)"
          placeholderTextColor="#888"
          value={flightNumber}
          onChangeText={setFlightNumber}
          keyboardType="numeric" // Flight numbers are typically numeric
        />

        <TextInput
          style={styles.input}
          placeholder="Departure Date (YYYY-MM-DD)"
          placeholderTextColor="#888"
          value={departureDate}
          onChangeText={setDepartureDate}
          maxLength={10} // YYYY-MM-DD
        />

        {/* Display loading indicator based on context state */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={handleFetchAndNavigate} // Use the new handler
          >
            <Ionicons name="paper-plane-outline" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Get AI Travel Plan</Text>
          </TouchableOpacity>
        )}

        {/* Display error message based on context state */}
        {error && !isLoading ? ( // Only show error if not loading
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {/* Removed the results display section from here */}

      </View>
    </View>
  );
}

// Keep existing styles, maybe adjust input width/margins if needed
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Fallback background
  },
  content: {
    padding: 20,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30, // Increased margin
    textAlign: 'center',
  },
  input: {
    width: '90%', // Slightly wider
    padding: 15, // More padding
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    marginBottom: 15, // Adjusted margin
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#555',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 30, // Wider padding
    borderRadius: 12,
    marginVertical: 20,
    shadowColor: '#000', // Add shadow for depth
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  loading: {
    marginVertical: 46, // Match button vertical space roughly
  },
  errorText: {
    color: '#FF6B6B', // Brighter red for dark background
    backgroundColor: 'rgba(255, 107, 107, 0.1)', // Subtle background
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 15, // Slightly smaller
    marginTop: 15,
    textAlign: 'center',
    maxWidth: '90%',
  },
  // Removed resultContainer styles as results are shown on summary page
});
