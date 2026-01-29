import React, { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
);

const MoodTrendChart = ({ data }) => {
    const chartData = useMemo(() => {
        // Reverse data if it's descending to show chronological order left-to-right
        // (Assuming API returns newest first, but let's just make sure)
        // Actually the API sends it reversed (oldest first) so we are good.

        // Map mood string to numerical value for plotting
        const moodValueMap = {
            'excited': 5,
            'happy': 4,
            'neutral': 3,
            'stressed': 2,
            'sad': 1
        };

        const labels = data.map(log => {
            const date = new Date(log.created_at);
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        });

        const moodValues = data.map(log => moodValueMap[log.mood] || 3);
        const energyLevelMap = { 'high': 5, 'medium': 3, 'low': 1 };
        const energyValues = data.map(log => energyLevelMap[log.energy] || 3);

        return {
            labels,
            datasets: [
                {
                    fill: true,
                    label: 'Mood',
                    data: moodValues,
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.2)',
                    tension: 0.4,
                },
                {
                    fill: true,
                    label: 'Energy',
                    data: energyValues,
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251, 191, 36, 0.2)',
                    tension: 0.4,
                },
            ],
        };
    }, [data]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: 'white' // Glassmorphism text color
                }
            },
            title: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            // Convert back to string if it's Mood
                            if (context.dataset.label === 'Mood') {
                                const reverseMap = { 5: 'Excited', 4: 'Happy', 3: 'Neutral', 2: 'Stressed', 1: 'Sad' };
                                label += reverseMap[context.parsed.y] || 'Unknown';
                            } else {
                                label += context.parsed.y;
                            }
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                min: 0,
                max: 6,
                ticks: {
                    color: 'rgba(255,255,255,0.7)',
                    stepSize: 1,
                    callback: function (value) {
                        const reverseMap = { 5: 'Excited', 4: 'Happy', 3: 'Neutral', 2: 'Stressed', 1: 'Sad' };
                        return reverseMap[value] || '';
                    }
                },
                grid: {
                    color: 'rgba(255,255,255,0.1)'
                }
            },
            x: {
                ticks: {
                    color: 'rgba(255,255,255,0.7)'
                },
                grid: {
                    color: 'rgba(255,255,255,0.1)'
                }
            }
        }
    };

    return <Line options={options} data={chartData} />;
};

export default MoodTrendChart;
