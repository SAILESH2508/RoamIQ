import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Tab, Tabs } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { FaUser, FaHeart, FaShieldAlt, FaMapMarkedAlt, FaCamera, FaEnvelope, FaPhone, FaCalendarAlt } from 'react-icons/fa';
import axios from '../../api/axios';
import { toast } from 'react-toastify';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Profile form data
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    date_of_birth: ''
  });

  // Preferences form data
  const [preferences, setPreferences] = useState({
    budget_range: 'mid-range',
    travel_style: 'leisure',
    group_type: 'solo',
    dietary_restrictions: [],
    cuisine_preferences: [],
    food_adventure_level: 'moderate',
    activity_interests: [],
    fitness_level: 'moderate',
    accommodation_type: 'hotel',
    sustainability_priority: false
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || ''
      });
    }
    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get('/api/travel/preferences');
      if (response.data.preferences) {
        setPreferences(prev => ({
          ...prev,
          ...response.data.preferences
        }));
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handlePreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleArrayPreferenceChange = (name, value, checked) => {
    setPreferences(prev => ({
      ...prev,
      [name]: checked
        ? [...prev[name], value]
        : prev[name].filter(item => item !== value)
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await updateProfile(profileData);

    if (result.success) {
      toast.success('Profile updated! 🚀');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.put('/api/travel/preferences', preferences);
      toast.success('Travel DNA updated! 🌍');
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update preferences';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const activityOptions = [
    'Adventure Sports', 'Cultural Sites', 'Museums', 'Nature/Wildlife', 'Beaches', 'Mountains',
    'Photography', 'Food Tours', 'Shopping', 'Nightlife', 'Festivals', 'Historical Sites'
  ];

  return (
    <Container className="py-5 animate-fade-in">
      <Row className="justify-content-center">
        <Col lg={10}>
          {/* Profile Header Card */}
          <div className="glass-card overflow-hidden mb-5 border-0 shadow-lg">
            <div className="bg-primary-gradient p-5 text-center text-white position-relative rounded-top-4">
              <div className="position-relative z-index-1">
                <div className="mb-4 position-relative d-inline-block">
                  <div className="bg-white rounded-circle p-1 shadow-lg">
                    <div className="bg-primary-gradient text-white rounded-circle d-flex align-items-center justify-content-center fw-black shadow-inner" style={{ width: '100px', height: '100px', fontSize: '2.5rem' }}>
                      {user?.username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <Button variant="light" className="position-absolute bottom-0 end-0 rounded-circle shadow-sm p-2 border-0 hover-scale">
                    <FaCamera size={14} className="text-primary" />
                  </Button>
                </div>
                <h2 className="fw-black mb-1">{user?.full_name || user?.username}</h2>
                <div className="d-flex align-items-center justify-content-center gap-3 opacity-90 small fw-bold">
                  <span><FaEnvelope className="me-1" /> {user?.email}</span>
                  <span><FaMapMarkedAlt className="me-1" /> Explorer Status</span>
                </div>
              </div>
            </div>

            <div className="p-0">
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="custom-tabs border-0 bg-light px-4"
              >
                <Tab eventKey="profile" title={<><FaUser className="me-2" /> Account Details</>}>
                  <div className="p-5">
                    {error && <Alert variant="danger" className="mb-4 border-0 shadow-sm small fw-bold">{error}</Alert>}
                    <Form onSubmit={handleProfileSubmit}>
                      <Row className="g-4">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted text-uppercase mb-2">Full Name</Form.Label>
                            <Form.Control
                              type="text"
                              name="full_name"
                              value={profileData.full_name}
                              onChange={handleProfileChange}
                              placeholder="e.g. John Doe"
                              className="form-control-premium"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted text-uppercase mb-2"><FaPhone className="me-1" /> Phone Number</Form.Label>
                            <Form.Control
                              type="tel"
                              name="phone"
                              value={profileData.phone}
                              onChange={handleProfileChange}
                              placeholder="+1 234 567 890"
                              className="form-control-premium"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted text-uppercase mb-2"><FaCalendarAlt className="me-1" /> Date of Birth</Form.Label>
                            <Form.Control
                              type="date"
                              name="date_of_birth"
                              value={profileData.date_of_birth}
                              onChange={handleProfileChange}
                              className="form-control-premium"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-bold text-muted text-uppercase mb-2"><FaShieldAlt className="me-1" /> Account Role</Form.Label>
                            <Form.Control
                              type="text"
                              value="Global Traveler"
                              className="form-control-premium bg-light opacity-75"
                              readOnly
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <div className="text-center mt-5">
                        <Button type="submit" className="btn-premium px-5 py-3 shadow-lg" disabled={loading}>
                          {loading ? 'UPDATING...' : 'SAVE CHANGES'}
                        </Button>
                      </div>
                    </Form>
                  </div>
                </Tab>

                <Tab eventKey="preferences" title={<><FaHeart className="me-2" /> Travel DNA</>}>
                  <div className="p-5">
                    <Form onSubmit={handlePreferencesSubmit}>
                      <div className="glass-panel p-4 mb-5 shadow-sm border-0 bg-light">
                        <h5 className="fw-black mb-4 text-primary d-flex align-items-center gap-2">
                          <FaMapMarkedAlt /> Core Preferences
                        </h5>
                        <Row className="g-4">
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label className="small fw-bold text-muted text-uppercase mb-2">Budget Range</Form.Label>
                              <Form.Select
                                name="budget_range"
                                value={preferences.budget_range}
                                onChange={handlePreferenceChange}
                                className="form-control-premium"
                              >
                                <option value="budget">Budget explorer</option>
                                <option value="mid-range">Mid-range comfort</option>
                                <option value="luxury">Luxury experience</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label className="small fw-bold text-muted text-uppercase mb-2">Travel Style</Form.Label>
                              <Form.Select
                                name="travel_style"
                                value={preferences.travel_style}
                                onChange={handlePreferenceChange}
                                className="form-control-premium"
                              >
                                <option value="adventure">High Adventure</option>
                                <option value="relaxation">Pure Relaxation</option>
                                <option value="cultural">Deep Culture</option>
                                <option value="leisure">Leisurely Pace</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label className="small fw-bold text-muted text-uppercase mb-2">Group Dynamic</Form.Label>
                              <Form.Select
                                name="group_type"
                                value={preferences.group_type}
                                onChange={handlePreferenceChange}
                                className="form-control-premium"
                              >
                                <option value="solo">Solo Traveler</option>
                                <option value="couple">Couple</option>
                                <option value="family">Family</option>
                                <option value="friends">Friends</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </Row>
                      </div>

                      <div className="mb-5">
                        <h5 className="fw-black mb-4 text-primary">Interest Tags</h5>
                        <div className="d-flex flex-wrap gap-2">
                          {activityOptions.map(option => (
                            <div key={option} className="form-check-pill">
                              <input
                                type="checkbox"
                                id={`act-${option}`}
                                checked={preferences.activity_interests.includes(option)}
                                onChange={(e) => handleArrayPreferenceChange('activity_interests', option, e.target.checked)}
                                className="d-none"
                              />
                              <label htmlFor={`act-${option}`} className={`rounded-pill px-4 py-2 border shadow-sm small fw-bold transition-all clickable ${preferences.activity_interests.includes(option) ? 'bg-primary-gradient text-white border-0' : 'bg-white text-muted hover-bg-light'}`}>
                                {option}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="glass-panel p-4 mb-4 shadow-sm border-0 bg-light">
                        <Row className="g-4 align-items-center">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="small fw-bold text-muted text-uppercase mb-2">Preferred Accommodation</Form.Label>
                              <Form.Select
                                name="accommodation_type"
                                value={preferences.accommodation_type}
                                onChange={handlePreferenceChange}
                                className="form-control-premium"
                              >
                                <option value="hotel">Modern Hotel</option>
                                <option value="hostel">Social Hostel</option>
                                <option value="airbnb">Local Airbnb</option>
                                <option value="resort">All-in Resort</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Check
                              type="switch"
                              id="sustainability-switch"
                              name="sustainability_priority"
                              label="Prioritize Eco-Friendly Travel"
                              checked={preferences.sustainability_priority}
                              onChange={handlePreferenceChange}
                              className="fw-black text-muted custom-switch-premium"
                            />
                          </Col>
                        </Row>
                      </div>

                      <div className="text-center mt-5">
                        <Button type="submit" className="btn-premium px-5 py-3 shadow-lg" disabled={loading}>
                          {loading ? 'UPDATING...' : 'SAVE TRAVEL DNA'}
                        </Button>
                      </div>
                    </Form>
                  </div>
                </Tab>
              </Tabs>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;