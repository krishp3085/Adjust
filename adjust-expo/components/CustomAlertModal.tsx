import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: 'success' | 'error' | 'warning' | 'info'; // Optional type for styling/icon
}

const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  title,
  message,
  onClose,
  type = 'info', // Default to info
}) => {
  const getIconName = (): keyof typeof Ionicons.glyphMap | null => {
    switch (type) {
      case 'success':
        return 'checkmark-circle-outline';
      case 'error':
        return 'alert-circle-outline';
      case 'warning':
        return 'warning-outline';
      case 'info':
        return 'information-circle-outline';
      default:
        return null;
    }
  };

  const getIconColor = (): string => {
     switch (type) {
      case 'success':
        return '#4CAF50'; // Green
      case 'error':
        return '#F44336'; // Red
      case 'warning':
        return '#FFC107'; // Amber
      case 'info':
      default:
        return '#2196F3'; // Blue
    }
  }

  const iconName = getIconName();
  const iconColor = getIconColor();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose} // For Android back button
    >
      {/* Pressable backdrop to allow closing by tapping outside */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}> {/* Prevent closing when tapping inside the modal content */}
            <View style={styles.modalView}>
            <View style={styles.header}>
                {iconName && <Ionicons name={iconName} size={28} color={iconColor} style={styles.icon} />}
                <Text style={styles.modalTitle}>{title}</Text>
            </View>
            <Text style={styles.modalText}>{message}</Text>
            <TouchableOpacity
                style={[styles.button, { backgroundColor: iconColor }]} // Use type color for button
                onPress={onClose}
            >
                <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
            </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent dark backdrop
  },
  modalView: {
    margin: 20,
    backgroundColor: '#282828', // Dark background for modal content
    borderRadius: 15, // More rounded
    padding: 25, // More padding
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%', // Control modal width
    borderWidth: 1,
    borderColor: '#444',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%', // Ensure header spans width
    justifyContent: 'center', // Center header content
  },
  icon: {
    marginRight: 10,
  },
  modalTitle: {
    // Removed marginBottom as header handles spacing
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E0E0E0', // Light text
  },
  modalText: {
    marginBottom: 20, // More space before button
    textAlign: 'center',
    fontSize: 16,
    color: '#cccccc', // Slightly dimmer text for message
    lineHeight: 22,
  },
  button: {
    borderRadius: 10, // Rounded button
    paddingVertical: 12,
    paddingHorizontal: 30, // Wider button
    elevation: 2,
    marginTop: 10, // Add margin top
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default CustomAlertModal;
