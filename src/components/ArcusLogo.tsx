import React from 'react';

export default function ArcusLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path d="M100 20L40 140H75L100 85L125 140H160L100 20Z" fill="#E31E24"/>
        <path d="M70 150L100 120L130 150L100 185L70 150Z" fill="#E31E24"/>
        <path d="M50 125L165 55M165 55L145 55M165 55L155 75" stroke="#E31E24" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}
