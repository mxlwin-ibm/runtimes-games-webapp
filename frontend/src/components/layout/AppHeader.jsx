import {
  Header,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
} from "@carbon/react";
import { Link, useLocation } from "react-router-dom";

const AppHeader = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <Header aria-label="Foosball League">
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
    </Header>
  );
};

export default AppHeader;

// Made with Bob
