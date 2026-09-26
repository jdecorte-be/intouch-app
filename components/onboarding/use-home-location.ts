import * as Location from 'expo-location';
import { useState } from 'react';

// Owns the home neighborhood: either detected from the device or picked by hand.
export function useHomeLocation(initial: { neighborhood: string; coordinates: [number, number] | null }) {
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood);
  const [homeCoordinates, setHomeCoordinates] = useState<[number, number] | null>(initial.coordinates);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const detectLocation = async () => {
    setLocationError(null);
    setIsLocating(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setLocationError('Location permission was denied. Choose a neighborhood below instead.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const detectedLabel = place?.district || place?.city || place?.subregion || place?.region;

      if (!detectedLabel) {
        setLocationError('Could not determine your neighborhood. Choose one below instead.');
        return;
      }

      setNeighborhood(detectedLabel);
      setHomeCoordinates([position.coords.longitude, position.coords.latitude]);
    } catch {
      setLocationError('Something went wrong finding your location. Choose a neighborhood below instead.');
    } finally {
      setIsLocating(false);
    }
  };

  const selectManualNeighborhood = (option: string) => {
    setHomeCoordinates(null);
    setNeighborhood((current) => (current === option ? '' : option));
  };

  return {
    neighborhood,
    homeCoordinates,
    isLocating,
    locationError,
    detectLocation,
    selectManualNeighborhood,
  };
}
