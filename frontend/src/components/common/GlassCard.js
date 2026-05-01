import React from 'react';
import styled from 'styled-components';

const StyledGlassCard = styled.div`
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  box-shadow: var(--glass-shadow);
  padding: 2.5rem;
  color: var(--text-primary);
  transition: transform var(--trans-medium), box-shadow var(--trans-medium), border-color var(--trans-medium);
  position: relative;
  overflow: hidden;

  /* Subtle gradient overlay */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--surface-gradient);
    z-index: -1;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 15px 35px 0 rgba(0, 0, 0, 0.4);
    border-color: rgba(255, 255, 255, 0.25);
  }
`;

const GlassCard = ({ children, className, ...props }) => {
  return (
    <StyledGlassCard className={className} {...props}>
      {children}
    </StyledGlassCard>
  );
};

export default GlassCard;
