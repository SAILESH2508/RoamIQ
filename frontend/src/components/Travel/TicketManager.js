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
        } catch (error) {
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
        } catch (error) {
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
            <Card className="glass-card border-0">
                <Card.Header className="bg-transparent border-0 d-flex justify-content-between align-items-center p-4">
                    <div className="d-flex align-items-center">
                        <FaTicketAlt className="text-warning me-2" size={20} />
                        <h5 className="fw-bold mb-0 text-high-vis">My Bookings</h5>
                    </div>
                    <Button variant="warning" size="sm" className="rounded-pill px-3 shadow-sm" onClick={() => setShowAddModal(true)}>
                        <FaPlus className="me-1" /> Add Ticket
                    </Button>
                </Card.Header>
                <Card.Body className="p-0">
                    {isLoading && tickets.length === 0 ? (
                        <div className="text-center p-5"><Spinner animation="border" variant="warning" /></div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center p-5 text-muted">No bookings found for this trip.</div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="mb-0 bg-transparent">
                                <thead className="text-muted small">
                                    <tr>
                                        <th className="ps-4 border-0">Type</th>
                                        <th className="border-0">Details</th>
                                        <th className="border-0 text-end">Ref / Confirm</th>
                                        <th className="pe-4 border-0 text-end">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map(ticket => (
                                        <tr key={ticket.id} className="border-white border-opacity-10 align-middle">
                                            <td className="ps-4">
                                                <span className="fs-4">{getTicketIcon(ticket.ticket_type)}</span>
                                            </td>
                                            <td>
                                                <div className="fw-bold text-high-vis">{ticket.title}</div>
                                                <div className="small text-muted">{ticket.description}</div>
                                                {ticket.valid_from && (
                                                    <Badge bg="info" className="me-2">{new Date(ticket.valid_from).toLocaleDateString()}</Badge>
                                                )}
                                            </td>
                                            <td className="text-end">
                                                <div className="small fw-bold">{ticket.booking_reference || '-'}</div>
                                                <div className="x-small text-muted">{ticket.confirmation_number}</div>
                                            </td>
                                            <td className="pe-4 text-end">
                                                <Button variant="link" size="sm" className="text-danger p-0 border-0" onClick={() => deleteTicket(ticket.id)}>
                                                    <FaTrash />
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

            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered contentClassName="glass-panel">
                <Modal.Header closeButton className="border-bottom border-light">
                    <Modal.Title className="text-high-vis">Add Booking Detail</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <Form.Label className="text-muted small">Type</Form.Label>
                                <Form.Select
                                    className="form-control-custom"
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
                                <Form.Label className="text-muted small">Title</Form.Label>
                                <Form.Control
                                    type="text"
                                    className="form-control-custom"
                                    placeholder="e.g. Flight to Paris"
                                    value={newTicket.title}
                                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                                />
                            </div>
                        </div>
                        <Form.Group className="mb-3">
                            <Form.Label className="text-muted small">Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                className="form-control-custom"
                                placeholder="Additional details..."
                                value={newTicket.description}
                                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                            />
                        </Form.Group>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <Form.Label className="text-muted small">Ref Number</Form.Label>
                                <Form.Control
                                    type="text"
                                    className="form-control-custom"
                                    value={newTicket.booking_reference}
                                    onChange={(e) => setNewTicket({ ...newTicket, booking_reference: e.target.value })}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label className="text-muted small">Amount (INR)</Form.Label>
                                <Form.Control
                                    type="number"
                                    className="form-control-custom"
                                    value={newTicket.price}
                                    onChange={(e) => setNewTicket({ ...newTicket, price: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <Form.Label className="text-muted small">Start Date</Form.Label>
                                <Form.Control
                                    type="datetime-local"
                                    className="form-control-custom"
                                    value={newTicket.valid_from}
                                    onChange={(e) => setNewTicket({ ...newTicket, valid_from: e.target.value })}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label className="text-muted small">End Date</Form.Label>
                                <Form.Control
                                    type="datetime-local"
                                    className="form-control-custom"
                                    value={newTicket.valid_until}
                                    onChange={(e) => setNewTicket({ ...newTicket, valid_until: e.target.value })}
                                />
                            </div>
                        </div>
                        <Button variant="warning" className="w-100 py-2 mt-2 fw-bold" onClick={handleAddTicket} disabled={isLoading}>
                            {isLoading ? <Spinner size="sm" animation="border" /> : 'Save Booking'}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default TicketManager;
