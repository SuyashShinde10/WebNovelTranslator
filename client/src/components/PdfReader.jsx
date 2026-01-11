import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// --- FIX: REMOVED '/esm/' FROM THESE IMPORTS ---
// Correct paths for react-pdf v7/v8/v9
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF Worker (Crash Fix)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PdfReader = ({ pdfUrl, bookId }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [inputPage, setInputPage] = useState('');
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Storage Keys (unique per book)
  const STORAGE_KEY_LAST_READ = `book_${bookId}_lastRead`;
  const STORAGE_KEY_BOOKMARKS = `book_${bookId}_bookmarks`;

  // --- 1. LOAD SAVED DATA (RESUME & BOOKMARKS) ---
  useEffect(() => {
    // Only try to load if we have a valid bookId (filename)
    if (!bookId) return;

    const savedPage = localStorage.getItem(STORAGE_KEY_LAST_READ);
    const savedBookmarks = localStorage.getItem(STORAGE_KEY_BOOKMARKS);

    if (savedPage) {
      setPageNumber(parseInt(savedPage, 10));
    }
    if (savedBookmarks) {
      setBookmarks(JSON.parse(savedBookmarks));
    }
  }, [bookId]);

  // --- 2. AUTO-SAVE PROGRESS ---
  useEffect(() => {
    if (pageNumber > 0 && bookId) {
      localStorage.setItem(STORAGE_KEY_LAST_READ, pageNumber);
    }
  }, [pageNumber, STORAGE_KEY_LAST_READ, bookId]);

  // --- HANDLERS ---
  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setLoading(false);
  }

  const changePage = (offset) => {
    setPageNumber((prevPageNumber) => Math.min(Math.max(1, prevPageNumber + offset), numPages));
  };

  const handleGoToPage = (e) => {
    e.preventDefault();
    const targetPage = parseInt(inputPage, 10);
    if (targetPage >= 1 && targetPage <= numPages) {
      setPageNumber(targetPage);
      setInputPage('');
    } else {
      alert(`Please enter a valid page number between 1 and ${numPages}`);
    }
  };

  const toggleBookmark = () => {
    let newBookmarks;
    if (bookmarks.includes(pageNumber)) {
      newBookmarks = bookmarks.filter((b) => b !== pageNumber);
    } else {
      newBookmarks = [...bookmarks, pageNumber].sort((a, b) => a - b);
    }
    setBookmarks(newBookmarks);
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(newBookmarks));
  };

  return (
    <div className="pdf-reader-container" style={{ maxWidth: '900px', margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
      
      {/* --- CONTROL BAR --- */}
      <div style={styles.controlBar}>
        <div style={styles.navGroup}>
          <button style={styles.button} disabled={pageNumber <= 1} onClick={() => changePage(-1)}>
            Previous
          </button>
          
          <span style={styles.pageInfo}>
            Page <strong>{pageNumber}</strong> of {numPages || '--'}
          </span>
          
          <button style={styles.button} disabled={pageNumber >= numPages} onClick={() => changePage(1)}>
            Next
          </button>
        </div>

        <form onSubmit={handleGoToPage} style={styles.searchGroup}>
          <input 
            type="number" 
            placeholder="Go to..." 
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            style={styles.input}
          />
          <button type="submit" style={styles.goButton}>Go</button>
        </form>

        <button 
          onClick={toggleBookmark}
          style={{ 
            ...styles.button, 
            backgroundColor: bookmarks.includes(pageNumber) ? '#FFD700' : '#e0e0e0',
            color: bookmarks.includes(pageNumber) ? '#000' : '#333'
          }}
        >
          {bookmarks.includes(pageNumber) ? '★ Saved' : '☆ Bookmark'}
        </button>
      </div>

      {/* --- BOOKMARK LIST --- */}
      {bookmarks.length > 0 && (
        <div style={styles.bookmarkList}>
          <strong>Bookmarks: </strong>
          {bookmarks.map((bm) => (
            <span key={bm} onClick={() => setPageNumber(bm)} style={styles.bookmarkItem}>
              {bm}
            </span>
          ))}
        </div>
      )}

      {/* --- PDF DISPLAY --- */}
      <div style={styles.documentWrapper}>
        {loading && <p>Loading PDF...</p>}
        
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error) => console.error("Error loading PDF:", error)}
          loading="Loading content..."
        >
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer={true} 
            renderAnnotationLayer={true}
            width={Math.min(window.innerWidth * 0.9, 800)} 
          />
        </Document>
      </div>
    </div>
  );
};

// --- STYLES ---
const styles = {
  controlBar: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
    gap: '10px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px'
  },
  navGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  searchGroup: { display: 'flex', gap: '5px' },
  button: { padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', fontWeight: 'bold' },
  goButton: { padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white' },
  input: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '60px' },
  pageInfo: { minWidth: '100px', textAlign: 'center' },
  bookmarkList: { marginBottom: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '0.9rem' },
  bookmarkItem: { cursor: 'pointer', color: '#856404', textDecoration: 'underline', marginRight: '10px', fontWeight: 'bold' },
  documentWrapper: { display: 'flex', justifyContent: 'center', border: '1px solid #ddd', padding: '20px', backgroundColor: '#525659', borderRadius: '8px', minHeight: '500px' }
};

export default PdfReader;