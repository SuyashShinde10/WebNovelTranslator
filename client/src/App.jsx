import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import PdfReader from './components/PdfReader';
import './App.css';

function App() {
  const [currentFile, setCurrentFile] = useState(null); 

  return (
    <div className="app-container">
      <header style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ color: '#2c3e50', margin: 0 }}>Web Novel Translator</h1>
        <p style={{ color: '#7f8c8d', marginTop: '5px' }}>AI-Powered English to Hindi Reader</p>
      </header>
      
      {!currentFile ? (
        // Pass the function to save the whole file object
        <FileUpload onFileSelect={(file) => setCurrentFile(file)} />
      ) : (
        <div className="fade-in">
           <div style={{ maxWidth: '800px', margin: '0 auto 10px auto' }}>
             <button 
               onClick={() => setCurrentFile(null)} 
               className="btn btn-secondary"
               style={{ padding: '5px 10px', fontSize: '0.9rem' }}
             >
               ← Upload New Novel
             </button>
           </div>
           
           {/* Pass the File object directly to the reader */}
           <PdfReader file={currentFile} />
        </div>
      )}
    </div>
  );
}

export default App;