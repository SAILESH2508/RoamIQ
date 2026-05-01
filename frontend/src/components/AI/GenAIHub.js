import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Button, Form, Modal, Spinner, Badge, Col, Dropdown } from 'react-bootstrap';
import {
    FaRobot, FaPaperPlane, FaMicrophone, FaPlus, FaTrash,
    FaImage, FaSuitcase, FaTimes, FaUser, FaMapMarkedAlt, FaSync, FaCalendar, FaFilePdf,
    FaChartBar, FaEdit, FaEllipsisV, FaCheck
} from 'react-icons/fa';
import LocationTracker from '../Travel/LocationTracker';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useAuth } from '../../contexts/AuthContext';

const GenAIHub = () => {
    const { currentCurrency, formatCurrency } = useCurrency();

    // Core State
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(() => localStorage.getItem('roamiq_active_conv_id') || uuidv4());
    const [conversations, setConversations] = useState([]);
    const [upcomingTrip, setUpcomingTrip] = useState(null);

    // Feature States
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [checkListPrompt, setChecklistPrompt] = useState({ show: false, dest: '', days: 7 });
    
    // Conversation Management
    const [editingConvId, setEditingConvId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveData, setSaveData] = useState({ title: '', destination: '', startDate: '', endDate: '', budget: '' });
    
    const messagesEndRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const fileInputRef = useRef(null);

    // --- Data Fetching ---
    const fetchConversations = React.useCallback(async () => {
        try {
            const res = await axios.get('/api/ai/chat/conversations');
            setConversations(res.data);
        } catch (err) {
            console.error("Failed to fetch conversations", err);
        }
    }, []);

    const fetchUpcomingTrip = React.useCallback(async () => {
        try {
            const res = await axios.get('/api/travel/trips');
            const trips = res.data.trips || [];
            if (trips.length > 0) {
                // Find the first upcoming trip
                const now = new Date();
                const next = trips.find(t => t.start_date && new Date(t.start_date) > now) || trips[0];
                setUpcomingTrip(next);
            }
        } catch (err) {
            console.error("Failed to fetch upcoming trip", err);
        }
    }, []);

    const loadConversation = React.useCallback(async (id) => {
        setIsLoading(true);
        try {
            const res = await axios.get(`/api/ai/chat/history/${id}`);
            const formatted = res.data.map(msg => ({
                id: msg.id,
                type: msg.role === 'user' ? 'user' : 'ai',
                content: msg.content,
                timestamp: new Date(msg.timestamp)
            }));
            setMessages(formatted.length > 0 ? formatted : []);
            setConversationId(id);
            localStorage.setItem('roamiq_active_conv_id', id);
        } catch (err) {
            toast.error("Failed to load chat history");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
        fetchUpcomingTrip();
        const existingId = localStorage.getItem('roamiq_active_conv_id');
        if (existingId && messages.length === 0) {
            loadConversation(existingId);
        }
    }, [fetchConversations, fetchUpcomingTrip, loadConversation, messages.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- Conversation Actions ---
    const handleDeleteConversation = async (id) => {
        if (!window.confirm("Delete this adventure? This cannot be undone.")) return;
        try {
            await axios.delete(`/api/ai/chat/conversations/${id}`);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (id === conversationId) {
                setMessages([]);
                setConversationId(uuidv4());
            }
            toast.success("Adventure deleted.");
        } catch (err) {
            toast.error("Failed to delete.");
        }
    };

    const sendWelcomeMessage = React.useCallback(() => {
        const welcome = {
            id: 'welcome-' + Date.now(),
            type: 'ai',
            content: `Hello! I'm **AURA**, your RoamIQ AI Studio assistant. 🌍\n\nI can help you plan complex itineraries, analyze travel receipts, or summarize PDF documents. How can I assist with your next adventure today?`,
            timestamp: new Date()
        };
        setMessages([welcome]);
    }, []);

    useEffect(() => {
        if (messages.length === 0 && !isLoading) {
            sendWelcomeMessage();
        }
    }, [messages.length, isLoading, sendWelcomeMessage]);

    const handleRenameConversation = async (id) => {
        if (!editTitle.trim()) return setEditingConvId(null);
        try {
            await axios.patch(`/api/ai/chat/conversations/${id}`, { title: editTitle });
            setConversations(prev => prev.map(c => c.id === id ? { ...c, title: editTitle } : c));
            setEditingConvId(null);
        } catch (err) {
            toast.error("Failed to rename.");
        }
    };

    // --- Message Handling ---
    const addMessage = (content, type = 'user', extras = {}) => {
        setMessages(prev => [...prev, {
            id: Date.now(),
            type,
            content,
            timestamp: new Date(),
            ...extras
        }]);
    };

    const handleSendMessage = async (overrideText = null) => {
        const textToSend = typeof overrideText === 'string' ? overrideText : inputMessage;
        if (!textToSend.trim() && !selectedFile) return;

        const currentMsg = textToSend;
        const currentFile = selectedFile;

        if (typeof overrideText !== 'string') setInputMessage('');
        setSelectedFile(null);
        setFilePreview(null);

        // File Analysis Flow
        if (currentFile) {
            const isImage = currentFile.type.startsWith('image/');
            const isPdf = currentFile.type === 'application/pdf';
            addMessage(isImage ? "Sent an image" : `Shared file: ${currentFile.name}`, 'user', {
                image: isImage ? URL.createObjectURL(currentFile) : null,
                isPdf: isPdf,
                fileName: currentFile.name
            });

            setIsLoading(true);
            try {
                const formData = new FormData();
                formData.append('file', currentFile);
                const res = await axios.post('/api/ai/file/analyze', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (res.data.type === 'receipt') {
                    addMessage(res.data.summary, 'ai', { receiptData: res.data.data });
                } else {
                    addMessage(res.data.summary || res.data.caption || "File analyzed. How can I help with this?", 'ai');
                }
                fetchConversations();
            } catch (err) {
                addMessage("Failed to analyze file.", 'ai', { error: true });
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Text Flow
        addMessage(currentMsg, 'user');
        setIsLoading(true);
        try {
            const res = await axios.post('/api/ai/chat', {
                message: currentMsg,
                conversation_id: conversationId,
                currency: currentCurrency
            });
            addMessage(res.data.ai_response, 'ai');
            fetchConversations();
        } catch (err) {
            addMessage("I'm having trouble connecting right now.", 'ai', { error: true });
        } finally {
            setIsLoading(false);
        }
    };

    // --- Voice Features ---
    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream);
                audioChunksRef.current = [];

                mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
                mediaRecorderRef.current.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    stream.getTracks().forEach(track => track.stop());

                    if (audioBlob.size < 100) return;

                    setIsLoading(true);
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'voice.webm');
                    formData.append('conversation_id', conversationId);
                    try {
                        const res = await axios.post('/api/ai/audio/transcribe', formData);
                        if (res.data.text) {
                            addMessage(res.data.text, 'user');
                            addMessage(res.data.ai_response, 'ai');
                            fetchConversations();
                        }
                    } catch (err) {
                        toast.error("Voice processing failed.");
                    } finally {
                        setIsLoading(false);
                    }
                };
                mediaRecorderRef.current.start();
                setIsRecording(true);
            } catch (err) {
                toast.error("Microphone access denied");
            }
        }
    };

    // --- Special Components ---



    const handleSaveTrip = async () => {
        if (!saveData.title || !saveData.destination) {
            return toast.error("Title and Destination are required!");
        }
        try {
            await axios.post('/api/travel/trips', {
                title: saveData.title,
                destination: saveData.destination,
                start_date: saveData.startDate,
                end_date: saveData.endDate,
                budget: saveData.budget || 0,
                status: 'Planned',
                notes: `Generated from AI Conversation: ${conversationId}`
            });
            toast.success("Trip saved to Adventures! ✈️");
            setShowSaveModal(false);
            fetchUpcomingTrip();
        } catch (err) {
            toast.error("Failed to save trip.");
        }
    };

    return (
        <div className="chat-interface animate-fade-in" style={{ fontWeight: '700' }}>
            {/* Sidebar: AI Studio Controls */}
            <aside className="chat-history shadow-sm glass-panel d-flex flex-column" style={{ overflow: 'hidden' }}>
                {/* 1. LOCATION */}
                <div className="mb-3">
                    <h6 className="text-muted small fw-black text-uppercase mb-2 px-1" style={{ letterSpacing: '2px', fontSize: '0.75rem' }}>Live Location</h6>
                    <div className="glass-card p-2 bg-white shadow-sm border-0">
                        <LocationTracker />
                    </div>
                </div>

                {/* 2. VIEW HISTORY & 3. NEW CHAT */}
                <div className="d-flex flex-column gap-2 mb-3">
                    <Button 
                        variant="light" 
                        className="text-start small fw-black py-2 border-0 glass-panel hover-bg-light"
                        onClick={() => setShowHistoryModal(true)}
                        style={{ fontSize: '0.85rem' }}
                    >
                        <FaSync className="text-primary me-2" /> VIEW HISTORY
                    </Button>
                    <Button 
                        className="btn-premium w-100 justify-content-center shadow-sm py-2 small fw-black" 
                        onClick={() => { setConversationId(uuidv4()); setMessages([]); localStorage.removeItem('roamiq_active_conv_id'); }}
                        style={{ fontSize: '0.85rem' }}
                    >
                        <FaPlus className="me-2" /> NEW ADVENTURE
                    </Button>
                </div>

                {/* 4. AI STUDIO TOOLS */}
                <div className="mb-3">
                    <h6 className="text-muted small fw-black text-uppercase mb-2 px-1" style={{ letterSpacing: '2px', fontSize: '0.75rem' }}>AI Studio Tools</h6>
                    <div className="d-flex flex-column gap-1">
                        <Button variant="light" className="text-start small fw-bold py-2 border-0 glass-panel hover-bg-light" onClick={() => setChecklistPrompt({ ...checkListPrompt, show: true })} style={{ fontSize: '0.85rem' }}>
                            <FaSuitcase className="text-primary me-2" /> Packing List
                        </Button>
                        <Button variant="light" className="text-start small fw-bold py-2 border-0 glass-panel hover-bg-light" onClick={async () => {
                            if (!upcomingTrip) return toast.info("Plan a trip first!");
                            try {
                                const res = await axios.post('/api/ai/generate/postcard', { trip_id: upcomingTrip.id });
                                addMessage("Here's a digital postcard for your trip!", 'ai', { type: 'postcard', data: res.data });
                            } catch (e) { toast.error("Failed to generate postcard."); }
                        }} style={{ fontSize: '0.85rem' }}>
                            <FaImage className="text-primary me-2" /> AI Postcard
                        </Button>
                        <Button variant="light" className="text-start small fw-bold py-2 border-0 glass-panel hover-bg-light" onClick={() => toast.info('Insights coming soon')} style={{ fontSize: '0.85rem' }}>
                            <FaChartBar className="text-primary me-2" /> Travel Insights
                        </Button>
                    </div>
                </div>

                {/* 5. NEXT EXPEDITION */}
                <div className="mt-auto pt-3 border-top">
                    {upcomingTrip ? (
                        <>
                            <h6 className="text-muted small fw-black text-uppercase mb-2 px-1" style={{ letterSpacing: '2px', fontSize: '0.75rem' }}>Next Expedition</h6>
                            <div className="glass-card p-3 border-start border-primary border-3 bg-white shadow-sm hover-lift transition-all">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <span className="fw-black text-dark small" style={{ fontSize: '0.9rem' }}>{upcomingTrip.destination}</span>
                                    <FaMapMarkedAlt className="text-primary opacity-50" size={14} />
                                </div>
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <FaCalendar className="text-muted" size={10} />
                                    <span className="small text-muted fw-bold" style={{ fontSize: '0.75rem' }}>{new Date(upcomingTrip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="small fw-bold text-primary" style={{ fontSize: '0.8rem' }}>{formatCurrency(upcomingTrip.budget)}</span>
                                    <Badge bg="primary" className="rounded-pill bg-primary-gradient border-0" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>{upcomingTrip.status}</Badge>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-3 glass-panel opacity-50">
                            <small className="fw-bold text-muted small" style={{ fontSize: '0.8rem' }}>No upcoming trips</small>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="chat-messages shadow-sm">
                {/* Active Chat Header */}
                <div className="p-3 border-bottom bg-white d-flex justify-content-between align-items-center glass-panel" style={{ zIndex: 10 }}>
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary-light p-2 rounded-circle">
                            <FaRobot className="text-primary" size={18} />
                        </div>
                        <div>
                            <h6 className="mb-0 fw-bold text-dark">
                                {conversations.find(c => c.id === conversationId)?.title || "Current Adventure"}
                            </h6>
                            <small className="text-muted x-small fw-bold text-uppercase">AI Assistant Online</small>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <Button 
                            className="btn-premium py-1 px-3 x-small fw-black shadow-sm" 
                            onClick={() => setShowSaveModal(true)}
                        >
                            SAVE AS ADVENTURE
                        </Button>
                        <Button variant="light" size="sm" className="rounded-pill border-0" onClick={() => loadConversation(conversationId)}>
                            <FaSync className="text-muted" size={12} />
                        </Button>
                    </div>
                </div>
                <div 
                    className="messages-stream custom-scrollbar p-4 flex-grow-1" 
                    style={{ 
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(/assets/ai-assistant.png)`,
                        backgroundSize: '300px',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        backgroundAttachment: 'local'
                    }}
                >
                    {messages.length <= 1 && messages[0]?.id?.toString().includes('welcome') ? (
                        <div className="m-auto text-center p-5 animate-fade-in" style={{ maxWidth: '600px' }}>
                            <div className="mb-5 animate-pop-up">
                                <img 
                                    src="/assets/ai-assistant.png" 
                                    alt="AI Assistant" 
                                    className="img-fluid rounded-4 shadow-lg hover-scale transition-all" 
                                    style={{ maxHeight: '250px', border: '8px solid white' }} 
                                />
                            </div>
                            <h2 className="fw-black mb-3">RoamIQ Studio</h2>
                            <p className="text-muted fs-5">Analyze receipts, plan itineraries, or summarize travel documents with AURA intelligence.</p>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={`d-flex ${msg.type === 'user' ? 'justify-content-end' : 'justify-content-start'} mb-4 animate-fade-in`}>
                                <div className={`message-bubble ${msg.type === 'user' ? 'user-message shadow-sm' : 'ai-message border glass-panel bg-white bg-opacity-75'}`} style={{ maxWidth: '85%', borderRadius: '20px', backdropFilter: 'blur(10px)', fontWeight: '700' }}>
                                    {msg.image && <img src={msg.image} alt="Upload" className="img-fluid rounded-3 mb-2 shadow-sm" style={{ maxHeight: '300px' }} />}
                                    {msg.isPdf && (
                                        <div className="bg-light p-3 rounded-3 mb-2 border d-flex align-items-center gap-3">
                                            <FaFilePdf className="text-danger" size={24} />
                                            <div className="flex-grow-1 overflow-hidden">
                                                <div className="fw-bold small text-truncate">Document Analyzed</div>
                                                <div className="x-small text-muted">Ready for queries</div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="markdown-content" style={{ fontWeight: '700' }}>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                    {msg.type === 'ai' && !msg.id.toString().includes('welcome') && (
                                        <div className="mt-3 pt-2 border-top border-light d-flex gap-2">
                                            <Button variant="light" className="x-small fw-bold py-1 px-2 border hover-bg-light" onClick={() => {
                                                const lines = msg.content.split('\n');
                                                const dest = lines[0].replace(/[#*]/g, '').trim();
                                                setSaveData({ ...saveData, destination: dest, title: `${dest} Adventure` });
                                                setShowSaveModal(true);
                                            }}>
                                                SAVE PLAN
                                            </Button>
                                        </div>
                                    )}
                                    <div className={`x-small mt-2 opacity-50 fw-bold ${msg.type === 'user' ? 'text-white text-end' : 'text-muted'}`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="ai-message border glass-panel bg-white p-3 rounded-4 d-flex align-items-center gap-3 animate-pulse" style={{ width: 'fit-content' }}>
                            <Spinner animation="grow" size="sm" variant="primary" />
                            <span className="small fw-bold text-muted" style={{ fontWeight: '700' }}>AURA is thinking...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area (WhatsApp/ChatGPT Style) */}
                <div className="p-3 bg-white border-top">
                    {filePreview && (
                        <div className="position-relative d-inline-block mb-2 ms-4">
                            <img src={filePreview} alt="Preview" className="rounded-3 shadow-sm border" style={{ height: '70px', objectFit: 'cover', width: '70px' }} />
                            <Button variant="danger" size="sm" className="position-absolute top-0 end-0 rounded-circle p-0" style={{ width: '20px', height: '20px', marginTop: '-8px', marginRight: '-8px' }} onClick={() => { setSelectedFile(null); setFilePreview(null); }}><FaTimes size={10} /></Button>
                        </div>
                    )}
                    {selectedFile && !filePreview && (
                        <div className="bg-light p-2 rounded-3 d-inline-flex align-items-center gap-2 mb-2 ms-4 border shadow-sm">
                            <FaFilePdf className="text-danger" />
                            <span className="small fw-bold">{selectedFile.name}</span>
                            <FaTimes className="text-muted clickable" size={12} onClick={() => setSelectedFile(null)} />
                        </div>
                    )}
                    
                    <Form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="px-2">
                        <div className="d-flex align-items-center gap-2 bg-light rounded-pill p-1 px-3 shadow-sm border focus-within-orange">
                            <input type="file" ref={fileInputRef} className="d-none" onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    setSelectedFile(file);
                                    if (file.type.startsWith('image/')) setFilePreview(URL.createObjectURL(file));
                                    else setFilePreview(null);
                                }
                            }} />
                            
                            <Button 
                                type="button" 
                                variant="light" 
                                className="rounded-circle p-2 border-0 bg-transparent text-muted hover-primary"
                                onClick={() => fileInputRef.current.click()}
                                disabled={isLoading}
                            >
                                <FaPlus size={18} />
                            </Button>

                            <Form.Control 
                                className="bg-transparent border-0 shadow-none py-2" 
                                placeholder="Message RoamIQ..." 
                                value={inputMessage} 
                                onChange={(e) => setInputMessage(e.target.value)} 
                                disabled={isLoading} 
                                style={{ fontSize: '0.95rem', fontWeight: '700' }}
                            />

                            <Button 
                                type="button" 
                                variant="light" 
                                className={`rounded-circle p-2 border-0 bg-transparent ${isRecording ? 'text-danger animate-pulse' : 'text-muted hover-primary'}`}
                                onClick={toggleRecording}
                                disabled={isLoading}
                            >
                                <FaMicrophone size={18} />
                            </Button>

                            <Button 
                                type="submit" 
                                className={`rounded-circle p-2 border-0 shadow-sm transition-all ${(!inputMessage.trim() && !selectedFile) || isLoading ? 'bg-secondary opacity-25' : 'bg-primary-gradient'}`}
                                style={{ width: '40px', height: '40px' }}
                                disabled={isLoading || (!inputMessage.trim() && !selectedFile)}
                            >
                                <FaPaperPlane size={16} className="text-white" />
                            </Button>
                        </div>
                        <div className="text-center mt-2">
                            <small className="text-muted x-small fw-bold opacity-50">ROAMIQ AI CAN MAKE MISTAKES. CHECK IMPORTANT INFO.</small>
                        </div>
                    </Form>
                </div>
            </main>

            {/* Packing List Modal */}
            <Modal show={checkListPrompt.show} onHide={() => setChecklistPrompt({ ...checkListPrompt, show: false })} centered>
                <div className="glass-card p-4 border-0">
                    <h5 className="fw-black mb-4">Generate Packing List</h5>
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold">DESTINATION</Form.Label>
                        <Form.Control className="form-control-premium" placeholder="e.g. Bali, Indonesia" value={checkListPrompt.dest} onChange={(e) => setChecklistPrompt({ ...checkListPrompt, dest: e.target.value })} />
                    </Form.Group>
                    <Form.Group className="mb-4">
                        <Form.Label className="small fw-bold">DURATION (DAYS)</Form.Label>
                        <Form.Control type="number" className="form-control-premium" value={checkListPrompt.days} onChange={(e) => setChecklistPrompt({ ...checkListPrompt, days: e.target.value })} />
                    </Form.Group>
                    <Button className="btn-premium w-100 justify-content-center" onClick={async () => {
                        setChecklistPrompt({ ...checkListPrompt, show: false });
                        addMessage(`Generate packing list for ${checkListPrompt.dest}`, 'user');
                        setIsLoading(true);
                        try {
                            const res = await axios.post('/api/ai/generate/packing-list', { destination: checkListPrompt.dest, duration: checkListPrompt.days });
                            addMessage("Here's your packing list!", 'ai', { packingList: res.data });
                        } catch (e) { toast.error("Failed."); } finally { setIsLoading(false); }
                    }}>GENERATE LIST</Button>
                </div>
            </Modal>

            {/* View History Modal */}
            <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} centered size="md">
                <div className="glass-card p-4 border-0 shadow-lg">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4 className="fw-black mb-0">Adventure History</h4>
                        <Button variant="light" className="rounded-circle p-2 border-0" onClick={() => setShowHistoryModal(false)}><FaTimes /></Button>
                    </div>
                    
                    <div className="d-flex flex-column gap-2 overflow-auto custom-scrollbar pr-1" style={{ maxHeight: '400px' }}>
                        {conversations.length === 0 ? (
                            <div className="text-center py-5 opacity-50">
                                <FaSuitcase size={48} className="mb-3 text-muted" />
                                <p className="fw-bold">No history yet.</p>
                                <p className="small">Start your first adventure from the AI Hub!</p>
                            </div>
                        ) : (
                            conversations.map(conv => (
                                <div key={conv.id} className="position-relative group border-bottom border-light pb-2">
                                    {editingConvId === conv.id ? (
                                        <div className="d-flex gap-2 p-2 bg-light rounded-3">
                                            <Form.Control 
                                                className="form-control-premium"
                                                value={editTitle} 
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                autoFocus
                                                onKeyDown={(e) => e.key === 'Enter' && handleRenameConversation(conv.id)}
                                            />
                                            <Button className="btn-premium px-3" onClick={() => handleRenameConversation(conv.id)}><FaCheck /></Button>
                                        </div>
                                    ) : (
                                        <div className={`d-flex align-items-center w-100 rounded-3 p-2 transition-all ${conv.id === conversationId ? 'bg-primary-light bg-opacity-10 border border-primary border-opacity-20' : 'hover-bg-light'}`}>
                                            <div className="bg-primary-light bg-opacity-10 p-2 rounded-circle me-3">
                                                <FaMapMarkedAlt className="text-primary" size={14} />
                                            </div>
                                            <button 
                                                className={`border-0 flex-grow-1 text-start fw-bold small ${conv.id === conversationId ? 'text-primary' : 'text-dark'}`} 
                                                onClick={() => { loadConversation(conv.id); setShowHistoryModal(false); }}
                                                style={{ background: 'transparent' }}
                                            >
                                                {conv.title || "Untitled Trip"}
                                                <div className="x-small text-muted fw-normal">Adventure ID: {conv.id.substring(0, 8)}...</div>
                                            </button>
                                            <Dropdown align="end">
                                                <Dropdown.Toggle as="div" className="px-2 py-2 clickable text-muted opacity-50 hover-opacity-100">
                                                    <FaEllipsisV size={12} />
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu className="shadow-lg border-0 small">
                                                    <Dropdown.Item onClick={() => { setEditingConvId(conv.id); setEditTitle(conv.title); }} className="fw-bold py-2"><FaEdit className="me-2" /> Rename</Dropdown.Item>
                                                    <Dropdown.Divider />
                                                    <Dropdown.Item onClick={() => handleDeleteConversation(conv.id)} className="text-danger fw-bold py-2"><FaTrash className="me-2" /> Delete</Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    
                    <Button className="btn-premium w-100 mt-4 justify-content-center" onClick={() => { setShowHistoryModal(false); setConversationId(uuidv4()); setMessages([]); localStorage.removeItem('roamiq_active_conv_id'); }}>
                        <FaPlus className="me-2" /> START NEW ADVENTURE
                    </Button>
                </div>
            </Modal>

            {/* Save Trip Modal */}
            <Modal show={showSaveModal} onHide={() => setShowSaveModal(false)} centered>
                <div className="glass-card p-4 border-0">
                    <h5 className="fw-black mb-4">Save to Adventures</h5>
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold">ADVENTURE TITLE</Form.Label>
                        <Form.Control className="form-control-premium" placeholder="e.g. My Summer Vacation" value={saveData.title} onChange={(e) => setSaveData({ ...saveData, title: e.target.value })} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold">DESTINATION</Form.Label>
                        <Form.Control className="form-control-premium" value={saveData.destination} onChange={(e) => setSaveData({ ...saveData, destination: e.target.value })} />
                    </Form.Group>
                    <div className="row">
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">START DATE</Form.Label>
                                <Form.Control type="date" className="form-control-premium" value={saveData.startDate} onChange={(e) => setSaveData({ ...saveData, startDate: e.target.value })} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold">END DATE</Form.Label>
                                <Form.Control type="date" className="form-control-premium" value={saveData.endDate} onChange={(e) => setSaveData({ ...saveData, endDate: e.target.value })} />
                            </Form.Group>
                        </Col>
                    </div>
                    <Form.Group className="mb-4">
                        <Form.Label className="small fw-bold">ESTIMATED BUDGET</Form.Label>
                        <Form.Control type="number" className="form-control-premium" value={saveData.budget} onChange={(e) => setSaveData({ ...saveData, budget: e.target.value })} />
                    </Form.Group>
                    <div className="d-flex gap-2">
                        <Button variant="light" className="flex-grow-1 fw-bold py-2 rounded-pill" onClick={() => setShowSaveModal(false)}>CANCEL</Button>
                        <Button className="btn-premium flex-grow-1 justify-content-center py-2" onClick={handleSaveTrip}>SAVE ADVENTURE</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default GenAIHub;
