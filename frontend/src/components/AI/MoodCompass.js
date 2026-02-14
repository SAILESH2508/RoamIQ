import React, { useState } from 'react';
import { Card, Row, Col, Button, Badge, Spinner } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSmile, FaMeh, FaFrown, FaBolt, FaMoon, FaMagic } from 'react-icons/fa';
import axios from '../../api/axios';
import { toast } from 'react-toastify';

const moods = [
    { id: 'excited', label: 'Excited', icon: <FaBolt />, color: '#f59e0b', energy: 'high' },
    { id: 'happy', label: 'Happy', icon: <FaSmile />, color: '#10b981', energy: 'medium' },
    { id: 'neutral', label: 'Chill', icon: <FaMeh />, color: '#6366f1', energy: 'medium' },
    { id: 'stressed', label: 'Stressed', icon: <FaFrown />, color: '#ef4444', energy: 'low' },
    { id: 'tired', label: 'Tired', icon: <FaMoon />, color: '#6b7280', energy: 'low' },
];

const MoodCompass = ({ compact = false }) => {
    const [selectedMood, setSelectedMood] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleMoodSelect = async (mood) => {
        setSelectedMood(mood);
        setIsLoading(true);
        try {
            const response = await axios.post('/api/mood/recommendations', {
                mood: mood.id,
                energy: mood.energy
            });
            setRecommendations(response.data.recommendations);

            // Also log it
            await axios.post('/api/mood/log', {
                mood: mood.id,
                energy: mood.energy,
                note: `User selected ${mood.id} on Mood Compass`
            });
        } catch (error) {
            console.error("Mood recommendations error", error);
            toast.error("Failed to get vibe-matched trips");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className={`glass-card border-0 overflow-hidden ${compact ? 'mb-0' : 'mb-4'}`}>
            <Card.Header className={`bg-transparent border-0 ${compact ? 'p-3 pb-0' : 'p-4 pb-0'}`}>
                <h5 className="fw-bold mb-1">Mood Compass</h5>
                {!compact && <p className="text-muted small">How are you feeling today? We'll match your vibe.</p>}
            </Card.Header>
            <Card.Body className={compact ? 'p-3' : 'p-4'}>
                <div className={`d-flex justify-content-between ${compact ? 'mb-3' : 'mb-4'} gap-2 overflow-auto pb-2`}>
                    {moods.map((mood) => (
                        <motion.div
                            key={mood.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button
                                variant="none"
                                onClick={() => handleMoodSelect(mood)}
                                className={`d-flex flex-column align-items-center ${compact ? 'p-2' : 'p-3'} rounded-4 transition-all ${selectedMood?.id === mood.id ? 'shadow-lg border-2' : 'bg-light bg-opacity-50'}`}
                                style={{
                                    minWidth: compact ? '65px' : '80px',
                                    border: `2px solid ${selectedMood?.id === mood.id ? mood.color : 'transparent'}`,
                                    backgroundColor: selectedMood?.id === mood.id ? `${mood.color}15` : ''
                                }}
                            >
                                <div className="fs-3 mb-1" style={{ color: mood.color }}>
                                    {mood.icon}
                                </div>
                                <span className={`small fw-bold ${selectedMood?.id === mood.id ? 'text-dark' : 'text-muted'}`}>{mood.label}</span>
                            </Button>
                        </motion.div>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-5"
                        >
                            <Spinner animation="border" variant="warning" className="mb-3" />
                            <p className="text-muted">Finding perfect matches for your vibe...</p>
                        </motion.div>
                    ) : recommendations.length > 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <h6 className="fw-bold mb-3 d-flex align-items-center">
                                <FaMagic className="me-2 text-warning" />
                                Vibe-Matched Recommendations
                            </h6>
                            <Row className={compact ? "g-2" : "g-3"}>
                                {recommendations.map((rec, idx) => (
                                    <Col key={idx} md={compact ? 12 : 4}>
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                        >
                                            <Card className="h-100 border-0 bg-light bg-opacity-50 hover-shadow rounded-4">
                                                <Card.Body className="p-3">
                                                    <div className="fs-2 mb-2">{rec.icon}</div>
                                                    <h6 className="fw-bold mb-1">{rec.name}</h6>
                                                    <p className="text-muted x-small mb-2" style={{ fontSize: '0.75rem' }}>{rec.vibe}</p>
                                                    <Badge bg="white" text="dark" className="border shadow-sm font-weight-normal text-wrap text-start w-100">
                                                        {rec.reason}
                                                    </Badge>
                                                </Card.Body>
                                            </Card>
                                        </motion.div>
                                    </Col>
                                ))}
                            </Row>
                            <div className="text-center mt-4">
                                <Button variant="link" className="text-warning fw-bold p-0" onClick={() => setRecommendations([])}>
                                    Reset Compass
                                </Button>
                            </div>
                        </motion.div>
                    ) : selectedMood && !isLoading ? (
                        <div className="text-center py-4">
                            <p className="text-muted">Something went wrong. Try another mood?</p>
                        </div>
                    ) : (
                        <div className="text-center py-5 bg-light bg-opacity-25 rounded-4 border border-dashed">
                            <p className="text-muted mb-0">Select a mood above to see magic happen!</p>
                        </div>
                    )}
                </AnimatePresence>
            </Card.Body>
        </Card>
    );
};

export default MoodCompass;
