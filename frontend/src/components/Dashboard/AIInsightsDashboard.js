import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AIInsightsDashboard = () => {
  const [insights, setInsights] = useState(null);
  const [models, setModels] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch multiple data sources
      const [modelsResponse, patternsResponse] = await Promise.all([
        axios.get('/api/ai/models', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/ai/user/patterns', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setModels(modelsResponse.data.models);
      setInsights(patternsResponse.data);

    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getModelUsageData = () => {
    if (!models) return null;

    const modelNames = Object.keys(models);
    const usageData = modelNames.map(() => Math.floor(Math.random() * 100)); // Mock data

    return {
      labels: modelNames,
      datasets: [
        {
          label: 'Usage Count',
          data: usageData,
          backgroundColor: [
            '#f97316',
            '#fbbf24',
            '#ea580c',
            '#fdba74',
            '#92400e',
            '#7c2d12'
          ],
          borderWidth: 1
        }
      ]
    };
  };

  const getResponseTimeData = () => {
    const labels = ['OpenAI', 'Anthropic', 'Google', 'Cohere', 'Local'];
    const responseTimes = [1.2, 0.8, 1.5, 1.0, 0.3]; // Mock data in seconds

    return {
      labels,
      datasets: [
        {
          label: 'Response Time (seconds)',
          data: responseTimes,
          backgroundColor: 'rgba(249, 115, 22, 0.6)',
          borderColor: 'rgba(249, 115, 22, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  const getCostAnalysisData = () => {
    const labels = ['GPT-4', 'GPT-3.5', 'Claude-3', 'Gemini', 'Local'];
    const costs = [0.06, 0.002, 0.015, 0.001, 0]; // Cost per 1K tokens

    return {
      labels,
      datasets: [
        {
          label: 'Cost per 1K Tokens ($)',
          data: costs,
          backgroundColor: [
            '#f97316',
            '#fbbf24',
            '#ea580c',
            '#fdba74',
            '#92400e'
          ]
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading AI insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="fas fa-exclamation-triangle me-2"></i>
        {error}
      </div>
    );
  }

  return (
    <div className="ai-insights-dashboard">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>
          <i className="fas fa-chart-line me-2"></i>
          AI Insights Dashboard
        </h4>

        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          <button
            className="btn btn-sm btn-gradient"
            onClick={fetchDashboardData}
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Available Models</h6>
                  <h3 className="mb-0">{Object.keys(models).length}</h3>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-robot fa-2x opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Total Conversations</h6>
                  <h3 className="mb-0">{insights?.patterns?.travel_frequency || 0}</h3>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-comments fa-2x opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Avg Response Time</h6>
                  <h3 className="mb-0">1.2s</h3>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-clock fa-2x opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Cost Savings</h6>
                  <h3 className="mb-0">$24.50</h3>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-dollar-sign fa-2x opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">
                <i className="fas fa-chart-bar me-2"></i>
                Model Usage Distribution
              </h6>
            </div>
            <div className="card-body">
              {getModelUsageData() && (
                <Doughnut
                  data={getModelUsageData()}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">
                <i className="fas fa-tachometer-alt me-2"></i>
                Response Time by Provider
              </h6>
            </div>
            <div className="card-body">
              <Bar
                data={getResponseTimeData()}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Seconds'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="row mb-4">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">
                <i className="fas fa-chart-line me-2"></i>
                AI Usage Trends
              </h6>
            </div>
            <div className="card-body">
              <Line
                data={{
                  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                  datasets: [
                    {
                      label: 'Chat Messages',
                      data: [12, 19, 15, 25, 22, 18, 24],
                      borderColor: 'rgb(75, 192, 192)',
                      backgroundColor: 'rgba(75, 192, 192, 0.2)',
                      tension: 0.1
                    },
                    {
                      label: 'Image Analysis',
                      data: [2, 5, 3, 8, 6, 4, 7],
                      borderColor: 'rgb(255, 99, 132)',
                      backgroundColor: 'rgba(255, 99, 132, 0.2)',
                      tension: 0.1
                    },
                    {
                      label: 'Voice Messages',
                      data: [1, 3, 2, 4, 3, 2, 5],
                      borderColor: 'rgb(54, 162, 235)',
                      backgroundColor: 'rgba(54, 162, 235, 0.2)',
                      tension: 0.1
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">
                <i className="fas fa-dollar-sign me-2"></i>
                Cost Analysis
              </h6>
            </div>
            <div className="card-body">
              <Doughnut
                data={getCostAnalysisData()}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Travel Patterns Insights */}
      {insights?.patterns && (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h6 className="card-title mb-0">
                  <i className="fas fa-brain me-2"></i>
                  AI-Generated Travel Insights
                </h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Travel Patterns</h6>
                    <ul className="list-unstyled">
                      {insights.patterns.favorite_destinations?.map((dest, index) => (
                        <li key={index} className="mb-2">
                          <i className="fas fa-map-marker-alt text-primary me-2"></i>
                          {dest}
                        </li>
                      ))}
                    </ul>

                    {insights.patterns.preferred_travel_style && (
                      <div className="mb-3">
                        <strong>Preferred Style:</strong>
                        <span className="badge bg-primary ms-2">
                          {insights.patterns.preferred_travel_style}
                        </span>
                      </div>
                    )}

                    {insights.patterns.average_budget > 0 && (
                      <div className="mb-3">
                        <strong>Average Budget:</strong>
                        <span className="text-success ms-2">
                          ${insights.patterns.average_budget.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <h6>AI Recommendations</h6>
                    {insights.recommendations?.map((rec, index) => (
                      <div key={index} className="alert alert-info py-2 mb-2">
                        <i className="fas fa-lightbulb me-2"></i>
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightsDashboard;