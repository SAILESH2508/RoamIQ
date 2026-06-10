import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Badge, ProgressBar } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useData } from '../../contexts/DataContext';
import {
  FaMapMarkedAlt, FaCoins, FaMapMarkerAlt,
  FaRegBell, FaChevronRight, FaClock, FaSearch,
  FaTachometerAlt, FaCalendar, FaPlus, FaEdit, FaTrophy, FaImage
} from 'react-icons/fa';
import axios from '../../api/axios';
import MapWidget from './MapWidget';
import LocationTracker from '../Travel/LocationTracker';
import { motion } from 'framer-motion';

const DashboardNew = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { trips, stats, recentActivities, fetchTrips } = useData();

  const iconMap = {
    FaPlus: FaPlus,
    FaEdit: FaEdit,
    FaTrophy: FaTrophy,
    FaImage: FaImage
  };

  const [userLocation, setUserLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [weatherData, setWeatherData] = useState(() => {
    const cached = localStorage.getItem('roamiq-cached-current-weather');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          location: parsed.city,
          temp: Math.round(parsed.temperature),
          condition: parsed.condition,
          code: parsed.weather_code || parsed.code || 0,
          is_day: parsed.is_day !== undefined ? parsed.is_day : 1
        };
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const fetchWeatherForLocation = useCallback(async (lat, lng, name) => {
    // Check cache validity (15 minutes cache limit)
    const cacheTime = localStorage.getItem('roamiq-weather-cache-time');
    const lastViewed = localStorage.getItem('roamiq-last-viewed-weather-location');
    const cachedWeather = localStorage.getItem('roamiq-cached-current-weather');
    
    let isCacheValid = false;
    if (cachedWeather && cacheTime && lastViewed) {
      try {
        const parsedLast = JSON.parse(lastViewed);
        const age = Date.now() - parseInt(cacheTime);
        const sameLoc = Math.abs(Number(parsedLast.lat) - Number(lat)) < 0.001 && 
                        Math.abs(Number(parsedLast.lon) - Number(lng)) < 0.001;
        if (age < 900000 && sameLoc) {
          isCacheValid = true;
        }
      } catch (e) {
        isCacheValid = false;
      }
    }

    if (isCacheValid) {
      return; // Skip fetch, since state is already initialized from cache!
    }

    try {
      const weatherRes = await axios.get(`/api/travel/current?lat=${lat}&lon=${lng}&city=${encodeURIComponent(name || 'Unknown Location')}`);
      if (weatherRes.data) {
        const weatherState = {
          location: name,
          temp: Math.round(weatherRes.data.temperature || 72),
          condition: weatherRes.data.description || 'Clear Sky',
          code: weatherRes.data.weather_code || 0,
          is_day: weatherRes.data.is_day !== undefined ? weatherRes.data.is_day : 1
        };
        setWeatherData(weatherState);
        
        // Write to weather cache so they match!
        localStorage.setItem('roamiq-cached-current-weather', JSON.stringify({
            temperature: weatherState.temp,
            condition: weatherState.condition,
            weather_code: weatherState.code,
            humidity: weatherRes.data.humidity || 60,
            wind_speed: weatherRes.data.wind_speed || 10,
            city: name,
            is_day: weatherState.is_day,
            hourly: weatherRes.data.hourly,
            daily: weatherRes.data.daily
        }));
        localStorage.setItem('roamiq-cached-hourly-data', JSON.stringify(weatherRes.data.hourly));
        localStorage.setItem('roamiq-cached-daily-data', JSON.stringify(weatherRes.data.daily));
        localStorage.setItem('roamiq-weather-cache-time', Date.now().toString());
        localStorage.setItem('roamiq-last-viewed-weather-location', JSON.stringify({ lat, lon: lng, city: name }));
      }
    } catch (e) {
      console.error("Weather fetch failed", e);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    if (user?.last_location) {
      setUserLocation(user.last_location);
    }
    
    // Load initial location from cached or Coimbatore fallback
    const cached = localStorage.getItem('roamiq-user-location');
    const initialLoc = cached ? JSON.parse(cached) : { lat: 11.0168, lng: 76.9558, address: 'Coimbatore, Tamil Nadu, India' };
    const locationName = initialLoc.address?.split(',')[0] || 'Coimbatore';
    
    fetchWeatherForLocation(initialLoc.lat, initialLoc.lng, locationName);
  }, [fetchTrips, user, fetchWeatherForLocation]);

  const getStatusBadge = (status) => {
    const statusColors = {
      planned: 'primary',
      ongoing: 'success',
      completed: 'secondary',
      cancelled: 'danger'
    };
    return statusColors[status] || 'secondary';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getFilteredTrips = () => {
    let filtered = trips;
    if (filterStatus !== 'all') {
      filtered = filtered.filter(trip => trip.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(trip =>
        trip.title?.toLowerCase().includes(q) ||
        trip.destination?.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const getTripProgress = (trip) => {
    if (!trip.start_date || !trip.end_date) return 0;
    const now = new Date();
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', background: 'var(--bg-gradient-main)', color: 'var(--text-main-weather)', fontFamily: "'Outfit', sans-serif" }}>
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar d-flex flex-column" style={{ 
          width: '240px', 
          background: 'var(--sidebar-bg)', 
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          color: 'var(--text-main-weather)',
          position: 'fixed',
          left: 0,
          top: '60px', 
          bottom: 0,
          height: 'calc(100vh - 60px)',
          zIndex: 1500,
          padding: '24px 20px',
          borderRight: '1px solid var(--glass-border-weather)',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.02)'
      }}>
          <div className="mb-4">
              <h4 className="fw-black mb-1 text-dark text-truncate" style={{ fontSize: '1.4rem' }}>Welcome, {user?.username || 'Traveler'}!</h4>
              <p className="fw-bold mb-3 small" style={{ color: 'var(--text-main-weather)', opacity: 0.7 }}>Command Center</p>
              
              <div className="d-flex flex-column gap-2">
                  <div className="d-flex align-items-center gap-2 rounded-4 shadow-sm overflow-hidden" style={{ background: 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                      <LocationTracker onUpdate={(loc) => {
                          const name = loc.address?.split(',')[0] || 'Unknown Location';
                          setUserLocation({
                              lat: loc.lat,
                              lng: loc.lng,
                              address: loc.address
                          });
                          fetchWeatherForLocation(loc.lat, loc.lng, name);
                      }} />
                  </div>
                  {weatherData && (
                      <Link to="/weather" className="text-decoration-none">
                          <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-4 shadow-sm hover-lift transition-all" style={{ background: 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                              <span className="fw-black text-dark" style={{ fontSize: '0.85rem' }}>{weatherData.temp}°C</span>
                              <span className="text-muted fw-bold small text-truncate">{weatherData.condition}</span>
                          </div>
                      </Link>
                  )}
              </div>
          </div>

          <div className="mb-4">
            <h6 className="fw-black text-uppercase mb-3 px-1" style={{ letterSpacing: '1px', fontSize: '10px', color: 'var(--text-main-weather)', opacity: 0.7 }}>Navigation</h6>
            <nav className="d-flex flex-column gap-2">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`btn text-start py-2 px-3 d-flex align-items-center gap-3 rounded-4 fw-bold transition-all border-0 ${activeTab === 'overview' ? 'shadow-sm' : ''}`}
                    style={{ background: activeTab === 'overview' ? 'var(--accent-weather)' : 'transparent', color: activeTab === 'overview' ? '#fff' : 'var(--text-main-weather)', fontSize: '0.9rem' }}
                >
                    <FaTachometerAlt size={16} />
                    <span>Overview</span>
                </button>
                <button
                    onClick={() => setActiveTab('trips')}
                    className={`btn text-start py-2 px-3 d-flex align-items-center gap-3 rounded-4 fw-bold transition-all border-0 ${activeTab === 'trips' ? 'shadow-sm' : ''}`}
                    style={{ background: activeTab === 'trips' ? 'var(--accent-weather)' : 'transparent', color: activeTab === 'trips' ? '#fff' : 'var(--text-main-weather)', fontSize: '0.9rem' }}
                >
                    <FaMapMarkedAlt size={16} />
                    <span>Adventures</span>
                </button>
            </nav>
          </div>

          <div className="mt-auto pt-3 border-top">
             {(() => {
                 const now = new Date();
                 const nextTrip = trips.find(t => (t.start_date && new Date(t.start_date) > now) || t.status === 'planned' || t.status === 'ongoing');
                 
                 return nextTrip ? (
                     <>
                        <h6 className="text-muted small fw-black text-uppercase mb-2 px-1" style={{ letterSpacing: '2px', fontSize: '0.75rem' }}>Next Expedition</h6>
                        <div className="glass-card p-3 border-start border-primary border-3 shadow-sm hover-lift transition-all rounded-3" style={{ background: 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)', borderLeft: '3px solid var(--primary)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <span className="fw-black text-dark text-truncate" style={{ fontSize: '0.85rem', maxWidth: '140px' }}>{nextTrip.title || nextTrip.destination}</span>
                                <FaMapMarkedAlt className="text-primary opacity-50 flex-shrink-0" size={12} />
                            </div>
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <FaCalendar className="text-muted" size={10} />
                                <span className="small text-muted fw-bold" style={{ fontSize: '0.75rem' }}>{nextTrip.start_date ? new Date(nextTrip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Flexible'}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-1">
                                <span className="fw-black text-primary" style={{ fontSize: '0.8rem' }}>{formatCurrency(nextTrip.budget || 0)}</span>
                                <Badge bg="primary" className="rounded-pill bg-primary-gradient border-0" style={{ fontSize: '0.6rem', padding: '4px 8px' }}>{nextTrip.status}</Badge>
                            </div>
                        </div>
                     </>
                 ) : (
                    <div className="text-center p-3 opacity-50">
                        <small className="fw-bold text-muted" style={{ fontSize: '0.8rem' }}>No upcoming trips</small>
                    </div>
                 );
             })()}
          </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main-content animate-fade-in custom-scrollbar pt-4" style={{ flex: 1, marginLeft: '240px', padding: '0', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', overflow: activeTab === 'overview' ? 'hidden' : 'auto' }}>
        <div className="px-4 pb-2 pt-2 d-flex flex-column h-100">
        <div className="d-flex justify-content-between align-items-center mb-0 flex-wrap gap-3">
            {/* Header Content can be placed here if needed, but for now we've moved it to the sidebar */}
            <div className="flex-grow-1"></div>
        </div>

        {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                {/* Stats Row */}
                <div className="row g-3 mb-3">
                    <div className="col-lg-4 col-md-6">
                        <div className="glass-panel p-4 d-flex align-items-center gap-3 shadow-sm" style={{ background: 'var(--glass-bg-weather)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border-weather)' }}>
                            <div className="p-3 rounded-circle text-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 107, 0, 0.1)' }}>
                                <FaMapMarkedAlt size={28} />
                            </div>
                            <div>
                                <h2 className="fw-black mb-0" style={{ fontSize: '28px', lineHeight: 1.2, color: 'var(--text-main-weather)' }}>{stats.totalTrips}</h2>
                                <h6 className="fw-bold text-uppercase mb-0" style={{ letterSpacing: '1px', fontSize: '0.75rem', color: 'var(--accent-weather)' }}>Adventures</h6>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-4 col-md-6">
                        <div className="glass-panel p-4 d-flex align-items-center gap-3 shadow-sm" style={{ background: 'var(--glass-bg-weather)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border-weather)' }}>
                            <div className="bg-success bg-opacity-10 p-3 rounded-circle text-success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FaCoins size={28} />
                            </div>
                            <div>
                                <h2 className="fw-black mb-0" style={{ fontSize: '24px', lineHeight: 1.2, color: 'var(--text-main-weather)' }}>{formatCurrency(stats.totalBudget)}</h2>
                                <h6 className="fw-bold text-uppercase mb-0" style={{ letterSpacing: '1px', fontSize: '0.75rem', color: '#22c55e' }}>Investment</h6>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-4 col-md-6">
                        <div className="glass-panel p-4 d-flex align-items-center gap-3 shadow-sm" style={{ background: 'var(--glass-bg-weather)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border-weather)' }}>
                            <div className="bg-warning bg-opacity-10 p-3 rounded-circle text-warning" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FaRegBell size={28} />
                            </div>
                            <div>
                                <h2 className="fw-black mb-0" style={{ fontSize: '28px', lineHeight: 1.2, color: 'var(--text-main-weather)' }}>{stats.upcomingTrips}</h2>
                                <h6 className="fw-bold text-uppercase mb-0" style={{ letterSpacing: '1px', fontSize: '0.75rem', color: '#eab308' }}>Upcoming</h6>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row g-3 flex-grow-1 mb-0" style={{ minHeight: 0 }}>
                    {/* Live Navigation Widget */}
                    <div className="col-lg-8 d-flex flex-column">
                        <MapWidget trips={trips} userLocation={userLocation} fillContainer={true} />
                    </div>
                    
                    {/* Recent Activities */}
                    <div className="col-lg-4 d-flex flex-column">
                        <div className="glass-panel overflow-hidden border-0 shadow-sm h-100 d-flex flex-column" style={{ background: 'var(--glass-bg-weather)', backdropFilter: 'blur(16px)', borderRadius: '32px', border: '1px solid var(--glass-border-weather)' }}>
                            <div className="p-4 border-bottom d-flex align-items-center gap-3" style={{ borderColor: 'var(--glass-border-weather)' }}>
                                <div className="p-2 rounded-circle" style={{ background: 'var(--accent-weather)', color: '#fff' }}>
                                    <FaClock size={18} />
                                </div>
                                <h5 className="mb-0 fw-black" style={{ fontSize: '18px', color: 'var(--text-main-weather)' }}>Recent Activity</h5>
                            </div>
                            <div className="p-4 flex-grow-1 overflow-auto custom-scrollbar">
                                <div className="d-flex flex-column gap-3">
                                    {recentActivities.map(activity => {
                                        const IconComponent = iconMap[activity.icon] || FaRegBell;
                                        return (
                                            <div key={activity.id} className="d-flex align-items-center gap-3 p-3 rounded-4 transition-all" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                <div className="p-2 rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '42px', height: '42px', minWidth: '42px', background: '#fff' }}>
                                                    <IconComponent style={{ color: 'var(--accent-weather)' }} size={18} />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <h6 className="mb-0 fw-black text-truncate" style={{ fontSize: '14px', color: 'var(--text-main-weather)' }}>{activity.title}</h6>
                                                    <small className="fw-bold x-small" style={{ color: 'var(--text-main-weather)', opacity: 0.6 }}>{activity.time}</small>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}

        {activeTab === 'trips' && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                {/* Search and Filter Bar */}
                <div className="row mb-4">
                    <div className="col-lg-8">
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0">
                                <FaSearch className="text-muted" />
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0 ps-0"
                                placeholder="Search your adventures..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ fontSize: '15px', padding: '12px 16px' }}
                            />
                        </div>
                    </div>
                    <div className="col-lg-4">
                        <select 
                            className="form-select"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ fontSize: '15px', padding: '12px 16px' }}
                        >
                            <option value="all">All Trips</option>
                            <option value="planned">Planned</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div className="card-grid">
                    {getFilteredTrips().length === 0 ? (
                        <div className="text-center py-5 glass-panel col-span-full border-0 shadow-sm" style={{ background: 'var(--glass-bg-weather)', backdropFilter: 'blur(16px)', borderRadius: '32px', border: '1px solid var(--glass-border-weather)' }}>
                            <div className="mb-4">
                                <img src="/assets/empty-trips.png" alt="No Trips" className="img-fluid rounded-4" style={{ maxHeight: '280px', opacity: 0.9 }} />
                            </div>
                            <div className="p-5 text-center text-white rounded-bottom-4" style={{ background: 'var(--accent-weather)' }}>
                                <h2 className="fw-black mb-3">READY FOR YOUR NEXT ADVENTURE?</h2>
                                <p className="opacity-90 fw-bold mb-4">Let our AI orchestrate your perfect travel experience</p>
                                <Link to="/ai" className="btn btn-light shadow-lg border-0" style={{ fontSize: '16px', padding: '14px 32px', color: 'var(--accent-weather)', borderRadius: '50px', fontWeight: '900' }}>PLAN NEW ADVENTURE</Link>
                            </div>
                        </div>
                    ) : getFilteredTrips().map(trip => (
                        <Link key={trip.id} to={`/trips/${trip.id}`} className="text-decoration-none">
                            <div className="glass-panel p-4 h-100 group flex-column align-items-stretch shadow-sm hover-lift transition-all" style={{ background: 'var(--glass-bg-weather)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid var(--glass-border-weather)' }}>
                                <div className="d-flex justify-content-between mb-4 w-100">
                                    <Badge bg={getStatusBadge(trip.status)} className="rounded-pill px-3 py-2 fw-bold text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>{trip.status}</Badge>
                                    <span className="fw-bold" style={{ fontSize: '14px', color: 'var(--text-main-weather)', opacity: 0.7 }}>{formatDate(trip.start_date)}</span>
                                </div>
                                <h3 className="fw-black mb-3 transition-all text-truncate w-100" style={{ fontSize: '20px', color: 'var(--text-main-weather)' }}>{trip.title}</h3>
                                <div className="d-flex align-items-center gap-2 mb-3 fw-bold w-100" style={{ color: 'var(--text-main-weather)', opacity: 0.8 }}>
                                    <div className="p-2 rounded-circle" style={{ background: 'rgba(0,0,0,0.05)' }}>
                                        <FaMapMarkerAlt style={{ color: 'var(--accent-weather)' }} size={14} />
                                    </div>
                                    <span style={{ fontSize: '15px' }}>{trip.destination}</span>
                                </div>
                                
                                {/* Progress Bar for Ongoing Trips */}
                                {trip.status === 'ongoing' && (
                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between mb-1">
                                            <small className="fw-bold" style={{ fontSize: '11px', color: 'var(--text-main-weather)', opacity: 0.7 }}>Trip Progress</small>
                                            <small className="fw-bold" style={{ fontSize: '11px', color: 'var(--text-main-weather)' }}>{getTripProgress(trip)}%</small>
                                        </div>
                                        <ProgressBar now={getTripProgress(trip)} style={{ height: '6px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                                            <div className="progress-bar" style={{ width: `${getTripProgress(trip)}%`, backgroundColor: 'var(--accent-weather)' }}></div>
                                        </ProgressBar>
                                    </div>
                                )}
                                
                                <div className="mt-auto pt-4 border-top d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--glass-border-weather) !important' }}>
                                    <div>
                                        <small className="d-block text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '1px', color: 'var(--text-main-weather)', opacity: 0.6 }}>Investment</small>
                                        <span className="fw-black" style={{ fontSize: '20px', color: 'var(--text-main-weather)' }}>{formatCurrency(trip.budget)}</span>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-sm rounded-circle p-2" style={{ width: '36px', height: '36px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-main-weather)' }}>
                                            <FaChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </motion.div>
        )}
        </div>
      </main>
    </div>
  );
};

export default DashboardNew;
