import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import PdfReader from './components/PdfReader';
import './App.css'; // Global styles

function App() {
  const [currentFile, setCurrentFile] = useState(null);

  return (
    <div className="app-root">
      
      {/* HEADER / NAV (Optional, adds a nice touch) */}
      <nav style={{
        padding: '15px 20px', 
        background: '#1e1e1e', 
        borderBottom: '1px solid #333', 
        color: 'white',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Novel Reader AI 📖</span>
        {currentFile && (
          <button 
            onClick={() => setCurrentFile(null)}
            style={{
              background: '#ff7675', border: 'none', color: 'white', 
              padding: '5px 12px', borderRadius: '4px', cursor: 'pointer'
            }}
          >
            ✕ Close Book
          </button>
        )}
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="app-content">
        {!currentFile ? (
          /* STATE 1: No File -> Show Upload */
          <div className="center-screen">
            <FileUpload onFileSelect={(file) => setCurrentFile(file)} />
          </div>
        ) : (
          /* STATE 2: File Selected -> Show Reader */
          <PdfReader file={currentFile} />
        )}
      </div>

    </div>
  );
}

export default App;