import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import { useCurrency } from '../../contexts/CurrencyContext';
import {
    FaClock,
    FaUtensils,
    FaCamera,
    FaCar,
    FaBed,
    FaMoneyBillWave,
    FaMapMarkerAlt
} from 'react-icons/fa';

const ItineraryView = ({ itinerary, tripDuration }) => {
    const { formatCurrency } = useCurrency();

    // Friendly empty state
    if (!itinerary || !itinerary.days || itinerary.days.length === 0) {
        return (
            <div className="text-center py-5 glass-panel rounded-3">
                <div className="mb-3 text-muted opacity-50">
                    <FaMapMarkerAlt size={48} />
                </div>
                <h5 className="fw-bold text-muted">No Itinerary Generated Yet</h5>
                <p className="text-muted small mb-0">
                    Go to the <strong>AI Hub</strong> to plan your trip and generate a daily schedule!
                </p>
            </div>
        );
    }

    const getActivityIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'food':
                return <FaUtensils className="text-warning" />;
            case 'transport':
                return <FaCar className="text-info" />;
            case 'relaxation':
                return <FaBed className="text-primary" />;
            case 'sightseeing':
            default:
                return <FaCamera className="text-success" />;
        }
    };

    return (
        <div className="itinerary-view">
            {/* Summary Card */}
            <div className="glass-panel p-4 mb-4 border-start border-4 border-warning shadow-sm bg-white">
                <div className="d-flex justify-content-between align-items-start mb-2">
                    <h3 className="fw-bold mb-0 text-dark">{itinerary.trip_title || "Your Trip Itinerary"}</h3>
                    {itinerary.estimated_total_cost > 0 && (
                        <Badge bg="success" className="p-2 px-3 shadow-sm rounded-pill">
                            <FaMoneyBillWave className="me-2" />
                            {formatCurrency(itinerary.estimated_total_cost)}
                        </Badge>
                    )}
                </div>
                <p className="text-secondary mb-3" style={{ lineHeight: '1.6' }}>
                    {itinerary.summary || "Here is your suggested daily plan."}
                </p>
                <div className="d-flex gap-2">
                    <Badge bg="light" text="dark" className="border shadow-sm">
                        <FaClock className="me-1 text-muted" /> {itinerary.days.length} Days Planned
                    </Badge>
                </div>
            </div>

            {/* Timeline */}
            <div className="timeline-container position-relative ps-3">
                {/* Vertical Line */}
                <div
                    className="position-absolute h-100 bg-warning bg-opacity-25 rounded"
                    style={{ left: '0px', width: '4px', top: '20px' }}
                ></div>

                {itinerary.days.map((day, index) => (
                    <div key={index} className="mb-5 position-relative ps-4">
                        {/* Day Dot */}
                        <div
                            className="position-absolute bg-warning rounded-circle border border-white border-3 shadow-sm d-flex align-items-center justify-content-center fw-bold text-white small"
                            style={{ width: '30px', height: '30px', left: '-13px', top: '0px', fontSize: '0.8rem' }}
                        >
                            {day.day}
                        </div>

                        <h5 className="d-flex align-items-center gap-2 mb-3 mt-1">
                            <span className="fw-bold text-dark">Day {day.day}</span>
                            <span className="text-muted fw-light">|</span>
                            <span className="text-primary fw-bold text-uppercase small" style={{ letterSpacing: '1px' }}>{day.title}</span>
                        </h5>

                        <div className="d-flex flex-column gap-3">
                            {day.activities?.map((activity, actIndex) => (
                                <Card key={actIndex} className="border-0 shadow-sm hover-lift transition-all bg-white" style={{ borderRadius: '15px' }}>
                                    <Card.Body className="p-3">
                                        <div className="d-flex">
                                            <div className="me-3 mt-1">
                                                <div className="rounded-circle bg-light p-2 d-flex justify-content-center align-items-center" style={{ width: '40px', height: '40px' }}>
                                                    {getActivityIcon(activity.type)}
                                                </div>
                                            </div>

                                            <div className="flex-grow-1">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <h6 className="fw-bold mb-0 text-dark">{activity.activity}</h6>
                                                    <Badge bg="light" text="dark" className="fw-normal border">
                                                        {activity.time}
                                                    </Badge>
                                                </div>
                                                <p className="small text-secondary mb-2">{activity.description}</p>

                                                {activity.estimated_cost > 0 && (
                                                    <div className="text-end">
                                                        <span className="badge bg-warning bg-opacity-10 text-warning px-2 py-1 rounded-pill small fst-italic">
                                                            Est. {formatCurrency(activity.estimated_cost)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .hover-lift:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.05) !important;
                }
                .transition-all {
                    transition: all 0.3s ease;
                }
            `}</style>
        </div>
    );
};

export default ItineraryView;
