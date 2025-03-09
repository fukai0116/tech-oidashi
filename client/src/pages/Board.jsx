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
  const [boardHeight, setBoardHeight] = useState(800);
  const [messageEdgeClasses, setMessageEdgeClasses] = useState({});
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

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
    
    // スマホの場合は距離を短くする
    const MIN_DISTANCE = windowWidth <= 480 ? 12 : 
                        windowWidth <= 768 ? 15 : 20;
    
    // メッセージ数と画面サイズに応じてエリアを調整
    const maxRadius = Math.min(90, 40 + messageCount * 2);
    
    // 基本的に中央から離す
    const minRadius = windowWidth <= 480 ? 18 : 25;
    
    // メッセージの位置をランダム化してみる
    for (let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
      // ランダムな角度と半径で位置を決定
      const angle = Math.random() * 360;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      
      const radians = angle * (Math.PI / 180);
      const x = 50 + radius * Math.cos(radians);
      const y = 50 + radius * Math.sin(radians);
      
      // 範囲内に収まるように調整
      const adjustedX = Math.max(10, Math.min(90, x));
      const adjustedY = Math.max(10, Math.min(90, y));
      
      const position = { x: adjustedX, y: adjustedY };
      
      // 中央と既存メッセージとの衝突チェック
      if (!isOverlappingWithCenter(position) && 
          !isOverlappingWithExistingMessages(position, existingMessages, MIN_DISTANCE)) {
        return position;
      }
    }
    
    // どうしても衝突する場合のフォールバック
    const angle = Math.random() * 360;
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    
    return {
      x: Math.max(10, Math.min(90, 50 + radius * Math.cos(angle * (Math.PI / 180)))),
      y: Math.max(10, Math.min(90, 50 + radius * Math.sin(angle * (Math.PI / 180))))
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
    // スマホでは中央の安全エリアを小さく
    const safeDistance = windowWidth <= 480 ? 15 : 
                         windowWidth <= 768 ? 20 : 25;
    
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

  // ウィンドウサイズの変更を検知
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // メッセージ数に基づいて自動的に色紙のサイズを調整
  useEffect(() => {
    if (board && board.messages) {
      const messageCount = board.messages.length;
      let newHeight;
      
      if (messageCount <= 5) {
        newHeight = 800; // 基本サイズ
      } else if (messageCount <= 10) {
        newHeight = 900; // 少し大きく
      } else if (messageCount <= 15) {
        newHeight = 1000; // さらに大きく
      } else if (messageCount <= 20) {
        newHeight = 1100; // もっと大きく
      } else {
        // 20個以上のメッセージがある場合はさらに大きく
        newHeight = 1200 + Math.floor((messageCount - 20) / 5) * 100;
      }
      
      // スマホの場合は高さを調整
      if (windowWidth <= 480) {
        newHeight = Math.max(500, newHeight * 0.7);
      } else if (windowWidth <= 768) {
        newHeight = Math.max(600, newHeight * 0.8);
      }
      
      setBoardHeight(newHeight);
      
      // メッセージの位置を評価して、はみ出しを防ぐ
      const newEdgeClasses = {};
      board.messages.forEach(msg => {
        const classes = [];
        
        // 左右の端に近い場合
        if (msg.position.x < 10) classes.push('left-edge');
        else if (msg.position.x > 90) classes.push('right-edge');
        
        // 上下の端に近い場合
        if (msg.position.y < 10) classes.push('top-edge');
        else if (msg.position.y > 90) classes.push('bottom-edge');
        
        if (classes.length > 0) {
          newEdgeClasses[msg.id] = classes.join(' ');
        }
      });
      
      setMessageEdgeClasses(newEdgeClasses);
    }
  }, [board, windowWidth]);

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
      
      <div className="size-auto-message">
        メッセージ数: {board.messages?.length || 0}件 
        {board.messages?.length > 5 && '（メッセージ数に合わせて色紙サイズは自動調整されています）'}
      </div>
      
      <div 
        ref={boardRef}
        className="message-board"
        style={{ 
          minHeight: `${boardHeight}px`,
          backgroundColor: board.backgroundColor 
        }}
      >
        <div className="recipient-center">
          <span>{board.recipient}</span>
        </div>
        
        {board.messages && board.messages.map((message, index) => (
          <div
            key={message.id || index}
            className={`message ${messageEdgeClasses[message.id] || ''}`}
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