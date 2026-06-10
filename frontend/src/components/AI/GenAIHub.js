import React, { useState, useEffect, useRef } from 'react';
import { Button, Form, Modal, Spinner, Badge, Dropdown, Col } from 'react-bootstrap';
import {
    FaRobot, FaPaperPlane, FaMicrophone, FaPlus, FaTrash,
    FaImage, FaSuitcase, FaTimes, FaMapMarkedAlt, FaSync, FaCalendar, FaFilePdf,
    FaChartBar, FaEdit, FaEllipsisV, FaCheck, FaFolderPlus
} from 'react-icons/fa';
import LocationTracker from '../Travel/LocationTracker';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';

const parseItinerary = (content) => {
    if (!content) return null;
    
    // Try to extract JSON from code block
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/({[\s\S]*"days"[\s\S]*})/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            if (parsed && (parsed.days || parsed.trip_title)) {
                return parsed;
            }
        } catch (e) {
            // Ignore
        }
    }
    
    // Check if raw text is JSON
    const cleanContent = content.trim();
    if (cleanContent.startsWith('{') && cleanContent.endsWith('}')) {
        try {
            const parsed = JSON.parse(cleanContent);
            if (parsed && (parsed.days || parsed.trip_title)) {
                return parsed;
            }
        } catch (e) {
            // Ignore
        }
    }
    return null;
};

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

