import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FaMapMarkerAlt, FaSync } from 'react-icons/fa';
import { Button } from 'react-bootstrap';

const LocationTracker = ({ onUpdate, hideText = false }) => {
    const [location, setLocation] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState(null);

    const updateLocation = useCallback(async (lat, lng) => {
        setIsUpdating(true);
        try {
            // Reverse geocode to get street name/address
            let address = 'Unknown Location';
            try {
                const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
                address = geoRes.data.display_name;
            } catch (err) {
                console.warn('Reverse geocoding failed', err);
            }

            await axios.post('/api/travel/user/location', { lat, lng, address });

            const newLoc = { lat, lng, address };
            setLocation(newLoc);
            if (onUpdate) onUpdate(newLoc);
            setError(null);
        } catch (err) {
            console.error('Failed to update location', err);
            const errorMsg = err.response?.data?.error || err.message;
            setError(`Sync error: ${errorMsg}`);
        } finally {
            setIsUpdating(false);
        }
    }, [onUpdate]);

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError("Geolocation not supported");
            return;
        }

        setIsUpdating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                updateLocation(latitude, longitude);
            },
            (err) => {
                let msg = "Location lookup failed";
                if (err.code === 1) msg = "Location access denied";
                if (err.code === 2) msg = "Location signal lost";
                if (err.code === 3) msg = "Location request timed out";

                setError(msg);
                setIsUpdating(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
    }, [updateLocation]);

    useEffect(() => {
        requestLocation();
        const intervalId = setInterval(requestLocation, 600000); // 10 mins
        return () => clearInterval(intervalId);
    }, [requestLocation]);

    return (
        <div className="location-tracker-status d-flex align-items-center small text-muted">
            <div className="d-flex align-items-center bg-light bg-opacity-50 px-3 py-1 rounded-pill border">
                <FaMapMarkerAlt className={`me-2 ${location ? 'text-success' : 'text-warning'}`} size={12} />
                {isUpdating ? (
                    <span className="x-small fw-bold">Locating...</span>
                ) : !hideText && location ? (
                    <span className="text-truncate x-small fw-bold text-dark" style={{ maxWidth: '150px' }}>
                        {location.address || `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`}
                    </span>
                ) : !hideText && error ? (
                    <span className="text-danger x-small fw-bold">{error}</span>
                ) : !hideText ? (
                    <span className="x-small fw-bold">Live Tracking</span>
                ) : null}

                <Button
                    variant="link"
                    size="sm"
                    className="ms-1 p-0 text-muted lh-1"
                    onClick={requestLocation}
                    disabled={isUpdating}
                    style={{ fontSize: '10px' }}
                >
                    <FaSync className={isUpdating ? 'spin' : ''} />
                </Button>
            </div>
        </div>
    );
};

export default LocationTracker;
