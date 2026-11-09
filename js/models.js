/**
 * models.js - Core Entities for Cricket Scoring Application (EF101-P02)
 * Enhanced with:
 * - Team flags, jerseys, and theme colors
 * - Delivery shot zones (Wagon Wheel) and automated commentary
 * - Player of the Match (MVP) performance points
 */

class Player {
  constructor(id, name, role = 'All-Rounder', battingStyle = 'Right-Hand Bat', bowlingStyle = 'Right-Arm Fast') {
    this.id = id || 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    this.name = name.trim();
    this.role = role; // 'Batter' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper'
    this.battingStyle = battingStyle;
    this.bowlingStyle = bowlingStyle;
  }
}

class Team {
  constructor(id, name, players = [], flag = '🏏', primaryColor = '#00e676') {
    this.id = id || 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    this.name = name.trim();
    this.flag = flag;
    this.primaryColor = primaryColor;
    this.players = (players || []).map(p => (p instanceof Player ? p : new Player(p.id, p.name, p.role)));
  }

  addPlayer(player) {
    if (!this.players.some(p => p.id === player.id || p.name.toLowerCase() === player.name.toLowerCase())) {
      this.players.push(player instanceof Player ? player : new Player(player.id, player.name, player.role));
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
    shotZone = null, // 'long_off' | 'long_on' | 'cover' | 'point' | 'midwicket' | 'fine_leg' | 'third_man' | 'straight'
    commentary = '',
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
    this.shotZone = shotZone;
    this.commentary = commentary;
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

  // MVP Impact Points
  get mvpPoints() {
    let pts = this.runs;
    pts += this.fours * 2.5;
    pts += this.sixes * 5;
    if (this.runs >= 50) pts += 20;
    if (this.runs >= 30) pts += 10;
    return pts;
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

  // MVP Impact Points
  get mvpPoints() {
    let pts = this.wickets * 25;
    pts += this.maidens * 15;
    if (this.legalBalls >= 6) {
      const econ = parseFloat(this.economyRate);
      if (econ < 6.0) pts += 15;
      else if (econ < 8.0) pts += 5;
    }
    return pts;
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

  // Calculate Player of the Match (MVP)
  getPlayerOfTheMatch() {
    const playerPoints = {}; // id -> { name, teamName, points, summary }
    const allPlayers = [...this.team1.players, ...this.team2.players];

    this.inningsList.forEach(inn => {
      // Batters
      Object.values(inn.batterStats).forEach(b => {
        if (!playerPoints[b.playerId]) {
          const p = allPlayers.find(pl => pl.id === b.playerId);
          const t = inn.battingTeam.players.some(pl => pl.id === b.playerId) ? inn.battingTeam.name : inn.bowlingTeam.name;
          playerPoints[b.playerId] = { name: b.playerName, teamName: t, points: 0, runs: 0, balls: 0, wickets: 0, runsConceded: 0, overs: '0.0' };
        }
        playerPoints[b.playerId].points += b.mvpPoints;
        playerPoints[b.playerId].runs += b.runs;
        playerPoints[b.playerId].balls += b.ballsFaced;
      });

      // Bowlers
      Object.values(inn.bowlerStats).forEach(bw => {
        if (!playerPoints[bw.playerId]) {
          const p = allPlayers.find(pl => pl.id === bw.playerId);
          const t = inn.bowlingTeam.players.some(pl => pl.id === bw.playerId) ? inn.bowlingTeam.name : inn.battingTeam.name;
          playerPoints[bw.playerId] = { name: bw.playerName, teamName: t, points: 0, runs: 0, balls: 0, wickets: 0, runsConceded: 0, overs: '0.0' };
        }
        playerPoints[bw.playerId].points += bw.mvpPoints;
        playerPoints[bw.playerId].wickets += bw.wickets;
        playerPoints[bw.playerId].runsConceded += bw.runsConceded;
        playerPoints[bw.playerId].overs = bw.oversNotation;
      });
    });

    const sorted = Object.values(playerPoints).sort((a, b) => b.points - a.points);
    return sorted[0] || null;
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
