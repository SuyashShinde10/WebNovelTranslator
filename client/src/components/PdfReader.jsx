import React, { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import '../App.css';

// --- WORKER SETUP ---
// Ensure the worker version matches the installed library version
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const PdfReader = ({ file }) => { 
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfObject, setPdfObject] = useState(null);
  const [viewMode, setViewMode] = useState('PDF'); // 'PDF' or 'TEXT'
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfWidth, setPdfWidth] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // --- 1. RESPONSIVE WIDTH (DEBOUNCED) ---
  useEffect(() => {
    const updateWidth = () => {
      const width = Math.min(window.innerWidth - 40, 700);
      setPdfWidth(width);
    };

    // Initial Set
    updateWidth();

    // Debounce: Wait 100ms before updating to prevent lag
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateWidth, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // --- 2. AUDIO CLEANUP ---
  useEffect(() => {
    // Stop speaking if user leaves the page/component
    return () => window.speechSynthesis.cancel();
  }, []);

  // --- PDF LOAD HANDLERS ---
  function onDocumentLoadSuccess(pdf) {
    setNumPages(pdf.numPages);
    setPdfObject(pdf);
  }

  function onDocumentLoadError(error) {
    console.error("PDF Load Error:", error);
    alert("Error loading PDF. Please try a different file.");
  }

  async function extractTextFromPage(pageNo) {
    if (!pdfObject) return "";
    const page = await pdfObject.getPage(pageNo);
    const textContent = await page.getTextContent();
    return textContent.items.map(item => item.str).join(' ');
  }

  // --- 3. SMART AUDIO FUNCTION ---
  const speakText = (text, langCode) => {
    window.speechSynthesis.cancel(); // Stop previous
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Voice Selection Logic (Handles Chrome async loading)
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Try exact match first, then partial match
      const targetVoice = voices.find(v => v.lang === langCode) || 
                          voices.find(v => v.lang.startsWith(langCode));
      
      if (targetVoice) utterance.voice = targetVoice;
    };

    // If voices are missing, wait for them (Chrome quirk)
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    } else {
      setVoice();
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error("Audio Error:", e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // --- 4. ACTIONS ---

  const handleReadEnglish = async () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    const text = await extractTextFromPage(pageNumber);
    if (text && text.trim().length > 0) {
      speakText(text, 'en-US'); // Default to US English
    } else {
      alert("No text found on this page. It might be an image.");
    }
  };

  const handleTranslate = async (langCode) => {
    stopSpeaking();
    setLoading(true);
    
    try {
      const rawText = await extractTextFromPage(pageNumber);
      
      if (!rawText || !rawText.trim()) {
        alert("Empty Page! This page might be an image or scanned text.");
        setLoading(false);
        return;
      }

      // Call our Smart Backend
      const res = await axios.post('/api/translate', {
        text: rawText,
        targetLang: langCode
      });

      setTranslatedText(res.data.translatedText);
      setViewMode('TEXT');

    } catch (err) {
      console.error("Translation Error:", err);
      // Show the specific error from backend (e.g., "Reading too fast")
      const msg = err.response?.data?.translatedText || 
                  err.response?.data?.error || 
                  "Translation failed. Please try again.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const changePage = (offset) => {
    stopSpeaking();
    const newPage = pageNumber + offset;
    if (newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
      setViewMode('PDF'); // Reset to PDF view to save API quota
      setTranslatedText('');
    }
  };

  return (
    <div className="app-container fade-in">
      
      {/* --- TOOLBAR --- */}
      <div className="toolbar">
        <button 
          className="btn btn-secondary" 
          disabled={pageNumber <= 1} 
          onClick={() => changePage(-1)}
        >
          ← Prev
        </button>
        
        <span className="page-info">
          Page {pageNumber} / {numPages || '--'}
        </span>
        
        <button 
          className="btn btn-secondary" 
          disabled={numPages && pageNumber >= numPages} 
          onClick={() => changePage(1)}
        >
          Next →
        </button>

        {/* Listen Button (Only visible in PDF mode) */}
        {viewMode === 'PDF' && (
           <button 
             onClick={handleReadEnglish} 
             className={`btn ${isSpeaking ? 'btn-primary' : 'btn-secondary'}`}
             style={{marginLeft: '15px'}}
           >
             {isSpeaking ? '⏹ Stop' : '🔊 Listen (Eng)'}
           </button>
        )}
      </div>

      {/* --- TRANSLATION ACTIONS --- */}
      {viewMode === 'PDF' && (
        <div className="translate-actions" style={{display: 'flex', justifyContent: 'center', padding: '10px'}}>
           <span style={{marginRight:'10px', alignSelf:'center', color:'#aaa'}}>Translate to:</span>
           <button onClick={() => handleTranslate('hi')} disabled={loading} className="lang-btn">🇮🇳 Hindi</button>
           <button onClick={() => handleTranslate('es')} disabled={loading} className="lang-btn">🇪🇸 Spanish</button>
           <button onClick={() => handleTranslate('fr')} disabled={loading} className="lang-btn">🇫🇷 French</button>
        </div>
      )}

      {/* --- CONTENT AREA --- */}
      <div className="document-wrapper">
        
        {/* VIEW 1: PDF */}
        {viewMode === 'PDF' && (
           <Document 
             file={file} 
             onLoadSuccess={onDocumentLoadSuccess}
             onLoadError={onDocumentLoadError}
             loading={<div style={{color: 'white', marginTop: '20px'}}>Loading PDF...</div>}
           >
             <Page 
               pageNumber={pageNumber} 
               width={pdfWidth} 
               renderTextLayer={true} 
               className="pdf-page-shadow" 
             />
           </Document>
        )}

        {/* VIEW 2: TRANSLATED TEXT */}
        {viewMode === 'TEXT' && (
          <div className="text-reader fade-in">
             <div className="text-reader-header">
                <span>📖 Translated Chapter</span>
                
                <div style={{display:'flex', gap:'10px'}}>
                  <button 
                    onClick={() => isSpeaking ? stopSpeaking() : speakText(translatedText, 'hi')} 
                    className="btn btn-primary"
                    style={{fontSize: '0.9rem'}}
                  >
                    {isSpeaking ? '⏹ Stop' : '🔊 Read Aloud'}
                  </button>

                  <button 
                    onClick={() => { stopSpeaking(); setViewMode('PDF'); }} 
                    className="close-btn"
                  >
                    ✕ Close
                  </button>
                </div>
             </div>
             
             {loading ? (
               <div style={{textAlign: 'center', padding: '20px'}}>Translating...</div>
             ) : (
               <div className="text-content">
                 {translatedText.split('\n').map((para, index) => (
                   para.trim() && <p key={index}>{para}</p>
                 ))}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfReader;