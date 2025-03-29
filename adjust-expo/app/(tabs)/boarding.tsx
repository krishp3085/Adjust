import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';

export default function BoardingScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const [scannedText, setScannedText] = useState('');
  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const startScanning = async () => {
    if (Platform.OS === 'web') {
      alert('Scanning is not supported on web platform');
      return;
    }

    if (!permission?.granted) {
      const status = await requestPermission();
      if (!status.granted) {
        setScannedText('Camera permission was denied');
        return;
      }
    }
    
    setShowCamera(true);
  };

  const processImage = async (photo: any) => {
    try {
      setScanning(true);

      if (!photo.uri) {
        throw new Error('Invalid imageUri provided');
      }

      const base64 = await FileSystem.readAsStringAsync(photo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Google Cloud Vision API key
      const apiKey = process.env.EXPO_PUBLIC_OCR_API_KEY;

      // Endpoint for Google Cloud Vision API text detection
      const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

      const requestBody = {
        requests: [
          {
            image: {
              content: base64,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1,
              },
            ],
          },
        ],
      };

      // Send the POST request to the Google Cloud Vision API
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      // Extract the detected text from the response
      const text = result.responses[0].fullTextAnnotation.text || '';

      // Use regex to extract flight number and date
      const flightNumberMatch = text.match(/[A-Z]{2}\s?\d{3,4}/);
      const dateMatch = text.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);

      // Extracted information
      const extractedInfo = {
        flightNumber: flightNumberMatch ? flightNumberMatch[0] : 'Not found',
        date: dateMatch ? dateMatch[0] : 'Not found',
      };

      setScannedText(JSON.stringify(extractedInfo, null, 2));
      setShowCamera(false);
    } catch (error) {
      console.error('Error processing image:', error);
      setScannedText('Error processing image');
    } finally {
      setScanning(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05' }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.permissionContent}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            To scan your boarding pass, we need permission to use your device's camera.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Ionicons name="camera" size={24} color={"#fff"} style={styles.buttonIcon}/>
            <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showCamera) {
    return (
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          onMountError={(error) => {
            console.error('Camera mount error:', error);
            setShowCamera(false);
            setScannedText('Failed to initialize camera');
          }}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.cornerTL, styles.corner]} />
              <View style={[styles.cornerTR, styles.corner]} />
              <View style={[styles.cornerBL, styles.corner]} />
              <View style={[styles.cornerBR, styles.corner]} />
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCamera(false)}
            >
            </TouchableOpacity>
            <Text style={styles.guideText}>
              Position your boarding pass within the frame
            </Text>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={async () => {
                try {
                  if (cameraRef.current) {
                    const photo = await cameraRef.current.takePictureAsync({ shutterSound: false});
                    await processImage(photo);
                  } else {
                    console.warn('Camera reference not available');
                    setScannedText('Error: Camera not initialized properly');
                    setShowCamera(false);
                  }
                } catch (error) {
                  console.error('Error taking picture:', error);
                  setScannedText('Failed to capture image');
                  setShowCamera(false);
                }
              }}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05' }}
        style={[StyleSheet.absoluteFillObject, { opacity: 0.2 }]}
      />
      <View style={styles.content}>
        {scanning ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Processing boarding pass...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={startScanning}
              disabled={scanning}
            >
              <Ionicons name="camera" size={24} color={"#fff"} style={styles.buttonIcon}/>
              <Text style={styles.scanButtonText}>
                {scanning ? 'Processing...' : 'Scan Boarding Pass'}
              </Text>
            </TouchableOpacity>

            {scannedText ? (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Boarding Pass Details</Text>
                {(() => {
                  try {
                    const data = JSON.parse(scannedText);
                    return (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Flight</Text>
                          <Text style={styles.detailValue}>{data.flightNumber}</Text>
                        </View>
                      </>
                    );
                  } catch {
                    return <Text style={styles.errorText}>{scannedText}</Text>;
                  }
                })()}
              </View>
            ) : (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderText}>
                  Position your boarding pass within the camera frame when scanning
                </Text>
              </View>
            )}
          </>
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
  camera: {
    flex: 1,
    width: '100%',
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  scanFrame: {
    width: 280,
    height: 180,
    borderRadius: 12,
    position: 'relative',
    marginTop: 100,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#fff',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
  },
  guideText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    position: 'absolute',
    bottom: 120,
    width: '100%',
    paddingHorizontal: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
    alignItems: 'center',
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
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
  },
  placeholderContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  placeholderText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  permissionContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.9,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
});