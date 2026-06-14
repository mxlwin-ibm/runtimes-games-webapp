import { useState } from "react";
import {
  Header,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  HeaderMenuButton,
  HeaderGlobalBar,
  SideNav,
  SideNavItems,
  SideNavLink,
} from "@carbon/react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AdminLogin from "../AdminLogin";

const AppHeader = () => {
  const location = useLocation();
  const [isSideNavExpanded, setIsSideNavExpanded] = useState(false);
  const { isAdmin, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  const onClickSideNavExpand = () => {
    setIsSideNavExpanded(!isSideNavExpanded);
  };

  return (
    <Header aria-label="Runtimes Games S01">
      <HeaderMenuButton
        aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'}
        onClick={onClickSideNavExpand}
        isActive={isSideNavExpanded}
      />
      <HeaderName element={Link} to="/" prefix="">
      Runtimes Games S01
      </HeaderName>
      <HeaderNavigation aria-label="Main Navigation">
        <HeaderMenuItem
          element={Link}
          to="/"
          isActive={isActive("/")}
        >
          Dashboard
        </HeaderMenuItem>
        <HeaderMenuItem
          element={Link}
          to="/squads"
          isActive={isActive("/squads")}
        >
          Squads
        </HeaderMenuItem>
        <HeaderMenuItem
          element={Link}
          to="/matches"
          isActive={isActive("/matches")}
        >
          Matches
        </HeaderMenuItem>
        <HeaderMenuItem
          element={Link}
          to="/points-table"
          isActive={isActive("/points-table")}
        >
          Point Table
        </HeaderMenuItem>
      </HeaderNavigation>
      <HeaderGlobalBar>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          paddingRight: '16px'
        }}>
          {isAdmin ? (
            <>
              <span style={{
                color: '#24a148',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1C4.1 1 1 4.1 1 8s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7zm3.7 5.3l-4 4c-.2.2-.4.3-.7.3s-.5-.1-.7-.3l-2-2c-.4-.4-.4-1 0-1.4s1-.4 1.4 0l1.3 1.3 3.3-3.3c.4-.4 1-.4 1.4 0s.4 1 0 1.4z"/>
                </svg>
                Admin Mode
              </span>
              <button
                onClick={logout}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #da1e28',
                  backgroundColor: 'transparent',
                  color: '#da1e28',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#da1e28';
                  e.target.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#da1e28';
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <AdminLogin />
          )}
        </div>
      </HeaderGlobalBar>
      <SideNav
        aria-label="Side navigation"
        expanded={isSideNavExpanded}
        isPersistent={false}
        onOverlayClick={onClickSideNavExpand}
      >
        <SideNavItems>
          <SideNavLink
            element={Link}
            to="/"
            isActive={isActive("/")}
            onClick={onClickSideNavExpand}
          >
            Dashboard
          </SideNavLink>
          <SideNavLink
            element={Link}
            to="/squads"
            isActive={isActive("/squads")}
            onClick={onClickSideNavExpand}
          >
            Squads
          </SideNavLink>
          <SideNavLink
            element={Link}
            to="/matches"
            isActive={isActive("/matches")}
            onClick={onClickSideNavExpand}
          >
            Matches
          </SideNavLink>
          <SideNavLink
            element={Link}
            to="/points-table"
            isActive={isActive("/points-table")}
            onClick={onClickSideNavExpand}
          >
            Point Table
          </SideNavLink>
        </SideNavItems>
      </SideNav>
    </Header>
  );
};

export default AppHeader;

// Made with Bob
