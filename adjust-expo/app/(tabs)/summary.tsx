import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFlightData } from '../../context/FlightDataContext'; // Import the context hook
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // Import icons

// --- Helper Function to Format Date/Time ---
const formatDateTime = (isoString: string | undefined): string => {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    // Example format: Mar 28, 08:00 (adjust options as needed)
    return date.toLocaleTimeString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // Use 24-hour format
      timeZone: 'UTC' // Assuming times are UTC, adjust if they include offset
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Invalid Date';
  }
};

// Helper component for rendering recommendation items
const RecommendationItem: React.FC<{ text: string; icon?: keyof typeof Ionicons.glyphMap }> = ({ text, icon }) => (
  <View style={styles.subContainer}>
    {icon && <Ionicons name={icon} size={18} color="#ADD8E6" style={styles.itemIcon} />}
    <Text style={styles.sectionDetails}>{text}</Text>
  </View>
);

// Helper component for rendering sections
const InfoSection: React.FC<{ title: string; children: React.ReactNode; icon?: keyof typeof MaterialCommunityIcons.glyphMap }> = ({ title, children, icon }) => (
  <View style={styles.scheduleSection}>
    <View style={styles.sectionHeader}>
       {icon && <MaterialCommunityIcons name={icon} size={22} color="#007AFF" style={styles.sectionIcon} />}
       <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.containerBox}>
      {children}
    </View>
  </View>
);


