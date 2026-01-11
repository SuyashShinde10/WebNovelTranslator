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
      alert("⚠️ Only PDF files are supported!");
    }
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const removeFile = (e) => {
    e.stopPropagation();
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
        <div className="upload-header">
          <h2>Novel Reader AI</h2>
          <p>Upload your PDF to start reading & listening</p>
        </div>

        <div 
          className={`drop-zone ${isDragging ? 'active' : ''}`}
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onClick={() => !file && fileInputRef.current.click()}
        >
          <input 
            type="file" accept="application/pdf" 
            onChange={(e) => handleFile(e.target.files[0])} 
            ref={fileInputRef} style={{ display: 'none' }} 
          />

          {!file ? (
            <>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <h3 style={{margin:'15px 0 5px'}}>Click or Drag PDF Here</h3>
              <p style={{color:'#666', fontSize:'0.8rem', margin:0}}>Max file size 10MB</p>
            </>
          ) : (
            <div style={{display:'flex', alignItems:'center', gap:'15px', textAlign:'left'}}>
              <div style={{background:'#2d2d44', padding:'10px', borderRadius:'8px'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff7675" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              </div>
              <div style={{flex:1, overflow:'hidden'}}>
                <div style={{fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{file.name}</div>
                <div style={{fontSize:'0.8rem', color:'#aaa'}}>{(file.size/1024/1024).toFixed(2)} MB</div>
              </div>
              <button onClick={removeFile} style={{background:'none', border:'none', color:'#ff7675', cursor:'pointer', fontSize:'1.2rem'}}>✕</button>
            </div>
          )}
        </div>

        <button className="btn btn-primary" style={{width:'100%', marginTop:'25px', justifyContent:'center', height:'48px'}} onClick={onUpload} disabled={!file || loading}>
          {loading ? <><div className="spinner"></div> Processing...</> : 'Read Book Now 🚀'}
        </button>
      </div>
    </div>
  );
};
export default FileUpload;