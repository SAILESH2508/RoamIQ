import React from 'react';

/**
 * AstroWidget — displays sunrise, sunset, and UV index.
 *
 * Accepts two prop shapes:
 *   1. { data }  — raw Open-Meteo response with data.daily.sunrise / data.daily.sunset
 *   2. currentWeather object passed directly from WeatherPage (has no .daily sub-key)
 *
 * WeatherPage passes the `currentWeather` state object directly as `data`, so we
 * read from the top-level `daily` key that the backend attaches to the response.
 * The component is also used via <AstroWidget data={currentWeather} /> where
 * currentWeather itself may carry a `daily` property from the API response stored
 * in WeatherPage state.
 */
const AstroWidget = ({ data }) => {
    // Support both shapes: data.daily (raw API) or data itself being the daily object
    const daily = data?.daily || null;

    if (!daily || !daily.sunrise || !daily.sunrise.length) return null;

    const sunrise = new Date(daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sunset = new Date(daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const uvIndex = daily.uv_index_max ? daily.uv_index_max[0] : 0;

    let uvLevel = 'Low';
    let uvColor = 'text-success';
    if (uvIndex > 2) { uvLevel = 'Moderate'; uvColor = 'text-warning'; }
    if (uvIndex > 5) { uvLevel = 'High'; uvColor = 'text-danger'; }
    if (uvIndex > 7) { uvLevel = 'Very High'; uvColor = 'text-danger fw-bold'; }
    if (uvIndex > 10) { uvLevel = 'Extreme'; uvColor = 'text-danger fw-black'; }

    return (
        <div className="glass-panel p-3 shadow-sm" style={{ 
            background: 'var(--glass-bg-weather)',
            borderRadius: '24px',
            border: '1px solid var(--glass-border-weather)',
            color: 'var(--text-main-weather)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)'
        }}>
            <h6 className="mb-3 fw-black d-flex align-items-center gap-2" style={{ fontSize: '0.75rem' }}>
                <span className="fs-5">🌞</span> Daily Details
            </h6>

            <div className="d-flex justify-content-between align-items-center text-center gap-2">
                <div className="flex-grow-1">
                    <div className="fs-6 mb-1">🌅</div>
                    <div className="fw-black text-primary mb-1 text-uppercase" style={{ fontSize: '0.55rem', letterSpacing: '1px' }}>SUNRISE</div>
                    <div className="fw-black" style={{ fontSize: '0.85rem', color: 'var(--text-main-weather)' }}>{sunrise}</div>
                </div>

                <div className="flex-grow-1 border-start border-end border-light px-2" style={{ borderColor: 'var(--glass-border-weather) !important' }}>
                    <div className="bg-primary-gradient text-white rounded-circle mx-auto d-flex align-items-center justify-content-center mb-1 shadow-sm" style={{ width: '30px', height: '30px' }}>
                        <span className="fs-6">🛡️</span>
                    </div>
                    <div className="fw-black text-primary text-uppercase mb-1" style={{ fontSize: '0.55rem', letterSpacing: '1px' }}>UV INDEX</div>
                    <div className="d-flex flex-column align-items-center">
                        <span className="fw-black fs-5 mb-0" style={{ color: 'var(--text-main-weather)' }}>{uvIndex}</span>
                        <span className={`fw-black ${uvColor} x-small text-uppercase`} style={{ fontSize: '0.6rem' }}>{uvLevel}</span>
                    </div>
                </div>

                <div className="flex-grow-1">
                    <div className="fs-6 mb-1">🌇</div>
                    <div className="fw-black text-primary mb-1 text-uppercase" style={{ fontSize: '0.55rem', letterSpacing: '1px' }}>SUNSET</div>
                    <div className="fw-black" style={{ fontSize: '0.85rem', color: 'var(--text-main-weather)' }}>{sunset}</div>
                </div>
            </div>
        </div>
    );
};

export default AstroWidget;
