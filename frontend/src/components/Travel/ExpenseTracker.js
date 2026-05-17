import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, Badge, Spinner } from 'react-bootstrap';
import { FaPlus, FaTrash } from 'react-icons/fa';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import { useCurrency } from '../../contexts/CurrencyContext';

const ExpenseTracker = ({ tripId }) => {
    const { formatCurrency, currentCurrency, convertToUSD } = useCurrency();
    const [expenses, setExpenses] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch expenses on load or tripId change
    useEffect(() => {
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

    // AI Categorization Debounce — calls the chat endpoint as a lightweight workaround
    // since a dedicated /api/ai/categorize/expense route does not exist
    useEffect(() => {
        if (newExpense.description.length > 3) {
            const timeoutId = setTimeout(async () => {
                try {
                    const res = await axios.post('/api/ai/chat', {
                        message: `Categorize this expense in one word (Food/Transport/Flights/Hotel/Activities/Other): "${newExpense.description}" amount: ${newExpense.amount}. Reply with ONLY the category word.`,
                        save_to_history: false
                    });
                    const raw = res.data?.ai_response?.trim();
                    const validCategories = ['Food', 'Transport', 'Flights', 'Hotel', 'Activities', 'Other'];
                    // Match case-insensitively
                    const matched = validCategories.find(c => raw?.toLowerCase().includes(c.toLowerCase()));
                    if (matched) {
                        setNewExpense(prev => ({ ...prev, category: matched }));
                    }
                } catch (err) {
                    // Silently fail — AI categorization is a nice-to-have
                    console.debug('AI categorization skipped:', err.message);
                }
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [newExpense.description, newExpense.amount]);

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
        } catch {
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
        } catch {
            toast.error('Failed to delete expense');
        }
    };

    const total = expenses.reduce((sum, e) => {
        const amountInUSD = convertToUSD(e.amount, e.currency);
        return sum + amountInUSD;
    }, 0);

    return (
        <div className="expense-tracker mt-4">
            <Card className="glass-card border-0 shadow-sm overflow-hidden">
                <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center p-4">
                    <h5 className="fw-black mb-0 text-dark">Trip Expenses</h5>
                    <Button className="btn-premium py-2 px-4 shadow-sm" onClick={() => setShowAddModal(true)}>
                        <FaPlus className="me-2" /> Add Record
                    </Button>
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="table-responsive">
                        <Table hover className="mb-0 bg-transparent align-middle">
                            <thead className="bg-light border-bottom">
                                <tr>
                                    <th className="ps-4 py-3 text-muted small fw-bold">DATE</th>
                                    <th className="py-3 text-muted small fw-bold">DESCRIPTION</th>
                                    <th className="py-3 text-muted small fw-bold text-end">AMOUNT ({currentCurrency})</th>
                                    <th className="pe-4 py-3 text-muted small fw-bold text-end">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-5 text-muted italic">
                                            <div className="opacity-50">No expenses recorded yet.</div>
                                        </td>
                                    </tr>
                                ) : expenses.map(expense => (
                                    <tr key={expense.id} className="border-light">
                                        <td className="ps-4 small fw-bold text-muted">{expense.date}</td>
                                        <td>
                                            <div className="fw-bold text-dark">{expense.description}</div>
                                            <Badge bg="primary" className="x-small rounded-pill bg-primary-gradient border-0 px-2">{expense.category}</Badge>
                                        </td>
                                        <td className="text-end fw-bold text-dark">{formatCurrency(expense.amount, currentCurrency, expense.currency)}</td>
                                        <td className="pe-4 text-end">
                                            <Button variant="light" size="sm" className="text-danger rounded-pill p-2 border-0" onClick={() => deleteExpense(expense.id)}>
                                                <FaTrash size={12} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                    <div className="p-4 bg-primary-gradient bg-opacity-10 d-flex justify-content-between align-items-center">
                        <span className="text-dark fw-bold opacity-75">Total Adventure Spend</span>
                        <h3 className="fw-black mb-0 text-primary">{formatCurrency(total)}</h3>
                    </div>
                </Card.Body>
            </Card>

            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
                <div className="glass-card p-4 border-0 shadow-lg">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4 className="fw-black mb-0">Add Expense</h4>
                        <FaPlus className="text-primary" />
                    </div>
                    <Form onSubmit={(e) => { e.preventDefault(); handleAddExpense(); }}>
                        <Form.Group className="mb-3">
                            <Form.Label className="text-muted small fw-bold">DESCRIPTION</Form.Label>
                            <Form.Control
                                type="text"
                                className="form-control-premium"
                                placeholder="What did you buy?"
                                value={newExpense.description}
                                onChange={(e) => {
                                    setNewExpense({ ...newExpense, description: e.target.value });
                                }}
                            />
                        </Form.Group>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <Form.Label className="text-muted small fw-bold">AMOUNT ({currentCurrency})</Form.Label>
                                <Form.Control
                                    type="number"
                                    className="form-control-premium"
                                    placeholder="0.00"
                                    value={newExpense.amount}
                                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label className="text-muted small fw-bold">CATEGORY</Form.Label>
                                <Form.Select
                                    className="form-control-premium"
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
                        <Form.Group className="mb-4">
                            <Form.Label className="text-muted small fw-bold">DATE</Form.Label>
                            <Form.Control
                                type="date"
                                className="form-control-premium"
                                value={newExpense.date}
                                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                            />
                        </Form.Group>
                        <div className="d-flex gap-2">
                            <Button variant="light" className="flex-grow-1 rounded-pill fw-bold" onClick={() => setShowAddModal(false)}>CANCEL</Button>
                            <Button type="submit" className="btn-premium flex-grow-1 justify-content-center" disabled={isLoading}>
                                {isLoading ? <Spinner size="sm" animation="border" /> : 'SAVE'}
                            </Button>
                        </div>
                    </Form>
                </div>
            </Modal>
        </div>
    );
};

export default ExpenseTracker;
