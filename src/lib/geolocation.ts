/** Default map center when geolocation is unavailable or denied (Toronto). */
export const DISCOVER_DEFAULT_CENTER = {
  latitude: 43.6532,
  longitude: -79.3832,
} as const;

export function requestUserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 60_000,
      timeout: 12_000,
    });
  });
}
