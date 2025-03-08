import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateBoard from './pages/CreateBoard';
import Board from './pages/Board';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateBoard />} />
          <Route path="/board/:id" element={<Board />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;