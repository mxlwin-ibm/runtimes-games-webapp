import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Teams API
export const getTeams = () => api.get("/teams/");
export const createTeam = (teamData) => api.post("/teams/", teamData);
export const deleteTeam = (id) => api.delete(`/teams/${id}`);

// Matches API
export const getMatches = () => api.get("/matches/");
export const createMatch = (matchData) => api.post("/matches/", matchData);
export const updateMatch = (matchId, matchData) => api.put(`/matches/${matchId}`, matchData);
export const getTeamMatches = (teamId) => api.get(`/matches/team/${teamId}`);

// Points Table API
export const getPointsTable = () => api.get("/points-table/");

export default api;

// Made with Bob
