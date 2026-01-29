import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaMapMarkerAlt, FaSync } from 'react-icons/fa';
import { Button, Spinner } from 'react-bootstrap';

const LocationTracker = () => {
    const [location, setLocation] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState(null);

    const updateLocation = useCallback(async (lat, lng) => {
        setIsUpdating(true);
        try {
            await axios.post('/api/travel/user/location', { lat, lng }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setLocation({ lat, lng });
            setError(null);
        } catch (err) {
            console.error('Failed to update location', err);
            const errorMsg = err.response?.data?.error || err.message;
            setError(`Server error: ${errorMsg}`);
            toast.error(`Location update failed: ${errorMsg}`);
        } finally {
            setIsUpdating(false);
        }
    }, []);

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            return;
        }

        setIsUpdating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                updateLocation(latitude, longitude);
            },
            (err) => {
                let msg = "Location permission denied or timed out";
                if (err.code === 1) msg = "Please enable location permissions in your browser";
                if (err.code === 2) msg = "Location unavailable";
                if (err.code === 3) msg = "Location request timed out";

                setError(msg);
                setIsUpdating(false);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    }, [updateLocation]);

    useEffect(() => {
        // Initial request
        requestLocation();

        // Auto-update every 10 minutes if supported
        const intervalId = setInterval(requestLocation, 600000);
        return () => clearInterval(intervalId);
    }, [requestLocation]);

    return (
        <div className="location-tracker-status d-flex align-items-center small text-muted">
            <FaMapMarkerAlt className={`me-2 ${location ? 'text-success' : 'text-danger'}`} />
            {isUpdating ? (
                <span><Spinner size="sm" animation="border" className="me-1" /> Updating...</span>
            ) : location ? (
                <span>Location Active</span>
            ) : error ? (
                <span className="text-danger">Location error: {error}</span>
            ) : (
                <span>Location Off</span>
            )}
            <Button
                variant="link"
                size="sm"
                className="ms-2 p-0 text-muted"
                onClick={requestLocation}
                disabled={isUpdating}
            >
                <FaSync className={isUpdating ? 'spin' : ''} />
            </Button>
        </div>
    );
};

export default LocationTracker;
