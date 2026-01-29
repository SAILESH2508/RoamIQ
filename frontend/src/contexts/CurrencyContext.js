import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

const CurrencyContext = createContext();

export const currencies = {
    USD: { symbol: '$', name: 'US Dollar', rate: 1 },
    EUR: { symbol: '€', name: 'Euro', rate: 0.92 },
    INR: { symbol: '₹', name: 'Indian Rupee', rate: 83.3 },
    GBP: { symbol: '£', name: 'British Pound', rate: 0.79 },
    JPY: { symbol: '¥', name: 'Japanese Yen', rate: 151.4 },
    AUD: { symbol: 'A$', name: 'Australian Dollar', rate: 1.52 },
};

export const CurrencyProvider = ({ children }) => {
    const { user } = useAuth();
    const [currentCurrency, setCurrentCurrency] = useState('INR');

    useEffect(() => {
        if (user && user.preferred_currency) {
            setCurrentCurrency(user.preferred_currency);
        }
    }, [user]);

    const changeCurrency = async (currencyCode) => {
        if (!currencies[currencyCode]) return;

        setCurrentCurrency(currencyCode);

        // Persist to backend if user is logged in
        if (user) {
            try {
                await axios.put('/api/auth/profile', { preferred_currency: currencyCode });
            } catch (error) {
                console.error('Error saving currency preference:', error);
            }
        }
    };

    const formatCurrency = (amount, code = currentCurrency) => {
        const currency = currencies[code] || currencies.USD;
        const convertedAmount = amount * (currency.rate / currencies.USD.rate);

        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: code,
        }).format(convertedAmount);
    };

    const value = {
        currentCurrency,
        changeCurrency,
        formatCurrency,
        currencies,
        currencySymbol: currencies[currentCurrency]?.symbol || '$'
    };

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
