import React, { useState } from 'react';
import '../App.css'; 

const FileUpload = ({ onFileSelect }) => {
  const [loading, setLoading] = useState(false);

  const onFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setLoading(true);
      // Simulate a small delay for better UX
      setTimeout(() => {
        onFileSelect(selectedFile); // Pass file to App.js immediately
        setLoading(false);
      }, 800);
    }
  };

  return (
    <div className="upload-card fade-in">
      <div className="upload-icon">📚</div>
      <h2>Upload Your Web Novel</h2>
      <p style={{color: '#636e72', marginBottom: '30px'}}>
        Select a PDF to start reading instantly.
      </p>

      <div className="file-input-wrapper">
         <input 
           type="file" 
           accept="application/pdf" 
           onChange={onFileChange} 
           style={{ display: 'none' }} 
           id="file-upload"
         />
         <label htmlFor="file-upload" className="btn btn-primary" style={{display: 'inline-flex', justifyContent: 'center', minWidth: '200px'}}>
           {loading ? 'Opening...' : 'Choose PDF File'}
         </label>
      </div>
      
      <p style={{fontSize: '0.8rem', color: '#b2bec3', marginTop: '20px'}}>
        Supported: PDF Novels (Text-based)
      </p>
    </div>
  );
};

export default FileUpload;