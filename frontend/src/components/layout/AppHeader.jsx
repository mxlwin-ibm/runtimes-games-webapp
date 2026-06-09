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

const AppHeader = () => {
  const location = useLocation();
  const [isSideNavExpanded, setIsSideNavExpanded] = useState(false);

  const isActive = (path) => location.pathname === path;

  const onClickSideNavExpand = () => {
    setIsSideNavExpanded(!isSideNavExpanded);
  };

  return (
    <Header aria-label="Foosball League">
      <HeaderMenuButton
        aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'}
        onClick={onClickSideNavExpand}
        isActive={isSideNavExpanded}
      />
      <HeaderName element={Link} to="/" prefix="">
        Foosball League
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
          to="/teams"
          isActive={isActive("/teams")}
        >
          Teams
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
          to="/point-table"
          isActive={isActive("/point-table")}
        >
          Point Table
        </HeaderMenuItem>
      </HeaderNavigation>
      <HeaderGlobalBar />
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
            to="/teams"
            isActive={isActive("/teams")}
            onClick={onClickSideNavExpand}
          >
            Teams
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
            to="/point-table"
            isActive={isActive("/point-table")}
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
