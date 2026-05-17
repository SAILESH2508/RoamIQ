import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { FaMapMarkerAlt, FaSync } from 'react-icons/fa';
import { Button } from 'react-bootstrap';

const LocationTracker = ({ onUpdate, hideText = false }) => {
    const [location, setLocation] = useState(() => {
        const cached = localStorage.getItem('roamiq-user-location');
        return cached ? JSON.parse(cached) : { lat: 11.0168, lng: 76.9558, address: 'Coimbatore, Tamil Nadu, India' };
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState(null);

    const updateLocation = useCallback(async (lat, lng) => {
        setIsUpdating(true);
        try {
            // Reverse geocode via the backend proxy (avoids CORS and uses auth token)
            let address = 'Unknown Location';
            try {
                const geoRes = await api.get(
                    `/api/travel/reverse?lat=${lat}&lon=${lng}`
                );
                address = geoRes.data.display_name || address;
            } catch (err) {
                console.warn('Reverse geocoding failed', err);
            }

            try {
                await api.post('/api/travel/user/location', { lat, lng, address });
            } catch (e) {
                console.warn('Backend user location update failed', e);
            }

            const newLoc = { lat, lng, address };
            setLocation(newLoc);
            localStorage.setItem('roamiq-user-location', JSON.stringify(newLoc));
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
            console.warn("Geolocation not supported. Using Coimbatore default.");
            setError("GPS Unavail.");
            updateLocation(11.0168, 76.9558);
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
                if (err.code === 1) msg = "GPS Denied";
                if (err.code === 2) msg = "Signal lost";
                if (err.code === 3) msg = "Request timed out";

                console.warn("Location error:", msg, "- falling back to Coimbatore.");
                setError(msg);
                setIsUpdating(false);
                
                // Fail-safe: Always fall back to Coimbatore default so the whole application remains functional
                updateLocation(11.0168, 76.9558);
            },
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 }
        );
    }, [updateLocation]);

    useEffect(() => {
        // Do NOT automatically call requestLocation() on mount!
        // This avoids annoying location tracking prompts on reload and page changes.
    }, []);

    return (
        <div className="location-tracker-status d-flex align-items-center w-100">
            <div className="d-flex align-items-center w-100 justify-content-between bg-transparent px-3 py-2">
                <div className="d-flex align-items-center gap-2">
                    <FaMapMarkerAlt className={`text-primary`} size={14} />
                    {isUpdating ? (
                        <span className="small fw-bold text-primary">Locating...</span>
                    ) : !hideText && location ? (
                        <span className="text-truncate small fw-bold text-dark" style={{ maxWidth: '150px' }}>
                            {location.address || `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`}
                        </span>
                ) : !hideText && error ? (
                    <span className="text-muted x-small fw-bold">{error === 'Location access denied' ? 'Tracking Off' : 'GPS Idle'}</span>
                ) : !hideText ? (
                    <span className="x-small fw-bold">Live Tracking</span>
                ) : null}
                </div>

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
