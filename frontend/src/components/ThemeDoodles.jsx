import React from 'react';

const doodleStyle = {
  position: 'absolute',
  opacity: 0.35, // Brighter
  cursor: 'pointer',
  stroke: '#f5a623',
  fill: 'none',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  transform: 'translate(calc(var(--mouse-x, 0) * 40px), calc(var(--mouse-y, 0) * 40px))',
  transition: 'transform 0.1s ease-out',
  animation: 'floatDoodle 12s ease-in-out infinite',
};

export const DoodleAtom = ({ style }) => (
  <svg width="130" height="130" viewBox="0 0 100 100" style={{ ...doodleStyle, ...style }} className="doodle-draw">
    <ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(30 50 50)" />
    <ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(90 50 50)" />
    <ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(150 50 50)" />
    <circle cx="50" cy="50" r="5" fill="#f5a623" fillOpacity="0.4" />
  </svg>
);

export const DoodleMonitor = ({ style }) => (
  <svg width="120" height="120" viewBox="0 0 100 100" style={{ ...doodleStyle, ...style }} className="doodle-draw">
    <rect x="15" y="20" width="70" height="45" rx="4" />
    <path d="M 25 65 L 25 80" />
    <path d="M 75 65 L 75 80" />
    <path d="M 15 80 L 85 80" />
    <path d="M 40 40 L 45 45 L 40 50" />
    <path d="M 50 50 L 60 50" />
  </svg>
);

export const DoodleGlobe = ({ style }) => (
  <svg width="120" height="120" viewBox="0 0 100 100" style={{ ...doodleStyle, ...style }} className="doodle-draw">
    <circle cx="50" cy="50" r="40" />
    <ellipse cx="50" cy="50" rx="20" ry="40" />
    <ellipse cx="50" cy="50" rx="40" ry="10" />
    <path d="M 50 10 L 50 90" />
  </svg>
);

export const DoodleBook = ({ style }) => (
  <svg width="110" height="110" viewBox="0 0 100 100" style={{ ...doodleStyle, ...style }} className="doodle-draw">
    <path d="M 50 80 Q 25 90 10 80 L 10 20 Q 25 30 50 20 Q 75 30 90 20 L 90 80 Q 75 90 50 80 Z" />
    <path d="M 50 20 L 50 80" />
    <path d="M 20 40 L 40 40" />
    <path d="M 20 55 L 40 55" />
    <path d="M 60 40 L 80 40" />
    <path d="M 60 55 L 80 55" />
  </svg>
);

export const DoodleController = ({ style }) => (
  <svg width="120" height="120" viewBox="0 0 100 100" style={{ ...doodleStyle, ...style }} className="doodle-draw">
    <path d="M 20 30 Q 5 30 5 50 Q 5 70 20 70 L 40 70 Q 50 85 60 70 L 80 70 Q 95 70 95 50 Q 95 30 80 30 Z" />
    <circle cx="25" cy="50" r="8" />
    <path d="M 25 42 L 25 58 M 17 50 L 33 50" />
    <circle cx="70" cy="45" r="4" />
    <circle cx="80" cy="55" r="4" />
  </svg>
);

export const DoodlePalette = ({ style }) => (
  <svg width="115" height="115" viewBox="0 0 100 100" style={{ ...doodleStyle, ...style }} className="doodle-draw">
    <path d="M 20 80 Q 5 60 20 30 Q 40 10 70 20 Q 90 40 80 70 Q 60 90 30 85 Z" />
    <circle cx="65" cy="70" r="8" />
    <circle cx="35" cy="40" r="4" />
    <circle cx="50" cy="30" r="5" />
    <circle cx="70" cy="45" r="6" />
  </svg>
);
