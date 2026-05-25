import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Search', icon: '⌕' },
  { to: '/my-concerts', label: 'My Shows', icon: '♫' },
  { to: '/add', label: 'Add', icon: '+' },
  { to: '/profile', label: 'Profile', icon: '◎' },
] as const;

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="bottom-nav-icon" aria-hidden>
            {tab.icon}
          </span>
          <span className="bottom-nav-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
