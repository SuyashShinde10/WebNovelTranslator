import React, { useState } from 'react';
// Correct import pointing to your components folder
import PdfReader from './components/PdfReader.jsx'; 

function App() {
  // State to store the uploaded novel file
  const [pdfFile, setPdfFile] = useState(null);
  const [fileName, setFileName] = useState('');

  // Function to handle file selection
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      // Create a temporary URL for the uploaded file
      const fileUrl = URL.createObjectURL(file);
      setPdfFile(fileUrl);
      setFileName(file.name);
    } else {
      alert("Please upload a valid PDF novel.");
    }
  };

  return (
    <div className="App" style={{ textAlign: 'center', padding: '20px' }}>
      <h1>Web Novel Reader</h1>

      {/* 1. If no file is selected, show the Upload Button */}
      {!pdfFile && (
        <div className="upload-section" style={{ marginTop: '50px' }}>
          <h3>Select your novel (PDF) to start reading</h3>
          <input 
            type="file" 
            accept="application/pdf" 
            onChange={handleFileUpload} 
            style={{ padding: '10px' }}
          />
        </div>
      )}

      {/* 2. If file exists, show the Reader */}
      {pdfFile && (
        <div>
          <div style={{ marginBottom: '10px' }}>
             <p>Reading: <strong>{fileName}</strong></p>
             <button onClick={() => setPdfFile(null)}>Close / Upload New</button>
          </div>

          <PdfReader 
            pdfUrl={pdfFile} 
            // Use filename as ID so bookmarks are saved unique to this specific book
            bookId={fileName} 
          />
        </div>
      )}
    </div>
  );
}

export default App;