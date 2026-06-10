import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../api/axios';
import { Card, Table, Badge, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { FaTicketAlt, FaPlus, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';

const TicketManager = ({ tripId }) => {
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTicket, setNewTicket] = useState({
        ticket_type: 'Flight',
        title: '',
        description: '',
        price: '',
        currency: 'INR',
        valid_from: '',
        valid_until: '',
        booking_reference: '',
        confirmation_number: ''
    });

    const fetchTickets = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = tripId ? { trip_id: tripId } : {};
            const response = await axios.get('/api/travel/tickets', { params });
            setTickets(response.data);
        } catch (error) {
            console.error('Failed to fetch tickets', error);
            toast.error('Could not load tickets');
        } finally {
            setIsLoading(false);
        }
    }, [tripId]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleAddTicket = async () => {
        if (!newTicket.title) return;
        setIsLoading(true);
        try {
            const ticketData = {
                ...newTicket,
                trip_id: tripId,
                price: parseFloat(newTicket.price) || 0
            };
            const response = await axios.post('/api/travel/tickets', ticketData);
            setTickets([...tickets, response.data]);
            setShowAddModal(false);
            toast.success('Ticket added successfully');
            setNewTicket({
                ticket_type: 'Flight',
                title: '',
                description: '',
                price: '',
                currency: 'INR',
                valid_from: '',
                valid_until: '',
                booking_reference: '',
                confirmation_number: ''
            });
        } catch {
            toast.error('Failed to add ticket');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteTicket = async (id) => {
        if (!window.confirm("Delete this ticket?")) return;
        try {
            await axios.delete(`/api/travel/tickets/${id}`);
            setTickets(tickets.filter(t => t.id !== id));
            toast.info('Ticket deleted');
        } catch {
            toast.error('Failed to delete ticket');
        }
    };

    const getTicketIcon = (type) => {
        switch (type.toLowerCase()) {
            case 'flight': return '✈️';
            case 'train': return '🚂';
            case 'bus': return '🚌';
            case 'event': return '🎟️';
            default: return '🎫';
        }
    };

    return (
        <div className="ticket-manager mt-4">
            <Card className="glass-card border-0 shadow-sm overflow-hidden">
                <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center p-4">
                    <div className="d-flex align-items-center">
                        <FaTicketAlt className="text-primary me-2" size={20} />
                        <h5 className="fw-black mb-0 text-dark">My Bookings</h5>
                    </div>
                    <Button className="btn-premium py-2 px-4 shadow-sm" onClick={() => setShowAddModal(true)}>
                        <FaPlus className="me-2" /> Add Ticket
                    </Button>
                </Card.Header>
                <Card.Body className="p-0">
                    {isLoading && tickets.length === 0 ? (
                        <div className="text-center p-5"><Spinner animation="grow" variant="primary" /></div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center p-5 text-muted italic">No bookings found for this trip.</div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="mb-0 bg-transparent align-middle">
                                <thead className="bg-light border-bottom">
                                    <tr>
                                        <th className="ps-4 py-3 text-muted small fw-bold">TYPE</th>
                                        <th className="py-3 text-muted small fw-bold">DETAILS</th>
                                        <th className="py-3 text-muted small fw-bold text-end">REF / CONFIRM</th>
                                        <th className="pe-4 py-3 text-muted small fw-bold text-end">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map(ticket => (
                                        <tr key={ticket.id} className="border-light">
                                            <td className="ps-4">
                                                <span className="fs-3">{getTicketIcon(ticket.ticket_type)}</span>
                                            </td>
                                            <td>
                                                <div className="fw-bold text-dark">{ticket.title}</div>
                                                <div className="small text-muted">{ticket.description}</div>
                                                {ticket.valid_from && (
                                                    <Badge className="bg-primary-soft text-primary border-0 rounded-pill px-2 mt-1 fw-bold x-small">
                                                        {new Date(ticket.valid_from).toLocaleDateString()}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="text-end">
                                                <div className="small fw-bold text-dark">{ticket.booking_reference || '-'}</div>
                                                <div className="x-small text-muted fw-bold">{ticket.confirmation_number}</div>
                                            </td>
                                            <td className="pe-4 text-end">
                                                <Button variant="light" size="sm" className="text-danger rounded-pill p-2 border-0" onClick={() => deleteTicket(ticket.id)}>
                                                    <FaTrash size={12} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
                <div className="glass-card p-4 border-0 shadow-lg">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4 className="fw-black mb-0">Add Booking Detail</h4>
                        <FaTicketAlt className="text-primary" />
                    </div>
                    <Form onSubmit={(e) => { e.preventDefault(); handleAddTicket(); }}>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <Form.Label className="text-muted small fw-bold">TYPE</Form.Label>
                                <Form.Select
                                    className="form-control-premium"
                                    value={newTicket.ticket_type}
                                    onChange={(e) => setNewTicket({ ...newTicket, ticket_type: e.target.value })}
                                >
                                    <option>Flight</option>
                                    <option>Train</option>
                                    <option>Bus</option>
                                    <option>Event</option>
                                    <option>Museum</option>
                                    <option>Other</option>
                                </Form.Select>
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label className="text-muted small fw-bold">TITLE</Form.Label>
                                <Form.Control
                                    type="text"
                                    className="form-control-premium"
                                    placeholder="e.g. Flight to Paris"
                                    value={newTicket.title}
                                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                                />
                            </div>
                        </div>
                        <Form.Group className="mb-3">
                            <Form.Label className="text-muted small fw-bold">DESCRIPTION</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                className="form-control-premium"
                                placeholder="Additional details..."
                                value={newTicket.description}
                                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                            />
                        </Form.Group>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <Form.Label className="text-muted small fw-bold">REF NUMBER</Form.Label>
                                <Form.Control
                                    type="text"
                                    className="form-control-premium"
                                    value={newTicket.booking_reference}
                                    onChange={(e) => setNewTicket({ ...newTicket, booking_reference: e.target.value })}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label className="text-muted small fw-bold">PRICE</Form.Label>
                                <Form.Control
                                    type="number"
                                    className="form-control-premium"
                                    value={newTicket.price}
                                    onChange={(e) => setNewTicket({ ...newTicket, price: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <Form.Label className="text-muted small fw-bold">START DATE</Form.Label>
                                <Form.Control
                                    type="datetime-local"
                                    className="form-control-premium"
                                    value={newTicket.valid_from}
                                    onChange={(e) => setNewTicket({ ...newTicket, valid_from: e.target.value })}
                                />
                            </div>
                            <div className="col-md-6 mb-4">
                                <Form.Label className="text-muted small fw-bold">END DATE</Form.Label>
                                <Form.Control
                                    type="datetime-local"
                                    className="form-control-premium"
                                    value={newTicket.valid_until}
                                    onChange={(e) => setNewTicket({ ...newTicket, valid_until: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                            <Button variant="light" className="flex-grow-1 rounded-pill fw-bold" onClick={() => setShowAddModal(false)}>CANCEL</Button>
                            <Button type="submit" className="btn-premium flex-grow-1 justify-content-center" disabled={isLoading}>
                                {isLoading ? <Spinner size="sm" animation="border" /> : 'SAVE BOOKING'}
                            </Button>
                        </div>
                    </Form>
                </div>
            </Modal>
        </div>
    );
};

export default TicketManager;
