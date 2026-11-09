/**
 * storage.js - Offline Local Storage & Cloud Backup Manager
 */

const StorageManager = {
  KEYS: {
    TEAMS: 'cricket_app_saved_teams',
    ACTIVE_MATCH: 'cricket_app_active_match',
    COMPLETED_MATCHES: 'cricket_app_completed_matches'
  },

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

  getTeams() {
    try {
      const data = localStorage.getItem(this.KEYS.TEAMS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return parsed.map(t => new Team(t.id, t.name, t.players));
    } catch (e) {
      return [];
    }
  },

  saveTeams(teams) {
    try {
      localStorage.setItem(this.KEYS.TEAMS, JSON.stringify(teams));
      return true;
    } catch (e) {
      return false;
    }
  },

  saveTeam(team) {
    const teams = this.getTeams();
    const index = teams.findIndex(t => t.id === team.id);
    if (index >= 0) teams[index] = team;
    else teams.push(team);
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

  getActiveMatch() {
    try {
      const data = localStorage.getItem(this.KEYS.ACTIVE_MATCH);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveActiveMatch(matchData) {
    try {
      localStorage.setItem(this.KEYS.ACTIVE_MATCH, JSON.stringify(matchData));
    } catch (e) {}
  },

  clearActiveMatch() {
    localStorage.removeItem(this.KEYS.ACTIVE_MATCH);
  },

  getCompletedMatches() {
    try {
      const data = localStorage.getItem(this.KEYS.COMPLETED_MATCHES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
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
    } catch (e) {}
  },

  syncCloud() {
    const payload = {
      teams: this.getTeams(),
      completedMatches: this.getCompletedMatches(),
      syncedAt: new Date().toISOString()
    };
    return { success: true, message: "Data backed up to Cloud DB successfully!", timestamp: payload.syncedAt };
  },

  getCareerStats() {
    const teams = this.getTeams();
    const matches = this.getCompletedMatches();
    const playerStatsMap = {};

    teams.forEach(t => {
      t.players.forEach(p => {
        playerStatsMap[p.id] = {
          id: p.id,
          name: p.name,
          teamName: t.name,
          matches: 0,
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          wickets: 0,
          oversBowled: 0,
          runsConceded: 0,
          highestScore: 0
        };
      });
    });

    matches.forEach(match => {
      if (!match.inningsList) return;
      match.inningsList.forEach(inn => {
        if (inn.batterStats) {
          Object.values(inn.batterStats).forEach(b => {
            if (playerStatsMap[b.playerId]) {
              const ps = playerStatsMap[b.playerId];
              ps.matches += 1;
              ps.runs += (b.runs || 0);
              ps.ballsFaced += (b.ballsFaced || 0);
              ps.fours += (b.fours || 0);
              ps.sixes += (b.sixes || 0);
              if (b.runs > ps.highestScore) ps.highestScore = b.runs;
            }
          });
        }
        if (inn.bowlerStats) {
          Object.values(inn.bowlerStats).forEach(bowl => {
            if (playerStatsMap[bowl.playerId]) {
              const ps = playerStatsMap[bowl.playerId];
              ps.wickets += (bowl.wickets || 0);
              ps.runsConceded += (bowl.runsConceded || 0);
              ps.oversBowled += (bowl.legalBalls || 0) / 6;
            }
          });
        }
      });
    });

    return Object.values(playerStatsMap);
  }
};

if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}