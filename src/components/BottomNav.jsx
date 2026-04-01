import { NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const tabs = [
  { path: '/', label: 'Home', icon: '◉', ariaLabel: '홈 대시보드' },
  { path: '/manage', label: 'Manage', icon: '⚙', ariaLabel: '소비 관리' },
  { path: '/rest', label: 'Rest', icon: '↻', ariaLabel: '쉼 미션' },
  { path: '/community', label: 'Together', icon: '◎', ariaLabel: '커뮤니티' },
  { path: '/mypage', label: 'My', icon: '⊙', ariaLabel: '마이페이지' },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <nav className="bottom-nav" role="navigation" aria-label="메인 네비게이션">
      {tabs.map(({ path, label, icon, ariaLabel }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          aria-label={ariaLabel}
        >
          <span className="nav-icon" aria-hidden="true">{icon}</span>
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
