import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './GifPanel.css';

function GifPanel({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchGifs = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError('Type a search term.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/gifs?q=${encodeURIComponent(trimmedQuery)}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || 'GIF search failed.');
        setResults([]);
        return;
      }

      const gifResults = Array.isArray(data.results) ? data.results : [];
      if (!gifResults.length) {
        setError('No GIFs found.');
      }
      setResults(gifResults);
    } catch (err) {
      setError('GIF search failed. Try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="gif-panel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="panel-title">Search GIFs</div>
      <div className="gif-search">
        <input
          type="text"
          placeholder="Search for a GIF..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchGifs()}
        />
        <motion.button
          type="button"
          onClick={searchGifs}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Search
        </motion.button>
      </div>
      {error && <div className="gif-error">{error}</div>}
      {loading && <div className="gif-loading">Searching...</div>}
      <div className="gif-results">
        {results.map((gif) => (
          <motion.button
            key={gif.id}
            type="button"
            className="gif-result"
            onClick={() => onSelect(gif.url)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img src={gif.preview || gif.url} alt="GIF" loading="lazy" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export default GifPanel;
