import React from 'react';
import { Link } from 'react-router-dom';
import { useLandingTheme } from '../hooks/useLandingTheme';
import '../landing/landingThemes.css';
import '../landing/landingFuturistic.css';
import '../landing/landingLight.css';
import '../landing/landingMaterial.css';

const NAV = [
  { to: '/blog', label: 'Blog' },
  { to: '/api-docs', label: 'API Docs' },
  { to: '/support', label: 'Soporte' },
];

export const ResourceLayout = ({ children, active }) => {
  const theme = useLandingTheme();
  return (
    <div className="min-h-screen bg-slate-950 lt-theme" data-landing-theme={theme} data-testid="resource-layout">
      <style>{`.lt-theme,.lt-theme *{transition:background-color .3s ease,color .3s ease,border-color .3s ease,box-shadow .3s ease;}`}</style>
      <nav className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-slate-800" data-testid="main-nav">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="resource-home-link">
            <span className="text-lg font-bold text-white">Lord<span className="text-[#CCFF00]">Training</span></span>
          </Link>
          <div className="flex items-center gap-1.5">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                data-testid={`resource-nav-${n.to.replace('/', '')}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${active === n.to ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {n.label}
              </Link>
            ))}
            <Link to="/" className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white">Inicio</Link>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-12">{children}</main>
      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} LordTraining
      </footer>
    </div>
  );
};

export default ResourceLayout;
