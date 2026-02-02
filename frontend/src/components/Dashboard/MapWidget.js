import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Webpack/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map centering and rendering stability
const ChangeView = ({ center, zoom }) => {
    const map = useMap();
    React.useEffect(() => {
        map.setView(center, zoom);
        // Force map to recalculate size - fixes partial rendering issues
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }, [center, zoom, map]);
    return null;
};

const MapWidget = ({ trips = [], userLocation = null }) => {
    const defaultCenter = [20, 0]; // World center
    const defaultZoom = 2;

    const center = React.useMemo(() =>
        userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter,
        [userLocation]);

    const zoom = userLocation ? 16 : defaultZoom;

    return (
        <div className="map-widget-container glass-panel overflow-hidden" style={{ height: '400px', width: '100%', position: 'relative', zIndex: 1 }}>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <ChangeView center={center} zoom={zoom} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]}>
                        <Popup>
                            <div className="text-center">
                                <strong>You are here</strong><br />
                                <small className="text-muted">{userLocation.address}</small>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {trips.map((trip) => {
                    // This is a placeholder since trips might not have lat/lng yet
                    // In a real app, we would geocode the destination
                    if (trip.lat && trip.lng) {
                        return (
                            <Marker key={trip.id} position={[trip.lat, trip.lng]}>
                                <Popup>
                                    <div className="text-center">
                                        <strong>{trip.title}</strong><br />
                                        {trip.destination}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    }
                    return null;
                })}
            </MapContainer>
        </div>
    );
};

export default MapWidget;
