import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminLogin() {
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const result = await login(passkey);
      if (result.success) {
        setPasskey('');
      } else {
        setError('Invalid passkey');
      }
    } catch (err) {
      setError('Invalid passkey');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ 
      display: 'flex', 
      gap: '8px', 
      alignItems: 'center',
      padding: '8px'
    }}>
      <input
        type="password"
        placeholder="Admin Passkey"
        value={passkey}
        onChange={(e) => setPasskey(e.target.value)}
        disabled={isLoading}
        style={{ 
          padding: '8px 12px', 
          borderRadius: '4px', 
          border: '1px solid #ccc',
          fontSize: '14px',
          minWidth: '150px'
        }}
      />
      <button
        type="submit"
        disabled={isLoading || !passkey}
        style={{
          padding: '8px 16px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: '#0f62fe',
          color: 'white',
          cursor: isLoading || !passkey ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          opacity: isLoading || !passkey ? 0.6 : 1
        }}
      >
        {isLoading ? 'Logging in...' : 'Login as Admin'}
      </button>
      {error && (
        <span style={{ 
          color: '#f44336', 
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {error}
        </span>
      )}
    </form>
  );
}

// Made with Bob
