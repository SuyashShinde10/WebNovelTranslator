import React, { useState, useEffect } from 'react';
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
  const [isSpeaking, setIsSpeaking] = useState(false); // New State for Audio

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

  // Stop audio when component unmounts
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
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

  // --- AUDIO FUNCTION ---
  const speakText = (text, langCode) => {
    // 1. Stop any current speech
    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    
    // 2. Try to find a matching voice (e.g., Hindi voice for 'hi')
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(v => v.lang.startsWith(langCode));
    if (targetVoice) utterance.voice = targetVoice;

    // 3. Configure speed/pitch
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;

    // 4. Handle End of Speech
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // --- ACTIONS ---

  const handleReadEnglish = async () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    const text = await extractTextFromPage(pageNumber);
    if (text.trim()) {
      speakText(text, 'en'); // Read in English
    } else {
      alert("No text found on this page to read.");
    }
  };

  const handleTranslate = async (langCode) => {
    stopSpeaking(); // Stop any audio first
    setLoading(true);
    try {
      const rawText = await extractTextFromPage(pageNumber);
      if (!rawText.trim()) {
        alert("This page appears to be an image. Cannot extract text!");
        setLoading(false);
        return;
      }

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
    stopSpeaking(); // Stop audio when turning page
    setPageNumber(prev => prev + offset);
    setViewMode('PDF'); 
    setTranslatedText('');
  };

  return (
    <div className="app-container fade-in">
      
      {/* --- TOOLBAR --- */}
      <div className="toolbar">
        <button className="btn btn-secondary" disabled={pageNumber <= 1} onClick={() => changePage(-1)}>←</button>
        <span className="page-info">Page {pageNumber} / {numPages || '--'}</span>
        <button className="btn btn-secondary" disabled={pageNumber >= numPages} onClick={() => changePage(1)}>→</button>

        {/* --- AUDIOBOOK BUTTON (ENGLISH) --- */}
        {viewMode === 'PDF' && (
           <button 
             onClick={handleReadEnglish} 
             className={`btn ${isSpeaking ? 'btn-primary' : 'btn-secondary'}`}
             style={{marginLeft: '10px'}}
           >
             {isSpeaking ? '⏹ Stop' : '🔊 Listen'}
           </button>
        )}
      </div>

      {/* --- TRANSLATION BUTTONS --- */}
      {viewMode === 'PDF' && (
        <div className="translate-actions" style={{justifyContent: 'center', marginBottom: '20px', gap: '10px', display: 'flex'}}>
          <button onClick={() => handleTranslate('hi')} disabled={loading} className="lang-btn">🇮🇳 Hindi</button>
          <button onClick={() => handleTranslate('es')} disabled={loading} className="lang-btn">🇪🇸 Spanish</button>
          <button onClick={() => handleTranslate('fr')} disabled={loading} className="lang-btn">🇫🇷 French</button>
        </div>
      )}

      {/* --- DOCUMENT AREA --- */}
      <div className="document-wrapper">
        {viewMode === 'PDF' && (
           <Document file={file} onLoadSuccess={onDocumentLoadSuccess} loading={<div>Loading novel...</div>}>
             <Page pageNumber={pageNumber} width={pdfWidth} renderTextLayer={true} className="pdf-page-shadow" />
           </Document>
        )}

        {/* --- TRANSLATED TEXT VIEW --- */}
        {viewMode === 'TEXT' && (
          <div className="text-reader fade-in">
             <div className="text-reader-header">
                <span>Translated Chapter</span>
                
                {/* --- AUDIO BUTTON (TRANSLATED) --- */}
                <button 
                  onClick={() => isSpeaking ? stopSpeaking() : speakText(translatedText, 'hi')} // Defaulting hint to Hindi logic, but it auto-detects largely
                  className="btn"
                  style={{marginRight: 'auto', marginLeft: '15px', padding: '5px 10px', fontSize: '0.9rem'}}
                >
                   {isSpeaking ? '⏹ Stop Audio' : '🔊 Read Aloud'}
                </button>

                <button onClick={() => { stopSpeaking(); setViewMode('PDF'); }} className="close-btn">× Close</button>
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