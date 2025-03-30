from flask import Flask, request, jsonify
from crewai import Agent, Task, Crew, Process
# Removed BaseTool import
import typing
from dotenv import load_dotenv
import os
from flask_cors import CORS
from crewai import LLM
from amadeus import Client as AmadeusClient, ResponseError
from crewai.utilities.events import (
    CrewKickoffStartedEvent,
    CrewKickoffCompletedEvent,
    AgentExecutionStartedEvent,
    AgentExecutionCompletedEvent,
    TaskStartedEvent,
    TaskCompletedEvent,
    crewai_event_bus
)
from crewai.utilities.events.base_event_listener import BaseEventListener
import json
from datetime import datetime, timedelta # Import timedelta
from google import genai
import pytz # Keep pytz if needed elsewhere, otherwise remove if only used in tester.py
import re # Import regex for parsing
from pydantic import BaseModel, Field # Import Pydantic
from typing import List, Optional # For type hinting in Pydantic models
import uuid # For generating unique event IDs
import threading # For file locking

app = Flask(__name__)
CORS(app)

# Reset environment variables
if 'GEMINI_API_KEY' in os.environ:
    del os.environ['GEMINI_API_KEY']
if 'GOOGLE_MAPS_API_KEY' in os.environ:
    del os.environ['GOOGLE_MAPS_API_KEY']
if 'AMADEUS_CLIENT_ID' in os.environ:
    del os.environ['AMADEUS_CLIENT_ID']
if 'AMADEUS_CLIENT_SECRET' in os.environ:
    del os.environ['AMADEUS_CLIENT_SECRET']


# Load environment variables
load_dotenv()

# Configure Gemini Client
gemini_api_key = os.getenv('GEMINI_API_KEY')
if not gemini_api_key:
    raise ValueError("GEMINI_API_KEY environment variable is not set")
gemini_client = genai.Client(api_key=gemini_api_key)

# Configure Amadeus Client
amadeus_client_id = os.getenv("AMADEUS_CLIENT_ID")
amadeus_client_secret = os.getenv("AMADEUS_CLIENT_SECRET")
if not amadeus_client_id or not amadeus_client_secret:
    raise ValueError("AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET environment variables must be set")
amadeus = AmadeusClient(
    client_id=amadeus_client_id,
    client_secret=amadeus_client_secret
)


# Configure CrewAI LLM
crew_llm = LLM(model="gemini/gemini-2.0-flash-lite") # Model for CrewAI agents

