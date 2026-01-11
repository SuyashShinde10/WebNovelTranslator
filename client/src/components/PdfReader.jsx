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
  const [viewMode, setViewMode] = useState('PDF'); // 'PDF' or 'TEXT'
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfWidth, setPdfWidth] = useState(null);
  
  // --- AUTOMATION STATES ---
  const [isAutoPlay, setIsAutoPlay] = useState(false); // Controls the continuous loop
  const isAutoPlayRef = useRef(false); // Ref to access state inside event listeners

  // Mobile Responsive Width
  useEffect(() => {
    function updateWidth() {
      const width = Math.min(window.innerWidth - 40, 700);
      setPdfWidth(width);
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Sync Ref with State (for use inside audio callbacks)
  useEffect(() => {
    isAutoPlayRef.current = isAutoPlay;
    // If user stops auto-play manually, cancel speech
    if (!isAutoPlay) {
      window.speechSynthesis.cancel();
    }
  }, [isAutoPlay]);

  // --- AUTOMATION ENGINE ---
  // Triggers whenever pageNumber changes IF AutoPlay is active
  useEffect(() => {
    if (isAutoPlay && pdfObject) {
      runAutoSequence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, isAutoPlay, pdfObject]);

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

  // --- CORE FUNCTIONS ---

  // 1. Translation Logic
  const fetchTranslation = async (text) => {
    try {
      setLoading(true);
      // Use relative path '/api/translate' for Vercel support
      const res = await axios.post('/api/translate', {
        text: text,
        targetLang: 'hi' // FORCE HINDI
      });
      setLoading(false);
      return res.data.translatedText;
    } catch (err) {
      console.error(err);
      setLoading(false);
      return "Translation failed. Please try again.";
    }
  };

  // 2. Speech Logic
  const speakText = (text, onComplete) => {
    window.speechSynthesis.cancel(); // Stop previous
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find Hindi Voice
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes('hi'));
    if (hindiVoice) utterance.voice = hindiVoice;

    utterance.rate = 1.0;

    // EVENT: When audio finishes
    utterance.onend = () => {
      if (onComplete && isAutoPlayRef.current) {
        onComplete();
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // 3. The "Auto Loop" Logic
  const runAutoSequence = async () => {
    // Step A: Extract Text
    const rawText = await extractTextFromPage(pageNumber);
    if (!rawText.trim()) {
       // If empty page, skip to next
       if (pageNumber < numPages) setPageNumber(p => p + 1);
       return;
    }

    // Step B: Translate to Hindi (Auto)
    const hindiText = await fetchTranslation(rawText);
    setTranslatedText(hindiText);
    setViewMode('TEXT'); // Force Text Mode to show what's being read

    // Step C: Speak & Wait for Finish
    speakText(hindiText, () => {
      // Step D: On Finish, Go Next
      if (pageNumber < numPages) {
        setPageNumber(prev => prev + 1);
      } else {
        setIsAutoPlay(false); // Stop at end of book
        alert("Book Completed!");
      }
    });
  };

  // --- USER BUTTON HANDLERS ---

  // User clicks "Read Mode" -> Auto Translate current page
  const toggleReadMode = async () => {
    if (viewMode === 'PDF') {
      setViewMode('TEXT');
      const text = await extractTextFromPage(pageNumber);
      const hindi = await fetchTranslation(text);
      setTranslatedText(hindi);
    } else {
      setViewMode('PDF');
      setTranslatedText('');
    }
  };

  // User clicks "Audio Book" -> Starts the Loop
  const toggleAutoPlay = () => {
    if (isAutoPlay) {
      setIsAutoPlay(false); // Stop
    } else {
      setIsAutoPlay(true); // Start Loop (triggers useEffect)
    }
  };

  const changePage = (offset) => {
    setIsAutoPlay(false); // Manual navigation stops auto-play
    setPageNumber(prev => prev + offset);
    setTranslatedText(''); // Clear old text
    setViewMode('PDF'); // Revert to PDF view on manual change
  };

  return (
    <div className="app-container fade-in">
      
      {/* --- TOOLBAR --- */}
      <div className="toolbar" style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px'}}>
        
        {/* Navigation */}
        <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
          <button className="btn btn-secondary" disabled={pageNumber <= 1} onClick={() => changePage(-1)}>←</button>
          <span className="page-info" style={{margin:'0 10px'}}>Pg {pageNumber}</span>
          <button className="btn btn-secondary" disabled={pageNumber >= numPages} onClick={() => changePage(1)}>→</button>
        </div>

        {/* Action Buttons */}
        <div style={{display:'flex', gap:'10px'}}>
           {/* READ MODE (Auto Translate) */}
           <button 
             onClick={toggleReadMode} 
             className={`btn ${viewMode === 'TEXT' ? 'btn-primary' : 'btn-secondary'}`}
           >
             {viewMode === 'TEXT' ? '📄 Show Original PDF' : '🇮🇳 Read in Hindi'}
           </button>

           {/* AUDIO MODE (Continuous Loop) */}
           <button 
             onClick={toggleAutoPlay} 
             className={`btn ${isAutoPlay ? 'btn-danger' : 'btn-success'}`} 
             style={{backgroundColor: isAutoPlay ? '#e74c3c' : '#27ae60', color:'white'}}
           >
             {isAutoPlay ? '⏹ Stop Audio' : '▶ Start Audio Book'}
           </button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="document-wrapper">
        
        {/* VIEW 1: PDF */}
        <div style={{ display: viewMode === 'PDF' ? 'block' : 'none' }}>
           <Document file={file} onLoadSuccess={onDocumentLoadSuccess} loading={<div>Loading novel...</div>}>
             <Page pageNumber={pageNumber} width={pdfWidth} renderTextLayer={true} className="pdf-page-shadow" />
           </Document>
        </div>

        {/* VIEW 2: TRANSLATED TEXT */}
        <div style={{ display: viewMode === 'TEXT' ? 'block' : 'none' }} className="text-reader fade-in">
           <div className="text-reader-header">
              <span>📖 Hindi Translation (Page {pageNumber})</span>
              {loading && <span style={{fontSize:'0.8em', color:'#f39c12'}}> Translating...</span>}
           </div>
           
           <div className="text-content" style={{minHeight:'300px'}}>
             {loading ? (
               <div style={{textAlign:'center', padding:'20px'}}>
                 <div className="spinner"></div> 
                 <p>Translating to Hindi...</p>
               </div>
             ) : (
               translatedText.split('\n').map((para, index) => <p key={index}>{para}</p>)
             )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default PdfReader;