import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { FaUser, FaHeart } from 'react-icons/fa';
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

    if (!result.success) {
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
      toast.success('Preferences updated successfully!');
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
    <Container className="py-5 animate-entrance page-container">
      <Row className="justify-content-center">
        <Col lg={9}>
          <Card className="glass-card border-0 shadow-2xl overflow-hidden">
            <div className="bg-gradient-header p-5 text-center text-white">
              <div className="bg-white bg-opacity-20 rounded-circle p-4 d-inline-block mb-3 backdrop-blur shadow-sm">
                <FaUser size={48} className="text-white" />
              </div>
              <h2 className="fw-bold mb-1">{user?.full_name || user?.username}</h2>
              <p className="mb-0 opacity-75">{user?.email}</p>
            </div>

            <Card.Body className="p-4 p-md-5">
              {error && (
                <Alert variant="danger" className="mb-4 border-0 shadow-sm">
                  {error}
                </Alert>
              )}

              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="custom-tabs mb-5 border-0 justify-content-center"
              >
                {/* Profile Tab */}
                <Tab eventKey="profile" title={
                  <div className="px-4 py-2">
                    <FaUser className="me-2" />
                    Account
                  </div>
                }>
                  <Form onSubmit={handleProfileSubmit} className="pt-4">
                    <Row className="g-4">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-bold small text-uppercase text-muted mb-2">Full Name</Form.Label>
                          <Form.Control
                            type="text"
                            name="full_name"
                            value={profileData.full_name}
                            onChange={handleProfileChange}
                            placeholder="Your name"
                            className="form-control-custom rounded-pill px-4 py-2 border-0 bg-light shadow-inner"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-bold small text-uppercase text-muted mb-2">Phone</Form.Label>
                          <Form.Control
                            type="tel"
                            name="phone"
                            value={profileData.phone}
                            onChange={handleProfileChange}
                            placeholder="Contact number"
                            className="form-control-custom rounded-pill px-4 py-2 border-0 bg-light shadow-inner"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-bold small text-uppercase text-muted mb-2">Date of Birth</Form.Label>
                          <Form.Control
                            type="date"
                            name="date_of_birth"
                            value={profileData.date_of_birth}
                            onChange={handleProfileChange}
                            className="form-control-custom rounded-pill px-4 py-2 border-0 bg-light shadow-inner"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fw-bold small text-uppercase text-muted mb-2">Email (Static)</Form.Label>
                          <Form.Control
                            type="email"
                            value={user?.email || ''}
                            className="form-control-custom rounded-pill px-4 py-2 border-0 bg-light shadow-inner opacity-75"
                            readOnly
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <div className="text-center mt-5">
                      <Button
                        type="submit"
                        className="btn-gradient px-5 py-2 rounded-pill border-0 shadow-lg fw-bold"
                        disabled={loading}
                      >
                        {loading ? 'Updating...' : 'Save Profile Details'}
                      </Button>
                    </div>
                  </Form>
                </Tab>

                {/* Preferences Tab */}
                <Tab eventKey="preferences" title={
                  <div className="px-4 py-2">
                    <FaHeart className="me-2" />
                    Travel Style
                  </div>
                }>
                  <Form onSubmit={handlePreferencesSubmit} className="pt-4">
                    <div className="glass-panel p-4 mb-4">
                      <h5 className="fw-bold mb-4 text-primary">Core Preferences</h5>
                      <Row className="g-4">
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fw-bold small text-uppercase text-muted mb-2">Budget</Form.Label>
                            <Form.Select
                              name="budget_range"
                              value={preferences.budget_range}
                              onChange={handlePreferenceChange}
                              className="form-control-custom rounded-pill px-4 py-2 border-0 bg-light shadow-inner clickable"
                            >
                              <option value="budget">Budget explorer</option>
                              <option value="mid-range">Mid-range comfort</option>
                              <option value="luxury">Luxury experience</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fw-bold small text-uppercase text-muted mb-2">Style</Form.Label>
                            <Form.Select
                              name="travel_style"
                              value={preferences.travel_style}
                              onChange={handlePreferenceChange}
                              className="form-control-custom rounded-pill px-4 py-2 border-0 bg-light shadow-inner clickable"
                            >
                              <option value="adventure">High Adventure</option>
                              <option value="relaxation">Pure Relaxation</option>
                              <option value="cultural">Deep Culture</option>
                              <option value="business">Business Focus</option>
                              <option value="leisure">Leisurely Pace</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fw-bold small text-uppercase text-muted mb-2">Group</Form.Label>
                            <Form.Select
                              name="group_type"
                              value={preferences.group_type}
                              onChange={handlePreferenceChange}
                              className="form-control-custom rounded-pill px-4 py-2 border-0 bg-light shadow-inner clickable"
                            >
                              <option value="solo">Solo Traveler</option>
                              <option value="couple">Couple's Retreat</option>
                              <option value="family">Family Adventure</option>
                              <option value="friends">Group of Friends</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>

                    <div className="glass-panel p-4 mb-4">
                      <h5 className="fw-bold mb-4 text-primary">Interests & Options</h5>
                      <Row className="g-4">
                        <Col md={12}>
                          <Form.Label className="fw-bold small text-uppercase text-muted mb-3 d-block">Activity Interests</Form.Label>
                          <div className="d-flex flex-wrap gap-2">
                            {activityOptions.map(option => (
                              <div key={option} className="form-check-pill">
                                <input
                                  type="checkbox"
                                  id={`act-${option}`}
                                  checked={preferences.activity_interests.includes(option)}
                                  onChange={(e) => handleArrayPreferenceChange('activity_interests', option, e.target.checked)}
                                />
                                <label htmlFor={`act-${option}`} className="rounded-pill px-3 py-1 border shadow-sm small clickable">
                                  {option}
                                </label>
                              </div>
                            ))}
                          </div>
                        </Col>

                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-bold small text-uppercase text-muted mb-2">Accommodation</Form.Label>
                            <Form.Select
                              name="accommodation_type"
                              value={preferences.accommodation_type}
                              onChange={handlePreferenceChange}
                              className="form-control-custom rounded-pill px-4 py-2 border-0 bg-light shadow-inner clickable"
                            >
                              <option value="hotel">Modern Hotel</option>
                              <option value="hostel">Social Hostel</option>
                              <option value="airbnb">Local Airbnb</option>
                              <option value="resort">All-in Resort</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>

                        <Col md={6} className="d-flex align-items-end pb-1">
                          <Form.Check
                            type="switch"
                            id="sustainability-switch"
                            name="sustainability_priority"
                            label="Prioritize Sustainable Travel"
                            checked={preferences.sustainability_priority}
                            onChange={handlePreferenceChange}
                            className="fw-bold text-muted"
                          />
                        </Col>
                      </Row>
                    </div>

                    <div className="text-center mt-5">
                      <Button
                        type="submit"
                        className="btn-gradient px-5 py-2 rounded-pill border-0 shadow-lg fw-bold"
                        disabled={loading}
                      >
                        {loading ? 'Updating...' : 'Save Travel Preferences'}
                      </Button>
                    </div>
                  </Form>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;