export default function AuthModal({ show, onClose, authMode, setAuthMode, authForm, setAuthForm, onLogin, onSignup }) {
  if (!show) return null;
  const isLogin = authMode === 'login';
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) onLogin();
    else onSignup();
  };
  return (
    <div className="mdl-overlay" onClick={onClose}>
      <div className="mdl-card" role="dialog" aria-modal="true" aria-label={isLogin ? 'Login' : 'Sign up'} onClick={(e)=> e.stopPropagation()}>
        <h2 className="mdl-title">{isLogin ? 'Login' : 'Sign up'}</h2>
        <p className="mdl-sub">{isLogin ? 'Welcome back! Your progress is saved per account.' : 'Create account — admin is username "admin".'}</p>
        <form className="mdl-form" onSubmit={handleSubmit}>
          <input className="mdl-input" value={authForm.username} onChange={e=> setAuthForm({...authForm, username: e.target.value})} placeholder="Username (a-z, 0-9, _ -)" />
          {authMode==='signup' && <input className="mdl-input" value={authForm.email} onChange={e=> setAuthForm({...authForm, email: e.target.value})} placeholder="Email (optional)" />}
          <input className="mdl-input" type="password" value={authForm.password} onChange={e=> setAuthForm({...authForm, password: e.target.value})} placeholder="Password (min 4)" />
          <div className="mdl-actions">
            <button type="button" className="btn light" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn dark">{isLogin ? 'Login' : 'Sign up'}</button>
          </div>
          <button type="button" className="mdl-toggle" onClick={()=> setAuthMode(authMode==='login' ? 'signup' : 'login')}>{isLogin ? 'Need account? Sign up' : 'Have account? Login'}</button>
        </form>
      </div>
    </div>
  );
}
