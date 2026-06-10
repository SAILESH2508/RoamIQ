import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';

const Sidebar = ({ selectedDate, onDateChange, weatherData, isLoadingData, isDarkMode, onToggleTheme, onRecheckLocation, onBackToCurrent, searchHistory = [], onDeleteHistoryItem, onClearHistory }) => {
    const navigate = useNavigate();
    const debounceTimeoutRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Fallback if weatherData isn't loaded yet
    const currentWeather = weatherData || { 
        temperature: 0, 
        condition: 'Clear Sky', 
        city: 'Loading...',
        wind_speed: 0,
        humidity: 0,
        code: 0,
        is_day: 1
    };
    
    const isLoading = isLoadingData || !weatherData;

    useEffect(() => {
        const currentDebounceTimeout = debounceTimeoutRef.current;
        return () => {
            if (currentDebounceTimeout) clearTimeout(currentDebounceTimeout);
        };
    }, []);

    const getWeatherIcon = (c) => {
        if (!c) return '🌤️';
        const condition = c.toLowerCase();
        if (condition.includes('rain')) return '🌧️';
        if (condition.includes('sunny') || condition.includes('clear')) return '☀️';
        if (condition.includes('cloud')) return '☁️';
        if (condition.includes('storm')) return '⛈️';
        if (condition.includes('snow')) return '❄️';
        return '🌤️';
    };

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

        if (query.length > 2) {
            setIsSearching(true);
            debounceTimeoutRef.current = setTimeout(async () => {
                try {
                    const response = await axios.get(`/api/travel/search?q=${encodeURIComponent(query)}`);
                    setSearchResults(response.data || []);
                } catch {
                    console.error("Search failed");
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            }, 500);
        } else {
            setSearchResults([]);
        }
    };

    const handleCitySelect = (city) => {
        setSearchQuery("");
        navigate(`/weather?lat=${city.latitude}&lon=${city.longitude}&city=${encodeURIComponent(city.name)}`);
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            <button 
                className="btn btn-primary d-lg-none position-fixed shadow-lg rounded-circle p-0 d-flex align-items-center justify-content-center"
                style={{ 
                    bottom: '20px', 
                    right: '20px', 
                    width: '56px', 
                    height: '56px', 
                    zIndex: 2000,
                    background: 'var(--primary-gradient)',
                    border: 'none'
                }}
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                <span className="fs-4">{isMobileOpen ? '✕' : '🌡️'}</span>
            </button>

            {isMobileOpen && (
                <div 
                    className="position-fixed top-0 start-0 w-100 h-100 d-lg-none" 
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1400 }}
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <div className={`sidebar-container d-flex flex-column custom-scrollbar ${isMobileOpen ? 'mobile-open' : ''}`}
                 style={{ 
                     width: '240px', 
                     background: 'var(--sidebar-bg)', 
                     backdropFilter: 'blur(20px) saturate(180%)',
                     WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                     color: 'var(--text-main-weather)',
                     position: 'fixed',
                     left: 0, 
                     top: '60px', 
                     bottom: 0,
                     height: 'calc(100vh - 60px)',
                     zIndex: 1500,
                     transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                     padding: '24px 20px',
                     borderRight: '1px solid var(--glass-border-weather)',
                     boxShadow: '4px 0 24px rgba(0, 0, 0, 0.02)',
                     overflowY: 'auto'
                 }}>
            
            <div className="d-flex flex-column align-items-center mb-4">


                <div className="mb-1" style={{ fontSize: '2.5rem' }}>
                    {isLoading ? '⏳' : getWeatherIcon(currentWeather.condition)}
                </div>
                <h1 className="m-0 fw-black text-center" style={{ fontSize: '3.2rem', lineHeight: 1, color: 'var(--text-main-weather)' }}>
                    {isLoading ? '..' : currentWeather.temperature}°
                </h1>
                <div className="mt-2 text-center">
                    <span className="badge rounded-pill bg-primary bg-opacity-10 text-primary px-3 py-1 text-uppercase" style={{ fontSize: '0.7rem', fontWeight: '800' }}>
                        {currentWeather.condition}
                    </span>
                </div>
                
                <div className="mt-4 w-100 d-flex flex-column gap-2">
                    <div className="d-flex align-items-center justify-content-center gap-2 py-2 px-3 rounded-4 border shadow-sm text-center" style={{ background: 'var(--glass-bg-weather)', borderColor: 'var(--glass-border-weather)' }}>
                        <span className="small">📍</span>
                        <span className="fw-bold small text-truncate" style={{ maxWidth: '160px', color: 'var(--text-main-weather)' }}>{currentWeather.city}</span>
                    </div>
                    {onRecheckLocation && (
                        <button 
                            onClick={onRecheckLocation}
                            className="btn btn-outline-primary w-100 rounded-4 py-2 fw-black text-uppercase shadow-sm hover-lift transition-all"
                            style={{ 
                                fontSize: '0.65rem', 
                                letterSpacing: '0.5px',
                                border: '1px solid var(--glass-border-weather)',
                                color: 'var(--text-main-weather)',
                                background: 'var(--glass-bg-weather)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>📡</span> Recheck Location
                        </button>
                    )}
                    {onBackToCurrent && (
                        <button 
                            onClick={onBackToCurrent}
                            className="btn btn-outline-secondary w-100 rounded-4 py-2 fw-black text-uppercase shadow-sm hover-lift transition-all mt-2"
                            style={{ 
                                fontSize: '0.65rem', 
                                letterSpacing: '0.5px',
                                border: '1px solid var(--glass-border-weather)',
                                color: 'var(--text-main-weather)',
                                background: 'var(--glass-bg-weather)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>🏠</span> Back to Current
                        </button>
                    )}
                </div>

                <div className="d-flex justify-content-center gap-4 mt-4 w-100 px-2">
                    <div className="text-center">
                        <div className="text-uppercase fw-bold text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>Wind</div>
                        <div className="fw-black" style={{ color: '#ff6b00', fontSize: '0.9rem' }}>{currentWeather.wind_speed} k/h</div>
                    </div>
                    <div className="text-center">
                        <div className="text-uppercase fw-bold text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>Humidity</div>
                        <div className="fw-black" style={{ color: '#ff6b00', fontSize: '0.9rem' }}>{currentWeather.humidity}%</div>
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <div className="p-3 rounded-4 border-0 shadow-sm mb-3" style={{ background: 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                    <div className="d-flex flex-column">
                        <span className="x-small fw-black text-muted text-uppercase mb-1" style={{ letterSpacing: '1px', fontSize: '0.65rem' }}>📅 Check Date</span>
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => onDateChange && onDateChange(e.target.value)}
                            className="border-0 fw-black p-0 bg-transparent" 
                            style={{ outline: 'none', fontSize: '1rem', cursor: 'pointer', color: 'var(--text-main-weather)' }}
                        />
                    </div>
                </div>

                <div className="input-group rounded-4 border-0 overflow-hidden shadow-sm mb-3" style={{ background: 'var(--glass-bg-weather)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                    <span className="input-group-text bg-transparent border-0 pe-0">
                        <span className="opacity-50">🔍</span>
                    </span>
                    <input type="text" className="form-control bg-transparent border-0 py-2" placeholder="Search City..." value={searchQuery} onChange={handleSearch} style={{ fontSize: '0.85rem', boxShadow: 'none', fontWeight: '600', color: 'var(--text-main-weather)' }} />
                </div>

                {searchHistory && searchHistory.length > 0 && (
                    <div className="recent-searches-container mt-3">
                        <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                            <span className="x-small fw-black text-muted text-uppercase" style={{ letterSpacing: '1px', fontSize: '0.65rem', color: 'var(--text-main-weather)', opacity: 0.7 }}>🕒 Recent Searches</span>
                            <button 
                                className="btn btn-link p-0 text-muted x-small fw-bold text-decoration-none" 
                                style={{ fontSize: '0.65rem', color: 'var(--text-main-weather)', opacity: 0.6 }} 
                                onClick={onClearHistory}
                            >
                                Clear All
                            </button>
                        </div>
                        <div className="d-flex flex-column gap-1.5 custom-scrollbar" style={{ maxHeight: '130px', overflowY: 'auto' }}>
                            {searchHistory.map((item) => (
                                <div 
                                    key={item.id} 
                                    className="d-flex justify-content-between align-items-center py-1.5 px-3 rounded-4 transition-all hover-lift shadow-sm mb-1"
                                    style={{ 
                                        background: 'var(--glass-bg-weather)', 
                                        border: '1px solid var(--glass-border-weather)', 
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        color: 'var(--text-main-weather)'
                                    }}
                                >
                                    <span 
                                        className="cursor-pointer text-truncate flex-grow-1 text-start" 
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleCitySelect({ name: item.place_name, latitude: item.latitude, longitude: item.longitude })}
                                    >
                                        📍 {item.place_name}
                                    </span>
                                    <button 
                                        className="btn btn-link p-0 text-muted ms-2 border-0 hover-lift" 
                                        style={{ fontSize: '0.8rem', color: 'var(--text-main-weather)', textDecoration: 'none' }} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteHistoryItem && onDeleteHistoryItem(item.id);
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="mb-4">
                <h6 className="text-uppercase fw-bold mb-3 px-1" style={{ fontSize: '0.65rem', letterSpacing: '1.5px', color: 'var(--text-main-weather)', opacity: 0.7 }}>Command: Cities</h6>
                <div className="d-flex flex-column gap-2">
                    {searchQuery.length > 2 ? (
                        isSearching ? (
                            <div className="text-center py-3 text-muted small fw-bold">Searching...</div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map((result, idx) => (
                                <div 
                                    key={idx} 
                                    className="cursor-pointer py-2 px-3 rounded-4 transition-all d-flex flex-column shadow-sm hover-lift" 
                                    style={{ 
                                        background: 'var(--glass-bg-weather)',
                                        border: '1px solid var(--glass-border-weather)',
                                        backdropFilter: 'blur(10px)',
                                        WebkitBackdropFilter: 'blur(10px)',
                                        color: 'var(--text-main-weather)',
                                    }}
                                    onClick={() => handleCitySelect({ name: result.name || result.display_name.split(',')[0], latitude: result.lat, longitude: result.lon })}
                                >
                                    <div className="fw-black text-truncate" style={{ fontSize: '0.85rem' }}>{result.name || result.display_name.split(',')[0]}</div>
                                    <div className="text-truncate" style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-main-weather)', opacity: 0.6 }}>{result.display_name}</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-3 text-muted small fw-bold">No results found.</div>
                        )
                    ) : (
                        [
                            { name: 'COIMBATORE', country: 'INDIA', lat: 11.0168, lon: 76.9558 },
                            { name: 'NEW YORK', country: 'USA', lat: 40.71, lon: -74.00 },
                            { name: 'LONDON', country: 'UK', lat: 51.50, lon: -0.12 },
                            { name: 'TOKYO', country: 'JAPAN', lat: 35.67, lon: 139.65 }
                        ].map((city) => {
                            const isSelected = currentWeather.city && currentWeather.city.toUpperCase().includes(city.name);
                            return (
                                <div 
                                    key={city.name} 
                                    className="cursor-pointer py-2 px-3 rounded-4 transition-all d-flex flex-column shadow-sm hover-lift" 
                                    style={{ 
                                        background: isSelected ? 'var(--accent-weather, #ff6b00)' : 'var(--glass-bg-weather)',
                                        border: isSelected ? '1px solid var(--accent-weather, #ff6b00)' : '1px solid var(--glass-border-weather)',
                                        backdropFilter: isSelected ? 'none' : 'blur(10px)',
                                        WebkitBackdropFilter: isSelected ? 'none' : 'blur(10px)',
                                        color: isSelected ? 'white' : 'var(--text-main-weather)',
                                    }}
                                    onClick={() => handleCitySelect({ name: city.name, latitude: city.lat, longitude: city.lon })}
                                >
                                    <div className="fw-black" style={{ fontSize: '0.85rem' }}>{city.name}</div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: '700', color: isSelected ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-main-weather)', opacity: isSelected ? 1 : 0.6 }}>{city.country}</div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>


            <style>{`
                .sidebar-container { transform: translateX(0); }
                @media (max-width: 992px) {
                    .sidebar-container { transform: translateX(-100%); width: 85% !important; max-width: 280px; }
                    .sidebar-container.mobile-open { transform: translateX(0); }
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 107, 0, 0.25); border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 107, 0, 0.5); }
                .cursor-pointer { cursor: pointer; transition: opacity 0.2s; }
                .cursor-pointer:hover { opacity: 0.8; }
            `}</style>
        </div>
        </>
    );
};

export default Sidebar;
