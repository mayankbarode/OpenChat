import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Edit2, Trash2, Check, X, Image, X as XIcon, Copy } from 'lucide-react';
import CodeBlock from './CodeBlock';
import { useAuth } from '../context/AuthContext';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    image_url?: string;
}

interface ChatAreaProps {
    provider: string;
    model: string;
    apiKey: string;
    baseUrl?: string;
    conversationId: string | null;
    onConversationCreated: (id: string) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({
    provider,
    model,
    apiKey,
    baseUrl,
    conversationId,
    onConversationCreated
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editInput, setEditInput] = useState('');
    const [pendingImage, setPendingImage] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { token } = useAuth();
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);

    // Check if current model supports vision
    const isVisionModel = model.includes('vision') ||
        model.includes('gpt-4o') ||
        model.includes('gpt-4-turbo') ||
        model.includes('gemini-1.5') ||
        model.includes('gemini-2');

    // Load history when conversationId changes
    useEffect(() => {
        if (conversationId && token) {
            fetchHistory(conversationId);
        } else {
            setMessages([]);
        }
        setPendingImage(null);
    }, [conversationId, token]);

    const fetchHistory = async (id: string) => {
        try {
            const response = await fetch(`http://localhost:8000/conversations/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const history = data.messages.map((m: any, idx: number) => ({
                id: `hist-${idx}`,
                role: m.role,
                content: m.content,
                image_url: m.image_url
            }));
            setMessages(history);
        } catch (e) {
            console.error('Failed to fetch history', e);
        }
    };

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const atBottom = scrollHeight - scrollTop - clientHeight < 100;
            setIsAtBottom(atBottom);
            setShowScrollButton(!atBottom);
        }
    };

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior
            });
        }
    };

    useEffect(() => {
        if (isAtBottom) {
            scrollToBottom('auto');
        }
    }, [messages, isAtBottom]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Image size must be less than 10MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setPendingImage(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSend = async (customContent?: string, isRetryId?: string) => {
        const contentToSend = customContent || input;
        if (!contentToSend.trim() && !pendingImage) return;
        if (isLoading) return;

        if (!apiKey && provider !== 'vllm') {
            alert(`Please set your ${provider} API Key in Settings first.`);
            return;
        }

        let updatedMessages = [...messages];
        if (isRetryId) {
            const index = messages.findIndex(m => m.id === isRetryId);
            updatedMessages = messages.slice(0, index);
        }

        const userMsgId = isRetryId || Date.now().toString();
        const userMessage: Message = {
            id: userMsgId,
            role: 'user',
            content: contentToSend || (pendingImage ? 'What is in this image?' : ''),
            image_url: pendingImage || undefined
        };

        const newMessages = [...updatedMessages, userMessage];
        setMessages(newMessages);
        setInput('');
        setPendingImage(null);
        setEditingId(null);
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8000/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    provider,
                    model,
                    messages: newMessages.map(({ role, content, image_url }) => ({ role, content, image_url })),
                    stream: true,
                    apiKey,
                    baseUrl,
                    conversationId
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to send message');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let botContent = '';
            const botId = (Date.now() + 1).toString();
            let convIdSent = false;



            while (true) {
                const { done, value } = await reader!.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (dataStr === '[DONE]') break;

                        try {
                            const parsed = JSON.parse(dataStr);

                            if (parsed.conversationId && !conversationId && !convIdSent) {
                                onConversationCreated(parsed.conversationId);
                                convIdSent = true;
                            }

                            if (parsed.content) {
                                botContent += parsed.content;
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const botMsg = updated.find(m => m.id === botId);
                                    if (botMsg) {
                                        botMsg.content = botContent;
                                    } else {
                                        updated.push({ id: botId, role: 'assistant', content: botContent });
                                    }
                                    return updated;
                                });

                            }
                        } catch (e) {
                            console.error('Failed to parse chunk', e);
                        }
                    }
                }
            }
        } catch (error: any) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteMessage = (id: string) => {
        const index = messages.findIndex(m => m.id === id);
        setMessages(messages.slice(0, index));
    };

    const startEditing = (message: Message) => {
        setEditingId(message.id);
        setEditInput(message.content);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditInput('');
    };

    const saveEdit = (id: string) => {
        if (id === messages[messages.length - 1].id || messages.find(m => m.id === id)?.role === 'assistant') {
            setMessages(prev => prev.map(m => m.id === id ? { ...m, content: editInput } : m));
            setEditingId(null);
        } else {
            handleSend(editInput, id);
        }
    };

    return (
        <div className="chat-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <div
                className="messages"
                ref={scrollRef}
                onScroll={handleScroll}
                style={{ flex: 1, overflowY: 'auto', padding: '40px 15%', display: 'flex', flexDirection: 'column', gap: '32px' }}
            >
                {messages.length === 0 && !isLoading && (
                    <div style={{ textAlign: 'center', marginTop: '100px', opacity: 0.5 }}>
                        <h3 style={{ fontSize: '24px', fontWeight: 600 }}>Ready to chat?</h3>
                        <p>Start a new conversation or select one from the sidebar.</p>
                        {isVisionModel && <p style={{ marginTop: '10px', color: 'var(--accent-color)' }}>📷 This model supports image input!</p>}
                    </div>
                )}
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={`message ${m.role}`}
                        style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                            flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                            maxWidth: '85%',
                            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                    >
                        <div className="avatar" style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: m.role === 'user' ? 'var(--accent-color)' : 'var(--sidebar-bg)',
                            color: m.role === 'user' ? '#fff' : 'var(--accent-color)',
                            border: '1px solid var(--glass-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 600,
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}>
                            {m.role === 'user' ? 'U' : 'AI'}
                        </div>
                        <div
                            className="content-wrapper"
                            style={{
                                position: 'relative',
                                background: m.role === 'user'
                                    ? 'var(--message-user-bg)'
                                    : 'var(--glass-bg)',
                                color: 'var(--text-primary)',
                                padding: '14px 18px',
                                borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                border: '1px solid var(--glass-border)',
                                maxWidth: '100%'
                            }}
                        >
                            {/* Show image if present */}
                            {m.image_url && (
                                <img
                                    src={m.image_url}
                                    alt="Uploaded"
                                    style={{
                                        maxWidth: '280px',
                                        maxHeight: '200px',
                                        borderRadius: '12px',
                                        marginBottom: '10px',
                                        display: 'block'
                                    }}
                                />
                            )}
                            {editingId === m.id ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <textarea
                                        value={editInput}
                                        onChange={(e) => setEditInput(e.target.value)}
                                        style={{
                                            background: 'var(--sidebar-bg)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '8px',
                                            padding: '12px',
                                            color: 'var(--text-primary)',
                                            fontSize: '15px',
                                            minHeight: '80px',
                                            resize: 'vertical'
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => saveEdit(m.id)} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Check size={14} /> Save
                                        </button>
                                        <button onClick={cancelEditing} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <X size={14} /> Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="message-content markdown-body" style={{ fontSize: '15px', lineHeight: '1.7' }}>
                                    <ReactMarkdown
                                        children={m.content}
                                        components={{
                                            code: CodeBlock as any
                                        }}
                                    />
                                </div>
                            )}
                            {!editingId && (
                                <div className="message-actions" style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    [m.role === 'user' ? 'left' : 'right']: '-40px',
                                    display: 'flex',
                                    gap: '4px',
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                    zIndex: 10
                                }}>
                                    {m.role === 'assistant' && (
                                        <button
                                            onClick={() => copyToClipboard(m.content, m.id)}
                                            className="hover-bright"
                                            title="Copy message"
                                            style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: copiedId === m.id ? '#10b981' : 'var(--text-secondary)' }}
                                        >
                                            {copiedId === m.id ? <Check size={14} /> : <Copy size={14} />}
                                        </button>
                                    )}
                                    {m.role === 'user' && (
                                        <>
                                            <button onClick={() => startEditing(m)} className="hover-bright" title="Edit message" style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => deleteMessage(m.id)} className="hover-bright" title="Delete message" style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                    <div className="message assistant" style={{ display: 'flex', gap: '12px', alignItems: 'center', opacity: 0.7, alignSelf: 'flex-start' }}>
                        <div className="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--sidebar-bg)', color: 'var(--accent-color)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>AI</div>
                        <div style={{ background: 'var(--glass-bg)', padding: '14px 18px', borderRadius: '18px 18px 18px 4px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
                            <span className="typing-indicator">Thinking...</span>
                        </div>
                    </div>
                )}
                {showScrollButton && (
                    <button
                        onClick={() => scrollToBottom()}
                        style={{
                            position: 'absolute',
                            bottom: '120px',
                            right: '50%',
                            transform: 'translateX(50%)',
                            background: 'var(--accent-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            padding: '8px 16px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            zIndex: 100,
                            animation: 'fadeIn 0.2s ease-out'
                        }}
                    >
                        <XIcon size={14} style={{ transform: 'rotate(180deg)' }} /> New Messages
                    </button>
                )}
            </div>

            <div className="input-container" style={{ padding: '0 15% 40px 15%' }}>
                {/* Image preview */}
                {pendingImage && (
                    <div style={{ marginBottom: '12px', position: 'relative', display: 'inline-block' }}>
                        <img
                            src={pendingImage}
                            alt="To upload"
                            style={{
                                maxWidth: '200px',
                                maxHeight: '150px',
                                borderRadius: '12px',
                                border: '2px solid var(--accent-color)'
                            }}
                        />
                        <button
                            onClick={() => setPendingImage(null)}
                            style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                background: '#ff4d4f',
                                border: 'none',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'white'
                            }}
                        >
                            <XIcon size={14} />
                        </button>
                    </div>
                )}

                <div className="glass" style={{
                    display: 'flex',
                    padding: '8px 16px',
                    borderRadius: '16px',
                    alignItems: 'center',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    border: '1px solid var(--glass-border)',
                    gap: '8px'
                }}>
                    {/* Image upload button */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!isVisionModel}
                        title={isVisionModel ? 'Upload image' : 'Current model does not support images'}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: isVisionModel ? 'var(--accent-color)' : 'var(--text-secondary)',
                            cursor: isVisionModel ? 'pointer' : 'not-allowed',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: isVisionModel ? 1 : 0.4
                        }}
                    >
                        <Image size={20} />
                    </button>

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder={pendingImage ? "Ask about the image..." : "Ask anything..."}
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-primary)',
                            fontSize: '16px',
                            padding: '12px 0',
                            outline: 'none',
                            resize: 'none',
                            height: '48px'
                        }}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={isLoading || (!input.trim() && !pendingImage)}
                        style={{
                            background: 'var(--accent-color)',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            cursor: (isLoading || (!input.trim() && !pendingImage)) ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            opacity: (isLoading || (!input.trim() && !pendingImage)) ? 0.6 : 1,
                            transition: 'all 0.2s'
                        }}>
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatArea;
