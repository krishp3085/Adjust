# Adjust

A brief description of what this project does.

## Setup Environment

#### Pre-requisites

- Node.js (LTS version recommended)
- Expo CLI (install globally with npm)
- Android Studio with Android SDK and an AVD (Android Virtual Device) properly configured
- A physical Android device with USB debugging enabled (optional, if testing on real hardware)
- Java Development Kit (for Android build tools)
- Ensure environment variables for Android SDK are correctly set

## Installation

### Install node modules
```
npm install
```

### Run Adjust

##### Expo Go/Web Build to quickly test Frontend or non-native code
```
npx expo start
```
After running the above command:

1. The development server will start, and you'll see a QR code inside the terminal window.
2. press ```a``` in the terminal or scan the QR code to open the app on device/simulator.


##### Native code build on Android Device/Simulator
```
npx expo run:android
```
