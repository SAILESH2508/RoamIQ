import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge, ProgressBar } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import {
  FaMapMarkedAlt, FaCoins, FaGlobe, FaMapMarkerAlt, FaPlus, 
  FaRegBell, FaCompass, FaChevronRight, FaClock, FaTrophy, 
  FaHeart, FaShare, FaSearch, FaUserFriends, FaEdit, FaCloud,
  FaTachometerAlt, FaImage
} from 'react-icons/fa';
import axios from '../../api/axios';
import MapWidget from './MapWidget';
import { motion } from 'framer-motion';

const DashboardNew = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState({
    totalTrips: 0,
    upcomingTrips: 0,
    totalBudget: 0,
    completedTrips: 0
  });
  const [userLocation, setUserLocation] = useState(null);
  const [userCurrentLocation, setUserCurrentLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [recentActivities, setRecentActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchTrips = React.useCallback(async () => {
    try {
      const response = await axios.get('/api/travel/trips');
      const tripsData = response.data.trips;
      setTrips(tripsData);

      const now = new Date();
      const upcoming = tripsData.filter(trip => 
        (trip.start_date && new Date(trip.start_date) > now) || 
        (trip.status === 'planned' || trip.status === 'ongoing')
      ).length;
      const completed = tripsData.filter(trip => trip.status === 'completed').length;
      const totalBudget = tripsData.reduce((sum, trip) => sum + (trip.budget || 0), 0);

      setStats({
        totalTrips: tripsData.length,
        upcomingTrips: upcoming,
        totalBudget: totalBudget,
        completedTrips: completed
      });

      // Generate mock recent activities
      const activities = [
        { id: 1, type: 'trip_created', title: 'New adventure planned', time: '2 hours ago', icon: FaPlus, color: 'primary' },
        { id: 2, type: 'trip_updated', title: 'Updated Tokyo itinerary', time: '5 hours ago', icon: FaEdit, color: 'primary' },
        { id: 3, type: 'achievement', title: 'Earned Explorer Badge', time: '1 day ago', icon: FaTrophy, color: 'primary' },
        { id: 4, type: 'social', title: 'Shared travel photos', time: '2 days ago', icon: FaImage, color: 'primary' }
      ];
      setRecentActivities(activities);

      // Generate mock achievements
      const mockAchievements = [
        { id: 1, name: 'World Explorer', description: 'Visit 5+ countries', icon: FaGlobe, progress: 60, unlocked: false },
        { id: 2, name: 'Budget Master', description: 'Stay under budget 3 times', icon: FaCoins, progress: 100, unlocked: true },
        { id: 3, name: 'Adventure Seeker', description: 'Complete 10 trips', icon: FaCompass, progress: 70, unlocked: false },
        { id: 4, name: 'Social Butterfly', description: 'Share 5 trips', icon: FaUserFriends, progress: 40, unlocked: false }
      ];
      setAchievements(mockAchievements);

      // Mock weather data
      setWeatherData({
        location: 'New York',
        temp: 72,
        condition: 'Partly Cloudy',
        icon: FaCloud,
        humidity: 65,
        wind: 12
      });
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    if (user?.last_location) {
      setUserLocation(user.last_location);
    }
    
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocoding to get address
          try {
            const response = await axios.get(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
              {
                headers: { 'User-Agent': 'RoamIQ/1.0' }
              }
            );
            
            if (response.data) {
              const address = response.data.address;
              const locationName = address.city || address.town || address.village || address.county || 'Unknown Location';
              const country = address.country || '';
              
              setUserCurrentLocation({
                lat: latitude,
                lng: longitude,
                name: locationName,
                country: country,
                fullAddress: response.data.display_name || `${locationName}, ${country}`
              });
            }
          } catch (error) {
            console.error('Error getting location details:', error);
            setLocationError('Unable to fetch location details');
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError('Location access denied');
        }
      );
    } else {
      setLocationError('Geolocation not supported');
    }
  }, [fetchTrips, user]);

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
    if (filterStatus === 'all') return trips;
    return trips.filter(trip => trip.status === filterStatus);
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
    <div className="dashboard-layout animate-fade-in">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar shadow-sm py-2 px-3">
        <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-white border border-light rounded-4 shadow-sm mx-1">
            <div className="bg-primary-gradient text-white rounded-circle d-flex align-items-center justify-content-center fw-black shadow-sm" style={{ width: '52px', height: '52px', fontSize: '20px' }}>
                {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
                <h6 className="mb-0 fw-black text-dark" style={{ fontSize: '16px' }}>{user?.username}</h6>
                <small className="text-primary fw-bold x-small" style={{ letterSpacing: '0.5px' }}>PRO EXPLORER</small>
            </div>
        </div>

        <div className="mb-3">
            <h6 className="text-muted fw-bold text-uppercase mb-3 px-1" style={{ letterSpacing: '1px', fontSize: '12px' }}>Command Center</h6>
            <nav className="d-flex flex-column gap-2">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`sidebar-link-premium border-0 w-100 text-start py-3 px-3 d-flex align-items-center gap-3 ${activeTab === 'overview' ? 'active' : ''}`}
                >
                    <div className={`p-2 rounded-3 ${activeTab === 'overview' ? 'bg-primary text-white' : 'bg-light text-muted'}`}>
                        <FaTachometerAlt size={18} />
                    </div>
                    <span className="fw-bold">Overview</span>
                </button>
                <button
                    onClick={() => setActiveTab('trips')}
                    className={`sidebar-link-premium border-0 w-100 text-start py-3 px-3 d-flex align-items-center gap-3 ${activeTab === 'trips' ? 'active' : ''}`}
                >
                    <div className={`p-2 rounded-3 ${activeTab === 'trips' ? 'bg-primary text-white' : 'bg-light text-muted'}`}>
                        <FaMapMarkedAlt size={18} />
                    </div>
                    <span className="fw-bold">Adventures</span>
                </button>
            </nav>
        </div>

        <div className="mt-auto">
            {/* User Location Widget */}
            {userCurrentLocation && (
                <div className="glass-card p-3 border-0 bg-white shadow-sm mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                        <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <FaMapMarkerAlt className="text-success" size={12} />
                                <span className="text-muted fw-bold text-uppercase x-small" style={{ letterSpacing: '1px' }}>Current Region</span>
                            </div>
                            <h6 className="mb-0 fw-bold" style={{ fontSize: '15px' }}>{userCurrentLocation.name}</h6>
                            <small className="text-muted" style={{ fontSize: '12px' }}>{userCurrentLocation.country}</small>
                        </div>
                    </div>
                </div>
            )}





            <div className="glass-card p-3 border-0" style={{ background: 'linear-gradient(135deg, #fff 0%, #fff7ed 100%)', boxShadow: '0 10px 30px rgba(255, 122, 0, 0.15)' }}>
                <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="bg-primary text-white rounded-circle p-2 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                        <FaCompass size={20} className="animate-pulse" />
                    </div>
                    <div>
                        <h6 className="mb-0 fw-black text-dark" style={{ fontSize: '15px' }}>Live Tracking</h6>
                        <small className="text-muted fw-bold" style={{ fontSize: '11px' }}>ACTIVE EXPEDITION</small>
                    </div>
                </div>
                <Link to="/ai" className="btn-premium py-3 w-100 fw-bold justify-content-center shadow-sm" style={{ fontSize: '14px', borderRadius: '16px' }}>
                    START NEW TRIP <FaPlus size={12} />
                </Link>
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main custom-scrollbar">
        {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex-grow-1 d-flex flex-column pb-0">
                {/* Stats Row */}
                <div className="row g-3 mb-3">
                    <div className="col-lg-4 col-md-6">
                        <div className="stat-card-premium p-3 d-flex align-items-center gap-3" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            <div className="bg-primary-soft p-2 rounded-3 shadow-inner text-primary" style={{ minWidth: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FaMapMarkedAlt size={22} />
                            </div>
                            <div>
                                <h2 className="fw-black mb-0" style={{ fontSize: '24px', lineHeight: 1.2 }}>{stats.totalTrips}</h2>
                                <h6 className="text-muted fw-bold text-uppercase mb-0 x-small" style={{ letterSpacing: '1px' }}>Adventures</h6>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-4 col-md-6">
                        <div className="stat-card-premium p-3 d-flex align-items-center gap-3" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            <div className="bg-success bg-opacity-10 p-2 rounded-3 shadow-inner text-success" style={{ minWidth: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FaCoins size={22} />
                            </div>
                            <div>
                                <h2 className="fw-black mb-0" style={{ fontSize: '22px', lineHeight: 1.2 }}>{formatCurrency(stats.totalBudget)}</h2>
                                <h6 className="text-muted fw-bold text-uppercase mb-0 x-small" style={{ letterSpacing: '1px' }}>Investment</h6>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-4 col-md-6">
                        <div className="stat-card-premium p-3 d-flex align-items-center gap-3" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            <div className="bg-warning bg-opacity-10 p-2 rounded-3 shadow-inner text-warning" style={{ minWidth: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FaRegBell size={22} />
                            </div>
                            <div>
                                <h2 className="fw-black mb-0" style={{ fontSize: '24px', lineHeight: 1.2 }}>{stats.upcomingTrips}</h2>
                                <h6 className="text-muted fw-bold text-uppercase mb-0 x-small" style={{ letterSpacing: '1px' }}>Upcoming</h6>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row g-3 flex-grow-1 mb-0" style={{ minHeight: '300px' }}>
                    {/* Live Navigation Widget */}
                    <div className="col-lg-8">
                        <div className="glass-card mb-0 overflow-hidden border-0 shadow-lg h-100 d-flex flex-column">
                            <div className="p-3 border-bottom bg-white d-flex justify-content-between align-items-center">
                                <div>
                                    <h4 className="mb-0 fw-black d-flex align-items-center gap-3" style={{ fontSize: '24px' }}>
                                        <FaGlobe className="text-primary" size={24} /> Live Navigation Hub
                                    </h4>
                                    <small className="text-muted fw-bold" style={{ fontSize: '13px' }}>Tracking {stats.totalTrips} coordinates</small>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="text-primary fw-bold" style={{ fontSize: '12px', letterSpacing: '0.5px' }}>LIVE</span>
                                </div>
                            </div>
                            <div className="flex-grow-1 w-100">
                                <MapWidget trips={trips} userLocation={userLocation} fillContainer={true} />
                            </div>
                        </div>
                    </div>
                    
                    {/* Recent Activities */}
                    <div className="col-lg-4">
                        <div className="glass-card mb-0 overflow-hidden border-0 shadow-lg h-100 d-flex flex-column bg-white">
                            <div className="p-3 border-bottom d-flex align-items-center gap-3">
                                <div className="bg-primary-soft p-2 rounded-circle text-primary">
                                    <FaClock size={18} />
                                </div>
                                <h5 className="mb-0 fw-black" style={{ fontSize: '18px' }}>Recent Activity</h5>
                            </div>
                            <div className="p-3 flex-grow-1 overflow-auto custom-scrollbar">
                                <div className="d-flex flex-column gap-3">
                                    {recentActivities.map(activity => (
                                        <div key={activity.id} className="d-flex align-items-center gap-3 p-3 rounded-4 hover-bg-light transition-all border border-light bg-light bg-opacity-10">
                                            <div className="bg-primary-soft p-2 rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '42px', height: '42px', minWidth: '42px' }}>
                                                <activity.icon className="text-primary" size={18} />
                                            </div>
                                            <div className="overflow-hidden">
                                                <h6 className="mb-0 fw-black text-dark text-truncate" style={{ fontSize: '14px' }}>{activity.title}</h6>
                                                <small className="text-muted fw-bold x-small">{activity.time}</small>
                                            </div>
                                        </div>
                                    ))}
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
                        <div className="text-center py-5 glass-card col-span-full border-0 shadow-lg">
                            <div className="mb-4">
                                <img src="/assets/empty-trips.png" alt="No Trips" className="img-fluid rounded-4" style={{ maxHeight: '280px', opacity: 0.9 }} />
                            </div>
                            <h3 className="text-dark fw-black" style={{ fontSize: '28px' }}>No adventures found</h3>
                            <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '450px', fontSize: '16px' }}>Try adjusting your search or filters to find your perfect getaway.</p>
                            <Link to="/ai" className="btn-premium" style={{ fontSize: '16px', padding: '14px 32px' }}>PLAN NEW ADVENTURE</Link>
                        </div>
                    ) : getFilteredTrips().map(trip => (
                        <Link key={trip.id} to={`/trips/${trip.id}`} className="text-decoration-none">
                            <div className="stat-card-premium h-100 group flex-column align-items-stretch" style={{ gap: '0' }}>
                                <div className="d-flex justify-content-between mb-4 w-100">
                                    <Badge bg={getStatusBadge(trip.status)} className="rounded-pill px-3 py-2 fw-bold text-uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>{trip.status}</Badge>
                                    <span className="text-muted fw-bold" style={{ fontSize: '14px' }}>{formatDate(trip.start_date)}</span>
                                </div>
                                <h3 className="fw-black text-dark mb-3 group-hover-text-primary transition-all text-truncate w-100" style={{ fontSize: '20px' }}>{trip.title}</h3>
                                <div className="d-flex align-items-center gap-2 mb-3 text-muted fw-bold w-100">
                                    <div className="bg-primary-soft p-2 rounded-circle">
                                        <FaMapMarkerAlt className="text-primary" size={14} />
                                    </div>
                                    <span style={{ fontSize: '15px' }}>{trip.destination}</span>
                                </div>
                                
                                {/* Progress Bar for Ongoing Trips */}
                                {trip.status === 'ongoing' && (
                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between mb-1">
                                            <small className="text-muted fw-bold" style={{ fontSize: '11px' }}>Trip Progress</small>
                                            <small className="text-muted fw-bold" style={{ fontSize: '11px' }}>{getTripProgress(trip)}%</small>
                                        </div>
                                        <ProgressBar now={getTripProgress(trip)} variant="primary" style={{ height: '6px' }} />
                                    </div>
                                )}
                                
                                <div className="mt-auto pt-4 border-top border-light d-flex justify-content-between align-items-center">
                                    <div>
                                        <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '1px' }}>Investment</small>
                                        <span className="fw-black text-dark" style={{ fontSize: '20px' }}>{formatCurrency(trip.budget)}</span>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-sm btn-outline-secondary rounded-circle p-2" style={{ width: '36px', height: '36px' }}>
                                            <FaHeart size={14} />
                                        </button>
                                        <button className="btn btn-sm btn-outline-secondary rounded-circle p-2" style={{ width: '36px', height: '36px' }}>
                                            <FaShare size={14} />
                                        </button>
                                        <div className="bg-primary text-white rounded-circle p-2 opacity-0 group-hover-opacity-100 transform translate-x-2 group-hover-translate-x-0 transition-all shadow-sm">
                                            <FaChevronRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </motion.div>
        )}
      </main>
    </div>
  );
};

export default DashboardNew;
