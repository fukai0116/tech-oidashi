import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CreateBoard from './pages/CreateBoard';
import Board from './pages/Board';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateBoard />} />
            <Route path="/board/:id" element={<Board />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;