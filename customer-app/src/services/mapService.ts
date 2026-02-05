import axios from 'axios';
import { GOOGLE_MAPS_APIKEY } from '../config';

// Using OSRM (Open Source Routing Machine) as a free alternative to Google Directions API
const OSRM_API_URL = 'https://router.project-osrm.org/route/v1/driving';

export const mapService = {
  getRoute: async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ) => {
    // Try Google Maps first as it's more reliable
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_APIKEY}&mode=driving`;
      const response = await axios.get(url);
      
      if (response.data.routes && response.data.routes.length > 0) {
          const route = response.data.routes[0];
          return {
              polyline: { encodedPolyline: route.overview_polyline.points },
              distanceMeters: route.legs[0].distance.value,
              duration: route.legs[0].duration.value
          };
      }
    } catch (gError) {
      console.error('Google Routing failed, trying OSRM:', gError);
    }

    // Fallback to OSRM
    try {
      // OSRM format: /driving/longitude,latitude;longitude,latitude
      const url = `${OSRM_API_URL}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
      
      const response = await axios.get(url, {
        params: {
          overview: 'full',
          geometries: 'polyline',
          steps: false
        }
      });

      if (response.data && response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        
        return {
          polyline: {
            encodedPolyline: route.geometry
          },
          distanceMeters: route.distance, // in meters
          duration: Math.round(route.duration) // in seconds
        };
      }
      return null;
    } catch (error) {
      console.error('OSRM Routing also failed:', error);
      return null;
    }
  },
};

export const decodePolyline = (encoded: string) => {
  // Polyline decoding logic remains the same as it handles standard encoded polylines
  // which OSRM also produces (Google Polyline Algorithm Format)
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
