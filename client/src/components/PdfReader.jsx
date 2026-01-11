import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import '../App.css'; // Make sure styling is imported

// Configure PDF Worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const PdfReader = ({ filename }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfObject, setPdfObject] = useState(null);
  const [viewMode, setViewMode] = useState('PDF'); 
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfWidth, setPdfWidth] = useState(null); // Mobile Responsive State

  // AUTOMATIC URL DETECTION (Works for Localhost AND Vercel)
  const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5000';
  const fileUrl = `${API_BASE}/api/read-novel/${filename}`;

  // 1. Responsive Width Calculation
  useEffect(() => {
    function updateWidth() {
      // Mobile padding: 40px total. Max desktop width: 700px.
      const width = Math.min(window.innerWidth - 40, 700);
      setPdfWidth(width);
    }
    
    // Run immediately and listen for resize
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 2. Document Load Success
  function onDocumentLoadSuccess(pdf) {
    setNumPages(pdf.numPages);
    setPdfObject(pdf);
  }

  // 3. Extract Text Logic
  async function extractTextFromPage(pageNo) {
    if (!pdfObject) return "";
    const page = await pdfObject.getPage(pageNo);
    const textContent = await page.getTextContent();
    return textContent.items.map(item => item.str).join(' ');
  }

  // 4. Translate Logic
  const handleTranslate = async (langCode) => {
    setLoading(true);
    try {
      const rawText = await extractTextFromPage(pageNumber);
      
      if (!rawText.trim()) {
        alert("This page appears to be an image. Cannot extract text!");
        setLoading(false);
        return;
      }

      // Use API_BASE here too!
      const res = await axios.post(`${API_BASE}/api/translate`, {
        text: rawText,
        targetLang: langCode
      });

      setTranslatedText(res.data.translatedText);
      setViewMode('TEXT');

    } catch (err) {
      console.error(err);
      alert("Translation failed. Check backend console.");
    } finally {
      setLoading(false);
    }
  };

  // 5. Change Page Logic
  const changePage = (offset) => {
    setPageNumber(prev => prev + offset);
    setViewMode('PDF'); 
    setTranslatedText('');
  };

  return (
    <div className="app-container fade-in">
      
      {/* --- FLOATING TOOLBAR --- */}
      <div className="toolbar">
        <button 
          className="btn btn-secondary" 
          disabled={pageNumber <= 1} 
          onClick={() => changePage(-1)}
        >
          ← Prev
        </button>
        
        <span className="page-info">
           Page {pageNumber} <span style={{color:'#b2bec3'}}>/</span> {numPages || '--'}
        </span>
        
        <button 
          className="btn btn-secondary" 
          disabled={pageNumber >= numPages} 
          onClick={() => changePage(1)}
        >
          Next →
        </button>

        {/* Translation Actions (Only in PDF Mode) */}
        {viewMode === 'PDF' && (
          <div className="translate-actions">
            <button onClick={() => handleTranslate('hi')} disabled={loading} className="lang-btn">
              {loading ? 'Processing...' : '🇮🇳 Hindi'}
            </button>
            <button onClick={() => handleTranslate('es')} disabled={loading} className="lang-btn">
              🇪🇸 Spanish
            </button>
            <button onClick={() => handleTranslate('fr')} disabled={loading} className="lang-btn">
              🇫🇷 French
            </button>
          </div>
        )}
      </div>

      {/* --- DOCUMENT VIEWPORT --- */}
      <div className="document-wrapper">
        
        {/* PDF VIEW */}
        {viewMode === 'PDF' && (
           <Document 
             file={fileUrl} 
             onLoadSuccess={onDocumentLoadSuccess} 
             loading={<div style={{padding: 20}}>Loading novel...</div>}
             error={<div style={{color:'red'}}>Failed to load PDF.</div>}
           >
             <Page 
                pageNumber={pageNumber} 
                width={pdfWidth}  /* Uses the calculated width for Mobile */
                renderTextLayer={true}
                className="pdf-page-shadow" 
             />
           </Document>
        )}

        {/* TRANSLATED TEXT VIEW (SEPIA MODE) */}
        {viewMode === 'TEXT' && (
          <div className="text-reader fade-in">
             <div className="text-reader-header">
                <span>Translated Chapter • Page {pageNumber}</span>
                <button onClick={() => setViewMode('PDF')} className="close-btn">
                  × Close Translation
                </button>
             </div>
             <div className="text-content">
               {translatedText.split('\n').map((para, index) => (
                 <p key={index}>{para}</p>
               ))}
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PdfReader;