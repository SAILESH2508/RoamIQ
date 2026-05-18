import React from 'react';

const getWeatherVisuals = (code) => {
    if (code === 0) { // Sunny
        return {
            gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(239, 68, 68, 0.04) 100%)',
            color: '#f59e0b',
            glowColor: 'rgba(245, 158, 11, 0.12)',
            borderColor: 'rgba(245, 158, 11, 0.18)'
        };
    } else if (code <= 3) { // Partly Cloudy
        return {
            gradient: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%)',
            color: '#0ea5e9',
            glowColor: 'rgba(14, 165, 233, 0.12)',
            borderColor: 'rgba(14, 165, 233, 0.18)'
        };
    } else if (code <= 57 || code <= 67 || code <= 82 || code <= 99) { // Rainy/Stormy
        return {
            gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)',
            color: '#3b82f6',
            glowColor: 'rgba(59, 130, 246, 0.12)',
            borderColor: 'rgba(59, 130, 246, 0.18)'
        };
    } else { // Cloudy/Foggy
        return {
            gradient: 'linear-gradient(135deg, rgba(148, 163, 184, 0.08) 0%, rgba(71, 85, 105, 0.04) 100%)',
            color: '#94a3b8',
            glowColor: 'rgba(148, 163, 184, 0.08)',
            borderColor: 'rgba(148, 163, 184, 0.15)'
        };
    }
};

const DailyForecast = ({ data, locationName }) => {
    if (!data || !data.time) return null;

    const getDayName = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    };

    const getIcon = (code) => {
        if (code === 0) return '☀️';
        if (code <= 3) return '⛅';
        if (code <= 45) return '🌫️';
        if (code <= 57) return '🌧️';
        if (code <= 67) return '🌧️';
        if (code <= 77) return '❄️';
        if (code <= 82) return '🌦️';
        if (code <= 99) return '⛈️';
        return '🌤️';
    };

    const days = data.time.slice(0, 7);
    const maxTemps = data.temperature_2m_max?.slice(0, 7) || [];
    const minTemps = data.temperature_2m_min?.slice(0, 7) || [];
    const codes = data.weather_code?.slice(0, 7) || [];

    return (
        <div className="h-100 d-flex flex-column" style={{ color: 'var(--text-main-weather)' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0 fw-black d-flex align-items-center gap-2" style={{ fontSize: '1.1rem', color: 'var(--text-main-weather)' }}>
                    <span className="fs-5">🗓️</span>
                    <span>7-Day Forecast</span>
                </h5>
                <span className="px-2 py-1 rounded small text-muted" style={{ fontSize: '0.6rem', fontWeight: '800', background: 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)', color: 'var(--text-main-weather)' }}>
                    {locationName?.split(',')[0] || 'Local'}
                </span>
            </div>

            <div className="flex-grow-1 overflow-auto custom-scrollbar pe-1">
                {days.map((day, index) => {
                    const min = Math.round(minTemps[index] || 0);
                    const max = Math.round(maxTemps[index] || 0);
                    
                    const globalMin = minTemps.length > 0 ? Math.min(...minTemps) - 2 : 0;
                    const globalMax = maxTemps.length > 0 ? Math.max(...maxTemps) + 2 : 40;
                    const range = Math.max(1, globalMax - globalMin);
                    const leftPos = ((min - globalMin) / range) * 100;
                    const width = ((max - min) / range) * 100;
                    
                    const visuals = getWeatherVisuals(codes[index]);

                    return (
                        <div 
                            key={day} 
                            className="d-flex align-items-center mb-3 p-3 rounded-4 shadow-sm daily-forecast-row-card" 
                            style={{ 
                                background: visuals.gradient,
                                border: `1px solid ${visuals.borderColor}`,
                                boxShadow: `0 4px 12px rgba(0, 0, 0, 0.02), 0 0 10px ${visuals.glowColor}`,
                                transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}
                        >
                            <div style={{ width: '75px' }}>
                                <span className="fw-black" style={{ fontSize: '1.05rem', color: 'var(--text-main-weather)' }}>
                                    {index === 0 ? 'Today' : getDayName(day)}
                                </span>
                            </div>

                            <div className="text-center" style={{ width: '55px' }}>
                                <span className="fs-2">{getIcon(codes[index])}</span>
                            </div>

                            <div className="flex-grow-1 mx-3 d-flex align-items-center gap-3">
                                <span className="fw-black" style={{ fontSize: '1rem', width: '35px', color: '#3b82f6' }}>{min}°</span>
                                <div className="flex-grow-1 position-relative rounded-pill" style={{ height: '10px', background: 'rgba(255, 255, 255, 0.12)' }}>
                                    <div
                                        className="position-absolute rounded-pill"
                                        style={{
                                            left: `${leftPos}%`,
                                            width: `${width}%`,
                                            top: 0,
                                            bottom: 0,
                                            background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 50%, #f59e0b 100%)',
                                            boxShadow: '0 0 6px rgba(245, 158, 11, 0.25)'
                                        }}
                                    />
                                </div>
                                <span className="fw-black" style={{ fontSize: '1.1rem', width: '35px', color: '#f43f5e' }}>{max}°</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <style>{`
                .daily-forecast-row-card:hover {
                    transform: translateY(-2px) scale(1.015);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04), 0 0 16px rgba(0, 0, 0, 0.06) !important;
                    filter: brightness(1.05);
                    cursor: pointer;
                }
            `}</style>

            <div className="mt-auto pt-4 border-top" style={{ borderColor: 'var(--glass-border-weather)' }}>
                <div className="text-primary fw-black text-uppercase mb-2" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Weekly Intelligence Outlook</div>
                <div className="fw-black" style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-main-weather)' }}>
                    <div className="d-flex align-items-start gap-2 mb-1">
                        <span className="text-primary">•</span>
                        <span>Expect temperature peaks between <span className="text-primary">{Math.min(...maxTemps) || 31}°C</span> and <span className="text-primary">{Math.max(...maxTemps) || 34}°C</span>.</span>
                    </div>
                    <div className="d-flex align-items-start gap-2 mb-1">
                        <span className="text-primary">•</span>
                        <span>Mostly fair conditions with scattered clouds throughout the week.</span>
                    </div>
                    <div className="d-flex align-items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>UV levels will be high; recommended to plan outdoor activities before 11 AM.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyForecast;
