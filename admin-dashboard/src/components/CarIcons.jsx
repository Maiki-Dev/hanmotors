import React from 'react';

const CarBase = () => (
  <g>
    {/* Shadow */}
    <rect x="12" y="4" width="26" height="44" rx="8" fill="#000" fillOpacity="0.2" transform="translate(2, 2)" />

    {/* Wheels (Black rectangles peeking out) */}
    <rect x="10" y="8" width="4" height="8" rx="1" fill="#111" />
    <rect x="36" y="8" width="4" height="8" rx="1" fill="#111" />
    <rect x="10" y="34" width="4" height="8" rx="1" fill="#111" />
    <rect x="36" y="34" width="4" height="8" rx="1" fill="#111" />

    {/* Main Body (Yellow Sedan) */}
    <path
      d="M14,10 C14,6 18,4 25,4 C32,4 36,6 36,10 L36,40 C36,44 32,46 25,46 C18,46 14,44 14,40 Z"
      fill="#FFD400"
      stroke="#E6B800"
      strokeWidth="1"
    />

    {/* Windshield (Front) */}
    <path
      d="M15,14 L35,14 L34,22 L16,22 Z"
      fill="#222"
    />

    {/* Roof (Yellow) */}
    <rect x="15" y="22" width="20" height="14" fill="#FFEA00" />

    {/* Rear Window */}
    <path
      d="M16,36 L34,36 L35,39 L15,39 Z"
      fill="#222"
    />

    {/* Headlights (Front) */}
    <path d="M15,5 Q15,7 18,7 L20,7 Q20,5 18,5 Z" fill="#FFF" />
    <path d="M35,5 Q35,7 32,7 L30,7 Q30,5 32,5 Z" fill="#FFF" />

    {/* Taillights (Rear) */}
    <rect x="15" y="44" width="6" height="2" rx="1" fill="#D32F2F" />
    <rect x="29" y="44" width="6" height="2" rx="1" fill="#D32F2F" />
    
    {/* Side Mirrors */}
    <path d="M14,14 L12,12 L12,16 Z" fill="#FFD400" />
    <path d="M36,14 L38,12 L38,16 Z" fill="#FFD400" />
  </g>
);

export const CarIdle = ({ width = 50, height = 50, style }) => (
  <svg width={width} height={height} viewBox="0 0 50 50" style={style} xmlns="http://www.w3.org/2000/svg">
    <CarBase />
  </svg>
);

export const CarMoving = ({ width = 50, height = 50, style }) => (
  <svg width={width} height={height} viewBox="0 0 50 50" style={style} xmlns="http://www.w3.org/2000/svg">
    {/* Speed Lines */}
    <path d="M12,48 L8,50" stroke="#AAA" strokeWidth="1" strokeLinecap="round" />
    <path d="M38,48 L42,50" stroke="#AAA" strokeWidth="1" strokeLinecap="round" />
    <path d="M25,48 L25,52" stroke="#AAA" strokeWidth="1" strokeLinecap="round" />
    
    <g transform="translate(0, -1)">
       <CarBase />
    </g>
  </svg>
);

export const CarSelected = ({ width = 60, height = 60, style }) => (
  <svg width={width} height={height} viewBox="0 0 60 60" style={style} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="glow" cx="30" cy="30" r="28" fx="30" fy="30" gradientUnits="userSpaceOnUse">
        <stop offset="0.5" stopColor="#FFD400" stopOpacity="0.3" />
        <stop offset="1" stopColor="#FFD400" stopOpacity="0" />
      </radialGradient>
    </defs>
    
    <circle cx="30" cy="30" r="28" fill="url(#glow)" />
    
    <g transform="translate(5, 5)">
      <CarBase />
    </g>
  </svg>
);
