import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Board.css';

function Board() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [newMessage, setNewMessage] = useState({
    author: '',
    content: '',
    position: { x: 0, y: 0 },
    color: '#000000'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const boardRef = useRef(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [boardSize, setBoardSize] = useState('normal'); // 'normal', 'large', 'xlarge'
  const [messageOverlaps, setMessageOverlaps] = useState(new Set());

  const fetchBoard = useCallback(async () => {
    if (!id) {
      navigate('/', { replace: true });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/messageboards/${id}`);
      if (!response.data) {
        throw new Error('Board not found');
      }
      setBoard(response.data);
    } catch (err) {
      console.error('Error fetching board:', err);
      if (err.response?.status === 404 || err.message === 'Board not found') {
        setError('指定された色紙が見つかりませんでした。');
        // 3秒後にホームに戻る
        setTimeout(() => navigate('/', { replace: true }), 3000);
      } else {
        setError('色紙の読み込みに失敗しました。再度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const handleMessageSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      // 自動的にポジションを計算
      const position = calculateNonOverlappingPosition(board.messages || []);
      
      const messageToSubmit = {
        ...newMessage,
        position
      };
      
      await axios.post(`/api/messageboards/${id}/messages`, messageToSubmit);
      await fetchBoard();
      
      setNewMessage({
        author: '',
        content: '',
        position: { x: 0, y: 0 },
        color: '#000000'
      });
    } catch (err) {
      console.error('Error adding message:', err);
      setError('メッセージの追加に失敗しました。再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  // メッセージが重ならないようにポジションを計算する関数
  const calculateNonOverlappingPosition = (existingMessages) => {
    const messageCount = existingMessages.length;
    const MAX_ATTEMPTS = 50;
    const MIN_DISTANCE = window.innerWidth <= 480 ? 15 : 20;
    
    // ボードサイズに応じて配置範囲を調整
    let maxRadius;
    switch (boardSize) {
      case 'large':
        maxRadius = 60;
        break;
      case 'xlarge':
        maxRadius = 70;
        break;
      default:
        maxRadius = 45;
    }
    
    // 基本半径を計算
    let baseRadius;
    if (messageCount < 5) {
      baseRadius = maxRadius * 0.4;
    } else if (messageCount < 10) {
      baseRadius = maxRadius * 0.6;
    } else {
      baseRadius = maxRadius * 0.8;
    }

    // スパイラル配置のパラメータ
    let angle = Math.random() * 360;
    let radius = baseRadius;
    
    for (let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
      // スパイラルパターンで位置を計算
      const radians = angle * (Math.PI / 180);
      const spiralGrowth = attempts * 0.2;
      radius = baseRadius + spiralGrowth;
      
      const x = 50 + radius * Math.cos(radians);
      const y = 50 + radius * Math.sin(radians);
      
      // 範囲内に収める
      const adjustedX = Math.max(10, Math.min(90, x));
      const adjustedY = Math.max(10, Math.min(90, y));
      
      const position = { x: adjustedX, y: adjustedY };
      
      // 中央との重なりをチェック
      if (isOverlappingWithCenter(position)) {
        angle += 30;
        continue;
      }
      
      // 他のメッセージとの重なりをチェック
      if (!isOverlappingWithExistingMessages(position, existingMessages, MIN_DISTANCE)) {
        return position;
      }
      
      angle += 30;
    }
    
    // 最後の手段として、やや重なっても配置
    return {
      x: Math.max(10, Math.min(90, 50 + baseRadius * Math.cos(angle * (Math.PI / 180)))),
      y: Math.max(10, Math.min(90, 50 + baseRadius * Math.sin(angle * (Math.PI / 180))))
    };
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

  // 中央との重なりをチェックする関数
  const isOverlappingWithCenter = (position) => {
    const centerX = 50;
    const centerY = 50;
    const safeDistance = window.innerWidth <= 480 ? 15 : 25; // スマホでは距離を短く

    const dx = position.x - centerX;
    const dy = position.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < safeDistance;
  };

  const handleMessageClick = (message, event) => {
    event.stopPropagation(); // イベントの伝播を停止
    setSelectedMessage(message);
    setShowDeleteModal(true);
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage || deleting) return;

    try {
      setDeleting(true);
      await axios.delete(`/api/messageboards/${id}/messages/${selectedMessage.id}`);
      await fetchBoard(); // 色紙を再読み込み
      setShowDeleteModal(false);
      setSelectedMessage(null);
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('メッセージの削除に失敗しました。');
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setShowDeleteModal(false);
    setSelectedMessage(null);
  };

  // クリック以外の場所をタップした時にモーダルを閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDeleteModal && !event.target.closest('.delete-modal')) {
        handleCloseModal();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDeleteModal]);

  // ボードサイズの設定
  const getBoardSizeStyle = () => {
    switch (boardSize) {
      case 'large':
        return { minHeight: '1000px' };
      case 'xlarge':
        return { minHeight: '1200px' };
      default:
        return { minHeight: '800px' };
    }
  };

  if (loading) return <div className="loading">読み込み中...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!board) return <div className="not-found">色紙が見つかりません。</div>;

  return (
    <div className="board-container">
      <h1>{board.title}</h1>
      
      <div className="board-size-controls">
        <button 
          className="board-size-button"
          onClick={() => setBoardSize('normal')}
          disabled={boardSize === 'normal'}
        >
          通常サイズ
        </button>
        <button 
          className="board-size-button"
          onClick={() => setBoardSize('large')}
          disabled={boardSize === 'large'}
        >
          大きめ
        </button>
        <button 
          className="board-size-button"
          onClick={() => setBoardSize('xlarge')}
          disabled={boardSize === 'xlarge'}
        >
          特大
        </button>
      </div>
      
      <div 
        ref={boardRef}
        className="message-board"
        style={{ 
          ...getBoardSizeStyle(),
          backgroundColor: board.backgroundColor 
        }}
      >
        <div className="recipient-center">
          <span>{board.recipient}</span>
        </div>
        
        {board.messages && board.messages.map((message, index) => (
          <div
            key={message.id || index}
            className={`message ${messageOverlaps.has(message.id) ? 'overlapping-center' : ''}`}
            style={{
              left: `${message.position.x}%`,
              top: `${message.position.y}%`,
              color: message.color,
              cursor: 'pointer'
            }}
            onClick={(e) => handleMessageClick(message, e)}
          >
            <div className="message-bubble">
              <p className="message-content">{message.content}</p>
              <p className="message-author">- {message.author}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 削除確認モーダル */}
      {showDeleteModal && selectedMessage && (
        <div className="delete-modal">
          <div className="delete-modal-content">
            <h3>メッセージを削除</h3>
            <p>このメッセージを削除してもよろしいですか？</p>
            <div className="delete-modal-buttons">
              <button 
                onClick={handleDeleteMessage} 
                disabled={deleting}
                className="btn-delete"
              >
                {deleting ? '削除中...' : '削除'}
              </button>
              <button onClick={handleCloseModal} className="btn-cancel">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleMessageSubmit} className="message-form">
        <div className="form-group">
          <label htmlFor="author">お名前</label>
          <input
            type="text"
            id="author"
            value={newMessage.author}
            onChange={(e) => setNewMessage(prev => ({ ...prev, author: e.target.value }))}
            required
            disabled={submitting}
          />
        </div>
        <div className="form-group">
          <label htmlFor="content">メッセージ</label>
          <textarea
            id="content"
            value={newMessage.content}
            onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
            required
            disabled={submitting}
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
            disabled={submitting}
          />
        </div>
        
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? '送信中...' : 'メッセージを追加'}
        </button>
      </form>
    </div>
  );
}

export default Board;