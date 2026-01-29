import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import {
    FaClock,
    FaUtensils,
    FaCamera,
    FaCar,
    FaBed,
    FaMoneyBillWave
} from 'react-icons/fa';

const ItineraryView = ({ itinerary }) => {
    if (!itinerary) return null;

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
        <div className="itinerary-view mt-4">
            <div className="glass-panel p-4 mb-4">
                <h3 className="fw-bold mb-2 gradients-text">{itinerary.trip_title}</h3>
                <p className="text-muted mb-3 fw-medium">{itinerary.summary}</p>
                <div className="d-flex align-items-center">
                    <Badge bg="success" className="me-2 p-2">
                        <FaMoneyBillWave className="me-1" />
                        Est. Cost: ${itinerary.estimated_total_cost}
                    </Badge>
                    <Badge bg="info" className="p-2">
                        {itinerary.days?.length} Days
                    </Badge>
                </div>
            </div>

            <div className="timeline-container">
                {itinerary.days?.map((day, index) => (
                    <div key={index} className="mb-4">
                        <h5 className="text-primary mb-3 border-bottom border-warning border-opacity-20 pb-2 d-inline-block fw-bold">
                            Day {day.day}: <span className="fw-light">{day.title}</span>
                        </h5>

                        <div className="d-flex flex-column gap-3">
                            {day.activities?.map((activity, actIndex) => (
                                <Card key={actIndex} className="glass-panel border-0" style={{ color: 'var(--text-primary)' }}>
                                    <Card.Body className="p-3">
                                        <div className="d-flex">
                                            <div className="me-3 d-flex flex-column align-items-center">
                                                <div className="rounded-circle bg-white bg-opacity-10 p-2 mb-1 d-flex justify-content-center align-items-center" style={{ width: '40px', height: '40px' }}>
                                                    {getActivityIcon(activity.type)}
                                                </div>
                                                <div className="h-100 border-start border-white border-opacity-25" style={{ width: '1px' }}></div>
                                            </div>

                                            <div className="flex-grow-1">
                                                <div className="d-flex justify-content-between align-items-start mb-1">
                                                    <h6 className="fw-bold mb-0 text-primary">{activity.activity}</h6>
                                                    <small className="text-info">
                                                        <FaClock className="me-1" />
                                                        {activity.time}
                                                    </small>
                                                </div>
                                                <p className="small text-muted mb-2 fw-medium">{activity.description}</p>
                                                {activity.estimated_cost > 0 && (
                                                    <Badge bg="warning" text="dark" className="bg-opacity-25 fw-bold">
                                                        ${activity.estimated_cost}
                                                    </Badge>
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
        </div>
    );
};

export default ItineraryView;
