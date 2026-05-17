export const getWeatherTheme = (conditionCode, isDay = true) => {
    // Theme Objects: { background, text, glass, border, accent }
    const gradients = {
        clearDay: {
            background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', // Peach Sunset Gradient
            text: '#0f172a',
            glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 244, 230, 0.75) 100%)', // Translucent Warm Glass
            border: 'rgba(249, 115, 22, 0.15)',
            accent: '#f97316' // Vibrant Orange
        },
        clearNight: {
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', // Deep Indigo Gradient
            text: '#f8fafc',
            glass: 'linear-gradient(135deg, rgba(30, 27, 75, 0.75) 0%, rgba(15, 23, 42, 0.75) 100%)', // Dark Indigo Glass
            border: 'rgba(99, 102, 241, 0.25)',
            accent: '#6366f1' // Indigo
        },
        cloudyDay: {
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', // Cool Slate Gradient
            text: '#0f172a',
            glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%)', // Translucent Clean Glass
            border: 'rgba(148, 163, 184, 0.2)',
            accent: '#ff7a00' // Vibrant warm accent to contrast with the clouds!
        },
        cloudyNight: {
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', // Dark Slate Gradient
            text: '#f8fafc',
            glass: 'linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.75) 100%)',
            border: 'rgba(148, 163, 184, 0.2)',
            accent: '#ff7a00'
        },
        rain: {
            background: 'linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)', // Fresh Rain Sky Gradient
            text: '#0f172a',
            glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(239, 246, 255, 0.75) 100%)',
            border: 'rgba(59, 130, 246, 0.15)',
            accent: '#3b82f6' // Blue
        },
        snow: {
            background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)', // Frosty Mint Gradient
            text: '#0f172a',
            glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(240, 253, 250, 0.75) 100%)',
            border: 'rgba(20, 184, 166, 0.15)',
            accent: '#0d9488' // Teal
        },
        thunder: {
            background: 'linear-gradient(135deg, #faf5ff 0%, #edd9ff 100%)', // Electric Purple Gradient
            text: '#0f172a',
            glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(245, 243, 255, 0.75) 100%)',
            border: 'rgba(139, 92, 246, 0.15)',
            accent: '#8b5cf6' // Purple
        },
        fog: {
            background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', // Ethereal Mist Gradient
            text: '#0f172a',
            glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(204, 251, 241, 0.75) 100%)',
            border: 'rgba(20, 184, 166, 0.15)',
            accent: '#14b8a6' // Teal
        },
        default: {
            background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
            text: '#0f172a',
            glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 244, 230, 0.75) 100%)',
            border: 'rgba(249, 115, 22, 0.15)',
            accent: '#f97316'
        }
    };

    if (!conditionCode && conditionCode !== 0) return gradients.default;

    // Mapping logic
    if (conditionCode === 0) return isDay ? gradients.clearDay : gradients.clearNight;
    if (conditionCode >= 1 && conditionCode <= 3) return isDay ? gradients.cloudyDay : gradients.cloudyNight;
    if (conditionCode >= 45 && conditionCode <= 48) return gradients.fog;
    if (conditionCode >= 51 && conditionCode <= 67) return gradients.rain;
    if (conditionCode >= 71 && conditionCode <= 77) return gradients.snow;
    if (conditionCode >= 80 && conditionCode <= 82) return gradients.rain;
    if (conditionCode >= 95) return gradients.thunder;

    return gradients.default;
};
