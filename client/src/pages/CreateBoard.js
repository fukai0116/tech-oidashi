import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CreateBoard.css';

function CreateBoard() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    recipient: '',
    backgroundColor: '#F5F5F5'
  });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/messageboards', formData);
      navigate(`/board/${response.data.id}`);
    } catch (err) {
      setError('色紙の作成に失敗しました。もう一度お試しください。');
      console.error('Error creating board:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="create-board-container">
      <h1>卒業生のための色紙を作成</h1>
      <p className="create-board-description">
        卒業するクラスメートのための色紙を作成しましょう。
        名前は色紙の中央に表示され、在校生からのメッセージがその周りに表示されます。
      </p>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="create-board-form">
        <div className="form-group">
          <label htmlFor="title">色紙のタイトル</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="例：卒業おめでとう！"
          />
        </div>
        <div className="form-group">
          <label htmlFor="recipient">卒業生の名前</label>
          <input
            type="text"
            id="recipient"
            name="recipient"
            value={formData.recipient}
            onChange={handleChange}
            required
            placeholder="例：田中さん"
          />
          <p className="input-hint">※この名前が色紙の中央に表示されます</p>
        </div>
        <div className="form-group">
          <label htmlFor="backgroundColor">背景色</label>
          <div className="color-picker-container">
            <input
              type="color"
              id="backgroundColor"
              name="backgroundColor"
              value={formData.backgroundColor}
              onChange={handleChange}
            />
            <span className="color-preview" style={{ backgroundColor: formData.backgroundColor }}>
              プレビュー
            </span>
          </div>
        </div>
        <button type="submit" className="btn-submit">
          色紙を作成する
        </button>
      </form>
    </div>
  );
}

export default CreateBoard;