import React, { useState } from 'react';
import SmartReader from './components/PdfReader'; 
import FileUpload from './components/FileUpload'; // Use the upload component

function App() {
  // If we have a file URL, show Reader. If not, show Upload.
  const [pdfFile, setPdfFile] = useState(null);

  // When upload is done, we get the filename or URL
  // Note: For local development we might use URL.createObjectURL
  // But since your FileUpload sends to backend, we likely get a path back.
  // For simplicity based on your previous code, let's keep using client-side preview for speed
  // OR if you want to use the uploaded file from server:
  
  const handleClientUpload = (e) => {
      const file = e.target.files[0];
      if (file) setPdfFile(URL.createObjectURL(file));
  };

  return (
    <div style={{backgroundColor: '#f5f6fa', minHeight: '100vh'}}>
      {!pdfFile ? (
        <div style={{textAlign: 'center', paddingTop: '50px'}}>
          <h1>Novel Translator & Audio Book</h1>
          {/* Simple input to get started immediately without server upload overhead if preferred */}
          <input type="file" onChange={handleClientUpload} accept=".pdf" style={{marginTop:'20px'}}/>
        </div>
      ) : (
        <div>
            <button 
                onClick={() => setPdfFile(null)} 
                style={{position:'absolute', top:'10px', left:'10px', zIndex:100}}
            >
                ❌ Close Book
            </button>
            <SmartReader file={pdfFile} />
        </div>
      )}
    </div>
  );
}

export default App;