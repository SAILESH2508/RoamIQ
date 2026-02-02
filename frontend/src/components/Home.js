import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { FaCompass, FaMapMarkedAlt, FaMagic, FaArrowRight } from 'react-icons/fa';
import { motion } from 'framer-motion';

import { useAuth } from '../contexts/AuthContext';

const Home = () => {
    const { user } = useAuth();
    return (
        <div className="home-container">
            {/* Hero Section */}
            <section
                className="hero-section cinematic-bg d-flex align-items-center justify-content-center text-center py-5"
                style={{
                    minHeight: '80vh',
                    backgroundImage: 'url(/assets/hero-bg.png)'
                }}
            >
                <Container className="animate-entrance">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="display-1 fw-black mb-4 text-white" style={{ letterSpacing: '-0.04em', fontWeight: 900, color: '#ffffff' }}>
                            Your Journey,<br /><span style={{ color: '#fffb00' }}>Intelligently Reimagined.</span>
                        </h1>
                        <p className="lead fs-4 mb-5 mx-auto text-white fw-bold" style={{ maxWidth: '750px', color: '#ffffff', opacity: 1 }}>
                            Experience the future of travel with RoamIQ. AI-powered itineraries,
                            real-time local insights, and seamless planning for the modern explorer.
                        </p>
                        <div className="d-flex justify-content-center gap-4">
                            {user ? (
                                <>
                                    <LinkContainer to="/dashboard">
                                        <Button size="lg" className="px-5 py-3 rounded-pill border-0 fw-black shadow-lg" style={{ background: '#f97316', color: '#ffffff', fontSize: '1.2rem' }}>
                                            GO TO DASHBOARD <FaArrowRight className="ms-2" />
                                        </Button>
                                    </LinkContainer>
                                    <LinkContainer to="/ai">
                                        <Button size="lg" variant="light" className="px-5 py-3 rounded-pill fw-black shadow-lg" style={{ backgroundColor: '#ffffff', color: '#000000', border: 'none' }}>
                                            ASK AI ITINERARY
                                        </Button>
                                    </LinkContainer>
                                </>
                            ) : (
                                <>
                                    <LinkContainer to="/register">
                                        <Button size="lg" className="px-5 py-3 rounded-pill border-0 fw-black shadow-lg" style={{ background: '#f97316', color: '#ffffff', fontSize: '1.2rem' }}>
                                            START EXPLORING <FaArrowRight className="ms-2" />
                                        </Button>
                                    </LinkContainer>
                                    <LinkContainer to="/login">
                                        <Button size="lg" variant="light" className="px-5 py-3 rounded-pill fw-black shadow-lg" style={{ backgroundColor: '#ffffff', color: '#000000', border: 'none' }}>
                                            SIGN IN
                                        </Button>
                                    </LinkContainer>
                                </>
                            )}
                        </div>
                    </motion.div>
                </Container>
            </section>

            {/* Feature Highlights */}
            <section id="features" className="features-section py-5 bg-white">
                <Container className="py-5">
                    <Row className="text-center mb-5">
                        <Col>
                            <h2 className="display-4 fw-bold mb-3 gradients-text">Crafted for the Curious</h2>
                            <p className="text-muted fs-5">Everything you need for your next adventure in one premium interface.</p>
                        </Col>
                    </Row>
                    <Row className="g-4">
                        <Col md={4} className="animate-entrance animate-stagger-1">
                            <div className="glass-card p-5 h-100 text-center">
                                <div className="bg-gradient-header rounded-circle p-4 d-inline-block mb-4 shadow-sm">
                                    <FaMagic size={32} className="text-white" />
                                </div>
                                <h4 className="fw-bold mb-3">GenAI Itineraries</h4>
                                <p className="text-muted">Personalized travel plans generated by our advanced LLM models based on your mood and style.</p>
                            </div>
                        </Col>
                        <Col md={4} className="animate-entrance animate-stagger-2">
                            <div className="glass-card p-5 h-100 text-center">
                                <div className="bg-gradient-header rounded-circle p-4 d-inline-block mb-4 shadow-sm">
                                    <FaMapMarkedAlt size={32} className="text-white" />
                                </div>
                                <h4 className="fw-bold mb-3">Interactive Map</h4>
                                <p className="text-muted">Visualize your entire journey with our stylized maps and real-time location tracking.</p>
                            </div>
                        </Col>
                        <Col md={4} className="animate-entrance animate-stagger-3">
                            <div className="glass-card p-5 h-100 text-center">
                                <div className="bg-gradient-header rounded-circle p-4 d-inline-block mb-4 shadow-sm">
                                    <FaCompass size={32} className="text-white" />
                                </div>
                                <h4 className="fw-bold mb-3">Real-time Insights</h4>
                                <p className="text-muted">Local secrets, safety tips, and hidden gems discovered by AI as you explore.</p>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Visual CTA */}
            <section className="cta-section py-5 bg-light overflow-hidden">
                <Container className="py-5">
                    <div className="glass-card p-0 overflow-hidden border-0 shadow-2xl">
                        <Row className="g-0 align-items-center">
                            <Col lg={6} className="p-5 p-lg-5">
                                <h2 className="display-5 fw-bold mb-4">Ready to Roam?</h2>
                                <p className="fs-5 text-muted mb-5">
                                    Join thousands of explorers using RoamIQ to turn their dream vacations into reality.
                                    No more spreadsheets, just smart travel.
                                </p>
                                <LinkContainer to={user ? "/dashboard" : "/register"}>
                                    <Button size="lg" className="btn-gradient px-5 py-3 rounded-pill border-0 fw-bold">
                                        {user ? "Go to Dashboard" : "Create Free Account"}
                                    </Button>
                                </LinkContainer>
                            </Col>
                            <Col lg={6}>
                                <img
                                    src="/assets/travel-collage.png"
                                    alt="Explore the world"
                                    className="w-100 h-100 object-fit-cover"
                                    style={{ minHeight: '400px' }}
                                />
                            </Col>
                        </Row>
                    </div>
                </Container>
            </section>

            {/* Footer Branding */}
            <footer className="py-5 text-center text-muted">
                <Container>
                    <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                        <div className="bg-gradient-header p-2 rounded-3 shadow-sm d-flex align-items-center justify-content-center">
                            <FaCompass className="text-white" size={20} />
                        </div>
                        <span className="gradients-text fw-bold fs-4">RoamIQ</span>
                    </div>
                    <p className="small">&copy; 2026 RoamIQ AI. All rights reserved.</p>
                </Container>
            </footer>
        </div>
    );
};

export default Home;
