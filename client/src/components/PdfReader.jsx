import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import '../App.css';

// Worker Setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const PdfReader = ({ file }) => { // Receives 'file' object directly
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfObject, setPdfObject] = useState(null);
  const [viewMode, setViewMode] = useState('PDF'); 
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfWidth, setPdfWidth] = useState(null);

  // Responsive Width
  useEffect(() => {
    function updateWidth() {
      const width = Math.min(window.innerWidth - 40, 700);
      setPdfWidth(width);
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  function onDocumentLoadSuccess(pdf) {
    setNumPages(pdf.numPages);
    setPdfObject(pdf);
  }

  async function extractTextFromPage(pageNo) {
    if (!pdfObject) return "";
    const page = await pdfObject.getPage(pageNo);
    const textContent = await page.getTextContent();
    return textContent.items.map(item => item.str).join(' ');
  }

  const handleTranslate = async (langCode) => {
    setLoading(true);
    try {
      const rawText = await extractTextFromPage(pageNumber);
      
      if (!rawText.trim()) {
        alert("This page appears to be an image. Cannot extract text!");
        setLoading(false);
        return;
      }

      // THIS IS THE ONLY TIME WE TALK TO THE SERVER
      // Note: We use relative path '/api/translate' which works automatically on Vercel
      const res = await axios.post('/api/translate', {
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

  const changePage = (offset) => {
    setPageNumber(prev => prev + offset);
    setViewMode('PDF'); 
    setTranslatedText('');
  };

  return (
    <div className="app-container fade-in">
      <div className="toolbar">
        <button className="btn btn-secondary" disabled={pageNumber <= 1} onClick={() => changePage(-1)}>← Prev</button>
        <span className="page-info">Page {pageNumber} / {numPages || '--'}</span>
        <button className="btn btn-secondary" disabled={pageNumber >= numPages} onClick={() => changePage(1)}>Next →</button>

        {viewMode === 'PDF' && (
          <div className="translate-actions">
            <button onClick={() => handleTranslate('hi')} disabled={loading} className="lang-btn">
              {loading ? '...' : '🇮🇳 Hindi'}
            </button>
             <button onClick={() => handleTranslate('es')} disabled={loading} className="lang-btn">
              🇪🇸 Spanish
            </button>
          </div>
        )}
      </div>

      <div className="document-wrapper">
        {viewMode === 'PDF' && (
           <Document file={file} onLoadSuccess={onDocumentLoadSuccess} loading={<div>Loading...</div>}>
             <Page pageNumber={pageNumber} width={pdfWidth} renderTextLayer={true} className="pdf-page-shadow" />
           </Document>
        )}

        {viewMode === 'TEXT' && (
          <div className="text-reader fade-in">
             <div className="text-reader-header">
                <span>Translated Chapter</span>
                <button onClick={() => setViewMode('PDF')} className="close-btn">× Close</button>
             </div>
             <div className="text-content">
               {translatedText.split('\n').map((para, index) => <p key={index}>{para}</p>)}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfReader;