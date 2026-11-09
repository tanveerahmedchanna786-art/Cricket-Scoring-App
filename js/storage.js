/**
 * storage.js - 100% Offline Local Storage for Cricket Scoring App
 * Uses browser localStorage to persist Teams, Players, Active Matches, and Match History.
 */

const StorageManager = {
  KEYS: {
    TEAMS: 'cricket_app_saved_teams',
    ACTIVE_MATCH: 'cricket_app_active_match',
    COMPLETED_MATCHES: 'cricket_app_completed_matches'
  },

  // Initialize with original default demo teams (Super Kings vs Royal Challengers)
  initDefaults() {
    const existing = this.getTeams();
    if (!existing || existing.length === 0) {
      const defaultTeams = [
        new Team('team_rcb', 'Royal Challengers', [
          new Player('p_vk', 'Virat Kohli', 'Batter'),
          new Player('p_fd', 'Faf du Plessis', 'Batter'),
          new Player('p_gj', 'Glenn Maxwell', 'All-Rounder'),
          new Player('p_md', 'Mohammed Siraj', 'Bowler'),
          new Player('p_dk', 'Dinesh Karthik', 'Wicketkeeper')
        ]),
        new Team('team_csk', 'Super Kings', [
          new Player('p_rd', 'Ruturaj Gaikwad', 'Batter'),
          new Player('p_dc', 'Devon Conway', 'Batter'),
          new Player('p_sj', 'Ravindra Jadeja', 'All-Rounder'),
          new Player('p_ms', 'MS Dhoni', 'Wicketkeeper'),
          new Player('p_mc', 'Matheesha Pathirana', 'Bowler')
        ])
      ];
      this.saveTeams(defaultTeams);
    }
  },

  // Retrieve all saved teams
  getTeams() {
    try {
      const data = localStorage.getItem(this.KEYS.TEAMS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return parsed.map(t => new Team(t.id, t.name, t.players));
    } catch (e) {
      console.error('Failed to load teams from localStorage:', e);
      return [];
    }
  },

  // Save all teams
  saveTeams(teams) {
    try {
      localStorage.setItem(this.KEYS.TEAMS, JSON.stringify(teams));
      return true;
    } catch (e) {
      console.error('Failed to save teams to localStorage:', e);
      return false;
    }
  },

  // Save a single new team or update existing
  saveTeam(team) {
    const teams = this.getTeams();
    const index = teams.findIndex(t => t.id === team.id);
    if (index >= 0) {
      teams[index] = team;
    } else {
      teams.push(team);
    }
    return this.saveTeams(teams);
  },

  deleteTeam(teamId) {
    let teams = this.getTeams();
    teams = teams.filter(t => t.id !== teamId);
    return this.saveTeams(teams);
  },

  updatePlayerInTeam(teamId, playerId, newName, newRole) {
    const teams = this.getTeams();
    const team = teams.find(t => t.id === teamId);
    if (team) {
      team.editPlayer(playerId, newName, newRole);
      return this.saveTeam(team);
    }
    return false;
  },

  removePlayerFromTeam(teamId, playerId) {
    const teams = this.getTeams();
    const team = teams.find(t => t.id === teamId);
    if (team) {
      team.removePlayer(playerId);
      return this.saveTeam(team);
    }
    return false;
  },

  // Active match persistence (Crash-recovery)
  getActiveMatch() {
    try {
      const data = localStorage.getItem(this.KEYS.ACTIVE_MATCH);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to read active match:', e);
      return null;
    }
  },

  saveActiveMatch(matchData) {
    try {
      localStorage.setItem(this.KEYS.ACTIVE_MATCH, JSON.stringify(matchData));
    } catch (e) {
      console.error('Failed to save active match:', e);
    }
  },

  clearActiveMatch() {
    localStorage.removeItem(this.KEYS.ACTIVE_MATCH);
  },

  // Completed matches archive
  getCompletedMatches() {
    try {
      const data = localStorage.getItem(this.KEYS.COMPLETED_MATCHES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to read completed matches:', e);
      return [];
    }
  },

  saveCompletedMatch(matchData) {
    try {
      const list = this.getCompletedMatches();
      const filtered = list.filter(m => m.id !== matchData.id);
      filtered.unshift(matchData);
      localStorage.setItem(this.KEYS.COMPLETED_MATCHES, JSON.stringify(filtered));
      this.clearActiveMatch();
    } catch (e) {
      console.error('Failed to save completed match:', e);
    }
  }
};

if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
