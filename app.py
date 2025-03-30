from flask import Flask, request, jsonify
from crewai import Agent, Task, Crew
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
from datetime import datetime
from google import genai
import pytz # Keep pytz if needed elsewhere, otherwise remove if only used in tester.py

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
    provide a very concise, user-friendly status update (max 10 words) 
    that reflects *what* the system is currently doing or has just finished.

    Examples:
    - Input: "Travel Assistant is generating travel plan..." Output: "Creating your personalized travel plan..."
    - Input: "Health Monitor is compiling health recommendations..." Output: "Gathering health tips for your trip..."
    - Input: "Travel Assistant has finished generating the travel plan" Output: "Travel plan generated, moving to health tips."
    - Input: "Health Monitor has finished compiling health recommendations" Output: "Health recommendations compiled."
    - Input: "Starting crew execution..." Output: "Starting your travel analysis..."
    - Input: "Task completed successfully!" Output: "Completed a step in the analysis."
    - Input: "All analyses completed! Preparing final recommendations..." Output: "Finalizing your travel recommendations..."

    Latest Logged Action: "{action_description}"
    Concise Status Update:
    """
    try:
        response = gemini_client.models.generate_content(model='gemini-2.0-flash-lite', contents=prompt)
        summary = response.text.strip().replace('\n', ' ').replace('*', '')
        # Keep the logic for adding "..." if needed, or adjust as preferred
        # if "ing" in summary and "completed" not in summary and "finished" not in summary:
        #      summary += "..."
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
            action = "Starting new task..."
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
            
            # This listener just signals completion.
            # The actual data handling and returning happens in the endpoint.


# Initialize the event listener
status_listener = StatusEventListener()
status_listener.setup_listeners(crewai_event_bus)

# --- Amadeus Flight Fetching Logic (from tester.py) ---
def format_iso_datetime(dt_str):
    """Parses datetime string and returns ISO 8601 format."""
    if not dt_str: return None
    try:
        # Assuming Amadeus provides correctly formatted ISO 8601 strings with offset
        datetime.fromisoformat(dt_str) # Validate format
        return dt_str
    except ValueError:
        print_internal_status('error', f"Invalid datetime format from Amadeus: {dt_str}")
        return None
    except Exception as e:
        print_internal_status('error', f"Unexpected error parsing datetime: {e}")
        return None

def get_flight_details(carrier_code, flight_number, departure_date):
    """Fetches flight details from Amadeus API."""
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

        flight_details_list = []
        for flight in response.data:
            flight_points = flight.get('flightPoints', [])
            segments = flight.get('segments', [])
            legs = flight.get('legs', [])

            if len(flight_points) < 2:
                continue # Need at least departure and arrival

            departure_point = flight_points[0]
            arrival_point = flight_points[-1]

            departure_code = departure_point.get('iataCode')
            arrival_code = arrival_point.get('iataCode')

            departure_time_str = departure_point.get('departure', {}).get('timings', [{}])[0].get('value')
            arrival_time_str = arrival_point.get('arrival', {}).get('timings', [{}])[0].get('value')

            if not all([departure_code, arrival_code, departure_time_str, arrival_time_str]):
                continue # Missing essential info

            departure_iso = format_iso_datetime(departure_time_str)
            arrival_iso = format_iso_datetime(arrival_time_str)

            if not departure_iso or not arrival_iso:
                continue # Invalid time format

            # Extract relevant segment and leg details
            segment_info = [
                {
                    "boardPointIataCode": seg.get('boardPointIataCode'),
                    "offPointIataCode": seg.get('offPointIataCode'),
                    "scheduledSegmentDuration": seg.get('scheduledSegmentDuration'),
                    "operatingCarrierCode": seg.get('partnership', {}).get('operatingFlight', {}).get('carrierCode'),
                    "operatingFlightNumber": seg.get('partnership', {}).get('operatingFlight', {}).get('flightNumber')
                } for seg in segments if seg.get('boardPointIataCode') == departure_code and seg.get('offPointIataCode') == arrival_code
            ]

            leg_info = [
                {
                    "boardPointIataCode": leg.get('boardPointIataCode'),
                    "offPointIataCode": leg.get('offPointIataCode'),
                    "aircraftType": leg.get('aircraftEquipment', {}).get('aircraftType'),
                    "scheduledLegDuration": leg.get('scheduledLegDuration')
                } for leg in legs if leg.get('boardPointIataCode') == departure_code and leg.get('offPointIataCode') == arrival_code
            ]

            flight_output = {
                "flightDesignator": {
                    "carrierCode": carrier_code,
                    "flightNumber": flight_number,
                    "scheduledDepartureDate": departure_date
                },
                "departure": {
                    "airportCode": departure_code,
                    "scheduledTimeISO": departure_iso
                },
                "arrival": {
                    "airportCode": arrival_code,
                    "scheduledTimeISO": arrival_iso
                },
                "segments": segment_info,
                "legs": leg_info
            }
            flight_details_list.append(flight_output)
            # Assuming we only need the first valid schedule entry found
            break

        if flight_details_list:
            print_internal_status('success', "✅ Successfully fetched flight details.")
            return flight_details_list[0], None # Return the first found details
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


def get_crew_llm():
    return crew_llm

# Initialize travel assistant agent
travel_assistant = Agent(
    role='Travel Assistant',
    goal='Analyze detailed flight information and provide recommendations to help travelers adjust to new time zones and maintain health during travel.',
    backstory='Expert in travel health, circadian rhythms, and jet lag management, skilled at interpreting complex flight schedules.',
    allow_delegation=False, # Keep delegation settings as they were
    llm=get_crew_llm(),
    verbose=False # Keep verbose setting
)

# Initialize health monitor agent
health_monitor = Agent(
    role='Health Monitor',
    goal='Based on detailed flight information, provide recommendations for traveler health and well-being, focusing on sleep, exercise, meals, and hydration.',
    backstory='Specialized in travel health, stress management, and circadian rhythm optimization, adept at creating personalized plans based on flight specifics.',
    allow_delegation=False, # Keep delegation settings
    llm=get_crew_llm(),
    verbose=False # Keep verbose setting
)

def create_travel_crew(flight_details_json):
    """Creates the CrewAI crew with tasks using detailed flight context."""

    # Extract key info for easier prompt templating if needed, but pass full JSON too
    flight_details = json.loads(flight_details_json) # Parse the JSON string
    destination_code = flight_details.get('arrival', {}).get('airportCode', 'Unknown Destination')
    departure_time = flight_details.get('departure', {}).get('scheduledTimeISO', 'Unknown Departure Time')
    arrival_time = flight_details.get('arrival', {}).get('scheduledTimeISO', 'Unknown Arrival Time')
    duration = flight_details.get('legs', [{}])[0].get('scheduledLegDuration', 'Unknown Duration') # Example: Get duration from first leg

    # Create tasks for the crew, providing the full flight details as context
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
            "circadian_adjustment": {{
                "pre_flight_strategy": [list of strategies],
                "during_flight_strategy": [list of strategies],
                "post_arrival_strategy": [list of strategies]
            }},
            "preparation": {{
                 "packing_tips": [list of tips],
                 "wellbeing_prep": [list of tasks]
            }},
            "flight_wellbeing": {{
                "in_flight_activities": [list of recommended activities],
                "in_flight_health_tips": [list of health-related tips]
            }},
            "arrival_plan": {{
                 "first_24_hours": [list of recommendations],
                 "long_term_adjustment": [list of recommendations]
            }}
        }}
        """,
        agent=travel_assistant,
        expected_output="JSON object containing detailed travel adjustment and preparation recommendations based on the provided flight context."
    )

    health_recommendations = Task(
        description=f"""
        Based on the provided flight details, generate personalized health recommendations covering sleep, exercise, meals, and hydration for the trip to {destination_code}.

        **Full Flight Context:**
        ```json
        {flight_details_json}
        ```

        Format your response strictly as a JSON object with the following structure:
        {{
            "sleep_schedule": {{
                "adjustment_period_advice": "string",
                "recommended_bedtime_local": "string (e.g., '10:00 PM Tokyo Time')",
                "recommended_wake_time_local": "string (e.g., '7:00 AM Tokyo Time')",
                "nap_strategy_advice": "string"
            }},
            "exercise_plan": {{
                "pre_flight_routine": [list of exercises/activities],
                "during_flight_movement": [list of exercises/activities],
                "post_flight_activity": [list of exercises/activities]
            }},
            "meal_plan": {{
                "timing_adjustment": {{
                    "first_day_breakfast": "string (advice on timing)",
                    "first_day_lunch": "string (advice on timing)",
                    "first_day_dinner": "string (advice on timing)"
                }},
                "dietary_recommendations": [list of dietary suggestions for travel]
            }},
            "hydration_plan": {{
                "daily_target_liters": "string (e.g., '2-3 liters')",
                "hydration_schedule_tips": [list of hydration reminders/tips]
            }}
        }}
        """,
        agent=health_monitor,
        expected_output="JSON object containing personalized health recommendations (sleep, exercise, meals, hydration) based on the provided flight context."
    )

    # Create and return the crew
    crew = Crew(
        agents=[travel_assistant, health_monitor],
        tasks=[analyze_travel, health_recommendations],
        verbose=False # Keep verbose setting
    )
    return crew

