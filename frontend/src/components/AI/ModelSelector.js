import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ModelSelector = ({ selectedModel, onModelChange, className = '' }) => {
  const [models, setModels] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const fetchAvailableModels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/ai/models', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setModels(response.data.models);
      setLoading(false);
    } catch (err) {
      setError('Failed to load AI models');
      setLoading(false);
    }
  };

  const getModelInfo = (modelKey) => {
    const model = models[modelKey];
    if (!model) return null;

    const providerColors = {
      openai: 'success',
      anthropic: 'primary',
      google: 'warning',
      cohere: 'info',
      ollama: 'secondary',
      local: 'dark'
    };

    return {
      ...model,
      color: providerColors[model.provider] || 'secondary'
    };
  };

  if (loading) {
    return (
      <div className={`d-flex align-items-center ${className}`}>
        <div className="spinner-border spinner-border-sm me-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span>Loading models...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`alert alert-warning ${className}`} role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className={`model-selector ${className}`}>
      <label htmlFor="model-select" className="form-label small text-muted text-uppercase fw-bold mb-2">
        <i className="fas fa-microchip me-2"></i>
        AI Model
      </label>

      <select
        id="model-select"
        className="form-select border-0 shadow-sm"
        style={{
          background: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(10px)',
          color: 'var(--text-primary)',
          cursor: 'pointer'
        }}
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
      >
        {Object.entries(models).map(([modelKey, model]) => {
          const info = getModelInfo(modelKey);
          return (
            <option key={modelKey} value={modelKey}>
              {modelKey} ({info.provider}) - ${info.cost_per_1k_tokens}/1K
            </option>
          );
        })}
      </select>

      {selectedModel && (
        <div className="mt-3">
          <div className="d-flex flex-wrap gap-1">
            {(() => {
              const info = getModelInfo(selectedModel);
              if (!info) return null;

              return (
                <>
                  <span className={`badge bg-${info.color} bg-opacity-75`}>
                    {info.provider}
                  </span>
                  <span className="badge bg-white text-dark border border-light">
                    {info.max_tokens} toks
                  </span>
                  {info.supports_streaming && (
                    <span className="badge bg-transparent text-success border border-success">
                      <i className="fas fa-bolt me-1"></i>Stream
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;