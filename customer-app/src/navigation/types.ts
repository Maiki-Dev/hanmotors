export type RootStackParamList = {
  Login: undefined;
  VerifyOtp: { phone: string; verificationId: string };
  HomeScreen: undefined;
  Home: undefined; // Alias if needed
  RideRequest: { 
    pickup: { 
      address: string; 
      latitude: number; 
      longitude: number;
    };
    serviceType?: string;
    selectedLocation?: {
        address: string;
        lat: number;
        lng: number;
    };
    locationType?: string;
  };
  LocationPicker: {
    initialLocation?: { lat: number; lng: number };
    returnScreen: string;
    type: string;
  };
  TripStatus: { trip: any };
  RideHistory: undefined;
  Profile: undefined;
};
