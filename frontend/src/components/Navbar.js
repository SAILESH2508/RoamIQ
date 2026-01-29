import React from 'react';
import { Navbar as BootstrapNavbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { FaRobot, FaUser, FaSignOutAlt, FaTachometerAlt, FaGlobe } from 'react-icons/fa';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { currentCurrency, changeCurrency, currencies } = useCurrency();




  return (
    <BootstrapNavbar
      expand="lg"
      className="glass-panel fixed-top border-0 border-bottom-0 py-2 mb-3"
      style={{
        background: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 0,
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.03)'
      }}
    >
      <Container>
        <LinkContainer to="/">
          <BootstrapNavbar.Brand className="d-flex align-items-center gap-2">
            <div className="bg-gradient-header p-2 rounded-3 shadow-sm d-flex align-items-center justify-content-center">
              <FaRobot className="text-white" size={20} />
            </div>
            <span className="gradients-text fs-4">
              RoamIQ
            </span>
          </BootstrapNavbar.Brand>
        </LinkContainer>

        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" className="border-0 shadow-none" />

        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          {user ? (
            <>
              <Nav className="mx-auto bg-white bg-opacity-50 rounded-pill p-1 border border-white border-opacity-50 shadow-sm mt-3 mt-lg-0">
                <LinkContainer to="/dashboard">
                  <Nav.Link className="px-4 rounded-pill fw-semibold" style={{ color: 'var(--text-secondary)' }}>
                    <FaTachometerAlt className="me-2 text-warning" />
                    Dashboard
                  </Nav.Link>
                </LinkContainer>

                <LinkContainer to="/ai">
                  <Nav.Link className="px-4 rounded-pill fw-semibold" style={{ color: 'var(--text-secondary)' }}>
                    <FaRobot className="me-2 text-warning" />
                    AI Hub
                  </Nav.Link>
                </LinkContainer>
              </Nav>

              <Nav className="align-items-center gap-3 mt-3 mt-lg-0">


                {/* Global Currency Selector */}
                <NavDropdown
                  title={
                    <span className="d-flex align-items-center fw-bold small text-uppercase" style={{ color: 'var(--text-primary)' }}>
                      <FaGlobe className="me-2 text-warning" />
                      {currentCurrency}
                    </span>
                  }
                  id="currency-dropdown"
                  className="glass-dropdown"
                  align="end"
                >
                  {Object.keys(currencies).map((code) => (
                    <NavDropdown.Item
                      key={code}
                      onClick={() => changeCurrency(code)}
                      className={`fw-medium small ${currentCurrency === code ? 'active bg-amber-soft text-dark' : ''}`}
                    >
                      {code} ({currencies[code].symbol})
                    </NavDropdown.Item>
                  ))}
                </NavDropdown>

                <div className="vr d-none d-lg-block mx-2 text-muted opacity-25"></div>

                <NavDropdown
                  title={
                    <div className="d-flex align-items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <div className="bg-gradient-header rounded-circle p-2 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '38px', height: '38px' }}>
                        <span className="text-white fw-bold small mb-0">
                          {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="fw-bold small">{user.full_name || user.username}</span>
                    </div>
                  }
                  id="user-dropdown"
                  align="end"
                >
                  <LinkContainer to="/profile">
                    <NavDropdown.Item className="small py-2">
                      <FaUser className="me-2 text-muted" />
                      Profile Settings
                    </NavDropdown.Item>
                  </LinkContainer>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={logout} className="text-danger small py-2">
                    <FaSignOutAlt className="me-2" />
                    Sign Out
                  </NavDropdown.Item>
                </NavDropdown>
              </Nav>
            </>
          ) : (
            <Nav className="ms-auto gap-2">
              <LinkContainer to="/login">
                <Nav.Link className="btn btn-sm btn-link text-decoration-none fw-bold text-dark">Log In</Nav.Link>
              </LinkContainer>
              <LinkContainer to="/register">
                <Nav.Link className="btn btn-sm btn-gradient shadow-sm text-white px-4 rounded-pill">Get Started</Nav.Link>
              </LinkContainer>
            </Nav>
          )}
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;