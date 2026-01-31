import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
    language: string;
    value: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="code-block-container" style={{
            position: 'relative',
            margin: '16px 0',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--glass-border)',
            background: '#1e1e1e'
        }}>
            <div className="code-block-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.05)',
                borderBottom: '1px solid var(--glass-border)'
            }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {language || 'text'}
                </span>
                <button
                    onClick={handleCopy}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'all 0.2s'
                    }}
                    className="hover-bright"
                >
                    {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{
                    margin: 0,
                    padding: '16px',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    background: 'transparent'
                }}
            >
                {value}
            </SyntaxHighlighter>
        </div>
    );
};

export default CodeBlock;
