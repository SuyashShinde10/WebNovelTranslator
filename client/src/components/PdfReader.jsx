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
  
  // --- NEW: SEARCH PAGE STATE ---
  const [inputPage, setInputPage] = useState('');

  // --- AUTOMATION STATES ---
  const [isAutoPlay, setIsAutoPlay] = useState(false); 
  const isAutoPlayRef = useRef(false); 

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

  // Sync Ref with State
  useEffect(() => {
    isAutoPlayRef.current = isAutoPlay;
    if (!isAutoPlay) {
      window.speechSynthesis.cancel();
    }
  }, [isAutoPlay]);

  // --- AUTOMATION ENGINE ---
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
  const fetchTranslation = async (text) => {
    try {
      setLoading(true);
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

  const speakText = (text, onComplete) => {
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes('hi'));
    if (hindiVoice) utterance.voice = hindiVoice;

    utterance.rate = 1.0;

    utterance.onend = () => {
      if (onComplete && isAutoPlayRef.current) {
        onComplete();
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const runAutoSequence = async () => {
    const rawText = await extractTextFromPage(pageNumber);
    if (!rawText.trim()) {
       if (pageNumber < numPages) setPageNumber(p => p + 1);
       return;
    }

    const hindiText = await fetchTranslation(rawText);
    setTranslatedText(hindiText);
    setViewMode('TEXT'); 

    speakText(hindiText, () => {
      if (pageNumber < numPages) {
        setPageNumber(prev => prev + 1);
      } else {
        setIsAutoPlay(false); 
        alert("Book Completed!");
      }
    });
  };

  // --- NAVIGATION HANDLERS ---

  const changePage = (offset) => {
    setIsAutoPlay(false); 
    setPageNumber(prev => prev + offset);
    setTranslatedText(''); 
    setViewMode('PDF'); 
  };

  // --- NEW: SEARCH / JUMP TO PAGE FUNCTION ---
  const handleJumpToPage = (e) => {
    e.preventDefault();
    const target = parseInt(inputPage);
    if (target >= 1 && target <= numPages) {
      setIsAutoPlay(false); // Stop audio if jumping
      setPageNumber(target);
      setTranslatedText(''); // Clear translation
      setViewMode('PDF'); // Reset to PDF view
      setInputPage(''); // Clear input
    } else {
      alert(`Please enter a page between 1 and ${numPages}`);
    }
  };

  // --- FEATURE HANDLERS ---

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

  const toggleAutoPlay = () => {
    if (isAutoPlay) {
      setIsAutoPlay(false); 
    } else {
      setIsAutoPlay(true); 
    }
  };

  return (
    <div className="app-container fade-in">
      
      {/* --- TOOLBAR --- */}
      <div className="toolbar" style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px'}}>
        
        {/* 1. Prev/Next Buttons */}
        <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
          <button className="btn btn-secondary" disabled={pageNumber <= 1} onClick={() => changePage(-1)}>←</button>
          <span className="page-info" style={{margin:'0 10px', minWidth: '80px', textAlign: 'center'}}>
             Pg {pageNumber} / {numPages || '--'}
          </span>
          <button className="btn btn-secondary" disabled={pageNumber >= numPages} onClick={() => changePage(1)}>→</button>
        </div>

        {/* 2. NEW: SEARCH PAGE INPUT */}
        <form onSubmit={handleJumpToPage} style={{display:'flex', gap:'5px'}}>
          <input 
            type="number" 
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            placeholder="Go to..."
            style={{
              width: '70px', 
              padding: '6px', 
              borderRadius: '4px', 
              border: '1px solid #ccc'
            }}
          />
          <button type="submit" className="btn btn-secondary" style={{padding: '6px 12px'}}>Go</button>
        </form>

        {/* 3. Smart Actions (Read & Audio) */}
        <div style={{display:'flex', gap:'10px'}}>
           <button 
             onClick={toggleReadMode} 
             className={`btn ${viewMode === 'TEXT' ? 'btn-primary' : 'btn-secondary'}`}
           >
             {viewMode === 'TEXT' ? '📄 PDF View' : '🇮🇳 Hindi View'}
           </button>

           <button 
             onClick={toggleAutoPlay} 
             className={`btn ${isAutoPlay ? 'btn-danger' : 'btn-success'}`} 
             style={{backgroundColor: isAutoPlay ? '#e74c3c' : '#27ae60', color:'white'}}
           >
             {isAutoPlay ? '⏹ Stop Audio' : '▶ Auto Play'}
           </button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="document-wrapper">
        
        {/* PDF VIEW */}
        <div style={{ display: viewMode === 'PDF' ? 'block' : 'none' }}>
           <Document file={file} onLoadSuccess={onDocumentLoadSuccess} loading={<div>Loading novel...</div>}>
             <Page pageNumber={pageNumber} width={pdfWidth} renderTextLayer={true} className="pdf-page-shadow" />
           </Document>
        </div>

        {/* TRANSLATED TEXT VIEW */}
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