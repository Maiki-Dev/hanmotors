import React from 'react';
import Svg, { Path, Circle, Defs, RadialGradient, LinearGradient, Stop, G, Rect, Ellipse } from 'react-native-svg';

const CarBase = () => (
  <G>
    {/* Shadow */}
    <Ellipse cx="25" cy="25" rx="18" ry="10" fill="#000" fillOpacity="0.3" />

    {/* Car Body - Main Chassis */}
    <Path
      d="M12,25 C12,15 18,10 25,10 C32,10 38,15 38,25 C38,35 32,40 25,40 C18,40 12,35 12,25 Z"
      fill="#FFD400"
      stroke="#E6B800"
      strokeWidth="1"
    />

    {/* Hood/Roof styling for 3D effect */}
    <Path
      d="M15,25 C15,18 19,13 25,13 C31,13 35,18 35,25 C35,32 31,37 25,37 C19,37 15,32 15,25 Z"
      fill="#FFEA00" 
      fillOpacity="0.5"
    />

    {/* Windshield (Front) */}
    <Path
      d="M16,22 C16,22 18,18 25,18 C32,18 34,22 34,22 L34,24 L16,24 Z"
      fill="#1A1A1A"
    />

    {/* Rear Window */}
    <Path
      d="M17,28 C17,28 19,32 25,32 C31,32 33,28 33,28 L33,27 L17,27 Z"
      fill="#1A1A1A"
    />

    {/* Headlights */}
    <Path d="M14,19 Q12,21 14,23" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
    <Path d="M36,19 Q38,21 36,23" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />

    {/* Taillights */}
    <Path d="M15,35 Q13,37 15,39" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" />
    <Path d="M35,35 Q37,37 35,39" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" />
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
    <Path d="M10,42 L5,45" stroke="#CCC" strokeWidth="1" strokeOpacity="0.6" strokeLinecap="round" />
    <Path d="M40,42 L45,45" stroke="#CCC" strokeWidth="1" strokeOpacity="0.6" strokeLinecap="round" />
    <Path d="M25,44 L25,48" stroke="#CCC" strokeWidth="1" strokeOpacity="0.6" strokeLinecap="round" />
    
    {/* Slight forward tilt simulated by shifting body up/forward relative to shadow */}
    <G transform="translate(0, -2)">
       <CarBase />
    </G>
  </Svg>
);

export const CarSelected = ({ width = 60, height = 60 }) => (
  <Svg width={width} height={height} viewBox="0 0 60 60">
    <Defs>
      <RadialGradient id="glow" cx="30" cy="30" rx="25" ry="25" fx="30" fy="30" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#FFD400" stopOpacity="0.4" />
        <Stop offset="1" stopColor="#FFD400" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    
    {/* Glow Halo */}
    <Circle cx="30" cy="30" r="25" fill="url(#glow)" />
    
    {/* Centered Car (Offset to center in 60x60) */}
    <G transform="translate(5, 5)">
      <CarBase />
    </G>
  </Svg>
);
