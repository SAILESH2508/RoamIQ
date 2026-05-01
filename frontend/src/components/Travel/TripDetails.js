import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Nav, Button, Badge, Spinner, Modal, Form } from 'react-bootstrap';
import { FaCalendarAlt, FaMapMarkerAlt, FaTicketAlt, FaCoins, FaTrash, FaPen, FaUsers, FaArrowLeft, FaSave, FaMagic } from 'react-icons/fa';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

import ItineraryView from '../TripPlanner/ItineraryView';
import TicketManager from './TicketManager';
import ExpenseTracker from './ExpenseTracker';
import WeatherWidget from './WeatherWidget';
import { useCurrency } from '../../contexts/CurrencyContext';

const TripDetails = () => {
    const { id } = useParams();
    const { formatCurrency, convertFromUSD, convertToUSD } = useCurrency();
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('itinerary');

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({
        title: '',
        start_date: '',
        end_date: '',
        budget: '',
        notes: ''
    });

    // AI Edit State
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAILoading, setIsAILoading] = useState(false);

    const fetchTrip = useCallback(async () => {
        try {
            const response = await axios.get(`/api/travel/trips/${id}`);
            setTrip(response.data.trip);
            // Initialize edit form data
            setEditFormData({
                title: response.data.trip.title,
                start_date: response.data.trip.start_date ? new Date(response.data.trip.start_date).toISOString().split('T')[0] : '',
                end_date: response.data.trip.end_date ? new Date(response.data.trip.end_date).toISOString().split('T')[0] : '',
                budget: response.data.trip.budget ? convertFromUSD(response.data.trip.budget).toFixed(0) : '',
                notes: response.data.trip.notes || ''
            });
        } catch (error) {
            console.error("Error fetching trip:", error);
            toast.error("Failed to load trip details");
        } finally {
            setLoading(false);
        }
    }, [id, convertFromUSD]);

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

    const handleEditClick = () => {
        try {
            setEditFormData({
                title: trip.title || '',
                start_date: trip.start_date ? new Date(trip.start_date).toISOString().split('T')[0] : '',
                end_date: trip.end_date ? new Date(trip.end_date).toISOString().split('T')[0] : '',
                budget: trip.budget ? convertFromUSD(trip.budget).toFixed(0) : '',
                notes: trip.notes || ''
            });
            setShowEditModal(true);
        } catch (error) {
            console.error("Error preparing edit form:", error);
            toast.error("Could not open edit form due to invalid data.");
        }
    };



    const handleEditChange = (e) => {
        setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const normalizedData = {
                ...editFormData,
                budget: convertToUSD(parseFloat(editFormData.budget) || 0)
            };
            const response = await axios.put(`/api/travel/trips/${id}`, normalizedData);
            setTrip(response.data.trip);
            setShowEditModal(false);
            toast.success("Trip updated successfully!");
        } catch (error) {
            console.error("Error updating trip:", error);
            toast.error("Failed to update trip.");
        }
    };

    const handleAISubmit = async (e) => {
        e.preventDefault();
        if (!aiPrompt.trim()) return;

        setIsAILoading(true);
        try {
            const response = await axios.post(`/api/travel/trips/${id}/update-ai`, {
                prompt: aiPrompt,
                currency: 'USD' // Standardized base
            });
            setTrip(response.data.trip);
            setShowAIModal(false);
            setAiPrompt('');
            toast.success("Trip updated by AI! 🪄");
        } catch (error) {
            console.error("AI Update error:", error);
            toast.error(error.response?.data?.error || "AI failed to update trip.");
        } finally {
            setIsAILoading(false);
        }
    };
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
                <Spinner animation="grow" variant="primary" />
            </div>
        );
    }

    if (!trip) {
        return (
            <Container className="py-5 text-center">
                <h3 className="fw-black">Adventure not found</h3>
                <Link to="/dashboard" className="btn-premium mt-3">Back to Dashboard</Link>
            </Container>
        );
    }

    return (
        <div className="page-container pb-5">
            {/* AI Edit Modal */}
            <Modal show={showAIModal} onHide={() => setShowAIModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-black"><FaMagic className="text-primary me-2" /> Edit with AI</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <p className="text-muted small mb-4">
                        Tell the AI how you'd like to change your trip. For example: 
                        "Make it more luxury", "Add 2 more days of adventure in the mountains", or "Focus more on local food experiences".
                    </p>
                    <Form onSubmit={handleAISubmit}>
                        <Form.Group className="mb-4">
                            <Form.Control
                                as="textarea"
                                rows={4}
                                placeholder="Describe your changes..."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="form-control-premium"
                                style={{ resize: 'none' }}
                                required
                            />
                        </Form.Group>
                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="light" className="rounded-pill px-4 fw-bold" onClick={() => setShowAIModal(false)}>Cancel</Button>
                            <Button 
                                type="submit" 
                                className="btn-premium px-4 shadow-sm"
                                disabled={isAILoading}
                            >
                                {isAILoading ? <Spinner size="sm" animation="border" className="me-2" /> : <FaMagic className="me-2" />}
                                {isAILoading ? 'Thinking...' : 'Update Trip'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Edit Trip Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">Edit Trip Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleEditSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Trip Title</Form.Label>
                            <Form.Control
                                type="text"
                                name="title"
                                value={editFormData.title}
                                onChange={handleEditChange}
                                required
                            />
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Start Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="start_date"
                                        value={editFormData.start_date}
                                        onChange={handleEditChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>End Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="end_date"
                                        value={editFormData.end_date}
                                        onChange={handleEditChange}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Budget</Form.Label>
                            <Form.Control
                                type="number"
                                name="budget"
                                value={editFormData.budget}
                                onChange={handleEditChange}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                name="notes"
                                value={editFormData.notes}
                                onChange={handleEditChange}
                            />
                        </Form.Group>
                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <Button variant="light" className="rounded-pill px-4 fw-bold" onClick={() => setShowEditModal(false)}>Cancel</Button>
                            <Button type="submit" className="btn-premium px-4">
                                <FaSave className="me-2" /> Save Changes
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Immersive Header Section */}
            <div
                className="position-relative py-5 mb-5"
                style={{
                    background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                    borderBottom: '1px solid rgba(249, 115, 22, 0.1)'
                }}
            >
                <Container>
                    <Link to="/dashboard" className="text-decoration-none text-muted fw-bold small d-inline-flex align-items-center mb-4 hover-translate-left">
                        <FaArrowLeft className="me-2 text-primary" /> Back to Dashboard
                    </Link>

                    <Row className="align-items-start g-4">
                        <Col lg={8}>
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                                <div className="d-flex align-items-center gap-3 mb-3">
                                    <Badge className="rounded-pill px-3 py-2 text-uppercase fw-bold shadow-sm bg-primary-gradient border-0" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>
                                        {trip.status || 'Planned'}
                                    </Badge>
                                    <span className="text-muted fw-bold small">•</span>
                                    <span className="text-muted fw-bold small text-uppercase" style={{ letterSpacing: '1px' }}>{trip.trip_type || 'Leisure'}</span>
                                </div>

                                <h1 className="display-4 fw-black mb-3 text-dark mb-4" style={{ letterSpacing: '-1px' }}>
                                    {trip.title}
                                </h1>

                                <div className="d-flex flex-wrap gap-3 text-secondary fw-medium">
                                    <div className="d-flex align-items-center gap-2 bg-white px-3 py-2 rounded-pill shadow-sm border border-primary border-opacity-10">
                                        <FaMapMarkerAlt className="text-primary" />
                                        <span className="small fw-bold">{trip.destination}</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 bg-white px-3 py-2 rounded-pill shadow-sm border border-primary border-opacity-10">
                                        <FaCalendarAlt className="text-primary" />
                                        <span className="small fw-bold">
                                            {trip.start_date ? new Date(trip.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'}
                                            {' - '}
                                            {trip.end_date ? new Date(trip.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                                        </span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 bg-white px-3 py-2 rounded-pill shadow-sm border border-primary border-opacity-10">
                                        <FaCoins className="text-primary" />
                                        <span className="small fw-bold">{formatCurrency ? formatCurrency(trip.budget) : (trip.budget || 0)} Budget</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 bg-white px-3 py-2 rounded-pill shadow-sm border border-primary border-opacity-10">
                                        <FaUsers className="text-primary" />
                                        <span className="small fw-bold">{trip.group_size || 1} Travelers</span>
                                    </div>
                                </div>
                            </motion.div>
                        </Col>
                        <Col lg={4}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="h-100"
                            >
                                <WeatherWidget destination={trip.destination} />
                            </motion.div>
                        </Col>
                    </Row>
                </Container>
            </div>

            <Container>
                {/* Navigation Tabs */}
                <Card className="glass-card mb-5 border-0 shadow-sm" style={{ borderRadius: '100px', background: 'rgba(255,255,255,0.8)' }}>
                    <Card.Body className="p-2">
                        <Nav variant="pills" className="nav-fill gap-2" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                            <Nav.Item>
                                <Nav.Link eventKey="itinerary" className={`rounded-pill py-2 fw-bold transition-all ${activeTab === 'itinerary' ? 'btn-premium text-white shadow-md' : 'text-muted hover-bg-light'}`}>
                                    <FaMapMarkerAlt className="me-2" /> Itinerary
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="tickets" className={`rounded-pill py-2 fw-bold transition-all ${activeTab === 'tickets' ? 'btn-premium text-white shadow-md' : 'text-muted hover-bg-light'}`}>
                                    <FaTicketAlt className="me-2" /> Bookings
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="budget" className={`rounded-pill py-2 fw-bold transition-all ${activeTab === 'budget' ? 'btn-premium text-white shadow-md' : 'text-muted hover-bg-light'}`}>
                                    <FaCoins className="me-2" /> Expenses
                                </Nav.Link>
                            </Nav.Item>
                        </Nav>
                    </Card.Body>
                </Card>

                {/* Main Content Area */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === 'itinerary' && (
                            <Row className="g-4">
                                <Col lg={8}>
                                    <ItineraryView 
                                        itinerary={trip.itinerary} 
                                        tripDuration={(trip.start_date && trip.end_date) ? Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / (1000 * 60 * 60 * 24)) : 0} 
                                    />
                                </Col>
                                <Col lg={4}>
                                    <div className="sticky-top" style={{ top: '100px', zIndex: 10 }}>
                                        <Card className="glass-card border-0 p-4 mb-4 shadow-sm">
                                            <div className="d-flex justify-content-between align-items-center mb-4">
                                                <h5 className="fw-bold mb-0">Trip Notes</h5>
                                                <Button
                                                    variant="light"
                                                    className="rounded-circle d-flex align-items-center justify-content-center shadow-sm text-primary"
                                                    style={{ width: '32px', height: '32px' }}
                                                    onClick={handleEditClick}
                                                    aria-label="Edit Trip"
                                                >
                                                    <FaPen size={14} />
                                                </Button>
                                            </div>
                                            <div className="bg-white bg-opacity-50 p-3 rounded-3 mb-4 border border-light">
                                                <p className="text-muted small mb-0 fst-italic">
                                                    "{trip.notes || "No notes added yet. Add some reminders for your trip!"}"
                                                </p>
                                            </div>

                                            <hr className="text-muted opacity-25" />

                                            <Button className="btn-premium w-100 justify-content-center mt-2 shadow-sm" onClick={handleEditClick}>
                                                <FaPen className="me-2" /> Edit Trip Details
                                            </Button>

                                            <Button variant="dark" className="w-100 rounded-pill fw-bold mt-3 shadow-sm d-flex align-items-center justify-content-center" onClick={() => setShowAIModal(true)}>
                                                <FaMagic className="me-2 text-primary" /> Edit with AI
                                            </Button>

                                            <Button variant="outline-danger" className="w-100 rounded-pill fw-bold mt-3" onClick={handleDelete}>
                                                <FaTrash className="me-2" /> Delete Trip
                                            </Button>
                                        </Card>
                                    </div>
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

            <style>{`
                .hover-translate-left:hover {
                    transform: translateX(-5px);
                }
                .transition-all {
                    transition: all 0.3s ease;
                }
                .hover-bg-light:hover {
                    background-color: rgba(0,0,0,0.05);
                }
            `}</style>
        </div >
    );
};

export default TripDetails;
