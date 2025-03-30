import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Button } from 'react-native-paper';

const SummaryPage: React.FC = () => {
  const [question, setQuestion] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');

  const handleAskAI = (): void => {
    // Mock AI logic
    const mockResponses: { [key: string]: string } = {
      "What is my sleep schedule?": "Your sleep schedule is adjusted 1 hour earlier each day. On the flight, you'll sleep after dinner.",
      "When should I take melatonin?": "You should take melatonin 30 minutes before your target bedtime on Day 0 and Day 1.",
      "Can I drink coffee on the flight?": "Avoid caffeine on the flight, especially near your target bedtime.",
    };

    setAiResponse(mockResponses[question] || "Sorry, I didn't understand that.");
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Jet Lag Plan Summary</Text>
        <Text style={styles.subTitle}>For NYC ➔ Paris</Text>
      </View>

      {/* Pre-Flight Section */}
      <View style={styles.scheduleSection}>
        <Text style={styles.sectionTitle}>Pre-Flight</Text>
        <View style={styles.containerBox}>
          <View style={styles.subContainer}>
            <Text style={styles.sectionDetails}>
              Adjust your sleep by 1 hour earlier each day.
            </Text>
          </View>
          <View style={styles.subContainer}>
            <Text style={styles.sectionDetails}>
              Take melatonin at 6 PM before your usual bedtime.
            </Text>
          </View>
        </View>
      </View>

      {/* In-Flight Section */}
      <View style={styles.scheduleSection}>
        <Text style={styles.sectionTitle}>In-Flight</Text>
        <View style={styles.containerBox}>
          <View style={styles.subContainer}>
            <Text style={styles.sectionDetails}>
              Sleep on the plane after dinner. Avoid caffeine after 4 PM.
            </Text>
          </View>
          <View style={styles.subContainer}>
            <Text style={styles.sectionDetails}>
              Use an eye mask and dim your screen to mimic night.
            </Text>
          </View>
        </View>
      </View>

      {/* Arrival Day Section */}
      <View style={styles.scheduleSection}>
        <Text style={styles.sectionTitle}>Arrival Day</Text>
        <View style={styles.containerBox}>
          <View style={styles.subContainer}>
            <Text style={styles.sectionDetails}>
              Get morning sunlight immediately after arrival to adjust to the local time.
            </Text>
          </View>
          <View style={styles.subContainer}>
            <Text style={styles.sectionDetails}>
              Avoid screens after 7 PM.
            </Text>
          </View>
        </View>
      </View>

      {/* AI Assistant Section */}
      <View style={styles.aiSection}>
        <TextInput
          style={styles.input}
          placeholder="Ask about your schedule..."
          value={question}
          onChangeText={setQuestion}
        />
        <Button mode="contained" onPress={handleAskAI}>
          Ask AI
        </Button>
        <Text style={styles.aiResponse}>{aiResponse}</Text>
      </View>

      {/* Sync Button */}
      <Button mode="contained" color="#1e90ff" style={styles.syncButton}>
        Sync to Timeline
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subTitle: {
    fontSize: 18,
    color: '#1e90ff',
  },
  scheduleSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  containerBox: {
    backgroundColor: '#333',
    padding: 15,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  subContainer: {
    backgroundColor: '#444',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  sectionDetails: {
    fontSize: 16,
    color: 'white',
    marginLeft: 10,
  },
  aiSection: {
    marginTop: 20,
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    borderColor: '#444',
    borderWidth: 1,
  },
  input: {
    backgroundColor: '#444',
    color: 'white',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  aiResponse: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  syncButton: {
    marginTop: 30,
    padding: 10,
  },
});

export default SummaryPage;
