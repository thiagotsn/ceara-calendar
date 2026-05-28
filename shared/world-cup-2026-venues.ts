// Geocodable address suffixes for the 16 FIFA World Cup 2026 host venues.
//
// ESPN's scoreboard returns `venue.fullName` only — no city, no country —
// which makes Apple/Google Maps geocoding unreliable. This map enriches the
// raw name with "City, Country" so the calendar event's location field
// resolves to a real pin when tapped.
//
// Aliases cover both the commercial stadium name (e.g. "AT&T Stadium") and
// the FIFA-mandated tournament name (e.g. "Dallas Stadium"), since ESPN may
// switch between them as the tournament approaches.

interface WorldCup2026Venue {
  aliases: string[];
  city: string;
  country: string;
}

const VENUES: WorldCup2026Venue[] = [
  { aliases: ["AT&T Stadium", "Dallas Stadium"], city: "Arlington, TX", country: "USA" },
  { aliases: ["Mercedes-Benz Stadium", "Atlanta Stadium"], city: "Atlanta, GA", country: "USA" },
  { aliases: ["Gillette Stadium", "Boston Stadium"], city: "Foxborough, MA", country: "USA" },
  { aliases: ["NRG Stadium", "Houston Stadium"], city: "Houston, TX", country: "USA" },
  { aliases: ["GEHA Field at Arrowhead Stadium", "Arrowhead Stadium", "Kansas City Stadium"], city: "Kansas City, MO", country: "USA" },
  { aliases: ["SoFi Stadium", "Los Angeles Stadium"], city: "Inglewood, CA", country: "USA" },
  { aliases: ["Hard Rock Stadium", "Miami Stadium"], city: "Miami Gardens, FL", country: "USA" },
  { aliases: ["MetLife Stadium", "New York New Jersey Stadium", "New York/New Jersey Stadium"], city: "East Rutherford, NJ", country: "USA" },
  { aliases: ["Lincoln Financial Field", "Philadelphia Stadium"], city: "Philadelphia, PA", country: "USA" },
  { aliases: ["Levi's Stadium", "San Francisco Bay Area Stadium"], city: "Santa Clara, CA", country: "USA" },
  { aliases: ["Lumen Field", "Seattle Stadium"], city: "Seattle, WA", country: "USA" },
  { aliases: ["BMO Field", "Toronto Stadium"], city: "Toronto, ON", country: "Canada" },
  { aliases: ["BC Place", "Vancouver Stadium"], city: "Vancouver, BC", country: "Canada" },
  { aliases: ["Estadio Akron", "Estadio Guadalajara", "Guadalajara Stadium"], city: "Zapopan, Jalisco", country: "Mexico" },
  { aliases: ["Estadio Azteca", "Estadio Banorte", "Mexico City Stadium"], city: "Ciudad de México", country: "Mexico" },
  { aliases: ["Estadio BBVA", "Monterrey Stadium"], city: "Guadalupe, Nuevo León", country: "Mexico" },
];

const BY_ALIAS = new Map<string, WorldCup2026Venue>();
for (const venue of VENUES) {
  for (const alias of venue.aliases) {
    BY_ALIAS.set(normalize(alias), venue);
  }
}

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// Returns "<original venue name>, City, Country" when the name matches a known
// WC 2026 venue; otherwise returns null and the caller falls back to whatever
// the match provider supplied.
export function enrichWorldCup2026Venue(venueName: string | undefined): string | null {
  if (!venueName) return null;
  const match = BY_ALIAS.get(normalize(venueName));
  if (!match) return null;
  return `${venueName}, ${match.city}, ${match.country}`;
}
