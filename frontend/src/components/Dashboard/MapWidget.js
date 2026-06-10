import React from 'react';
import api from '../../api/axios';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, ZoomControl, Polyline } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Button, Form, InputGroup, Badge } from 'react-bootstrap';
import { FaCrosshairs, FaSearch } from 'react-icons/fa';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTheme } from '../../contexts/ThemeContext';

// Custom marker icons for trips
const createCustomIcon = (color = '#ff7a00') => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -7]
    });
};

// Custom POI marker icons with hover popups and distinct branding
const createPoiIcon = (category, religion = null) => {
    let icon = '📍';
    let bgColor = '#64748b';
    
    if (category === 'hotel') {
        icon = '🏨';
        bgColor = '#8b5cf6'; // Violet
    } else if (category === 'fuel') {
        icon = '⛽';
        bgColor = '#f59e0b'; // Amber/Yellow
    } else if (category === 'restaurant') {
        icon = '🍔';
        bgColor = '#10b981'; // Emerald/Green
    } else if (category === 'worship') {
        icon = '🛕';
        if (religion === 'muslim' || religion === 'islam') icon = '🕌';
        else if (religion === 'christian' || religion === 'christianity') icon = '⛪';
        else if (religion === 'sikh' || religion === 'sikhism') icon = '🪯';
        else if (religion === 'hindu' || religion === 'hinduism') icon = '🛕';
        bgColor = '#3b82f6'; // Blue
    }
    
    return L.divIcon({
        className: 'custom-poi-marker',
        html: `<div style="
            background-color: ${bgColor};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 4px 8px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            cursor: pointer;
        " class="poi-hover-btn">
            ${icon}
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
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
                try {
                    const container = map.getContainer();
                    if (container && (container.offsetParent !== null || document.body.contains(container))) {
                        map.invalidateSize();
                    }
                } catch {
                    // Map might be unmounted
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
    const { isDarkMode } = useTheme();
    const [geocodedTrips, setGeocodedTrips] = React.useState([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchResults, setSearchResults] = React.useState(null);
    const [searchHistory, setSearchHistory] = React.useState([]);
    
    // Nearby Points of Interest (POIs) State
    const [localPOIs, setLocalPOIs] = React.useState([]);
    const [poiFilter, setPoiFilter] = React.useState('all');
    const [isPoiLoading, setIsPoiLoading] = React.useState(false);

    const fetchSearchHistory = async () => {
        try {
            const res = await api.get('/api/travel/history');
            setSearchHistory(res.data || []);
        } catch (err) {
            console.error("Failed to load search history in map", err);
        }
    };

    React.useEffect(() => {
        fetchSearchHistory();
    }, []);

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
                const foundPlace = {
                    lat: parseFloat(res.data[0].lat),
                    lng: parseFloat(res.data[0].lon),
                    name: res.data[0].display_name
                };
                setSearchResults(foundPlace);

                // Save search to history in database
                try {
                    await api.post('/api/travel/history', {
                        place_name: res.data[0].name || searchQuery,
                        latitude: foundPlace.lat,
                        longitude: foundPlace.lng,
                        display_name: res.data[0].display_name
                    });
                    fetchSearchHistory();
                } catch (historyErr) {
                    console.warn("Failed to save map search history", historyErr);
                }
            }
        } catch (err) {
            console.error("Search failed", err);
        }
    };

    const handleRecentSearchClick = (item) => {
        setSearchQuery(item.place_name);
        setSearchResults({
            lat: item.latitude,
            lng: item.longitude,
            name: item.display_name || item.place_name
        });
    };

    const center = React.useMemo(() => {
        if (searchResults) return [searchResults.lat, searchResults.lng];
        if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
            return [userLocation.lat, userLocation.lng];
        }
        if (geocodedTrips.length > 0) {
            return [geocodedTrips[0].lat, geocodedTrips[0].lng];
        }
        return defaultCenter;
    }, [userLocation, searchResults, geocodedTrips]);

    const bounds = React.useMemo(() => {
        if (searchResults) return null; // Prioritize search result focus
        const points = [];
        if (userLocation) points.push([userLocation.lat, userLocation.lng]);
        geocodedTrips.forEach(t => points.push([t.lat, t.lng]));
        return points.length > 1 ? points : null;
    }, [userLocation, geocodedTrips, searchResults]);

    const zoom = searchResults ? 15 : (userLocation ? 14 : (geocodedTrips.length > 0 ? 13 : defaultZoom));

    // Dynamic Fetch of Local POIs (Hotels, Lodges, Petrol Bunks, Devotional Places, Restaurants)
    React.useEffect(() => {
        if (!center || (center[0] === 20 && center[1] === 0)) return;
        
        let isMounted = true;
        const loadPOIs = async () => {
            setIsPoiLoading(true);
            try {
                // 3km Search Radius
                const radius = 3000; 
                const query = `
                    [out:json][timeout:15];
                    (
                      node["amenity"="fuel"](around:${radius},${center[0]},${center[1]});
                      node["tourism"~"hotel|motel|guest_house|hostel|lodging"](around:${radius},${center[0]},${center[1]});
                      node["amenity"~"restaurant|cafe|fast_food|food_court|dining"](around:${radius},${center[0]},${center[1]});
                      node["amenity"="place_of_worship"](around:${radius},${center[0]},${center[1]});
                    );
                    out body 50;
                `;
                const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted && data.elements) {
                        setLocalPOIs(data.elements);
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch nearby places:", err);
            } finally {
                if (isMounted) setIsPoiLoading(false);
            }
        };

        const timer = setTimeout(() => {
            loadPOIs();
        }, 800); // Debounce to optimize requests during navigation

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [center]);

    return (
        <div className="map-widget-container glass-panel overflow-hidden d-flex flex-column shadow-lg" style={{ height: fillContainer ? '100%' : '520px', width: '100%', borderRadius: '24px', zIndex: 1, minHeight: '450px', background: 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)' }}>
            
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
                                placeholder="Search street, city, hotel..."
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

            {/* Recent Searches Bar */}
            {searchHistory && searchHistory.length > 0 && (
                <div className="recent-map-searches d-flex flex-wrap gap-2 px-4 py-2 border-bottom align-items-center" style={{ 
                    background: isDarkMode ? 'rgba(30, 41, 59, 0.25)' : 'rgba(248, 249, 250, 0.5)', 
                    borderColor: 'var(--glass-border-weather)' 
                }}>
                    <span className="small text-muted fw-black" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>🕒 RECENT SEARCHES:</span>
                    {searchHistory.slice(0, 5).map((item) => (
                        <Badge 
                            key={item.id} 
                            bg="secondary" 
                            className="rounded-pill px-2.5 py-1 text-truncate hover-lift text-decoration-none" 
                            style={{ 
                                fontSize: '0.65rem', 
                                cursor: 'pointer', 
                                background: 'rgba(255, 122, 0, 0.12)', 
                                color: '#ff7a00', 
                                border: '1px solid rgba(255, 122, 0, 0.2)', 
                                maxWidth: '140px',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => handleRecentSearchClick(item)}
                        >
                            📍 {item.place_name}
                        </Badge>
                    ))}
                </div>
            )}

            {/* Nearby POI Filter Bar */}
            {localPOIs.length > 0 && (
                <div className="px-4 py-2 border-bottom d-flex gap-2 align-items-center flex-wrap" style={{ 
                    background: isDarkMode ? 'rgba(30, 41, 59, 0.45)' : 'rgba(248, 249, 250, 0.85)',
                    borderColor: 'var(--glass-border-weather)'
                }}>
                    <span className="small fw-black text-muted me-2" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>EXPLORE NEARBY:</span>
                    <Button 
                        size="sm" 
                        variant={poiFilter === 'all' ? 'primary' : 'outline-secondary'} 
                        className={`rounded-pill px-3 py-1 small fw-bold border-0 transition-all ${poiFilter === 'all' ? 'bg-primary-gradient text-white' : 'bg-transparent text-muted'}`} 
                        style={{ fontSize: '10px' }}
                        onClick={() => setPoiFilter('all')}
                    >
                        🌎 All ({localPOIs.length})
                    </Button>
                    <Button 
                        size="sm" 
                        variant={poiFilter === 'hotel' ? 'primary' : 'outline-secondary'} 
                        className={`rounded-pill px-3 py-1 small fw-bold border-0 transition-all ${poiFilter === 'hotel' ? 'bg-primary-gradient text-white' : 'bg-transparent text-muted'}`} 
                        style={{ fontSize: '10px' }}
                        onClick={() => setPoiFilter('hotel')}
                    >
                        🏨 Hotels & Lodges
                    </Button>
                    <Button 
                        size="sm" 
                        variant={poiFilter === 'fuel' ? 'primary' : 'outline-secondary'} 
                        className={`rounded-pill px-3 py-1 small fw-bold border-0 transition-all ${poiFilter === 'fuel' ? 'bg-primary-gradient text-white' : 'bg-transparent text-muted'}`} 
                        style={{ fontSize: '10px' }}
                        onClick={() => setPoiFilter('fuel')}
                    >
                        ⛽ Petrol Bunks
                    </Button>
                    <Button 
                        size="sm" 
                        variant={poiFilter === 'restaurant' ? 'primary' : 'outline-secondary'} 
                        className={`rounded-pill px-3 py-1 small fw-bold border-0 transition-all ${poiFilter === 'restaurant' ? 'bg-primary-gradient text-white' : 'bg-transparent text-muted'}`} 
                        style={{ fontSize: '10px' }}
                        onClick={() => setPoiFilter('restaurant')}
                    >
                        🍔 Restaurants
                    </Button>
                    <Button 
                        size="sm" 
                        variant={poiFilter === 'worship' ? 'primary' : 'outline-secondary'} 
                        className={`rounded-pill px-3 py-1 small fw-bold border-0 transition-all ${poiFilter === 'worship' ? 'bg-primary-gradient text-white' : 'bg-transparent text-muted'}`} 
                        style={{ fontSize: '10px' }}
                        onClick={() => setPoiFilter('worship')}
                    >
                        🛕 Devotional Places
                    </Button>
                    {isPoiLoading && <span className="small text-muted ms-auto animate-pulse" style={{ fontSize: '10px' }}>Loading places...</span>}
                </div>
            )}

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
                        {/* High Detail Google Maps layers with Door Numbers, Petrol bunks, and Hotels natively */}
                        <LayersControl.BaseLayer checked name="Google Detailed Streets">
                            <TileLayer
                                attribution='&copy; Google Maps'
                                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                            />
                        </LayersControl.BaseLayer>

                        <LayersControl.BaseLayer name="Google Hybrid Satellite">
                            <TileLayer
                                attribution='&copy; Google Maps Satellite'
                                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                            />
                        </LayersControl.BaseLayer>

                        <LayersControl.BaseLayer name="Google Terrain Detailed">
                            <TileLayer
                                attribution='&copy; Google Maps Terrain'
                                url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
                            />
                        </LayersControl.BaseLayer>

                        <LayersControl.BaseLayer name="OSM Streets (Standard)">
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                        </LayersControl.BaseLayer>

                        <LayersControl.BaseLayer name="Cyberpunk (Dark)">
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            />
                        </LayersControl.BaseLayer>
                    </LayersControl>

                    {/* Current User Location */}
                    {userLocation && (
                        <Marker 
                            position={[userLocation.lat, userLocation.lng]} 
                            icon={createCustomIcon('#28a745')}
                        >
                            <Popup>
                                <div className="text-center p-2">
                                    <h6 className="fw-bold mb-1 text-success">📍 Your Location</h6>
                                    <p className="text-muted small mb-0">{userLocation.address || 'Current Location'}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Geocoded Destination Trips */}
                    {geocodedTrips.map((trip) => (
                        <React.Fragment key={trip.id}>
                            <Marker 
                                position={[trip.lat, trip.lng]} 
                                icon={createCustomIcon('#ff7a00')}
                            >
                                <Popup>
                                    <div className="text-center p-3" style={{ minWidth: '180px' }}>
                                        <div className="mb-2">
                                            <Badge bg="primary" className="mb-2 bg-primary-gradient border-0 text-uppercase" style={{ fontSize: '0.6rem' }}>{trip.status || 'planned'}</Badge>
                                            <h6 className="fw-bold mb-1">{trip.title || trip.destination}</h6>
                                        </div>
                                        <p className="text-muted mb-3 small">{trip.destination}</p>
                                        <div className="d-flex gap-2">
                                            <Link to={`/trips/${trip.id}`} className="flex-grow-1">
                                                <Button variant="primary" size="sm" className="rounded-pill w-100 bg-primary-gradient border-0 fw-bold" style={{ fontSize: '11px' }}>
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

                    {/* Live POIs (Hotels, Lodges, Petrol Bunks, Worship places, Restaurants) */}
                    {localPOIs.map((poi) => {
                        // Categorize POI
                        let category = 'other';
                        const t = poi.tags || {};
                        
                        if (t.tourism === 'hotel' || t.tourism === 'motel' || t.tourism === 'guest_house' || t.tourism === 'hostel' || t.tourism === 'lodging') {
                            category = 'hotel';
                        } else if (t.amenity === 'fuel') {
                            category = 'fuel';
                        } else if (t.amenity === 'restaurant' || t.amenity === 'cafe' || t.amenity === 'fast_food' || t.amenity === 'food_court' || t.amenity === 'dining') {
                            category = 'restaurant';
                        } else if (t.amenity === 'place_of_worship') {
                            category = 'worship';
                        }
                        
                        // Apply filter
                        if (poiFilter !== 'all' && poiFilter !== category) return null;
                        
                        const name = t.name || t.brand || `${category.charAt(0).toUpperCase() + category.slice(1)}`;
                        const religion = t.religion;
                        
                        return (
                            <Marker 
                                key={poi.id}
                                position={[poi.lat, poi.lon]} 
                                icon={createPoiIcon(category, religion)}
                            >
                                <Popup>
                                    <div className="p-2" style={{ minWidth: '180px' }}>
                                        <div className="d-flex align-items-center gap-2 mb-1.5">
                                            <span style={{ fontSize: '1.25rem' }}>
                                                {category === 'hotel' ? '🏨' : category === 'fuel' ? '⛽' : category === 'restaurant' ? '🍔' : '🛕'}
                                            </span>
                                            <h6 className="fw-black mb-0 text-dark" style={{ fontSize: '0.85rem' }}>{name}</h6>
                                        </div>
                                        <p className="text-muted small mb-1 fw-bold text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                                            {category} {religion ? `(${religion})` : ''}
                                        </p>
                                        {(t['addr:street'] || t['addr:housenumber']) && (
                                            <p className="text-secondary small mt-1.5 mb-0 border-top pt-1.5" style={{ fontSize: '0.72rem', lineHeight: '1.3' }}>
                                                📍 {t['addr:housenumber'] || ''} {t['addr:street']}
                                            </p>
                                        )}
                                        {t.opening_hours && (
                                            <p className="text-success small mt-1 mb-0" style={{ fontSize: '0.68rem' }}>
                                                🕒 Hours: {t.opening_hours}
                                            </p>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

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

            {/* Custom Interactive Styles */}
            <style>{`
                .poi-hover-btn:hover {
                    transform: scale(1.22) translateY(-2px) !important;
                    box-shadow: 0 6px 12px rgba(0,0,0,0.3) !important;
                }
                .leaflet-popup-content-wrapper {
                    border-radius: 16px !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
                    border: 1px solid rgba(0,0,0,0.06) !important;
                }
                .leaflet-popup-tip {
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
                }
            `}</style>
        </div>
    );
};

export default MapWidget;
