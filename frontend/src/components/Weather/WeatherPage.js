import React from 'react';
import { FaGlobeAmericas, FaSatelliteDish } from 'react-icons/fa';

const WeatherPage = () => {
    return (
        <div style={{
            position: 'fixed',
            top: '60px', /* Matches navbar height */
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: 'calc(100vh - 60px)',
            overflow: 'hidden',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            background: '#1a1a2e' // Dark background for the frame to match weather app dark mode if applicable
        }}>
            <style>
                {`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .marquee-container {
                    overflow: hidden;
                    white-space: nowrap;
                    position: relative;
                }
                .marquee-content {
                    display: inline-block;
                    animation: marquee 25s linear infinite;
                    padding-left: 100%; /* Start off-screen */
                }
                .live-indicator {
                    width: 8px;
                    height: 8px;
                    background-color: #ef4444;
                    border-radius: 50%;
                    display: inline-block;
                    margin-right: 6px;
                    animation: blink 1.5s infinite;
                }
                @keyframes blink {
                    0% { opacity: 1; }
                    50% { opacity: 0.4; }
                    100% { opacity: 1; }
                }
                `}
            </style>

            {/* Main Header Bar */}
            <div
                className="d-flex align-items-center justify-content-between px-4 py-2"
                style={{
                    background: 'linear-gradient(90deg, #ea580c 0%, #c2410c 100%)', // Slightly darker orange for header
                    color: 'white',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    zIndex: 20
                }}
            >
                {/* Left: Brand */}
                <div className="d-flex align-items-center gap-2">
                    <div className="bg-white bg-opacity-25 p-2 rounded-circle d-flex align-items-center justify-content-center">
                        <FaGlobeAmericas size={18} className="text-white" />
                    </div>
                    <div>
                        <div className="fw-bold text-uppercase" style={{ letterSpacing: '1px', fontSize: '0.9rem' }}>RoamIQ Weather</div>
                        <div className="x-small opacity-75" style={{ fontSize: '0.65rem' }}>GLOBAL MONITORING SYSTEM</div>
                    </div>
                </div>

                {/* Right: Meta Info */}
                <div className="d-flex align-items-center gap-4 d-none d-md-flex">
                    <div className="d-flex align-items-center gap-2 bg-black bg-opacity-20 px-3 py-1 rounded-pill">
                        <FaSatelliteDish size={12} className="opacity-75" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>SAT-1 COMMS: ACTIVE</span>
                    </div>
                </div>
            </div>

            {/* Scrolling Marquee Bar */}
            <div
                style={{
                    background: '#2d1b0e', 
                    color: '#fb923c', 
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    padding: '6px 0',
                    borderBottom: '1px solid rgba(249, 115, 22, 0.3)',
                    zIndex: 15
                }}
                className="d-flex align-items-center"
            >
                <div className="px-3 d-flex align-items-center border-end border-white border-opacity-10 bg-dark-orange" style={{ minWidth: 'fit-content', zIndex: 2 }}>
                    <span className="live-indicator"></span>
                    <span>LIVE ALERTS</span>
                </div>
                <div className="marquee-container flex-grow-1">
                    <div className="marquee-content">
                        <span className="mx-4">⚠️ SEVERE WEATHER ALERT: Heavy rainfall expected in Southeast Asia over the next 48 hours.</span>
                        <span className="mx-4">🌡️ THERMAL UPDATE: Heatwave conditions persisting across Southern Europe.</span>
                        <span className="mx-4">✈️ TRAVEL ADVISORY: Flight delays reported in Northeast US.</span>
                        <span className="mx-4">☀️ FORECAST: Perfect travel conditions predicted for Mediterranean coasts.</span>
                    </div>
                </div>
            </div>

            {/* Service Status Bar */}
            <div className="bg-black bg-opacity-40 px-4 py-1 d-flex gap-4 border-bottom border-white border-opacity-5">
                <div className="d-flex align-items-center gap-2">
                    <div className="bg-success rounded-circle" style={{ width: '6px', height: '6px' }}></div>
                    <span className="x-small text-white opacity-50 fw-bold">DATA STREAM: ACTIVE</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <div className="bg-success rounded-circle" style={{ width: '6px', height: '6px' }}></div>
                    <span className="x-small text-white opacity-50 fw-bold">REFRESH RATE: 1.2s</span>
                </div>
                <div className="ms-auto d-none d-lg-block">
                    <span className="x-small text-white opacity-25 fw-bold">COORD SYSTEM: WGS84</span>
                </div>
            </div>

            {/* Iframe Container */}
            <div style={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden' }}>
                <iframe
                    src="https://weather-prediction-nu-nine.vercel.app/"
                    title="Weather Prediction"
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        position: 'absolute',
                        top: 0,
                        left: 0
                    }}
                    allow="geolocation"
                />
            </div>
        </div>
    );
};

export default WeatherPage;
