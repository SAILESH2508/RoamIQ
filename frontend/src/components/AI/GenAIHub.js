import React, { useState, useEffect, useRef } from 'react';
import { Container, Button, Form, Modal, Spinner, Badge } from 'react-bootstrap';
import {
    FaRobot, FaPaperPlane, FaMicrophone, FaStop, FaPlus,
    FaImage, FaSuitcase, FaTimes, FaUser, FaTicketAlt, FaMapMarkedAlt, FaSync
} from 'react-icons/fa';
import LocationTracker from '../Travel/LocationTracker';
import TicketManager from '../Travel/TicketManager';
import axios from 'axios';
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import './GenAIHub.css';

const GenAIHub = () => {
    // Core State
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [activeSidebar, setActiveSidebar] = useState('chat'); // 'chat', 'bookings', or 'history'
    const [conversationId, setConversationId] = useState(() => {
        return localStorage.getItem('roamiq_active_conv_id') || uuidv4();
    });
    const [conversations, setConversations] = useState([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Feature States

    const [checkListPrompt, setChecklistPrompt] = useState({ show: false, dest: '', days: 7 });

    // Media State
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const fetchConversations = React.useCallback(async () => {
        try {
            const res = await axios.get('/api/ai/chat/conversations', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setConversations(res.data);
        } catch (err) {
            console.error("Failed to fetch conversations", err);
            toast.error("Failed to fetch chat history. Check connection.");
        }
    }, []);

    const loadConversation = React.useCallback(async (id) => {
        setIsLoading(true);
        try {
            const res = await axios.get(`/api/ai/chat/history/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            const formatted = res.data.map(msg => ({
                id: msg.id,
                type: msg.role === 'user' ? 'user' : 'ai',
                content: msg.content,
                timestamp: new Date(msg.timestamp)
            }));

            setMessages(formatted);
            setConversationId(id);
            setActiveSidebar('chat');
        } catch (err) {
            toast.error("Failed to load chat history");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial Load
    useEffect(() => {
        if (isInitialLoad) {
            const savedConvId = localStorage.getItem('roamiq_active_conv_id');
            if (savedConvId) {
                loadConversation(savedConvId);
            } else {
                setMessages([{
                    id: 'welcome',
                    type: 'ai',
                    content: "Hi! I'm RoamIQ. 🌍\n\nI can plan trips, see landmarks, or listen to your ideas. \n\nTap **+** to upload photos or generate packing lists!",
                    timestamp: new Date()
                }]);
            }
            fetchConversations();
            setIsInitialLoad(false);
        }
    }, [isInitialLoad, loadConversation, fetchConversations]);

    useEffect(() => {
        localStorage.setItem('roamiq_active_conv_id', conversationId);
    }, [conversationId]);

    const startNewChat = React.useCallback(() => {
        setConversationId(uuidv4());
        setMessages([{
            id: 'welcome-' + Date.now(),
            type: 'ai',
            content: "Started a fresh conversation! How can I help you today?",
            timestamp: new Date()
        }]);
        setActiveSidebar('chat');
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- Message Handling ---
    const addMessage = React.useCallback((content, type = 'user', extras = {}) => {
        setMessages(prev => [...prev, {
            id: Date.now(),
            type,
            content,
            timestamp: new Date(),
            ...extras
        }]);
    }, []);


    const handleSendMessage = React.useCallback(async () => {
        if (!inputMessage.trim() && !selectedFile) return;

        const currentMsg = inputMessage;
        const currentFile = selectedFile;

        // Clear input immediately
        setInputMessage('');
        setSelectedFile(null);
        setFilePreview(null);
        setShowAttachMenu(false);

        // 1. File Analysis Flow (Universal for Images & Docs)
        if (currentFile) {
            const isImage = currentFile.type.startsWith('image/');
            addMessage(isImage ? "Sent an image" : `Shared file: ${currentFile.name}`, 'user', {
                image: isImage ? URL.createObjectURL(currentFile) : null,
                text: !isImage ? currentFile.name : null
            });

            setIsLoading(true);
            try {
                const formData = new FormData();
                formData.append('file', currentFile);
                const res = await axios.post('/api/ai/file/analyze', formData, {
                    headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });

                // AIService returns 'summary' key
                addMessage(res.data.summary || res.data.recommendations || res.data.caption, 'ai', {
                    moodAnalysis: res.data.mood_analysis
                });
            } catch (err) {
                console.error(err);
                addMessage("Failed to analyze file.", 'ai', { error: true });
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // 2. Normal Text Chat
        addMessage(currentMsg, 'user');
        setIsLoading(true);
        try {
            const res = await axios.post('/api/ai/chat', {
                message: currentMsg,
                model: 'gemini-2.0-flash-lite',
                conversation_id: conversationId
            }, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });

            addMessage(res.data.ai_response.trim(), 'ai', {
                suggestions: res.data.suggestions
            });
        } catch (err) {
            addMessage("I'm having trouble connecting right now.", 'ai', { error: true });
        } finally {
            setIsLoading(false);
        }
    }, [inputMessage, selectedFile, conversationId, addMessage]);

    // 1. File Handling (Universal)
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            // Differentiate preview based on type
            if (file.type.startsWith('image/')) {
                setFilePreview(URL.createObjectURL(file));
            } else {
                setFilePreview(null);
            }
            setShowAttachMenu(false);
        }
    };

    // 2. Voice Handling
    const toggleRecording = React.useCallback(async () => {
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

                    // Stop all tracks to release microphone
                    stream.getTracks().forEach(track => track.stop());

                    if (audioBlob.size < 100) {
                        setIsLoading(false);
                        return;
                    }

                    // Send to API
                    setIsLoading(true);
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'voice_recording.webm');
                    formData.append('conversation_id', conversationId);
                    try {
                        const res = await axios.post('/api/ai/audio/transcribe', formData, {
                            headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                        });

                        if (res.data.text) {
                            addMessage(res.data.text, 'user');
                            addMessage(res.data.ai_response, 'ai');
                        } else {
                            addMessage("I couldn't hear anything. Could you try again?", 'ai');
                        }
                    } catch (err) {
                        addMessage("Voice processing failed.", 'ai', { error: true });
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
    }, [isRecording, conversationId, addMessage]);

    // 3. Packing List
    const handlePackingSubmit = React.useCallback(async () => {
        setChecklistPrompt({ ...checkListPrompt, show: false });
        addMessage(`Generate packing list for ${checkListPrompt.dest} (${checkListPrompt.days} days)`, 'user');
        setIsLoading(true);
        try {
            const res = await axios.post('/api/ai/generate/packing-list', {
                destination: checkListPrompt.dest,
                duration: checkListPrompt.days
            }, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });

            addMessage("Here's your packing list!", 'ai', { packingList: res.data });
        } catch (err) {
            addMessage("Failed to generate packing list.", 'ai', { error: true });
        } finally {
            setIsLoading(false);
        }
    }, [checkListPrompt, addMessage]);

    // --- Renders ---

    // Render Packing List Bubble
    const PackingListBubble = ({ items }) => (
        <div className="glass-panel rounded-4 p-3 mt-2 text-dark bg-white bg-opacity-75 border border-white border-opacity-50">
            <h6 className="fw-bold mb-3 border-bottom pb-2 gradients-text"><FaSuitcase className="me-2" />Packing List</h6>
            {items.map((item, i) => (
                <div key={i} className="d-flex align-items-center gap-2 mb-1">
                    <input type="checkbox" className="form-check-input mt-0" />
                    <span className="small fw-medium">{item.item}</span>
                    <Badge bg="gradient" className="ms-auto bg-gradient-custom text-white shadow-sm" style={{ background: 'var(--primary-gradient)' }}>{item.quantity}</Badge>
                </div>
            ))}
        </div>
    );

    return (
        <div className="gen-ai-hub d-flex m-auto" style={{ height: 'calc(100vh - 180px)', maxWidth: '1100px', width: '98%', background: '#fffaf5', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>

            {/* Sidebar / Feature Bar */}
            <div className="d-flex flex-column bg-white border-end p-3" style={{ width: '240px' }}>
                <div className="mb-4">
                    <h5 className="fw-bold gradients-text mb-1">RoamIQ Assistant</h5>
                    <LocationTracker />
                </div>

                <div className="d-flex flex-column gap-2 flex-grow-1">
                    <Button
                        variant={activeSidebar === 'chat' ? 'primary' : 'light'}
                        className={`text-start border-0 rounded-3 p-3 d-flex align-items-center gap-3 ${activeSidebar === 'chat' ? 'bg-primary-gradient text-white' : ''}`}
                        onClick={() => setActiveSidebar('chat')}
                    >
                        <FaRobot size={20} />
                        <span className="fw-bold">AI Chat</span>
                    </Button>
                    <Button
                        variant={activeSidebar === 'bookings' ? 'primary' : 'light'}
                        className={`text-start border-0 rounded-3 p-3 d-flex align-items-center gap-3 ${activeSidebar === 'bookings' ? 'bg-primary-gradient text-white' : ''}`}
                        onClick={() => setActiveSidebar('bookings')}
                    >
                        <FaTicketAlt size={20} />
                        <div className="d-flex flex-column lh-sm">
                            <span className="fw-bold">My Bookings</span>
                            <span className="x-small opacity-75">Tickets & Events</span>
                        </div>
                    </Button>
                    <Button
                        variant={activeSidebar === 'history' ? 'primary' : 'light'}
                        className={`text-start border-0 rounded-3 p-3 d-flex align-items-center gap-3 ${activeSidebar === 'history' ? 'bg-primary-gradient text-white' : ''}`}
                        onClick={() => { setActiveSidebar('history'); fetchConversations(); }}
                    >
                        <FaMapMarkedAlt size={20} />
                        <div className="d-flex flex-column lh-sm">
                            <span className="fw-bold">Chat History</span>
                            <span className="x-small opacity-75">Recent conversations</span>
                        </div>
                    </Button>
                </div>

                {activeSidebar === 'chat' && (
                    <Button variant="outline-primary" className="mt-3 rounded-pill btn-sm border-2 fw-bold" onClick={startNewChat}>
                        + New Chat
                    </Button>
                )}

                <div className="mt-auto p-3 glass-panel rounded-4">
                    <div className="small text-muted mb-1">Upcoming Trip</div>
                    <div className="fw-bold small">Paris getaway</div>
                    <div className="x-small text-info">Next week</div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow-1 d-flex flex-column position-relative">
                {activeSidebar === 'chat' ? (
                    <>
                        {/* Chat Area */}
                        <div className="flex-grow-1 overflow-auto p-3 custom-scrollbar position-relative">
                            {/* Background Pattern */}
                            <div className="position-absolute top-0 start-0 w-100 h-100" style={{
                                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                                backgroundSize: '20px 20px',
                                opacity: 0.5,
                                pointerEvents: 'none'
                            }}></div>

                            <Container className="max-w-4xl d-flex flex-column gap-3 position-relative z-1">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`d-flex align-items-end gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                                        {/* Avatar */}
                                        <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm ${msg.type === 'user' ? 'bg-primary text-white' : 'bg-white text-primary border'}`} style={{ width: '35px', height: '35px' }}>
                                            {msg.type === 'user' ? <FaUser size={14} /> : <FaRobot size={18} />}
                                        </div>

                                        <div
                                            className={`position-relative p-3 rounded-4 shadow-sm border ${msg.type === 'user' ? 'bg-primary-gradient text-white border-0 rounded-bottom-right-0' : 'glass-panel bg-white text-dark border-white rounded-bottom-left-0'}`}
                                            style={{ maxWidth: '75%', minWidth: '120px' }}
                                        >
                                            {/* Images */}
                                            {msg.image && <img src={msg.image} alt="Upload" className="img-fluid rounded-3 mb-2 shadow-sm" style={{ maxHeight: '200px' }} />}

                                            {/* Generic File Text */}
                                            {msg.text && <div className="d-flex align-items-center gap-2 mb-2 p-2 bg-black bg-opacity-10 rounded"><span className="h4 mb-0">📄</span><span className="small fw-bold">{msg.text}</span></div>}

                                            {/* Content with Markdown */}
                                            {msg.content && (
                                                <div className={`markdown-content small ${msg.type === 'user' ? 'text-white' : 'text-dark'}`}>
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                </div>
                                            )}

                                            {/* Packing List */}
                                            {msg.packingList && <PackingListBubble items={msg.packingList} />}

                                            {/* Timestamp */}
                                            <div className={`text-end x-small mt-1 opacity-75 ${msg.type === 'user' ? 'text-white-50' : 'text-muted'}`}>
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="d-flex align-items-center gap-2 ms-3 text-muted small">
                                        <Spinner size="sm" animation="grow" />
                                        <span>RoamIQ is thinking...</span>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </Container>
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-top shadow-lg glass-panel-bottom position-relative z-3">
                            <Container className="max-w-4xl">
                                {/* File/Image Preview in Input */}
                                {(filePreview || selectedFile) && (
                                    <div className="position-relative d-inline-block mb-2 p-2 bg-light rounded border">
                                        {filePreview ? (
                                            <img src={filePreview} alt="Preview" className="rounded border" style={{ height: '60px' }} />
                                        ) : (
                                            <div className="d-flex align-items-center gap-2 px-2" style={{ height: '60px' }}>
                                                <span className="h4 mb-0">📄</span>
                                                <span className="small fw-bold text-truncate" style={{ maxWidth: '150px' }}>{selectedFile?.name}</span>
                                            </div>
                                        )}
                                        <Button
                                            size="sm" variant="danger"
                                            className="position-absolute top-0 start-100 translate-middle rounded-circle p-0 shadow-sm"
                                            style={{ width: '20px', height: '20px' }}
                                            onClick={() => { setSelectedFile(null); setFilePreview(null); }}
                                        >
                                            <FaTimes size={10} />
                                        </Button>
                                    </div>
                                )}

                                <div className="d-flex align-items-center gap-2">
                                    {/* Attach Menu */}
                                    <div className="position-relative">
                                        <Button variant="light" className="rounded-circle btn-icon shadow-sm hover-scale" onClick={() => setShowAttachMenu(!showAttachMenu)}>
                                            <FaPlus className={showAttachMenu ? "text-primary" : "text-secondary"} />
                                        </Button>
                                        {showAttachMenu && (
                                            <div className="position-absolute bottom-100 start-0 mb-3 bg-white rounded-4 shadow-xl p-2 d-flex flex-column gap-2 animate-pop-up border" style={{ width: '200px', zIndex: 1000 }}>
                                                <Button variant="light" className="d-flex align-items-center gap-3 text-start small p-2 rounded-3 hover-bg-light border-0" onClick={() => fileInputRef.current.click()}>
                                                    <div className="bg-primary bg-opacity-10 p-2 rounded-circle"><FaImage className="text-primary" /></div>
                                                    <div className="d-flex flex-column lh-sm">
                                                        <span className="fw-bold">File / Photo</span>
                                                        <span className="x-small text-muted">PDF, Docs, Images</span>
                                                    </div>
                                                </Button>
                                                <Button variant="light" className="d-flex align-items-center gap-3 text-start small p-2 rounded-3 hover-bg-light border-0" onClick={() => { setChecklistPrompt({ show: true, dest: '', days: 7 }); setShowAttachMenu(false); }}>
                                                    <div className="bg-warning bg-opacity-10 p-2 rounded-circle"><FaSuitcase className="text-warning" /></div>
                                                    <div className="d-flex flex-column lh-sm">
                                                        <span className="fw-bold">Packing List</span>
                                                        <span className="x-small text-muted">Generate checklist</span>
                                                    </div>
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Hidden File Input (Accept ALL) */}
                                    <input type="file" ref={fileInputRef} className="d-none" onChange={handleFileSelect} />

                                    {/* Text Input */}
                                    <Form.Control
                                        type="text"
                                        placeholder={isRecording ? "Listening..." : "Message or upload file..."}
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        className="rounded-pill border border-2 bg-white px-4 py-3 shadow-sm ai-input-field"
                                        style={{ fontSize: '1rem', borderColor: '#fbbf24' }}
                                        disabled={isRecording}
                                    />

                                    {/* Voice / Send Button */}
                                    {inputMessage.trim() || selectedFile ? (
                                        <Button className="rounded-circle btn-icon p-2 shadow-lg btn-gradient text-white border-0 hover-scale" onClick={handleSendMessage}>
                                            <FaPaperPlane size={16} />
                                        </Button>
                                    ) : (
                                        <Button
                                            variant={isRecording ? "warning" : "light"}
                                            className={`rounded-circle btn-icon p-2 shadow-sm hover-scale ${isRecording ? "pulse-animation shadow-warning" : ""}`}
                                            onClick={toggleRecording}
                                        >
                                            {isRecording ? <FaStop size={16} /> : <FaMicrophone size={18} className="text-warning" />}
                                        </Button>
                                    )}
                                </div>
                            </Container>
                        </div>

                        {/* Packing List Modal */}
                        <Modal show={checkListPrompt.show} onHide={() => setChecklistPrompt({ ...checkListPrompt, show: false })} centered size="sm">
                            <Modal.Header closeButton className="border-0 pb-0">
                                <Modal.Title className="h6 fw-bold">Packing Assistant</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small">Where are you going?</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={checkListPrompt.dest}
                                        onChange={(e) => setChecklistPrompt({ ...checkListPrompt, dest: e.target.value })}
                                        autoFocus
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small">Days</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={checkListPrompt.days}
                                        onChange={(e) => setChecklistPrompt({ ...checkListPrompt, days: e.target.value })}
                                    />
                                </Form.Group>
                                <Button className="w-100 rounded-pill btn-gradient border-0 text-white" onClick={handlePackingSubmit}>
                                    Generate List
                                </Button>
                            </Modal.Body>
                        </Modal>
                    </>
                ) : activeSidebar === 'bookings' ? (
                    <div className="p-4 overflow-auto w-100 flex-grow-1 bg-light bg-opacity-50">
                        <Container>
                            <TicketManager tripId={null} />
                        </Container>
                    </div>
                ) : (
                    <div className="p-4 overflow-auto w-100 flex-grow-1 bg-light bg-opacity-55 animate-fade-in">
                        <Container className="max-w-2xl">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h5 className="fw-bold mb-0 gradients-text">Recent Conversations</h5>
                                <Button variant="light" size="sm" className="rounded-circle" onClick={fetchConversations}>
                                    <FaSync size={12} className="text-secondary hover-rotate" />
                                </Button>
                            </div>
                            <div className="d-flex flex-column gap-3">
                                {conversations.length === 0 ? (
                                    <div className="text-center py-5 opacity-50">
                                        <FaRobot size={40} className="mb-3" />
                                        <p>No chat history found yet.</p>
                                    </div>
                                ) : (
                                    conversations.map(conv => (
                                        <div
                                            key={conv.id}
                                            className={`glass-card p-3 cursor-pointer hover-scale border-0 ${conversationId === conv.id ? 'border-start border-primary border-4' : ''}`}
                                            onClick={() => loadConversation(conv.id)}
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                <h6 className="fw-bold mb-0 text-truncate" style={{ maxWidth: '80%' }}>{conv.title}</h6>
                                                <small className="x-small text-muted">{new Date(conv.timestamp).toLocaleDateString()}</small>
                                            </div>
                                            <p className="x-small text-muted mb-0 text-truncate">{conv.last_message}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Container>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GenAIHub;
