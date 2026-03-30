/**
 * Distance Calculation Utilities
 * 
 * Calculates distance between two gym locations using the haversine formula.
 * Gym locations are stored as PostGIS GEOGRAPHY(POINT, 4326) in the database.
 */

/**
 * Calculate distance between two points on Earth using haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in miles
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Decode hex string to bytes (works in React Native without Buffer).
 */
function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

/**
 * Parse hex EWKB (Extended Well-Known Binary) for a Point with SRID.
 * Supabase/PostgREST can return PostGIS geography as hex-encoded EWKB.
 * Format: 1 byte endian, 4 bytes type (0x20000001 = Point+SRID), 4 bytes SRID, 8 bytes X, 8 bytes Y.
 */
function parseHexEwkbPoint(hex: string): { lat: number; lng: number } | null {
  if (hex.length < 50 || hex.length % 2 !== 0 || !/^[0-9A-Fa-f]+$/.test(hex)) return null;
  try {
    const buf = hexToBytes(hex);
    if (buf.length < 25) return null;
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const littleEndian = buf[0] === 1;
    const hasSrid = (view.getUint32(1, littleEndian) & 0x20000000) !== 0;
    const headerLen = hasSrid ? 9 : 5;
    if (buf.length < headerLen + 16) return null;
    const x = view.getFloat64(headerLen, littleEndian);
    const y = view.getFloat64(headerLen + 8, littleEndian);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { lng: x, lat: y };
  } catch {
    return null;
  }
}

/**
 * Extract lat/lng from PostGIS GEOGRAPHY(POINT, 4326) format.
 * Supports: WKT string "SRID=4326;POINT(lng lat)", GeoJSON Point, or hex EWKB (as returned by Supabase).
 */
export function parseLocation(location: unknown): { lat: number; lng: number } | null {
  if (!location) return null;

  if (typeof location === 'string') {
    // WKT: "SRID=4326;POINT(lng lat)"
    const wktMatch = location.match(/POINT\(([^)]+)\)/);
    if (wktMatch) {
      const [lng, lat] = wktMatch[1].split(/\s+/).map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    // Hex EWKB (Supabase sometimes returns geography as hex-encoded binary)
    const ewkb = parseHexEwkbPoint(location);
    if (ewkb) return ewkb;
  }

  if (typeof location === 'object' && location !== null) {
    const geo = location as { type?: string; coordinates?: [number, number] };
    if (geo.type === 'Point' && Array.isArray(geo.coordinates)) {
      const [lng, lat] = geo.coordinates;
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  }

  return null;
}

/**
 * Calculate distance between two stored locations (profile or gym).
 * Accepts PostGIS geography formats returned by Supabase.
 *
 * @returns Distance in miles, or null if either location is invalid/missing
 */
export function calculateDistanceMiles(aLocation: unknown, bLocation: unknown): number | null {
  const a = parseLocation(aLocation);
  const b = parseLocation(bLocation);

  if (!a || !b) return null;
  return haversineDistance(a.lat, a.lng, b.lat, b.lng);
}

/**
 * Calculate distance between two gym locations
 * @param gym1Location First gym's location (PostGIS GEOGRAPHY)
 * @param gym2Location Second gym's location (PostGIS GEOGRAPHY)
 * @returns Distance in miles, or null if locations are invalid
 */
export function calculateGymDistance(
  gym1Location: unknown,
  gym2Location: unknown
): number | null {
  return calculateDistanceMiles(gym1Location, gym2Location);
}

const MILES_TO_KM = 1.60934;

/**
 * Convert distance in miles to km, rounded up to nearest integer.
 * Used for swipe deck display (number + "km" with smaller unit).
 *
 * @param distanceMiles Distance in miles, or null
 * @returns Rounded-up km integer, or null
 */
export function formatDistanceKmRounded(distanceMiles: number | null): number | null {
  if (distanceMiles === null) return null;
  const km = distanceMiles * MILES_TO_KM;
  return Math.ceil(km);
}

/**
 * Format distance for display
 * @param distance Distance in miles
 * @returns Formatted string like "0.3 mi" or "5.2 mi"
 */
export function formatDistance(distance: number | null): string {
  if (distance === null) {
    return '—';
  }
  
  // Round to 1 decimal place
  const rounded = Math.round(distance * 10) / 10;
  return `${rounded} mi`;
}
