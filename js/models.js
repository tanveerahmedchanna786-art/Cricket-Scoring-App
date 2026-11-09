/**
 * models.js - Core Entities for Cricket Scoring Application (EF101-P02)
 * Strictly follows the required entity architecture:
 * Team, Player, Match, Innings, BatterInnings, BowlerSpell, Delivery/Event.
 */

class Player {
  constructor(id, name, role = 'All-Rounder') {
    this.id = id || 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    this.name = name.trim();
    this.role = role;
  }
}

class Team {
  constructor(id, name, players = []) {
    this.id = id || 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    this.name = name.trim();
    this.players = (players || []).map(p => (p instanceof Player ? p : new Player(p.id, p.name, p.role)));
  }

  addPlayer(player) {
    if (!this.players.some(p => p.id === player.id || p.name.toLowerCase() === player.name.toLowerCase())) {
      this.players.push(player instanceof Player ? player : new Player(player.id, player.name, player.role));
      return true;
    }
    return false;
  }

  editPlayer(playerId, newName, newRole) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      if (newName && newName.trim()) player.name = newName.trim();
      if (newRole) player.role = newRole;
      return true;
    }
    return false;
  }

  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
  }
}

class Delivery {
  constructor({
    ballNumber = 1,
    overNumber = 0,
    ballInOver = 1,
    strikerId,
    nonStrikerId,
    bowlerId,
    runsScored = 0,
    extraType = 'none', // 'none' | 'wide' | 'no_ball' | 'bye' | 'leg_bye'
    extraRuns = 0,
    isLegalBall = true,
    isWicket = false,
    dismissalType = null, // 'bowled' | 'caught' | 'lbw' | 'stumped' | 'run_out' | 'hit_wicket'
    dismissedPlayerId = null,
    bowlerCredited = false,
    notes = ''
  }) {
    this.id = 'del_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    this.ballNumber = ballNumber;
    this.overNumber = overNumber;
    this.ballInOver = ballInOver;
    this.strikerId = strikerId;
    this.nonStrikerId = nonStrikerId;
    this.bowlerId = bowlerId;
    this.runsScored = runsScored;
    this.extraType = extraType;
    this.extraRuns = extraRuns;
    this.isLegalBall = isLegalBall;
    this.isWicket = isWicket;
    this.dismissalType = dismissalType;
    this.dismissedPlayerId = dismissedPlayerId;
    this.bowlerCredited = bowlerCredited;
    this.notes = notes;
    this.timestamp = Date.now();
  }

  getDisplayLabel() {
    if (this.isWicket) {
      if (this.runsScored > 0) return `W+${this.runsScored}`;
      return 'W';
    }
    if (this.extraType === 'wide') {
      const total = 1 + this.runsScored;
      return total > 1 ? `Wd+${this.runsScored}` : 'Wd';
    }
    if (this.extraType === 'no_ball') {
      const total = 1 + this.runsScored;
      return total > 1 ? `Nb+${this.runsScored}` : 'Nb';
    }
    if (this.extraType === 'bye') return `B${this.extraRuns || this.runsScored}`;
    if (this.extraType === 'leg_bye') return `Lb${this.extraRuns || this.runsScored}`;
    if (this.runsScored === 0) return '•';
    return String(this.runsScored);
  }
}

class BatterInnings {
  constructor(playerId, playerName) {
    this.playerId = playerId;
    this.playerName = playerName;
    this.runs = 0;
    this.ballsFaced = 0;
    this.ones = 0;
    this.twos = 0;
    this.threes = 0;
    this.fours = 0;
    this.sixes = 0;
    this.isOut = false;
    this.dismissalInfo = 'not out';
    this.bowlerName = '';
  }

  get strikeRate() {
    if (this.ballsFaced === 0) return '0.00';
    return ((this.runs / this.ballsFaced) * 100).toFixed(1);
  }
}

class BowlerSpell {
  constructor(playerId, playerName) {
    this.playerId = playerId;
    this.playerName = playerName;
    this.legalBalls = 0;
    this.runsConceded = 0;
    this.maidens = 0;
    this.wickets = 0;
    this.wides = 0;
    this.noBalls = 0;
  }

  get oversNotation() {
    const completed = Math.floor(this.legalBalls / 6);
    const balls = this.legalBalls % 6;
    return `${completed}.${balls}`;
  }

  get economyRate() {
    if (this.legalBalls === 0) return '0.00';
    const oversDecimal = this.legalBalls / 6;
    return (this.runsConceded / oversDecimal).toFixed(2);
  }
}

class Innings {
  constructor({
    inningsNumber = 1,
    battingTeam,
    bowlingTeam,
    target = null
  }) {
    this.inningsNumber = inningsNumber;
    this.battingTeam = battingTeam;
    this.bowlingTeam = bowlingTeam;
    this.totalRuns = 0;
    this.totalWickets = 0;
    this.legalBalls = 0;
    this.target = target;
    this.isCompleted = false;
    this.completionReason = '';

    this.extras = {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      total: 0
    };

    this.currentStrikerId = null;
    this.currentNonStrikerId = null;
    this.currentBowlerId = null;
    this.previousBowlerId = null;

    this.deliveries = [];
    this.batterStats = {};
    this.bowlerStats = {};
    this.fallOfWickets = [];
  }

  get oversNotation() {
    const completed = Math.floor(this.legalBalls / 6);
    const balls = this.legalBalls % 6;
    return `${completed}.${balls}`;
  }

  get currentRunRate() {
    if (this.legalBalls === 0) return '0.00';
    const oversDecimal = this.legalBalls / 6;
    return (this.totalRuns / oversDecimal).toFixed(2);
  }
}

class Match {
  constructor({
    id,
    date = new Date().toISOString().split('T')[0],
    venue = 'National Stadium',
    totalOvers = 5,
    team1,
    team2,
    tossWinnerId,
    electedTo = 'bat',
    minTeamSize = 2
  }) {
    this.id = id || 'match_' + Date.now();
    this.date = date;
    this.venue = venue;
    this.totalOvers = parseInt(totalOvers, 10) || 5;
    this.team1 = team1;
    this.team2 = team2;
    this.tossWinnerId = tossWinnerId;
    this.electedTo = electedTo;
    this.minTeamSize = minTeamSize;
    this.currentInningsIndex = 0;
    this.inningsList = [];
    this.status = 'not_started';
    this.result = '';
    this.createdAt = Date.now();
  }

  getCurrentInnings() {
    return this.inningsList[this.currentInningsIndex] || null;
  }
}

if (typeof window !== 'undefined') {
  window.Player = Player;
  window.Team = Team;
  window.Delivery = Delivery;
  window.BatterInnings = BatterInnings;
  window.BowlerSpell = BowlerSpell;
  window.Innings = Innings;
  window.Match = Match;
}
