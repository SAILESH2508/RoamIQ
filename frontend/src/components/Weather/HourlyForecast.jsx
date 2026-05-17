import React from 'react';
import { Chart } from 'react-chartjs-2';
import { useTheme } from '../../contexts/ThemeContext';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    LineController,
    BarController,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    LineController,
    BarController,
    Title,
    Tooltip,
    Legend,
    Filler
);

const HourlyForecast = ({ data }) => {
    const { isDarkMode } = useTheme();
    const resolvedThemeColor = isDarkMode ? '#f8fafc' : '#0f172a';

    if (!data || !data.time || !data.temperature_2m) return null;

    // Filter next 24 hours only
    const next24Hours = data.time.slice(0, 24).map(t => new Date(t).getHours() + ':00');
    const temps = data.temperature_2m.slice(0, 24);
    const rain = data.rain ? data.rain.slice(0, 24) : new Array(24).fill(0);

        const chartData = {
        labels: next24Hours,
        datasets: [
            {
                type: 'line',
                label: 'Temperature (°C)',
                data: temps,
                borderColor: '#f97316',
                backgroundColor: 'rgba(249, 115, 22, 0.15)', // Premium tinted background fill
                borderWidth: 4,
                pointRadius: 0,
                tension: 0.4,
                yAxisID: 'y',
                fill: true
            },
            {
                type: 'bar',
                label: 'Rainfall (mm)',
                data: rain,
                backgroundColor: '#ff9d4d',
                borderRadius: 4,
                barThickness: 20,
                yAxisID: 'y1',
            }
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: { 
                    color: resolvedThemeColor,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 25,
                    font: { size: 14, weight: '900', family: 'Outfit' }
                }
            },
            tooltip: {
                backgroundColor: isDarkMode ? 'rgba(16, 28, 64, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                titleColor: isDarkMode ? '#f8fafc' : '#0f172a',
                bodyColor: isDarkMode ? '#f8fafc' : '#0f172a',
                titleFont: { size: 14, weight: '900', family: 'Outfit' },
                bodyFont: { size: 13, weight: '600', family: 'Outfit' },
                borderColor: 'rgba(255, 122, 0, 0.2)',
                borderWidth: 1,
                padding: 15,
                cornerRadius: 16,
                displayColors: true,
                boxPadding: 8,
                mode: 'index',
                intersect: false,
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { 
                    color: resolvedThemeColor, 
                    font: { size: 12, weight: '800', family: 'Outfit' },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 8
                },
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                grid: { color: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)', drawBorder: false },
                ticks: { 
                    color: resolvedThemeColor, 
                    font: { size: 12, weight: '800', family: 'Outfit' },
                    padding: 10
                },
                grace: '20%',
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: { display: false },
                ticks: { 
                    color: resolvedThemeColor, 
                    font: { size: 12, weight: '800', family: 'Outfit' },
                    padding: 10
                },
                min: 0,
                grace: '20%',
            },
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        },
        maintainAspectRatio: false,
    };

    return (
        <div className="h-100 d-flex flex-column">
            <div className="flex-grow-1 w-100" style={{ minHeight: '280px' }}>
                <Chart type='bar' data={chartData} options={options} />
            </div>
        </div>
    );
};

export default HourlyForecast;
