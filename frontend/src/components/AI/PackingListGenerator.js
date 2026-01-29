import React, { useState } from 'react';
import { Form, Button, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { FaSuitcase, FaMagic, FaCheck, FaPlus } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';

const PackingListGenerator = ({ onSave }) => {
    const [destination, setDestination] = useState('');
    const [duration, setDuration] = useState(7);
    const [activities, setActivities] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedList, setGeneratedList] = useState(null);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!destination) return;

        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/ai/generate/packing-list', {
                destination,
                duration: parseInt(duration),
                activities: activities.split(',').map(a => a.trim()).filter(a => a)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setGeneratedList(response.data.packing_list);
            toast.success('Packing list generated!');
        } catch (error) {
            console.error('Error generating list:', error);
            toast.error('Failed to generate packing list.');
        } finally {
            setIsLoading(false);
        }
    };

    // Group items by category
    const groupedItems = generatedList?.reduce((acc, item) => {
        const cat = item.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    return (
        <div className="h-100 d-flex flex-column">
            {!generatedList ? (
                // Input Form State
                <div className="glass-panel p-5 m-auto rounded-4 shadow-lg border border-white border-opacity-50 text-center" style={{ maxWidth: '600px', width: '100%' }}>
                    <div className="bg-success bg-opacity-10 p-3 rounded-circle d-inline-flex mb-4">
                        <FaSuitcase size={32} className="text-success" />
                    </div>
                    <h3 className="fw-bold mb-2 gradients-text">Smart Packing Assistant</h3>
                    <p className="text-muted mb-4">Tell me where you're going, and I'll pack your bag for you.</p>

                    <Form onSubmit={handleGenerate} className="text-start">
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">Destination</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g., Paris, France"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                className="form-control-lg border-0 bg-light shadow-inner"
                                required
                            />
                        </Form.Group>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold small text-uppercase text-muted">Duration (Days)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="form-control-lg border-0 bg-light"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold small text-uppercase text-muted">Activities (Optional)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Hiking, Swimming..."
                                        value={activities}
                                        onChange={(e) => setActivities(e.target.value)}
                                        className="form-control-lg border-0 bg-light"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Button
                            type="submit"
                            className="w-100 py-3 mt-3 fw-bold btn-gradient text-white border-0 shadow-lg d-flex align-items-center justify-content-center gap-2"
                            disabled={isLoading}
                        >
                            {isLoading ? <Spinner size="sm" animation="border" /> : <><FaMagic /> Generate Packing List</>}
                        </Button>
                    </Form>
                </div>
            ) : (
                // Results State
                <div className="d-flex flex-column h-100">
                    <div className="d-flex align-items-center justify-content-between mb-4 glass-panel p-3 rounded-4">
                        <div className="d-flex align-items-center gap-3">
                            <div className="bg-success bg-opacity-10 p-2 rounded-circle">
                                <FaSuitcase className="text-success" />
                            </div>
                            <div>
                                <h5 className="fw-bold mb-0">Packing for {destination}</h5>
                                <span className="text-muted small">{duration} Days • {generatedList.length} Items</span>
                            </div>
                        </div>
                        <Button variant="light" size="sm" className="rounded-pill px-3 fw-bold" onClick={() => setGeneratedList(null)}>
                            New List
                        </Button>
                    </div>

                    <div className="flex-grow-1 overflow-auto custom-scrollbar px-2">
                        <Row>
                            {Object.entries(groupedItems).map(([category, items]) => (
                                <Col md={6} lg={4} key={category} className="mb-4">
                                    <div className="glass-panel p-3 h-100 rounded-4 border-0 bg-white bg-opacity-40">
                                        <h6 className="fw-bold text-uppercase text-muted x-small mb-3 border-bottom pb-2">{category}</h6>
                                        <div className="d-flex flex-column gap-2">
                                            {items.map((item, idx) => (
                                                <div key={idx} className="d-flex align-items-start gap-2 p-2 rounded-3 hover-bg-light transition-all">
                                                    <Form.Check type="checkbox" defaultChecked={true} className="mt-1" />
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex justify-content-between">
                                                            <span className="fw-medium text-dark">{item.item}</span>
                                                            <Badge bg="light" text="dark" className="border">x{item.quantity}</Badge>
                                                        </div>
                                                        {item.reason && <small className="text-muted d-block x-small lh-sm mt-1">{item.reason}</small>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackingListGenerator;
