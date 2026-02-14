import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
// No icons used

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
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

    const result = await login(formData);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="login-page cinematic-bg d-flex align-items-center page-container" style={{
      minHeight: '82vh',
      backgroundImage: 'url(/assets/hero-bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <Container className="animate-entrance">
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <Card className="border-0 shadow-2xl overflow-hidden" style={{ background: '#ffffff', borderRadius: '24px', boxShadow: '0 0 40px rgba(249, 115, 22, 0.15)' }}>
              <div className="bg-gradient-header py-2" style={{ background: 'linear-gradient(90deg, #f97316, #fbbf24)' }}></div>
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <h2 className="fw-black mb-2 text-dark" style={{ letterSpacing: '-0.02em' }}>
                    Welcome Back
                  </h2>
                  <p className="text-muted mb-0 small fw-bold">Sign in to your RoamIQ account</p>
                </div>

                {error && (
                  <Alert variant="danger" className="mb-4 border-0 shadow-sm small fw-bold">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-black small text-uppercase text-dark mb-2">
                      Username or Email
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Username or email"
                      className="form-control-custom rounded-pill px-4 py-3 border-0 bg-light fw-bold"
                      style={{ fontSize: '0.9rem' }}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-black x-small text-uppercase text-dark mb-1">
                      Password
                    </Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="form-control-custom rounded-pill px-4 py-3 border-0 bg-light fw-bold"
                      style={{ fontSize: '0.9rem' }}
                      required
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    className="w-100 mb-4 py-3 rounded-pill border-0 shadow-xl fw-black"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)', boxShadow: '0 10px 20px rgba(249, 115, 22, 0.3)' }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        SIGNING IN...
                      </>
                    ) : (
                      'SIGN IN'
                    )}
                  </Button>
                </Form>

                <div className="text-center">
                  <p className="mb-0 text-muted small">
                    Don't have an account?{' '}
                    <Link
                      to="/register"
                      className="text-decoration-none fw-bold"
                      style={{ color: '#f97316' }}
                    >
                      Sign up here
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

export default Login;