@app.route('/api/flight-recommendations', methods=['POST'])
def flight_recommendations_endpoint():
    try:
        data = request.json
        required_fields = ['carrierCode', 'flightNumber', 'scheduledDepartureDate']

        # Validate input
        if not data or not all(field in data for field in required_fields):
            print_internal_status('error', f"❌ Invalid request payload. Required fields: {required_fields}")
            return jsonify({
                'error': 'Missing or invalid required fields',
                'required_fields': required_fields
            }), 400

        carrier_code = data['carrierCode']
        flight_number = data['flightNumber']
        departure_date = data['scheduledDepartureDate']

        print_internal_status('info', f"📝 Received new flight recommendation request for {carrier_code}{flight_number} on {departure_date}")

        # 1. Get Flight Details from Amadeus
        flight_details, error_msg = get_flight_details(carrier_code, flight_number, departure_date)

        if error_msg:
            return jsonify({'error': f"Failed to get flight details: {error_msg}"}), 500
        if not flight_details:
             return jsonify({'error': "Failed to get flight details, no specific error message."}), 500

        # Convert flight details dict to JSON string for CrewAI context
        flight_details_json_str = json.dumps(flight_details)

        # 2. Create and run the CrewAI crew with flight context
        print_internal_status('info', "🧠 Initializing CrewAI analysis with flight context...")
        crew = create_travel_crew(flight_details_json_str)
        crew_result_raw = crew.kickoff() # This triggers event listeners for progress

        # Attempt to parse the crew result (assuming it might be a string containing JSONs)
        recommendations = {}
        try:
            # CrewAI might return concatenated JSON strings or a single complex string.
            # This is a basic attempt; might need refinement based on actual crew_result_raw format.
            # Look for the JSON structures expected from the tasks.
            # A more robust approach might involve modifying agents/tasks to return a single combined JSON.
            travel_analysis_str = None
            health_rec_str = None

            # Simple split might work if results are clearly separated (e.g., by newlines or specific markers)
            # Or, parse based on expected keys if the output is one large JSON string
            # For now, let's assume the raw output might need parsing or the agents return structured data directly.
            # If crew_result_raw IS the structured data (dict/list), use it directly.
            # If it's a string, attempt parsing.

            # Placeholder: Assume crew_result_raw is usable or needs specific parsing logic here.
            # For simplicity, let's assume the last task's output (health) is the primary result string
            # and we need to parse it. This might be incorrect depending on CrewAI setup.
            if isinstance(crew_result_raw, str):
                 # Try finding the health recommendations JSON
                 health_start = crew_result_raw.rfind('{"sleep_schedule":') # Find last occurrence
                 if health_start != -1:
                     try:
                         recommendations = json.loads(crew_result_raw[health_start:])
                     except json.JSONDecodeError:
                         print_internal_status('warning', "⚠️ Could not directly parse crew result as JSON, returning raw.")
                         recommendations = {"raw_crew_output": crew_result_raw}
                 else:
                     recommendations = {"raw_crew_output": crew_result_raw}
            elif isinstance(crew_result_raw, dict) or isinstance(crew_result_raw, list):
                 # If CrewAI returns structured data directly
                 recommendations = crew_result_raw # Or process as needed
            else:
                 recommendations = {"raw_crew_output": str(crew_result_raw)}


        except Exception as parse_error:
            print_internal_status('error', f"❌ Error parsing CrewAI result: {parse_error}")
            recommendations = {"error_parsing_crew_result": str(parse_error), "raw_output": str(crew_result_raw)}


        # 3. Combine and return
        final_response = {
            'success': True,
            'flight_details': flight_details,
            'recommendations': recommendations # This now contains the parsed/raw crew output
        }
        print_internal_status('complete', "✅ Successfully generated flight recommendations.")
        return jsonify(final_response)

    except Exception as e:
        print_internal_status('error', f"❌ Unexpected error in endpoint: {str(e)}")
        # Add traceback for debugging if needed:
        # import traceback
        # print_internal_status('error', traceback.format_exc())
        return jsonify({
            'error': f"An unexpected server error occurred: {str(e)}"
        }), 500

@app.route('/api/health-check', methods=['GET'])
def health_check():
    """Basic health check endpoint."""
    # Check basic connectivity/config if needed
    dependencies_ok = bool(gemini_api_key and amadeus_client_id and amadeus_client_secret)
    return jsonify({
        'status': 'healthy' if dependencies_ok else 'degraded',
        'dependencies': {
            'gemini': 'ok' if gemini_api_key else 'missing_key',
            'amadeus': 'ok' if amadeus_client_id and amadeus_client_secret else 'missing_keys'
        },
        'version': '1.1.0' # Example version bump
    })

if __name__ == '__main__':
    print("\n" + "="*60)
    print_internal_status('info', "🚀 Flight Recommendation API Starting")
    print_internal_status('info', f"🔑 Gemini API Key loaded: {'Yes' if gemini_api_key else 'No'}")
    print_internal_status('info', f"🔑 Amadeus API Keys loaded: {'Yes' if amadeus_client_id and amadeus_client_secret else 'No'}")
    print("="*60 + "\n")
    # Consider setting debug=False for production environments
    # threaded=True is generally good for handling concurrent requests
    app.run(debug=True, port=5000, host='0.0.0.0', use_reloader=False, threaded=True)
