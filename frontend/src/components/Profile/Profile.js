import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { FaUser, FaSave, FaHeart } from 'react-icons/fa';
import axios from 'axios';
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

  const dietaryOptions = [
    'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-free', 'Halal', 'Kosher'
  ];

  const cuisineOptions = [
    'Italian', 'Chinese', 'Indian', 'Mexican', 'Japanese', 'Thai', 'French', 'Mediterranean'
  ];

  const activityOptions = [
    'Adventure Sports', 'Cultural Sites', 'Museums', 'Nature/Wildlife', 'Beaches', 'Mountains',
    'Photography', 'Food Tours', 'Shopping', 'Nightlife', 'Festivals', 'Historical Sites'
  ];

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col lg={8}>
          <Card className="glass-card border-0 shadow-lg">
            <Card.Header className="bg-transparent border-0 p-4">
              <h2 className="fw-bold mb-0" style={{
                background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                <FaUser className="me-2" />
                Profile Settings
              </h2>
              <p className="text-muted mb-0">Manage your account and travel preferences</p>
            </Card.Header>

            <Card.Body className="p-4">
              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}

              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4"
              >
                {/* Profile Tab */}
                <Tab eventKey="profile" title={
                  <span>
                    <FaUser className="me-1" />
                    Profile
                  </span>
                }>
                  <Form onSubmit={handleProfileSubmit}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">Full Name</Form.Label>
                          <Form.Control
                            type="text"
                            name="full_name"
                            value={profileData.full_name}
                            onChange={handleProfileChange}
                            placeholder="Enter your full name"
                            className="form-control-custom"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">Phone</Form.Label>
                          <Form.Control
                            type="tel"
                            name="phone"
                            value={profileData.phone}
                            onChange={handleProfileChange}
                            placeholder="Enter your phone number"
                            className="form-control-custom"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">Date of Birth</Form.Label>
                          <Form.Control
                            type="date"
                            name="date_of_birth"
                            value={profileData.date_of_birth}
                            onChange={handleProfileChange}
                            className="form-control-custom"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">Email</Form.Label>
                          <Form.Control
                            type="email"
                            value={user?.email || ''}
                            className="form-control-custom"
                            readOnly
                          />
                          <Form.Text className="text-muted">
                            Email cannot be changed
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Button
                      type="submit"
                      className="btn-gradient"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <FaSave className="me-2" />
                          Update Profile
                        </>
                      )}
                    </Button>
                  </Form>
                </Tab>

                {/* Preferences Tab */}
                <Tab eventKey="preferences" title={
                  <span>
                    <FaHeart className="me-1" />
                    Travel Preferences
                  </span>
                }>
                  <Form onSubmit={handlePreferencesSubmit}>
                    {/* Travel Style */}
                    <h5 className="fw-semibold mb-3">Travel Style</h5>
                    <Row className="mb-4">
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">Budget Range</Form.Label>
                          <Form.Select
                            name="budget_range"
                            value={preferences.budget_range}
                            onChange={handlePreferenceChange}
                            className="form-control-custom"
                          >
                            <option value="budget">Budget</option>
                            <option value="mid-range">Mid-range</option>
                            <option value="luxury">Luxury</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">Travel Style</Form.Label>
                          <Form.Select
                            name="travel_style"
                            value={preferences.travel_style}
                            onChange={handlePreferenceChange}
                            className="form-control-custom"
                          >
                            <option value="adventure">Adventure</option>
                            <option value="relaxation">Relaxation</option>
                            <option value="cultural">Cultural</option>
                            <option value="business">Business</option>
                            <option value="leisure">Leisure</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">Group Type</Form.Label>
                          <Form.Select
                            name="group_type"
                            value={preferences.group_type}
                            onChange={handlePreferenceChange}
                            className="form-control-custom"
                          >
                            <option value="solo">Solo</option>
                            <option value="couple">Couple</option>
                            <option value="family">Family</option>
                            <option value="friends">Friends</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* Food Preferences */}
                    <h5 className="fw-semibold mb-3">Food Preferences</h5>
                    <Row className="mb-3">
                      <Col md={6}>
                        <Form.Label className="fw-semibold">Dietary Restrictions</Form.Label>
                        <div className="mb-3">
                          {dietaryOptions.map(option => (
                            <Form.Check
                              key={option}
                              type="checkbox"
                              label={option}
                              checked={preferences.dietary_restrictions.includes(option)}
                              onChange={(e) => handleArrayPreferenceChange('dietary_restrictions', option, e.target.checked)}
                              className="mb-1"
                            />
                          ))}
                        </div>
                      </Col>
                      <Col md={6}>
                        <Form.Label className="fw-semibold">Cuisine Preferences</Form.Label>
                        <div className="mb-3">
                          {cuisineOptions.map(option => (
                            <Form.Check
                              key={option}
                              type="checkbox"
                              label={option}
                              checked={preferences.cuisine_preferences.includes(option)}
                              onChange={(e) => handleArrayPreferenceChange('cuisine_preferences', option, e.target.checked)}
                              className="mb-1"
                            />
                          ))}
                        </div>
                      </Col>
                    </Row>

                    <Row className="mb-4">
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">Food Adventure Level</Form.Label>
                          <Form.Select
                            name="food_adventure_level"
                            value={preferences.food_adventure_level}
                            onChange={handlePreferenceChange}
                            className="form-control-custom"
                          >
                            <option value="conservative">Conservative</option>
                            <option value="moderate">Moderate</option>
                            <option value="adventurous">Adventurous</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">Fitness Level</Form.Label>
                          <Form.Select
                            name="fitness_level"
                            value={preferences.fitness_level}
                            onChange={handlePreferenceChange}
                            className="form-control-custom"
                          >
                            <option value="low">Low</option>
                            <option value="moderate">Moderate</option>
                            <option value="high">High</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* Activity Interests */}
                    <h5 className="fw-semibold mb-3">Activity Interests</h5>
                    <Row className="mb-4">
                      <Col>
                        {activityOptions.map(option => (
                          <Form.Check
                            key={option}
                            type="checkbox"
                            label={option}
                            checked={preferences.activity_interests.includes(option)}
                            onChange={(e) => handleArrayPreferenceChange('activity_interests', option, e.target.checked)}
                            className="mb-1 d-inline-block me-4"
                          />
                        ))}
                      </Col>
                    </Row>

                    {/* Other Preferences */}
                    <h5 className="fw-semibold mb-3">Other Preferences</h5>
                    <Row className="mb-4">
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">Accommodation Type</Form.Label>
                          <Form.Select
                            name="accommodation_type"
                            value={preferences.accommodation_type}
                            onChange={handlePreferenceChange}
                            className="form-control-custom"
                          >
                            <option value="hotel">Hotel</option>
                            <option value="hostel">Hostel</option>
                            <option value="airbnb">Airbnb</option>
                            <option value="resort">Resort</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="checkbox"
                            name="sustainability_priority"
                            label="Prioritize Sustainable Travel"
                            checked={preferences.sustainability_priority}
                            onChange={handlePreferenceChange}
                            className="mt-4"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Button
                      type="submit"
                      className="btn-gradient"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <FaSave className="me-2" />
                          Update Preferences
                        </>
                      )}
                    </Button>
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