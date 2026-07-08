import { createServerFn } from "@tanstack/react-start";

const PLACE_ID = "ChIJRZiVPxAeuAARhE6fc6lFr_Y";
const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

export type PlaceReview = {
  author: string;
  authorPhoto: string | null;
  authorUri: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
};

export type PlacePhoto = {
  url: string;
  attribution: string | null;
};

export type PlaceDetails = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number;
  reviewCount: number;
  location: { lat: number; lng: number };
  googleMapsUri: string;
  weekdayDescriptions: string[];
  openNow: boolean;
  reviews: PlaceReview[];
  photos: PlacePhoto[];
};

const WEEKDAY_PT: Record<string, string> = {
  Monday: "Segunda-feira",
  Tuesday: "Terça-feira",
  Wednesday: "Quarta-feira",
  Thursday: "Quinta-feira",
  Friday: "Sexta-feira",
  Saturday: "Sábado",
  Sunday: "Domingo",
};

function ptWeekday(desc: string): string {
  // "Monday: 8:00 AM – 5:00 PM" -> "Segunda-feira: 08:00 – 17:00"
  const [day, ...rest] = desc.split(":");
  const times = rest.join(":").trim();
  const pt = WEEKDAY_PT[day.trim()] ?? day;
  if (times.toLowerCase() === "closed") return `${pt}: Fechado`;
  const converted = times
    .replace(/(\d{1,2}):(\d{2})\s*AM/gi, (_m, h, mm) => `${String(Number(h)).padStart(2, "0")}:${mm}`)
    .replace(/(\d{1,2}):(\d{2})\s*PM/gi, (_m, h, mm) => `${String((Number(h) % 12) + 12).padStart(2, "0")}:${mm}`);
  return `${pt}: ${converted}`;
}

async function resolvePhoto(photoName: string, apiKey: string, lovableKey: string): Promise<string | null> {
  const url = `${GATEWAY}/places/v1/${photoName}/media?maxWidthPx=1200&skipHttpRedirect=true`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { photoUri?: string };
  return json.photoUri ?? null;
}

export const getPlaceDetails = createServerFn({ method: "GET" }).handler(async (): Promise<PlaceDetails> => {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !apiKey) throw new Error("Missing Google Maps connector credentials");

  const res = await fetch(`${GATEWAY}/places/v1/places/${PLACE_ID}`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,location,rating,userRatingCount,googleMapsUri,websiteUri,internationalPhoneNumber,regularOpeningHours,reviews,photos",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Places request failed [${res.status}]: ${body}`);
  }
  const data = (await res.json()) as any;

  const photoNames: string[] = (data.photos ?? []).slice(0, 8).map((p: any) => p.name);
  const photoAttribs: (string | null)[] = (data.photos ?? [])
    .slice(0, 8)
    .map((p: any) => p.authorAttributions?.[0]?.displayName ?? null);

  const resolvedUrls = await Promise.all(photoNames.map((n) => resolvePhoto(n, apiKey, lovableKey)));

  const photos: PlacePhoto[] = resolvedUrls
    .map((url, i) => (url ? { url, attribution: photoAttribs[i] } : null))
    .filter((x): x is PlacePhoto => x !== null);

  const reviews: PlaceReview[] = (data.reviews ?? []).map((r: any) => ({
    author: r.authorAttribution?.displayName ?? "Cliente Google",
    authorPhoto: r.authorAttribution?.photoUri ?? null,
    authorUri: r.authorAttribution?.uri ?? null,
    rating: r.rating ?? 5,
    text: r.originalText?.text ?? r.text?.text ?? "",
    relativeTime: r.relativePublishTimeDescription ?? "",
    publishTime: r.publishTime ?? "",
  }));

  return {
    id: data.id,
    name: data.displayName?.text ?? "Adeconex Etiquetas",
    address: data.formattedAddress ?? "",
    phone: data.internationalPhoneNumber ?? null,
    website: data.websiteUri ?? null,
    rating: data.rating ?? 0,
    reviewCount: data.userRatingCount ?? 0,
    location: { lat: data.location?.latitude, lng: data.location?.longitude },
    googleMapsUri: data.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`,
    weekdayDescriptions: (data.regularOpeningHours?.weekdayDescriptions ?? []).map(ptWeekday),
    openNow: data.regularOpeningHours?.openNow ?? false,
    reviews,
    photos,
  };
});
