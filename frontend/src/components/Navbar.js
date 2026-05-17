import React, { useState, useEffect } from 'react';
import { Navbar as BootstrapNavbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTheme } from '../contexts/ThemeContext';
import { FaRobot, FaTachometerAlt, FaChevronDown, FaHome, FaCloud } from 'react-icons/fa';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { currentCurrency, changeCurrency, currencies } = useCurrency();
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(timer);
    };
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <BootstrapNavbar
      expand="lg"
      className={`navbar-premium fixed-top ${scrolled ? 'scrolled' : ''}`}
    >
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2">
          <img src="/logo.png" alt="RoamIQ" style={{ height: '32px', width: 'auto' }} />
          <span className="fw-black text-dark" style={{ fontSize: '24px', letterSpacing: '-0.5px' }}>
            Roam<span className="text-primary">IQ</span>
          </span>
        </BootstrapNavbar.Brand>

        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" className="border-0 shadow-none" />

        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="mx-auto gap-2">
            <Nav.Link as={Link} to="/" className={`nav-link-premium d-flex align-items-center gap-2 ${location.pathname === '/' ? 'active' : ''}`}>
              <FaHome size={16} /> Home
            </Nav.Link>
            {user && (
              <>
                <Nav.Link as={Link} to="/dashboard" className={`nav-link-premium d-flex align-items-center gap-2 ${location.pathname === '/dashboard' ? 'active' : ''}`}>
                  <FaTachometerAlt size={16} /> Dashboard
                </Nav.Link>
                <Nav.Link as={Link} to="/ai" className={`nav-link-premium d-flex align-items-center gap-2 ${location.pathname === '/ai' ? 'active' : ''}`}>
                  <FaRobot size={16} /> AI Hub
                </Nav.Link>
                <Nav.Link as={Link} to="/weather" className={`nav-link-premium d-flex align-items-center gap-2 ${location.pathname === '/weather' ? 'active' : ''}`}>
                  <FaCloud size={16} /> Weather
                </Nav.Link>
              </>
            )}
          </Nav>

          <Nav className="align-items-center gap-3">
            {/* Live Clock - Only on Weather Page */}
            {location.pathname === '/weather' && (
              <div className="d-none d-lg-flex align-items-center px-3 py-1 bg-light rounded-pill border border-light-subtle shadow-sm me-2">
                <span className="text-primary fw-black small animate-pulse me-2">●</span>
                <span className="fw-black text-dark small" style={{ letterSpacing: '1px', minWidth: '85px' }}>
                  {formatTime(currentTime)}
                </span>
              </div>
            )}
            {/* Global Theme Toggle Switch */}
            <div className="d-flex align-items-center gap-2 me-2">
              <span className="small fw-black text-dark text-uppercase d-none d-md-inline-block" style={{ fontSize: '10px', letterSpacing: '0.8px', opacity: 0.8, userSelect: 'none' }}>
                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
              <div 
                onClick={toggleTheme}
                className="theme-toggle-switch d-flex align-items-center position-relative shadow-sm hover-lift"
                style={{
                  width: '54px',
                  height: '28px',
                  borderRadius: '50px',
                  background: isDarkMode ? '#1e293b' : '#e2e8f0',
                  border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  padding: '2px',
                  userSelect: 'none'
                }}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Blue Mode'}
              >
                <div 
                  className="theme-toggle-thumb d-flex align-items-center justify-content-center position-absolute shadow"
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: isDarkMode ? '#f59e0b' : '#ffffff',
                    left: isDarkMode ? '28px' : '3px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontSize: '11px'
                  }}
                >
                  {isDarkMode ? '🌙' : '☀️'}
                </div>
              </div>
            </div>

            {user ? (
              <>
                {/* Currency Selector */}
                <NavDropdown
                  title={
                    <span className="fw-bold small text-muted d-flex align-items-center gap-1">
                      {currentCurrency} <FaChevronDown size={10} className="opacity-50" />
                    </span>
                  }
                  id="currency-dropdown"
                  align="end"
                  className="no-caret"
                >
                  {Object.keys(currencies).map((code) => (
                    <NavDropdown.Item key={code} onClick={() => changeCurrency(code)} className="small fw-semibold">
                      {code} ({currencies[code].symbol})
                    </NavDropdown.Item>
                  ))}
                </NavDropdown>

                <NavDropdown
                  title={
                    <div className="d-flex align-items-center gap-2 bg-light p-1 pe-3 rounded-pill border hover-lift transition-all">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: '32px', height: '32px', fontSize: '0.8rem', background: 'var(--primary-gradient)' }}>
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                      <span className="small fw-bold text-dark d-none d-md-inline">{user.username}</span>
                      <FaChevronDown size={10} className="text-muted" />
                    </div>
                  }
                  id="user-dropdown"
                  align="end"
                  className="no-caret"
                >
                  <NavDropdown.Item as={Link} to="/profile" className="small py-2 fw-bold">PROFILE</NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={logout} className="text-danger small py-2 fw-bold">SIGN OUT</NavDropdown.Item>
                </NavDropdown>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" className="nav-link-premium">Log In</Nav.Link>
                <Nav.Link as={Link} to="/register" className="btn-premium py-2">
                  Get Started
                </Nav.Link>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;