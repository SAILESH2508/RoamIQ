import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaCompass, FaMagic, FaArrowRight, FaCloudSun, FaWallet, FaMapMarkedAlt, FaTicketAlt, FaGlobe } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
    const { user } = useAuth();

    return (
        <div className="home-container animate-fade-in">
            {/* Hero Section */}
            <section
                className="hero-section d-flex align-items-center justify-content-center text-center"
                style={{
                    minHeight: '90vh',
                    backgroundImage: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.4)), url(/assets/hero_landscape.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    padding: '100px 0'
                }}
            >
                <Container>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                    >
                        <Badge className="mb-4 px-4 py-2 bg-primary bg-opacity-25 text-white border-0 rounded-pill fw-bold" style={{ backdropFilter: 'blur(10px)' }}>
                            AI-POWERED TRAVEL COMPANION
                        </Badge>
                        <h1 className="display-1 fw-black mb-4 text-white" style={{ lineHeight: 1.1 }}>
                            Your Journey,<br />
                            <span className="gradients-text">Intelligently Reimagined.</span>
                        </h1>
                        <p className="lead fs-4 mb-5 mx-auto text-white-50" style={{ maxWidth: '800px', fontWeight: 500 }}>
                            Experience the future of exploration. RoamIQ combines Generative AI, real-time global monitoring, 
                            and seamless planning into one premium studio interface.
                        </p>

                        <div className="d-flex justify-content-center gap-3 flex-wrap">
                            {user ? (
                                <>
                                    <Link to="/dashboard" className="btn-premium">
                                        GO TO DASHBOARD <FaArrowRight />
                                    </Link>
                                    <Link to="/ai" className="btn-premium-outline">
                                        PLAN WITH AI <FaMagic />
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/register" className="btn-premium">
                                        GET STARTED FOR FREE <FaArrowRight />
                                    </Link>
                                    <Link to="/login" className="btn-premium-outline">
                                        SIGN IN
                                    </Link>
                                </>
                            )}
                        </div>
                    </motion.div>
                </Container>
            </section>

            {/* Feature Showcase */}
            <section className="py-5" style={{ background: 'white' }}>
                <Container className="py-5">
                    <div className="text-center mb-5">
                        <h2 className="display-4 fw-bold mb-3">One Studio. <span className="text-primary">Infinite</span> Adventures.</h2>
                        <p className="text-muted fs-5 mx-auto" style={{ maxWidth: '700px' }}>
                            We've consolidated everything you need for modern travel into a single, cohesive intelligence platform.
                        </p>
                    </div>

                    <Row className="g-4">
                        <Col lg={4} md={6}>
                            <div className="glass-card feature-card h-100">
                                <div className="feature-icon"><FaMagic /></div>
                                <h4>Generative AI Hub</h4>
                                <p className="text-muted">Personalized itineraries, packing lists, and local insights powered by advanced LLMs.</p>
                            </div>
                        </Col>
                        <Col lg={4} md={6}>
                            <div className="glass-card feature-card h-100">
                                <div className="feature-icon"><FaCloudSun /></div>
                                <h4>Weather Monitoring</h4>
                                <p className="text-muted">Real-time global weather monitoring with satellite imagery and severe condition alerts.</p>
                            </div>
                        </Col>
                        <Col lg={4} md={6}>
                            <div className="glass-card feature-card h-100">
                                <div className="feature-icon"><FaWallet /></div>
                                <h4>Smart Budgeting</h4>
                                <p className="text-muted">Multi-currency expense tracking and financial analytics for every journey you take.</p>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Social Proof / Trust */}
            <section className="py-5 bg-light">
                <Container className="py-5">
                    <Row className="align-items-center">
                        <Col lg={6}>
                            <h2 className="display-5 fw-bold mb-4">Travel with <span className="text-primary">Confidence.</span></h2>
                            <p className="fs-5 text-muted mb-4">
                                RoamIQ isn't just a planner; it's your 24/7 digital concierge that anticipates your needs 
                                and keeps you safe, informed, and on budget.
                            </p>
                            <div className="d-flex flex-column gap-3">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="bg-white p-2 rounded-circle shadow-sm"><FaTicketAlt className="text-primary" /></div>
                                    <span className="fw-bold">Centralized Ticket Management</span>
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="bg-white p-2 rounded-circle shadow-sm"><FaMapMarkedAlt className="text-primary" /></div>
                                    <span className="fw-bold">Interactive Route Visualization</span>
                                </div>
                            </div>
                        </Col>
                        <Col lg={6} className="mt-5 mt-lg-0">
                            <div className="glass-card p-5 text-center">
                                <FaCompass size={80} className="text-primary mb-4 opacity-50" />
                                <h3 className="mb-3">Ready to explore?</h3>
                                <p className="mb-4">Join thousands of travelers using AI to perfect their journeys.</p>
                                <Link to="/register" className="btn-premium w-100 justify-content-center">
                                    JOIN ROAMIQ NOW
                                </Link>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Simple Footer */}
            <footer className="py-5 bg-white border-top">
                <Container>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-4">
                        <div className="d-flex align-items-center gap-2">
                            <div className="bg-primary-gradient p-2 rounded-3 shadow-sm">
                                <FaGlobe className="text-white" size={20} />
                            </div>
                            <span className="fw-bold fs-4 text-dark">Roam<span className="text-primary">IQ</span></span>
                        </div>
                        <div className="d-flex gap-4">
                            <Link to="#" className="text-muted text-decoration-none small fw-bold">PRIVACY</Link>
                            <Link to="#" className="text-muted text-decoration-none small fw-bold">TERMS</Link>
                            <Link to="#" className="text-muted text-decoration-none small fw-bold">SUPPORT</Link>
                        </div>
                        <div className="small text-muted fw-bold">
                            &copy; 2026 ROAMIQ AI.
                        </div>
                    </div>
                </Container>
            </footer>
        </div>
    );
};

// Simple Badge component since it wasn't imported from react-bootstrap correctly
const Badge = ({ children, className, style }) => (
    <span className={`badge ${className}`} style={{ fontSize: '0.8rem', letterSpacing: '1px', ...style }}>
        {children}
    </span>
);

export default Home;
