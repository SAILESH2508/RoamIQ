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

const getConditionStyle = (cond, isDarkMode) => {
    const c = (cond || '').toLowerCase();
    if (c.includes('rain') || c.includes('storm') || c.includes('drizzle')) {
        return { 
            background: '#2563eb',
            color: 'white', 
            border: 'none',
            borderRadius: '6px'
        };
    }
    if (c.includes('clear') || c.includes('sunny') || c.includes('warm') || c.includes('hot')) {
        return { 
            background: '#d97706',
            color: 'white', 
            border: 'none',
            borderRadius: '6px'
        };
    }
    if (c.includes('cloud') || c.includes('overcast') || c.includes('mist') || c.includes('fog')) {
        return { 
            background: '#4b5563',
            color: 'white', 
            border: 'none',
            borderRadius: '6px'
        };
    }
    return { 
        background: '#7c3aed',
        color: 'white', 
        border: 'none',
        borderRadius: '6px'
    };
};

const getHourlyCardTheme = (weather, isDarkMode) => {
    if (!weather) return {
        background: 'var(--glass-bg-weather)',
        border: '1px solid var(--glass-border-weather)',
        boxShadow: '0 15px 45px rgba(0, 0, 0, 0.05)',
        textColor: 'var(--text-main-weather)'
    };

    const isDay = weather.is_day === 1;
    const cond = (weather.condition || '').toLowerCase();
    const isRain = cond.includes('rain') || cond.includes('drizzle') || cond.includes('storm') || cond.includes('shower');
    const isCloudy = cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('fog');
    
    // 1. RAIN
    if (isRain) {
        if (isDay) {
            return {
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.07) 0%, rgba(29, 78, 216, 0.12) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(59, 130, 246, 0.28)',
                boxShadow: '0 15px 45px rgba(37, 99, 235, 0.06), 0 0 25px rgba(37, 99, 235, 0.04)',
                textColor: '#1e3a8a'
            };
        } else {
            return {
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.85) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(59, 130, 246, 0.22)',
                boxShadow: '0 15px 45px rgba(0, 0, 0, 0.35), 0 0 30px rgba(59, 130, 246, 0.12)',
                textColor: '#93c5fd'
            };
        }
    }
    
    // 2. SUNNY / CLEAR
    if (cond.includes('clear') || cond.includes('sunny')) {
        if (isDay) {
            return {
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(244, 63, 94, 0.03) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(251, 191, 36, 0.22)',
                boxShadow: '0 15px 45px rgba(251, 191, 36, 0.04), 0 0 25px rgba(251, 191, 36, 0.02)',
                textColor: '#78350f'
            };
        } else {
            return {
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(88, 28, 135, 0.12) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(139, 92, 246, 0.18)',
                boxShadow: '0 15px 45px rgba(0, 0, 0, 0.4), 0 0 30px rgba(139, 92, 246, 0.1)',
                textColor: '#c084fc'
            };
        }
    }
    
    // 3. CLOUDY / OVERCAST / FOG
    if (isCloudy) {
        if (isDay) {
            return {
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(100, 116, 139, 0.05) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(14, 165, 233, 0.18)',
                boxShadow: '0 15px 45px rgba(14, 165, 233, 0.03)',
                textColor: '#0f172a'
            };
        } else {
            return {
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.85) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                boxShadow: '0 15px 45px rgba(0, 0, 0, 0.35)',
                textColor: '#cbd5e1'
            };
        }
    }

    // Default Fallback
    return {
        background: 'var(--glass-bg-weather)',
        border: '1px solid var(--glass-border-weather)',
        boxShadow: '0 15px 45px rgba(0, 0, 0, 0.05)',
        textColor: 'var(--text-main-weather)'
    };
};

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

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchHistory, setSearchHistory] = useState([]);

    const fetchSearchHistory = useCallback(async () => {
        try {
            const res = await axios.get('/api/travel/history');
            setSearchHistory(res.data || []);
        } catch (e) {
            console.error("Failed to fetch search history", e);
        }
    }, []);

    useEffect(() => {
        fetchSearchHistory();
    }, [fetchSearchHistory]);

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
                        // Automatically fetch current browser location if no cache exists!
                        if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                                async (position) => {
                                    const autoLat = position.coords.latitude;
                                    const autoLon = position.coords.longitude;
                                    let autoCity = 'Current Location';
                                    try {
                                        const revRes = await axios.get(`/api/travel/reverse?lat=${autoLat}&lon=${autoLon}`);
                                        if (revRes.data) {
                                            const addr = revRes.data.address;
                                            const suburb = addr.suburb || addr.neighbourhood || addr.village || addr.hamlet;
                                            const main = addr.city || addr.town || addr.municipality;
                                            
                                            if (suburb) {
                                                const isCoimbatore = (addr.county && addr.county.toLowerCase().includes('coimbatore')) || 
                                                                   (main && main.toLowerCase().includes('coimbatore')) ||
                                                                   (addr.city && addr.city.toLowerCase().includes('coimbatore'));
                                                if (isCoimbatore && suburb.toLowerCase() !== 'coimbatore') {
                                                    autoCity = `${suburb}, Coimbatore`;
                                                } else {
                                                    autoCity = main ? `${suburb}, ${main}` : suburb;
                                                }
                                            } else {
                                                autoCity = main || addr.county || 'Current Location';
                                            }
                                            if (addr.country) autoCity += `, ${addr.country}`;
                                        }
                                    } catch (e) {
                                        console.error("Auto geocoding failed", e);
                                    }
                                    const newLoc = { lat: autoLat, lng: autoLon, address: autoCity };
                                    localStorage.setItem('roamiq-user-location', JSON.stringify(newLoc));
                                    navigate(`/weather?lat=${autoLat}&lon=${autoLon}&city=${encodeURIComponent(autoCity)}`);
                                },
                                () => {
                                    // Silent fallback to Coimbatore quietly on permission denial/timeout
                                    navigate(`/weather?lat=${DEFAULT_LAT}&lon=${DEFAULT_LON}&city=${encodeURIComponent(DEFAULT_CITY)}`);
                                },
                                { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
                            );
                            return; // Wait for navigation redirect
                        } else {
                            lat = DEFAULT_LAT;
                            lon = DEFAULT_LON;
                            city = DEFAULT_CITY;
                        }
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
            
            const isSelectedDateToday = selectedDate === new Date().toISOString().split('T')[0];
            let isCacheValid = false;
            if (isSelectedDateToday && cachedWeather && cachedHourly && cachedDaily && cacheTime && lastViewed) {
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
                const res = await axios.get(`/api/travel/current?lat=${lat}&lon=${lon}&city=${encodeURIComponent(city)}&date=${selectedDate}`);
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

                // Cache for today only
                if (isSelectedDateToday) {
                    localStorage.setItem('roamiq-cached-current-weather', JSON.stringify(weatherState));
                    localStorage.setItem('roamiq-cached-hourly-data', JSON.stringify(data.hourly));
                    localStorage.setItem('roamiq-cached-daily-data', JSON.stringify(data.daily));
                    localStorage.setItem('roamiq-weather-cache-time', Date.now().toString());
                }

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

                // Add to search history in backend
                try {
                    await axios.post('/api/travel/history', {
                        place_name: city,
                        latitude: Number(lat),
                        longitude: Number(lon),
                        display_name: city
                    });
                    fetchSearchHistory();
                } catch (historyErr) {
                    console.warn("Failed to save to search history", historyErr);
                }

            } catch (err) {
                console.error("Fetch Error:", err);
            } finally {
                setInitialLoading(false);
            }
        };
        fetchWeather();
    }, [routeLocation.search, handlePredictManual, locationName, navigate, selectedDate, fetchSearchHistory]);

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
                    alert("Unable to retrieve GPS location. Please check your browser permissions or enable Location Services.");
                    setInitialLoading(false);
                },
                { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 }
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

    const handleDeleteHistoryItem = async (historyId) => {
        try {
            await axios.delete(`/api/travel/history/${historyId}`);
            fetchSearchHistory();
        } catch (e) {
            console.error("Failed to delete history item", e);
        }
    };

    const handleClearHistory = async () => {
        try {
            await axios.delete('/api/travel/history');
            setSearchHistory([]);
        } catch (e) {
            console.error("Failed to clear search history", e);
        }
    };

    const getFilteredHourlyData = () => {
        if (!hourlyData || !hourlyData.time) return null;
        const indices = [];
        hourlyData.time.forEach((t, idx) => {
            if (t.startsWith(selectedDate)) {
                indices.push(idx);
            }
        });
        
        if (indices.length > 0) {
            return {
                time: indices.map(idx => hourlyData.time[idx]),
                temperature_2m: indices.map(idx => hourlyData.temperature_2m[idx]),
                rain: hourlyData.rain ? indices.map(idx => hourlyData.rain[idx]) : new Array(indices.length).fill(0),
                relative_humidity_2m: hourlyData.relative_humidity_2m ? indices.map(idx => hourlyData.relative_humidity_2m[idx]) : undefined,
                weather_code: hourlyData.weather_code ? indices.map(idx => hourlyData.weather_code[idx]) : undefined,
                is_day: hourlyData.is_day ? indices.map(idx => hourlyData.is_day[idx]) : undefined
            };
        }
        return hourlyData;
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
                searchHistory={searchHistory}
                onDeleteHistoryItem={handleDeleteHistoryItem}
                onClearHistory={handleClearHistory}
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

                                <div className="row g-4 d-flex align-items-stretch">
                                    <div className="col-md-5 d-flex">
                                        <div className="w-100 p-4 rounded-4 shadow-sm d-flex flex-column justify-content-between border" style={{ background: 'var(--glass-bg-weather)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderColor: 'var(--glass-border-weather)' }}>
                                            <form onSubmit={handlePredict} className="h-100 d-flex flex-column justify-content-between gap-3 w-100">
                                            {[
                                                { id: 'temperature', label: 'temperature (°C)', color: '#f97316' },
                                                { id: 'humidity', label: 'humidity (%)', color: '#2563eb' },
                                                { id: 'rainfall', label: 'rainfall (mm)', color: '#8b5cf6' },
                                                { id: 'wind_speed', label: 'wind speed (km/h)', color: '#10b981' }
                                            ].map(field => (
                                                <div key={field.id} className="mb-3">
                                                    <label className="text-uppercase fw-black mb-2" style={{ fontSize: '0.82rem', letterSpacing: '0.5px', color: isDarkMode ? '#cbd5e1' : '#1e293b', opacity: 0.85 }}>{field.label} •</label>
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
                                                                '--track-gradient': field.id === 'temperature' 
                                                                    ? 'linear-gradient(to right, #fbbf24, #f97316, #ef4444)' 
                                                                    : field.id === 'humidity' 
                                                                    ? 'linear-gradient(to right, #cbd5e1, #3b82f6, #1d4ed8)' 
                                                                    : field.id === 'rainfall' 
                                                                    ? 'linear-gradient(to right, #e2e8f0, #c084fc, #6366f1)' 
                                                                    : 'linear-gradient(to right, #e2e8f0, #34d399, #059669)',
                                                                '--thumb-color': field.color,
                                                                accentColor: field.color 
                                                            }}
                                                        />
                                                        <div 
                                                            className="px-3 py-1.5 rounded-pill fw-black shadow-sm" 
                                                            style={{ 
                                                                minWidth: '65px', 
                                                                textAlign: 'center', 
                                                                fontSize: '0.8rem', 
                                                                background: `linear-gradient(135deg, ${field.color}12, ${field.color}22)`, 
                                                                color: field.color,
                                                                border: `1px solid ${field.color}35`,
                                                                boxShadow: `0 2px 8px ${field.color}12`
                                                            }}
                                                        >
                                                            {inputs[field.id]}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <button 
                                                type="submit" 
                                                className="btn-premium w-100 fw-black py-3 mt-3 rounded-pill text-uppercase shadow-lg d-flex align-items-center justify-content-center gap-2 border-0" 
                                                style={{ 
                                                    background: 'linear-gradient(135deg, #ff7e40 0%, #ff4500 100%)', 
                                                    color: 'white',
                                                    fontSize: '0.9rem',
                                                    letterSpacing: '1px',
                                                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
                                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 69, 0, 0.4)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1.0)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}
                                            >
                                                {loading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                        <span>Analyzing...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>⚡</span>
                                                        <span>Run AI Simulation</span>
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                         </div>
                                    </div>

                                     <div className="col-md-7 d-flex">
                                         <div className="h-100 w-100 p-4 rounded-4 shadow-sm d-flex flex-column justify-content-between" style={{ background: 'var(--glass-bg-weather)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--glass-border-weather)' }}>
                                             {(() => {
                                                 const projectionData = {
                                                     labels: ['Temp (°C)', 'Rain (mm)'],
                                                     datasets: [
                                                         {
                                                             data: [
                                                                 parseFloat(prediction.predicted_temperature) || 0,
                                                                 parseFloat(prediction.predicted_rainfall) || 0
                                                             ],
                                                             backgroundColor: [
                                                                 isDarkMode ? '#fbbf24' : '#d97706',
                                                                 isDarkMode ? '#3b82f6' : '#1d4ed8'
                                                             ],
                                                             hoverBackgroundColor: [
                                                                 isDarkMode ? '#fbbf24' : '#d97706',
                                                                 isDarkMode ? '#3b82f6' : '#1d4ed8'
                                                             ],
                                                             borderRadius: 4,
                                                             borderSkipped: false,
                                                             barThickness: 26
                                                         }
                                                     ]
                                                 };

                                                 const projectionOptions = {
                                                     indexAxis: 'y',
                                                     responsive: true,
                                                     maintainAspectRatio: false,
                                                     plugins: {
                                                         legend: { display: false },
                                                         tooltip: {
                                                             backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                                                             titleColor: isDarkMode ? '#f8fafc' : '#0f172a',
                                                             bodyColor: isDarkMode ? '#cbd5e1' : '#334155',
                                                             borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                                             borderWidth: 1,
                                                             padding: 10,
                                                             cornerRadius: 8,
                                                             callbacks: {
                                                                 label: (context) => {
                                                                     const val = context.raw;
                                                                     return context.dataIndex === 0 ? ` ${val}°C` : ` ${val} mm`;
                                                                 }
                                                             }
                                                         }
                                                     },
                                                     scales: {
                                                         x: {
                                                             grid: {
                                                                 color: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                                                                 drawBorder: false
                                                             },
                                                             ticks: {
                                                                 display: false
                                                             }
                                                         },
                                                         y: {
                                                             grid: { display: false },
                                                             ticks: {
                                                                 color: isDarkMode ? '#cbd5e1' : '#1e293b',
                                                                 font: {
                                                                     family: 'Outfit',
                                                                     size: 14,
                                                                     weight: '800'
                                                                 }
                                                             }
                                                         }
                                                     }
                                                 };

                                                 return (
                                                     <div className="d-flex flex-column justify-content-between h-100 w-100 gap-3">
                                                         {/* Dynamic Condition Box */}
                                                         <div className="p-4 rounded-4 text-center border" 
                                                              style={{ 
                                                                  background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)', 
                                                                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                                                                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)'
                                                              }}>
                                                             <h4 className="fw-black mb-0 d-flex align-items-center justify-content-center gap-2 flex-wrap" style={{ color: isDarkMode ? '#cbd5e1' : '#1e293b', fontSize: '1.05rem' }}>
                                                                 <span>Condition:</span>
                                                                 <span className="px-4 py-2 shadow-sm fw-black text-uppercase" style={{ ...getConditionStyle(prediction.condition_tomorrow, isDarkMode), fontSize: '0.85rem', letterSpacing: '0.5px' }}>{prediction.condition_tomorrow || 'Cloudy'}</span>
                                                             </h4>
                                                         </div>
                                                         
                                                         {/* Horizontal Bar Graph (No X-Axis Numbers) */}
                                                         <div className="w-100 mb-2 mt-1" style={{ height: '135px', position: 'relative' }}>
                                                             <Chart 
                                                                 type="bar" 
                                                                 data={projectionData} 
                                                                 options={projectionOptions} 
                                                             />
                                                         </div>

                                                         <div 
                                                             className="p-3.5 rounded-4 d-flex align-items-center gap-3 shadow-sm border" 
                                                             style={{ 
                                                                 background: isDarkMode ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.05) 100%)' : 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, rgba(99, 102, 241, 0.06) 100%)', 
                                                                 borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(37, 99, 235, 0.12)',
                                                                 boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)'
                                                             }}
                                                         >
                                                             <div className="d-flex align-items-center justify-content-center rounded-circle shadow-sm" style={{ width: '46px', height: '46px', minWidth: '46px', background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(37, 99, 235, 0.08)' }}>
                                                                 <span className="fs-3">💡</span>
                                                             </div>
                                                             <div>
                                                                 <div className="fw-black text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '1px', marginBottom: '2px', color: isDarkMode ? '#60a5fa' : '#2563eb' }}>AI recommendation</div>
                                                                 <span style={{ color: isDarkMode ? '#cbd5e1' : '#1e3a8a', fontSize: '0.94rem', fontWeight: '800' }}>{prediction.suggestion || 'Light rain likely. Keep a raincoat handy.'}</span>
                                                             </div>
                                                         </div>
                                                         <div>
                                                             <DownloadReportButton weatherData={currentWeather} predictionData={prediction} hourlyData={hourlyData} locationName={currentWeather?.city} />
                                                         </div>
                                                     </div>
                                                 );
                                             })()}
                                         </div>
                                     </div>
                                </div>
                            </div>

                              {(() => {
                                  const cardTheme = getHourlyCardTheme(currentWeather, isDarkMode);
                                  return (
                                      <div className="glass-panel p-5 flex-grow-1 d-flex flex-column" style={{ 
                                          background: cardTheme.background,
                                          backdropFilter: cardTheme.backdropFilter || 'blur(16px)',
                                          WebkitBackdropFilter: cardTheme.backdropFilter || 'blur(16px)',
                                          borderRadius: '32px',
                                          border: cardTheme.border,
                                          color: isDarkMode ? '#cbd5e1' : cardTheme.textColor || 'var(--text-main-weather)',
                                          boxShadow: cardTheme.boxShadow,
                                          transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                      }}>
                                          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                                              <h2 className="mb-0 fw-black text-truncate" style={{ maxWidth: '70%', fontSize: '1.6rem', color: isDarkMode ? '#cbd5e1' : cardTheme.textColor }}>{currentWeather?.city}</h2>
                                              <div className="d-flex align-items-center gap-3">
                                                  <span 
                                                       className="px-4 py-2.5 fw-black text-uppercase shadow-sm text-white animate-pulse d-flex align-items-center gap-2.5" 
                                                       style={{ 
                                                           background: '#dc2626', 
                                                           letterSpacing: '0.8px', 
                                                           fontSize: '0.92rem', 
                                                           borderRadius: '8px', 
                                                           boxShadow: '0 4px 15px rgba(220, 38, 38, 0.35)' 
                                                       }}
                                                   >
                                                       <span>📍 LIVE</span>
                                                       <span style={{ opacity: 0.65, fontWeight: '300' }}>|</span>
                                                       <span>{currentWeather.condition} • {currentWeather.temperature}°C</span>
                                                   </span>
                                                  
                                              </div>
                                          </div>
                                           <div className="p-4 rounded-4 shadow-sm flex-grow-1" style={{ 
                                               minHeight: '400px', 
                                               background: isDarkMode ? 'rgba(6, 10, 23, 0.6)' : 'rgba(255, 255, 255, 0.55)', 
                                               backdropFilter: 'blur(16px)',
                                               WebkitBackdropFilter: 'blur(16px)',
                                               border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.25)' 
                                           }}>
                                              <HourlyForecast data={getFilteredHourlyData()} themeColor={isDarkMode ? '#cbd5e1' : cardTheme.textColor} currentWeather={currentWeather} />
                                          </div>
                                      </div>
                                  );
                              })()}
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
                .custom-range {
                    -webkit-appearance: none;
                    background: transparent;
                    width: 100%;
                }
                .custom-range::-webkit-slider-runnable-track { 
                    background: var(--track-gradient); 
                    height: 8px; 
                    border-radius: 4px; 
                }
                .custom-range::-webkit-slider-thumb { 
                    background: var(--thumb-color); 
                    border: 2.5px solid #ffffff; 
                    width: 18px; 
                    height: 18px; 
                    margin-top: -5px; 
                    -webkit-appearance: none; 
                    border-radius: 50%; 
                    box-shadow: 0 0 10px var(--thumb-color);
                    cursor: pointer;
                    transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .custom-range::-webkit-slider-thumb:hover {
                    transform: scale(1.25);
                }
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
