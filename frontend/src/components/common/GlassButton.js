import React from 'react';
import styled from 'styled-components';

const StyledButton = styled.button`
  background: ${props => props.variant === 'secondary'
    ? 'rgba(255, 255, 255, 0.1)'
    : 'var(--primary-gradient)'};
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px 24px;
  color: var(--text-primary);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--trans-medium);
  backdrop-filter: blur(4px);
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    background: ${props => props.variant === 'secondary'
    ? 'rgba(255, 255, 255, 0.2)'
    : 'var(--secondary-gradient)'};
    border-color: rgba(255, 255, 255, 0.3);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    background: rgba(255, 255, 255, 0.05);
  }
`;

const GlassButton = ({ children, variant = 'primary', ...props }) => {
  return (
    <StyledButton variant={variant} {...props}>
      {children}
    </StyledButton>
  );
};

export default GlassButton;
