import React, { useState } from 'react';
import { Card, Form, ListGroup, Button, ProgressBar, Badge } from 'react-bootstrap';
import { FaSuitcase, FaCheck, FaPlus } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';

const PackingList = ({ tripId }) => {
    const [items, setItems] = useState([]);
    const [newItem, setNewItem] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch packing list
    React.useEffect(() => {
        const fetchItems = async () => {
            try {
                const params = tripId ? { trip_id: tripId } : {};
                const response = await axios.get('/api/travel/packing-list', { params });
                setItems(response.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchItems();
    }, [tripId]);

    const toggleItem = async (id) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        // Optimistic update
        const updatedItems = items.map(i => i.id === id ? { ...i, is_packed: !i.is_packed } : i);
        setItems(updatedItems);

        try {
            await axios.put(`/api/travel/packing-list/${id}`, { is_packed: !item.is_packed });
        } catch (error) {
            // Revert on error
            setItems(items);
            toast.error('Failed to update item');
        }
    };

    const addItem = async (e) => {
        e.preventDefault();
        if (!newItem.trim()) return;

        setIsLoading(true);
        try {
            const itemData = {
                item: newItem,
                category: 'General',
                trip_id: tripId,
                is_packed: false
            };
            const response = await axios.post('/api/travel/packing-list', itemData);
            setItems([...items, response.data]);
            setNewItem('');
        } catch (error) {
            toast.error('Failed to add item');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateList = async () => {
        const destination = prompt("Where are you going?");
        if (!destination) return;

        setIsLoading(true);
        try {
            const response = await axios.post('/api/ai/generate/packing-list', {
                destination: destination,
                duration: 7 // Default or ask user
            });

            // Map response items to what we want to send to backend
            const itemsToCreate = response.data.map(i => ({
                item: i.item,
                category: i.category,
                reason: i.reason,
                quantity: i.quantity || 1,
                trip_id: tripId,
                is_packed: false
            }));

            // Save all items to backend and get REAL IDs back
            // Use Promise.allSettled to ensure we capture all results even if some fail
            const results = await Promise.allSettled(
                itemsToCreate.map(item => axios.post('/api/travel/packing-list', item))
            );

            const savedItems = results
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value.data);

            // Log any failures
            const errors = results.filter(r => r.status === 'rejected');
            if (errors.length > 0) {
                console.error("Some items failed to save", errors);
                toast.warning(`Saved ${savedItems.length} items. ${errors.length} items failed to save.`);
            } else {
                toast.success('Smart packing list generated!');
            }

            // Update state with backend confirmed items
            setItems(prevItems => [...prevItems, ...savedItems]);
        } catch (error) {
            console.error("Generate list error", error);
            toast.error('Failed to generate list');
        } finally {
            setIsLoading(false);
        }
    };

    const checkedCount = items.filter(i => i.is_packed).length;
    const progress = Math.round((checkedCount / items.length) * 100);

    return (
        <Card className="glass-card border-0 h-100">
            <Card.Header className="bg-transparent border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0 text-high-vis text-warning">
                    <FaSuitcase className="me-2" /> Packing List
                </h5>
                <div className="d-flex gap-2">
                    <Button variant="outline-warning" size="sm" onClick={handleGenerateList} disabled={isLoading}>
                        {isLoading ? 'Generating...' : '✨ AI Generate'}
                    </Button>
                    <Badge bg="warning" text="dark" className="align-self-center">{progress}% Done</Badge>
                </div>
            </Card.Header>
            <Card.Body className="p-4">
                <ProgressBar now={progress} variant="warning" className="mb-4 bg-warning bg-opacity-10" style={{ height: '8px' }} />

                <Form onSubmit={addItem} className="mb-3">
                    <div className="input-group">
                        <Form.Control
                            type="text"
                            className="form-control-custom bg-white bg-opacity-50"
                            placeholder="Add item..."
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                        />
                        <Button variant="warning" type="submit">
                            <FaPlus className="text-white" />
                        </Button>
                    </div>
                </Form>

                <ListGroup variant="flush" className="bg-transparent">
                    {items.map(item => (
                        <ListGroup.Item
                            key={item.id}
                            onClick={() => toggleItem(item.id)}
                            className="bg-transparent border-warning border-opacity-10 d-flex align-items-center py-2 px-0 cursor-pointer"
                            style={{ cursor: 'pointer', color: 'var(--text-primary)' }}
                        >
                            <div className={`me-3 rounded-circle d-flex align-items-center justify-content-center ${item.is_packed ? 'bg-warning text-white' : 'border border-warning border-opacity-30'}`} style={{ width: '20px', height: '20px' }}>
                                {item.is_packed && <FaCheck size={10} />}
                            </div>
                            <span className={item.is_packed ? 'text-decoration-line-through text-muted' : 'fw-bold'}>
                                {item.item}
                            </span>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            </Card.Body>
        </Card>
    );
};

export default PackingList;
