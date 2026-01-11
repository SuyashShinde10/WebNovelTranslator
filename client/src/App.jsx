import React, { useState } from 'react';
import SmartReader from './components/PdfReader'; // Import the new file

function App() {
  const [pdfFile, setPdfFile] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) setPdfFile(URL.createObjectURL(file));
  };

  return (
    <div style={{backgroundColor: '#1e1e1e', minHeight: '100vh', color: 'white'}}>
      {!pdfFile ? (
        <div style={{textAlign: 'center', paddingTop: '100px'}}>
          <h1>Start Reading</h1>
          <input type="file" onChange={handleFileUpload} accept=".pdf" />
        </div>
      ) : (
        <SmartReader pdfUrl={pdfFile} bookId="uploaded-novel-1" />
      )}
    </div>
  );
}

export default App;