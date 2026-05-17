import React from 'react';

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

                    return (
                        <div key={day} className="d-flex align-items-center mb-3 p-3 rounded-4 shadow-sm" style={{ 
                            background: 'var(--glass-bg-weather)',
                            border: '1px solid var(--glass-border-weather)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                        }}>
                            <div style={{ width: '75px' }}>
                                <span className="fw-black" style={{ fontSize: '1.05rem', color: 'var(--text-main-weather)' }}>
                                    {index === 0 ? 'Today' : getDayName(day)}
                                </span>
                            </div>

                            <div className="text-center" style={{ width: '55px' }}>
                                <span className="fs-2">{getIcon(codes[index])}</span>
                            </div>

                            <div className="flex-grow-1 mx-3 d-flex align-items-center gap-3">
                                <span className="fw-black opacity-75" style={{ fontSize: '1rem', width: '35px', color: 'var(--text-main-weather)' }}>{min}°</span>
                                <div className="flex-grow-1 position-relative rounded-pill" style={{ height: '12px', background: 'rgba(255, 255, 255, 0.1)' }}>
                                    <div
                                        className="position-absolute rounded-pill"
                                        style={{
                                            left: `${leftPos}%`,
                                            width: `${width}%`,
                                            top: 0,
                                            bottom: 0,
                                            background: 'linear-gradient(90deg, #f97316 0%, #fbbf24 35%, #22c55e 65%, #3b82f6 100%)'
                                        }}
                                    />
                                </div>
                                <span className="fw-black" style={{ fontSize: '1.1rem', width: '35px', color: 'var(--text-main-weather)' }}>{max}°</span>
                            </div>
                        </div>
                    );
                })}
            </div>

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
