'use client';

import React from 'react';

export function LockIcon({ className = 'w-8 h-8 text-gray-700' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 11V8a5 5 0 0110 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function FoodIcon({ className = 'w-8 h-8 text-gray-700' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M4 6h16v2a4 4 0 01-4 4H8a4 4 0 01-4-4V6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 12v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
