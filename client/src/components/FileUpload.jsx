import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../App.css'; 

const FileUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Ref for the hidden input
  const fileInputRef = useRef(null);

  // Handle File Selection
  const handleFile = (selectedFile) => {
    setMessage('');
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      setMessage('⚠️ Please upload a valid PDF file.');
      setFile(null);
    }
  };

  const onFileChange = (e) => {
    handleFile(e.target.files[0]);
  };

  // Drag & Drop Handlers
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  };

  // Upload Logic
  const onUpload = async () => {
    if (!file) {
      setMessage('Please select a PDF file first.');
      return;
    }

    const formData = new FormData();
    formData.append('novelPdf', file); 

    setLoading(true);
    try {
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (onUploadSuccess) onUploadSuccess(res.data.filename);
    } catch (err) {
      console.error(err);
      setMessage('❌ Upload failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger hidden input click
  const handleClickZone = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="app-container">
      <div className="upload-card">
        
        {/* Header Section */}
        <div className="upload-icon-large">📖</div>
        <h2 style={{margin: '0 0 10px 0', color: '#2d3436'}}>AI Novel Reader</h2>
        <p style={{color: '#636e72', margin: '0 0 20px 0'}}>
          Upload your PDF to start reading with <b>Audio & Translation</b>.
        </p>

        {/* Drag & Drop Zone */}
        <div 
          className={`drop-zone ${isDragging ? 'active' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={handleClickZone}
        >
          <input 
            type="file" 
            accept="application/pdf" 
            onChange={onFileChange} 
            ref={fileInputRef}
            style={{ display: 'none' }} 
          />
          
          {file ? (
            <div className="file-info">
              {/* PDF Icon SVG */}
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <div style={{textAlign: 'left'}}>
                <div style={{fontSize: '0.85rem', color:'#888'}}>Selected File:</div>
                <div className="file-name-display">{file.name}</div>
              </div>
            </div>
          ) : (
            <div>
              {/* Cloud Upload SVG */}
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#23a6d5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: '10px'}}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p style={{margin:0, fontWeight: 500, color: '#555'}}>
                Drag & drop your PDF here
              </p>
              <p style={{margin:0, fontSize: '0.8rem', color: '#999'}}>or click to browse</p>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <button 
          onClick={onUpload} 
          disabled={loading || !file} 
          className="btn-primary"
        >
          {loading ? (
            <>
              <div className="spinner-small"></div>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <span>Start Reading</span>
              <span>→</span>
            </>
          )}
        </button>

        {/* Error Message */}
        {message && <div className="error-msg fade-in">{message}</div>}
      </div>
    </div>
  );
};

export default FileUpload;