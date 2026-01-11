import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../App.css';

const FileUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // --- Handlers ---
  const handleFile = (selectedFile) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      alert("⚠️ Only PDF files are supported!");
    }
  };

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
    handleFile(e.dataTransfer.files[0]);
  };

  const removeFile = (e) => {
    e.stopPropagation(); // Prevent clicking the dropzone again
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('novelPdf', file);

    try {
      const res = await axios.post('/api/upload', formData);
      if (onUploadSuccess) onUploadSuccess(res.data.filename);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Check server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="upload-card fade-in">
        
        {/* 1. Header Text */}
        <div className="upload-header">
          <h2>Web Novel Reader</h2>
          <p>AI-Powered Translation & Audio Books</p>
        </div>

        {/* 2. Drag & Drop Zone */}
        <div 
          className={`drop-zone ${isDragging ? 'active' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !file && fileInputRef.current.click()} // Only open browse if no file
        >
          <input 
            type="file" 
            accept="application/pdf" 
            onChange={(e) => handleFile(e.target.files[0])} 
            ref={fileInputRef}
            style={{ display: 'none' }} 
          />

          {!file ? (
            // --- STATE: NO FILE ---
            <>
              {/* Cloud Icon SVG */}
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#636e72" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              
              <h3 style={{marginTop: '20px', color: '#2d3436', fontSize:'1.1rem'}}>Drag & Drop your Novel</h3>
              <p style={{color: '#b2bec3', fontSize: '0.9rem', marginBottom: '15px'}}>Supports .PDF (Max 10MB)</p>
              
              <button className="btn-browse" onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current.click();
              }}>
                Browse Files
              </button>
            </>
          ) : (
            // --- STATE: FILE SELECTED ---
            <div className="file-preview">
              {/* PDF Icon */}
              <div style={{background: '#ffeaa7', padding: '10px', borderRadius: '8px'}}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d63031" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>

              <div className="file-details">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>

              <button className="btn-remove" onClick={removeFile} title="Remove File">
                ✕
              </button>
            </div>
          )}
        </div>

        {/* 3. Action Button */}
        <button 
          className="btn-primary" 
          onClick={onUpload} 
          disabled={!file || loading}
        >
          {loading ? (
            <>
              <div className="spinner-small"></div> Processing...
            </>
          ) : (
            <>Start Reading 🚀</>
          )}
        </button>

      </div>
    </div>
  );
};

export default FileUpload;