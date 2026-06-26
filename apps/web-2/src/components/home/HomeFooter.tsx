import React from 'react';

export const HomeFooter: React.FC = () => {
  return (
    <footer className="relative w-full bg-black border-t border-white/[0.06] py-8 px-6 md:px-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-xs font-bold tracking-[0.2em] text-white/30 uppercase">
          aegis
        </span>
        <span className="text-xs text-white/20">
          © {new Date().getFullYear()} Aegis. All rights reserved.
        </span>
        <div className="flex items-center gap-5">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 hover:text-white/60 transition-colors">GitHub</a>
          <a href="#contact" className="text-xs text-white/30 hover:text-white/60 transition-colors">Contact</a>
          <a href="/about" className="text-xs text-white/30 hover:text-white/60 transition-colors">About</a>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
