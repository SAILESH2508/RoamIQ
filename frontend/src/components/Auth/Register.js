import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
// No icons used

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    date_of_birth: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    const { confirmPassword, ...registrationData } = formData;
    const result = await register(registrationData);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="register-page cinematic-bg d-flex align-items-center page-container" style={{
      minHeight: '82vh',
      backgroundImage: 'url(/assets/hero-bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <Container className="animate-entrance py-4">
        <Row className="justify-content-center">
          <Col md={8} lg={5}>
            <Card className="border-0 shadow-2xl overflow-hidden" style={{ background: '#ffffff', borderRadius: '24px', boxShadow: '0 0 40px rgba(249, 115, 22, 0.15)' }}>
              <div className="bg-gradient-header py-2" style={{ background: 'linear-gradient(90deg, #f97316, #fbbf24)' }}></div>
              <Card.Body className="p-4 px-md-5">
                <div className="text-center mb-4">
                  <h2 className="fw-black mb-2 text-dark" style={{ letterSpacing: '-0.02em' }}>
                    Join RoamIQ
                  </h2>
                  <p className="text-muted mb-0 small fw-bold">Create your account and start exploring</p>
                </div>

                {error && (
                  <Alert variant="danger" className="mb-4 border-0 shadow-sm small fw-bold">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Row className="g-2">
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label className="fw-black x-small text-uppercase text-dark mb-1">Username *</Form.Label>
                        <Form.Control
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          placeholder="Username"
                          className="form-control-custom rounded-pill px-3 py-2 border-0 bg-light fw-bold small"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label className="fw-black x-small text-uppercase text-dark mb-1">Email *</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Email"
                          className="form-control-custom rounded-pill px-3 py-2 border-0 bg-light fw-bold small"
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-2">
                    <Form.Label className="fw-black x-small text-uppercase text-dark mb-1">Full Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Your full name"
                      className="form-control-custom rounded-pill px-3 py-2 border-0 bg-light fw-bold small"
                    />
                  </Form.Group>

                  <Row className="g-2">
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label className="fw-black x-small text-uppercase text-dark mb-1">Phone</Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="Phone"
                          className="form-control-custom rounded-pill px-3 py-2 border-0 bg-light fw-bold small"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label className="fw-black x-small text-uppercase text-dark mb-1">DOB</Form.Label>
                        <Form.Control
                          type="date"
                          name="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={handleChange}
                          className="form-control-custom rounded-pill px-3 py-2 border-0 bg-light fw-bold small"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row className="g-2">
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label className="fw-black x-small text-uppercase text-dark mb-1">Password *</Form.Label>
                        <Form.Control
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Password"
                          className="form-control-custom rounded-pill px-3 py-2 border-0 bg-light fw-bold small"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-black x-small text-uppercase text-dark mb-1">Confirm *</Form.Label>
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Confirm"
                          className="form-control-custom rounded-pill px-3 py-2 border-0 bg-light fw-bold small"
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Button
                    type="submit"
                    className="w-100 mb-4 py-3 rounded-pill border-0 shadow-xl fw-black"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)', boxShadow: '0 10px 20px rgba(249, 115, 22, 0.3)' }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        CREATING ACCOUNT...
                      </>
                    ) : (
                      'CREATE ACCOUNT'
                    )}
                  </Button>
                </Form>

                <div className="text-center">
                  <p className="mb-0 text-muted small">
                    Already have an account?{' '}
                    <Link
                      to="/login"
                      className="text-decoration-none fw-bold"
                      style={{ color: '#f97316' }}
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Register;