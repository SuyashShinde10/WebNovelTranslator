import React, { useState } from 'react';
import axios from 'axios';
import '../App.css'; 

const FileUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage(''); 
  };

  const onUpload = async () => {
    if (!file) {
      setMessage('Please select a PDF file first.');
      return;
    }

    const formData = new FormData();
    formData.append('novelPdf', file); 

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (onUploadSuccess) onUploadSuccess(res.data.filename);
    } catch (err) {
      console.error(err);
      setMessage('Upload failed. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="upload-card fade-in">
        <div className="upload-icon">📚</div>
        <h2>Upload Your Web Novel</h2>
        <p style={{color: '#636e72', marginBottom: '30px'}}>
          Select a PDF to start reading with AI translation.
        </p>

        <div className="file-input-wrapper">
           <input 
             type="file" 
             accept="application/pdf" 
             onChange={onFileChange} 
             style={{ display: 'none' }} 
             id="file-upload"
           />
           <label htmlFor="file-upload" className="btn btn-secondary" style={{display: 'inline-block'}}>
             {file ? `📄 ${file.name}` : 'Choose PDF File'}
           </label>
        </div>
        
        <button 
          onClick={onUpload} 
          disabled={loading || !file} 
          className="btn btn-primary"
          style={{width: '100%', justifyContent: 'center'}}
        >
          {loading ? 'Uploading...' : 'Start Reading'}
        </button>

        {message && <p style={{color: '#d63031', marginTop: '20px'}}>{message}</p>}
      </div>
    </div>
  );
};

export default FileUpload;