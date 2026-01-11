import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import '../App.css';

// Worker Setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const PdfReader = ({ file }) => { 
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfObject, setPdfObject] = useState(null);
  
  // MODES: 'NORMAL' (Just PDF), 'READ' (Text), 'AUDIO' (Auto-Play)
  const [appMode, setAppMode] = useState('NORMAL'); 
  
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfWidth, setPdfWidth] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  // Refs to track state inside event listeners (Crucial for Audio Loop)
  const appModeRef = useRef('NORMAL');
  const pageNumberRef = useRef(1);
  const numPagesRef = useRef(null);

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

  // Update Refs whenever state changes
  useEffect(() => {
    appModeRef.current = appMode;
    pageNumberRef.current = pageNumber;
    numPagesRef.current = numPages;
  }, [appMode, pageNumber, numPages]);

  // Stop audio when component unmounts
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  function onDocumentLoadSuccess(pdf) {
    setNumPages(pdf.numPages);
    setPdfObject(pdf);
  }

  // --- 1. CORE FUNCTIONS ---

  async function extractTextFromPage(pageNo) {
    if (!pdfObject) return "";
    const page = await pdfObject.getPage(pageNo);
    const textContent = await page.getTextContent();
    return textContent.items.map(item => item.str).join(' ');
  }

  async function translateCurrentPage() {
    setLoading(true);
    setStatusMsg(`Translating Page ${pageNumberRef.current}...`);
    try {
      const rawText = await extractTextFromPage(pageNumberRef.current);
      
      if (!rawText.trim()) {
        setStatusMsg("Skipping empty page...");
        // If audio mode, skip to next page automatically
        if (appModeRef.current === 'AUDIO') handleNextPage(); 
        setLoading(false);
        return "";
      }

      // Translate to HINDI (Fixed Language)
      const res = await axios.post('/api/translate', {
        text: rawText,
        targetLang: 'hi'
      });

      const hindiText = res.data.translatedText;
      setTranslatedText(hindiText);
      setLoading(false);
      return hindiText;

    } catch (err) {
      console.error(err);
      setStatusMsg("Error translating page.");
      setLoading(false);
      // If error in audio mode, stop everything so user knows
      if (appModeRef.current === 'AUDIO') setAppMode('NORMAL');
      return null;
    }
  }

  // --- 2. AUDIO ENGINE (THE LOOP) ---

  const speakText = (text) => {
    if (!text) return;
    
    window.speechSynthesis.cancel();
    setStatusMsg(`🔊 Reading Page ${pageNumberRef.current}...`);

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find Hindi Voice
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('HI'));
    if (hindiVoice) utterance.voice = hindiVoice;

    utterance.rate = 1.0; 

    // THE MAGIC: When done speaking, go to next page
    utterance.onend = () => {
      if (appModeRef.current === 'AUDIO') {
        console.log("Audio finished. Moving to next page...");
        handleNextPage();
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // --- 3. STATE MACHINE (Handles Mode Changes) ---

  // Triggered when Page Changes (Manual or Auto)
  useEffect(() => {
    if (appMode === 'NORMAL') return;

    // If in READ or AUDIO mode, translate the new page immediately
    const processPage = async () => {
      const text = await translateCurrentPage();
      
      if (text && appMode === 'AUDIO') {
        // If Audio mode, start speaking immediately after translation
        speakText(text);
      }
    };

    processPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, appMode]); // Runs on Page Change OR Mode Change


  // --- 4. CONTROLS ---

  const toggleReadMode = () => {
    window.speechSynthesis.cancel();
    if (appMode === 'READ') {
      setAppMode('NORMAL');
    } else {
      setAppMode('READ'); // This will trigger the useEffect above to translate
    }
  };

  const toggleAudioMode = () => {
    window.speechSynthesis.cancel();
    if (appMode === 'AUDIO') {
      setAppMode('NORMAL');
      setStatusMsg("Audiobook Stopped.");
    } else {
      setAppMode('AUDIO'); // This triggers useEffect -> Translate -> Speak -> Next Page
    }
  };

  const handleNextPage = () => {
    if (pageNumberRef.current >= numPagesRef.current) {
      setStatusMsg("End of Book Reached.");
      setAppMode('NORMAL');
      return;
    }
    setPageNumber(prev => prev + 1);
  };

  const handlePrevPage = () => {
    window.speechSynthesis.cancel();
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  return (
    <div className="app-container fade-in">
      
      {/* --- STATUS BAR --- */}
      {loading && <div style={{textAlign:'center', padding: '10px', color: '#e67e22', fontWeight:'bold'}}>{statusMsg}</div>}
      {appMode === 'AUDIO' && !loading && <div style={{textAlign:'center', padding: '10px', color: '#27ae60', fontWeight:'bold'}}>▶ Playing Audiobook Mode...</div>}

      {/* --- CONTROL TOOLBAR --- */}
      <div className="toolbar" style={{flexWrap: 'wrap', justifyContent: 'center'}}>
        
        {/* Navigation */}
        <button className="btn btn-secondary" disabled={pageNumber <= 1} onClick={handlePrevPage}>← Prev</button>
        <span className="page-info">Page {pageNumber} / {numPages || '--'}</span>
        <button className="btn btn-secondary" disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => p+1)}>Next →</button>

        <div style={{width: '20px'}}></div> {/* Spacer */}

        {/* MODE TOGGLES */}
        <button 
          onClick={toggleReadMode} 
          className={`btn ${appMode === 'READ' ? 'btn-primary' : 'btn-secondary'}`}
        >
          {appMode === 'READ' ? '📖 Exit Reading' : '📖 Read (Hindi)'}
        </button>

        <button 
          onClick={toggleAudioMode} 
          className={`btn ${appMode === 'AUDIO' ? 'btn-primary' : 'btn-secondary'}`}
          style={{backgroundColor: appMode === 'AUDIO' ? '#e74c3c' : ''}} // Red when active
        >
          {appMode === 'AUDIO' ? '⏹ Stop Audio' : '🎧 Start Audiobook'}
        </button>

      </div>

      <div className="document-wrapper">
        
        {/* --- 1. NORMAL PDF MODE --- */}
        {appMode === 'NORMAL' && (
           <Document file={file} onLoadSuccess={onDocumentLoadSuccess} loading={<div>Loading novel...</div>}>
             <Page pageNumber={pageNumber} width={pdfWidth} renderTextLayer={true} className="pdf-page-shadow" />
           </Document>
        )}

        {/* --- 2. TRANSLATED / AUDIO VISUAL MODE --- */}
        {(appMode === 'READ' || appMode === 'AUDIO') && (
          <div className="text-reader fade-in">
             <div className="text-reader-header">
                <span>
                   {appMode === 'AUDIO' ? '🎧 Listening to Page ' : '📖 Reading Page '} 
                   {pageNumber} (Hindi)
                </span>
             </div>
             
             {loading ? (
               <div style={{padding: '40px', textAlign: 'center', color: '#7f8c8d'}}>
                 <p>Translating...</p>
                 <div className="spinner"></div> 
               </div>
             ) : (
               <div className="text-content">
                 {translatedText.split('\n').map((para, index) => <p key={index}>{para}</p>)}
               </div>
             )}
          </div>
        )}

      </div>
    </div>
  );
};

export default PdfReader;