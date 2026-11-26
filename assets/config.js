// Үнэлэмж: site settings.
// The Supabase URL and publishable (anon) key are meant to be public: the
// browser can only call the ue_* functions, never read the tables directly.
window.UE_API = {
  url: "https://oovdqycdhtvlxjvbldji.supabase.co",
  key: "sb_publishable_R6WspnTxGfrvtQ694IF0XA_hyErBl3e"
};

// What each place page shows besides the reviews. Photos live next to the page
// (e.g. usukh-ugii/photos/1.jpg). Only use photos the place owns.
window.UE_PLACES = {
  "usukh-ugii": {
    name: "Өсөх Өгий",
    category: "Амралтын газар",
    location: "Өгий нуур",
    about: "",          // 1–3 sentences from the owners
    season: "",         // e.g. "6/1 – 9/15"
    phone: "",          // shown as text with a copy button
    photos: []          // e.g. ["photos/1.jpg", "photos/2.jpg"]
  }
};
