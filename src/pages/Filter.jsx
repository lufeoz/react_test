import { useState } from 'react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useLoginModal } from '../components/Login';

const DEFAULT_FILTERS = [
  { id: 1, name: '쇼츠 / 릴스', description: '짧은 영상 콘텐츠 차단', enabled: true, icon: '⚡' },
  { id: 2, name: '추천 영상', description: '알고리즘 추천 콘텐츠 숨김', enabled: true, icon: '🎯' },
  { id: 3, name: '연예 뉴스', description: '연예/가십 관련 콘텐츠 차단', enabled: false, icon: '⭐' },
  { id: 4, name: '정치 뉴스', description: '정치 관련 콘텐츠 차단', enabled: false, icon: '🏛' },
  { id: 5, name: '광고 콘텐츠', description: '스폰서/광고 게시물 필터', enabled: true, icon: '📢' },
  { id: 6, name: '자동 재생', description: '다음 콘텐츠 자동 재생 차단', enabled: true, icon: '⏭' },
  { id: 7, name: '댓글', description: '댓글 섹션 숨김', enabled: false, icon: '💬' },
  { id: 8, name: '좋아요 수', description: '좋아요/조회수 숨김', enabled: false, icon: '👍' },
];

export default function Filter({ embedded = false }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { requireLogin } = useLoginModal();
  const { load, save } = useData();
  const [filters, setFilters] = useState(() => {
    return load('noiseFilters') || DEFAULT_FILTERS;
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newFilter, setNewFilter] = useState({ name: '', description: '', icon: '🚫' });

  const saveFilters = (updated) => {
    setFilters(updated);
    save('noiseFilters', updated);
  };

  const toggle = (id) => {
    saveFilters(filters.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const remove = async (id) => {
    if (!await confirm('이 필터를 삭제할까요?')) return;
    saveFilters(filters.filter(f => f.id !== id));
    toast('필터가 삭제되었습니다');
  };

  const addFilter = () => {
    if (!newFilter.name.trim()) return;
    saveFilters([...filters, { ...newFilter, id: Date.now(), name: newFilter.name.trim(), enabled: true }]);
    setNewFilter({ name: '', description: '', icon: '🚫' });
    setShowAdd(false);
    toast('필터가 추가되었습니다');
  };

  const activeCount = filters.filter(f => f.enabled).length;

  const content = (
    <>
      <div className="filter-status">
        <span className="filter-count">{activeCount}</span>
        <span className="filter-label">필터 활성화</span>
      </div>

      <div className="filter-list">
        {filters.map(filter => (
          <div key={filter.id} className={`filter-item ${filter.enabled ? 'active' : ''}`}>
            <div className="filter-left" onClick={() => toggle(filter.id)}>
              <span className="filter-icon">{filter.icon}</span>
              <div className="filter-text">
                <span className="filter-name">{filter.name}</span>
                <span className="filter-desc">{filter.description}</span>
              </div>
            </div>
            <div className="filter-right">
              <div className={`switch ${filter.enabled ? 'on' : 'off'}`} onClick={() => toggle(filter.id)}>
                <div className="switch-thumb" />
              </div>
              <button className="btn-remove small" onClick={() => remove(filter.id)}>×</button>
            </div>
          </div>
        ))}
      </div>

      {showAdd ? (
        <div className="rule-card add-rule-card">
          <div className="add-form">
            <input
              type="text"
              placeholder="필터 이름 (예: 클릭베이트)"
              value={newFilter.name}
              onChange={e => setNewFilter({ ...newFilter, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && addFilter()}
              autoFocus
            />
            <input
              type="text"
              placeholder="설명 (선택)"
              value={newFilter.description}
              onChange={e => setNewFilter({ ...newFilter, description: e.target.value })}
            />
            <div className="add-form-actions">
              <button className="btn-small" onClick={addFilter}>추가</button>
              <button className="btn-small btn-ghost" onClick={() => setShowAdd(false)}>취소</button>
            </div>
          </div>
        </div>
      ) : (
        <button className="add-group-btn" onClick={() => {
          if (!user) { requireLogin('필터를 추가하려면 로그인이 필요합니다'); return; }
          setShowAdd(true);
        }}>
          + 커스텀 필터 추가
        </button>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Noise Filter</h1>
        <p className="page-subtitle">보고 싶지 않은 콘텐츠 제거</p>
      </header>
      {content}
    </div>
  );
}
