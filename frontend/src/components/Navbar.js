import React, { useState, useEffect } from 'react';
import { Navbar as BootstrapNavbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { FaRobot, FaTachometerAlt, FaChevronDown, FaHome, FaCloud } from 'react-icons/fa';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { currentCurrency, changeCurrency, currencies } = useCurrency();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
                      <div className="bg-primary-gradient text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
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