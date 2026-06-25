import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Players API (used for team management)
export const getPlayers = (team) => {
  const queryParams = team ? `?team=${team}` : "";
  return api.get(`/players/${queryParams}`);
};
export const getPlayer = (id) => api.get(`/players/${id}`);
export const createPlayer = (playerData) => api.post("/players/", playerData);
export const updatePlayer = (id, playerData) => api.put(`/players/${id}`, playerData);
export const deletePlayer = (id) => api.delete(`/players/${id}`);

// Legacy Teams API (mapped to players for backward compatibility)
export const getTeams = () => api.get("/players/");
export const createTeam = (teamData) => api.post("/players/", teamData);
export const deleteTeam = (id) => api.delete(`/players/${id}`);

// SubTeams API
export const getSubteams = (params) => {
  const queryParams = new URLSearchParams();
  if (params?.event) queryParams.append("event", params.event);
  if (params?.team) queryParams.append("team", params.team);
  if (params?.pool) queryParams.append("pool", params.pool);
  const queryString = queryParams.toString();
  return api.get(`/subteams/${queryString ? `?${queryString}` : ""}`);
};
export const getSubteam = (id) => api.get(`/subteams/${id}`);
export const createSubteam = (subteamData) => api.post("/subteams/", subteamData);
export const updateSubteam = (id, subteamData) => api.put(`/subteams/${id}`, subteamData);
export const deleteSubteam = (id) => api.delete(`/subteams/${id}`);

// Matches API
export const getMatches = () => api.get("/matches/");
export const createMatch = (matchData) => api.post("/matches/", matchData);
export const updateMatch = (matchId, matchData) => api.put(`/matches/${matchId}`, matchData);
export const resolveMatch = (matchId, team1, team1_subid, team2, team2_subid) => {
  const params = new URLSearchParams();
  if (team1) params.append('team1', team1);
  if (team1_subid) params.append('team1_subid', team1_subid);
  if (team2) params.append('team2', team2);
  if (team2_subid) params.append('team2_subid', team2_subid);
  return api.patch(`/matches/${matchId}/resolve?${params.toString()}`);
};
export const getTeamMatches = (teamId) => api.get(`/matches/team/${teamId}`);

// Points Table API
export const getPointsTable = (params) => {
  const queryParams = new URLSearchParams();
  if (params?.event) queryParams.append("event", params.event);
  const queryString = queryParams.toString();
  return api.get(`/points-table/${queryString ? `?${queryString}` : ""}`);
};

// Events API
export const getEvents = () => api.get("/events/");
export const updateEvents = (events) => api.put("/events/", events);

// Announcements API
export const getAnnouncements = () => api.get("/announcements/");
export const updateAnnouncements = (announcements) => api.put("/announcements/", announcements);

// Dashboard API
export const getDashboard = (params) => {
  const queryParams = new URLSearchParams();
  if (params?.event) queryParams.append("event", params.event);
  if (params?.cache_ttl !== undefined) queryParams.append("cache_ttl", params.cache_ttl);
  const queryString = queryParams.toString();
  return api.get(`/dashboard/${queryString ? `?${queryString}` : ""}`);
};
export const clearDashboardCache = (event) => {
  const queryParams = event ? `?event=${event}` : "";
  return api.delete(`/dashboard/cache${queryParams}`);
};
export const getDashboardMetrics = () => api.get("/dashboard/cache/metrics");

export default api;

// Made with Bob
