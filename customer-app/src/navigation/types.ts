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
  };
  TripStatus: { trip: any };
  RideHistory: undefined;
  Profile: undefined;
};