def print_internal_status(status_type, message, indent=0):
    """Print formatted INTERNAL status messages"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    indent_str = "  " * indent
    status_color = {
        'info': '\033[94m',
        'success': '\033[92m',
        'working': '\033[93m',
        'error': '\033[91m',
        'complete': '\033[92m'
    }.get(status_type, '\033[0m')
    reset_color = '\033[0m'
    print(f"{indent_str}{status_color}[{timestamp} INTERNAL] {message}{reset_color}")

def print_user_summary(summary_text):
     """Prints the user-facing summary"""
     print(f"\033[96m[CAN BE READ]: {summary_text}\033[0m") # Cyan color

def generate_and_print_summary(action_description):
    """Generate summary using Gemini and print it."""
    if not action_description:
        return

    prompt = f"""
    Based on the latest action: "{action_description}",
    Provide a very concise, user-friendly status update (max 10 words)
    that reflects *what* the system is currently doing or has just finished, based on the latest action.
    **Use varied phrasing** for similar actions to make the updates feel less repetitive.

    Examples of varied phrasing for similar actions:
    - Input: "Health Monitor is compiling health recommendations..." -> Output: "Gathering health tips for your trip..." OR "Compiling health recommendations now..." OR "Working on your health advice..."
    - Input: "Task completed successfully!" -> Output: "Completed a step in the analysis." OR "Analysis step finished." OR "Moving to the next stage."
    - Input: "All analyses completed! Preparing final recommendations..." -> Output: "Finalizing your travel recommendations..." OR "Putting together the final plan..." OR "Almost done, preparing summary..."

    Latest Logged Action: "{action_description}"
    Concise and Varied Status Update:
    """
    try:
        response = gemini_client.models.generate_content(model='gemini-2.0-flash-lite', contents=prompt)
        summary = response.text.strip().replace('\n', ' ').replace('*', '')
        print_user_summary(summary)
    except Exception as e:
        print(f"\033[91m[ERROR SUMMARIZING]: {e}\033[0m")
        print_user_summary(f"Processing step: {action_description}") # Fallback

class StatusEventListener(BaseEventListener):
    def __init__(self):
        super().__init__()

    def setup_listeners(self, event_bus):
        @event_bus.on(CrewKickoffStartedEvent)
        def on_crew_start(source, event, **kwargs):
            action = "Starting crew execution..."
            print_internal_status('info', f"🚀 {action}")
            generate_and_print_summary(action)

        @event_bus.on(TaskStartedEvent)
        def on_task_start(source, event, **kwargs):
            # Corrected: Access description directly from the event if available
            task_desc = getattr(event, 'description', 'Unknown Task')
            action = f"Starting task: {task_desc[:50]}..." # Truncate long descriptions
            print_internal_status('working', f"📋 {action}", indent=1)
            # Don't summarize task start, wait for agent start

        @event_bus.on(AgentExecutionStartedEvent)
        def on_agent_start(source, event, **kwargs):
            agent_role = getattr(event.agent, 'role', 'Unknown Agent')
            action_desc = "analyzing the request"
            if "Travel Assistant" in agent_role:
                action_desc = "generating travel plan"
            elif "Health Monitor" in agent_role:
                action_desc = "compiling health recommendations"
            elif "Schedule Generator" in agent_role: # Added for new agent
                action_desc = "generating schedule"
            action = f"{agent_role} is {action_desc}..."
            print_internal_status('working', f"🤖 {action}", indent=2)
            generate_and_print_summary(action)

        @event_bus.on(AgentExecutionCompletedEvent)
        def on_agent_complete(source, event, **kwargs):
            agent_role = getattr(event.agent, 'role', 'Unknown Agent')
            completion_desc = "completed their analysis"
            if "Travel Assistant" in agent_role:
                completion_desc = "finished generating the travel plan"
            elif "Health Monitor" in agent_role:
                completion_desc = "finished compiling health recommendations"
            elif "Schedule Generator" in agent_role: # Added for new agent
                completion_desc = "finished generating the schedule"
            action = f"{agent_role} has {completion_desc}"
            print_internal_status('success', f"✅ {action}", indent=2)
            generate_and_print_summary(action)

        @event_bus.on(TaskCompletedEvent)
        def on_task_complete(source, event, **kwargs):
            action = "Task completed successfully!"
            print_internal_status('success', f"✅ {action}", indent=1)
            generate_and_print_summary(action)

        @event_bus.on(CrewKickoffCompletedEvent)
        def on_crew_complete(source, event, **kwargs):
            action = "All analyses completed! Preparing final recommendations..."
            print_internal_status('complete', f"🎉 {action}")
            generate_and_print_summary(action) # Summary for completion


# Initialize the event listener
status_listener = StatusEventListener()
status_listener.setup_listeners(crewai_event_bus)


# --- Calendar Event Management (Simplified for Overwrite) ---
CALENDAR_FILE = 'calendar_events.json'
RECOMMENDATIONS_FILE = 'recommendations.json' # Define recommendations file path
calendar_lock = threading.Lock() # Simple lock for file access

def read_calendar_events():
    """Reads events from the JSON file with locking."""
    with calendar_lock:
        try:
            with open(CALENDAR_FILE, 'r') as f:
                events = json.load(f)
                if not isinstance(events, list):
                    print_internal_status('warning', f"{CALENDAR_FILE} does not contain a valid JSON list. Returning empty.")
                    return []
                return events
        except (FileNotFoundError, json.JSONDecodeError):
            print_internal_status('warning', f"{CALENDAR_FILE} not found or invalid. Returning empty list.")
            return []
        except Exception as e: # Catch other potential errors
            print_internal_status('error', f"Error reading {CALENDAR_FILE}: {e}")
            return []

def clean_and_parse_json_file(file_path):
    """Reads a file, removes markdown fences, and parses JSON."""
    with calendar_lock: # Use the same lock for consistency
        try:
            if not os.path.exists(file_path):
                print_internal_status('warning', f"{file_path} not found. Returning empty list.")
                return []

            with open(file_path, 'r') as f:
                raw_content = f.read().strip()

            # Remove markdown fences if present
            if raw_content.startswith("```json"):
                raw_content = raw_content[len("```json"):].strip()
            if raw_content.startswith("```"): # Handle case without 'json' language tag
                 raw_content = raw_content[len("```"):].strip()
            if raw_content.endswith("```"):
                raw_content = raw_content[:-len("```")].strip()

            if not raw_content:
                print_internal_status('warning', f"{file_path} is empty after cleaning. Returning empty list.")
                return []

            events = json.loads(raw_content)
            if not isinstance(events, list):
                print_internal_status('warning', f"Cleaned content of {file_path} is not a valid JSON list. Returning empty.")
                return []
            return events

        except json.JSONDecodeError as e:
            print_internal_status('error', f"Error decoding cleaned JSON from {file_path}: {e}")
            return []
        except Exception as e:
            print_internal_status('error', f"Error cleaning/reading {file_path}: {e}")
            return []

# Removed write_calendar_events and clear_calendar_events as tasks handle writing now
# --- End Calendar Event Management ---


# --- Amadeus Flight Fetching Logic (Keep as is) ---
def format_iso_datetime(dt_str):
    if not dt_str: return None
    try:
        datetime.fromisoformat(dt_str)
        return dt_str
    except ValueError:
        print_internal_status('error', f"Invalid datetime format from Amadeus: {dt_str}")
        return None
    except Exception as e:
        print_internal_status('error', f"Unexpected error parsing datetime: {e}")
        return None

def get_flight_details(carrier_code, flight_number, departure_date):
    print_internal_status('info', f"✈️ Fetching flight details for {carrier_code}{flight_number} on {departure_date}...")
    try:
        response = amadeus.schedule.flights.get(
            carrierCode=carrier_code,
            flightNumber=flight_number,
            scheduledDepartureDate=departure_date
        )
        if not response.data:
            print_internal_status('error', "No flight data available from Amadeus.")
            return None, "No flight data available"
        # ... (rest of the parsing logic remains the same) ...
        flight_details_list = []
        for flight in response.data:
            flight_points = flight.get('flightPoints', [])
            segments = flight.get('segments', [])
            legs = flight.get('legs', [])
            if len(flight_points) < 2: continue
            departure_point = flight_points[0]
            arrival_point = flight_points[-1]
            departure_code = departure_point.get('iataCode')
            arrival_code = arrival_point.get('iataCode')
            departure_timings = departure_point.get('departure', {}).get('timings', [])
            arrival_timings = arrival_point.get('arrival', {}).get('timings', [])
            if not departure_timings or not arrival_timings:
                print_internal_status('warning', f"Skipping flight schedule due to missing departure/arrival timings for {carrier_code}{flight_number}.")
                continue
            departure_time_str = departure_timings[0].get('value')
            arrival_time_str = arrival_timings[0].get('value')
            if not all([departure_code, arrival_code, departure_time_str, arrival_time_str]):
                print_internal_status('warning', f"Skipping flight schedule due to missing essential codes or time strings for {carrier_code}{flight_number}.")
                continue
            departure_iso = format_iso_datetime(departure_time_str)
            arrival_iso = format_iso_datetime(arrival_time_str)
            if not departure_iso or not arrival_iso: continue
            segment_info = [
                {
                    "boardPointIataCode": seg.get('boardPointIataCode'), "offPointIataCode": seg.get('offPointIataCode'),
                    "scheduledSegmentDuration": seg.get('scheduledSegmentDuration'),
                    "operatingCarrierCode": seg.get('partnership', {}).get('operatingFlight', {}).get('carrierCode'),
                    "operatingFlightNumber": seg.get('partnership', {}).get('operatingFlight', {}).get('flightNumber')
                } for seg in segments if seg.get('boardPointIataCode') == departure_code and seg.get('offPointIataCode') == arrival_code
            ]
            leg_info = [
                {
                    "boardPointIataCode": leg.get('boardPointIataCode'), "offPointIataCode": leg.get('offPointIataCode'),
                    "aircraftType": leg.get('aircraftEquipment', {}).get('aircraftType'),
                    "scheduledLegDuration": leg.get('scheduledLegDuration')
                } for leg in legs if leg.get('boardPointIataCode') == departure_code and leg.get('offPointIataCode') == arrival_code
            ]
            flight_output = {
                "flightDesignator": {"carrierCode": carrier_code, "flightNumber": flight_number, "scheduledDepartureDate": departure_date},
                "departure": {"airportCode": departure_code, "scheduledTimeISO": departure_iso},
                "arrival": {"airportCode": arrival_code, "scheduledTimeISO": arrival_iso},
                "segments": segment_info, "legs": leg_info
            }
            flight_details_list.append(flight_output)
            break
        if flight_details_list:
            print_internal_status('success', "✅ Successfully fetched flight details.")
            return flight_details_list[0], None
        else:
            print_internal_status('error', "Could not extract complete flight details from Amadeus response.")
            return None, "Could not extract complete flight details"
    except ResponseError as error:
        print_internal_status('error', f"Amadeus API Error: {error}")
        return None, f"Amadeus API Error: {str(error)}"
    except Exception as e:
        print_internal_status('error', f"Unexpected error fetching flight details: {e}")
        return None, f"Unexpected error fetching flight details: {str(e)}"
# --- End Amadeus Logic ---

# --- Pydantic Models for Structured Output (Keep as is) ---
class SleepSchedule(BaseModel):
    adjustment_period_advice: Optional[str] = Field(..., description="Advice on adjusting sleep before/during/after the flight.")
    recommended_bedtime_local: Optional[str] = Field(..., description="Recommended bedtime in the destination's local time (e.g., '10:00 PM Tokyo Time').")
    recommended_wake_time_local: Optional[str] = Field(..., description="Recommended wake-up time in the destination's local time (e.g., '7:00 AM Tokyo Time').")
    nap_strategy_advice: Optional[str] = Field(..., description="Advice on napping strategy.")
class ExercisePlan(BaseModel):
    pre_flight_routine: Optional[List[str]] = Field(..., description="List of recommended exercises/activities before the flight.")
    during_flight_movement: Optional[List[str]] = Field(..., description="List of recommended exercises/activities during the flight.")
    post_flight_activity: Optional[List[str]] = Field(..., description="List of recommended exercises/activities after arrival.")
class MealTiming(BaseModel):
    first_day_breakfast: Optional[str] = Field(..., description="Advice on timing for breakfast on the first day at the destination.")
    first_day_lunch: Optional[str] = Field(..., description="Advice on timing for lunch on the first day at the destination.")
    first_day_dinner: Optional[str] = Field(..., description="Advice on timing for dinner on the first day at the destination.")
class MealPlan(BaseModel):
    timing_adjustment: Optional[MealTiming] = Field(..., description="Meal timing advice for the destination.")
    dietary_recommendations: Optional[List[str]] = Field(..., description="List of dietary suggestions for travel.")
class HydrationPlan(BaseModel):
    daily_target_liters: Optional[str] = Field(..., description="Recommended daily water intake target (e.g., '2-3 liters').")
    hydration_schedule_tips: Optional[List[str]] = Field(..., description="List of hydration reminders/tips.")
class HealthRecommendations(BaseModel):
    sleep_schedule: Optional[SleepSchedule] = Field(..., description="Detailed sleep schedule recommendations.")
    exercise_plan: Optional[ExercisePlan] = Field(..., description="Detailed exercise plan recommendations.")
    meal_plan: Optional[MealPlan] = Field(..., description="Detailed meal plan recommendations.")
    hydration_plan: Optional[HydrationPlan] = Field(..., description="Detailed hydration plan recommendations.")
# --- End Pydantic Models ---


def get_crew_llm():
    return crew_llm

# Initialize travel assistant agent
travel_assistant = Agent(
    role='Travel Assistant',
    goal='Analyze detailed flight information and provide recommendations to help travelers adjust to new time zones and maintain health during travel.',
    backstory='Expert in travel health, circadian rhythms, and jet lag management, skilled at interpreting complex flight schedules.',
    allow_delegation=False,
    llm=get_crew_llm(),
    verbose=False
)

# Initialize health monitor agent
health_monitor = Agent(
    role='Health Monitor',
    goal='Based on detailed flight information, provide recommendations for traveler health and well-being, focusing on sleep, exercise, meals, and hydration.',
    backstory='Specialized in travel health, stress management, and circadian rhythm optimization, adept at creating personalized plans based on flight specifics.',
    allow_delegation=False,
    llm=get_crew_llm(),
    verbose=False
)

# Initialize schedule generator agent (No tools needed)
schedule_generator = Agent(
    role='Schedule Generator',
    goal='Generate a complete daily schedule in JSON format based on flight details and health recommendations.',
    backstory='An expert planner that synthesizes travel and health information into a structured, timed schedule.',
    allow_delegation=False,
    llm=get_crew_llm(),
    verbose=False
)


def create_travel_crew(flight_details_json):
    """Creates the CrewAI crew with tasks using detailed flight context."""
    flight_details = json.loads(flight_details_json)
    destination_code = flight_details.get('arrival', {}).get('airportCode', 'Unknown Destination')
    departure_time = flight_details.get('departure', {}).get('scheduledTimeISO', 'Unknown Departure Time')
    arrival_time = flight_details.get('arrival', {}).get('scheduledTimeISO', 'Unknown Arrival Time')
    legs_data = flight_details.get('legs', [])
    duration = 'Unknown Duration'
    if legs_data:
        duration = legs_data[0].get('scheduledLegDuration', 'Unknown Duration')
    else:
        print_internal_status('warning', "No 'legs' data found in flight details to determine duration.")

    # Task 1: Analyze Travel
    analyze_travel = Task(
        description=f"""
        Analyze the provided flight details and generate travel recommendations focusing on:
        1. Circadian rhythm adjustment strategy (consider departure time {departure_time}, arrival time {arrival_time}, flight duration {duration}, and destination {destination_code}).
        2. Pre-flight preparation.
        3. During flight activities (consider flight duration {duration}).
        4. Post-arrival adjustment plan for {destination_code}.

        **Full Flight Context:**
        ```json
        {flight_details_json}
        ```

        Format your response strictly as a JSON object with the following structure:
        {{
            "circadian_adjustment": {{ ... }}, "preparation": {{ ... }}, "flight_wellbeing": {{ ... }}, "arrival_plan": {{ ... }}
        }}
        """,
        agent=travel_assistant,
        expected_output="JSON object containing detailed travel adjustment and preparation recommendations."
    )

    # Task 2: Health Recommendations
    health_recommendations_task = Task(
        description=f"""
        Based on the provided flight details, generate personalized health recommendations covering sleep, exercise, meals, and hydration for the trip to {destination_code}. Ensure all fields in the required output structure are populated with relevant advice.

        **Full Flight Context:**
        ```json
        {flight_details_json}
        ```
        """,
        agent=health_monitor,
        expected_output="A Pydantic object conforming to the HealthRecommendations model.",
        output_pydantic=HealthRecommendations,
        output_file=RECOMMENDATIONS_FILE, # Save health recommendations to file
        context=[analyze_travel]
    )

    # Task 3: Generate Schedule JSON
    generate_schedule_task = Task(
        description=f"""
        Based on the flight details and the generated health recommendations, generate a complete daily schedule as a JSON list.
        Include events for:
        1. Key activities suggested in the health recommendations (e.g., recommended bedtime/wake time, meal times, exercise blocks). Use appropriate titles and descriptions.
        2. The flight departure and arrival itself.
        Ensure all event times (startTime, endTime) are in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ). Generate unique IDs for each event using UUID format.

        **Flight Context:**
        ```json
        {flight_details_json}
        ```

        **Health Recommendations Context (from previous task):**
        [Refer to the output of the 'health_recommendations_task']

        Output ONLY the JSON list, nothing else. Ensure the output is a single, valid JSON list structure.
        """,
        agent=schedule_generator,
        context=[health_recommendations_task], # Depend on the health task
        expected_output="A valid JSON list representing the schedule. Each item should be an object with 'id' (string, UUID format), 'title' (string), 'startTime' (string, ISO 8601), 'endTime' (string, ISO 8601), and optional 'description' (string). Output ONLY the JSON list.",
        output_file=CALENDAR_FILE # Save output directly to calendar file
    )

    # Create and return the crew
    crew = Crew(
        agents=[travel_assistant, health_monitor, schedule_generator],
        tasks=[analyze_travel, health_recommendations_task, generate_schedule_task],
        process=Process.sequential,
        verbose=False
    )
    return crew

@app.route('/api/flight-recommendations', methods=['POST'])
def flight_recommendations_endpoint():
    try:
        data = request.json
        required_fields = ['carrierCode', 'flightNumber', 'scheduledDepartureDate']
        if not data or not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing or invalid required fields', 'required_fields': required_fields}), 400

        carrier_code = data['carrierCode']
        flight_number = data['flightNumber']
        departure_date = data['scheduledDepartureDate']
        print_internal_status('info', f"📝 Received new flight recommendation request for {carrier_code}{flight_number} on {departure_date}")

        # 1. Get Flight Details
        flight_details, error_msg = get_flight_details(carrier_code, flight_number, departure_date)
        if error_msg: return jsonify({'error': f"Failed to get flight details: {error_msg}"}), 500
        if not flight_details: return jsonify({'error': "Failed to get flight details, no specific error message."}), 500
        flight_details_json_str = json.dumps(flight_details)

        # 2. Run CrewAI (tasks will save outputs to files)
        # Removed clear_calendar_events() - schedule task now overwrites via output_file
        print_internal_status('info', "🧠 Initializing CrewAI analysis and schedule generation...")
        crew = create_travel_crew(flight_details_json_str)
        crew_result = crew.kickoff() # Run the crew

        # 3. Read Recommendations from file for response
        recommendations_dict = {}
        try:
            # Ensure file exists before trying to read
            if os.path.exists(RECOMMENDATIONS_FILE):
                 with open(RECOMMENDATIONS_FILE, 'r') as f:
                    recommendations_dict = json.load(f)
                 print_internal_status('info', f"Read recommendations from {RECOMMENDATIONS_FILE}")
            else:
                 print_internal_status('error', f"❌ Recommendations file '{RECOMMENDATIONS_FILE}' not found after crew kickoff.")
                 recommendations_dict = {"error": "Recommendations file not generated by task."}

        except json.JSONDecodeError:
             print_internal_status('error', f"❌ Error decoding JSON from {RECOMMENDATIONS_FILE}.")
             recommendations_dict = {"error": "Failed to decode recommendations file."}
        except Exception as e:
             print_internal_status('error', f"❌ Error reading recommendations file: {e}")
             recommendations_dict = {"error": f"Error reading recommendations file: {e}"}

        # Schedule is saved directly by the generate_schedule_task

        # 4. Combine and return flight details + health recommendations
        final_response = {
            'success': True,
            'flight_details': flight_details,
            'recommendations': recommendations_dict
            # Schedule is saved to file, not returned directly here,
            # but frontend will fetch it separately from /api/calendar/events
        }
        print_internal_status('complete', "✅ Successfully generated flight recommendations and schedule.")
        return jsonify(final_response)

    except Exception as e:
        print_internal_status('error', f"❌ Unexpected error in endpoint: {str(e)}")
        return jsonify({'error': f"An unexpected server error occurred: {str(e)}"}), 500

@app.route('/api/health-data', methods=['POST'])
def receive_health_data():
    """Receives health data from the frontend and performs analysis."""
    try:
        health_data = request.json
        if not health_data:
            print_internal_status('error', "❌ Received empty health data payload.")
            return jsonify({'error': 'No data received'}), 400
        print_internal_status('info', "🩺 Received health data from frontend.")
        file_path = 'health_data.json'
        print_internal_status('info', f"💾 Saving health data to {file_path}...")
        try:
            with open(file_path, 'w') as f:
                json.dump(health_data, f, indent=2)
            print_internal_status('success', f"✅ Successfully saved health data to {file_path}")
        except IOError as e:
            print_internal_status('error', f"❌ Error saving health data to file: {str(e)}")
            return jsonify({'error': f"Failed to save health data to file: {str(e)}", 'analysis': None}), 500
        print_internal_status('info', "📊 Analyzing saved health data...")
        average_hr = None
        total_sleep_str = "N/A"
        try:
            total_hr_bpm = 0
            hr_sample_count = 0
            if 'heartRateRecords' in health_data and isinstance(health_data['heartRateRecords'], list):
                for record in health_data['heartRateRecords']:
                    if 'samples' in record and isinstance(record['samples'], list):
                        for sample in record['samples']:
                            if 'beatsPerMinute' in sample:
                                total_hr_bpm += sample['beatsPerMinute']
                                hr_sample_count += 1
            if hr_sample_count > 0: average_hr = total_hr_bpm / hr_sample_count
            total_sleep_duration = timedelta(0)
            if 'sleepRecords' in health_data and isinstance(health_data['sleepRecords'], list):
                for record in health_data['sleepRecords']:
                    try:
                        start_time_str = record.get('startTime', '').replace('Z', '')
                        end_time_str = record.get('endTime', '').replace('Z', '')
                        if start_time_str and end_time_str:
                            start_dt = datetime.fromisoformat(start_time_str)
                            end_dt = datetime.fromisoformat(end_time_str)
                            total_sleep_duration += (end_dt - start_dt)
                    except Exception as e: print_internal_status('warning', f"Could not parse sleep record times: {e}")
            if total_sleep_duration.total_seconds() > 0:
                total_seconds = int(total_sleep_duration.total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                total_sleep_str = f"{hours}h {minutes}m"
            return jsonify({'message': 'Health data received, saved, and analyzed.', 'averageHeartRate': average_hr, 'totalSleepTime': total_sleep_str}), 200
        except Exception as e:
             print_internal_status('error', f"❌ Error during health data analysis: {str(e)}")
             return jsonify({'message': 'Health data received and saved, but analysis failed.', 'error_analysis': str(e), 'averageHeartRate': None, 'totalSleepTime': None}), 500
    except Exception as e:
        print_internal_status('error', f"❌ Error processing health data: {str(e)}")
        return jsonify({'error': f"An unexpected server error occurred: {str(e)}"}), 500

@app.route('/api/calendar/events', methods=['GET'])
def get_calendar_events_endpoint():
    """API endpoint to get all calendar events after cleaning potential markdown."""
    print_internal_status('info', "API: Received request for /api/calendar/events")
    # Use the cleaning function instead of the basic read
    events = clean_and_parse_json_file(CALENDAR_FILE)
    return jsonify(events)

# Removed specific create/delete/update API endpoints for calendar

@app.route('/api/health-check', methods=['GET'])
def health_check():
    # ... (Keep existing health check logic) ...
    dependencies_ok = bool(gemini_api_key and amadeus_client_id and amadeus_client_secret)
    return jsonify({'status': 'healthy' if dependencies_ok else 'degraded', 'dependencies': {'gemini': 'ok' if gemini_api_key else 'missing_key', 'amadeus': 'ok' if amadeus_client_id and amadeus_client_secret else 'missing_keys'}, 'version': '1.1.0'})

# Main execution block (Keep as is)
if __name__ == '__main__':
    # ... (Keep existing startup messages and app.run) ...
    print("\n" + "="*60)
    print_internal_status('info', "🚀 Flight Recommendation API Starting")
    print_internal_status('info', f"🔑 Gemini API Key loaded: {'Yes' if gemini_api_key else 'No'}")
    print_internal_status('info', f"🔑 Amadeus API Keys loaded: {'Yes' if amadeus_client_id and amadeus_client_secret else 'No'}")
    print("="*60 + "\n")
    app.run(debug=True, port=5000, host='0.0.0.0', use_reloader=False, threaded=True)
