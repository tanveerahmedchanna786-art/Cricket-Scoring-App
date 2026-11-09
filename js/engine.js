/**
 * engine.js - Automated Cricket Rule Engine & State Management (EF101-P02)
 *
 * Implements:
 * 1. Ball-by-ball scoring with legal ball verification (Wide/No-ball non-advancing).
 * 2. Automatic strike rotation on odd runs & end-of-over.
 * 3. Bowler validation (prevents consecutive overs by same bowler).
 * 4. Dismissal accounting & bowler credit rules (Bowled/Caught/LBW/Stumped vs Run-Out).
 * 5. Innings transition & automated match result calculation (overs, all out, or chase).
 * 6. Delivery-level Event Sourcing & complete 1-click Undo mechanism.
 */

class CricketEngine {
  constructor(match) {
    this.match = match;
    this.onStateChanged = null;
    this.onPromptNextBowler = null;
    this.onPromptNextBatter = null;
    this.onInningsEnded = null;
    this.onMatchEnded = null;
  }

  // Initialize a new match with 1st innings
  startMatch({ strikerId, nonStrikerId, bowlerId }) {
    const isTeam1Batting = (this.match.electedTo === 'bat' && this.match.tossWinnerId === this.match.team1.id) ||
                           (this.match.electedTo === 'bowl' && this.match.tossWinnerId === this.match.team2.id);

    const battingTeam = isTeam1Batting ? this.match.team1 : this.match.team2;
    const bowlingTeam = isTeam1Batting ? this.match.team2 : this.match.team1;

    const firstInnings = new Innings({
      inningsNumber: 1,
      battingTeam,
      bowlingTeam
    });

    firstInnings.currentStrikerId = strikerId;
    firstInnings.currentNonStrikerId = nonStrikerId;
    firstInnings.currentBowlerId = bowlerId;

    this._ensurePlayerStats(firstInnings, strikerId, nonStrikerId, bowlerId);

    this.match.inningsList = [firstInnings];
    this.match.currentInningsIndex = 0;
    this.match.status = 'in_progress';

    this._notifyStateChange();
  }

  // Start 2nd innings
  startSecondInnings({ strikerId, nonStrikerId, bowlerId }) {
    const firstInnings = this.match.inningsList[0];
    const target = firstInnings.totalRuns + 1;

    const secondInnings = new Innings({
      inningsNumber: 2,
      battingTeam: firstInnings.bowlingTeam,
      bowlingTeam: firstInnings.battingTeam,
      target
    });

    secondInnings.currentStrikerId = strikerId;
    secondInnings.currentNonStrikerId = nonStrikerId;
    secondInnings.currentBowlerId = bowlerId;

    this._ensurePlayerStats(secondInnings, strikerId, nonStrikerId, bowlerId);

    this.match.inningsList.push(secondInnings);
    this.match.currentInningsIndex = 1;
    this.match.status = 'in_progress';

    this._notifyStateChange();
  }

  _ensurePlayerStats(innings, strikerId, nonStrikerId, bowlerId) {
    const allPlayers = [...innings.battingTeam.players, ...innings.bowlingTeam.players];
    const findPlayer = (id) => allPlayers.find(p => p.id === id) || new Player(id, 'Unknown Player');

    if (strikerId && !innings.batterStats[strikerId]) {
      const p = findPlayer(strikerId);
      innings.batterStats[strikerId] = new BatterInnings(p.id, p.name);
    }
    if (nonStrikerId && !innings.batterStats[nonStrikerId]) {
      const p = findPlayer(nonStrikerId);
      innings.batterStats[nonStrikerId] = new BatterInnings(p.id, p.name);
    }
    if (bowlerId && !innings.bowlerStats[bowlerId]) {
      const p = findPlayer(bowlerId);
      innings.bowlerStats[bowlerId] = new BowlerSpell(p.id, p.name);
    }
  }

