from amadeus import Client, ResponseError
from dotenv import load_dotenv
import os
from datetime import datetime
import pytz
import json # Import json module for output

# Load environment variables from .env file
load_dotenv()

# Access API keys
amadeus = Client(
    client_id=os.getenv("AMADEUS_CLIENT_ID"),
    client_secret=os.getenv("AMADEUS_CLIENT_SECRET")
)

# --- Hardcoded Flight Details ---
carrier_code = 'UA'
flight_number = '2116'
departure_date = '2025-03-31'
# --- End Hardcoded Flight Details ---

# Function to parse datetime string with timezone offset and return ISO 8601 format
def format_iso_datetime(dt_str):
    if not dt_str:
        return None
    try:
        # Extract base datetime and offset
        dt_base = datetime.fromisoformat(dt_str[:-6]) # e.g., 2025-03-31T17:55
        offset_str = dt_str[-6:] # e.g., -04:00
        # Return the original ISO string, assuming it's correctly formatted
        return dt_str
    except ValueError:
        print(f"Error parsing datetime string: {dt_str}")
        return None
    except Exception as e:
        print(f"Unexpected error parsing datetime: {e}")
        return None

try:
    response = amadeus.schedule.flights.get(
        carrierCode=carrier_code,
        flightNumber=flight_number,
        scheduledDepartureDate=departure_date
    )
    # print(response.data) # Optional: uncomment to see the raw API response

    if response.data:
        flight_details_list = []
        for flight in response.data:
            flight_points = flight.get('flightPoints', [])
            segments = flight.get('segments', []) # Get segments info
            legs = flight.get('legs', []) # Get legs info

            if len(flight_points) >= 2:
                departure_point = flight_points[0]
                arrival_point = flight_points[-1]

                departure_code = departure_point.get('iataCode')
                arrival_code = arrival_point.get('iataCode')

                departure_time_str = None
                if 'departure' in departure_point and departure_point['departure'].get('timings'):
                    departure_time_str = departure_point['departure']['timings'][0].get('value')

                arrival_time_str = None
                if 'arrival' in arrival_point and arrival_point['arrival'].get('timings'):
                    arrival_time_str = arrival_point['arrival']['timings'][0].get('value')

                if departure_code and arrival_code and departure_time_str and arrival_time_str:
                    departure_iso = format_iso_datetime(departure_time_str)
                    arrival_iso = format_iso_datetime(arrival_time_str)

                    if departure_iso and arrival_iso:
                        # Extract segment and leg details if available
                        segment_info = []
                        for seg in segments:
                             # Check if segment matches the main departure/arrival points
                             if seg.get('boardPointIataCode') == departure_code and seg.get('offPointIataCode') == arrival_code:
                                segment_info.append({
                                    "boardPointIataCode": seg.get('boardPointIataCode'),
                                    "offPointIataCode": seg.get('offPointIataCode'),
                                    "scheduledSegmentDuration": seg.get('scheduledSegmentDuration'),
                                    "operatingCarrierCode": seg.get('partnership', {}).get('operatingFlight', {}).get('carrierCode'),
                                    "operatingFlightNumber": seg.get('partnership', {}).get('operatingFlight', {}).get('flightNumber')
                                })

                        leg_info = []
                        for leg in legs:
                            # Check if leg matches the main departure/arrival points
                            if leg.get('boardPointIataCode') == departure_code and leg.get('offPointIataCode') == arrival_code:
                                leg_info.append({
                                    "boardPointIataCode": leg.get('boardPointIataCode'),
                                    "offPointIataCode": leg.get('offPointIataCode'),
                                    "aircraftType": leg.get('aircraftEquipment', {}).get('aircraftType'),
                                    "scheduledLegDuration": leg.get('scheduledLegDuration')
                                })

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
                        # Assuming we only want the first valid schedule entry
                        break 
            else:
                 print(json.dumps({"error": "Flight points data is insufficient", "details": f"{carrier_code}{flight_number} on {departure_date}"}))
                 break

        if flight_details_list:
            # Print the list of flight details as a JSON array
            print(json.dumps(flight_details_list, indent=2))
        else:
             print(json.dumps({"error": "Could not extract complete flight details", "details": f"{carrier_code}{flight_number} on {departure_date}"}))

    else:
        print(json.dumps({"error": "No flight data available", "details": f"{carrier_code}{flight_number} on {departure_date}"}))

except ResponseError as error:
    print(json.dumps({"error": "API Error", "details": str(error)}))
except Exception as e:
    print(json.dumps({"error": "An unexpected error occurred", "details": str(e)}))
