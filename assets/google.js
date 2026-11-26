// Үнэлэмж · Google Places (New) from the browser.
// The key in config.js must be restricted in Google Cloud to this site's address
// (HTTP referrers) and to "Places API (New)" only, with a daily quota cap.
// Google's terms: we keep only the place ID; names, addresses and photos are read
// live each time and shown with Google Maps attribution.
window.UEG = (() => {
  const key = (window.UE_GOOGLE || {}).key || "";
  const ready = !!key;
  const BASE = "https://places.googleapis.com/v1/";
  // Mongolia's bounding box, so a search for "Номин" finds Mongolian places first
  const MN = { rectangle: { low: { latitude: 41.5, longitude: 87.7 }, high: { latitude: 52.2, longitude: 119.95 } } };

  async function call(url, opts, fields) {
    const res = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": fields } });
    if (!res.ok) throw new Error("google_" + res.status);
    return res.json();
  }
  async function search(text) {
    if (!ready) return [];
    const d = await call(BASE + "places:searchText", { method: "POST", body: JSON.stringify({ textQuery: text, languageCode: "mn", regionCode: "MN", locationBias: MN, pageSize: 8 }) },
      "places.id,places.displayName,places.formattedAddress,places.primaryType,places.types");
    return (d.places || []).map(p => ({ id: p.id, name: (p.displayName || {}).text || "", address: p.formattedAddress || "", category: catOf(p.primaryType, p.types) }));
  }
  async function details(id) {
    const p = await call(BASE + "places/" + encodeURIComponent(id) + "?languageCode=mn&regionCode=MN", { method: "GET" },
      "id,displayName,formattedAddress,primaryType,types,photos,googleMapsUri");
    return {
      id: p.id, name: (p.displayName || {}).text || "", address: p.formattedAddress || "", category: catOf(p.primaryType, p.types),
      mapsUri: p.googleMapsUri || "",
      photos: (p.photos || []).slice(0, 4).map(ph => ({
        url: BASE + ph.name + "/media?maxWidthPx=1200&key=" + encodeURIComponent(key),
        by: (ph.authorAttributions || []).map(a => ({ name: a.displayName || "", uri: a.uri || "" }))
      }))
    };
  }
  // Google place types → Үнэлэмж categories
  const MAP = [
    [["campground", "rv_park", "camping_cabin", "farmstay", "resort_hotel"], "Жуулчны бааз"],
    [["cafe", "coffee_shop", "tea_house", "bakery"], "Кафе"],
    [["restaurant", "meal_takeaway", "fast_food_restaurant", "bar", "food"], "Хоол"],
    [["lodging", "hotel", "motel", "hostel", "guest_house", "bed_and_breakfast"], "Зочид буудал"],
    [["hospital", "doctor", "dentist", "dental_clinic", "medical_lab", "pharmacy", "health"], "Эмнэлэг"],
    [["beauty_salon", "hair_salon", "hair_care", "nail_salon", "spa", "barber_shop"], "Гоо сайхан"],
    [["store", "supermarket", "grocery_store", "shopping_mall", "convenience_store", "clothing_store", "market"], "Дэлгүүр"],
    [["local_government_office", "city_hall", "courthouse", "embassy", "police", "post_office"], "Төрийн үйлчилгээ"]
  ];
  function catOf(primary, types) {
    const all = [primary, ...(types || [])].filter(Boolean);
    for (const t of all) for (const [list, c] of MAP) if (list.includes(t)) return c;
    return "Бусад";
  }
  // same rule as unelemj.google_slug() in the database
  async function slug(id) {
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id));
    return "g-" + [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 20);
  }
  return { ready, search, details, slug, catOf };
})();
