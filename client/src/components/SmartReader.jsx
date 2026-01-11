import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Play, Pause, Languages, BookOpen, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

// --- STYLE IMPORTS (Corrected for Vite/Vercel) ---
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// --- WORKER FIX ---
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const SmartReader = ({ pdfUrl, bookId }) => {
  // State: Navigation
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  
  // State: Content & Modes
  const [pageText, setPageText] = useState('');
  const [isReading, setIsReading] = useState(false); // Audio Mode
  const [viewMode, setViewMode] = useState('pdf');   // 'pdf' or 'text'
  const [showHindi, setShowHindi] = useState(false); // Translation Mode

  // Refs for Speech
  const synth = window.speechSynthesis;
  const utteranceRef = useRef(null);

  // --- 1. EXTRACT TEXT FROM PAGE (Crucial for Audio & Translate) ---
  const onPageLoadSuccess = async (page) => {
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item) => item.str).join(' ');
    setPageText(text);
    
    // If we were already listening, restart audio for new page
    if (isReading) {
      speakText(text);
    }
  };

  // --- 2. AUDIO HANDLER (Text-to-Speech) ---
  const speakText = (text) => {
    // Cancel previous
    synth.cancel();
    
    const textToRead = showHindi ? "Hindi translation feature requires API integration." : text;
    
    const u = new SpeechSynthesisUtterance(textToRead);
    u.rate = 1.0;
    u.pitch = 1.0;
    // Try to find a Hindi voice if translation is on, else English
    if (showHindi) {
        const hindiVoice = synth.getVoices().find(v => v.lang.includes('hi'));
        if (hindiVoice) u.voice = hindiVoice;
    }
    
    u.onend = () => setIsReading(false);
    
    utteranceRef.current = u;
    synth.speak(u);
    setIsReading(true);
  };

  const toggleAudio = () => {
    if (isReading) {
      synth.cancel();
      setIsReading(false);
    } else {
      speakText(pageText);
    }
  };

  // --- 3. TRANSLATION HANDLER (Mock Logic) ---
  // In a real app, you would send 'pageText' to Google/OpenAI API here
  const toggleTranslation = () => {
    setShowHindi(!showHindi);
    // Force switch to Text View because replacing text inside a PDF Canvas is impossible
    if (!showHindi) setViewMode('text'); 
  };

  // --- 4. NAVIGATION & STORAGE ---
  const changePage = (offset) => {
    const newPage = Math.min(Math.max(1, pageNumber + offset), numPages);
    setPageNumber(newPage);
    // Cancel audio on page turn
    synth.cancel();
    setIsReading(false);
  };

  useEffect(() => {
    // Restore Last Read Page
    const saved = localStorage.getItem(`book_${bookId}_lastRead`);
    if (saved) setPageNumber(parseInt(saved));
  }, [bookId]);

  useEffect(() => {
    // Save Progress
    if (bookId) localStorage.setItem(`book_${bookId}_lastRead`, pageNumber);
  }, [pageNumber, bookId]);

  return (
    <div className="smart-reader" style={styles.container}>
      
      {/* --- TOP BAR: CONTROLS --- */}
      <div style={styles.toolbar}>
        {/* Navigation */}
        <div style={styles.group}>
          <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} style={styles.btn}>
            <ChevronLeft size={20} />
          </button>
          <span style={{fontWeight: 'bold'}}>Pg {pageNumber}</span>
          <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} style={styles.btn}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Smart Features */}
        <div style={styles.group}>
          {/* Audio Toggle */}
          <button 
            onClick={toggleAudio} 
            style={{...styles.btn, backgroundColor: isReading ? '#ff4d4d' : '#2d3436'}}
            title="Read Aloud"
          >
            {isReading ? <Pause size={18} color="#fff"/> : <Play size={18} color="#fff"/>}
          </button>

          {/* View Mode Toggle (PDF vs Text) */}
          <button 
            onClick={() => setViewMode(viewMode === 'pdf' ? 'text' : 'pdf')} 
            style={{...styles.btn, backgroundColor: viewMode === 'text' ? '#0984e3' : '#2d3436'}}
            title="Reader Mode"
          >
            {viewMode === 'pdf' ? <BookOpen size={18} color="#fff"/> : <FileText size={18} color="#fff"/>}
          </button>

          {/* Translate Toggle */}
          <button 
            onClick={toggleTranslation} 
            style={{...styles.btn, backgroundColor: showHindi ? '#e17055' : '#2d3436'}}
            title="Translate to Hindi"
          >
            <Languages size={18} color="#fff"/> <span style={{fontSize:'12px', marginLeft:'5px'}}>HI</span>
          </button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div style={styles.contentArea}>
        
        {/* HIDDEN PDF (Always render to extract text, but hide if in Text Mode) */}
        <div style={{ display: viewMode === 'pdf' ? 'block' : 'none' }}>
           <Document
            file={pdfUrl}
            onLoadSuccess={({numPages}) => setNumPages(numPages)}
            loading={<div style={{color:'white'}}>Loading Novel...</div>}
          >
            <Page 
              pageNumber={pageNumber} 
              onLoadSuccess={onPageLoadSuccess} // Extracts text for audio
              width={Math.min(window.innerWidth * 0.95, 800)}
              renderTextLayer={true}
              renderAnnotationLayer={false}
            />
          </Document>
        </div>

        {/* TEXT / TRANSLATION MODE */}
        {viewMode === 'text' && (
          <div style={styles.textMode}>
            <h3>Page {pageNumber} {showHindi ? '(Hindi Translation)' : ''}</h3>
            <p style={{ lineHeight: '1.8', fontSize: '1.1rem' }}>
              {showHindi 
                ? "यहाँ पृष्ठ का हिंदी अनुवाद दिखाई देगा। (This is where the Hindi translation API response will appear based on the extracted text)." 
                : pageText || "Extracting text..."}
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

// Dark Mode Styles
const styles = {
  container: {
    maxWidth: '900px', margin: '0 auto', fontFamily: 'Segoe UI, sans-serif',
    backgroundColor: '#1e1e1e', minHeight: '100vh', color: '#fff'
  },
  toolbar: {
    display: 'flex', justifyContent: 'space-between', padding: '15px',
    backgroundColor: '#2d3436', position: 'sticky', top: 0, zIndex: 10,
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
  },
  group: { display: 'flex', gap: '10px', alignItems: 'center' },
  btn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer',
    backgroundColor: '#2d3436', color: 'white', transition: '0.2s'
  },
  contentArea: {
    padding: '20px', display: 'flex', justifyContent: 'center', minHeight: '600px'
  },
  textMode: {
    backgroundColor: '#2d3436', padding: '30px', borderRadius: '8px',
    maxWidth: '800px', width: '100%', whiteSpace: 'pre-wrap', textAlign: 'left'
  }
};

export default SmartReader;