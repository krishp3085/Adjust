import React, { useState } from 'react';
import { View, Text, Button, ActivityIndicator, Alert } from 'react-native';
import { requestSleepAndHeartRatePermissions, fetchSleepData, fetchHeartRateData } from '@/services/health-connect';

export default function HealthScreen() {
    const [loading, setLoading] = useState(false);

    const handleFetchAndLogData = async () => {
        setLoading(true);
        try {
            // Request permissions
            await requestSleepAndHeartRatePermissions();

            // Fetch data from the last 7 days
            const sleepRecords = await fetchSleepData(4);
            const heartRateRecords = await fetchHeartRateData(2);

            // Combine data into one object
            const healthData = {
                sleepRecords,
                heartRateRecords,
                fetchedAt: new Date().toISOString(),
            };

            // Log health data to the console
            console.log('Health Data:', healthData);

            Alert.alert('Success', 'Health data logged successfully!');
        } catch (error) {
            console.error('Error fetching or logging health data:', error);
            Alert.alert('Error', 'There was an issue fetching or logging health data.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <Text style={{ fontSize: 20, marginBottom: 20 }}>Health Data Screen</Text>
            {loading ? (
                <ActivityIndicator size="large" />
            ) : (
                <Button title="Fetch & Log Health Data" onPress={handleFetchAndLogData} />
            )}
        </View>
    );
}
