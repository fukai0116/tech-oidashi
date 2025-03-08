import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand">
          デジタル色紙
        </Link>
        <div className="navbar-links">
          <Link to="/create" className="navbar-link">
            新しい色紙を作る
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;