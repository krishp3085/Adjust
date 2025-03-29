import requests
import json

def test_travel_assistant():
    # Test data
    payload = {
        "destination": "Tokyo, Japan",
        "departure_time": "2024-03-29T14:00:00-04:00"
    }
    
    print("\nSending travel assistance request...")
    print(f"Destination: {payload['destination']}")
    print(f"Departure: {payload['departure_time']}\n")
    
    try:
        # Make the request
        response = requests.post(
            'http://localhost:5000/api/travel-assistant',
            json=payload
        )
        
        # Check the response
        if response.status_code == 200:
            print("Request successful! Check the server terminal for progress updates.\n")
        else:
            print(f"Error: {response.json()}\n")
            
    except Exception as e:
        print(f"Error: {str(e)}\n")

if __name__ == "__main__":
    test_travel_assistant()
