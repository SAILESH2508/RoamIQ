import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('global-dark-mode') === 'true';
    });

    const toggleTheme = () => {
        setIsDarkMode(prev => !prev);
    };

    useEffect(() => {
        localStorage.setItem('global-dark-mode', isDarkMode);
        
        // Apply variables globally to documentElement
        if (isDarkMode) {
            document.body.classList.add('theme-dark-blue');
            document.documentElement.style.setProperty('--bg-main', '#0a0f24');
            document.documentElement.style.setProperty('--bg-card', 'linear-gradient(135deg, rgba(16, 28, 64, 0.85) 0%, rgba(21, 32, 67, 0.85) 100%)');
            document.documentElement.style.setProperty('--text-main', '#f8fafc');
            document.documentElement.style.setProperty('--text-muted', '#94a3b8');
            document.documentElement.style.setProperty('--glass-bg', 'linear-gradient(135deg, rgba(16, 28, 64, 0.85) 0%, rgba(21, 32, 67, 0.85) 100%)');
            document.documentElement.style.setProperty('--glass-border', 'rgba(59, 130, 246, 0.25)');
            
            // For weather module compatibility
            document.documentElement.style.setProperty('--bg-gradient-main', 'linear-gradient(135deg, #0a0f24 0%, #060a17 100%)');
            document.documentElement.style.setProperty('--text-main-weather', '#f8fafc');
            document.documentElement.style.setProperty('--glass-bg-weather', 'linear-gradient(135deg, rgba(16, 28, 64, 0.85) 0%, rgba(21, 32, 67, 0.85) 100%)');
            document.documentElement.style.setProperty('--glass-border-weather', 'rgba(59, 130, 246, 0.25)');
            document.documentElement.style.setProperty('--sidebar-bg', 'linear-gradient(135deg, rgba(16, 28, 64, 0.85) 0%, rgba(10, 15, 36, 0.85) 100%)');
            document.documentElement.style.setProperty('--accent-weather', '#ff7a00');
        } else {
            document.body.classList.remove('theme-dark-blue');
            document.documentElement.style.setProperty('--bg-main', '#f8fafc');
            document.documentElement.style.setProperty('--bg-card', '#ffffff');
            document.documentElement.style.setProperty('--text-main', '#0f172a');
            document.documentElement.style.setProperty('--text-muted', '#475569');
            document.documentElement.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.75)');
            document.documentElement.style.setProperty('--glass-border', 'rgba(255, 107, 0, 0.15)');
            
            // For weather module compatibility
            document.documentElement.style.setProperty('--bg-gradient-main', '#f8fafc');
            document.documentElement.style.setProperty('--text-main-weather', '#0f172a');
            document.documentElement.style.setProperty('--glass-bg-weather', 'linear-gradient(135deg, rgba(241, 245, 249, 0.8) 0%, rgba(229, 237, 245, 0.8) 100%)');
            document.documentElement.style.setProperty('--glass-border-weather', 'rgba(148, 163, 184, 0.25)');
            document.documentElement.style.setProperty('--sidebar-bg', 'linear-gradient(135deg, rgba(241, 245, 249, 0.85) 0%, rgba(229, 237, 245, 0.85) 100%)');
            document.documentElement.style.setProperty('--accent-weather', '#ff7a00');
        }
    }, [isDarkMode]);

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
