import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Nav, Button, Badge, Spinner } from 'react-bootstrap';
import { FaCalendarAlt, FaMapMarkerAlt, FaSuitcase, FaTicketAlt, FaCoins, FaChevronLeft, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

import ItineraryView from '../TripPlanner/ItineraryView';
import PackingList from './PackingList';
import TicketManager from './TicketManager';
import ExpenseTracker from './ExpenseTracker';
import WeatherWidget from './WeatherWidget';
import { useCurrency } from '../../contexts/CurrencyContext';

const TripDetails = () => {
    const { id } = useParams();
    const { formatCurrency } = useCurrency();
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('itinerary');

    const fetchTrip = useCallback(async () => {
        try {
            const response = await axios.get(`/api/travel/trips/${id}`);
            setTrip(response.data.trip);
        } catch (error) {
            console.error("Error fetching trip:", error);
            toast.error("Failed to load trip details");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTrip();
    }, [fetchTrip]);

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this trip?")) return;
        try {
            await axios.delete(`/api/travel/trips/${id}`);
            toast.success("Trip deleted");
            window.location.href = '/dashboard';
        } catch (error) {
            toast.error("Failed to delete trip");
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
                <Spinner animation="border" variant="warning" />
            </div>
        );
    }

    if (!trip) {
        return (
            <Container className="py-5 text-center">
                <h3>Trip not found</h3>
                <Link to="/dashboard">Back to Dashboard</Link>
            </Container>
        );
    }

    return (
        <Container className="py-4 page-container">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
            >
                <Link to="/dashboard" className="text-decoration-none text-muted small d-flex align-items-center mb-3 hover-text-warning">
                    <FaChevronLeft className="me-1" /> Back to adventures
                </Link>

                <Row className="align-items-end g-4">
                    <Col md={8}>
                        <div className="d-flex align-items-center gap-3 mb-2">
                            <h1 className="display-5 fw-bold mb-0 text-dark">{trip.title}</h1>
                            <Badge bg="warning" text="dark" className="rounded-pill px-3">{trip.status}</Badge>
                        </div>
                        <div className="d-flex flex-wrap gap-3 text-muted fw-medium">
                            <span><FaMapMarkerAlt className="me-1 text-warning" /> {trip.destination}</span>
                            <span><FaCalendarAlt className="me-1 text-warning" /> {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</span>
                            <span><FaCoins className="me-1 text-warning" /> {formatCurrency(trip.budget)}</span>
                        </div>
                    </Col>
                    <Col md={4} className="text-md-end">
                        <WeatherWidget destination={trip.destination} />
                    </Col>
                </Row>
            </motion.div>

            {/* Navigation Tabs */}
            <Card className="glass-card border-0 mb-4 overflow-hidden shadow-lg" style={{ borderRadius: '20px' }}>
                <Card.Body className="p-0">
                    <Nav variant="pills" className="p-2 gap-2" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                        <Nav.Item>
                            <Nav.Link eventKey="itinerary" className={`rounded-pill px-4 fw-bold ${activeTab === 'itinerary' ? 'btn-gradient border-0' : 'text-muted'}`}>
                                <FaMapMarkerAlt className="me-2" /> Itinerary
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="packing" className={`rounded-pill px-4 fw-bold ${activeTab === 'packing' ? 'btn-gradient border-0' : 'text-muted'}`}>
                                <FaSuitcase className="me-2" /> Packing List
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="tickets" className={`rounded-pill px-4 fw-bold ${activeTab === 'tickets' ? 'btn-gradient border-0' : 'text-muted'}`}>
                                <FaTicketAlt className="me-2" /> Bookings
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="budget" className={`rounded-pill px-4 fw-bold ${activeTab === 'budget' ? 'btn-gradient border-0' : 'text-muted'}`}>
                                <FaCoins className="me-2" /> Budget
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item className="ms-auto">
                            <Button variant="outline-danger" className="rounded-pill border-0" onClick={handleDelete}>
                                <FaTrash />
                            </Button>
                        </Nav.Item>
                    </Nav>
                </Card.Body>
            </Card>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    {activeTab === 'itinerary' && (
                        <Row>
                            <Col lg={8}>
                                <ItineraryView itinerary={trip.itinerary} />
                            </Col>
                            <Col lg={4}>
                                <div className="sticky-top" style={{ top: '100px' }}>
                                    <Card className="glass-card border-0 p-4 mb-4">
                                        <h5 className="fw-bold mb-3">Trip Summary</h5>
                                        <p className="text-muted small mb-4">{trip.notes || "No notes added for this trip."}</p>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="text-muted">Status</span>
                                            <span className="fw-bold text-capitalize">{trip.status}</span>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="text-muted">Type</span>
                                            <span className="fw-bold text-capitalize">{trip.trip_type}</span>
                                        </div>
                                        <div className="d-flex justify-content-between mb-4">
                                            <span className="text-muted">Group Size</span>
                                            <span className="fw-bold">{trip.group_size} Person(s)</span>
                                        </div>
                                        <Button variant="warning" className="w-100 rounded-pill fw-bold text-white shadow-sm">
                                            Edit Trip
                                        </Button>
                                    </Card>
                                </div>
                            </Col>
                        </Row>
                    )}

                    {activeTab === 'packing' && (
                        <Row className="justify-content-center">
                            <Col lg={6}>
                                <PackingList tripId={id} />
                            </Col>
                        </Row>
                    )}

                    {activeTab === 'tickets' && (
                        <TicketManager tripId={id} />
                    )}

                    {activeTab === 'budget' && (
                        <ExpenseTracker tripId={id} />
                    )}
                </motion.div>
            </AnimatePresence>
        </Container>
    );
};

export default TripDetails;
