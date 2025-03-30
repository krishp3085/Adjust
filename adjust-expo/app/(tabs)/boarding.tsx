import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function BoardingScreen() {
  const [flightNumber, setFlightNumber] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [flightDetails, setFlightDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchFlightDetails = async () => {
    if (!flightNumber || !departureDate) {
      setError('Please enter both flight number and departure date.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Replace with the actual API URL and logic
      const response = await fetch(`https://api.example.com/flight?flightNumber=${flightNumber}&departureDate=${departureDate}`);
      const data = await response.json();
      
      if (response.ok) {
        setFlightDetails(data);
      } else {
        setError('Failed to fetch flight details.');
      }
    } catch (err) {
      console.error('Error fetching flight details:', err);
      setError('An error occurred while fetching flight details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05' }}
        style={[StyleSheet.absoluteFillObject, { opacity: 0.2 }]}
      />
      <LinearGradient colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.content}>
        <Text style={styles.title}>Flight Information</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Enter Flight Number"
          placeholderTextColor="#888"
          value={flightNumber}
          onChangeText={setFlightNumber}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Enter Departure Date (YYYY-MM-DD)"
          placeholderTextColor="#888"
          value={departureDate}
          onChangeText={setDepartureDate}
        />

        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={fetchFlightDetails}
          >
            <Ionicons name="airplane" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Fetch Flight Details</Text>
          </TouchableOpacity>
        )}

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          flightDetails && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Flight Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Flight Number:</Text>
                <Text style={styles.detailValue}>{flightDetails.flightNumber}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Departure Date:</Text>
                <Text style={styles.detailValue}>{flightDetails.departureDate}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Destination:</Text>
                <Text style={styles.detailValue}>{flightDetails.destination}</Text>
              </View>
              {/* Add more flight details as needed */}
            </View>
          )
        )}
      </View>
    </View>
  );
}

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
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '80%',
    padding: 12,
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginVertical: 20,
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
    marginTop: 20,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  resultContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
