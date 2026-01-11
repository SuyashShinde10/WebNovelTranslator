import React from 'react';
import PDFReader from './PDFReader';

// Example PDF file (replace with your local file or URL)
import myPdf from './assets/sample.pdf'; 

function App() {
  return (
    <div className="App">
      <h1>My Book Reader</h1>
      
      {/* Pass a unique bookId so bookmarks are saved specifically for this file */}
      <PDFReader 
        pdfUrl={myPdf} 
        bookId="lotm-vol-1" 
      />
    </div>
  );
}

export default App;