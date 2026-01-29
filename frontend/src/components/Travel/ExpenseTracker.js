import React, { useState } from 'react';
import { Card, Table, Button, Form, Modal, Badge, Spinner } from 'react-bootstrap';
import { FaPlus, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useCurrency } from '../../contexts/CurrencyContext';

const ExpenseTracker = ({ tripId }) => {
    const { formatCurrency, currentCurrency } = useCurrency();
    const [expenses, setExpenses] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch expenses on load or currency change
    React.useEffect(() => {
        const fetchExpenses = async () => {
            try {
                const params = tripId ? { trip_id: tripId } : {};
                const response = await axios.get('/api/travel/expenses', { params });
                setExpenses(response.data);
            } catch (error) {
                console.error('Failed to fetch expenses', error);
                toast.error('Could not load expenses');
            }
        };
        fetchExpenses();
    }, [tripId]);
    const [newExpense, setNewExpense] = useState({
        category: 'Other',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    });

    const handleAddExpense = async () => {
        if (!newExpense.amount || !newExpense.description) return;

        setIsLoading(true);
        try {
            const expenseData = {
                ...newExpense,
                amount: parseFloat(newExpense.amount),
                trip_id: tripId,
                currency: currentCurrency
            };

            const response = await axios.post('/api/travel/expenses', expenseData);
            setExpenses([response.data, ...expenses]);
            toast.success('Expense added!');
            setShowAddModal(false);
            setNewExpense({
                category: 'Other',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: ''
            });
        } catch (error) {
            toast.error('Failed to save expense');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteExpense = async (id) => {
        if (!window.confirm("Delete this expense?")) return;
        try {
            await axios.delete(`/api/travel/expenses/${id}`);
            setExpenses(expenses.filter(e => e.id !== id));
            toast.info('Expense deleted');
        } catch (error) {
            toast.error('Failed to delete expense');
        }
    };

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="expense-tracker mt-4">
            <Card className="glass-card border-0">
                <Card.Header className="bg-transparent border-0 d-flex justify-content-between align-items-center p-4">
                    <h5 className="fw-bold mb-0 text-high-vis">Trip Expenses</h5>
                    <Button variant="warning" size="sm" className="rounded-pill px-3 shadow-sm" onClick={() => setShowAddModal(true)}>
                        <FaPlus className="me-1" /> Add
                    </Button>
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="table-responsive">
                        <Table hover className="mb-0 bg-transparent">
                            <thead className="text-muted small">
                                <tr>
                                    <th className="ps-4 border-0">Date</th>
                                    <th className="border-0">Description</th>
                                    <th className="border-0 text-end">Amount ({currentCurrency})</th>
                                    <th className="pe-4 border-0 text-end">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map(expense => (
                                    <tr key={expense.id} className="border-white border-opacity-10">
                                        <td className="ps-4 small">{expense.date}</td>
                                        <td>
                                            <div className="fw-bold">{expense.description}</div>
                                            <Badge bg="warning" text="dark" className="x-small">{expense.category}</Badge>
                                        </td>
                                        <td className="text-end fw-bold">{formatCurrency(expense.amount)}</td>
                                        <td className="pe-4 text-end">
                                            <Button variant="link" size="sm" className="text-danger p-0 border-0" onClick={() => deleteExpense(expense.id)}>
                                                <FaTrash />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                    <div className="p-4 bg-white bg-opacity-5 d-flex justify-content-between align-items-center">
                        <span className="text-muted">Total Spending</span>
                        <h4 className="fw-bold mb-0 text-warning">{formatCurrency(total)}</h4>
                    </div>
                </Card.Body>
            </Card>

            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered contentClassName="glass-panel">
                <Modal.Header closeButton className="border-bottom border-light">
                    <Modal.Title style={{ color: 'var(--text-primary)' }}>Add New Expense</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label className="text-muted small">Description</Form.Label>
                            <Form.Control
                                type="text"
                                className="form-control-custom"
                                placeholder="What did you buy?"
                                value={newExpense.description}
                                onChange={(e) => {
                                    setNewExpense({ ...newExpense, description: e.target.value });
                                    // Debounce categorization
                                    const desc = e.target.value;
                                    if (desc.length > 3) {
                                        const timeoutId = setTimeout(async () => {
                                            try {
                                                const res = await axios.post('/api/ai/categorize/expense', {
                                                    description: desc,
                                                    amount: newExpense.amount
                                                });
                                                if (res.data.category) {
                                                    setNewExpense(prev => ({ ...prev, category: res.data.category }));
                                                }
                                            } catch (err) { }
                                        }, 1000);
                                        return () => clearTimeout(timeoutId);
                                    }
                                }}
                            />
                        </Form.Group>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <Form.Label className="text-muted small">Amount ({currentCurrency})</Form.Label>
                                <Form.Control
                                    type="number"
                                    className="form-control-custom"
                                    placeholder="0.00"
                                    value={newExpense.amount}
                                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label className="text-muted small">Category</Form.Label>
                                <Form.Select
                                    className="form-control-custom"
                                    value={newExpense.category}
                                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                >
                                    <option>Food</option>
                                    <option>Transport</option>
                                    <option>Flights</option>
                                    <option>Hotel</option>
                                    <option>Activities</option>
                                    <option>Other</option>
                                </Form.Select>
                            </div>
                        </div>
                        <Form.Group className="mb-3">
                            <Form.Label className="text-muted small">Date</Form.Label>
                            <Form.Control
                                type="date"
                                className="form-control-custom"
                                value={newExpense.date}
                                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                            />
                        </Form.Group>
                        <Button variant="warning" className="w-100 py-2 mt-2 fw-bold" onClick={handleAddExpense} disabled={isLoading}>
                            {isLoading ? <Spinner size="sm" animation="border" /> : 'Save Expense'}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default ExpenseTracker;
