# 🌿 NaruMonitor – Real-Time Air Quality Monitoring

NaruMonitor is an interactive web-based **Air Quality Monitoring and AQI Prediction platform** designed to help users understand air pollution and make informed decisions about air quality.

The website provides real-time-style AQI information, pollutant monitoring, an interactive AQI prediction tool, air-quality insights, and an easy-to-understand AQI health scale.

## ✨ Features

### 🏠 Landing Page
- Clean and responsive landing page
- Introduction to NaruMonitor
- Easy navigation through different sections
- Modern environmental-themed design

### 📍 Live AQI Monitoring
Users can view AQI information for different cities, including:
- Bengaluru
- Mumbai
- Delhi

Each location displays:
- AQI value
- Air quality category
- Location information

### 🤖 AI AQI Prediction
NaruMonitor includes an interactive AQI prediction section where users can adjust pollutant values using sliders.

The prediction considers:
- PM2.5
- PM10
- NO₂
- O₃

The system calculates a predicted AQI and classifies it into different air-quality categories.

### 🌫️ Pollutant Monitoring
The platform displays important pollutant measurements such as:

- PM2.5
- PM10
- CO
- NO₂
- SO₂
- O₃

This helps users understand which pollutants contribute to air-quality conditions.

### 📊 AQI Health Scale
The website provides a visual AQI scale showing:

| AQI Range | Category |
|---|---|
| 0–50 | Good |
| 51–100 | Moderate |
| 101–150 | Unhealthy |
| 151–200 | Very Unhealthy |
| 201+ | Hazardous |

A visual indicator shows the current AQI level and its corresponding category.

### 💡 Air Quality Insights
The platform also provides informational content and articles related to:
- Air pollution
- AQI
- Environmental awareness
- Healthy living
- Air-quality monitoring

## 🛠️ Technologies Used

- **HTML5** – Structure of the webpage
- **Tailwind CSS** – Styling and responsive design
- **JavaScript** – Interactive features and AQI prediction
- **Lucide Icons** – Icons used throughout the interface

## 🧠 AQI Prediction

The current front-end prediction uses a weighted calculation based on pollutant values:

```javascript
const predicted = Math.round(
  (pm25 * 1.45) +
  (pm10 * 0.35) +
  (no2 * 0.55) +
  (o3 * 0.25)
);
