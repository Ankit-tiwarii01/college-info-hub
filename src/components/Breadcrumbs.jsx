import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = ({ items = [] }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-4 overflow-x-auto py-1">
      <Link to="/" className="flex items-center text-slate-400 hover:text-amber-600 transition">
        <Home size={14} className="mr-1" />
        <span>Home</span>
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            <ChevronRight size={12} className="text-slate-300 shrink-0" />
            {item.path && !isLast ? (
              <Link to={item.path} className="text-slate-500 hover:text-amber-600 transition truncate">
                {item.label}
              </Link>
            ) : (
              <span className={`truncate ${isLast ? 'text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-100' : 'text-slate-600'}`}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
