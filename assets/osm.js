// Үнэлэмж · free place search from OpenStreetMap (Photon by Komoot, no key needed).
// OpenStreetMap data is open: names and addresses may be kept, with
// "© OpenStreetMap contributors" shown wherever they appear.
window.UEO = (() => {
  const URL_ = "https://photon.komoot.io/api/";
  const KEEP = ["amenity", "shop", "tourism", "leisure", "office", "healthcare", "craft", "club", "sport"];
  // drop the traditional-script copy OSM keeps next to the Cyrillic name
  const clean = s => String(s || "").replace(/[᠀-᢯ ᠎]+/g, "").replace(/\s{2,}/g, " ").replace(/Улан-Батор/g, "Улаанбаатар").trim();
  function catOf(k, v) {
    if (k === "tourism" && ["camp_site", "chalet", "caravan_site", "resort", "wilderness_hut", "alpine_hut"].includes(v)) return "Жуулчны бааз";
    if (k === "tourism" && ["hotel", "motel", "guest_house", "hostel", "apartment"].includes(v)) return "Зочид буудал";
    if (k === "amenity" && ["cafe", "ice_cream"].includes(v)) return "Кафе";
    if (k === "shop" && ["coffee", "tea", "bakery", "pastry"].includes(v)) return "Кафе";
    if (k === "amenity" && ["restaurant", "fast_food", "food_court", "bar", "pub", "biergarten"].includes(v)) return "Хоол";
    if (k === "healthcare" || (k === "amenity" && ["hospital", "clinic", "doctors", "dentist", "pharmacy"].includes(v))) return "Эмнэлэг";
    if (k === "shop" && ["hairdresser", "beauty", "cosmetics", "massage", "tattoo"].includes(v)) return "Гоо сайхан";
    if (k === "leisure" && ["spa", "sauna"].includes(v)) return "Гоо сайхан";
    if ((k === "amenity" && ["townhall", "police", "post_office", "courthouse", "public_building"].includes(v)) || (k === "office" && v === "government")) return "Төрийн үйлчилгээ";
    if (k === "shop") return "Дэлгүүр";
    return "Бусад";
  }
  async function search(text) {
    const u = URL_ + "?q=" + encodeURIComponent(text) + "&limit=40&lang=default&bbox=87.7,41.5,119.95,52.2";
    const res = await fetch(u);
    if (!res.ok) throw new Error("osm_" + res.status);
    const d = await res.json();
    const seen = new Set();
    return (d.features || []).map(f => f.properties || {})
      .filter(p => p.countrycode === "MN" && p.name && KEEP.includes(p.osm_key) && p.osm_type && p.osm_id)
      .map(p => ({
        id: String(p.osm_type).toUpperCase() + p.osm_id,
        name: clean(p.name),
        category: catOf(p.osm_key, p.osm_value),
        address: [p.street && clean(p.street) + (p.housenumber ? " " + p.housenumber : ""), clean(p.district), clean(p.city || p.county), clean(p.state)]
          .filter(Boolean).filter((x, i, l) => l.indexOf(x) === i).join(", ")
      }))
      .filter(p => /^[NWR]\d{1,15}$/.test(p.id) && !seen.has(p.id) && seen.add(p.id))
      .slice(0, 10);
  }
  return { search };
})();
