import axios from 'axios';
import { GOOGLE_MAPS_APIKEY } from '../config';

// Using OSRM (Open Source Routing Machine) as a free alternative to Google Directions API
const OSRM_API_URL = 'http://router.project-osrm.org/route/v1/driving';

export const mapService = {
  getRoute: async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ) => {
    try {
      // OSRM format: /driving/longitude,latitude;longitude,latitude
      // Note: OSRM takes coordinates as "lng,lat"
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
        
        // Transform OSRM response to match our expected format
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
      console.error('OSRM Routing failed:', error);
      // If OSRM fails, we just return null to avoid crashing the app
      // The map will just show markers without the line
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
