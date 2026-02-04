# HanMotors Customer App

A React Native (Expo) application for customers to request rides and track drivers.

## Features

- **Phone Authentication**: Login with phone number and OTP.
- **Ride Request**: 
  - Google Places Autocomplete for destination search.
  - Pickup auto-detection via geolocation.
  - **Multi-service Selection**: Choose between Taxi, Towing, or Cargo.
  - Fare estimation and vehicle selection.
- **Trip Management**:
  - **Real-Time Tracking**: Live driver location updates on the map via Socket.IO.
  - **Trip Cancellation**: Ability to cancel requested rides.
  - **Dynamic Status**: Visual updates for driver arrival and trip progress.
- **Ride History**: View past trips with status and cost.
- **Profile**: View user details and logout.

## Tech Stack

- **Framework**: React Native (Expo SDK 52)
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation (Stack + Tabs)
- **Maps**: react-native-maps (Google Maps)
- **Places**: react-native-google-places-autocomplete
- **Real-time**: Socket.IO Client

## Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo Go app on your phone (or Android Studio/Xcode for simulator)
- Backend server running (HanMotors Node.js backend)

## Setup

1.  **Install Dependencies**
    ```bash
    cd customer-app
    npm install --legacy-peer-deps
    ```
    *Note: Use `--legacy-peer-deps` if you encounter dependency conflicts.*

2.  **Configuration**
    - The app connects to the backend at `http://localhost:5000` (for simulator) or your machine's IP (for physical device).
    - Update `src/config.ts` if your backend URL differs.
    - **Important**: Set a valid `GOOGLE_MAPS_APIKEY` in `src/config.ts` (or `app.json` if configured) for maps and autocomplete to work.

3.  **Run the App**
    ```bash
    npm start
    ```
    - Press `a` for Android Emulator
    - Press `i` for iOS Simulator
    - Scan QR code with Expo Go for physical device

## Project Structure

- `src/screens`: UI Screens (Home, Login, RideRequest, TripStatus, History, Profile)
- `src/components`: Reusable components
- `src/navigation`: Navigation configuration
- `src/store`: Redux store and slices
- `src/services`: API and Socket services
- `src/constants`: Theme and constants

## Backend Integration

Ensure the backend server is running:
```bash
cd ../backend
npm start
```

The app uses the following endpoints:
- `POST /api/auth/login`: Send OTP
- `POST /api/auth/verify-otp`: Verify OTP
- `POST /api/rides/request`: Request a new ride
- `GET /api/rides/active`: Check for active trips
- `GET /api/rides/history`: Get ride history
- `GET /api/customer/profile`: Get customer profile details
