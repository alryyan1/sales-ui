// src/components/LoadingSpinner.tsx
import React from 'react';
import './LoadingSpinner.css'; // We'll create this CSS file next

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large'; // Optional size prop
    message?: string; // Optional message
    inline?: boolean; // Optional prop to make it display inline
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'medium',
    message = 'Loading...',
    inline = false,
}) => {
    const style: React.CSSProperties = inline ? { display: 'inline-block', marginRight: '8px' } : {};

    return (
        <div className={`loading-spinner-container ${inline ? 'inline' : ''}`} style={style}>
            <div className={`loading-spinner ${size}`}></div>
            {message && !inline && <p className="loading-message">{message}</p>}
             {message && inline && <span className="loading-message-inline">{message}</span>}
        </div>
    );
};

export default LoadingSpinner;