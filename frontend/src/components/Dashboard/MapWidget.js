import React from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, ZoomControl, Polyline } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Button, Form, InputGroup, Badge } from 'react-bootstrap';
import { FaCrosshairs, FaSearch } from 'react-icons/fa';
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
const ChangeView = ({ center, zoom, bounds }) => {
    const map = useMap();

    React.useEffect(() => {
        if (!map) return;

        if (bounds && bounds.length > 0) {
            try {
                map.fitBounds(bounds, { padding: [50, 50] });
            } catch (e) {
                console.warn("Leaflet: fitBounds failed", e);
            }
        } else if (center) {
            map.setView(center, zoom);
        }

        // Ensure tiles load correctly and map is ready
        const timer = setTimeout(() => {
            if (map && typeof map.invalidateSize === 'function') {
                // Check if map container is still in DOM to avoid Leaflet errors
                try {
                    const container = map.getContainer();
                    if (container && (container.offsetParent !== null || document.body.contains(container))) {
                        map.invalidateSize();
                    }
                } catch (e) {
                    // Map might be unmounted or container gone
                }
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [center, zoom, bounds, map]);

    return null;
};

const defaultCenter = [20, 0]; // World center
const defaultZoom = 2;

const MapWidget = ({ trips = [], userLocation = null }) => {

    const [geocodedTrips, setGeocodedTrips] = React.useState([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchResults, setSearchResults] = React.useState(null);

    // Client-side geocoding for trips that only have a destination name
    React.useEffect(() => {
        let isMounted = true;
        const geocodeTrips = async () => {
            const results = await Promise.all(trips.map(async (trip) => {
                if (!isMounted) return null;
                if (trip.lat && trip.lng) return trip;

                try {
                    const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trip.destination)}&limit=1`, {
                        headers: { 'User-Agent': 'RoamIQ/1.0' }
                    });
                    if (isMounted && res.data && res.data[0]) {
                        return {
                            ...trip,
                            lat: parseFloat(res.data[0].lat),
                            lng: parseFloat(res.data[0].lon)
                        };
                    }
                } catch (err) {
                    if (isMounted) console.warn(`Geocoding failed for ${trip.destination}`, err);
                }
                return null;
            }));

            if (isMounted) {
                setGeocodedTrips(results.filter(t => t !== null));
            }
        };

        if (trips.length > 0) {
            geocodeTrips();
        } else {
            setGeocodedTrips([]);
        }

        return () => {
            isMounted = false;
        };
    }, [trips]);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery) return;
        try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`, {
                headers: { 'User-Agent': 'RoamIQ/1.0' }
            });
            if (res.data && res.data[0]) {
                setSearchResults({
                    lat: parseFloat(res.data[0].lat),
                    lng: parseFloat(res.data[0].lon),
                    name: res.data[0].display_name
                });
            }
        } catch (err) {
            console.error("Search failed", err);
        }
    };

    const center = React.useMemo(() => {
        if (searchResults) return [searchResults.lat, searchResults.lng];
        if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
            return [userLocation.lat, userLocation.lng];
        }
        return defaultCenter;
    }, [userLocation, searchResults]);

    const bounds = React.useMemo(() => {
        if (searchResults) return null; // Prioritize search result focus
        const points = [];
        if (userLocation) points.push([userLocation.lat, userLocation.lng]);
        geocodedTrips.forEach(t => points.push([t.lat, t.lng]));
        return points.length > 1 ? points : null;
    }, [userLocation, geocodedTrips, searchResults]);

    const zoom = searchResults ? 14 : (userLocation ? 12 : defaultZoom);

    return (
        <div className="map-widget-container glass-panel overflow-hidden position-relative shadow-lg" style={{ height: '450px', width: '100%', borderRadius: '20px', zIndex: 1 }}>
            {/* Search Overlay */}
            <div className="position-absolute top-0 start-0 m-3" style={{ zIndex: 1000, width: '280px' }}>
                <Form onSubmit={handleSearch}>
                    <InputGroup className="shadow-sm">
                        <Form.Control
                            size="sm"
                            placeholder="Explore locations..."
                            className="border-0 rounded-start-pill ps-3"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Button variant="white" size="sm" type="submit" className="border-0 rounded-end-pill pe-3">
                            <FaSearch className="text-warning" />
                        </Button>
                    </InputGroup>
                </Form>
            </div>

            {/* Recenter Button */}
            <Button
                variant="white"
                size="sm"
                className="position-absolute bottom-0 start-0 m-3 rounded-circle shadow p-2"
                style={{ zIndex: 1000 }}
                onClick={() => {
                    setSearchResults(null);
                    setSearchQuery('');
                }}
            >
                <FaCrosshairs className="text-primary" />
            </Button>

            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
                zoomControl={false}
            >
                <ChangeView center={center} zoom={zoom} bounds={bounds} />
                <ZoomControl position="bottomright" />

                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Streets (Clean)">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                    </LayersControl.BaseLayer>

                    <LayersControl.BaseLayer name="Satellite (Realistic)">
                        <TileLayer
                            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        />
                    </LayersControl.BaseLayer>

                    <LayersControl.BaseLayer name="Cyberpunk (Dark)">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />
                    </LayersControl.BaseLayer>

                    <LayersControl.BaseLayer name="Terrain (Adventure)">
                        <TileLayer
                            attribution='&copy; <a href="https://www.opentopomap.org">OpenTopoMap</a> contributors'
                            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]}>
                        <Popup>
                            <div className="text-center p-2">
                                <h6 className="fw-bold mb-1 text-primary">Your Current Location</h6>
                                <p className="x-small text-muted mb-0">{userLocation.address}</p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {geocodedTrips.map((trip) => (
                    <React.Fragment key={trip.id}>
                        <Marker position={[trip.lat, trip.lng]}>
                            <Popup>
                                <div className="text-center p-2" style={{ minWidth: '150px' }}>
                                    <Badge bg="warning" text="dark" className="mb-1">{trip.status}</Badge>
                                    <h6 className="fw-bold mb-1">{trip.title}</h6>
                                    <p className="x-small text-muted mb-2">{trip.destination}</p>
                                    <Link to={`/trips/${trip.id}`}>
                                        <Button variant="outline-primary" size="sm" className="rounded-pill px-3 py-1 x-small fw-bold w-100">
                                            View Details
                                        </Button>
                                    </Link>
                                </div>
                            </Popup>
                        </Marker>
                        {userLocation && (
                            <Polyline
                                positions={[[userLocation.lat, userLocation.lng], [trip.lat, trip.lng]]}
                                color="#ffc107"
                                weight={2}
                                dashArray="5, 10"
                                opacity={0.6}
                            />
                        )}
                    </React.Fragment>
                ))}

                {searchResults && (
                    <Marker position={[searchResults.lat, searchResults.lng]}>
                        <Popup>
                            <div className="p-1 x-small fw-bold">{searchResults.name}</div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
};

export default MapWidget;
