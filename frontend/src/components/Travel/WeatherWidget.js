import React, { useState, useEffect } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { FaCloudSun, FaThermometerHalf, FaWind, FaTint } from 'react-icons/fa';
import { motion } from 'framer-motion';

const WeatherWidget = ({ destination }) => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!destination) return;

        // Mocking weather fetch
        const fetchWeather = async () => {
            setLoading(true);
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Mock data generator based on destination name (simple hash)
            const hash = destination.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const temp = 15 + (hash % 20);
            const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Clear Sky'][hash % 4];

            setWeather({
                temp: temp,
                condition: conditions,
                humidity: 40 + (hash % 30),
                wind: 5 + (hash % 15),
                high: temp + 3,
                low: temp - 4
            });
            setLoading(false);
        };

        fetchWeather();
    }, [destination]);

    if (!destination) return null;

    return (
        <Card className="glass-card border-0 overflow-hidden h-100" style={{ background: 'linear-gradient(135deg, #FF9D6C 0%, #BB4E75 100%)', color: 'white' }}>
            <Card.Body className="p-4 d-flex flex-column justify-content-between">
                {loading ? (
                    <div className="text-center py-4">
                        <Spinner animation="border" size="sm" variant="light" />
                        <p className="small mt-2">Checking skies in {destination}...</p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h5 className="fw-bold mb-0">{destination}</h5>
                                <span className="small opacity-75">{weather.condition}</span>
                            </div>
                            <FaCloudSun size={32} />
                        </div>

                        <div className="text-center my-3">
                            <h1 className="display-4 fw-bold mb-0">{weather.temp}°C</h1>
                            <div className="small opacity-75">
                                H: {weather.high}° L: {weather.low}°
                            </div>
                        </div>

                        <div className="d-flex justify-content-between mt-4 bg-white bg-opacity-20 rounded-4 p-3">
                            <div className="text-center">
                                <FaThermometerHalf className="mb-1 opacity-75" />
                                <div className="small fw-bold">{weather.temp}°</div>
                                <div className="x-small opacity-75" style={{ fontSize: '0.65rem' }}>Feels like</div>
                            </div>
                            <div className="text-center">
                                <FaTint className="mb-1 opacity-75" />
                                <div className="small fw-bold">{weather.humidity}%</div>
                                <div className="x-small opacity-75" style={{ fontSize: '0.65rem' }}>Humidity</div>
                            </div>
                            <div className="text-center">
                                <FaWind className="mb-1 opacity-75" />
                                <div className="small fw-bold">{weather.wind} km/h</div>
                                <div className="x-small opacity-75" style={{ fontSize: '0.65rem' }}>Wind</div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </Card.Body>
        </Card>
    );
};

export default WeatherWidget;
