import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Settings, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Conversation {
  id: string; // MongoDB IDs are strings
  title: string;
  updated_at: string;
}

interface ChatSidebarProps {
  onNewChat: () => void;
  onOpenSettings: () => void;
  currentConvId: string | null;
  onSelectConv: (id: string) => void;
  refreshKey?: number;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ onNewChat, onOpenSettings, currentConvId, onSelectConv, refreshKey }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { token } = useAuth();

  useEffect(() => {
    if (token) fetchConversations();
  }, [currentConvId, token, refreshKey]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('http://localhost:8000/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) setConversations(data);
    } catch (e) {
      console.error('Failed to fetch conversations', e);
    }
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
      await fetch(`http://localhost:8000/conversations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchConversations();
      if (currentConvId === id) onNewChat();
    } catch (e) {
      console.error('Failed to delete conversation', e);
    }
  };

  return (
    <aside className="sidebar" style={{
      width: '260px',
      height: '100%',
      backgroundColor: 'var(--sidebar-bg)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px',
      borderRight: '1px solid var(--glass-border)',
      zIndex: 10
    }}>
      <button
        onClick={onNewChat}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          borderRadius: '12px',
          background: 'var(--accent-color)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '14px',
          marginBottom: '20px',
          transition: 'var(--transition-smooth)'
        }}>
        <Plus size={18} />
        New Chat
      </button>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3 style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '0 12px 10px 12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Chats</h3>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => onSelectConv(conv.id)}
            className={`sidebar-item ${currentConvId === conv.id ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <MessageSquare size={16} />
              <span style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '160px'
              }}>{conv.title}</span>
            </div>
            <button
              onClick={(e) => deleteConversation(e, conv.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                opacity: currentConvId === conv.id ? 1 : 0
              }}
              className="delete-button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
        <button
          onClick={onOpenSettings}
          className="sidebar-item"
          style={{ border: 'none', background: 'none', width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', cursor: 'pointer' }}
        >
          <Settings size={18} />
          Settings
        </button>
      </div>
    </aside>
  );
};

export default ChatSidebar;
