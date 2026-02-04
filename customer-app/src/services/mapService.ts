import axios from 'axios';
import { GOOGLE_MAPS_APIKEY } from '../config';

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const DIRECTIONS_API_URL = 'https://maps.googleapis.com/maps/api/directions/json';

export const mapService = {
  getRoute: async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ) => {
    // Debug API Key (show first 5 chars)
    console.log('Using API Key:', GOOGLE_MAPS_APIKEY ? `${GOOGLE_MAPS_APIKEY.substring(0, 5)}...` : 'MISSING');

    if (!GOOGLE_MAPS_APIKEY) {
        throw new Error('Google Maps API Key is missing');
    }

    try {
      const response = await axios.post(
        ROUTES_API_URL,
        {
          origin: {
            location: {
              latLng: {
                latitude: origin.latitude,
                longitude: origin.longitude,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.latitude,
                longitude: destination.longitude,
              },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: false,
          routeModifiers: {
            avoidTolls: false,
            avoidHighways: false,
            avoidFerries: false,
          },
          languageCode: 'mn-MN',
          units: 'METRIC',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_APIKEY,
            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
          },
        }
      );

      if (response.data && response.data.routes && response.data.routes.length > 0) {
        return response.data.routes[0];
      }
      return null;
    } catch (error: any) {
      console.log('Routes API failed (likely not enabled). Trying Directions API fallback...');
      
      // Fallback to Legacy Directions API
      try {
        const response = await axios.get(DIRECTIONS_API_URL, {
            params: {
                origin: `${origin.latitude},${origin.longitude}`,
                destination: `${destination.latitude},${destination.longitude}`,
                key: GOOGLE_MAPS_APIKEY,
                mode: 'driving',
                language: 'mn'
            }
        });

        if (response.data.routes && response.data.routes.length > 0) {
             const route = response.data.routes[0];
             return {
                 polyline: {
                     encodedPolyline: route.overview_polyline.points
                 },
                 distanceMeters: route.legs[0].distance.value,
                 duration: route.legs[0].duration.text // approximate
             };
        } else if (response.data.error_message) {
             console.error('Directions API Error:', response.data.error_message);
             throw new Error(response.data.error_message);
        }
      } catch (legacyError) {
         console.error('Both Routes API and Directions API failed.');
         throw error; // Throw the original error (likely 403 or Permission Denied)
      }
    }
  },
};

export const decodePolyline = (encoded: string) => {
  const poly = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    const p = {
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    };
    poly.push(p);
  }
  return poly;
};
