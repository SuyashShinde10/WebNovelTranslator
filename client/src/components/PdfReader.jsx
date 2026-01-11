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
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const isAutoPlayRef = useRef(false);
  const translationCache = useRef(new Map());

  useEffect(() => {
    const updateWidth = () => setPdfWidth(Math.min(window.innerWidth - 50, 800));
    window.addEventListener('resize', updateWidth);
    updateWidth();
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

  const runAutoSequence = async () => {
    let text = translationCache.current.get(pageNumber);
    if (!text) {
      text = await getTranslation(pageNumber);
      setTranslatedText(text);
    }
    setViewMode('TEXT');
    speakText(text, () => {
      if (pageNumber < numPages) setPageNumber(p => p + 1);
      else { setIsAutoPlay(false); alert("Book Finished"); }
    });
  };

  const speakText = (text, onComplete) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const hindi = voices.find(v => v.lang.includes('hi'));
    if (hindi) u.voice = hindi;
    u.onend = () => { if (onComplete && isAutoPlayRef.current) onComplete(); };
    window.speechSynthesis.speak(u);
  };

  const loadContent = async () => {
    if (viewMode === 'TEXT') {
      setLoading(true);
      const t = await getTranslation(pageNumber);
      setTranslatedText(t);
      setLoading(false);
    }
    if (isAutoPlay) runAutoSequence();
    // Prefetch next
    if (pageNumber < numPages) getTranslation(pageNumber + 1); 
  };

  useEffect(() => {
    if (pdfObject) loadContent();
  }, [pageNumber, viewMode, pdfObject, isAutoPlay]);

  return (
    <div className="reader-container">
      {/* 1. DARK TOOLBAR */}
      <div className="toolbar">
        <div style={{display:'flex', gap:'10px'}}>
           <button className="btn-browse" onClick={() => window.location.reload()}>Back</button>
           <button className="btn-browse" disabled={pageNumber<=1} onClick={() => { setIsAutoPlay(false); setPageNumber(p=>p-1)}}>Prev</button>
           <span style={{color:'white', alignSelf:'center', margin:'0 10px'}}>Pg {pageNumber}</span>
           <button className="btn-browse" disabled={pageNumber>=numPages} onClick={() => { setIsAutoPlay(false); setPageNumber(p=>p+1)}}>Next</button>
        </div>
        
        <div style={{display:'flex', gap:'10px'}}>
           <button onClick={() => setViewMode(viewMode==='PDF'?'TEXT':'PDF')} className="btn-browse" style={{background: viewMode==='TEXT' ? '#bb86fc' : '#333'}}>
             {viewMode==='PDF' ? 'Translate' : 'View PDF'}
           </button>
           <button onClick={() => setIsAutoPlay(!isAutoPlay)} className="btn-browse" style={{background: isAutoPlay ? '#cf6679' : '#03dac6', color: 'black', fontWeight:'bold'}}>
             {isAutoPlay ? 'Stop Audio' : 'Auto Play'}
           </button>
        </div>
      </div>

      {/* 2. CENTERED CONTENT */}
      <div className="document-wrapper">
        {viewMode === 'PDF' ? (
           <Document file={file} onLoadSuccess={onDocumentLoadSuccess} loading={<div style={{color:'white'}}>Loading PDF...</div>}>
             <Page pageNumber={pageNumber} width={pdfWidth} renderTextLayer={false} renderAnnotationLayer={false} />
           </Document>
        ) : (
           <div className="text-reader fade-in">
              <h3 style={{color: '#bb86fc', marginTop:0}}>Hindi Translation</h3>
              {loading ? <p>Translating...</p> : translatedText.split('\n').map((p,i)=><p key={i}>{p}</p>)}
           </div>
        )}
      </div>
    </div>
  );
};

export default PdfReader;