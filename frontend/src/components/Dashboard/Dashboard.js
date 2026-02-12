import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaComments, FaMapMarkedAlt, FaCalendar, FaCoins, FaUsers,
  FaHome, FaSuitcase, FaChartBar, FaGlobe, FaChevronRight, FaTicketAlt, FaMapMarkerAlt, FaSync
} from 'react-icons/fa';
import axios from 'axios';
import { useCurrency } from '../../contexts/CurrencyContext';

import ExpenseTracker from '../Travel/ExpenseTracker';
import LocationTracker from '../Travel/LocationTracker';
import MapWidget from './MapWidget';
import MoodCompass from '../AI/MoodCompass';
import TicketManager from '../Travel/TicketManager';
import { motion, AnimatePresence } from 'framer-motion';


const Dashboard = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const location = useLocation();
  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState({
    totalTrips: 0,
    upcomingTrips: 0,
    totalBudget: 0,
    completedTrips: 0
  });
  const [userLocation, setUserLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');


  const fetchTrips = React.useCallback(async () => {
    try {
      const response = await axios.get('/api/travel/trips');
      const tripsData = response.data.trips;
      setTrips(tripsData);

      // Calculate stats
      const now = new Date();
      const upcoming = tripsData.filter(trip =>
        trip.start_date && new Date(trip.start_date) > now
      ).length;
      const completed = tripsData.filter(trip => trip.status === 'completed').length;
      const totalBudget = tripsData.reduce((sum, trip) => sum + (trip.budget || 0), 0);

      setStats({
        totalTrips: tripsData.length,
        upcomingTrips: upcoming,
        totalBudget: totalBudget,
        completedTrips: completed
      });
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    // Initialize location from user profile if available
    if (user?.last_location) {
      setUserLocation(user.last_location);
    }

    // Handle tab selection via URL
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'bookings') {
      setActiveTab('bookings');
    } else if (tab === 'expenses') {
      setActiveTab('analytics');
    }
  }, [fetchTrips, user, location.search]);


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
    return new Date(dateString).toLocaleDateString();
  };

  const handleLocationUpdate = React.useCallback((loc) => {
    setUserLocation(loc);
  }, []);

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar-nav">
        <div className="px-3 mb-4">
          <h5 className="fw-bold gradients-text mb-0">RoamIQ Menu</h5>
          <small className="text-muted">Personal Travel Command</small>
        </div>

        <button
          className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FaHome size={18} /> Dashboard
        </button>
        <button
          className={`sidebar-item ${activeTab === 'trips' ? 'active' : ''}`}
          onClick={() => setActiveTab('trips')}
        >
          <FaSuitcase size={18} /> My Trips
        </button>
        <button
          className={`sidebar-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <FaChartBar size={18} /> Expenses
        </button>

        <div className="mt-auto px-3 pb-4">
          <Link to="/ai" className="text-decoration-none">
            <Button variant="warning" className="w-100 rounded-pill text-white fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2 py-2">
              <FaComments /> AI Assistant
            </Button>
          </Link>
          <Link to={{ pathname: "/ai", search: "?intent=plan" }} className="text-decoration-none mt-2 d-block">
            <Button variant="outline-warning" className="w-100 rounded-pill fw-bold py-2">
              + Plan Trip
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content-area">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              {/* Top Row: Mood and Map (Reduced Size) */}
              <Row className="g-4 mb-4">
                <Col lg={4}>
                  <MoodCompass compact={true} />
                </Col>
                <Col lg={8}>
                  <Card className="glass-card border-0 h-100 overflow-hidden shadow-lg" style={{ borderRadius: '24px' }}>
                    <Card.Header className="bg-transparent border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
                      <h6 className="fw-bold mb-0"><FaGlobe className="me-2 text-warning" /> Live Travel Map</h6>
                      <LocationTracker onUpdate={handleLocationUpdate} hideText={false} />
                    </Card.Header>
                    <Card.Body className="p-3">
                      <div style={{ height: '320px', borderRadius: '15px', overflow: 'hidden' }}>
                        <MapWidget trips={trips} userLocation={userLocation} />
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Stats Bar */}
              <Row className="mb-5 g-4">
                <Col sm={6} md={3}>
                  <Card className="glass-card bg-white border-0 p-3 text-center hover-scale">
                    <div className="bg-orange-soft p-2 rounded-circle mb-2 text-warning bg-opacity-10 d-inline-block">
                      <FaMapMarkedAlt size={16} />
                    </div>
                    <h4 className="fw-bold mb-0">{stats.totalTrips}</h4>
                    <p className="text-muted extra-small text-uppercase fw-bold mb-0">Trips</p>
                  </Card>
                </Col>
                <Col sm={6} md={3}>
                  <Card className="glass-card bg-white border-0 p-3 text-center hover-scale">
                    <div className="bg-amber-soft p-2 rounded-circle mb-2 text-warning bg-opacity-10 d-inline-block">
                      <FaCalendar size={16} />
                    </div>
                    <h4 className="fw-bold mb-0">{stats.upcomingTrips}</h4>
                    <p className="text-muted extra-small text-uppercase fw-bold mb-0">Upcoming</p>
                  </Card>
                </Col>
                <Col sm={6} md={3}>
                  <Card className="glass-card bg-white border-0 p-3 text-center hover-scale">
                    <div className="bg-orange-soft p-2 rounded-circle mb-2 text-warning bg-opacity-10 d-inline-block">
                      <FaCoins size={16} />
                    </div>
                    <h4 className="fw-bold mb-0">{formatCurrency(stats.totalBudget)}</h4>
                    <p className="text-muted extra-small text-uppercase fw-bold mb-0">Total Life</p>
                  </Card>
                </Col>
                <Col sm={6} md={3}>
                  <Card className="glass-card bg-white border-0 p-3 text-center hover-scale">
                    <div className="bg-amber-soft p-2 rounded-circle mb-2 text-warning bg-opacity-10 d-inline-block">
                      <FaUsers size={16} />
                    </div>
                    <h4 className="fw-bold mb-0">{stats.completedTrips}</h4>
                    <p className="text-muted extra-small text-uppercase fw-bold mb-0">Success</p>
                  </Card>
                </Col>
              </Row>

              {/* Recent Actions / Info */}
              <Row className="g-4">
                <Col lg={8}>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="fw-bold mb-0">Quick Recap</h5>
                    <button onClick={() => setActiveTab('trips')} className="btn btn-link text-warning text-decoration-none p-0 fw-bold small">Explore All <FaChevronRight size={10} /></button>
                  </div>
                  <Row className="g-3">
                    {trips.slice(0, 2).map((trip) => (
                      <Col md={6} key={trip.id}>
                        <Link to={`/trips/${trip.id}`} className="text-decoration-none">
                          <Card className="trip-card border-0 shadow-sm p-3 h-100" style={{ borderRadius: '18px' }}>
                            <Badge bg={getStatusBadge(trip.status)} className="mb-2 align-self-start">{trip.status}</Badge>
                            <h6 className="fw-bold text-dark mb-1">{trip.title}</h6>
                            <div className="small text-muted mb-0"><FaCalendar size={12} className="me-1" /> {formatDate(trip.start_date)}</div>
                          </Card>
                        </Link>
                      </Col>
                    ))}
                  </Row>
                </Col>
                <Col lg={4}>
                  <Card className="glass-card border-0 p-4 h-100" style={{ background: 'linear-gradient(135deg, #FF9D6C 0%, #BB4E75 100%)', color: 'white' }}>
                    <h6 className="fw-bold mb-3">AI Insight</h6>
                    <p className="small opacity-90 mb-4">
                      You have {stats.upcomingTrips} trips coming up. Don't forget to check your packing list for {trips[0]?.destination || 'your next destination'}!
                    </p>
                    <Link to="/ai">
                      <Button variant="light" size="sm" className="w-100 rounded-pill fw-bold">Open Assistant</Button>
                    </Link>
                  </Card>
                </Col>
              </Row>
            </motion.div>
          )}

          {activeTab === 'trips' && (
            <motion.div
              key="trips"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <div className="d-flex justify-content-between align-items-center mb-5">
                <div>
                  <h3 className="fw-bold mb-1">My Adventures</h3>
                  <p className="text-muted small">A collection of your past and future journeys.</p>
                </div>
                <Link to={{ pathname: "/ai", search: "?intent=plan" }}>
                  <Button className="btn-gradient px-4 shadow-lg">Plan New Trip</Button>
                </Link>
              </div>

              <Row className="g-4">
                {trips.length === 0 ? (
                  <Col className="text-center py-5">
                    <FaSuitcase size={48} className="text-muted mb-3" />
                    <p className="text-muted">No trips found. Start your first plan!</p>
                  </Col>
                ) : trips.map((trip) => (
                  <Col md={6} lg={4} key={trip.id}>
                    <Link to={`/trips/${trip.id}`} className="text-decoration-none">
                      <Card className="trip-card border-0 shadow-lg h-100" style={{ borderRadius: '25px' }}>
                        <div className="p-4 bg-orange-soft bg-opacity-10 text-center text-warning rounded-top-4">
                          <FaSuitcase size={40} />
                        </div>
                        <Card.Body className="p-4">
                          <Badge bg={getStatusBadge(trip.status)} className="mb-2">{trip.status}</Badge>
                          <h5 className="fw-bold mb-1 text-dark text-truncate">{trip.title}</h5>
                          <p className="text-muted small mb-3"><FaMapMarkerAlt size={12} className="me-1" /> {trip.destination}</p>
                          <div className="d-flex justify-content-between align-items-center mt-auto pt-3 border-top opacity-75">
                            <div className="small fw-bold text-dark">{formatCurrency(trip.budget)}</div>
                            <div className="small text-muted">{trip.duration_days} Days</div>
                          </div>
                        </Card.Body>
                      </Card>
                    </Link>
                  </Col>
                ))}
              </Row>
            </motion.div>
          )}

          {activeTab === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <div className="mb-5">
                <h3 className="fw-bold mb-1">My Bookings</h3>
                <p className="text-muted small">Stay organized with all your tickets and reservations in one place.</p>
              </div>
              <TicketManager tripId={null} />
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <div className="mb-5">
                <h3 className="fw-bold mb-1">Expense Monitoring</h3>
                <p className="text-muted small">Visualize your travel spending and maintain your budget.</p>
              </div>
              <ExpenseTracker />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Dashboard;
