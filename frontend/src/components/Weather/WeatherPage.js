import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import HourlyForecast from './HourlyForecast';
import DailyForecast from './DailyForecast';
import DownloadReportButton from './DownloadReportButton';
import AstroWidget from './AstroWidget';
import Sidebar from './Sidebar';

import { useTheme } from '../../contexts/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend);

const WeatherPage = ({ locationName }) => {
    const routeLocation = useLocation();
    const navigate = useNavigate();
    const { isDarkMode, toggleTheme } = useTheme();

    const [currentWeather, setCurrentWeather] = useState(() => {
        const cached = localStorage.getItem('roamiq-cached-current-weather');
        return cached ? JSON.parse(cached) : {
            temperature: 25,
            condition: 'Clear Sky',
            code: 0,
            humidity: 60,
            wind_speed: 10,
            city: 'Coimbatore',
            is_day: 1
        };
    });
    const [hourlyData, setHourlyData] = useState(() => {
        const cached = localStorage.getItem('roamiq-cached-hourly-data');
        return cached ? JSON.parse(cached) : null;
    });
    const [dailyData, setDailyData] = useState(() => {
        const cached = localStorage.getItem('roamiq-cached-daily-data');
        return cached ? JSON.parse(cached) : null;
    });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(() => {
        const hasCached = localStorage.getItem('roamiq-cached-current-weather');
        return !hasCached;
    });
    const [inputs, setInputs] = useState(() => {
        const cached = localStorage.getItem('roamiq-cached-inputs');
        return cached ? JSON.parse(cached) : { temperature: 25, humidity: 60, rainfall: 0, wind_speed: 10 };
    });
    const [prediction, setPrediction] = useState(() => {
        const cached = localStorage.getItem('roamiq-cached-prediction');
        return cached ? JSON.parse(cached) : {
            predicted_temperature: 25,
            predicted_rainfall: 0,
            condition_tomorrow: 'Clear Sky',
            method: 'Initialization'
        };
    });

    const DEFAULT_LAT = 11.0168;
    const DEFAULT_LON = 76.9558;
    const DEFAULT_CITY = 'Coimbatore, Tamil Nadu, India';

    const handlePredictManual = useCallback(async (t, h, r, w) => {
        setPrediction({ prediction: "Analyzing...", predicted_temperature: "...", predicted_rainfall: "...", condition_tomorrow: "Loading..." });
        try {
            const res = await axios.post(`/api/travel/predict_fast`, {
                temperature: Number(t) || 25,
                humidity: Number(h) || 60,
                rainfall: Number(r) || 0,
                wind_speed: Number(w) || 10
            }, { timeout: 5000 });
            setPrediction({ ...res.data, method: "AI Model" });
            localStorage.setItem('roamiq-cached-prediction', JSON.stringify({ ...res.data, method: "AI Model" }));
        } catch {
            const condition = h > 70 ? (r > 0 ? "Rainy" : "Humid") : "Clear";
            const manualPrediction = {
                predicted_temperature: Math.round(t + (Math.random() * 4 - 2)),
                predicted_rainfall: Math.max(0, Math.round((r + (Math.random() * 2)) * 10) / 10),
                condition_tomorrow: condition,
                method: "Heuristics"
            };
            setPrediction(manualPrediction);
            localStorage.setItem('roamiq-cached-prediction', JSON.stringify(manualPrediction));
        }
    }, []);

    useEffect(() => {
        const fetchWeather = async () => {
            const params = new URLSearchParams(routeLocation.search);
            let lat = params.get('lat');
            let lon = params.get('lon');
            let city = params.get('city') ? decodeURIComponent(params.get('city')) : locationName;

            if (!lat || !lon) {
                // 1. Try to read from the last viewed weather location
                const lastViewed = localStorage.getItem('roamiq-last-viewed-weather-location');
                if (lastViewed) {
                    const parsed = JSON.parse(lastViewed);
                    lat = parsed.lat;
                    lon = parsed.lon;
                    city = parsed.city;
                } else {
                    // 2. Read from cached user location or use default
                    const cached = localStorage.getItem('roamiq-user-location');
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        lat = parsed.lat;
                        lon = parsed.lng;
                        city = parsed.address;
                    } else {
                        lat = DEFAULT_LAT;
                        lon = DEFAULT_LON;
                        city = DEFAULT_CITY;
                    }
                }
            } else if (!city) {
                city = DEFAULT_CITY;
            }

            // Check cache validity (15 minutes cache time limit)
            const cachedWeather = localStorage.getItem('roamiq-cached-current-weather');
            const cachedHourly = localStorage.getItem('roamiq-cached-hourly-data');
            const cachedDaily = localStorage.getItem('roamiq-cached-daily-data');
            const cacheTime = localStorage.getItem('roamiq-weather-cache-time');
            const lastViewed = localStorage.getItem('roamiq-last-viewed-weather-location');
            
            let isCacheValid = false;
            if (cachedWeather && cachedHourly && cachedDaily && cacheTime && lastViewed) {
                try {
                    const parsedLast = JSON.parse(lastViewed);
                    const age = Date.now() - parseInt(cacheTime);
                    // Standardize float formats for comparison
                    const sameLoc = Math.abs(Number(parsedLast.lat) - Number(lat)) < 0.001 && 
                                    Math.abs(Number(parsedLast.lon) - Number(lon)) < 0.001;
                    if (age < 900000 && sameLoc) { // 15 minutes cache limit
                        isCacheValid = true;
                    }
                } catch (e) {
                    isCacheValid = false;
                }
            }

            if (isCacheValid) {
                try {
                    const weatherState = JSON.parse(cachedWeather);
                    setCurrentWeather(weatherState);
                    setHourlyData(JSON.parse(cachedHourly));
                    setDailyData(JSON.parse(cachedDaily));
                    
                    const cachedInputs = localStorage.getItem('roamiq-cached-inputs');
                    if (cachedInputs) {
                        setInputs(JSON.parse(cachedInputs));
                    }
                    
                    const cachedPredict = localStorage.getItem('roamiq-cached-prediction');
                    if (cachedPredict) {
                        setPrediction(JSON.parse(cachedPredict));
                    } else {
                        handlePredictManual(weatherState.temperature, weatherState.humidity, 0, weatherState.wind_speed);
                    }
                    setInitialLoading(false);
                    return;
                } catch (e) {
                    console.warn("Error reading cache", e);
                }
            }

            try {
                const res = await axios.get(`/api/travel/current?lat=${lat}&lon=${lon}&city=${encodeURIComponent(city)}`);
                const data = res.data;
                
                const weatherState = {
                    temperature: data.temperature || 0,
                    condition: data.description || 'Clear Sky',
                    code: data.weather_code || 0,
                    humidity: data.humidity || 0,
                    wind_speed: data.windspeed || data.wind_speed || 0,
                    city: city,
                    is_day: data.is_day !== undefined ? data.is_day : 1
                };

                setCurrentWeather(weatherState);
                
                // Save this as the last viewed weather location!
                localStorage.setItem('roamiq-last-viewed-weather-location', JSON.stringify({ lat, lon, city }));

                // Cache for instant page returns!
                localStorage.setItem('roamiq-cached-current-weather', JSON.stringify(weatherState));
                localStorage.setItem('roamiq-cached-hourly-data', JSON.stringify(data.hourly));
                localStorage.setItem('roamiq-cached-daily-data', JSON.stringify(data.daily));
                localStorage.setItem('roamiq-weather-cache-time', Date.now().toString());

                setHourlyData(data.hourly);
                setDailyData(data.daily);
                const newInputs = {
                    temperature: Math.round(weatherState.temperature),
                    humidity: Math.round(weatherState.humidity),
                    rainfall: 0,
                    wind_speed: Math.round(weatherState.wind_speed)
                };
                setInputs(newInputs);
                localStorage.setItem('roamiq-cached-inputs', JSON.stringify(newInputs));

                handlePredictManual(weatherState.temperature, weatherState.humidity, 0, weatherState.wind_speed);
            } catch (err) {
                console.error("Fetch Error:", err);
            } finally {
                setInitialLoading(false);
            }
        };
        fetchWeather();
    }, [routeLocation.search, handlePredictManual, locationName]);

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInputs(prev => ({ ...prev, [name]: parseFloat(value) }));
    };

    const handlePredict = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        await handlePredictManual(inputs.temperature, inputs.humidity, inputs.rainfall, inputs.wind_speed);
        setLoading(false);
    };

    const handleRecheckLocation = async () => {
        setInitialLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    let city = 'Current Location';
                    try {
                        const revRes = await axios.get(`/api/travel/reverse?lat=${lat}&lon=${lon}`);
                        if (revRes.data) {
                                                        const addr = revRes.data.address;
                            const suburb = addr.suburb || addr.neighbourhood || addr.village || addr.hamlet;
                            const main = addr.city || addr.town || addr.municipality;
                            
                            if (suburb) {
                                const isCoimbatore = (addr.county && addr.county.toLowerCase().includes('coimbatore')) || 
                                                   (main && main.toLowerCase().includes('coimbatore')) ||
                                                   (addr.city && addr.city.toLowerCase().includes('coimbatore'));
                                if (isCoimbatore && suburb.toLowerCase() !== 'coimbatore') {
                                    city = `${suburb}, Coimbatore`;
                                } else {
                                    city = main ? `${suburb}, ${main}` : suburb;
                                }
                            } else {
                                city = main || addr.county || 'Current Location';
                            }
                            if (addr.country) city += `, ${addr.country}`;
                        }
                    } catch (e) {
                        console.error("Reverse geocoding failed", e);
                    }
                    
                    // Cache the new location so both Weather page and Dashboard can use it immediately!
                    const newLoc = { lat, lng: lon, address: city };
                    localStorage.setItem('roamiq-user-location', JSON.stringify(newLoc));

                    // Navigate to update URL search parameters
                    navigate(`/weather?lat=${lat}&lon=${lon}&city=${encodeURIComponent(city)}`);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    alert("Unable to retrieve GPS location. Please check your browser permissions.");
                    setInitialLoading(false);
                },
                { timeout: 7000 }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
            setInitialLoading(false);
        }
    };
    const handleBackToCurrent = () => {
        const cached = localStorage.getItem('roamiq-user-location');
        if (cached) {
            const parsed = JSON.parse(cached);
            navigate(`/weather?lat=${parsed.lat}&lon=${parsed.lng}&city=${encodeURIComponent(parsed.address)}`);
        } else {
            navigate(`/weather?lat=${DEFAULT_LAT}&lon=${DEFAULT_LON}&city=${encodeURIComponent(DEFAULT_CITY)}`);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', background: 'var(--bg-gradient-main)', color: 'var(--text-main-weather)', fontFamily: "'Outfit', sans-serif" }}>
            <Sidebar 
                selectedDate={selectedDate} 
                onDateChange={setSelectedDate} 
                weatherData={currentWeather} 
                isLoadingData={initialLoading} 
                isDarkMode={isDarkMode}
                onToggleTheme={toggleTheme}
                onRecheckLocation={handleRecheckLocation}
                onBackToCurrent={handleBackToCurrent}
            />
            
            <div className="weather-main-content" style={{ flex: 1, marginLeft: '240px', padding: '0' }}>

                {initialLoading ? (
                    <div className="d-flex justify-content-center align-items-center" style={{ height: '100%', minHeight: '80vh' }}>
                        <div className="text-center">
                            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <h4 className="fw-black" style={{ color: 'var(--text-main-weather)' }}>Syncing Atmosphere Data...</h4>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="px-5 py-4 d-flex justify-content-end align-items-center">
                            {/* Calendar Option Moved to Sidebar */}
                        </div>

                <div className="px-5 pb-5">

                    <div className="row g-4">
                        {/* Left Column */}
                        <div className="col-lg-8 d-flex flex-column gap-4">
                            {/* AI Weather Simulator - Purple Card */}
                             <div className="glass-panel p-5 shadow-sm" style={{ 
                                background: 'var(--glass-bg-weather)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                borderRadius: '32px', 
                                border: '1px solid var(--glass-border-weather)',
                                color: 'var(--text-main-weather)',
                                boxShadow: '0 15px 45px rgba(0, 0, 0, 0.05)'
                            }}>
                                <div className="d-flex align-items-center mb-4 gap-3">
                                    <div className="bg-white bg-opacity-10 rounded-3 p-2">🤖</div>
                                    <div>
                                        <h2 className="mb-0 fw-black">AI Weather Simulator</h2>
                                        <div className="fw-bold text-primary" style={{ fontSize: '0.9rem' }}>Simulating for: {currentWeather?.city || 'Global'}</div>
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-5">
                                        <form onSubmit={handlePredict}>
                                            {[
                                                { id: 'temperature', label: 'temperature (°C)', color: '#f97316' },
                                                { id: 'humidity', label: 'humidity (%)', color: '#2563eb' },
                                                { id: 'rainfall', label: 'rainfall (mm)', color: '#4c1d95' },
                                                { id: 'wind_speed', label: 'wind speed (km/h)', color: '#16a34a' }
                                            ].map(field => (
                                                <div key={field.id} className="mb-3">
                                                    <label className="text-uppercase fw-black mb-2" style={{ fontSize: '0.85rem', letterSpacing: '0.5px', color: isDarkMode ? '#f8fafc' : '#0f172a', opacity: 0.85 }}>{field.label} •</label>
                                                    <div className="d-flex gap-3 align-items-center">
                                                        <input 
                                                            type="range" 
                                                            className="form-range custom-range" 
                                                            name={field.id} 
                                                            min={field.id === 'temperature' ? -10 : 0} 
                                                            max={field.id === 'temperature' ? 60 : (field.id === 'humidity' ? 100 : 200)} 
                                                            step={0.1} 
                                                            value={inputs[field.id]} 
                                                            onChange={handleChange} 
                                                            style={{ 
                                                                '--range-color': field.color,
                                                                accentColor: field.color 
                                                            }}
                                                        />
                                                        <div className="px-3 py-1 rounded-3 fw-bold" style={{ minWidth: '60px', textAlign: 'center', fontSize: '0.75rem', background: `${field.color}10`, color: field.color }}>{inputs[field.id]}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="submit" className="btn btn-primary w-100 fw-black py-3 mt-2 rounded-4 text-uppercase shadow-sm" style={{ background: '#22c55e !important', backgroundColor: '#22c55e', border: 'none' }}>
                                                {loading ? 'Processing...' : 'Run Simulation'}
                                            </button>
                                        </form>
                                    </div>

                                     <div className="col-md-7">
                                        <div className="h-100 p-4 rounded-4 shadow-sm" style={{ background: 'var(--glass-bg-weather)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--glass-border-weather)' }}>
                                            <div className="text-center mb-4">
                                                <h4 className="fw-black mb-0">Condition: <span className="bg-warning text-dark px-3 py-1 rounded-pill">{prediction.condition_tomorrow || 'Cloudy'}</span></h4>
                                            </div>
                                            <div className="row text-center mb-4">
                                                <div className="col-6">
                                                    <div className="fw-black text-uppercase text-primary mb-2" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Predicted Temp</div>
                                                    <h2 className="fw-black mb-0" style={{ color: isDarkMode ? '#f8fafc' : '#0f172a', fontSize: '1.8rem' }}>{prediction.predicted_temperature}°C</h2>
                                                </div>
                                                <div className="col-6">
                                                    <div className="fw-black text-uppercase text-primary mb-2" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Predicted Rain</div>
                                                    <h2 className="fw-black mb-0" style={{ color: isDarkMode ? '#f8fafc' : '#0f172a', fontSize: '1.8rem' }}>{prediction.predicted_rainfall} mm</h2>
                                                </div>
                                            </div>
                                            <div style={{ height: '80px' }}>
                                                <Chart type='bar' data={{ labels: ['Temp', 'Rain'], datasets: [{ data: [parseFloat(prediction.predicted_temperature) || 0, parseFloat(prediction.predicted_rainfall) || 0], backgroundColor: ['#f43f5e', '#3b82f6'], borderRadius: 4 }] }} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { ticks: { color: isDarkMode ? '#f8fafc' : '#0f172a', font: { weight: 'bold' } }, grid: { display: false } } } }} />
                                            </div>
                                            <div className="mt-3 p-2 rounded-4 d-flex align-items-center gap-3 shadow-sm" style={{ background: '#3b82f6', color: '#fff', fontSize: '0.9rem', fontWeight: '900' }}>
                                                <span className="fs-5">📍</span>
                                                <span>Suggestion: {prediction.suggestion || 'Light rain likely. Keep a raincoat handy.'}</span>
                                            </div>
                                            <div className="mt-3">
                                                <DownloadReportButton weatherData={currentWeather} predictionData={prediction} hourlyData={hourlyData} locationName={currentWeather?.city} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                              <div className="glass-panel p-5 flex-grow-1 d-flex flex-column" style={{ 
                                background: 'var(--glass-bg-weather)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                borderRadius: '32px',
                                border: '1px solid var(--glass-border-weather)',
                                color: 'var(--text-main-weather)',
                                boxShadow: '0 15px 45px rgba(0, 0, 0, 0.05)'
                            }}>
                                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                                    <h2 className="mb-0 fw-black text-truncate" style={{ maxWidth: '70%', fontSize: '1.6rem' }}>{currentWeather?.city}</h2>
                                    <div className="d-flex align-items-center gap-3">
                                        <span className="opacity-75 fw-bold text-muted" style={{ fontSize: '1rem' }}>{currentWeather.condition} • {currentWeather.temperature}°C</span>
                                        <span className="px-2 py-1 rounded small fw-black text-uppercase shadow-sm text-white" style={{ background: 'linear-gradient(45deg, #f43f5e, #fb923c)', letterSpacing: '1px', fontSize: '0.7rem' }}>📍 Live</span>
                                    </div>
                                </div>
                                 <div className="p-4 rounded-4 shadow-sm flex-grow-1" style={{ 
                                     minHeight: '400px', 
                                     background: isDarkMode ? 'rgba(6, 10, 23, 0.6)' : '#ffffff', 
                                     backdropFilter: 'blur(16px)',
                                     WebkitBackdropFilter: 'blur(16px)',
                                     border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.05)' 
                                 }}>
                                    <HourlyForecast data={hourlyData} themeColor="var(--text-main-weather)" />
                                </div>
                            </div>
                        </div>

                         {/* Right Column */}
                        <div className="col-lg-4 d-flex flex-column gap-4">
                             <div className="glass-panel p-5 flex-grow-1 shadow-sm" style={{ 
                                background: 'var(--glass-bg-weather)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                borderRadius: '32px',
                                border: '1px solid var(--glass-border-weather)',
                                color: 'var(--text-main-weather)',
                                boxShadow: '0 15px 45px rgba(0, 0, 0, 0.05)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <DailyForecast data={dailyData} locationName={currentWeather?.city} />
                            </div>
                            <AstroWidget data={{ daily: dailyData }} />
                        </div>
                    </div>
                </div>
                </>
                )}
            </div>

            <style>{`
                .custom-range::-webkit-slider-runnable-track { background: rgba(255, 255, 255, 0.1); height: 4px; border-radius: 2px; }
                .custom-range::-webkit-slider-thumb { background: #2563eb; border: 2px solid #fff; width: 14px; height: 14px; margin-top: -5px; -webkit-appearance: none; border-radius: 50%; }
                .fw-black { font-weight: 900 !important; }
                .x-small { font-size: 0.65rem !important; }
                .cursor-pointer { cursor: pointer; transition: opacity 0.2s; }
                .cursor-pointer:hover { opacity: 0.8; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default WeatherPage;
