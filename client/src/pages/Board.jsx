import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './Board.css';

function Board() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [newMessage, setNewMessage] = useState({
    author: '',
    content: '',
    position: { x: 0, y: 0 },
    color: '#000000'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const boardRef = useRef(null);

  useEffect(() => {
    fetchBoard();
  }, [id]);

  const fetchBoard = async () => {
    try {
      const response = await axios.get(`/api/messageboards/${id}`);
      setBoard(response.data);
      setError(null);
    } catch (err) {
      setError('色紙の読み込みに失敗しました。');
      console.error('Error fetching board:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageSubmit = async (e) => {
    e.preventDefault();
    try {
      // 自動的にポジションを計算
      const position = calculateNonOverlappingPosition(board.messages);
      
      const messageToSubmit = {
        ...newMessage,
        position
      };
      
      await axios.post(`/api/messageboards/${id}/messages`, messageToSubmit);
      fetchBoard();
      setNewMessage({
        author: '',
        content: '',
        position: { x: 0, y: 0 },
        color: '#000000'
      });
    } catch (err) {
      setError('メッセージの追加に失敗しました。');
      console.error('Error adding message:', err);
    }
  };

  // メッセージが重ならないようにポジションを計算する関数
  const calculateNonOverlappingPosition = (existingMessages) => {
    const messageCount = existingMessages.length;
    const MAX_ATTEMPTS = 30; // 最大試行回数を増やす
    
    // 安全マージン（メッセージ間の最小距離）
    const MIN_DISTANCE = 20; // 最小距離を大きくする
    
    // 基本的な配置パターン（円形）
    // 中心からの距離をメッセージ数に応じて調整
    // 最初の数個は内側に、数が増えたら外側に配置
    let baseRadius;
    if (messageCount < 5) {
      baseRadius = 25 + Math.random() * 10; // 最初の数個は内側に
    } else if (messageCount < 10) {
      baseRadius = 35 + Math.random() * 10; // 次の数個は中間に
    } else {
      baseRadius = 45 + Math.random() * 15; // それ以降は外側に
    }
    
    let angle = Math.random() * 360; // 完全にランダムな角度から開始
    
    // 最初の試行で標準的な円形配置を試す
    let x = 50 + baseRadius * Math.cos(angle * (Math.PI / 180));
    let y = 50 + baseRadius * Math.sin(angle * (Math.PI / 180));
    
    // すでに存在するメッセージとの衝突チェック
    let attempts = 0;
    while (isOverlappingWithExistingMessages({ x, y }, existingMessages, MIN_DISTANCE) && attempts < MAX_ATTEMPTS) {
      // 別の位置を試す
      angle = Math.random() * 360;
      const jitter = Math.random() * 5 - 2.5; // -2.5から2.5のジッター
      const radius = baseRadius + jitter;
      x = 50 + radius * Math.cos(angle * (Math.PI / 180));
      y = 50 + radius * Math.sin(angle * (Math.PI / 180));
      attempts++;
      
      // もし最大試行回数に近づいたら、より広い範囲を試す
      if (attempts > MAX_ATTEMPTS * 0.7) {
        const farRadius = 45 + Math.random() * 30; // かなり広い範囲
        x = 50 + farRadius * Math.cos(angle * (Math.PI / 180));
        y = 50 + farRadius * Math.sin(angle * (Math.PI / 180));
      }
    }
    
    // 位置が範囲内に収まるように調整（5%-95%の範囲に制限）
    x = Math.max(5, Math.min(95, x));
    y = Math.max(5, Math.min(95, y));
    
    return { x, y };
  };

  // 位置が既存のメッセージと重なるかチェックする関数
  const isOverlappingWithExistingMessages = (position, existingMessages, minDistance) => {
    for (const message of existingMessages) {
      const dx = message.position.x - position.x;
      const dy = message.position.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        return true; // 重なっている
      }
    }
    return false; // 重なっていない
  };

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!board) return <div>色紙が見つかりません。</div>;

  return (
    <div className="board-container">
      <h1>{board.title}</h1>
      
      <div 
        ref={boardRef}
        className="message-board"
        style={{ backgroundColor: board.backgroundColor }}
      >
        {/* 中央の宛先名 */}
        <div className="recipient-center">
          <span>{board.recipient}</span>
        </div>
        
        {/* 周りのメッセージ */}
        {board.messages && board.messages.map((message, index) => (
          <div
            key={message.id || index}
            className="message"
            style={{
              left: `${message.position.x}%`,
              top: `${message.position.y}%`,
              color: message.color
            }}
          >
            <div className="message-bubble">
              <p className="message-content">{message.content}</p>
              <p className="message-author">- {message.author}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleMessageSubmit} className="message-form">
        <div className="form-group">
          <label htmlFor="author">お名前</label>
          <input
            type="text"
            id="author"
            value={newMessage.author}
            onChange={(e) => setNewMessage(prev => ({ ...prev, author: e.target.value }))}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="content">メッセージ</label>
          <textarea
            id="content"
            value={newMessage.content}
            onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
            required
            placeholder="卒業生へのメッセージを書いてください"
          />
        </div>
        <div className="form-group">
          <label htmlFor="color">文字色</label>
          <input
            type="color"
            id="color"
            value={newMessage.color}
            onChange={(e) => setNewMessage(prev => ({ ...prev, color: e.target.value }))}
          />
        </div>
        
        <button type="submit" className="btn-primary">
          メッセージを追加
        </button>
      </form>
    </div>
  );
}

export default Board;