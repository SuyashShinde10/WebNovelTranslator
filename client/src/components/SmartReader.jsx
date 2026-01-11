import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Styles for PDF rendering
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Worker Fix
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const SmartReader = ({ pdfUrl, bookId }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageText, setPageText] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [viewMode, setViewMode] = useState('pdf'); 
  const [showHindi, setShowHindi] = useState(false);

  const synth = window.speechSynthesis;
  const utteranceRef = useRef(null);

  // 1. Extract Text
  const onPageLoadSuccess = async (page) => {
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item) => item.str).join(' ');
    setPageText(text);
    if (isReading) speakText(text);
  };

  // 2. Audio Logic
  const speakText = (text) => {
    synth.cancel();
    const textToRead = showHindi ? "Hindi translation would play here." : text;
    const u = new SpeechSynthesisUtterance(textToRead);
    u.onend = () => setIsReading(false);
    utteranceRef.current = u;
    synth.speak(u);
    setIsReading(true);
  };

  const toggleAudio = () => {
    if (isReading) {
      synth.cancel();
      setIsReading(false);
    } else {
      speakText(pageText);
    }
  };

  // 3. Navigation
  const changePage = (offset) => {
    setPageNumber(prev => Math.min(Math.max(1, prev + offset), numPages));
    synth.cancel();
    setIsReading(false);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif', color: '#fff', backgroundColor: '#222', minHeight: '100vh' }}>
      
      {/* TOOLBAR */}
      <div style={{ display: 'flex', gap: '10px', padding: '15px', backgroundColor: '#333', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Nav */}
        <div>
          <button onClick={() => changePage(-1)} disabled={pageNumber <= 1}>◀ Prev</button>
          <span style={{ margin: '0 10px' }}>Page {pageNumber}</span>
          <button onClick={() => changePage(1)} disabled={pageNumber >= numPages}>Next ▶</button>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={toggleAudio} style={{ backgroundColor: isReading ? 'red' : '#444', color: 'white', padding: '5px 10px', border: 'none', cursor: 'pointer' }}>
            {isReading ? '⏸ Stop Audio' : '🔊 Read Aloud'}
          </button>

          <button onClick={() => setViewMode(viewMode === 'pdf' ? 'text' : 'pdf')} style={{ padding: '5px 10px', cursor: 'pointer' }}>
            {viewMode === 'pdf' ? '📄 Text Mode' : '🖼️ PDF Mode'}
          </button>

          <button onClick={() => { setShowHindi(!showHindi); setViewMode('text'); }} style={{ padding: '5px 10px', cursor: 'pointer', backgroundColor: showHindi ? 'orange' : '#eee', color: 'black' }}>
            {showHindi ? 'English' : 'Translate Hindi'}
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
        
        {/* PDF View */}
        <div style={{ display: viewMode === 'pdf' ? 'block' : 'none' }}>
           <Document file={pdfUrl} onLoadSuccess={({numPages}) => setNumPages(numPages)}>
            <Page 
              pageNumber={pageNumber} 
              onLoadSuccess={onPageLoadSuccess}
              width={Math.min(window.innerWidth * 0.9, 800)}
            />
          </Document>
        </div>

        {/* Text View */}
        {viewMode === 'text' && (
          <div style={{ padding: '20px', lineHeight: '1.6', fontSize: '18px', maxWidth: '800px', backgroundColor: '#333' }}>
            <h3>{showHindi ? 'Hindi Translation (Mock)' : 'Page Text'}</h3>
            <p>{showHindi ? "यहाँ अनुवाद दिखाई देगा..." : pageText || "Loading text..."}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartReader;