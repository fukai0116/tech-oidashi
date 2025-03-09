import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import axios from 'axios';

// Set axios defaults
const apiUrl = process.env.REACT_APP_API_URL || '';
axios.defaults.baseURL = apiUrl;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// リダイレクト時のパス復元
const savedPath = localStorage.getItem('lastPath');
if (savedPath) {
  localStorage.removeItem('lastPath');
  window.history.replaceState(null, '', savedPath);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);