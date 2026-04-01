import { useState, useCallback, createContext, useContext } from 'react';

const ConfirmContext = createContext();

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setState({ message, resolve });
    });
  }, []);

  const handleYes = () => { state.resolve(true); setState(null); };
  const handleNo = () => { state.resolve(false); setState(null); };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="confirm-overlay" onClick={handleNo}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="confirm-message">{state.message}</p>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={handleNo}>취소</button>
              <button className="confirm-btn ok" onClick={handleYes}>확인</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
