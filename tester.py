from amadeus import Client, ResponseError
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import pytz

# Load environment variables from .env file
load_dotenv()

# Access API keys
amadeus = Client(
    client_id=os.getenv("AMADEUS_CLIENT_ID"),
    client_secret=os.getenv("AMADEUS_CLIENT_SECRET")
)

try:
    response = amadeus.schedule.flights.get(
        carrierCode='AS',  
        flightNumber='4074',  
        scheduledDepartureDate='2025-03-30'  
    )

    if response.data:
        for flight in response.data:
            flight_points = flight.get('flightPoints', [])
            segments = flight.get('segments', [])

            if flight_points and segments:
                departure_code = "IAD"
                arrival_code = "DFW"
                departure_time = "N/A"
                arrival_time = "N/A"

                # Find arrival time at DFW
                for point in flight_points:
                    if point.get('iataCode') == arrival_code and 'arrival' in point:
                        arrival_time = point['arrival']['timings'][0]['value']
                        break
                
                # IAD to DFW segment duration
                iad_to_dfw_duration = timedelta(hours=3, minutes=32)

                if arrival_time != "N/A":
                    # Convert to datetime
                    arrival_dt = datetime.fromisoformat(arrival_time[:-6])  # Remove timezone offset
                    arrival_tz_offset = int(arrival_time[-6:-3])  # Extract timezone offset (-05:00 → -5)
                    arrival_tz = pytz.FixedOffset(arrival_tz_offset * 60)
                    arrival_dt = arrival_dt.replace(tzinfo=arrival_tz)

                    # Convert DFW time back to IAD time
                    iad_tz = pytz.FixedOffset(-4 * 60)  # IAD is in EDT (-04:00)
                    departure_dt = arrival_dt - iad_to_dfw_duration
                    departure_dt = departure_dt.astimezone(iad_tz)

                    # Format the output cleanly
                    departure_str = departure_dt.strftime("%Y-%m-%d %H:%M %Z")
                    arrival_str = arrival_dt.strftime("%Y-%m-%d %H:%M %Z")

                    print(f"{departure_str}    {departure_code}")
                    print(f"{arrival_str}    {arrival_code}")

            else:
                print("Flight points or segments data is incomplete.")

    else:
        print("No flight data available.")

except ResponseError as error:
    print(f"API Error: {error}")
