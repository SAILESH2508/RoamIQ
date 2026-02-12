import React, { useState, useEffect } from 'react';
import { Navbar as BootstrapNavbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { FaRobot, FaTachometerAlt, FaGlobe, FaChevronDown, FaTicketAlt, FaSync } from 'react-icons/fa';

const Navbar = () => {
  const { user, logout } = useAuth();
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
      <Container fluid className="px-lg-5">
        <BootstrapNavbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <div className="logo-container-premium">
            <FaRobot className="text-white" size={20} />
          </div>
          <span className="logo-text-premium">RoamIQ</span>
        </BootstrapNavbar.Brand>

        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" className="border-0 shadow-none" />

        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="mx-auto nav-pill-central mt-3 mt-lg-0">
            {user ? (
              <>
                <Nav.Link as={Link} to="/" className="nav-link-premium">
                  <FaRobot />
                  Home
                </Nav.Link>

                <Nav.Link as={Link} to="/dashboard" className="nav-link-premium">
                  <FaTachometerAlt />
                  Dashboard
                </Nav.Link>

                <Nav.Link as={Link} to="/ai" className="nav-link-premium">
                  <FaRobot />
                  AI Hub
                </Nav.Link>

                <Nav.Link as={Link} to="/dashboard?tab=bookings" className="nav-link-premium">
                  <FaTicketAlt />
                  Bookings
                </Nav.Link>

                <Nav.Link
                  className="nav-link-premium"
                  onClick={() => window.open('https://weather-prediction-nu-nine.vercel.app/', '_blank')}
                >
                  <FaSync className="text-warning" />
                  Weather
                </Nav.Link>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/" className="nav-link-premium">
                  <FaRobot />
                  Home
                </Nav.Link>
                <Nav.Link href="#features" className="nav-link-premium">Features</Nav.Link>
              </>
            )}
          </Nav>

          {user ? (
            <Nav className="align-items-center gap-2 mt-3 mt-lg-0">
              {/* Currency Selector */}
              <NavDropdown
                title={
                  <span className="d-flex align-items-center gap-2 fw-bold small text-dark">
                    <FaGlobe className="text-warning" />
                    <span className="fw-black">{currentCurrency}</span>
                    <FaChevronDown size={8} className="text-muted ms-1" />
                  </span>
                }
                id="currency-dropdown"
                className="glass-dropdown no-caret"
                align="end"
              >
                {Object.keys(currencies).map((code) => (
                  <NavDropdown.Item
                    key={code}
                    onClick={() => changeCurrency(code)}
                    className="small fw-semibold"
                  >
                    {code} ({currencies[code].symbol})
                  </NavDropdown.Item>
                ))}
              </NavDropdown>

              <div className="vr d-none d-lg-block mx-2 text-muted opacity-25" style={{ height: '30px' }}></div>

              <NavDropdown
                title={
                  <div className="d-flex align-items-center gap-3">
                    <div className="user-avatar-premium shadow-sm">
                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="user-name-premium d-none d-md-inline">
                      {user.full_name || user.username}
                    </span>
                    <FaChevronDown size={10} className="text-muted d-none d-md-inline" />
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
            </Nav>
          ) : (
            <Nav className="ms-auto gap-3">
              <Nav.Link as={Link} to="/login" className="nav-link-premium border-0 p-0 text-dark">Log In</Nav.Link>
              <Nav.Link as={Link} to="/register" className="btn-gradient text-white rounded-pill px-4 fw-bold shadow-sm">
                Get Started
              </Nav.Link>
            </Nav>
          )}
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;