  processDelivery(event) {
    const innings = this.match.getCurrentInnings();
    if (!innings || innings.isCompleted || this.match.status === 'completed') {
      return { success: false, message: 'Match has already concluded. No further scoring allowed.' };
    }

    const {
      runs = 0,
      extraType = 'none',
      isWicket = false,
      dismissalType = null,
      dismissedPlayerId = innings.currentStrikerId
    } = event;

    const isLegalBall = (extraType !== 'wide' && extraType !== 'no_ball');

    let extraRuns = 0;
    let runsOffBat = 0;

    if (extraType === 'wide') {
      // Wide: 1 penalty + any additional runs (byes/boundary)
      extraRuns = 1 + runs;
      runsOffBat = 0; // Batter does not get runs on wide
    } else if (extraType === 'no_ball') {
      // No-Ball: 1 penalty extra run + runs scored off bat
      extraRuns = 1;
      runsOffBat = runs;
    } else if (extraType === 'bye' || extraType === 'leg_bye') {
      // Byes / Leg-Byes: all runs are extras, 0 off the bat
      extraRuns = runs;
      runsOffBat = 0;
    } else {
      // Normal delivery
      extraRuns = 0;
      runsOffBat = runs;
    }

    let bowlerCredited = false;
    if (isWicket) {
      if (['bowled', 'caught', 'lbw', 'stumped', 'hit_wicket'].includes(dismissalType)) {
        bowlerCredited = true;
      }
    }

    const currentOverNum = Math.floor(innings.legalBalls / 6);
    const ballInOver = (innings.legalBalls % 6) + (isLegalBall ? 1 : 0);

    const delivery = new Delivery({
      ballNumber: innings.deliveries.length + 1,
      overNumber: currentOverNum,
      ballInOver: ballInOver,
      strikerId: innings.currentStrikerId,
      nonStrikerId: innings.currentNonStrikerId,
      bowlerId: innings.currentBowlerId,
      runsScored: runsOffBat,
      extraType,
      extraRuns,
      isLegalBall,
      isWicket,
      dismissalType,
      dismissedPlayerId,
      bowlerCredited
    });

    innings.deliveries.push(delivery);
    this._recomputeInningsState(innings);

    // Strike swap logic:
    // Odd completed runs require strike change (unless wicket without crossing)
    const physicalRunsRan = runs;
    if (physicalRunsRan % 2 !== 0 && !isWicket) {
      this._swapStrike(innings);
    }

    let overCompleted = false;
    if (isLegalBall && innings.legalBalls > 0 && innings.legalBalls % 6 === 0) {
      overCompleted = true;
      this._swapStrike(innings);
      innings.previousBowlerId = innings.currentBowlerId;
      innings.currentBowlerId = null;
    }

    this._checkInningsCompletion(innings);
    this._notifyStateChange();

    return {
      success: true,
      overCompleted,
      isWicket,
      inningsEnded: innings.isCompleted,
      matchEnded: this.match.status === 'completed'
    };
  }

  _recomputeInningsState(innings) {
    innings.totalRuns = 0;
    innings.totalWickets = 0;
    innings.legalBalls = 0;
    innings.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
    innings.fallOfWickets = [];

    Object.keys(innings.batterStats).forEach(id => {
      const name = innings.batterStats[id].playerName;
      innings.batterStats[id] = new BatterInnings(id, name);
    });

    Object.keys(innings.bowlerStats).forEach(id => {
      const name = innings.bowlerStats[id].playerName;
      innings.bowlerStats[id] = new BowlerSpell(id, name);
    });

    innings.deliveries.forEach((del) => {
      const totalBallRuns = del.runsScored + del.extraRuns;
      innings.totalRuns += totalBallRuns;

      if (del.extraType === 'wide') {
        innings.extras.wides += del.extraRuns;
        innings.extras.total += del.extraRuns;
      } else if (del.extraType === 'no_ball') {
        innings.extras.noBalls += del.extraRuns;
        innings.extras.total += del.extraRuns;
      } else if (del.extraType === 'bye') {
        innings.extras.byes += del.extraRuns;
        innings.extras.total += del.extraRuns;
      } else if (del.extraType === 'leg_bye') {
        innings.extras.legByes += del.extraRuns;
        innings.extras.total += del.extraRuns;
      }

      if (del.isLegalBall) {
        innings.legalBalls += 1;
      }

      const batter = innings.batterStats[del.strikerId];
      if (batter) {
        // Wide does not count as ball faced, but legal balls and no-balls do
        if (del.extraType !== 'wide') {
          batter.ballsFaced += 1;
        }
        batter.runs += del.runsScored;
        if (del.runsScored === 1) batter.ones += 1;
        else if (del.runsScored === 2) batter.twos += 1;
        else if (del.runsScored === 3) batter.threes += 1;
        else if (del.runsScored === 4) batter.fours += 1;
        else if (del.runsScored === 6) batter.sixes += 1;
      }

      const bowler = innings.bowlerStats[del.bowlerId];
      if (bowler) {
        if (del.isLegalBall) {
          bowler.legalBalls += 1;
        }
        let runsCharged = del.runsScored; // runs off bat (0 for wide/bye/leg_bye)
        if (del.extraType === 'wide') {
          runsCharged += del.extraRuns; // 1 + runs
          bowler.wides += 1;
        } else if (del.extraType === 'no_ball') {
          runsCharged += del.extraRuns; // 1 penalty
          bowler.noBalls += 1;
        }
        // Byes & Leg-byes: del.runsScored is 0, del.extraRuns is not charged to bowler!
        bowler.runsConceded += runsCharged;

        if (del.isWicket && del.bowlerCredited) {
          bowler.wickets += 1;
        }
      }

      if (del.isWicket) {
        innings.totalWickets += 1;
        const dismissedBatter = innings.batterStats[del.dismissedPlayerId];
        if (dismissedBatter) {
          dismissedBatter.isOut = true;
          dismissedBatter.dismissalInfo = del.dismissalType;
          dismissedBatter.bowlerName = del.bowlerCredited && bowler ? bowler.playerName : '';
        }
        innings.fallOfWickets.push({
          wicketNum: innings.totalWickets,
          runs: innings.totalRuns,
          overs: innings.oversNotation,
          playerName: dismissedBatter ? dismissedBatter.playerName : 'Batter'
        });
      }
    });
  }

