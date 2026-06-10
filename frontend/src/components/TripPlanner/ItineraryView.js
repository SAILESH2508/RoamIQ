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

const extractActivitiesAndTitle = (dayData, idx) => {
    if (!dayData) return { title: `Day ${idx + 1}`, activities: [], dayNum: idx + 1 };
    
    if (typeof dayData === 'string') {
        return {
            title: dayData,
            activities: [dayData],
            dayNum: idx + 1
        };
    }
    
    if (Array.isArray(dayData)) {
        return {
            title: `Day ${idx + 1}`,
            activities: dayData,
            dayNum: idx + 1
        };
    }
    
    let dayNum = dayData.day || dayData.day_number || dayData.dayNumber || (idx + 1);
    let title = dayData.title || dayData.theme || `Day ${dayNum}`;
    let activities = [];
    
    const standardActivities = dayData.activities || dayData.plan || dayData.schedule || dayData.events;
    if (standardActivities) {
        if (Array.isArray(standardActivities)) {
            activities = standardActivities;
        } else if (typeof standardActivities === 'object' && standardActivities !== null) {
            activities = Object.entries(standardActivities).map(([time, act]) => {
                if (typeof act === 'object' && act !== null) {
                    return { time: act.time || time, ...act };
                }
                return { time, activity: act };
            });
        } else {
            activities = [standardActivities];
        }
    } else {
        const keys = Object.keys(dayData).filter(k => k !== 'day' && k !== 'day_number' && k !== 'dayNumber' && k !== 'title' && k !== 'theme' && k !== 'date' && k !== 'estimated_cost');
        
        if (keys.length > 0) {
            const dayKey = keys.find(k => k.toLowerCase().includes('day')) || keys[0];
            const val = dayData[dayKey];
            
            const match = dayKey.match(/day[_\s]*(\d+)/i);
            if (match) {
                dayNum = parseInt(match[1], 10);
                title = dayData.title || dayData.theme || `Day ${dayNum}`;
            }
            
            if (Array.isArray(val)) {
                activities = val;
            } else if (typeof val === 'object' && val !== null) {
                activities = Object.entries(val).map(([time, act]) => {
                    if (typeof act === 'object' && act !== null) {
                        return { time: act.time || time, ...act };
                    }
                    return { time, activity: act };
                });
            } else if (val) {
                activities = [val];
            }
        }
    }
    
    return { title, activities, dayNum };
};

const ItineraryView = ({ itinerary }) => {
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
                return <FaUtensils className="text-primary" />;
            case 'transport':
                return <FaCar className="text-primary" />;
            case 'relaxation':
                return <FaBed className="text-primary" />;
            case 'sightseeing':
            default:
                return <FaCamera className="text-primary" />;
        }
    };

    return (
        <div className="itinerary-view">
            {/* Summary Card */}
            <div className="glass-card p-4 mb-5 border-start border-4 border-primary shadow-sm bg-white overflow-hidden position-relative">
                <div className="d-flex justify-content-between align-items-start mb-3">
                    <h3 className="fw-black mb-0 text-dark">{itinerary.trip_title || "Your Trip Itinerary"}</h3>
                    {itinerary.estimated_total_cost > 0 && (
                        <Badge className="p-2 px-3 shadow-sm rounded-pill bg-primary-gradient border-0">
                            <FaMoneyBillWave className="me-2" />
                            {formatCurrency(itinerary.estimated_total_cost)}
                        </Badge>
                    )}
                </div>
                <p className="text-secondary mb-3 fw-medium" style={{ lineHeight: '1.7' }}>
                    {itinerary.summary || "Here is your suggested daily plan."}
                </p>
                <div className="d-flex gap-2">
                    <Badge bg="white" text="dark" className="border shadow-sm rounded-pill px-3 py-2 fw-bold text-uppercase x-small">
                        <FaClock className="me-2 text-primary" /> {itinerary.days.length} Days Planned
                    </Badge>
                </div>
            </div>

            {/* Timeline */}
            <div className="timeline-container position-relative ps-3">
                {/* Vertical Line */}
                <div
                    className="position-absolute h-100 rounded"
                    style={{ left: '0px', width: '4px', top: '20px', background: 'linear-gradient(to bottom, var(--primary) 0%, transparent 100%)', opacity: 0.2 }}
                ></div>

                {itinerary.days.map((dayData, index) => {
                    const { title: dayTitle, activities: rawActivities, dayNum } = extractActivitiesAndTitle(dayData, index);
                    
                    return (
                        <div key={index} className="mb-5 position-relative ps-4">
                            {/* Day Dot */}
                            <div
                                className="position-absolute bg-primary-gradient rounded-circle border border-white border-3 shadow-md d-flex align-items-center justify-content-center fw-black text-white small animate-pop-up"
                                style={{ width: '36px', height: '36px', left: '-16px', top: '-4px', fontSize: '0.9rem' }}
                            >
                                {dayNum}
                            </div>

                            <h5 className="d-flex align-items-center gap-3 mb-4 mt-0">
                                <span className="fw-black text-dark fs-4">Day {dayNum}</span>
                                <span className="text-muted opacity-25">/</span>
                                <span className="text-primary fw-black text-uppercase small" style={{ letterSpacing: '2px' }}>{dayTitle}</span>
                            </h5>

                            <div className="d-flex flex-column gap-3">
                                {rawActivities?.map((activity, actIndex) => {
                                const isObj = activity && typeof activity === 'object';
                                const activityTitle = isObj ? (activity.activity || '') : activity;
                                const activityDesc = isObj ? activity.description : '';
                                const activityTime = isObj ? activity.time : '';
                                const activityType = isObj ? activity.type : '';
                                const activityCost = isObj ? activity.estimated_cost : 0;
                                
                                return (
                                    <Card key={actIndex} className="border-0 shadow-sm hover-lift transition-all bg-white overflow-hidden" style={{ borderRadius: '20px' }}>
                                        <Card.Body className="p-4">
                                            <div className="d-flex align-items-start">
                                                <div className="me-4 mt-1">
                                                    <div className="rounded-circle bg-primary-soft p-3 d-flex justify-content-center align-items-center" style={{ width: '50px', height: '50px' }}>
                                                        {getActivityIcon(activityType)}
                                                    </div>
                                                </div>

                                                <div className="flex-grow-1">
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <h6 className="fw-bold fs-5 mb-0 text-dark">{activityTitle}</h6>
                                                        {activityTime && (
                                                            <Badge bg="light" text="dark" className="fw-bold border rounded-pill px-3 py-1 small">
                                                                {activityTime}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {activityDesc && <p className="text-secondary mb-3 fw-medium">{activityDesc}</p>}

                                                    {activityCost > 0 && (
                                                        <div className="text-start">
                                                            <span className="badge bg-primary-soft text-primary px-3 py-2 rounded-pill small fw-bold">
                                                                <FaMoneyBillWave className="me-2" /> Est. {formatCurrency(activityCost)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                 );
                             })}
                        </div>
                    </div>
                );
            })}
            </div>

            <style>{`
                .hover-lift:hover {
                    transform: translateY(-5px) scale(1.01);
                    box-shadow: 0 20px 40px rgba(255, 122, 0, 0.1) !important;
                }
                .transition-all {
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .fw-black { font-weight: 900; }
            `}</style>
        </div>
    );
};

export default ItineraryView;
