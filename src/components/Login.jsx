import { useState, createContext, useContext, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ===== Login Modal Context =====
const LoginModalContext = createContext(null);

export function LoginModalProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [onSuccess, setOnSuccess] = useState(null);

  const requireLogin = useCallback((reason, callback) => {
    setReason(reason || '');
    setOnSuccess(() => callback || null);
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setReason('');
    setOnSuccess(null);
  }, []);

  const handleSuccess = useCallback(() => {
    const cb = onSuccess;
    close();
    if (cb) cb();
  }, [onSuccess, close]);

  return (
    <LoginModalContext.Provider value={{ requireLogin }}>
      {children}
      {visible && <LoginModal reason={reason} onClose={close} onSuccess={handleSuccess} />}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const ctx = useContext(LoginModalContext);
  if (!ctx) throw new Error('useLoginModal must be inside LoginModalProvider');
  return ctx;
}

// ===== Login Modal Component =====
function LoginModal({ reason, onClose, onSuccess }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) { setError('이메일과 비밀번호를 입력해주세요'); return; }
    if (!validateEmail(email)) { setError('올바른 이메일 형식을 입력해주세요'); return; }
    setLoading(true);
    try {
      await signIn(email, password);
      onSuccess();
    } catch {
      setError('이메일 또는 비밀번호가 일치하지 않습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setError('');
    if (!name.trim()) { setError('이름을 입력해주세요'); return; }
    if (!email.trim()) { setError('이메일을 입력해주세요'); return; }
    if (!validateEmail(email)) { setError('올바른 이메일 형식을 입력해주세요'); return; }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다'); return; }
    setLoading(true);
    try {
      await signUp(email, password, name.trim());
      onSuccess();
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('이미 가입된 이메일입니다');
      } else {
        setError(err.message || '가입 중 오류가 발생했습니다');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal" onClick={e => e.stopPropagation()}>
        <button className="login-modal-close" onClick={onClose}>×</button>

        <div className="login-logo">◉</div>
        <h2 className="login-title">
          {mode === 'login' ? '로그인' : '가입하기'}
        </h2>
        {reason && <p className="login-reason">{reason}</p>}

        <div className="login-fields">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          )}
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus={mode === 'login'}
          />
          <input
            type="password"
            placeholder={mode === 'signup' ? '비밀번호 (6자 이상)' : '비밀번호'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSignup())}
          />
        </div>

        {error && <p className="login-error">{error}</p>}

        <button
          className="login-btn"
          onClick={mode === 'login' ? handleLogin : handleSignup}
          disabled={loading}
        >
          {loading ? <span className="login-spinner" /> : mode === 'login' ? '로그인' : '가입하기'}
        </button>

        <p className="login-switch">
          {mode === 'login' ? (
            <>계정이 없으신가요? <button className="login-link inline" onClick={() => { setMode('signup'); setError(''); }}>가입하기</button></>
          ) : (
            <>이미 계정이 있으신가요? <button className="login-link inline" onClick={() => { setMode('login'); setError(''); }}>로그인</button></>
          )}
        </p>
      </div>
    </div>
  );
}
