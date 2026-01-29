import React, { useState, useRef } from 'react';
import axios from 'axios';

const ImageAnalyzer = ({ onAnalysis }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [generateRecommendations, setGenerateRecommendations] = useState(true);
  const [showCamera, setShowCamera] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Image size must be less than 10MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setSelectedImage(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('generate_recommendations', generateRecommendations.toString());

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/ai/image/analyze', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setAnalysis(response.data);
      onAnalysis && onAnalysis(response.data);

    } catch (err) {
      setError('Failed to analyze image. Please try again.');
      console.error('Image analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
      setError(null);
    } catch (err) {
      setError('Could not access camera. Please check permissions.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        const file = new File([blob], 'captured_image.jpg', { type: 'image/jpeg' });
        setSelectedImage(file);
        setImagePreview(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }, 'image/jpeg');
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setAnalysis(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    stopCamera();
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="image-analyzer">
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">
            <i className="fas fa-camera me-2"></i>
            Travel Image Analysis
          </h5>
        </div>

        <div className="card-body">
          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="d-none"
          />

          {/* Camera View */}
          {showCamera && (
            <div className="camera-view mb-3 text-center">
              <video ref={videoRef} autoPlay playsInline className="w-100 rounded bg-dark" style={{ maxHeight: '400px' }}></video>
              <canvas ref={canvasRef} className="d-none"></canvas>
              <div className="mt-2 d-flex justify-content-center gap-2">
                <button className="btn btn-primary" onClick={captureImage}>
                  <i className="fas fa-camera me-2"></i> Capture
                </button>
                <button className="btn btn-secondary" onClick={stopCamera}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Upload Area */}
          {!imagePreview && !showCamera && (
            <div className="d-flex flex-column gap-3">
              <div
                className="upload-area border-2 border-dashed rounded p-4 text-center"
                style={{
                  borderColor: 'rgba(249, 115, 22, 0.3)', /* Orange opacity */
                  borderStyle: 'dashed',
                  borderWidth: '2px',
                  cursor: 'pointer',
                  minHeight: '150px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.5)'
                }}
                onClick={triggerFileSelect}
              >
                <i className="fas fa-cloud-upload-alt fa-2x text-orange-500 mb-2"></i>
                <h6 className="text-dark">Drop or Click to Upload</h6>
              </div>

              <div className="text-center">
                <span className="text-white-50 small mb-2 d-block">OR</span>
                <button className="btn btn-outline-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2" onClick={startCamera}>
                  <i className="fas fa-camera"></i> Open Camera
                </button>
              </div>
            </div>
          )}

          {/* Image Preview */}
          {imagePreview && !showCamera && (
            <div className="image-preview-container">
              <div className="position-relative">
                <img
                  src={imagePreview}
                  alt="Selected"
                  className="img-fluid rounded"
                  style={{ maxHeight: '300px', width: '100%', objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }}
                />
                <button
                  className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 rounded-circle"
                  onClick={clearImage}
                  title="Remove image"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Options */}
              <div className="mt-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="generateRecommendations"
                    checked={generateRecommendations}
                    onChange={(e) => setGenerateRecommendations(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="generateRecommendations">
                    Generate travel recommendations based on image
                  </label>
                </div>
              </div>

              {/* Analyze Button */}
              <div className="mt-3">
                <button
                  className="btn btn-primary"
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </span>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-search me-2"></i>
                      Analyze Image
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="alert alert-danger mt-3" role="alert">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="analysis-results mt-4">
              <h6>
                <i className="fas fa-eye me-2"></i>
                Analysis Results
              </h6>

              {/* Image Caption */}
              <div className="mb-3">
                <strong>Description:</strong>
                <p className="mb-2">{analysis.caption}</p>
              </div>

              {/* Detected Elements */}
              {analysis.detected_elements && analysis.detected_elements.length > 0 && (
                <div className="mb-3">
                  <strong>Detected Elements:</strong>
                  <div className="mt-2">
                    {analysis.detected_elements.map((element, index) => {
                      const colors = ['#f97316', '#fbbf24', '#ea580c', '#fdba74', '#92400e'];
                      // Custom classes for purple/brown would be needed or inline styles
                      const color = colors[index % colors.length];
                      return (
                        <span key={index} className="badge me-1 mb-1" style={{ backgroundColor: color, color: 'white' }}>
                          {element}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI Recommendations */}
              {analysis.recommendations && (
                <div className="mb-3">
                  <strong>
                    <i className="fas fa-lightbulb me-2" style={{ color: '#f97316' }}></i>
                    Travel Recommendations:
                  </strong>
                  <div className="mt-2 p-3 bg-light rounded">
                    <p className="mb-0">{analysis.recommendations}</p>
                  </div>
                </div>
              )}

              {/* Analysis Timestamp */}
              {analysis.analysis_timestamp && (
                <small className="text-muted">
                  Analyzed on {new Date(analysis.analysis_timestamp).toLocaleString()}
                </small>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .upload-area:hover {
          background-color: rgba(59, 130, 246, 0.05) !important;
          border-color: #f97316 !important; /* Orange */
        }
        
        .image-preview-container {
          animation: fadeIn 0.3s ease-in;
        }

        .card {
            background: transparent;
            border: none;
            box-shadow: none;
        }

        .card-header, .card-body {
            background: transparent;
            padding: 0;
            color: var(--text-primary); /* Black/Dark Brown */
        }
        
        .card-title {
            color: #f97316; /* Orange */
            font-weight: bold;
        }

        .btn-outline-primary {
            color: #f97316;
            border-color: #f97316;
        }
        .btn-outline-primary:hover {
            background-color: #f97316;
            color: white;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ImageAnalyzer;