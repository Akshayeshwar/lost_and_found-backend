import React from 'react';

export default function LoadingIndicator({ message = "Loading campus reports..." }) {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
}
