import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaPaperPlane, FaSuitcase } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

const PlanTrip = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        destination: '',
        start_date: '',
        end_date: '',
        budget: 1000,
        trip_type: 'leisure',
        group_size: 1,
        notes: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post('/api/travel/trips', formData);
            toast.success("AI is orchestrating your trip...");
            navigate(`/trips/${response.data.trip.id}`);
        } catch (error) {
            console.error("Plan trip error:", error);
            toast.error(error.response?.data?.error || "Failed to create trip");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-5 page-container">
            <Row className="justify-content-center">
                <Col lg={8}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <Card className="glass-card border-0 p-5 shadow-2xl" style={{ borderRadius: '30px' }}>
                            <div className="text-center mb-5">
                                <div className="bg-orange-soft p-4 rounded-circle d-inline-block mb-3 text-warning">
                                    <FaSuitcase size={40} />
                                </div>
                                <h2 className="fw-bold text-dark">Plan Your Next Adventure</h2>
                                <p className="text-muted">Our AI will generate a personalized itinerary based on your preferences.</p>
                            </div>

                            <Form onSubmit={handleSubmit}>
                                <Row className="g-4">
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold small text-uppercase opacity-75">Trip Title</Form.Label>
                                            <Form.Control
                                                name="title"
                                                className="form-control-custom"
                                                placeholder="e.g., Summer in Tokyo"
                                                required
                                                onChange={handleChange}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold small text-uppercase opacity-75">Destination</Form.Label>
                                            <Form.Control
                                                name="destination"
                                                className="form-control-custom"
                                                placeholder="Where do you want to go?"
                                                required
                                                onChange={handleChange}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold small text-uppercase opacity-75">Start Date</Form.Label>
                                            <Form.Control
                                                type="date"
                                                name="start_date"
                                                className="form-control-custom"
                                                required
                                                onChange={handleChange}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold small text-uppercase opacity-75">End Date</Form.Label>
                                            <Form.Control
                                                type="date"
                                                name="end_date"
                                                className="form-control-custom"
                                                required
                                                onChange={handleChange}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold small text-uppercase opacity-75">Budget (USD)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                name="budget"
                                                className="form-control-custom"
                                                value={formData.budget}
                                                onChange={handleChange}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold small text-uppercase opacity-75">Trip Type</Form.Label>
                                            <Form.Select name="trip_type" className="form-control-custom" onChange={handleChange}>
                                                <option value="leisure">Leisure</option>
                                                <option value="business">Business</option>
                                                <option value="adventure">Adventure</option>
                                                <option value="romantic">Romantic</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold small text-uppercase opacity-75">Additional Notes</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                name="notes"
                                                className="form-control-custom"
                                                placeholder="Any specific preferences? (e.g., Vegetarian food, interest in museums)"
                                                onChange={handleChange}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <div className="mt-5 text-center">
                                    <Button
                                        type="submit"
                                        className="btn-gradient btn-lg px-5 shadow-lg w-100"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Spinner size="sm" className="me-2" />
                                                AI Orchestrator Working...
                                            </>
                                        ) : (
                                            <>
                                                <FaPaperPlane className="me-2" />
                                                Create AI-Powered Trip
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="link"
                                        className="mt-3 text-muted text-decoration-none"
                                        onClick={() => navigate('/dashboard')}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </Form>
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </Container>
    );
};

export default PlanTrip;
