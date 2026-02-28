// src/utils/index.js
import React from 'react';

/**
 * Generate a short random uppercase ID.
 * @param {string} prefix  e.g. 'QRY'
 * @returns {string}       e.g. 'QRY-A3F9C2D1'
 */
export const genId = (prefix = '') => {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return prefix ? `${prefix}-${rand}` : rand;
};

/**
 * Format an ISO timestamp to HH:MM:SS.
 * @param {string} iso
 * @returns {string}
 */
export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

/**
 * Format an ISO timestamp to "DD MMM YYYY".
 * @param {string} iso
 * @returns {string}
 */
export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

/**
 * Format milliseconds as seconds with 2 decimal places.
 * @param {number} ms
 * @returns {string}  e.g. "1.43s"
 */
export const fmtMs = (ms) => `${(ms / 1000).toFixed(2)}s`;

/**
 * Render text that contains **bold** markdown markers
 * into an array of React elements — no JSX so this file stays .js
 *
 * Usage:  <p>{renderMarkdownBold(text)}</p>
 *
 * @param {string} text
 * @returns {Array}
 */
export const renderMarkdownBold = (text = '') =>
  text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**')
      ? React.createElement(
          'strong',
          { key: i, style: { color: '#93C5FD', fontWeight: 600 } },
          part.slice(2, -2),
        )
      : part,
  );

/**
 * Clamp a number between min and max.
 */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Truncate a string with an ellipsis.
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
export const truncate = (str = '', max = 80) =>
  str.length > max ? `${str.slice(0, max)}…` : str;