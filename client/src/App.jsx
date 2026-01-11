import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import PdfReader from './components/PdfReader';
import './App.css';

function App() {
  // State to hold the uploaded PDF file
  const [pdfFile, setPdfFile] = useState(null);

  return (
    <div className="app-root">
      
      {/* 1. If NO file is selected, show the Upload Component */}
      {!pdfFile ? (
        <div className="app-container">
          <FileUpload onFileSelect={(file) => setPdfFile(file)} />
        </div>
      ) : (
        
        /* 2. If a file IS selected, show the PDF Reader */
        <div className="reader-view">
          
          {/* A small button to close the book and upload a new one */}
          <button 
            onClick={() => setPdfFile(null)}
            style={{
              position: 'fixed',
              top: '15px',
              right: '20px',
              zIndex: 1000,
              padding: '8px 15px',
              backgroundColor: '#d63031',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ✕ Close Book
          </button>

          {/* The Reader Component you provided */}
          <PdfReader file={pdfFile} />
        </div>
      )}

    </div>
  );
}

export default App;