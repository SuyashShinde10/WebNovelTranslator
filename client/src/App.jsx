import React from 'react';
import PdfReader from './components/PdfReader.jsx';

// Example PDF file (replace with your local file or URL)
 

function App() {
  return (
    <div className="App">
      <h1>My Book Reader</h1>
      
      {/* Pass a unique bookId so bookmarks are saved specifically for this file */}
      <PdfReader 
  pdfUrl="https://pdfobject.com/pdf/sample.pdf" 
  bookId="lotm-vol-1" 
/>
    </div>
  );
}

export default App;