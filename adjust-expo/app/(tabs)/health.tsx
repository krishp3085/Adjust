import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native'; // Added ScrollView
import { requestSleepAndHeartRatePermissions, fetchSleepData, fetchHeartRateData } from '../../services/health-connect'; // Corrected import path
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // Added MaterialCommunityIcons
import CustomAlertModal from '../../components/CustomAlertModal'; // Import the custom modal
import { useFlightData } from '../../context/FlightDataContext'; // Import context hook
import { useRouter } from 'expo-router'; // Import router for navigation
import { differenceInSeconds, formatDuration, intervalToDuration } from 'date-fns'; // For duration formatting

// Use the same base URL as your other API calls
const API_BASE_URL = 'http://172.16.202.117:5000';

// Define the expected structure of the backend response (for health data saving)
interface HealthSaveResponse {
    message: string;
    error?: string;
}

// Function to send data to the backend just for saving
const sendHealthDataToBackend = async (healthData: any): Promise<HealthSaveResponse> => {
    console.log('Sending health data to backend for saving...');
    try {
        const response = await fetch(`${API_BASE_URL}/api/health-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(healthData),
        });

        const responseData: HealthSaveResponse = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
        }

        console.log('Backend save response:', responseData);
        return responseData;

    } catch (error: any) {
        console.error('Error sending health data to backend:', error);
        // Throw the error so the calling function can catch it and show the modal
        throw error;
    }
};

// --- Helper Functions for Frontend Analysis ---

// Calculate Average Sleep Duration from Sleep Records
const calculateAvgSleepDuration = (sleepRecords: any[]): string => {
    if (!sleepRecords || sleepRecords.length === 0) return "N/A";

    let totalDurationSeconds = 0;
    let validSessions = 0;

    sleepRecords.forEach(record => {
        try {
            const startTime = new Date(record.startTime);
            const endTime = new Date(record.endTime);
            const durationSeconds = differenceInSeconds(endTime, startTime);
            if (durationSeconds > 0) {
                totalDurationSeconds += durationSeconds;
                validSessions++;
            }
        } catch (e) {
            console.warn("Could not parse sleep record times for duration calculation:", e);
        }
    });

    if (validSessions === 0) return "N/A";

    const avgSeconds = totalDurationSeconds / validSessions;
    const duration = intervalToDuration({ start: 0, end: avgSeconds * 1000 });
    return formatDuration(duration, { format: ['hours', 'minutes'] }) || "0 minutes"; // Format as Xh Ym
};

// Calculate Average Heart Rate During Sleep Periods
const calculateAvgSleepHr = (sleepRecords: any[], hrRecords: any[]): number | null => {
    if (!sleepRecords || sleepRecords.length === 0 || !hrRecords || hrRecords.length === 0) return null;

    let totalHrSum = 0;
    let totalHrCount = 0;

    // Flatten HR samples with parsed dates
    const allHrSamples: { time: Date; bpm: number }[] = [];
    hrRecords.forEach(record => {
        record.samples?.forEach((sample: { time: string; beatsPerMinute: number }) => {
            try {
                allHrSamples.push({ time: new Date(sample.time), bpm: sample.beatsPerMinute });
            } catch (e) { console.warn("Could not parse HR sample time:", e); }
        });
    });

    if (allHrSamples.length === 0) return null;

    // Sort HR samples by time for potential optimization (though linear scan is used here)
    allHrSamples.sort((a, b) => a.time.getTime() - b.time.getTime());

    sleepRecords.forEach(session => {
        try {
            const sessionStart = new Date(session.startTime);
            const sessionEnd = new Date(session.endTime);

            // Find HR samples within this sleep session
            allHrSamples.forEach(sample => {
                if (sample.time >= sessionStart && sample.time <= sessionEnd) {
                    totalHrSum += sample.bpm;
                    totalHrCount++;
                }
            });
        } catch (e) {
            console.warn("Could not parse sleep session times for HR correlation:", e);
        }
    });

    return totalHrCount > 0 ? totalHrSum / totalHrCount : null;
};

// --- Component ---

export default function HealthScreen() {
    const [syncLoading, setSyncLoading] = useState(false);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [avgSleepDuration, setAvgSleepDuration] = useState<string>("N/A"); // State for avg sleep
    const [avgSleepHr, setAvgSleepHr] = useState<number | null>(null); // State for avg sleep HR

    const { inputFlightDetails, fetchFlightData, isLoading: isAnalysisLoadingGlobal, error: analysisErrorGlobal } = useFlightData();
    const router = useRouter();

    const [modalVisible, setModalVisible] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setModalTitle(title);
        setModalMessage(message);
        setModalType(type);
        setModalVisible(true);
    };

    const handleSyncHealthData = async () => {
        setSyncLoading(true);
        setAvgSleepDuration("N/A"); // Reset stats on new sync
        setAvgSleepHr(null);
        try {
            console.log('Requesting permissions...');
            const grantedPermissions = await requestSleepAndHeartRatePermissions();
            console.log('Permission request completed. Granted raw:', JSON.stringify(grantedPermissions));

            // Simplified check: Assume the library returns an array of granted permission objects/strings.
            // Check if BOTH required read permissions were granted.
            // This relies on the library returning predictable objects/strings in the array upon success.
            let sleepReadGranted = false;
            let hrReadGranted = false;
            if (Array.isArray(grantedPermissions)) {
                 // Check based on the expected object structure from the library's request
                 sleepReadGranted = grantedPermissions.some(p => p.recordType === 'SleepSession' && p.accessType === 'read');
                 hrReadGranted = grantedPermissions.some(p => p.recordType === 'HeartRate' && p.accessType === 'read');
            }

            console.log(`Parsed check - Sleep granted: ${sleepReadGranted}, Heart Rate granted: ${hrReadGranted}`);

            if (!sleepReadGranted || !hrReadGranted) {
                showAlert('Permissions Not Granted', 'Required permissions (Sleep, Heart Rate) were not granted.', 'error');
                setSyncLoading(false);
                return;
            }

            console.log('Waiting briefly after permission grant...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('Proceeding to fetch data...');

            const sleepRecords = await fetchSleepData(4);
            const heartRateRecords = await fetchHeartRateData(2);

            const healthData = {
                sleepRecords,
                heartRateRecords,
                fetchedAt: new Date().toISOString(),
            };
            console.log(`Fetched ${sleepRecords.length} sleep records and ${heartRateRecords.length} HR records.`);

            // --- Perform Frontend Analysis ---
            const calculatedAvgSleep = calculateAvgSleepDuration(sleepRecords);
            const calculatedAvgHr = calculateAvgSleepHr(sleepRecords, heartRateRecords);
            setAvgSleepDuration(calculatedAvgSleep);
            setAvgSleepHr(calculatedAvgHr);
            console.log(`Frontend Analysis: Avg Sleep=${calculatedAvgSleep}, Avg Sleep HR=${calculatedAvgHr?.toFixed(1)}`);
            // --- End Frontend Analysis ---

            // Send raw data to backend for saving
            const saveResult = await sendHealthDataToBackend(healthData);

            if (saveResult && !saveResult.error) {
                 showAlert('Sync Success', 'Health data synced and analyzed!', 'success');
            } else {
                 throw new Error(saveResult?.error || 'Failed to save data on backend.');
            }

        } catch (error: any) {
            console.error('Error in handleSyncHealthData:', error);
            showAlert('Sync Error', `Failed to sync health data: ${error.message}`, 'error');
        } finally {
            setSyncLoading(false);
        }
    };

    const handleGeneratePlan = async () => {
        if (!inputFlightDetails) {
            Alert.alert("No Flight Info", "Please enter your flight details on the 'Boarding Pass' tab first.");
            return;
        }

        setAnalysisLoading(true);
        const { carrierCode, flightNumber, departureDate } = inputFlightDetails;
        // Ensure fetchFlightData uses the latest *saved* health data on the backend
        const success = await fetchFlightData(carrierCode, flightNumber, departureDate);
        setAnalysisLoading(false);

        if (success) {
            router.push('/(tabs)/summary');
        } else {
             showAlert('Plan Generation Failed', analysisErrorGlobal || 'Could not generate the travel plan. Please try again.', 'error');
        }
    };


    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFillObject} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Health Sync & Plan</Text>

                {/* Health Stats Display */}
                <View style={styles.statsContainer}>
                     <Text style={styles.statsTitle}>Recent Health Stats (Last 7 Days)</Text>
                     <View style={styles.statItem}>
                         <Ionicons name="bed-outline" size={20} color="#00AFFF" style={styles.statIcon} />
                         <Text style={styles.statLabel}>Avg. Sleep:</Text>
                         <Text style={styles.statValue}>{avgSleepDuration}</Text>
                     </View>
                     <View style={styles.statItem}>
                         <Ionicons name="heart-outline" size={20} color="#FF6B6B" style={styles.statIcon} />
                         <Text style={styles.statLabel}>Avg. Sleep HR:</Text>
                         <Text style={styles.statValue}>{avgSleepHr !== null ? `${avgSleepHr.toFixed(1)} bpm` : 'N/A'}</Text>
                     </View>
                     <Text style={styles.statsDisclaimer}>Sync data below to update stats.</Text>
                </View>

                 {/* Instructions */}
                 <Text style={styles.instructions}>
                    {inputFlightDetails
                        ? `Flight ${inputFlightDetails.carrierCode}${inputFlightDetails.flightNumber} on ${inputFlightDetails.departureDate} loaded.`
                        : "1. Enter flight details on the 'Boarding Pass' tab."}
                 </Text>
                 <Text style={styles.instructions}>
                    2. Sync your latest health data.
                 </Text>
                  <Text style={styles.instructions}>
                    3. Generate your personalized plan.
                 </Text>


                {/* Sync Button */}
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#4CAF50' }]} // Green color for sync
                    onPress={handleSyncHealthData}
                    disabled={syncLoading || analysisLoading || isAnalysisLoadingGlobal}
                >
                    <Ionicons name="sync-outline" size={24} color="#fff" style={styles.buttonIcon} />
                    {syncLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.buttonText}>Sync Health Data</Text>
                    )}
                </TouchableOpacity>

                 {/* Generate Plan Button */}
                 <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#007AFF' }]} // Blue color for generate
                    onPress={handleGeneratePlan}
                    disabled={!inputFlightDetails || syncLoading || analysisLoading || isAnalysisLoadingGlobal}
                >
                    <Ionicons name="paper-plane-outline" size={24} color="#fff" style={styles.buttonIcon} />
                     {analysisLoading || isAnalysisLoadingGlobal ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.buttonText}>Generate/Update Plan</Text>
                    )}
                </TouchableOpacity>

                 {/* Display global analysis error if any */}
                 {analysisErrorGlobal && !isAnalysisLoadingGlobal && (
                    <Text style={styles.errorText}>Error generating plan: {analysisErrorGlobal}</Text>
                 )}

            </ScrollView>

             {/* Render the Custom Modal */}
            <CustomAlertModal
                visible={modalVisible}
                title={modalTitle}
                message={modalMessage}
                type={modalType}
                onClose={() => setModalVisible(false)}
            />
        </View>
    );
}

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    scrollContent: { // Changed from content to allow scrolling
        padding: 20,
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 40, // Ensure space at bottom
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 25,
        textAlign: 'center',
    },
    statsContainer: {
        marginBottom: 25,
        padding: 15,
        backgroundColor: '#1E1E1E', // Slightly lighter dark shade
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        width: '95%', // Make wider
        alignItems: 'stretch', // Align items to stretch
    },
    statsTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15, // More space below title
        color: '#00AFFF',
        textAlign: 'center',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10, // Space between stat items
    },
    statIcon: {
        marginRight: 10,
    },
    statLabel: {
        fontSize: 16,
        color: '#ccc',
        width: 120, // Fixed width for alignment
    },
    statValue: {
        fontSize: 16,
        color: '#E0E0E0',
        fontWeight: '500',
    },
    statsDisclaimer: {
        fontSize: 12,
        color: '#888',
        textAlign: 'center',
        marginTop: 10,
    },
    instructions: {
        fontSize: 15,
        color: '#ccc',
        textAlign: 'center',
        marginBottom: 10, // Reduced margin
        lineHeight: 22,
        width: '90%',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 25,
        borderRadius: 12,
        marginVertical: 10, // Reduced vertical margin
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        width: '90%', // Make buttons wider
        minHeight: 50,
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
    loading: { // Style for loading indicator if used separately
        marginVertical: 46,
    },
     errorText: { // Style for displaying errors on this screen
        color: '#FF6B6B',
        fontSize: 15,
        marginTop: 15,
        textAlign: 'center',
        maxWidth: '90%',
    },
});
