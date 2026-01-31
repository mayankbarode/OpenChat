import React, { useState } from 'react';

interface ThinkingBlockProps {
    thought: string;
}

const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ thought }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!thought) return null;

    return (
        <div className="thinking-block fade-in" style={{
            marginBottom: '16px',
            borderLeft: '2px solid var(--accent-color)',
            paddingLeft: '16px',
            opacity: 0.8
        }}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 0'
                }}>
                <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                {isExpanded ? 'Hide Thought Process' : 'Show Thought Process'}
            </button>

            {isExpanded && (
                <div style={{
                    marginTop: '8px',
                    fontSize: '14px',
                    lineHeight: 1.5,
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic',
                    whiteSpace: 'pre-wrap'
                }}>
                    {thought}
                </div>
            )}
        </div>
    );
};

export default ThinkingBlock;
