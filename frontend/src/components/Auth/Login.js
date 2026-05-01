import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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
      navigate('/dashboard');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ 
      minHeight: '90vh', 
      backgroundImage: 'linear-gradient(rgba(255, 252, 245, 0.1), rgba(255, 252, 245, 0.2)), url(/assets/banner.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <Container className="animate-fade-in">
        <Row className="justify-content-center">
          <Col md={6} lg={4}>


            <div className="glass-card p-5">
                {error && (
                  <Alert variant="danger" className="mb-4 border-0 shadow-sm small fw-bold">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-4">
                    <Form.Label className="small fw-bold text-muted text-uppercase mb-2">Username</Form.Label>
                    <Form.Control
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Enter your username"
                      className="form-control-premium"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="small fw-bold text-muted text-uppercase mb-2">Password</Form.Label>
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

                  <Button
                    type="submit"
                    className="btn-premium w-100 justify-content-center py-3"
                    disabled={loading}
                  >
                    {loading ? 'SIGNING IN...' : 'SIGN IN'}
                  </Button>
                </Form>

                <div className="text-center mt-5">
                  <p className="mb-0 text-muted small fw-bold">
                    DON'T HAVE AN ACCOUNT?{' '}
                    <Link to="/register" className="text-primary text-decoration-none">
                      SIGN UP
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

export default Login;