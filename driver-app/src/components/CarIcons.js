import React from 'react';
import Svg, { Path, Circle, Defs, RadialGradient, LinearGradient, Stop, G, Rect, Ellipse } from 'react-native-svg';

const CarBase = () => (
  <G>
    {/* Shadow */}
    <Rect x="12" y="4" width="26" height="44" rx="8" fill="#000" fillOpacity="0.2" transform="translate(2, 2)" />

    {/* Wheels (Black rectangles peeking out) */}
    <Rect x="10" y="8" width="4" height="8" rx="1" fill="#111" />
    <Rect x="36" y="8" width="4" height="8" rx="1" fill="#111" />
    <Rect x="10" y="34" width="4" height="8" rx="1" fill="#111" />
    <Rect x="36" y="34" width="4" height="8" rx="1" fill="#111" />

    {/* Main Body (Yellow Sedan) */}
    <Path
      d="M14,10 C14,6 18,4 25,4 C32,4 36,6 36,10 L36,40 C36,44 32,46 25,46 C18,46 14,44 14,40 Z"
      fill="#FFD400"
      stroke="#E6B800"
      strokeWidth="1"
    />

    {/* Windshield (Front) */}
    <Path
      d="M15,14 L35,14 L34,22 L16,22 Z"
      fill="#222"
    />

    {/* Roof (Yellow) */}
    <Rect x="15" y="22" width="20" height="14" fill="#FFEA00" />

    {/* Rear Window */}
    <Path
      d="M16,36 L34,36 L35,39 L15,39 Z"
      fill="#222"
    />

    {/* Headlights (Front) */}
    <Path d="M15,5 Q15,7 18,7 L20,7 Q20,5 18,5 Z" fill="#FFF" />
    <Path d="M35,5 Q35,7 32,7 L30,7 Q30,5 32,5 Z" fill="#FFF" />

    {/* Taillights (Rear) */}
    <Rect x="15" y="44" width="6" height="2" rx="1" fill="#D32F2F" />
    <Rect x="29" y="44" width="6" height="2" rx="1" fill="#D32F2F" />
    
    {/* Side Mirrors */}
    <Path d="M14,14 L12,12 L12,16 Z" fill="#FFD400" />
    <Path d="M36,14 L38,12 L38,16 Z" fill="#FFD400" />
  </G>
);

export const CarIdle = ({ width = 50, height = 50 }) => (
  <Svg width={width} height={height} viewBox="0 0 50 50">
    <CarBase />
  </Svg>
);

export const CarMoving = ({ width = 50, height = 50 }) => (
  <Svg width={width} height={height} viewBox="0 0 50 50">
    {/* Speed Lines */}
    <Path d="M12,48 L8,50" stroke="#AAA" strokeWidth="1" strokeLinecap="round" />
    <Path d="M38,48 L42,50" stroke="#AAA" strokeWidth="1" strokeLinecap="round" />
    <Path d="M25,48 L25,52" stroke="#AAA" strokeWidth="1" strokeLinecap="round" />
    
    <G transform="translate(0, -1)">
       <CarBase />
    </G>
  </Svg>
);

export const CarSelected = ({ width = 60, height = 60 }) => (
  <Svg width={width} height={height} viewBox="0 0 60 60">
    <Defs>
      <RadialGradient id="glow" cx="30" cy="30" rx="28" ry="28" fx="30" fy="30" gradientUnits="userSpaceOnUse">
        <Stop offset="0.5" stopColor="#FFD400" stopOpacity="0.3" />
        <Stop offset="1" stopColor="#FFD400" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    
    <Circle cx="30" cy="30" r="28" fill="url(#glow)" />
    
    <G transform="translate(5, 5)">
      <CarBase />
    </G>
  </Svg>
);
