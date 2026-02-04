# HanMotors Customer App

A React Native (Expo) application for customers to request rides and track drivers.

## Features

- **Phone Authentication**: Login with phone number and OTP.
- **Ride Request**: Select pickup/dropoff, view fare estimates, and choose vehicle types.
- **Real-Time Tracking**: Live driver location updates on the map.
- **Ride History**: View past trips.
- **Profile**: Manage user profile.

## Tech Stack

- **Framework**: React Native (Expo SDK 52)
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation (Stack + Tabs)
- **Maps**: react-native-maps (Google Maps)
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
    npm install
    ```

2.  **Configuration**
    - The app connects to the backend at `http://localhost:5000` (for simulator) or your machine's IP (for physical device).
    - Update `src/config.ts` if your backend URL differs.
    - Ensure `GOOGLE_MAPS_APIKEY` in `src/config.ts` is valid.

3.  **Run the App**
    ```bash
    npm start
    ```
    - Press `a` for Android Emulator
    - Press `i` for iOS Simulator
    - Scan QR code with Expo Go for physical device

## Project Structure

- `src/screens`: UI Screens (Home, Login, RideRequest, etc.)
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
