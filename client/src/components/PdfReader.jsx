import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [viewMode, setViewMode] = useState('PDF'); 
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfWidth, setPdfWidth] = useState(null);
  
  // Search State
  const [inputPage, setInputPage] = useState('');

  // Automation State
  const [isAutoPlay, setIsAutoPlay] = useState(false); 
  const isAutoPlayRef = useRef(false); 

  // --- 🚀 PERFORMANCE CACHE ---
  // Stores translations like: { 1: "Hindi text...", 2: "Hindi text..." }
  const translationCache = useRef(new Map());

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

  // Sync Ref
  useEffect(() => {
    isAutoPlayRef.current = isAutoPlay;
    if (!isAutoPlay) window.speechSynthesis.cancel();
  }, [isAutoPlay]);

  // --- PDF LOADED ---
  function onDocumentLoadSuccess(pdf) {
    setNumPages(pdf.numPages);
    setPdfObject(pdf);
  }

  // --- TEXT EXTRACTION ---
  const extractTextFromPage = useCallback(async (pageNo) => {
    if (!pdfObject) return "";
    try {
      const page = await pdfObject.getPage(pageNo);
      const textContent = await page.getTextContent();
      return textContent.items.map(item => item.str).join(' ');
    } catch (e) {
      console.error("Extraction error:", e);
      return "";
    }
  }, [pdfObject]);

  // --- 🚀 FAST TRANSLATION (With Cache) ---
  const getTranslation = async (pageNo) => {
    // 1. Check Cache First (INSTANT LOAD)
    if (translationCache.current.has(pageNo)) {
      console.log(`⚡ Cache Hit for Page ${pageNo}`);
      return translationCache.current.get(pageNo);
    }

    // 2. If not in cache, fetch from API
    try {
      const rawText = await extractTextFromPage(pageNo);
      if (!rawText.trim()) return "";

      console.log(`🌐 Fetching AI Translation for Page ${pageNo}...`);
      const res = await axios.post('/api/translate', {
        text: rawText,
        targetLang: 'hi'
      });

      const result = res.data.translatedText;
      
      // 3. Save to Cache
      translationCache.current.set(pageNo, result);
      return result;

    } catch (err) {
      console.error(err);
      return "Translation failed. Network error?";
    }
  };

  // --- 🚀 PREFETCHING (The Secret Sauce) ---
  const prefetchNextPage = async (currentPage) => {
    const nextPage = currentPage + 1;
    if (nextPage <= numPages && !translationCache.current.has(nextPage)) {
      console.log(`🔄 Background Prefetching Page ${nextPage}...`);
      await getTranslation(nextPage); // This runs silently in background!
    }
  };

  // --- MAIN LOGIC ---
  const loadPageContent = async (pageNum, mode) => {
    // If in PDF mode, just show PDF. But still prefetch next page for speed!
    if (mode === 'PDF') {
      if (pdfObject) prefetchNextPage(pageNum);
      return;
    }

    // If in Text Mode, get translation
    setLoading(true);
    const text = await getTranslation(pageNum);
    setTranslatedText(text);
    setLoading(false);

    // ⚡ Start prefetching the NEXT page immediately after showing this one
    if (pdfObject) prefetchNextPage(pageNum);
  };

  // --- EFFECT: Handle Page Changes ---
  useEffect(() => {
    if (pdfObject) {
      loadPageContent(pageNumber, viewMode);
      
      // Audio Loop Logic
      if (isAutoPlay) {
        runAutoSequence();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, viewMode, pdfObject, isAutoPlay]);


  // --- AUDIO / AUTO PLAY ENGINE ---
  const runAutoSequence = async () => {
    // 1. Get Text (Should be instant from cache now)
    let hindiText = translationCache.current.get(pageNumber);
    
    if (!hindiText) {
      // If user skipped ahead too fast, we wait for fetch
      hindiText = await getTranslation(pageNumber);
      setTranslatedText(hindiText);
    }
    
    // Ensure we are in text mode
    if (viewMode !== 'TEXT') setViewMode('TEXT');

    // 2. Speak
    speakText(hindiText, () => {
      // 3. On Complete -> Next Page
      if (pageNumber < numPages) {
        setPageNumber(prev => prev + 1);
      } else {
        setIsAutoPlay(false);
        alert("Book Completed!");
      }
    });
  };

  const speakText = (text, onComplete) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    // Try to find Google Hindi first (usually better quality)
    const hindiVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('hi')) 
                    || voices.find(v => v.lang.includes('hi'));
    
    if (hindiVoice) utterance.voice = hindiVoice;
    utterance.rate = 1.0;

    utterance.onend = () => {
      if (onComplete && isAutoPlayRef.current) onComplete();
    };

    window.speechSynthesis.speak(utterance);
  };

  // --- UI HANDLERS ---

  const changePage = (offset) => {
    setIsAutoPlay(false);
    const newPage = pageNumber + offset;
    if (newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
      // viewMode stays the same! If you were reading, you stay reading.
    }
  };

  const handleJumpToPage = (e) => {
    e.preventDefault();
    const target = parseInt(inputPage);
    if (target >= 1 && target <= numPages) {
      setIsAutoPlay(false);
      setPageNumber(target);
      setInputPage('');
    } else {
      alert(`Please enter a page between 1 and ${numPages}`);
    }
  };

  const toggleReadMode = () => {
    const newMode = viewMode === 'PDF' ? 'TEXT' : 'PDF';
    setViewMode(newMode);
    // If switching to text, content loads via the Effect hook
  };

  const toggleAutoPlay = () => {
    setIsAutoPlay(!isAutoPlay);
  };

  return (
    <div className="app-container fade-in">
      
      {/* TOOLBAR */}
      <div className="toolbar" style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px'}}>
        
        {/* Nav */}
        <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
          <button className="btn btn-secondary" disabled={pageNumber <= 1} onClick={() => changePage(-1)}>←</button>
          <span className="page-info" style={{margin:'0 10px', minWidth: '80px', textAlign: 'center'}}>
             Pg {pageNumber} / {numPages || '--'}
          </span>
          <button className="btn btn-secondary" disabled={pageNumber >= numPages} onClick={() => changePage(1)}>→</button>
        </div>

        {/* Search */}
        <form onSubmit={handleJumpToPage} style={{display:'flex', gap:'5px'}}>
          <input 
            type="number" 
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            placeholder="Go to..."
            style={{width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid #ccc'}}
          />
          <button type="submit" className="btn btn-secondary" style={{padding: '6px 10px'}}>Go</button>
        </form>

        {/* Actions */}
        <div style={{display:'flex', gap:'10px'}}>
           <button 
             onClick={toggleReadMode} 
             className={`btn ${viewMode === 'TEXT' ? 'btn-primary' : 'btn-secondary'}`}
           >
             {viewMode === 'TEXT' ? '📄 View PDF' : '🇮🇳 Read Hindi'}
           </button>

           <button 
             onClick={toggleAutoPlay} 
             className={`btn ${isAutoPlay ? 'btn-danger' : 'btn-success'}`} 
           >
             {isAutoPlay ? '⏹ Stop Audio' : '▶ Auto Play'}
           </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="document-wrapper">
        
        {/* PDF Layer */}
        <div style={{ display: viewMode === 'PDF' ? 'block' : 'none' }}>
           <Document file={file} onLoadSuccess={onDocumentLoadSuccess} loading={<div>Loading novel...</div>}>
             <Page pageNumber={pageNumber} width={pdfWidth} renderTextLayer={true} className="pdf-page-shadow" />
           </Document>
        </div>

        {/* Text Layer */}
        <div style={{ display: viewMode === 'TEXT' ? 'block' : 'none' }} className="text-reader fade-in">
           <div className="text-reader-header">
              <span>📖 Hindi Translation</span>
              {loading && <span style={{fontSize:'0.8em', color:'#f39c12', marginLeft:'10px'}}> Translating...</span>}
           </div>
           
           <div className="text-content" style={{minHeight:'300px'}}>
             {loading ? (
               <div style={{textAlign:'center', padding:'40px'}}>
                 <div className="spinner"></div> 
                 <p style={{marginTop:'15px', color:'#666'}}>Translating Page {pageNumber}...</p>
                 <small>(Next pages are loading in background)</small>
               </div>
             ) : (
               translatedText ? translatedText.split('\n').map((para, index) => <p key={index}>{para}</p>) : "No text found."
             )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default PdfReader;