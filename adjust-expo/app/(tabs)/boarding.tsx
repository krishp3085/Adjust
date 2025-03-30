import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image, Keyboard, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useFlightData } from '../../context/FlightDataContext';

export default function BoardingScreen() {
  // State for inputs
  const [flightCode, setFlightCode] = useState(''); // Combined flight code (e.g., UA2116)
  const [date, setDate] = useState<Date | undefined>(undefined); // Date object for picker
  const [showDatePicker, setShowDatePicker] = useState(false); // To toggle picker visibility

  // Context and navigation
  // Use setInputFlightDetails instead of fetchFlightData directly here
  const { setInputFlightDetails, isLoading, error } = useFlightData();
  const router = useRouter();

  // Handler for date selection
  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios'); // Keep open on iOS until dismissed
    if (currentDate) {
        setDate(currentDate);
    }
  };

  // Handler for saving flight inputs and navigating
  const handleSaveInputsAndNavigate = () => {
    Keyboard.dismiss();

    // Validation
    if (!flightCode || !date) {
      Alert.alert('Missing Information', 'Please enter Flight Code and select a Departure Date.');
      return;
    }

    // Parse flight code (assuming 2 letters + numbers)
    const potentialCarrierCode = flightCode.substring(0, 2).toUpperCase();
    const potentialFlightNumber = flightCode.substring(2);

    // Validate flight code format
    if (!/^[A-Z]{2}$/.test(potentialCarrierCode) || !/^\d{1,4}$/.test(potentialFlightNumber)) {
        Alert.alert('Invalid Flight Code', 'Please enter the code in the format AA1234 (2 letters followed by numbers).');
        return;
    }

    // Format date to YYYY-MM-DD
    const formattedDate = date.toISOString().split('T')[0];

    // Save inputs to context
    setInputFlightDetails({
        carrierCode: potentialCarrierCode,
        flightNumber: potentialFlightNumber,
        departureDate: formattedDate
    });

    // Navigate to the Health tab (or Summary, depending on desired flow)
    // Let's navigate to Health tab to prompt sync/generate
    router.push('/(tabs)/health');
    // Optionally show a success message here if needed
    // Alert.alert('Flight Info Saved', 'Go to the Health tab to sync data and generate your plan.');

  };

  return (
    <View style={styles.container}>
      {/* Background Image and Gradient */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05' }}
        style={[StyleSheet.absoluteFillObject, { opacity: 0.2 }]}
      />
      <LinearGradient colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.content}>
        <Text style={styles.title}>Enter Flight Information</Text>

        {/* Combined Flight Code Input */}
        <TextInput
          style={styles.input}
          placeholder="Flight Code (e.g., UA2116)"
          placeholderTextColor="#888"
          value={flightCode}
          onChangeText={setFlightCode}
          autoCapitalize="characters"
          maxLength={6} // Adjust as needed (e.g., AA1234)
        />

        {/* Date Picker Trigger Button */}
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
          <Ionicons name="calendar-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.datePickerButtonText}>
            {date ? date.toLocaleDateString() : 'Select Departure Date'}
          </Text>
        </TouchableOpacity>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={date || new Date()} // Default to today if no date selected
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            // minimumDate={new Date()} // Optional: Prevent selecting past dates
          />
        )}

        {/* Loading Indicator or Submit Button */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={handleSaveInputsAndNavigate} // Use the new handler
          >
            <Ionicons name="save-outline" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Save Flight Info</Text> {/* Updated Button Text */}
          </TouchableOpacity>
        )}

        {/* Error Message Display */}
        {error && !isLoading && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    </View>
  );
}

// Styles (kept similar to previous version)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '90%',
    padding: 15,
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#555',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    padding: 15,
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#555',
    justifyContent: 'center',
  },
  datePickerButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginVertical: 20,
    shadowColor: '#000',
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
    marginVertical: 46, // Match button vertical space
  },
  errorText: {
    color: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 15,
    marginTop: 15,
    textAlign: 'center',
    maxWidth: '90%',
  },
});
