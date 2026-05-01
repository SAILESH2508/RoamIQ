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
        <Card className="border-0 overflow-hidden h-100 shadow-sm" style={{ background: 'linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)', color: 'white', borderRadius: '24px' }}>
            <Card.Body className="p-4 d-flex flex-column justify-content-center">
                {loading || !weather ? (
                    <div className="text-center py-4">
                        <Spinner animation="border" size="sm" variant="light" className="mb-2" />
                        <p className="small mb-0 opacity-75">Checking forecast...</p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-white"
                    >
                        <div className="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h5 className="fw-bold mb-0 text-truncate" style={{ maxWidth: '180px' }}>{destination}</h5>
                                <div className="small opacity-75">{weather.condition}</div>
                            </div>
                            <FaCloudSun size={28} className="opacity-75" />
                        </div>

                        <div className="text-center my-2">
                            <h1 className="fw-bold mb-0 display-4">{weather.temp}°C</h1>
                            <div className="small opacity-75">
                                H: {weather.high}° L: {weather.low}°
                            </div>
                        </div>

                        <div className="d-flex justify-content-around mt-4 pt-3 border-top border-white border-opacity-25">
                            <div className="text-center">
                                <FaThermometerHalf className="mb-1 opacity-75" />
                                <div className="small fw-bold">{weather.temp}°</div>
                            </div>
                            <div className="text-center">
                                <FaTint className="mb-1 opacity-75" />
                                <div className="small fw-bold">{weather.humidity}%</div>
                            </div>
                            <div className="text-center">
                                <FaWind className="mb-1 opacity-75" />
                                <div className="small fw-bold">{weather.wind} km/h</div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </Card.Body>
        </Card>
    );
};

export default WeatherWidget;
