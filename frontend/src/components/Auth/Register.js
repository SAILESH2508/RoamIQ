import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    const { confirmPassword, ...registrationData } = formData;
    const result = await register(registrationData);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="d-flex align-items-center justify-content-center py-5" style={{ 
      minHeight: '90vh', 
      backgroundImage: 'linear-gradient(rgba(255, 252, 245, 0.1), rgba(255, 252, 245, 0.2)), url(/assets/banner.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <Container className="animate-fade-in">
        <Row className="justify-content-center">
          <Col md={10} lg={6}>


            <div className="glass-card p-5">
                {error && (
                  <Alert variant="danger" className="mb-4 border-0 shadow-sm small fw-bold">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Row className="g-4">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted text-uppercase mb-2">Username *</Form.Label>
                        <Form.Control
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          placeholder="johndoe"
                          className="form-control-premium"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted text-uppercase mb-2">Email *</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="john@example.com"
                          className="form-control-premium"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted text-uppercase mb-2">Full Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleChange}
                          placeholder="John Doe"
                          className="form-control-premium"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted text-uppercase mb-2">Password *</Form.Label>
                        <Form.Control
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="form-control-premium"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted text-uppercase mb-2">Confirm Password *</Form.Label>
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="form-control-premium"
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Button
                    type="submit"
                    className="btn-premium w-100 justify-content-center py-3 mt-5"
                    disabled={loading}
                  >
                    {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                  </Button>
                </Form>

                <div className="text-center mt-5">
                  <p className="mb-0 text-muted small fw-bold">
                    ALREADY HAVE AN ACCOUNT?{' '}
                    <Link to="/login" className="text-primary text-decoration-none">
                      SIGN IN
                    </Link>
                  </p>
                </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Register;