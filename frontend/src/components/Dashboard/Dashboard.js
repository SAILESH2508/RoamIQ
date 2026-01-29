import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaPlus, FaComments, FaMapMarkedAlt, FaCalendar, FaCoins, FaUsers } from 'react-icons/fa';
import axios from 'axios';
import { useCurrency } from '../../contexts/CurrencyContext';

import ExpenseTracker from '../Travel/ExpenseTracker';
import LocationTracker from '../Travel/LocationTracker';


const Dashboard = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTrips: 0,
    upcomingTrips: 0,
    totalBudget: 0,
    completedTrips: 0
  });


  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
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
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <Container className="py-5">
      {/* Welcome Section */}
      <Row className="mb-5">
        <Col>
          <div className="glass-panel p-5 text-center position-relative overflow-hidden">
            <div className="position-absolute top-0 start-0 w-100 h-100 bg-gradient-soft opacity-50" style={{ zIndex: -1 }}></div>
            <h1 className="display-4 fw-bold mb-3 gradients-text">
              Welcome back, {user?.full_name || user?.username}!
            </h1>
            <p className="lead text-dark opacity-75 mb-4 mx-auto" style={{ maxWidth: '700px' }}>
              Your next great adventure awaits. Use our AI-powered tools to plan, discover, and organize your perfect trip.
            </p>
            <div className="d-flex justify-content-center mb-4">
              <div className="glass-panel py-2 px-3 rounded-pill shadow-sm border-white border-opacity-25">
                <LocationTracker />
              </div>
            </div>
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <Link to="/ai">
                <Button className="btn-gradient btn-lg px-5 shadow-lg">
                  <FaComments className="me-2" />
                  Ask AI Assistant
                </Button>
              </Link>
              <Link to="/plan-trip">
                <Button className="btn-outline-gradient btn-lg px-5">
                  <FaPlus className="me-2" />
                  Plan New Trip
                </Button>
              </Link>
            </div>
          </div>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row className="mb-5 g-4">
        <Col md={3}>
          <Card className="glass-card border-0 h-100 p-3">
            <Card.Body className="text-center d-flex flex-column align-items-center justify-content-center">
              <div className="bg-orange-soft p-3 rounded-circle mb-3 text-warning bg-opacity-10">
                <FaMapMarkedAlt size={24} />
              </div>
              <h2 className="fw-bold mb-0 text-dark">{stats.totalTrips}</h2>
              <p className="text-muted small text-uppercase fw-bold mb-0">Total Trips</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="glass-card border-0 h-100 p-3">
            <Card.Body className="text-center d-flex flex-column align-items-center justify-content-center">
              <div className="bg-amber-soft p-3 rounded-circle mb-3 text-warning bg-opacity-10">
                <FaCalendar size={24} />
              </div>
              <h2 className="fw-bold mb-0 text-dark">{stats.upcomingTrips}</h2>
              <p className="text-muted small text-uppercase fw-bold mb-0">Upcoming</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="glass-card border-0 h-100 p-3">
            <Card.Body className="text-center d-flex flex-column align-items-center justify-content-center">
              <div className="bg-orange-soft p-3 rounded-circle mb-3 text-warning bg-opacity-10">
                <FaCoins size={24} />
              </div>
              <h2 className="fw-bold mb-0 text-dark">{formatCurrency(stats.totalBudget)}</h2>
              <p className="text-muted small text-uppercase fw-bold mb-0">Total Budget</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="glass-card border-0 h-100 p-3">
            <Card.Body className="text-center d-flex flex-column align-items-center justify-content-center">
              <div className="bg-amber-soft p-3 rounded-circle mb-3 text-warning bg-opacity-10">
                <FaUsers size={24} />
              </div>
              <h2 className="fw-bold mb-0 text-dark">{stats.completedTrips}</h2>
              <p className="text-muted small text-uppercase fw-bold mb-0">Completed</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>



      {/* Recent Trips */}
      <Row>
        <Col>
          <Card className="glass-card border-0">
            <Card.Header className="bg-transparent border-0 p-4">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="fw-bold mb-0">Your Trips</h4>
                <Link to="/plan-trip">
                  <Button className="btn-gradient btn-sm">
                    <FaPlus className="me-1" />
                    New Trip
                  </Button>
                </Link>
              </div>
            </Card.Header>
            <Card.Body className="p-4">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" />
                  <p className="mt-2 text-muted">Loading your trips...</p>
                </div>
              ) : trips.length === 0 ? (
                <div className="text-center py-5">
                  <FaMapMarkedAlt className="text-muted mb-3" size={50} />
                  <h5 className="text-muted">No trips yet</h5>
                  <p className="text-muted mb-4">Start planning your first adventure!</p>
                  <Link to="/plan-trip">
                    <Button className="btn-gradient">
                      <FaPlus className="me-2" />
                      Plan Your First Trip
                    </Button>
                  </Link>
                </div>
              ) : (
                <Row>
                  {trips.slice(0, 6).map((trip) => (
                    <Col md={6} lg={4} key={trip.id} className="mb-3">
                      <Card className="trip-card h-100">
                        <Card.Header className="trip-card-header">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="fw-bold mb-1">{trip.title}</h6>
                              <small className="opacity-75">{trip.destination}</small>
                            </div>
                            <Badge bg={getStatusBadge(trip.status)}>
                              {trip.status}
                            </Badge>
                          </div>
                        </Card.Header>
                        <Card.Body>
                          <div className="mb-2">
                            <small className="text-muted">
                              <FaCalendar className="me-1" />
                              {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                            </small>
                          </div>
                          {trip.duration_days && (
                            <div className="mb-2">
                              <small className="text-muted">
                                Duration: {trip.duration_days} days
                              </small>
                            </div>
                          )}
                          {trip.budget && (
                            <div className="mb-2">
                              <small className="text-muted font-weight-bold">
                                <FaCoins className="me-1" />
                                Budget: {formatCurrency(trip.budget)}
                              </small>
                            </div>
                          )}
                          {trip.sustainability_score && (
                            <div className="mb-2">
                              <small className="text-success">
                                Eco Score: {Math.round(trip.sustainability_score)}%
                              </small>
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Trip Utility Modules */}
      <Row className="mb-5">
        <Col lg={12}>
          <ExpenseTracker />
        </Col>
      </Row>


    </Container>
  );
};

export default Dashboard;