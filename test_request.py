import requests
import json

def test_flight_recommendations():
    # Test data - Modify these to test different flights
    payload = {
        "carrierCode": "UA",
        "flightNumber": "2116",
        "scheduledDepartureDate": "2025-03-31"
    }

    print("\nSending flight recommendation request...")
    print(f"Carrier Code: {payload['carrierCode']}")
    print(f"Flight Number: {payload['flightNumber']}")
    print(f"Departure Date: {payload['scheduledDepartureDate']}\n")

    try:
        # Make the request to the new endpoint
        response = requests.post(
            'http://localhost:5000/api/flight-recommendations',
            json=payload
        )

        # Check the response
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Request successful! Response JSON:")
            try:
                # Pretty print the JSON response
                response_json = response.json()
                print(json.dumps(response_json, indent=2))
            except json.JSONDecodeError:
                print("Error: Could not decode JSON response.")
                print(f"Raw response text: {response.text}")
        else:
            print("Error response:")
            try:
                print(json.dumps(response.json(), indent=2))
            except json.JSONDecodeError:
                 print(f"Raw error response text: {response.text}")
        print("\n") # Add a newline for better separation

    except requests.exceptions.RequestException as e:
        print(f"Request failed: {str(e)}\n")
    except Exception as e:
        print(f"An unexpected error occurred: {str(e)}\n")

if __name__ == "__main__":
    test_flight_recommendations()
