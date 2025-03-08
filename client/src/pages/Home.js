import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

function Home() {
  const [messageBoards, setMessageBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMessageBoards();
  }, []);

  const fetchMessageBoards = async () => {
    try {
      const response = await axios.get('/api/messageboards');
      setMessageBoards(response.data);
      setError(null);
    } catch (err) {
      setError('色紙の一覧の読み込みに失敗しました。');
      console.error('Error fetching message boards:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="home-container">
      <h1>デジタル色紙</h1>
      <div className="create-board-link">
        <Link to="/create" className="btn-create">
          新しい色紙を作る
        </Link>
      </div>
      
      <div className="board-grid">
        {messageBoards.map(board => (
          <Link 
            to={`/board/${board.id}`} 
            key={board.id} 
            className="board-card"
            style={{ backgroundColor: board.backgroundColor }}
          >
            <h2>{board.title}</h2>
            <p>To: {board.recipient}</p>
            <p className="created-at">
              作成日: {new Date(board.createdAt).toLocaleDateString('ja-JP')}
            </p>
          </Link>
        ))}
      </div>
      
      {messageBoards.length === 0 && (
        <p className="no-boards">
          色紙がまだありません。新しい色紙を作成してみましょう！
        </p>
      )}
    </div>
  );
}

export default Home;