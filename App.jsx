import { useEffect, useMemo, useState } from "react";
import "./App.css";

const STARTER_RECORDS = [
  { id: 1, city: "Bengaluru", date: "2026-11-01", pm25: 28, pm10: 54, pollutant: "PM2.5", category: "Moderate", season: "Post-monsoon", source: "Traffic" },
  { id: 2, city: "Delhi", date: "2026-11-01", pm25: 91, pm10: 166, pollutant: "PM2.5", category: "Poor", season: "Post-monsoon", source: "Traffic" },
  { id: 3, city: "Chennai", date: "2026-11-01", pm25: 19, pm10: 39, pollutant: "PM10", category: "Satisfactory", season: "Post-monsoon", source: "Residential" },
];

const CATEGORY_OPTIONS = ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"];
const INITIAL_FORM = {
  city: "", date: new Date().toISOString().slice(0, 10), pm25: "", pm10: "",
  pollutant: "PM2.5", category: "Moderate", season: "Post-monsoon", source: "Traffic"
};

function categoryFromAqi(value) {
  if (value == null || Number.isNaN(Number(value))) return { label: "Unavailable", className: "unknown", advice: "Try refreshing the live data." };
  if (value <= 50) return { label: "Good", className: "good", advice: "Air quality is satisfactory. Enjoy outdoor activities." };
  if (value <= 100) return { label: "Moderate", className: "moderate", advice: "Sensitive people should consider reducing prolonged outdoor exertion." };
  if (value <= 150) return { label: "Unhealthy for Sensitive Groups", className: "sensitive", advice: "Children, older adults, and sensitive people should limit strenuous outdoor activity." };
  if (value <= 200) return { label: "Unhealthy", className: "unhealthy", advice: "Reduce prolonged or heavy outdoor exertion." };
  if (value <= 300) return { label: "Very Unhealthy", className: "very-unhealthy", advice: "Avoid strenuous outdoor activity and keep windows closed when practical." };
  return { label: "Hazardous", className: "hazardous", advice: "Stay indoors when possible and follow local health advisories." };
}

function getIndianCategoryFromUsAqi(value) {
  if (value <= 50) return "Good";
  if (value <= 100) return "Satisfactory / Moderate";
  if (value <= 150) return "Moderate / Sensitive";
  if (value <= 200) return "Poor";
  if (value <= 300) return "Very Poor";
  return "Severe";
}

function MetricCard({ icon, label, value, unit, tone, detail }) {
  return <article className={`metric-card ${tone || ""}`}>
    <div className="metric-top"><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span></div>
    <div className="metric-value">{value ?? "—"} <small>{unit || ""}</small></div>
    <div className="metric-detail">{detail}</div>
  </article>;
}

function AQIBadge({ value }) {
  const info = categoryFromAqi(value);
  return <span className={`aqi-badge ${info.className}`}>{info.label}</span>;
}

function FormField({ label, children }) {
  return <label className="form-field"><span>{label}</span>{children}</label>;
}

function RecordForm({ initialValue, onSave, onCancel }) {
  const [form, setForm] = useState(initialValue || INITIAL_FORM);
  useEffect(() => setForm(initialValue || INITIAL_FORM), [initialValue]);
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  function submit(event) {
    event.preventDefault();
    onSave({
      ...form,
      city: form.city.trim(),
      pm25: Number(form.pm25),
      pm10: Number(form.pm10),
    });
  }
  return <form className="record-form" onSubmit={submit}>
    <div className="form-grid">
      <FormField label="City"><input required value={form.city} onChange={e => update("city", e.target.value)} placeholder="e.g. Bengaluru" /></FormField>
      <FormField label="Monitoring date"><input required type="date" value={form.date} onChange={e => update("date", e.target.value)} /></FormField>
      <FormField label="PM2.5 (µg/m³)"><input required min="0" step="any" type="number" value={form.pm25} onChange={e => update("pm25", e.target.value)} placeholder="e.g. 28" /></FormField>
      <FormField label="PM10 (µg/m³)"><input required min="0" step="any" type="number" value={form.pm10} onChange={e => update("pm10", e.target.value)} placeholder="e.g. 54" /></FormField>
      <FormField label="Main pollutant"><select value={form.pollutant} onChange={e => update("pollutant", e.target.value)}><option>PM2.5</option><option>PM10</option><option>NO₂</option><option>O₃</option><option>CO</option><option>SO₂</option></select></FormField>
      <FormField label="AQI category"><select value={form.category} onChange={e => update("category", e.target.value)}>{CATEGORY_OPTIONS.map(option => <option key={option}>{option}</option>)}</select></FormField>
      <FormField label="Season"><select value={form.season} onChange={e => update("season", e.target.value)}><option>Winter</option><option>Summer</option><option>Monsoon</option><option>Post-monsoon</option></select></FormField>
      <fieldset className="radio-field"><legend>Main source</legend>{["Traffic", "Industrial", "Residential"].map(option => <label key={option} className="radio-option"><input type="radio" name="source" checked={form.source === option} onChange={() => update("source", option)} />{option}</label>)}</fieldset>
    </div>
    <div className="form-actions"><button className="button primary" type="submit">{initialValue ? "Save changes" : "Add record"}</button>{initialValue && <button className="button ghost" type="button" onClick={onCancel}>Cancel</button>}</div>
  </form>;
}

