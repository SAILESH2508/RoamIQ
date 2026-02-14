import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaCompass, FaMapMarkedAlt, FaMagic, FaArrowRight, FaCloudSun, FaWallet, FaTicketAlt } from 'react-icons/fa';
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
                    minHeight: '85vh',
                    backgroundImage: 'url(/assets/hero-bg.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Overlay for better text readability */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)',
                    zIndex: 1
                }}></div>

                <Container className="animate-entrance position-relative" style={{ zIndex: 2 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >

                        <h1 className="display-1 fw-black mb-4 text-white" style={{ letterSpacing: '-0.02em', fontWeight: 900, textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                            Your Journey,<br /><span className="text-warning">Intelligently Reimagined.</span>
                        </h1>
                        <p className="lead fs-4 mb-5 mx-auto text-white fw-bold opacity-90" style={{ maxWidth: '800px', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                            Experience the future of travel with RoamIQ. AI-powered itineraries,
                            live global weather monitoring, and seamless expense planning for the modern explorer.
                        </p>

                        <div className="d-flex justify-content-center gap-3 flex-wrap">
                            {user ? (
                                <>
                                    <Button as={Link} to="/dashboard" size="lg" className="px-5 py-3 rounded-pill border-0 fw-black shadow-lg btn-gradient text-white" style={{ fontSize: '1.1rem' }}>
                                        DASHBOARD <FaArrowRight className="ms-2" />
                                    </Button>
                                    <Button as={Link} to="/ai" size="lg" className="px-5 py-3 rounded-pill border-0 fw-black shadow-lg bg-white text-dark" style={{ fontSize: '1.1rem' }}>
                                        PLAN TRIP <FaMagic className="ms-2 text-warning" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button as={Link} to="/register" size="lg" className="px-5 py-3 rounded-pill border-0 fw-black shadow-lg btn-gradient text-white" style={{ fontSize: '1.2rem' }}>
                                        START EXPLORING <FaArrowRight className="ms-2" />
                                    </Button>
                                    <Button as={Link} to="/login" size="lg" className="px-5 py-3 rounded-pill border-0 fw-black shadow-lg bg-white text-dark">
                                        SIGN IN
                                    </Button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </Container>
            </section>

            {/* Feature Highlights */}
            <section id="features" className="features-section py-5" style={{ background: '#fffdfa' }}>
                <Container className="py-5">
                    <Row className="text-center mb-5 justify-content-center">
                        <Col lg={8}>
                            <h2 className="display-4 fw-bold mb-3 text-dark">Crafted for the <span className="text-warning">Curious</span></h2>
                            <p className="text-muted fs-5">Everything you need for your next adventure in one premium interface. RoamIQ brings together planning, weather, and budgeting.</p>
                        </Col>
                    </Row>

                    <Row className="g-4">
                        {/* Feature 1 */}
                        <Col md={4} className="animate-entrance animate-stagger-1">
                            <div className="glass-card p-4 h-100 text-center hover-lift position-relative overflow-hidden group">
                                <div className="p-3 d-inline-block rounded-circle mb-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)' }}>
                                    <FaCloudSun size={28} className="text-white" />
                                </div>
                                <h4 className="fw-bold mb-3">Global Weather Monitor</h4>
                                <p className="text-muted">Live, immersive weather tracking with real-time satellite updates, severe alerts, and a fixed monitoring dashboard.</p>
                            </div>
                        </Col>

                        {/* Feature 2 */}
                        <Col md={4} className="animate-entrance animate-stagger-2">
                            <div className="glass-card p-4 h-100 text-center hover-lift">
                                <div className="p-3 d-inline-block rounded-circle mb-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
                                    <FaMagic size={28} className="text-white" />
                                </div>
                                <h4 className="fw-bold mb-3">AI Travel Agent</h4>
                                <p className="text-muted">Personalized itinerary generation, packing lists, and local insights powered by Gemini 1.5 Flash.</p>
                            </div>
                        </Col>

                        {/* Feature 3 */}
                        <Col md={4} className="animate-entrance animate-stagger-3">
                            <div className="glass-card p-4 h-100 text-center hover-lift">
                                <div className="p-3 d-inline-block rounded-circle mb-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                                    <FaWallet size={28} className="text-white" />
                                </div>
                                <h4 className="fw-bold mb-3">Smart Budgeting</h4>
                                <p className="text-muted">Track expenses in real-time, manage multiple currencies, and view spending analytics for every trip.</p>
                            </div>
                        </Col>

                        {/* Feature 4 */}
                        <Col md={6} className="animate-entrance animate-stagger-1 mt-4">
                            <div className="glass-card p-4 h-100 text-center hover-lift">
                                <div className="p-3 d-inline-block rounded-circle mb-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                                    <FaTicketAlt size={28} className="text-white" />
                                </div>
                                <h4 className="fw-bold mb-3">Digital Ticket Wallet</h4>
                                <p className="text-muted">Store flight, train, and hotel tickets securely. Access them instantly with zero hassle.</p>
                            </div>
                        </Col>

                        {/* Feature 5 */}
                        <Col md={6} className="animate-entrance animate-stagger-2 mt-4">
                            <div className="glass-card p-4 h-100 text-center hover-lift">
                                <div className="p-3 d-inline-block rounded-circle mb-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                                    <FaMapMarkedAlt size={28} className="text-white" />
                                </div>
                                <h4 className="fw-bold mb-3">Visual Trip Mapping</h4>
                                <p className="text-muted">Visualize your entire journey on interactive maps with pinned locations and day-by-day routing.</p>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>



            {/* Footer Branding */}
            <footer className="py-5 text-center text-muted bg-light">
                <Container>
                    <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                        <div className="bg-gradient-header p-2 rounded-3 shadow-sm d-flex align-items-center justify-content-center" style={{ background: '#f97316' }}>
                            <FaCompass className="text-white" size={24} />
                        </div>
                        <span className="fw-bold fs-3 text-dark">RoamIQ</span>
                    </div>
                    <p className="small mb-2">&copy; 2026 RoamIQ AI. All rights reserved.</p>
                    <div className="d-flex justify-content-center gap-3 small text-muted">
                        <Link to="#" className="text-muted text-decoration-none">Privacy</Link>
                        <Link to="#" className="text-muted text-decoration-none">Terms</Link>
                        <Link to="#" className="text-muted text-decoration-none">Support</Link>
                    </div>
                </Container>
            </footer>

            <style>{`
                .hover-lift {
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                .hover-lift:hover {
                    transform: translateY(-10px);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                }
                .hover-scale:hover {
                    transform: scale(1.05);
                }
            `}</style>
        </div>
    );
};

export default Home;
