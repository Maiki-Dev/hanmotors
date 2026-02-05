# Khan Motors - Full Stack project by Ankhbayar Zoltuya

This project contains the full source code for Xan Motors, including a Backend API, Admin Dashboard, and Driver Mobile App.

## Project Structure

- **backend/**: Node.js + Express + MongoDB API + Socket.io
- **admin-dashboard/**: React + Vite + Tailwind CSS Web Dashboard
- **driver-app/**: React Native + Expo Mobile App for Drivers
- **docker-compose.yml**: Docker configuration for MongoDB and Backend

## Prerequisites

- Node.js (v18+)
- Docker & Docker Compose (optional, for MongoDB)
- Expo Go App (for testing mobile app on phone)

## Setup & Installation

### 1. Backend Setup

```bash
cd backend
npm install
```

Start the backend (Ensure MongoDB is running locally or via Docker):

```bash
# Start MongoDB via Docker
docker-compose up -d mongo

# Start Backend
npm run dev
```

The server will run on `http://localhost:5000`.

### 2. Admin Dashboard Setup

```bash
cd admin-dashboard
npm install
npm run dev
```

The dashboard will open at `http://localhost:3000`.

### 3. Driver App Setup

```bash
cd driver-app
npm install
npx expo start
```

Scan the QR code with Expo Go app on your phone.

## Features

### Backend
- MongoDB Database Schema (Drivers, Trips)
- REST API for Authentication, Management, and Reporting
- Socket.io for Real-time location and job requests

### Admin Dashboard
- **Dashboard**: Live stats (Active drivers, revenue, requests)
- **Drivers**: Manage drivers (Approve/Block)
- **Trips**: View active and past trips
- **Payments**: Revenue reports and charts

### Driver App
- **Login**: Secure driver login
- **Home**: Live map with Online/Offline toggle
- **Job Requests**: Real-time popup for new jobs (Accept/Reject)
- **Navigation**: Route visualization and Trip status updates
- **Earnings**: Track daily and weekly income

## Environment Variables

Check `.env.example` for required environment variables. Create a `.env` file in `backend/` based on it.