export default function App() {
  const [cityInput, setCityInput] = useState("Bengaluru");
  const [location, setLocation] = useState({ name: "Bengaluru", admin1: "Karnataka", country: "India", latitude: 12.9716, longitude: 77.5946 });
  const [live, setLive] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [records, setRecords] = useState(STARTER_RECORDS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [notice, setNotice] = useState("");

  async function fetchAirQuality(coords = location) {
    setLoading(true);
    setApiError("");
    try {
      const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
      url.search = new URLSearchParams({
        latitude: String(coords.latitude), longitude: String(coords.longitude),
        hourly: "us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide",
        forecast_days: "2", timezone: "auto"
      }).toString();
      const response = await fetch(url);
      if (!response.ok) throw new Error("The air-quality service returned an error.");
      const data = await response.json();
      const times = data.hourly?.time || [];
      const currentIndex = times.findIndex(t => t.slice(0, 13) === new Date().toISOString().slice(0, 13));
      const index = currentIndex >= 0 ? currentIndex : 0;
      const pick = key => data.hourly?.[key]?.[index] ?? null;
      setLive({
        aqi: pick("us_aqi"), pm25: pick("pm2_5"), pm10: pick("pm10"),
        no2: pick("nitrogen_dioxide"), ozone: pick("ozone"),
        co: pick("carbon_monoxide"), so2: pick("sulphur_dioxide")
      });
      const forecast = times.map((time, i) => ({
        time, aqi: data.hourly?.us_aqi?.[i], pm25: data.hourly?.pm2_5?.[i], pm10: data.hourly?.pm10?.[i]
      })).filter(item => item.aqi != null).slice(index, index + 12);
      setHourly(forecast);
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      setApiError("Live data could not be loaded. Check your internet connection and try again. The record manager still works.");
    } finally {
      setLoading(false);
    }
  }

  async function searchCity(event) {
    event.preventDefault();
    const query = cityInput.trim();
    if (!query) return;
    setLoading(true);
    setApiError("");
    try {
      const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
      geoUrl.search = new URLSearchParams({ name: query, count: "1", language: "en", format: "json" }).toString();
      const geoResponse = await fetch(geoUrl);
      if (!geoResponse.ok) throw new Error("Could not search for that city.");
      const geoData = await geoResponse.json();
      const result = geoData.results?.[0];
      if (!result) throw new Error("No matching city was found. Try another city name.");
      const nextLocation = {
        name: result.name, admin1: result.admin1 || "", country: result.country || "",
        latitude: result.latitude, longitude: result.longitude
      };
      setLocation(nextLocation);
      await fetchAirQuality(nextLocation);
    } catch (error) {
      setApiError(error.message || "City search failed. Please try again.");
      setLoading(false);
    }
  }

  useEffect(() => { fetchAirQuality(location); }, []); // Load Bengaluru data on first render.

  const currentCategory = categoryFromAqi(live?.aqi);
  const filteredRecords = useMemo(() => records.filter(record => {
    const haystack = [record.city, record.date, record.pollutant, record.category, record.season, record.source].join(" ").toLowerCase();
    return haystack.includes(search.toLowerCase()) && (categoryFilter === "All categories" || record.category === categoryFilter);
  }), [records, search, categoryFilter]);

  const stats = useMemo(() => ({
    total: records.length,
    average: records.length ? Math.round(records.reduce((sum, r) => sum + Number(r.pm25 || 0), 0) / records.length) : 0,
    high: records.filter(r => ["Poor", "Very Poor", "Severe"].includes(r.category)).length
  }), [records]);

  function saveRecord(record) {
    if (editing) {
      setRecords(prev => prev.map(item => item.id === editing.id ? { ...record, id: editing.id } : item));
      setNotice("Record updated successfully.");
    } else {
      setRecords(prev => [{ ...record, id: Date.now() }, ...prev]);
      setNotice("New air-quality record added.");
    }
    setEditing(null);
    setShowForm(false);
  }
  function editRecord(record) { setEditing(record); setShowForm(true); setActiveTab("Records"); }
  function deleteRecord(id) {
    if (window.confirm("Delete this air-quality record?")) {
      setRecords(prev => prev.filter(record => record.id !== id));
      setNotice("Record deleted.");
    }
  }

  const maxAqi = Math.max(100, ...hourly.map(item => item.aqi || 0));
  const maxPm = Math.max(20, ...hourly.map(item => item.pm25 || 0));

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">✦</div><div><strong>AirWise</strong><span>ENVIRONMENTAL INTELLIGENCE</span></div></div>
      <div className="side-label">WORKSPACE</div>
     {["Overview", "Live air quality", "Forecast", "Pollutant guide", "Records"].map((tab, i) => (
  <button
    key={tab}
    className={`nav-item ${activeTab === tab ? "selected" : ""}`}
    onClick={() => {
      setActiveTab(tab);

      const sectionIds = {
        "Overview": null,
        "Live air quality": "live",
        "Forecast": "forecast",
        "Pollutant guide": "pollutant-guide",
        "Records": "records"
      };

      const sectionId = sectionIds[tab];

      if (sectionId) {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }}
  >
    <span>{["◈", "◉", "↗", "♡", "▤"][i]}</span>
    {tab}
  </button>
))}
      <div className="side-note"><div className="side-note-icon">🌱</div><strong>Small actions, cleaner air.</strong><p>Check your local conditions before heading outside.</p><button onClick={() => document.getElementById("health-tips")?.scrollIntoView({ behavior: "smooth" })}>Explore tips ↗</button></div>
      <div className="sidebar-footer"><span className="online-dot"></span> Open-Meteo data connection<br/><small>Forecasts may differ from official station readings.</small></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div><span className="eyebrow">AIR QUALITY INTELLIGENCE</span><h1>Your air, at a glance<span className="heading-dot">.</span></h1></div><div className="topbar-right"><span className="live-pill"><span className="pulse-dot"></span> LIVE DATA</span><div className="avatar">AW</div></div></header>

      <section className="hero-panel">
        <div className="hero-copy"><div className="hero-chip">🌤️ YOUR DAILY ATMOSPHERE CHECK</div><h2>Breathe better.<br/><em>Live smarter.</em></h2><p>Understand what's in the air around you, explore the next few hours, and turn data into healthier decisions.</p>
          <form className="city-search" onSubmit={searchCity}><span>⌕</span><input value={cityInput} onChange={e => setCityInput(e.target.value)} aria-label="Search city" placeholder="Search any city..." /><button className="button search-button" type="submit" disabled={loading}>{loading ? "Loading…" : "Check air ↗"}</button></form>
          <div className="location-line">⌖ {location.name}{location.admin1 ? `, ${location.admin1}` : ""}{location.country ? `, ${location.country}` : ""}</div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="sun"></div><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="cloud cloud-one"></div><div className="cloud cloud-two"></div><div className="leaf leaf-one">❋</div><div className="leaf leaf-two">✦</div><div className="air-orb"><span>AQI</span><strong>{live?.aqi ?? "—"}</strong><small>US index</small></div><div className="art-caption">THE AIR IS ALWAYS<br/>TELLING A STORY</div></div>
      </section>

      {apiError && <div className="error-banner"><span>⚠️</span><div><strong>Could not refresh live conditions</strong><p>{apiError}</p></div><button className="button ghost" onClick={() => fetchAirQuality()}>Retry</button></div>}
      {notice && <div className="notice-banner">{notice}<button onClick={() => setNotice("")}>×</button></div>}

      <section id="live" className="section-block">
        <div className="section-heading"><div><span className="eyebrow">RIGHT NOW</span><h2>Air quality snapshot</h2></div><div className="updated-label">{loading ? "Updating live readings…" : lastUpdated ? `Updated ${lastUpdated}` : "Connect to load live readings"} <button className="icon-button" title="Refresh data" onClick={() => fetchAirQuality()} disabled={loading}>↻</button></div></div>
        <div className="snapshot-grid">
          <article className={`aqi-feature ${currentCategory.className}`}><div className="aqi-feature-head"><span>Current US AQI</span><span className="mini-spark">↗</span></div><div className="big-aqi">{live?.aqi ?? "—"}<small>/ 500</small></div><AQIBadge value={live?.aqi} /><p>{currentCategory.advice}</p><div className="aqi-scale"><div className="scale-gradient"></div><div className="scale-labels"><span>Good</span><span>Moderate</span><span>Unhealthy</span><span>Hazardous</span></div></div></article>
          <MetricCard icon="🌫️" label="PM2.5" value={live?.pm25 == null ? "—" : Number(live.pm25).toFixed(1)} unit="µg/m³" tone="mint" detail="Fine particles · can travel deep into lungs" />
          <MetricCard icon="💨" label="PM10" value={live?.pm10 == null ? "—" : Number(live.pm10).toFixed(1)} unit="µg/m³" tone="peach" detail="Coarse particles · dust and pollen" />
          <MetricCard icon="🧪" label="Nitrogen dioxide" value={live?.no2 == null ? "—" : Number(live.no2).toFixed(1)} unit="µg/m³" tone="lavender" detail="NO₂ · commonly linked to traffic" />
        </div>
      </section>

      <section id="forecast" className="section-block">
        <div className="section-heading"><div><span className="eyebrow">LOOK AHEAD</span><h2>Air quality forecast</h2><p className="section-subtitle">Hourly outlook from the weather and air-quality forecast service.</p></div><span className="forecast-tag">NEXT 12 HOURS ↗</span></div>
        <div className="forecast-layout">
          <article className="chart-card"><div className="chart-title-row"><div><h3>Predicted AQI trend</h3><p>US AQI · forecast estimate</p></div><span className="chart-key"><i></i> AQI</span></div>
            {hourly.length ? <div className="bar-chart">{hourly.map((item, i) => <div className="bar-column" key={item.time} title={`${new Date(item.time).toLocaleString([], { weekday: "short", hour: "numeric" })}: AQI ${Math.round(item.aqi)}`}><div className="bar-value">{Math.round(item.aqi)}</div><div className={`forecast-bar ${categoryFromAqi(item.aqi).className}`} style={{ height: `${Math.max(7, (item.aqi / maxAqi) * 145)}px` }}></div><span>{new Date(item.time).toLocaleTimeString([], { hour: "numeric" }).replace(" ", "")}</span></div>)}</div> : <div className="empty-chart">{loading ? "Loading forecast…" : "Forecast appears here when live data is available."}</div>}
            <div className="chart-footer"><span>◷ Hourly forecast</span><span>Values are estimates, not a health guarantee.</span></div>
          </article>
          <article className="prediction-card"><div className="prediction-icon">✧</div><span className="eyebrow">FORECAST INSIGHT</span><h3>{hourly.length ? (hourly[hourly.length - 1].aqi > (live?.aqi || 0) ? "Air quality may worsen" : "Conditions may stay steadier") : "Your forecast is on its way"}</h3><p>{hourly.length ? `The final displayed forecast hour has an estimated US AQI of ${Math.round(hourly[hourly.length - 1].aqi)}. Check again before planning long outdoor activities.` : "Search for a city or refresh live data to load the hourly outlook."}</p><div className="prediction-stat"><span>Forecast window</span><strong>{hourly.length ? `${hourly.length} hours` : "—"}</strong></div><div className="prediction-stat"><span>Data source</span><strong>Open-Meteo</strong></div><small className="disclaimer">This is a provider forecast, not a custom-trained machine-learning model.</small></article>
        </div>
        <div className="pollutant-strip"><div><span className="pollutant-icon blue">O₃</span><span><strong>Ozone</strong><small>Ground-level gas</small></span><b>{live?.ozone == null ? "—" : `${Number(live.ozone).toFixed(1)} µg/m³`}</b></div><div><span className="pollutant-icon orange">CO</span><span><strong>Carbon monoxide</strong><small>Combustion gas</small></span><b>{live?.co == null ? "—" : `${Number(live.co).toFixed(0)} µg/m³`}</b></div><div><span className="pollutant-icon purple">SO₂</span><span><strong>Sulphur dioxide</strong><small>Industrial / fuel burning</small></span><b>{live?.so2 == null ? "—" : `${Number(live.so2).toFixed(1)} µg/m³`}</b></div></div>
      </section>

      <section id="pollutant-guide" className="section-block pollutant-guide">
        <div className="section-heading"><div><span className="eyebrow">KNOW WHAT YOU BREATHE</span><h2>Pollutants & your health</h2><p className="section-subtitle">Learn what each pollutant can do and how to reduce exposure.</p></div><span className="guide-tag">AIRWISE HEALTH GUIDE</span></div>
        <div className="health-guide-grid">
          <article className="health-card pm-card"><div className="health-card-top"><span className="health-symbol">PM₂.₅</span><span className="health-emoji">🌫️</span></div><h3>Fine particles</h3><p className="health-source">Smoke · combustion · traffic</p><div className="health-label">POSSIBLE HARM</div><p>Can travel deep into the lungs and enter the bloodstream. Exposure is linked to breathing and heart problems.</p><div className="health-label action-label">WHAT YOU CAN DO</div><p>Reduce outdoor exertion when levels are high, avoid smoke, and use a well-fitted particulate respirator if advised and exposure cannot be avoided.</p></article>
          <article className="health-card pm10-card"><div className="health-card-top"><span className="health-symbol">PM₁₀</span><span className="health-emoji">🏗️</span></div><h3>Coarse particles</h3><p className="health-source">Road dust · construction · pollen</p><div className="health-label">POSSIBLE HARM</div><p>Can irritate the eyes, nose, throat, and airways; may worsen asthma and other breathing conditions.</p><div className="health-label action-label">WHAT YOU CAN DO</div><p>Avoid dusty routes and construction areas, keep indoor dust down, and follow local air-quality advice.</p></article>
          <article className="health-card no2-card"><div className="health-card-top"><span className="health-symbol">NO₂</span><span className="health-emoji">🚗</span></div><h3>Nitrogen dioxide</h3><p className="health-source">Vehicle exhaust · fuel burning</p><div className="health-label">POSSIBLE HARM</div><p>Irritates airways and can worsen asthma and other respiratory conditions.</p><div className="health-label action-label">WHAT YOU CAN DO</div><p>Move away from heavy traffic when possible, avoid exercising beside busy roads, and ventilate away from traffic peaks when practical.</p></article>
          <article className="health-card ozone-card"><div className="health-card-top"><span className="health-symbol">O₃</span><span className="health-emoji">☀️</span></div><h3>Ground-level ozone</h3><p className="health-source">Forms in sunlight from other emissions</p><div className="health-label">POSSIBLE HARM</div><p>Can cause coughing, chest discomfort, breathing difficulty, and reduced lung function; may trigger asthma.</p><div className="health-label action-label">WHAT YOU CAN DO</div><p>On high-ozone days, shift strenuous activity to a time when levels are lower and follow local forecasts.</p></article>
          <article className="health-card co-card"><div className="health-card-top"><span className="health-symbol">CO</span><span className="health-emoji">🔥</span></div><h3>Carbon monoxide</h3><p className="health-source">Incomplete fuel burning · engines</p><div className="health-label">POSSIBLE HARM</div><p>Reduces the blood’s ability to carry oxygen. High exposure can cause headache, dizziness, confusion, and can be fatal.</p><div className="health-label action-label">WHAT YOU CAN DO</div><p>Never run generators or engines indoors or in garages. If a CO alarm sounds, leave immediately and contact emergency services.</p></article>
          <article className="health-card so2-card"><div className="health-card-top"><span className="health-symbol">SO₂</span><span className="health-emoji">🏭</span></div><h3>Sulphur dioxide</h3><p className="health-source">Fuel combustion · industry</p><div className="health-label">POSSIBLE HARM</div><p>Can irritate the respiratory system, cause breathing difficulty, and trigger symptoms in people with asthma.</p><div className="health-label action-label">WHAT YOU CAN DO</div><p>Limit outdoor exertion during high readings, move away from smoke or industrial plumes, and follow official alerts.</p></article>
        </div>
        <div className="health-note"><span>💚</span><p><strong>Remember:</strong> risk depends on the concentration, how long you are exposed, and individual health. Children, older adults, pregnant people, and people with heart or lung conditions may be more sensitive. This guide is for awareness, not diagnosis.</p></div>
        <div className="visual-tip">
          <div>
            <span className="eyebrow">MAKE IT VISUAL</span>
            <h3>See the impact of air pollution</h3>
            <p>These images help illustrate air quality, pollution sources, and the importance of cleaner air.</p>
          </div>
          <div
            className="aqi-image-gallery"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "18px",
              width: "100%",
              marginTop: "18px"
            }}
          >
            <figure style={{ margin: 0, minWidth: 0 }}>
              <img
                src="/images/aqi.jpg"
                alt="Air quality and pollution"
                onError={(event) => { event.currentTarget.style.display = "none"; }}
                style={{ width: "100%", height: "210px", objectFit: "cover", borderRadius: "14px", display: "block" }}
              />
              <figcaption style={{ marginTop: "8px", fontSize: "0.9rem", fontWeight: 600 }}>Understanding air quality</figcaption>
            </figure>
            <figure style={{ margin: 0, minWidth: 0 }}>
              <img
                src="/images/aqi3.jpg"
                alt="Air pollution and its sources"
                onError={(event) => { event.currentTarget.style.display = "none"; }}
                style={{ width: "100%", height: "210px", objectFit: "cover", borderRadius: "14px", display: "block" }}
              />
              <figcaption style={{ marginTop: "8px", fontSize: "0.9rem", fontWeight: 600 }}>Sources of pollution</figcaption>
            </figure>
            <figure style={{ margin: 0, minWidth: 0 }}>
              <img
                src="/images/aqi4.jpg"
                alt="Protecting people from air pollution"
                onError={(event) => { event.currentTarget.style.display = "none"; }}
                style={{ width: "100%", height: "210px", objectFit: "cover", borderRadius: "14px", display: "block" }}
              />
              <figcaption style={{ marginTop: "8px", fontSize: "0.9rem", fontWeight: 600 }}>Taking action for cleaner air</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section id="health-tips" className="tips-panel"><div className="tips-heading"><div className="tips-icon">🌿</div><div><span className="eyebrow">YOUR WELLBEING</span><h2>Little choices, cleaner breaths</h2></div></div><div className="tips-grid"><article><span>01</span><strong>Check before you step out</strong><p>Review AQI before running, cycling, or spending a long time outdoors.</p></article><article><span>02</span><strong>Know your sensitive hours</strong><p>If pollution is elevated, consider shifting strenuous activity to a cleaner time.</p></article><article><span>03</span><strong>Reduce what you can</strong><p>Walk, cycle, or use public transport when practical to help reduce emissions.</p></article></div></section>

      <section id="records" className="section-block records-section">
        <div className="section-heading"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>Air-quality records</h2><p className="section-subtitle">Add, review, search, edit, and remove your own observation records.</p></div><button className="button primary" onClick={() => { setEditing(null); setShowForm(v => !v); }}>{showForm && !editing ? "Close form −" : "+ Add record"}</button></div>
        {showForm && <div className="form-card"><div className="form-card-heading"><div><h3>{editing ? "Edit observation" : "Add a new observation"}</h3><p>Enter measured or classroom sample values.</p></div><span>✎</span></div><RecordForm key={editing?.id || "new"} initialValue={editing} onSave={saveRecord} onCancel={() => { setEditing(null); setShowForm(false); }} /></div>}
        <div className="records-tools"><label className="record-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search city, pollutant, source…" /></label><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label="Filter by category"><option>All categories</option>{CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}</select><span className="result-count">{filteredRecords.length} records</span></div>
        <div className="table-wrap"><table><thead><tr><th>LOCATION / DATE</th><th>PM2.5</th><th>PM10</th><th>MAIN POLLUTANT</th><th>AQI CATEGORY</th><th>MAIN SOURCE</th><th>ACTIONS</th></tr></thead><tbody>
          {filteredRecords.map(record => <tr key={record.id}><td><strong>{record.city}</strong><small>{record.date} · {record.season}</small></td><td>{record.pm25} <small>µg/m³</small></td><td>{record.pm10} <small>µg/m³</small></td><td><span className="pollutant-pill">{record.pollutant}</span></td><td><span className={`record-category ${record.category.toLowerCase().replaceAll(" ", "-")}`}>{record.category}</span></td><td>{record.source}</td><td><div className="table-actions"><button title="Edit record" onClick={() => editRecord(record)}>✎</button><button title="Delete record" onClick={() => deleteRecord(record.id)}>⌫</button></div></td></tr>)}
          {!filteredRecords.length && <tr><td colSpan="7" className="no-results">No records match your search. Try another keyword or add a record.</td></tr>}
        </tbody></table></div>
        <div className="records-footnote">These are editable workspace records, separate from the live API readings. Changes are held in React state and reset when you refresh the page.</div>
      </section>

      <footer className="footer"><div className="footer-brand"><span>✦</span> AirWise</div><p>Data for a breath of fresh perspective.</p><div>Live source: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">API documentation</a></div></footer>
    </main>
  </div>;
}
