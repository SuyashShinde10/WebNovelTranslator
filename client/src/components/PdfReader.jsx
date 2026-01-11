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
  const [pdfWidth, setPdfWidth] = useState(800);
  const [inputPage, setInputPage] = useState('');
  const [isAutoPlay, setIsAutoPlay] = useState(false); 
  const isAutoPlayRef = useRef(false); 
  const translationCache = useRef(new Map());

  // Handle Resize
  useEffect(() => {
    const updateWidth = () => setPdfWidth(Math.min(window.innerWidth - 60, 900));
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    isAutoPlayRef.current = isAutoPlay;
    if (!isAutoPlay) window.speechSynthesis.cancel();
  }, [isAutoPlay]);

  function onDocumentLoadSuccess(pdf) {
    setNumPages(pdf.numPages);
    setPdfObject(pdf);
  }

  const extractTextFromPage = useCallback(async (pageNo) => {
    if (!pdfObject) return "";
    try {
      const page = await pdfObject.getPage(pageNo);
      const textContent = await page.getTextContent();
      return textContent.items.map(item => item.str).join(' ');
    } catch (e) { return ""; }
  }, [pdfObject]);

  const getTranslation = async (pageNo) => {
    if (translationCache.current.has(pageNo)) return translationCache.current.get(pageNo);
    try {
      const rawText = await extractTextFromPage(pageNo);
      if (!rawText.trim()) return "";
      const res = await axios.post('/api/translate', { text: rawText, targetLang: 'hi' });
      const result = res.data.translatedText;
      translationCache.current.set(pageNo, result);
      return result;
    } catch (err) { return "Translation failed."; }
  };

  const prefetchNextPage = async (currentPage) => {
    const nextPage = currentPage + 1;
    if (nextPage <= numPages && !translationCache.current.has(nextPage)) {
      await getTranslation(nextPage);
    }
  };

  const loadPageContent = async (pageNum, mode) => {
    if (mode === 'PDF') {
      if (pdfObject) prefetchNextPage(pageNum);
      return;
    }
    setLoading(true);
    const text = await getTranslation(pageNum);
    setTranslatedText(text);
    setLoading(false);
    if (pdfObject) prefetchNextPage(pageNum);
  };

  useEffect(() => {
    if (pdfObject) {
      loadPageContent(pageNumber, viewMode);
      if (isAutoPlay) runAutoSequence();
    }
  }, [pageNumber, viewMode, pdfObject, isAutoPlay]);

  const runAutoSequence = async () => {
    let hindiText = translationCache.current.get(pageNumber);
    if (!hindiText) {
      hindiText = await getTranslation(pageNumber);
      setTranslatedText(hindiText);
    }
    if (viewMode !== 'TEXT') setViewMode('TEXT');
    speakText(hindiText, () => {
      if (pageNumber < numPages) setPageNumber(prev => prev + 1);
      else { setIsAutoPlay(false); alert("Book Completed!"); }
    });
  };

  const speakText = (text, onComplete) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes('hi')) || voices[0];
    if (hindiVoice) utterance.voice = hindiVoice;
    utterance.onend = () => { if (onComplete && isAutoPlayRef.current) onComplete(); };
    window.speechSynthesis.speak(utterance);
  };

  const changePage = (offset) => {
    setIsAutoPlay(false);
    const newPage = pageNumber + offset;
    if (newPage >= 1 && newPage <= numPages) setPageNumber(newPage);
  };

  const handleJumpToPage = (e) => {
    e.preventDefault();
    const target = parseInt(inputPage);
    if (target >= 1 && target <= numPages) {
      setIsAutoPlay(false);
      setPageNumber(target);
      setInputPage('');
    }
  };

  return (
    <div className="reader-container fade-in">
      {/* TOOLBAR */}
      <div className="toolbar">
        {/* Left: Close */}
        <div className="toolbar-group">
          <button className="btn btn-secondary btn-icon" onClick={() => window.location.reload()} title="Close Book">
             ✕
          </button>
          <h4 style={{margin:0, fontWeight:600, color:'#fff', display:'none', sm:{display:'block'}}}>Reader</h4>
        </div>

        {/* Center: Navigation */}
        <div className="toolbar-group">
          <button className="btn btn-secondary btn-icon" disabled={pageNumber <= 1} onClick={() => changePage(-1)}>←</button>
          <span style={{color:'#fff', fontWeight:600, minWidth:'80px', textAlign:'center', fontSize:'0.9rem'}}>
             {pageNumber} / {numPages || '--'}
          </span>
          <button className="btn btn-secondary btn-icon" disabled={pageNumber >= numPages} onClick={() => changePage(1)}>→</button>
        </div>

        {/* Right: Actions */}
        <div className="toolbar-group">
           <form onSubmit={handleJumpToPage} style={{display:'flex'}}>
             <input className="page-input" type="number" placeholder="Pg#" value={inputPage} onChange={(e) => setInputPage(e.target.value)} />
           </form>

           <button 
             onClick={() => setViewMode(viewMode === 'PDF' ? 'TEXT' : 'PDF')} 
             className={`btn ${viewMode === 'TEXT' ? 'btn-primary' : 'btn-secondary'}`}
             title="Toggle Text/PDF Mode"
           >
             {viewMode === 'TEXT' ? 'View PDF' : 'Translate'}
           </button>

           <button 
             onClick={() => setIsAutoPlay(!isAutoPlay)} 
             className={`btn ${isAutoPlay ? 'btn-danger' : 'btn-primary'}`}
             title="Auto Play Audio"
           >
             {isAutoPlay ? 'Stop' : '▶ Play'}
           </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="document-wrapper">
        {viewMode === 'PDF' ? (
           <Document file={file} onLoadSuccess={onDocumentLoadSuccess} loading={<div className="spinner"></div>}>
             <Page pageNumber={pageNumber} width={pdfWidth} renderTextLayer={false} renderAnnotationLayer={false} className="pdf-page-shadow" />
           </Document>
        ) : (
           <div className="text-reader fade-in">
              <div className="text-reader-header">
                 <span>🇮🇳 Hindi Translation</span>
                 {loading && <div className="spinner"></div>}
              </div>
              <div style={{minHeight:'400px'}}>
                {loading ? (
                  <div style={{textAlign:'center', marginTop:'50px', color:'#888'}}>Translating Page {pageNumber}...</div>
                ) : (
                  translatedText ? translatedText.split('\n').map((para, i) => <p key={i}>{para}</p>) : "No text extracted."
                )}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
export default PdfReader;