import React, { useState } from 'react';
import { Form, Button, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import { FaSearch, FaDatabase } from 'react-icons/fa';

const KnowledgeSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/ai/knowledge/search',
                { query, limit: 5 },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setResults(response.data.results);
        } catch (err) {
            console.error('Search error:', err);
            setError('Failed to search knowledge base. Make sure ChromaDB is running.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="knowledge-search p-4">
            <h4 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <FaDatabase className="text-primary" /> RAG Knowledge Base
            </h4>
            <p className="text-muted">Search through our vector database for travel information using semantic similarity.</p>

            <Form onSubmit={handleSearch} className="mb-4">
                <Form.Group className="d-flex gap-2">
                    <Form.Control
                        type="text"
                        placeholder="e.g., How to travel on a budget in Tokyo?"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="glass-input"
                    />
                    <Button type="submit" variant="primary" disabled={isLoading}>
                        {isLoading ? <Spinner animation="border" size="sm" /> : <FaSearch />}
                    </Button>
                </Form.Group>
            </Form>

            {error && <Alert variant="danger">{error}</Alert>}

            {results.length > 0 ? (
                <div className="results-list">
                    <h6 className="mb-3 text-muted">Found {results.length} relevant matches:</h6>
                    <ListGroup variant="flush">
                        {results.map((result, index) => (
                            <ListGroup.Item key={index} className="bg-transparent border-0 px-0 mb-3">
                                <div className="glass-card p-3">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <Badge bg="info">{result.metadata?.destination || 'General'}</Badge>
                                        <small className="text-muted">Similarity Score: {(1 - result.distance).toFixed(2)}</small>
                                    </div>
                                    <p className="mb-1">{result.content}</p>
                                    <small className="text-primary">Source: {result.metadata?.source || 'Knowledge Base'}</small>
                                </div>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </div>
            ) : !isLoading && query && (
                <p className="text-center text-muted py-4">No results found for your query.</p>
            )}

            <style jsx>{`
                .glass-input {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                }
                .glass-input:focus {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    border-color: #f97316;
                    box-shadow: 0 0 0 0.25rem rgba(249, 115, 22, 0.25);
                }
            `}</style>
        </div>
    );
};

export default KnowledgeSearch;
