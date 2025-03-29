from flask import Flask, request, jsonify
from crewai import Agent, Task, Crew
from dotenv import load_dotenv
import os
from flask_cors import CORS
from crewai import LLM
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

app = Flask(__name__)
CORS(app)

# Reset environment variables
if 'GEMINI_API_KEY' in os.environ:
    del os.environ['GEMINI_API_KEY']
if 'GOOGLE_MAPS_API_KEY' in os.environ:
    del os.environ['GOOGLE_MAPS_API_KEY']

# Load environment variables
load_dotenv()

# Configure Gemini Client
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is not set")
client = genai.Client(api_key=api_key)

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
    - Input: "Travel Assistant is generating travel plan..." Output: "Creating your personalized travel plan"
    - Input: "Health Monitor is compiling health recommendations..." Output: "Gathering health tips for your trip"
    - Input: "Travel Assistant has finished generating the travel plan" Output: "Travel plan generated, moving to health tips"
    - Input: "Health Monitor has finished compiling health recommendations" Output: "Health recommendations compiled"
    - Input: "Starting crew execution..." Output: "Starting your travel analysis"
    - Input: "Task completed successfully!" Output: "Completed a step in the analysis"
    - Input: "All analyses completed! Preparing final recommendations..." Output: "Finalizing your travel recommendations"

    Latest Logged Action: "{action_description}"
    Concise Status Update:
    """
    try:
        response = client.models.generate_content(model='gemini-2.0-flash-lite', contents=prompt)
        summary = response.text.strip().replace('\n', ' ').replace('*', '')
        if "ing" in summary and "completed" not in summary and "finished" not in summary:
             summary += "..."
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
            
            # Format and print the final result for the user
            final_result_str = str(event.output) if hasattr(event, 'output') else "{}"
            try:
                # Attempt to pretty-print if it's JSON within the string
                # Find the start and end of the JSON part
                json_start = final_result_str.find('{')
                json_end = final_result_str.rfind('}')
                if json_start != -1 and json_end != -1:
                    json_content = final_result_str[json_start:json_end+1]
                    parsed_json = json.loads(json_content)
                    pretty_result = json.dumps(parsed_json, indent=2)
                    print_user_summary(f"Your personalized travel recommendations:\n{pretty_result}")
                else:
                    # Fallback if JSON parsing fails
                    print_user_summary(f"Your personalized travel recommendations:\n{final_result_str}")
            except Exception as parse_error:
                 print_internal_status('error', f"Could not parse final result for pretty printing: {parse_error}")
                 print_user_summary(f"Your personalized travel recommendations:\n{final_result_str}") # Print raw string on error


# Initialize the event listener
status_listener = StatusEventListener()
status_listener.setup_listeners(crewai_event_bus)

def get_crew_llm():
    return crew_llm

# Initialize travel assistant agent
travel_assistant = Agent(
    role='Travel Assistant',
    goal='Help travelers adjust to new time zones and maintain health during travel',
    backstory='Expert in travel health, circadian rhythms, and jet lag management',
    allow_delegation=False,
    llm=get_crew_llm(),
    verbose=False 
)

# Initialize health monitor agent
health_monitor = Agent(
    role='Health Monitor',
    goal='Monitor and provide recommendations for traveler health and well-being',
    backstory='Specialized in travel health, stress management, and circadian rhythm optimization',
    allow_delegation=False,
    llm=get_crew_llm(),
    verbose=False 
)

def create_travel_crew(destination, departure_time):
    # Create tasks for the crew
    analyze_travel = Task(
        description=f"""
        Analyze travel requirements and provide recommendations for:
        1. Circadian rhythm adjustment strategy
        2. Pre-flight preparation
        3. During flight activities
        4. Post-arrival adjustment plan
        Consider departure time: {departure_time}
        Consider destination: {destination}
        
        Format your response as a JSON object with the following structure:
        {{
            "pre_flight": {{
                "circadian_adjustment": [list of strategies],
                "preparation": [list of tasks]
            }},
            "during_flight": {{
                "activities": [list of recommended activities],
                "health_tips": [list of health-related tips]
            }},
            "post_arrival": {{
                "adjustment_plan": [list of adjustment strategies],
                "schedule": {{
                    "day1": [list of recommendations],
                    "day2": [list of recommendations],
                    "day3": [list of recommendations]
                }}
            }}
        }}
        """,
        agent=travel_assistant,
        expected_output="JSON formatted travel recommendations including pre-flight, during-flight, and post-arrival strategies"
    )

    health_recommendations = Task(
        description=f"""
        Provide health recommendations for travel to {destination}. 
        
        Format your response as a JSON object with the following structure:
        {{
            "sleep_schedule": {{
                "adjustment_period": string,
                "recommended_bedtime": string,
                "recommended_wake_time": string,
                "nap_strategy": string
            }},
            "exercise": {{
                "pre_flight": [list of exercises],
                "during_flight": [list of exercises],
                "post_flight": [list of exercises]
            }},
            "meals": {{
                "timing": {{
                    "breakfast": string,
                    "lunch": string,
                    "dinner": string
                }},
                "recommendations": [list of dietary suggestions]
            }},
            "hydration": {{
                "daily_target": string,
                "schedule": [list of hydration reminders]
            }}
        }}
        """,
        agent=health_monitor,
        expected_output="JSON formatted health recommendations including sleep, exercise, meal, and hydration schedules"
    )

    # Create and return the crew
    crew = Crew(
        agents=[travel_assistant, health_monitor],
        tasks=[analyze_travel, health_recommendations],
        verbose=False 
    )
    return crew

@app.route('/api/travel-assistant', methods=['POST'])
def travel_assistant_endpoint():
    try:
        data = request.json
        required_fields = ['destination', 'departure_time']
        
        # Validate input
        if not all(field in data for field in required_fields):
            return jsonify({
                'error': 'Missing required fields',
                'required_fields': required_fields
            }), 400

        print_internal_status('info', "📝 Received new travel assistance request")
        print_internal_status('info', f"🌍 Destination: {data['destination']}", indent=1)
        print_internal_status('info', f"🕒 Departure: {data['departure_time']}", indent=1)
        
        # Create and run the crew
        crew = create_travel_crew(data['destination'], data['departure_time'])
        result = crew.kickoff() # This now triggers the event listener

        # The final result is printed by the on_crew_complete listener
        # We still return it in the API response for potential frontend use
        return jsonify({
            'success': True,
            'result': str(result) 
        })

    except Exception as e:
        print_internal_status('error', f"❌ Error: {str(e)}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/api/health-check', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0'
    })

if __name__ == '__main__':
    print("\n" + "="*50)
    print_internal_status('info', "🌟 Travel Assistant API Starting")
    print_internal_status('info', f"🔑 API Key loaded: {'Yes' if api_key else 'No'}")
    print("="*50 + "\n")
    app.run(debug=True, port=5000, host='0.0.0.0', use_reloader=False, threaded=True)