const SummaryPage: React.FC = () => {
  const { flightData, isLoading, error } = useFlightData();

  // --- Loading State ---
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Generating your AI Travel Plan...</Text>
      </View>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={60} color="#FF6B6B" />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        {/* Optionally add a retry button here that calls fetchFlightData again */}
      </View>
    );
  }

  // --- No Data State ---
  if (!flightData || !flightData.success || !flightData.flight_details || !flightData.recommendations) {
    return (
      <View style={[styles.container, styles.centerContent]}>
         <Ionicons name="information-circle-outline" size={60} color="#007AFF" />
        <Text style={styles.noDataText}>Enter your flight details on the 'Boarding Pass' tab to generate an AI travel plan.</Text>
      </View>
    );
  }

  // --- Success State ---
  const { flight_details, recommendations } = flightData;

  // Handle cases where backend parsing might have failed
  const recs = recommendations.raw_crew_output || recommendations.error_parsing_crew_result || !recommendations.sleep_schedule
    ? null // Indicate that structured recommendations are not available
    : recommendations;


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Travel Plan</Text>
        <Text style={styles.subTitle}>
          {flight_details.departure.airportCode} ➔ {flight_details.arrival.airportCode} ({flight_details.flightDesignator.carrierCode}{flight_details.flightDesignator.flightNumber})
        </Text>
        {/* Display Departure and Arrival Times as a subheading */}
        <Text style={styles.timeText}>
            Dep: {formatDateTime(flight_details.departure.scheduledTimeISO)} | Arr: {formatDateTime(flight_details.arrival.scheduledTimeISO)}
        </Text>
      </View>

      {/* Display Recommendations if available */}
      {recs ? (
        <>
          {/* Sleep Schedule Section */}
          {recs.sleep_schedule && (
            <InfoSection title="Sleep Schedule" icon="power-sleep">
              {recs.sleep_schedule.adjustment_period_advice && <RecommendationItem text={recs.sleep_schedule.adjustment_period_advice} icon="time-outline" />}
              {recs.sleep_schedule.recommended_bedtime_local && <RecommendationItem text={`Bedtime: ${recs.sleep_schedule.recommended_bedtime_local}`} icon="bed-outline" />}
              {recs.sleep_schedule.recommended_wake_time_local && <RecommendationItem text={`Wake Time: ${recs.sleep_schedule.recommended_wake_time_local}`} icon="sunny-outline" />}
              {recs.sleep_schedule.nap_strategy_advice && <RecommendationItem text={`Naps: ${recs.sleep_schedule.nap_strategy_advice}`} icon="cafe-outline" />}
            </InfoSection>
          )}

          {/* Exercise Plan Section */}
          {recs.exercise_plan && (
             <InfoSection title="Exercise Plan" icon="run-fast">
              {/* Check if array exists before mapping */}
              {recs.exercise_plan.pre_flight_routine && recs.exercise_plan.pre_flight_routine.length > 0 && (
                <>
                  <Text style={styles.subSectionTitle}>Pre-Flight:</Text>
                  {recs.exercise_plan.pre_flight_routine.map((item, index) => <RecommendationItem key={`ex-pre-${index}`} text={item} />)}
                </>
              )}
               {/* Check if array exists before mapping */}
               {recs.exercise_plan.during_flight_movement && recs.exercise_plan.during_flight_movement.length > 0 && (
                 <>
                   <Text style={styles.subSectionTitle}>During Flight:</Text>
                   {recs.exercise_plan.during_flight_movement.map((item, index) => <RecommendationItem key={`ex-during-${index}`} text={item} />)}
                 </>
               )}
               {/* Check if array exists before mapping */}
               {recs.exercise_plan.post_flight_activity && recs.exercise_plan.post_flight_activity.length > 0 && (
                 <>
                   <Text style={styles.subSectionTitle}>Post-Flight:</Text>
                   {recs.exercise_plan.post_flight_activity.map((item, index) => <RecommendationItem key={`ex-post-${index}`} text={item} />)}
                 </>
               )}
            </InfoSection>
          )}

          {/* Meal Plan Section */}
          {recs.meal_plan && (
            <InfoSection title="Meal Plan" icon="food-apple-outline">
               {recs.meal_plan.timing_adjustment && (
                 <>
                   <Text style={styles.subSectionTitle}>Timing Adjustment:</Text>
                   {recs.meal_plan.timing_adjustment.first_day_breakfast && <RecommendationItem text={`Breakfast: ${recs.meal_plan.timing_adjustment.first_day_breakfast}`} />}
                   {recs.meal_plan.timing_adjustment.first_day_lunch && <RecommendationItem text={`Lunch: ${recs.meal_plan.timing_adjustment.first_day_lunch}`} />}
                   {recs.meal_plan.timing_adjustment.first_day_dinner && <RecommendationItem text={`Dinner: ${recs.meal_plan.timing_adjustment.first_day_dinner}`} />}
                 </>
               )}
               {/* Check if array exists before mapping */}
               {recs.meal_plan.dietary_recommendations && recs.meal_plan.dietary_recommendations.length > 0 && (
                 <>
                   <Text style={styles.subSectionTitle}>Dietary Tips:</Text>
                   {recs.meal_plan.dietary_recommendations.map((item, index) => <RecommendationItem key={`meal-diet-${index}`} text={item} />)}
                 </>
               )}
            </InfoSection>
          )}

           {/* Hydration Plan Section */}
           {recs.hydration_plan && (
            <InfoSection title="Hydration Plan" icon="water-outline">
               {recs.hydration_plan.daily_target_liters && <RecommendationItem text={`Daily Target: ${recs.hydration_plan.daily_target_liters}`} icon="water" />}
               {/* Check if array exists before mapping */}
               {recs.hydration_plan.hydration_schedule_tips && recs.hydration_plan.hydration_schedule_tips.length > 0 && (
                 <>
                   <Text style={styles.subSectionTitle}>Hydration Tips:</Text>
                   {recs.hydration_plan.hydration_schedule_tips.map((item, index) => <RecommendationItem key={`hyd-tip-${index}`} text={item} />)}
                 </>
               )}
             </InfoSection>
           )}

           {/* Light Exposure Section */}
           {recs.light_exposure_advice && (
             <InfoSection title="Light Exposure" icon="weather-sunny">
               <RecommendationItem text={recs.light_exposure_advice} icon="eye-outline" />
             </InfoSection>
           )}

           {/* Relaxation Section */}
           {recs.relaxation_advice && (
             <InfoSection title="Relaxation" icon="spa-outline"> {/* Corrected Icon */}
               <RecommendationItem text={recs.relaxation_advice} icon="heart-outline" />
             </InfoSection>
           )}

           {/* Nap Advice (Integrated into Sleep Section or separate) */}
           {/* Option 1: Add to Sleep Section */}
           {/* {recs.nap_advice && recs.sleep_schedule && (
             <RecommendationItem text={`Naps: ${recs.nap_advice}`} icon="cafe-outline" />
           )} */}
           {/* Option 2: Separate Section (if significant enough) */}
           {recs.nap_advice && !recs.sleep_schedule?.nap_strategy_advice && ( // Show only if not already in sleep section
             <InfoSection title="Nap Strategy" icon="coffee-outline"> {/* Corrected Icon */}
                <RecommendationItem text={recs.nap_advice} />
             </InfoSection>
           )}
        </>
      ) : (
         // Fallback if parsing failed on backend but request was 'successful'
         <View style={[styles.containerBox, styles.fallbackContainer]}>
            <Ionicons name="warning-outline" size={24} color="#FFA500" />
            <Text style={styles.fallbackText}>Received recommendations, but could not display details. Raw output might be available in server logs.</Text>
            {recommendations.raw_crew_output && <Text style={styles.rawOutput}>{recommendations.raw_crew_output}</Text>}
         </View>
      )}


      {/* Removed AI Assistant Section and Sync Button */}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark background
  },
   scrollContent: {
    padding: 20,
    paddingBottom: 40, // Add padding at the bottom
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20, // Add padding for centered content
  },
  header: {
    alignItems: 'center',
    marginBottom: 30, // More space below header
    paddingTop: 10, // Add some padding at the top
  },
  title: {
    fontSize: 26, // Larger title
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 16, // Smaller subtitle
    color: '#00AFFF', // Brighter blue
    marginTop: 5,
    textAlign: 'center',
  },
  scheduleSection: {
    marginBottom: 25, // More space between sections
  },
   sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10, // Space between header and box
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 20, // Larger section titles
    fontWeight: '600', // Medium weight
    color: 'white',
    // Removed marginLeft as icon provides spacing
  },
   subSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B0C4DE', // Lighter steel blue
    marginTop: 10,
    marginBottom: 5,
    marginLeft: 5, // Indent subsection titles slightly
  },
  containerBox: {
    backgroundColor: '#1E1E1E', // Slightly lighter dark shade
    padding: 15,
    borderRadius: 12, // More rounded corners
    borderWidth: 1,
    borderColor: '#333', // Darker border
  },
  subContainer: {
    backgroundColor: '#282828', // Even lighter dark shade for items
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row', // Align icon and text
    alignItems: 'center',
  },
   itemIcon: {
    marginRight: 10,
  },
  sectionDetails: {
    fontSize: 15, // Slightly smaller detail text
    color: '#E0E0E0', // Lighter gray for text
    flex: 1, // Allow text to wrap
    lineHeight: 22, // Improve readability
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#ccc',
  },
   errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 10,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 16,
    color: '#FFC0CB', // Lighter pink for error details
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 24,
  },
   fallbackContainer: {
    marginTop: 20,
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 165, 0, 0.1)', // Orange tint
    borderColor: '#FFA500',
  },
  fallbackText: {
    color: '#FFA500', // Orange text
    textAlign: 'center',
    marginTop: 10,
    fontSize: 15,
  },
   rawOutput: {
    fontSize: 10,
    color: '#888',
    marginTop: 10,
    fontFamily: 'monospace', // Use monospace for raw output if available
  },
  // timeContainer style removed
  timeText: { // Style for the time subheading
    color: '#B0C4DE', // Lighter steel blue
    fontSize: 14,
    marginTop: 5, // Add a little space below the main subtitle
    textAlign: 'center', // Center the time text
  },
  // Removed aiSection, input, aiResponse, syncButton styles
});

export default SummaryPage;