  _swapStrike(innings) {
    const temp = innings.currentStrikerId;
    innings.currentStrikerId = innings.currentNonStrikerId;
    innings.currentNonStrikerId = temp;
  }

  setNextBowler(bowlerId) {
    const innings = this.match.getCurrentInnings();
    if (!innings) return { success: false, message: 'No active innings.' };

    if (bowlerId === innings.previousBowlerId && innings.bowlingTeam.players.length > 1) {
      return {
        success: false,
        message: 'Cricket Rule Violation: A bowler cannot bowl two consecutive overs.'
      };
    }

    innings.currentBowlerId = bowlerId;
    this._ensurePlayerStats(innings, null, null, bowlerId);
    this._notifyStateChange();
    return { success: true };
  }

  setNextBatter(batterId) {
    const innings = this.match.getCurrentInnings();
    if (!innings) return { success: false, message: 'No active innings.' };

    const lastDelivery = innings.deliveries[innings.deliveries.length - 1];
    const outPlayerId = lastDelivery ? lastDelivery.dismissedPlayerId : innings.currentStrikerId;

    if (innings.currentStrikerId === outPlayerId) {
      innings.currentStrikerId = batterId;
    } else {
      innings.currentNonStrikerId = batterId;
    }

    this._ensurePlayerStats(innings, innings.currentStrikerId, innings.currentNonStrikerId, null);
    this._notifyStateChange();
    return { success: true };
  }

  _checkInningsCompletion(innings) {
    const maxWickets = Math.min(10, innings.battingTeam.players.length - 1);
    const maxLegalBalls = this.match.totalOvers * 6;

    if (innings.totalWickets >= maxWickets && maxWickets > 0) {
      innings.isCompleted = true;
      innings.completionReason = 'all_out';
    } else if (innings.legalBalls >= maxLegalBalls) {
      innings.isCompleted = true;
      innings.completionReason = 'overs_completed';
    } else if (innings.inningsNumber === 2 && innings.target && innings.totalRuns >= innings.target) {
      innings.isCompleted = true;
      innings.completionReason = 'target_chased';
    }

    if (innings.isCompleted) {
      if (innings.inningsNumber === 1) {
        this.match.status = 'innings_break';
        if (this.onInningsEnded) this.onInningsEnded(innings);
      } else {
        this.match.status = 'completed';
        this._determineMatchResult();
        if (this.onMatchEnded) this.onMatchEnded(this.match.result);
      }
    }
  }

  _determineMatchResult() {
    const inn1 = this.match.inningsList[0];
    const inn2 = this.match.inningsList[1];

    if (!inn1 || !inn2) return;

    if (inn2.totalRuns >= inn1.totalRuns + 1) {
      const wicketsRemaining = (inn2.battingTeam.players.length - 1) - inn2.totalWickets;
      this.match.result = `${inn2.battingTeam.name} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'}`;
    } else if (inn1.totalRuns > inn2.totalRuns) {
      const runMargin = inn1.totalRuns - inn2.totalRuns;
      this.match.result = `${inn1.battingTeam.name} won by ${runMargin} run${runMargin === 1 ? '' : 's'}`;
    } else {
      this.match.result = `Match Tied (${inn1.totalRuns} runs each)`;
    }
  }

  undoLastDelivery() {
    const innings = this.match.getCurrentInnings();
    if (!innings || innings.deliveries.length === 0) {
      return { success: false, message: 'No deliveries to undo.' };
    }

    const undoneDelivery = innings.deliveries.pop();

    innings.currentStrikerId = undoneDelivery.strikerId;
    innings.currentNonStrikerId = undoneDelivery.nonStrikerId;
    innings.currentBowlerId = undoneDelivery.bowlerId;

    if (this.match.status === 'completed') {
      this.match.status = 'in_progress';
      this.match.result = '';
    }
    innings.isCompleted = false;
    innings.completionReason = '';

    this._recomputeInningsState(innings);
    this._notifyStateChange();
    return { success: true, undoneDelivery };
  }

  _notifyStateChange() {
    if (this.onStateChanged) {
      this.onStateChanged(this.match);
    }
  }
}

if (typeof window !== 'undefined') {
  window.CricketEngine = CricketEngine;
}
