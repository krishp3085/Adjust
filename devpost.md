# Adjust - Personalized Travel Wellness

## Inspiration
Traveling across time zones is challenging. Jet lag disrupts sleep, energy levels, and overall well-being, making it hard to enjoy trips or be productive. Standard advice is often generic and doesn't account for individual flight schedules or personal health patterns. We were inspired to create Adjust, a tool that provides truly personalized, actionable guidance to help travelers feel their best by adapting scientifically-backed strategies to their specific journey and body.

## What it does
Adjust is a mobile application designed to help travelers mitigate jet lag and optimize their well-being during air travel. Users input their flight details (carrier, flight number, date). Optionally, they can connect health data (like sleep duration and heart rate patterns). Adjust then:
1.  Fetches real-time, detailed flight information using the Amadeus API.
2.  Processes the user's health data to understand baseline patterns (e.g., average heart rate during sleep).
3.  Leverages an AI engine (built with CrewAI and Google Gemini) to analyze the flight details (duration, direction, timing) and health metrics.
4.  Generates a personalized wellness plan delivered through the app. This plan includes:
    *   **Sleep Schedule:** Recommendations for adjusting bedtime and wake-up times before, during, and after the flight.
    *   **Exercise Plan:** Suggested activities for pre-flight, in-flight movement, and post-flight recovery.
    *   **Meal Plan:** Optimal timing for meals at the destination and general dietary tips for travel.
    *   **Hydration Plan:** Reminders and targets for water intake.
    *   **Light Exposure:** Guidance on seeking or avoiding light to help reset the body clock.
    *   **Relaxation/Naps:** Personalized advice based on health data (e.g., relaxation techniques if sleep HR is high, modified nap strategies).
5.  Presents this plan within an easy-to-follow schedule in the mobile app.

## How we built it
Adjust consists of a mobile frontend and a Python backend:

*   **Frontend:** Built using **React Native (Expo)** and **TypeScript**. It provides a user interface with tabs for viewing the generated Schedule, managing a Boarding Pass (future feature), seeing a Summary, and inputting/viewing Health data. We used Expo Router for navigation and React Context API (`FlightDataProvider`) for managing flight-related state.
*   **Backend:** A **Python Flask** server acts as the core engine.
    *   **Flight Data:** Integrates with the **Amadeus API** to fetch detailed, real-time flight schedule information.
    *   **Health Data Processing:** Reads and analyzes user-provided health data (JSON format) to extract key metrics like average sleep heart rate.
    *   **AI Engine:** Uses **CrewAI** to orchestrate multiple AI agents powered by **Google Gemini**.
        *   *Travel Assistant Agent:* Analyzes flight specifics (duration, direction, timing).
        *   *Health Monitor Agent:* Generates personalized health recommendations based on flight context and user health metrics, using **Pydantic** models for structured output.
        *   *Schedule Generator Agent:* Synthesizes flight times and health recommendations into a complete daily schedule (JSON format).
    *   **API:** Exposes REST endpoints for the frontend to submit flight/health data and retrieve the generated recommendations and schedule. Background threading is used for non-blocking schedule generation.

## Challenges we ran into
*   **API Integration:** Reliably integrating and handling responses from multiple external APIs (Amadeus, Gemini), each with its own structure and potential rate limits.
*   **Data Standardization:** Parsing and normalizing inconsistent data formats, especially datetime strings with varying timezone information from Amadeus and health data sources.
*   **Prompt Engineering:** Crafting effective prompts for the CrewAI agents to ensure Gemini generated accurate, relevant, personalized, and consistently structured recommendations (fitting the Pydantic models).
*   **Asynchronous Operations:** Managing the workflow where initial recommendations are returned quickly, while the more complex schedule generation happens in a background thread without blocking the user response.
*   **Health Data Correlation:** Efficiently processing potentially large health datasets (sleep, heart rate) and accurately correlating heart rate samples with specific sleep sessions to derive meaningful metrics like average sleep HR.

## Accomplishments that we're proud of
*   Creating a system that generates genuinely personalized travel wellness advice, moving beyond generic tips.
*   Successfully integrating a multi-agent AI framework (CrewAI) with a powerful LLM (Gemini) and real-world travel data (Amadeus).
*   Developing logic to adapt recommendations based on individual health metrics (e.g., modifying sleep advice based on sleep quality indicators like heart rate).
*   Implementing a robust backend that orchestrates data fetching, processing, AI analysis, and structured output generation.
*   Using Pydantic to enforce a clear data structure for the AI-generated recommendations, ensuring reliability.

## What we learned
*   The effectiveness of multi-agent AI systems (like CrewAI) for breaking down complex problems into manageable, specialized tasks.
*   Advanced prompt engineering techniques are crucial for guiding LLMs to produce specific, structured, and contextually relevant outputs.
*   Handling real-world API data requires robust error handling and data validation/standardization strategies.
*   The importance of clear data modeling (using tools like Pydantic) when working with AI-generated content.
*   Practical application of background tasks (threading) in web frameworks like Flask to improve responsiveness for long-running processes.

## What's next for Adjust
*   Fully implement the "Boarding Pass" feature (scanning/manual input).
*   Expand health data integration (activity levels, stress metrics via Health Connect/HealthKit).
*   Add push notifications based on the generated schedule (e.g., "Time to hydrate," "Prepare for recommended bedtime").
*   Refine AI prompts and potentially fine-tune models for even more nuanced and accurate recommendations.
*   Integrate directly with device calendar applications.
*   Support for multi-leg journeys and connecting flights.
*   Introduce user accounts for saving travel history, preferences, and health profiles.
