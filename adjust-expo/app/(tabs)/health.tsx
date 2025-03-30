import React, { useState } from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet, TouchableOpacity, Image } from 'react-native'; // Removed Alert
import { requestSleepAndHeartRatePermissions, fetchSleepData, fetchHeartRateData } from '@/services/health-connect';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CustomAlertModal from '../../components/CustomAlertModal'; // Import the custom modal

// Use the same base URL as your other API calls
const API_BASE_URL = 'http://172.16.202.117:5000';

// Define the expected structure of the backend response with analysis
interface HealthAnalysisResponse {
    message: string;
    averageHeartRate?: number | null;
    totalSleepTime?: string | null;
    error?: string;
    error_analysis?: string;
}

// Function to send data to the backend and get analysis
const sendHealthDataToBackend = async (healthData: any): Promise<HealthAnalysisResponse | null> => {
    console.log('Sending health data to backend...');
    try {
        const response = await fetch(`${API_BASE_URL}/api/health-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(healthData),
        });

        const responseData: HealthAnalysisResponse = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || responseData.error_analysis || `HTTP error! status: ${response.status}`);
        }

        console.log('Backend analysis response:', responseData);
        return responseData;

    } catch (error: any) {
        console.error('Error sending/analyzing health data via backend:', error);
        // Throw the error so the calling function can catch it and show the modal
        throw error;
    }
};


export default function HealthScreen() {
    const [loading, setLoading] = useState(false);
    const [averageHr, setAverageHr] = useState<number | null>(null);
    const [sleepDurationString, setSleepDurationString] = useState<string | null>(null);

    // --- State for Custom Modal ---
    const [modalVisible, setModalVisible] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // --- Helper to show modal ---
    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setModalTitle(title);
        setModalMessage(message);
        setModalType(type);
        setModalVisible(true);
    };

    const handleFetchAndLogData = async () => {
        setLoading(true);
        setAverageHr(null);
        setSleepDurationString(null);
        try {
            console.log('Requesting permissions...');
            const grantedPermissions = await requestSleepAndHeartRatePermissions();
            console.log('Permission request completed. Granted raw:', JSON.stringify(grantedPermissions));

            const sleepPermissionGranted = Array.isArray(grantedPermissions) && grantedPermissions.some(p =>
                typeof p === 'object' && p !== null && 'recordType' in p && p.recordType === 'SleepSession' && 'accessType' in p && p.accessType === 'read'
            );
            const heartRatePermissionGranted = Array.isArray(grantedPermissions) && grantedPermissions.some(p =>
                 typeof p === 'object' && p !== null && 'recordType' in p && p.recordType === 'HeartRate' && 'accessType' in p && p.accessType === 'read'
            );
            console.log(`Parsed check - Sleep granted: ${sleepPermissionGranted}, Heart Rate granted: ${heartRatePermissionGranted}`);

            if (!sleepPermissionGranted || !heartRatePermissionGranted) {
                // Use custom modal for error
                showAlert('Permissions Not Granted', 'Required permissions (Sleep, Heart Rate) were not granted. Please check Health Connect app settings.', 'error');
                setLoading(false);
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
            console.log('Health Data Fetched:', healthData);

            // Send data to backend for saving and analysis
            const analysisResult = await sendHealthDataToBackend(healthData);

            // Update state with analysis results if successful
            if (analysisResult) {
                 setAverageHr(analysisResult.averageHeartRate ?? null);
                 setSleepDurationString(analysisResult.totalSleepTime ?? null);
                 if(analysisResult.error || analysisResult.error_analysis) {
                    console.warn("Backend analysis issue:", analysisResult.error || analysisResult.error_analysis);
                    // Use custom modal for warning
                    showAlert('Analysis Warning', 'Data saved, but analysis failed on the backend.', 'warning');
                 } else {
                    // Use custom modal for success
                    showAlert('Success', 'Health data saved and analyzed!', 'success');
                 }
            }
            // If sendHealthDataToBackend returned null (due to fetch error caught inside it), the error alert is already shown there.

        } catch (error: any) {
            console.error('Error in handleFetchAndLogData:', error);
             // Use custom modal for general errors
            showAlert('Error', `An issue occurred: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Background Image and Gradient */}
            <Image
                source={{ uri: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05' }}
                style={[StyleSheet.absoluteFillObject, { opacity: 0.2 }]}
                blurRadius={5}
            />
            <LinearGradient colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFillObject} />

            {/* Content Area */}
            <View style={styles.content}>
                <Text style={styles.title}>Health Data Analysis</Text>

                {/* Display Area for Analysis Results */}
                <View style={styles.resultsContainer}>
                    <Text style={styles.resultsTitle}>Recent Analysis:</Text>
                    {averageHr !== null ? (
                        <Text style={styles.resultsText}>Average Heart Rate: {averageHr.toFixed(1)} bpm</Text>
                    ) : (
                        <Text style={styles.resultsText}>Average Heart Rate: N/A</Text>
                    )}
                    {sleepDurationString ? (
                        <Text style={styles.resultsText}>Total Sleep Duration: {sleepDurationString}</Text>
                    ) : (
                        <Text style={styles.resultsText}>Total Sleep Duration: N/A</Text>
                    )}
                </View>

                {/* Action Button/Loading */}
                {loading ? (
                    <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />
                ) : (
                     <TouchableOpacity
                        style={styles.button}
                        onPress={handleFetchAndLogData}
                    >
                        <Ionicons name="pulse-outline" size={24} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Fetch, Save & Analyze</Text>
                    </TouchableOpacity>
                )}
            </View>

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

// Styles (keep existing styles)
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 30,
        textAlign: 'center',
    },
    resultsContainer: {
        marginVertical: 20,
        padding: 15,
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#444',
        width: '90%',
        alignItems: 'center',
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
        color: '#00AFFF',
    },
    resultsText: {
        fontSize: 16,
        color: '#E0E0E0',
        marginBottom: 5,
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
        marginVertical: 46,
    },
});
