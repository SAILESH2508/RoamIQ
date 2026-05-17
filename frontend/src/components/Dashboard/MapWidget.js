import React from 'react';
import api from '../../api/axios';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, ZoomControl, Polyline } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Button, Form, InputGroup, Badge } from 'react-bootstrap';
import { FaCrosshairs, FaSearch } from 'react-icons/fa';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Custom marker icons
const createCustomIcon = (color = '#ff7a00') => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        popupAnchor: [0, -6]
    });
};

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
            } catch {
                console.warn("Leaflet: fitBounds failed");
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
                } catch {
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

const MapWidget = ({ trips = [], userLocation = null, fillContainer = false }) => {

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
                    const res = await api.get(`/api/travel/search?q=${encodeURIComponent(trip.destination)}`);
                    if (isMounted && res.data && res.data.length > 0) {
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
            const res = await api.get(`/api/travel/search?q=${encodeURIComponent(searchQuery)}`);
            if (res.data && res.data.length > 0) {
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
        <div className="map-widget-container glass-panel overflow-hidden d-flex flex-column shadow-lg" style={{ height: fillContainer ? '100%' : '460px', width: '100%', borderRadius: '24px', zIndex: 1, minHeight: '400px', background: 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)' }}>
            
            {/* Top Bar with Title and Search Input */}
            <div className="px-4 py-3 d-flex justify-content-between align-items-center flex-wrap gap-3 border-bottom" style={{ borderColor: 'var(--glass-border-weather)' }}>
                <div className="d-flex align-items-center gap-2">
                    <span className="fs-5">🗺️</span>
                    <h5 className="m-0 fw-black" style={{ color: 'var(--text-main)', fontSize: '0.95rem', letterSpacing: '0.5px' }}>EXPLORATION MAP</h5>
                    {trips.length > 0 && <Badge bg="primary" className="rounded-pill bg-primary-gradient px-2.5 py-1 text-uppercase" style={{ fontSize: '0.65rem' }}>{trips.length} Destinations</Badge>}
                </div>
                
                <div className="d-flex align-items-center gap-2">
                    <Form onSubmit={handleSearch} className="m-0">
                        <InputGroup className="shadow-sm border overflow-hidden rounded-pill bg-white p-1" style={{ width: '280px', borderColor: 'rgba(0, 0, 0, 0.05)' }}>
                            <div className="d-flex align-items-center ps-2 text-muted opacity-50">
                                <FaSearch size={12} />
                            </div>
                            <Form.Control
                                size="sm"
                                placeholder="Search location..."
                                className="border-0 shadow-none bg-transparent ps-2 py-1.5 fw-bold"
                                style={{ fontSize: '12px', color: '#0f172a' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Button variant="primary" size="sm" type="submit" className="rounded-pill px-3 fw-black border-0 bg-primary-gradient" style={{ fontSize: '10px' }}>
                                EXPLORE
                            </Button>
                        </InputGroup>
                    </Form>
                    
                    {(searchResults || searchQuery) && (
                        <Button
                            variant="light"
                            size="sm"
                            className="rounded-pill shadow-sm border fw-bold px-2.5 py-1.5"
                            style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                            onClick={() => {
                                setSearchResults(null);
                                setSearchQuery('');
                            }}
                        >
                            <FaCrosshairs className="text-primary me-1" /> Reset View
                        </Button>
                    )}
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-grow-1 position-relative w-100" style={{ height: '100%' }}>
                <MapContainer
                    center={center}
                    zoom={zoom}
                    style={{ height: '100%', width: '100%', overflow: 'hidden' }}
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
                        <Marker 
                            position={[userLocation.lat, userLocation.lng]} 
                            icon={createCustomIcon('#28a745')}
                        >
                            <Popup>
                                <div className="text-center p-3">
                                    <h6 className="fw-bold mb-2 text-success">📍 Your Location</h6>
                                    <p className="text-muted small mb-0">{userLocation.address || 'Current Location'}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {geocodedTrips.map((trip) => (
                        <React.Fragment key={trip.id}>
                            <Marker 
                                position={[trip.lat, trip.lng]} 
                                icon={createCustomIcon('#ff7a00')}
                            >
                                <Popup>
                                    <div className="text-center p-3" style={{ minWidth: '180px' }}>
                                        <div className="mb-2">
                                            <Badge bg="primary" className="mb-2">{trip.status || 'planned'}</Badge>
                                            <h6 className="fw-bold mb-1">{trip.title || trip.destination}</h6>
                                        </div>
                                        <p className="text-muted mb-3 small">{trip.destination}</p>
                                        <div className="d-flex gap-2">
                                            <Link to={`/trips/${trip.id}`} className="flex-grow-1">
                                                <Button variant="primary" size="sm" className="rounded-pill w-100">
                                                    View Details
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                            {userLocation && (
                                <Polyline
                                    positions={[[userLocation.lat, userLocation.lng], [trip.lat, trip.lng]]}
                                    color="#ff7a00"
                                    weight={2}
                                    opacity={0.7}
                                />
                            )}
                        </React.Fragment>
                    ))}

                    {searchResults && (
                        <Marker 
                            position={[searchResults.lat, searchResults.lng]} 
                            icon={createCustomIcon('#dc3545')}
                        >
                            <Popup>
                                <div className="p-2">
                                    <h6 className="fw-bold mb-1">🔍 Search Result</h6>
                                    <p className="text-muted small mb-0">{searchResults.name}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>
        </div>
    );
};

export default MapWidget;
