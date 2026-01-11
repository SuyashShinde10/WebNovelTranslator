import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import PdfReader from './components/PdfReader';

function App() {
  const [currentFile, setCurrentFile] = useState(null);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', backgroundColor: '#f4f1ea', minHeight: '100vh' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#2c3e50' }}>Web Novel Translator</h1>
      </header>
      
      {!currentFile ? (
        <FileUpload onUploadSuccess={(filename) => setCurrentFile(filename)} />
      ) : (
        <div>
           <div style={{ maxWidth: '800px', margin: '0 auto 10px auto' }}>
             <button 
               onClick={() => setCurrentFile(null)} 
               style={{ 
                 background: 'transparent', 
                 border: '1px solid #666', 
                 padding: '5px 10px', 
                 cursor: 'pointer',
                 borderRadius: '4px'
               }}
             >
               ← Upload New Novel
             </button>
           </div>
           
           {/* Render the Reader */}
           <PdfReader filename={currentFile} />
        </div>
      )}
    </div>
  );
}

export default App;