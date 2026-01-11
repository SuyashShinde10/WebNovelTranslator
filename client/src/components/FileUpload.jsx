import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../App.css';

const FileUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (selectedFile) => {
    if (selectedFile?.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      alert("⚠️ Please upload a PDF file.");
    }
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
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
      alert("Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="upload-card fade-in">
        <div className="upload-header">
          <h2>Novel Reader AI</h2>
          <p>Upload a PDF to Translate & Listen</p>
        </div>

        {/* CLICKABLE DRAG ZONE */}
        <div 
          className={`drop-zone ${isDragging ? 'active' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current.click()} // Makes the whole box clickable
        >
          <input 
            type="file" 
            accept="application/pdf" 
            onChange={(e) => handleFile(e.target.files[0])} 
            ref={fileInputRef} 
            style={{ display: 'none' }} // Hides the ugly default input
          />

          {!file ? (
            <>
              <div style={{fontSize: '3rem'}}>📂</div>
              <h3 style={{margin: '10px 0'}}>Drag & Drop PDF here</h3>
              <p style={{color: '#888'}}>or click to browse</p>
            </>
          ) : (
            <>
              <div style={{fontSize: '3rem'}}>📄</div>
              <h3 style={{margin: '10px 0', color: '#fff'}}>{file.name}</h3>
              <p style={{color: '#00e676'}}>Ready to upload</p>
            </>
          )}
        </div>

        <button 
          className="btn-primary" 
          onClick={(e) => { e.stopPropagation(); onUpload(); }} 
          disabled={!file || loading}
        >
          {loading ? (
             <span><div className="spinner-small"></div> Processing...</span>
          ) : 'Start Reading 🚀'}
        </button>
      </div>
    </div>
  );
};

export default FileUpload;