const GenAIHub = () => {
    const { currentCurrency, formatCurrency } = useCurrency();
    const { trips, fetchTrips, refreshData } = useData();
    const { isDarkMode } = useTheme();

    // Core State
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(() => localStorage.getItem('roamiq_active_conv_id') || uuidv4());
    const [conversations, setConversations] = useState(() => {
        const cached = localStorage.getItem('roamiq_cached_conversations');
        return cached ? JSON.parse(cached) : [];
    });

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
            localStorage.setItem('roamiq_cached_conversations', JSON.stringify(res.data));
        } catch (err) {
            console.error("Failed to fetch conversations", err);
        }
    }, []);

    const upcomingTrip = React.useMemo(() => {
        if (!trips || trips.length === 0) return null;
        const now = new Date();
        return trips.find(t => t.start_date && new Date(t.start_date) > now) || trips[0];
    }, [trips]);

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
        } catch {
            toast.error("Failed to load chat history");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
        fetchTrips();
        const existingId = localStorage.getItem('roamiq_active_conv_id');
        if (existingId && messages.length === 0) {
            loadConversation(existingId);
        }
    }, [fetchConversations, fetchTrips, loadConversation, messages.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- Conversation Actions ---
    const handleDeleteConversation = async (id) => {
        if (!window.confirm("Delete this adventure? This cannot be undone.")) return;
        try {
            await axios.delete(`/api/ai/chat/conversations/${id}`);
            setConversations(prev => {
                const updated = prev.filter(c => c.id !== id);
                localStorage.setItem('roamiq_cached_conversations', JSON.stringify(updated));
                return updated;
            });
            if (id === conversationId) {
                setMessages([]);
                setConversationId(uuidv4());
            }
            toast.success("Adventure deleted.");
        } catch {
            toast.error("Failed to delete.");
        }
    };

    const sendWelcomeMessage = React.useCallback(() => {
        const welcome = {
            id: 'welcome-' + Date.now(),
            type: 'ai',
            content: `Hello! I'm **RoamIQ AI**, your intelligent travel assistant. 🌍\n\nI can help you plan complex itineraries, analyze travel receipts, or summarize PDF documents. How can I assist with your next adventure today?`,
            timestamp: new Date()
        };
        setMessages([welcome]);
    }, []);

    // Show welcome message only when messages list becomes empty (new chat or cleared).
    // Using messages.length as a primitive avoids re-running on every message object change.
    const messagesLength = messages.length;
    useEffect(() => {
        if (messagesLength === 0 && !isLoading) {
            sendWelcomeMessage();
        }
    }, [messagesLength, isLoading, sendWelcomeMessage]);

    // Cleanup blob URLs when component unmounts
    useEffect(() => {
        return () => {
            messages.forEach(msg => {
                if (msg.image && msg.image.startsWith('blob:')) {
                    URL.revokeObjectURL(msg.image);
                }
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRenameConversation = async (id) => {
        if (!editTitle.trim()) return setEditingConvId(null);
        try {
            await axios.patch(`/api/ai/chat/conversations/${id}`, { title: editTitle });
            setConversations(prev => {
                const updated = prev.map(c => c.id === id ? { ...c, title: editTitle } : c);
                localStorage.setItem('roamiq_cached_conversations', JSON.stringify(updated));
                return updated;
            });
            setEditingConvId(null);
        } catch {
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
        
        // Clean up previous file preview if it exists
        if (filePreview) {
            URL.revokeObjectURL(filePreview);
        }
        
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
            } catch {
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
        } catch {
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
                        const res = await axios.post('/api/ai/audio/transcribe', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        if (res.data.text) {
                            addMessage(res.data.text, 'user');
                            addMessage(res.data.ai_response, 'ai');
                            fetchConversations();
                        }
                    } catch {
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
                notes: `Generated from AI Conversation: ${conversationId}`,
                itinerary: saveData.itinerary // Include the extracted itinerary
            });
            toast.success("Trip saved to Adventures! ✈️");
            setShowSaveModal(false);
            refreshData();
        } catch {
            toast.error("Failed to save trip.");
        }
    };

    const getActiveDestination = () => {
        // Look for any generated itineraries in the messages
        for (let i = messages.length - 1; i >= 0; i--) {
            const itinerary = parseItinerary(messages[i].content);
            if (itinerary && itinerary.destination) {
                return itinerary.destination;
            }
        }
        // Fallback to next saved trip
        if (upcomingTrip) {
            return upcomingTrip.destination;
        }
        return "Goa, India"; // Fallback to a gorgeous default dream spot!
    };

    const getActiveTripTitle = () => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const itinerary = parseItinerary(messages[i].content);
            if (itinerary && itinerary.trip_title) {
                return itinerary.trip_title;
            }
        }
        if (upcomingTrip) {
            return upcomingTrip.title;
        }
        return "Goan Getaway: Sun, Sand & Spice!";
    };

    return (
        <div className="chat-interface" style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', background: isDarkMode ? 'var(--bg-main)' : '#ffffff', fontFamily: "'Outfit', sans-serif" }}>
            {/* Sidebar: AI Studio Controls */}
            <aside className="dashboard-sidebar d-flex flex-column" style={{ 
                width: '240px', 
                background: 'var(--sidebar-bg)', 
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                position: 'fixed',
                left: 0,
                top: '60px', 
                bottom: 0,
                height: 'calc(100vh - 60px)',
                zIndex: 1500,
                padding: '24px 16px',
                borderRight: '1px solid var(--glass-border-weather)',
                boxShadow: '4px 0 24px rgba(0, 0, 0, 0.02)',
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                {/* 1. LOCATION */}
                <div className="mb-4">
                    <div className="glass-card p-1 shadow-sm rounded-3" style={{ background: 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                        <LocationTracker />
                    </div>
                </div>

                {/* 2. VIEW HISTORY & 3. NEW CHAT */}
                <div className="d-flex flex-column gap-2 mb-4">
                    <Button 
                        variant="light" 
                        className="text-start small fw-black py-2 rounded-3 hover-bg-light shadow-sm"
                        onClick={() => setShowHistoryModal(true)}
                        style={{ fontSize: '0.8rem', background: 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                    >
                        <FaSync className="text-primary me-2" /> VIEW HISTORY
                    </Button>
                    <Button 
                        className="btn-premium w-100 justify-content-center shadow-sm py-2 small fw-black rounded-3" 
                        onClick={() => { setConversationId(uuidv4()); setMessages([]); localStorage.removeItem('roamiq_active_conv_id'); }}
                        style={{ fontSize: '0.8rem' }}
                    >
                        <FaPlus className="me-2" /> NEW ADVENTURE
                    </Button>
                </div>

                {/* 4. AI STUDIO TOOLS */}
                <div className="mb-4">
                    <h6 className="text-muted small fw-black text-uppercase mb-2 px-1" style={{ letterSpacing: '2px', fontSize: '0.65rem' }}>AI Studio Tools</h6>
                    <div className="d-flex flex-column gap-2">
                        <Button variant="light" className="text-start small fw-bold py-2 rounded-3 hover-bg-light shadow-sm" onClick={() => setChecklistPrompt({ ...checkListPrompt, show: true })} style={{ fontSize: '0.8rem', background: 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                            <FaSuitcase className="text-primary me-2" /> Packing List
                        </Button>
                        <Button variant="light" className="text-start small fw-bold py-2 rounded-3 hover-bg-light shadow-sm" onClick={async () => {
                            setIsLoading(true);
                            try {
                                const dest = getActiveDestination();
                                const title = getActiveTripTitle();
                                const res = await axios.post('/api/ai/generate/postcard', { 
                                    trip_id: upcomingTrip ? upcomingTrip.id : null,
                                    destination: dest,
                                    title: title
                                });
                                addMessage(`AI Postcard for ${dest}`, 'postcard', { data: res.data });
                            } catch (e) { 
                                toast.error("Failed to generate postcard."); 
                            } finally {
                                setIsLoading(false);
                            }
                        }} style={{ fontSize: '0.8rem', background: 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                            <FaImage className="text-primary me-2" /> AI Postcard
                        </Button>
                        <Button variant="light" className="text-start small fw-bold py-2 rounded-3 hover-bg-light shadow-sm" onClick={async () => {
                            setIsLoading(true);
                            try {
                                const dest = getActiveDestination();
                                const res = await axios.post('/api/ai/generate/insights', { 
                                    destination: dest
                                });
                                addMessage(`AI Insights for ${dest}`, 'insights', { data: { ...res.data, destination: dest } });
                            } catch (e) { 
                                toast.error("Failed to gather travel insights."); 
                            } finally {
                                setIsLoading(false);
                            }
                        }} style={{ fontSize: '0.8rem', background: 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                            <FaChartBar className="text-primary me-2" /> Travel Insights
                        </Button>
                    </div>
                </div>

                {/* 5. NEXT EXPEDITION */}
                <div className="mt-auto pt-3" style={{ borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--glass-border-weather)' }}>
                    {upcomingTrip ? (
                        <>
                            <h6 className="text-muted small fw-black text-uppercase mb-2 px-1" style={{ letterSpacing: '2px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Next Expedition</h6>
                            <div className="glass-card p-3 border-start border-primary border-3 shadow-sm hover-lift transition-all rounded-3" style={{ background: 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)', borderLeft: '3px solid var(--primary)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <span className="fw-black small" style={{ fontSize: '0.85rem', lineHeight: '1.2', color: 'var(--text-main)' }}>{upcomingTrip.title || upcomingTrip.destination}</span>
                                    <FaMapMarkedAlt className="text-primary opacity-50" size={14} />
                                </div>
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <FaCalendar className="text-muted" size={10} style={{ color: 'var(--text-muted)' }} />
                                    <span className="small text-muted fw-bold" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(upcomingTrip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="small fw-bold text-primary" style={{ fontSize: '0.75rem' }}>{formatCurrency(upcomingTrip.budget)}</span>
                                    <Badge bg="primary" className="rounded-pill bg-primary-gradient border-0" style={{ fontSize: '0.65rem', padding: '4px 10px' }}>{upcomingTrip.status}</Badge>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-3 glass-panel opacity-50 rounded-3" style={{ background: 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)' }}>
                            <small className="fw-bold small" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No upcoming trips</small>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="chat-messages animate-fade-in" style={{ 
                flex: 1, 
                marginLeft: '240px', 
                display: 'flex', 
                flexDirection: 'column', 
                height: 'calc(100vh - 60px)', 
                background: 'transparent', 
                border: 'none', 
                borderRadius: 0, 
                boxShadow: 'none' 
            }}>
                {/* Active Chat Header */}
                <div className="p-3 d-flex justify-content-between align-items-center shadow-sm" style={{ 
                    zIndex: 10, 
                    borderBottom: '1px solid var(--glass-border-weather)',
                    background: 'var(--sidebar-bg)',
                    color: 'var(--text-main)'
                }}>
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary p-2 rounded-circle shadow-sm border border-2" style={{ backgroundColor: 'var(--primary)', border: '2px solid var(--primary-dark)' }}>
                            <FaRobot className="text-white" size={18} />
                        </div>
                        <div>
                            <h6 className="mb-0 fw-bold" style={{ color: 'var(--text-main)' }}>
                                {conversations.find(c => c.id === conversationId)?.title || "Current Adventure"}
                            </h6>
                            <small className="text-muted x-small fw-bold text-uppercase" style={{ letterSpacing: '0.5px', color: 'var(--text-muted)' }}>AI Assistant Online</small>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <Button variant="light" size="sm" className="rounded-pill border-0" onClick={() => loadConversation(conversationId)}>
                            <FaSync className="text-muted" size={12} />
                        </Button>
                    </div>
                </div>
                <div 
                    className="messages-stream custom-scrollbar p-4 flex-grow-1 position-relative" 
                    style={{ 
                        backgroundImage: isDarkMode 
                            ? `linear-gradient(rgba(10, 15, 36, 0.95), rgba(10, 15, 36, 0.95)), url(/assets/ai-assistant.png)`
                            : `linear-gradient(rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.92)), url(/assets/ai-assistant.png)`,
                        backgroundSize: '300px',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        backgroundAttachment: 'local',
                        backgroundColor: isDarkMode ? 'var(--bg-main)' : '#ffffff'
                    }}
                >
                    {messages.length <= 1 && (
                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-5 animate-fade-in" style={{ 
                            zIndex: 0, 
                            pointerEvents: 'none',
                            opacity: 0.85
                        }}>
                            <div className="text-center animate-fade-in" style={{ maxWidth: '600px' }}>
                                <div className="mb-5 animate-pop-up">
                                    <div className="d-inline-block p-3 rounded-4 shadow-sm" style={{ 
                                        background: 'var(--glass-bg-weather)', 
                                        border: '1px solid var(--glass-border-weather)', 
                                        backdropFilter: 'blur(16px)', 
                                        WebkitBackdropFilter: 'blur(16px)' 
                                    }}>
                                        <img 
                                            src="/assets/ai-assistant.png" 
                                            alt="AI Assistant" 
                                            className="img-fluid rounded-3 shadow-md" 
                                            style={{ maxHeight: '230px' }} 
                                        />
                                    </div>
                                </div>
                                <h2 className="fw-black mb-3" style={{ color: 'var(--text-main)' }}>RoamIQ Studio</h2>
                                <p className="fs-5 fw-bold" style={{ color: 'var(--text-muted)' }}>Analyze receipts, plan itineraries, or summarize travel documents with RoamIQ AI intelligence.</p>
                            </div>
                        </div>
                    )}
                    {messages.map(msg => (
                            <div key={msg.id} className={`d-flex ${msg.type === 'user' ? 'justify-content-end' : 'justify-content-start'} mb-4 animate-fade-in`} style={{ position: 'relative', zIndex: 1 }}>
                                <div className={`message-bubble ${
                                    msg.type === 'user' 
                                        ? 'user-message shadow-sm' 
                                        : msg.type === 'postcard' 
                                            ? 'postcard-bubble shadow-md' 
                                            : msg.type === 'insights'
                                                ? 'insights-bubble shadow-md border'
                                                : 'ai-message border glass-panel'
                                }`} style={{ 
                                    maxWidth: '85%', 
                                    borderRadius: '20px', 
                                    backdropFilter: 'blur(10px)', 
                                    WebkitBackdropFilter: 'blur(10px)',
                                    fontWeight: '800',
                                    fontSize: '1.25rem',
                                    background: msg.type === 'user'
                                        ? 'var(--primary-gradient)'
                                        : msg.type === 'postcard' 
                                            ? '#ffffff' 
                                            : msg.type === 'insights'
                                                ? (isDarkMode ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255, 255, 255, 0.85)')
                                                : (isDarkMode ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255, 255, 255, 0.65)'),
                                    borderColor: msg.type === 'user'
                                        ? 'transparent'
                                        : msg.type === 'postcard' 
                                            ? '#ff7a00' 
                                            : msg.type === 'insights'
                                                ? 'rgba(255, 107, 0, 0.2)'
                                                : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'var(--glass-border-weather)'),
                                    color: msg.type === 'user' ? '#ffffff' : msg.type === 'postcard' ? '#e66e00' : 'var(--text-main)',
                                    padding: msg.type === 'postcard' ? '20px 24px' : '18px 24px',
                                    border: msg.type === 'postcard' ? '2px dashed #ff7a00' : undefined
                                }}>
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
                                    {(() => {
                                        if (msg.type === 'postcard') {
                                            const postcardData = msg.data || {};
                                            return (
                                                <div style={{ position: 'relative', minWidth: '280px', maxWidth: '500px' }}>
                                                    <div className="d-none d-sm-block position-absolute" style={{
                                                        top: '-5px',
                                                        right: '-5px',
                                                        width: '60px',
                                                        height: '75px',
                                                        border: '2px solid #ff7a00',
                                                        padding: '2px',
                                                        background: '#fffbf5',
                                                        textAlign: 'center',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 'bold',
                                                        color: '#ff7a00',
                                                        borderRadius: '4px',
                                                        transform: 'rotate(5deg)',
                                                        zIndex: 2
                                                    }}>
                                                        <div style={{ fontSize: '1.6rem' }}>🌴</div>
                                                        ROAMIQ
                                                    </div>
                                                    
                                                    <div className="postcard-header mb-3 pb-2 border-bottom" style={{ borderColor: 'rgba(255, 122, 0, 0.2)' }}>
                                                        <h5 className="m-0 fw-black text-uppercase" style={{ color: '#ff6b00', fontSize: '1.15rem' }}>
                                                            📬 Postcard from {postcardData.destination || 'Adventure'}
                                                        </h5>
                                                    </div>
                                                    
                                                    <div className="postcard-body mb-4 pr-md-5">
                                                        <p className="postcard-content m-0" style={{ 
                                                            fontFamily: "'Outfit', sans-serif", 
                                                            color: '#e66e00',
                                                            lineHeight: '1.5',
                                                            fontStyle: 'italic',
                                                            fontWeight: '800',
                                                            fontSize: '1.3rem'
                                                        }}>
                                                            "{postcardData.postcard_text}"
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="postcard-footer text-end mt-2">
                                                        <span className="badge rounded-pill bg-primary bg-opacity-10 text-primary px-3 py-1 fw-black text-uppercase" style={{ fontSize: '0.7rem', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                                                            ✍️ {postcardData.signature || 'Your travel assistant'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (msg.type === 'insights') {
                                            const insightsData = msg.data || {};
                                            return (
                                                <div style={{ minWidth: '280px', maxWidth: '500px' }}>
                                                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style={{ borderColor: 'rgba(255, 107, 0, 0.15)' }}>
                                                        <span className="badge rounded-pill bg-primary-gradient px-3 py-1 text-uppercase fw-black text-white" style={{ fontSize: '0.7rem' }}>
                                                            🧠 DESTINATION INTELLIGENCE
                                                        </span>
                                                        <span className="fw-black text-primary" style={{ fontSize: '0.9rem' }}>{insightsData.destination || 'Local Insights'}</span>
                                                    </div>
                                                    
                                                    {insightsData.weather_vibe && (
                                                        <div className="mb-3 p-3 rounded-3" style={{ background: isDarkMode ? 'rgba(255, 107, 0, 0.08)' : 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.1)' }}>
                                                            <div className="fw-black text-uppercase small text-primary mb-1" style={{ fontSize: '0.75rem' }}>🌤️ Seasonal Weather Vibe</div>
                                                            <div className="small fw-bold" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>{insightsData.weather_vibe}</div>
                                                        </div>
                                                    )}
                                                    
                                                    {insightsData.hidden_gems && insightsData.hidden_gems.length > 0 && (
                                                        <div className="mb-3">
                                                            <div className="fw-black text-uppercase small text-muted mb-2" style={{ fontSize: '0.75rem' }}>💎 Hidden Gems to Discover</div>
                                                            <div className="d-flex flex-wrap gap-2">
                                                                {insightsData.hidden_gems.map((gem, idx) => (
                                                                    <span key={idx} className="badge bg-secondary bg-opacity-10 text-dark px-3 py-1 rounded-pill small fw-black text-uppercase" style={{ fontSize: '0.7rem', border: '1px solid rgba(0,0,0,0.05)', color: 'var(--text-main)' }}>
                                                                        ✨ {gem}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {insightsData.customs && (
                                                        <div className="mb-3">
                                                            <div className="fw-black text-uppercase small text-muted mb-1" style={{ fontSize: '0.75rem' }}>📜 Respectful Etiquette</div>
                                                            <div className="small fw-bold" style={{ color: 'var(--text-main)', lineHeight: '1.4', fontSize: '0.85rem' }}>{insightsData.customs}</div>
                                                        </div>
                                                    )}
                                                    
                                                    {insightsData.green_tip && (
                                                        <div className="mb-3 p-3 rounded-3" style={{ background: 'rgba(40, 167, 69, 0.05)', border: '1px solid rgba(40, 167, 69, 0.1)' }}>
                                                            <div className="fw-black text-uppercase small text-success mb-1" style={{ fontSize: '0.75rem' }}>🍃 Carbon Footprint Advice</div>
                                                            <div className="small fw-bold" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>{insightsData.green_tip}</div>
                                                        </div>
                                                    )}
                                                    
                                                    {insightsData.scam_alerts && insightsData.scam_alerts.length > 0 && (
                                                        <div className="p-3 rounded-3" style={{ background: 'rgba(220, 53, 69, 0.05)', border: '1px solid rgba(220, 53, 69, 0.1)' }}>
                                                            <div className="fw-black text-uppercase small text-danger mb-2" style={{ fontSize: '0.75rem' }}>⚠️ Safety Alerts & Scams</div>
                                                            <div className="d-flex flex-column gap-1">
                                                                {insightsData.scam_alerts.map((alert, idx) => (
                                                                    <div key={idx} className="small fw-bold d-flex gap-2 align-items-start" style={{ color: 'var(--text-main)', fontSize: '0.8rem' }}>
                                                                        <span className="text-danger">•</span>
                                                                        <span>{alert}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        const itinerary = msg.type === 'ai' ? parseItinerary(msg.content) : null;
                                        if (itinerary) {
                                            // Get any text preceding or succeeding the JSON block
                                            const cleanContent = msg.content;
                                            const jsonRegex = /```json\s*([\s\S]*?)\s*```|({[\s\S]*"days"[\s\S]*})/;
                                            const textParts = cleanContent.split(jsonRegex);
                                            // Render any text explanation before/after the itinerary
                                            const introText = textParts[0]?.trim();
                                            const outroText = textParts[textParts.length - 1]?.trim();
                                            
                                            return (
                                                <div className="itinerary-wrapper w-100" style={{ minWidth: '320px' }}>
                                                    {introText && introText.length > 5 && !introText.startsWith('{') && (
                                                        <div className="markdown-content mb-3" style={{ fontWeight: '700' }}>
                                                            <ReactMarkdown>{introText}</ReactMarkdown>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="itinerary-display-container mt-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                                        {/* Beautiful Header Card */}
                                                        <div className="p-4 rounded-4 shadow-sm mb-3 text-white" style={{
                                                            background: 'var(--primary-gradient)',
                                                            boxShadow: '0 8px 32px rgba(255, 107, 0, 0.15)',
                                                            borderRadius: '1.25rem'
                                                        }}>
                                                            <div className="d-flex justify-content-between align-items-start">
                                                                <div>
                                                                    <span className="badge rounded-pill mb-2 px-3 py-1 text-uppercase fw-black" style={{ 
                                                                        fontSize: '0.65rem', 
                                                                        letterSpacing: '0.5px',
                                                                        background: 'rgba(255, 255, 255, 0.25)', 
                                                                        color: '#ffffff',
                                                                        backdropFilter: 'blur(4px)'
                                                                    }}>
                                                                        🌴 AI Expedition Plan
                                                                    </span>
                                                                    <h3 className="m-0 fw-black" style={{ fontSize: '1.4rem', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                                                        {itinerary.trip_title || itinerary.destination || 'Custom Adventure'}
                                                                    </h3>
                                                                    <p className="small m-0 mt-1 opacity-75 fw-bold">Destination: {itinerary.destination || 'Unspecified'}</p>
                                                                </div>
                                                                <div className="text-end">
                                                                    <div className="x-small fw-bold opacity-75 text-uppercase" style={{ fontSize: '0.6rem' }}>Est. Budget</div>
                                                                    <h4 className="fw-black m-0" style={{ fontSize: '1.5rem', color: '#fff' }}>
                                                                        {formatCurrency(itinerary.estimated_total_cost || itinerary.budget || 0, currentCurrency, currentCurrency)}
                                                                    </h4>
                                                                </div>
                                                            </div>
                                                        </div>
                                                                           {/* Days Timeline */}
                                                        <div className="d-flex flex-column gap-3 mb-3">
                                                            {(itinerary.days || itinerary.itinerary || []).map((dayData, idx) => {
                                                                const { title: dayTitle, activities: rawActivities, dayNum } = extractActivitiesAndTitle(dayData, idx);
                                                                const isDayStr = typeof dayData === 'string';                                            
                                                                
                                                                return (
                                                                    <div key={idx} className="p-3 rounded-4 shadow-sm border" style={{
                                                                        background: isDarkMode ? 'rgba(30, 41, 59, 0.35)' : 'rgba(255, 255, 255, 0.75)',
                                                                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                                                                        borderRadius: '1rem'
                                                                    }}>
                                                                        <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style={{ borderColor: 'rgba(0, 0, 0, 0.05)' }}>
                                                                            <div className="d-flex align-items-center gap-2">
                                                                                <span className="badge bg-primary rounded-pill bg-primary-gradient border-0 px-2 py-1 small fw-black" style={{ fontSize: '0.7rem' }}>
                                                                                    Day {dayNum}
                                                                                </span>
                                                                                {dayTitle && dayTitle !== `Day ${dayNum}` && (
                                                                                    <span className="small text-muted fw-bold text-truncate" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                                                                                        {dayTitle}
                                                                                    </span>
                                                                                )}
                                                                                {!isDayStr && dayData.date && (
                                                                                    <span className="small text-muted fw-bold" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                                        📅 {new Date(dayData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {!isDayStr && dayData.estimated_cost && (
                                                                                <div className="small fw-black text-primary" style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
                                                                                    Daily Est: {formatCurrency(
                                                                                        Object.values(dayData.estimated_cost).reduce((a, b) => a + b, 0),
                                                                                        currentCurrency,
                                                                                        currentCurrency
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Activities List */}
                                                                        <div className="d-flex flex-column gap-2 mb-3">
                                                                            {rawActivities.map((act, actIdx) => {
                                                                                const isActObj = act && typeof act === 'object';
                                                                                const actTitle = isActObj ? (act.activity || act.title || '') : act;
                                                                                const actDesc = isActObj ? act.description : '';
                                                                                const actTime = isActObj ? act.time : '';
                                                                                
                                                                                const textToRender = actTime ? `[${actTime}] ${actTitle}` : actTitle;
                                                                                
                                                                                return (
                                                                                    <div key={actIdx} className="d-flex flex-column gap-1 px-1">
                                                                                        <div className="d-flex gap-3 align-items-start">
                                                                                            <span className="mt-1" style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>🔸</span>
                                                                                            <span className="small fw-bold" style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>{textToRender}</span>
                                                                                        </div>
                                                                                        {actDesc && (
                                                                                            <div className="small text-muted ps-4" style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)', opacity: 0.8 }}>
                                                                                                {actDesc}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>

                                                                        {/* Cost Category Breakdown Badges */}
                                                                        {!isDayStr && dayData.estimated_cost && (
                                                                            <div className="d-flex flex-wrap gap-2 pt-2 border-top" style={{ borderColor: 'rgba(0, 0, 0, 0.02)' }}>
                                                                                {Object.entries(dayData.estimated_cost).map(([cat, val]) => {
                                                                                    if (val === 0) return null;
                                                                                    let icon = '💸';
                                                                                    if (cat.toLowerCase().includes('transport')) icon = '🚗';
                                                                                    if (cat.toLowerCase().includes('accommodation') || cat.toLowerCase().includes('hotel') || cat.toLowerCase().includes('lodging')) icon = '🏨';
                                                                                    if (cat.toLowerCase().includes('food') || cat.toLowerCase().includes('meal')) icon = '🍔';
                                                                                    if (cat.toLowerCase().includes('activities') || cat.toLowerCase().includes('ticket')) icon = '🎟️';
                                                                                    
                                                                                    return (
                                                                                        <span key={cat} className="badge bg-secondary bg-opacity-10 text-muted px-2 py-1 rounded-pill small fw-bold text-uppercase" style={{ fontSize: '0.65rem', border: '1px solid rgba(0, 0, 0, 0.05)', color: 'var(--text-main)' }}>
                                                                                            {icon} {cat}: {formatCurrency(val, currentCurrency, currentCurrency)}
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {outroText && outroText.length > 5 && !outroText.startsWith('{') && (
                                                        <div className="markdown-content mt-3" style={{ fontWeight: '700' }}>
                                                            <ReactMarkdown>{outroText}</ReactMarkdown>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        
                                        // Standard markdown fallback
                                        return (
                                            <div className="markdown-content" style={{ fontWeight: '700' }}>
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        );
                                    })()}
                                    {msg.type === 'ai' && !msg.id.toString().includes('welcome') && (
                                        <div className="mt-3 pt-3 border-top border-light d-flex justify-content-center w-100">
                                            <Button 
                                                className="btn-premium px-4 py-2 shadow-sm rounded-pill fw-black" 
                                                style={{ 
                                                    fontSize: '0.85rem', 
                                                    background: 'var(--primary-gradient)', 
                                                    border: 'none', 
                                                    color: '#ffffff',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    boxShadow: '0 8px 16px rgba(255, 107, 0, 0.2)',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onClick={() => {
                                                    const content = msg.content;
                                                    
                                                    // Try to extract JSON itinerary
                                                    let extractedItinerary = null;
                                                    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/({[\s\S]*"days"[\s\S]*})/);
                                                    
                                                    if (jsonMatch) {
                                                        try {
                                                            extractedItinerary = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                                                        } catch (e) {
                                                            console.error("Failed to parse extracted JSON", e);
                                                        }
                                                    }

                                                    const lines = content.split('\n');
                                                    let dest = extractedItinerary?.destination || extractedItinerary?.trip_title;
                                                    
                                                    if (!dest) {
                                                        // Fallback: Try to find a clean destination from the first few lines
                                                        let firstLine = lines[0].replace(/[#*]/g, '').trim();
                                                        // Remove "Here's a...", "Plan for...", etc.
                                                        dest = firstLine.replace(/^(Here's a|Plan for|Itinerary for|A condensed|Your trip to|Trip to)\s+/i, '')
                                                                        .replace(/\s+(itinerary|keeping|budget|for).*$/i, '')
                                                                        .replace(/,.*$/, '')
                                                                        .trim();
                                                    }

                                                    if (!dest || dest.length < 2) {
                                                        dest = 'New Adventure';
                                                    }

                                                    // Extract start and end dates dynamically
                                                    let start = extractedItinerary?.start_date || extractedItinerary?.startDate || '';
                                                    let end = extractedItinerary?.end_date || extractedItinerary?.endDate || '';
                                                    
                                                    if (!start && extractedItinerary?.days && extractedItinerary.days.length > 0) {
                                                        start = extractedItinerary.days[0]?.date || '';
                                                        end = extractedItinerary.days[extractedItinerary.days.length - 1]?.date || '';
                                                    }
                                                    
                                                    // Default to tomorrow's date if still empty
                                                    if (!start) {
                                                        const tomorrow = new Date();
                                                        tomorrow.setDate(tomorrow.getDate() + 1);
                                                        start = tomorrow.toISOString().split('T')[0];
                                                        
                                                        const duration = parseInt(extractedItinerary?.duration || extractedItinerary?.days?.length || 3, 10);
                                                        const endDateObj = new Date(tomorrow);
                                                        endDateObj.setDate(tomorrow.getDate() + duration);
                                                        end = endDateObj.toISOString().split('T')[0];
                                                    }

                                                    setSaveData({ 
                                                        ...saveData, 
                                                        destination: dest, 
                                                        title: extractedItinerary?.trip_title || `${dest} Adventure`,
                                                        startDate: start,
                                                        endDate: end,
                                                        budget: extractedItinerary?.estimated_total_cost || '',
                                                        itinerary: extractedItinerary // Store it for saving
                                                    });
                                                    setShowSaveModal(true);
                                                }}
                                            >
                                                <FaFolderPlus size={14} /> SAVE PLAN
                                            </Button>
                                        </div>
                                    )}
                                    <div className={`x-small mt-2 opacity-50 fw-bold ${msg.type === 'user' ? 'text-white text-end' : 'text-muted'}`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    {isLoading && (
                        <div className="ai-message border glass-panel p-3 rounded-4 d-flex align-items-center gap-3 animate-pulse" style={{ 
                            width: 'fit-content',
                            background: isDarkMode ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255, 255, 255, 0.65)',
                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'var(--glass-border-weather)'
                        }}>
                            <Spinner animation="grow" size="sm" variant="primary" />
                            <span className="small fw-bold" style={{ fontWeight: '700', color: 'var(--text-main)' }}>RoamIQ AI is thinking...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area (WhatsApp/ChatGPT Style) */}
                <div className="p-3 border-top" style={{
                    background: 'var(--sidebar-bg)',
                    borderTop: '1px solid var(--glass-border-weather)'
                }}>
                    {filePreview && (
                        <div className="position-relative d-inline-block mb-2 ms-4">
                            <img src={filePreview} alt="Preview" className="rounded-3 shadow-sm border" style={{ height: '70px', objectFit: 'cover', width: '70px', borderColor: 'var(--glass-border-weather)' }} />
                            <Button variant="danger" size="sm" className="position-absolute top-0 end-0 rounded-circle p-0" style={{ width: '20px', height: '20px', marginTop: '-8px', marginRight: '-8px' }} onClick={() => { setSelectedFile(null); setFilePreview(null); }}><FaTimes size={10} /></Button>
                        </div>
                    )}
                            {selectedFile && !filePreview && (
                                <div className="p-2 rounded-3 d-inline-flex align-items-center gap-2 mb-2 ms-4 border shadow-sm" style={{
                                    background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 249, 250, 1)',
                                    borderColor: 'var(--glass-border-weather)',
                                    color: 'var(--text-main)'
                                }}>
                                    <FaFilePdf className="text-danger" />
                                    <span className="small fw-bold">{selectedFile.name}</span>
                                    <FaTimes className="text-muted clickable" size={12} onClick={() => {
                                        setSelectedFile(null);
                                    }} style={{ color: 'var(--text-muted)' }} />
                                </div>
                            )}
                    
                    <Form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="px-2">
                        <div className="d-flex align-items-center gap-2 rounded-pill p-1 px-3 shadow-sm border focus-within-orange" style={{
                            background: isDarkMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 249, 250, 1)',
                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)'
                        }}>
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
                                style={{ color: 'var(--text-muted)' }}
                            >
                                <FaPlus size={18} />
                            </Button>

                            <Form.Control 
                                className="bg-transparent border-0 shadow-none py-2 flex-grow-1" 
                                placeholder="Message RoamIQ..." 
                                value={inputMessage} 
                                onChange={(e) => setInputMessage(e.target.value)} 
                                disabled={isLoading} 
                                style={{ 
                                    fontSize: '1.25rem', 
                                    fontWeight: '800',
                                    color: 'var(--text-main)'
                                }}
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
                                className={`rounded-circle p-2 border-0 shadow-sm transition-all flex-shrink-0 ${(!inputMessage.trim() && !selectedFile) || isLoading ? 'bg-secondary opacity-25' : 'bg-primary-gradient'}`}
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
                                <div key={conv.id} className="position-relative group pb-2" style={{ borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)' }}>
                                    {editingConvId === conv.id ? (
                                        <div className="d-flex gap-2 p-2 rounded-3" style={{ background: isDarkMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 249, 250, 1)' }}>
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
                                        <div className={`d-flex align-items-center w-100 rounded-3 p-2 transition-all ${conv.id === conversationId ? 'border border-primary border-opacity-25' : 'hover-bg-light-theme-aware'}`} style={{
                                            background: conv.id === conversationId 
                                                ? 'rgba(255, 107, 0, 0.08)' 
                                                : 'transparent'
                                        }}>
                                            <div className="p-2 rounded-circle me-3" style={{ background: conv.id === conversationId ? 'rgba(255, 107, 0, 0.15)' : 'var(--glass-bg-weather)', border: '1px solid var(--glass-border-weather)' }}>
                                                <FaMapMarkedAlt className="text-primary" size={14} />
                                            </div>
                                            <button 
                                                className="border-0 flex-grow-1 text-start fw-bold small" 
                                                onClick={() => { loadConversation(conv.id); setShowHistoryModal(false); }}
                                                style={{ background: 'transparent', color: conv.id === conversationId ? 'var(--primary)' : 'var(--text-main)' }}
                                            >
                                                {conv.title || "Untitled Trip"}
                                                <div className="x-small text-muted fw-normal" style={{ color: 'var(--text-muted)' }}>Adventure ID: {conv.id.substring(0, 8)}...</div>
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
