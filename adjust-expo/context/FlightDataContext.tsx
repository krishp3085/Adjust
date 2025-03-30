import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Alert } from 'react-native';

// Define the structure of the flight data we expect
// Based on the backend response structure
interface FlightDetails {
  arrival: { airportCode: string; scheduledTimeISO: string };
  departure: { airportCode: string; scheduledTimeISO: string };
  flightDesignator: { carrierCode: string; flightNumber: string; scheduledDepartureDate: string };
  legs: { aircraftType: string; boardPointIataCode: string; offPointIataCode: string; scheduledLegDuration: string }[];
  segments: { boardPointIataCode: string; offPointIataCode: string; operatingCarrierCode: string; operatingFlightNumber: number; scheduledSegmentDuration: string }[];
}

interface Recommendations {
  // Define based on the expected parsed JSON structure from CrewAI
  sleep_schedule?: {
    adjustment_period_advice?: string;
    recommended_bedtime_local?: string;
    recommended_wake_time_local?: string;
    nap_strategy_advice?: string;
  };
  exercise_plan?: {
    pre_flight_routine?: string[];
    during_flight_movement?: string[];
    post_flight_activity?: string[];
  };
  meal_plan?: {
    timing_adjustment?: {
      first_day_breakfast?: string;
      first_day_lunch?: string;
      first_day_dinner?: string;
    };
    dietary_recommendations?: string[];
  };
  hydration_plan?: {
    daily_target_liters?: string;
    hydration_schedule_tips?: string[];
  };
  // New fields for personalized advice
  light_exposure_advice?: string;
  relaxation_advice?: string;
  nap_advice?: string;
  // Include raw_crew_output or error fields if parsing fails
  raw_crew_output?: string;
  error_parsing_crew_result?: string;
  parsed_output?: any;
}

interface FlightDataResponse {
  success: boolean;
  flight_details: FlightDetails | null;
  recommendations: Recommendations | null;
  error?: string; // Add error field for API errors
}

interface FlightDataContextType {
  flightData: FlightDataResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchFlightData: (carrierCode: string, flightNumber: string, scheduledDepartureDate: string) => Promise<boolean>; // Returns true on success, false on failure
  // Add state for storing flight inputs
  inputFlightDetails: { carrierCode: string; flightNumber: string; departureDate: string } | null;
  setInputFlightDetails: (details: { carrierCode: string; flightNumber: string; departureDate: string } | null) => void;
}

const FlightDataContext = createContext<FlightDataContextType | undefined>(undefined);

interface FlightDataProviderProps {
  children: ReactNode;
}

// Use the computer's local IP address accessible by the emulator/device
const API_BASE_URL = 'http://172.16.202.117:5000'; // <-- Updated IP from Expo logs
export const FlightDataProvider: React.FC<FlightDataProviderProps> = ({ children }) => {
  const [flightData, setFlightData] = useState<FlightDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // State for storing flight inputs before fetching
  const [inputFlightDetails, setInputFlightDetailsState] = useState<{ carrierCode: string; flightNumber: string; departureDate: string } | null>(null);

  // Function to update stored input details
  const setInputFlightDetails = (details: { carrierCode: string; flightNumber: string; departureDate: string } | null) => {
    setInputFlightDetailsState(details);
    // Optionally clear old results when new input is set? Or keep them until explicit fetch?
    // setFlightData(null);
    // setError(null);
  };

  const fetchFlightData = async (carrierCode: string, flightNumber: string, scheduledDepartureDate: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setFlightData(null); // Clear previous data

    // Basic input validation
    if (!carrierCode || !flightNumber || !scheduledDepartureDate) {
        setError("Carrier Code, Flight Number, and Date are required.");
        setIsLoading(false);
        return false;
    }
     // Basic date format check (YYYY-MM-DD) - can be more robust
     if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDepartureDate)) {
        setError("Please enter the date in YYYY-MM-DD format.");
        setIsLoading(false);
        return false;
    }


    try {
      console.log(`Fetching data from: ${API_BASE_URL}/api/flight-recommendations`);
      const response = await fetch(`${API_BASE_URL}/api/flight-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carrierCode,
          flightNumber,
          scheduledDepartureDate,
        }),
      });

      const responseData: FlightDataResponse = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
      }

      // Check if recommendations were successfully parsed by the backend
      if (responseData.recommendations?.raw_crew_output || responseData.recommendations?.error_parsing_crew_result) {
          console.warn("Backend returned raw or errored recommendations:", responseData.recommendations);
          // Decide how to handle this - maybe show a partial success message?
          // For now, treat as success but log warning. Frontend needs to handle potentially missing fields.
      }


      setFlightData(responseData);
      setIsLoading(false);
      return true; // Indicate success

    } catch (err: any) {
      console.error('Error fetching flight data:', err);
      const errorMessage = err.message || 'An unknown error occurred while fetching data.';
      setError(errorMessage);
      // Alert.alert('Fetch Error', `Could not fetch flight recommendations. Please check your network connection and the backend server.\n\nDetails: ${errorMessage}`);
      setIsLoading(false);
      return false; // Indicate failure
    }
  };

  return (
    <FlightDataContext.Provider value={{
        flightData,
        isLoading,
        error,
        fetchFlightData,
        inputFlightDetails, // Provide state
        setInputFlightDetails // Provide setter function
      }}>
      {children}
    </FlightDataContext.Provider>
  );
};

export const useFlightData = (): FlightDataContextType => {
  const context = useContext(FlightDataContext);
  if (context === undefined) {
    throw new Error('useFlightData must be used within a FlightDataProvider');
  }
  return context;
};
