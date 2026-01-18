import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // The Magic Link Logic
    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      alert(error.error_description || error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="container d-flex flex-column align-items-center justify-content-center min-vh-100">
      <div className="glass-card p-5 text-center" style={{maxWidth: '400px', width: '100%'}}>
        <h1 className="text-danger mb-4" style={{fontFamily: 'Bebas Neue', fontSize: '3rem'}}>
          GYM<span className="text-white">OS</span>
        </h1>
        
        {sent ? (
          <div className="animate__animated animate__fadeIn">
            <div className="mb-3" style={{fontSize: '3rem'}}>🚀</div>
            <h4 className="text-white">Check your email!</h4>
            <p className="text-muted">We sent you a magic link to enter the dashboard.</p>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <p className="text-muted mb-4">Enterprise Login</p>
            <input
              className="form-control mb-3 text-center"
              type="email"
              placeholder="Your Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="btn btn-neon w-100" disabled={loading}>
              {loading ? 'Sending Link...' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}