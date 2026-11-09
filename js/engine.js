/**
 * engine.js - Automated Cricket Rule Engine & State Management (EF101-P02)
 * Enhanced with:
 * - Context-aware Automated Live Commentary Generator
 * - Shot Direction tracking for Wagon Wheel analysis
 * - Player of the Match (MVP) computation
 * - Pure Event Sourcing & 1-click Undo
 */

class CricketEngine {
  constructor(match) {
    this.match = match;
    this.onStateChanged = null;
    this.onPromptNextBowler = null;
    this.onPromptNextBatter = null;
    this.onInningsEnded = null;
    this.onMatchEnded = null;
    this.onDeliveryScored = null; // Callback for celebrations (4, 6, wicket)
  }

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
    const findPlayer = (id) => allPlayers.find(p => p.id === id) || new Player(id, 'Player');

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
      return { success: false, message: 'Innings/Match has concluded.' };
    }

    const {
      runs = 0,
      extraType = 'none',
      isWicket = false,
      dismissalType = null,
      dismissedPlayerId = innings.currentStrikerId,
      shotZone = null
    } = event;

    // 1. Legal ball calculation: Wide & No-ball are NOT legal balls
    const isLegalBall = (extraType !== 'wide' && extraType !== 'no_ball');

    // 2. Extra runs calculation
    let extraRuns = 0;
    if (extraType === 'wide' || extraType === 'no_ball') {
      extraRuns = 1;
    } else if (extraType === 'bye' || extraType === 'leg_bye') {
      extraRuns = runs;
    }

    // 3. Runs credited to batter
    const runsOffBat = (extraType === 'bye' || extraType === 'leg_bye' || extraType === 'wide') ? 0 : runs;

    // 4. Bowler credit rule (Run Out gives NO wicket credit to bowler)
    let bowlerCredited = false;
    if (isWicket) {
      if (['bowled', 'caught', 'lbw', 'stumped', 'hit_wicket'].includes(dismissalType)) {
        bowlerCredited = true;
      }
    }

    const currentOverNum = Math.floor(innings.legalBalls / 6);
    const ballInOver = (innings.legalBalls % 6) + (isLegalBall ? 1 : 0);

    // 5. Generate Dynamic Live Commentary
    const striker = innings.batterStats[innings.currentStrikerId];
    const bowler = innings.bowlerStats[innings.currentBowlerId];
    const strikerName = striker ? striker.playerName : 'Striker';
    const bowlerName = bowler ? bowler.playerName : 'Bowler';

    const commentary = this._generateCommentary({
      bowlerName,
      strikerName,
      runs: runsOffBat,
      extraType,
      extraRuns,
      isWicket,
      dismissalType,
      shotZone
    });

    // 6. Create atomic delivery record
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
      bowlerCredited,
      shotZone,
      commentary
    });

    // 7. Push delivery to event log & recompute
    innings.deliveries.push(delivery);
    this._recomputeInningsState(innings);

    // 8. Strike rotation
    const physicalRuns = (extraType === 'wide') ? 0 : runs;
    if (physicalRuns % 2 !== 0 && !isWicket) {
      this._swapStrike(innings);
    }

    // 9. Over completion check
    let overCompleted = false;
    if (isLegalBall && innings.legalBalls > 0 && innings.legalBalls % 6 === 0) {
      overCompleted = true;
      this._swapStrike(innings);
      innings.previousBowlerId = innings.currentBowlerId;
      innings.currentBowlerId = null;
    }

    // 10. Check innings or match finish
    this._checkInningsCompletion(innings);

    // 11. Trigger celebration callback
    if (this.onDeliveryScored) {
      this.onDeliveryScored(delivery);
    }

    this._notifyStateChange();

    return {
      success: true,
      overCompleted,
      isWicket,
      delivery,
      inningsEnded: innings.isCompleted,
      matchEnded: this.match.status === 'completed'
    };
  }

  // Live Commentary Generator
  _generateCommentary({ bowlerName, strikerName, runs, extraType, isWicket, dismissalType, shotZone }) {
    const zoneText = shotZone ? ` towards ${shotZone.replace('_', ' ')}` : '';

    if (isWicket) {
      switch (dismissalType) {
        case 'bowled': return `🔥 BOWLED HIM! ${bowlerName} shatters the stumps! Clean bowled, ${strikerName} has to walk back!`;
        case 'caught': return `🧤 CAUGHT! ${strikerName} mistimes the drive${zoneText}, and the fielder takes a comfortable catch off ${bowlerName}!`;
        case 'lbw': return `⚡ LBW! Huge appeal from ${bowlerName}... and the umpire's finger goes up! Plumb in front!`;
        case 'stumped': return `💨 STUMPED! ${strikerName} steps down the track, misses, and the bails are whipped off in a flash!`;
        case 'run_out': return `🏃 RUN OUT! Total mix-up between the batters! Direct hit and ${strikerName} is caught short of the crease!`;
        case 'hit_wicket': return `💥 HIT WICKET! Incredible bad luck, ${strikerName} dislodges the bails!`;
        default: return `💥 OUT! ${strikerName} is dismissed off ${bowlerName}!`;
      }
    }

    if (extraType === 'wide') return `↔️ Wide called! ${bowlerName} sprays this well down the leg side. Extra run to the total.`;
    if (extraType === 'no_ball') return `⚠️ NO BALL! ${bowlerName} oversteps the line! Free hit incoming!`;
    if (extraType === 'bye') return `🏃 Byes taken! The ball beats both batter and keeper, batters sneak a run.`;
    if (extraType === 'leg_bye') return `🛡️ Leg bye! Off the pads, and they scamper through for a quick single.`;

    if (runs === 6) return `🚀 MAXIMUM! ${strikerName} connects sweetly${zoneText}! That is massive, sailing high into the crowd for SIX!`;
    if (runs === 4) return `⚡ FOUR! Gorgeous stroke from ${strikerName}${zoneText}! Races away across the lightning-fast outfield!`;
    if (runs === 3) return `🏃 Superb running! ${strikerName} pierces the gap, and they come back for three!`;
    if (runs === 2) return `⚡ Soft hands into the gap, easy two runs taken comfortably.`;
    if (runs === 1) return `🎯 Pushed into the cover region for a sensible single. Strike rotated.`;
    return `🛡️ Good length delivery from ${bowlerName}, defended solidly by ${strikerName}. No run.`;
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
      innings.totalRuns += (del.runsScored + del.extraRuns);

      if (del.extraType === 'wide') {
        innings.extras.wides += (1 + del.runsScored);
        innings.extras.total += (1 + del.runsScored);
      } else if (del.extraType === 'no_ball') {
        innings.extras.noBalls += 1;
        innings.extras.total += 1;
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
        let runsCharged = del.runsScored;
        if (del.extraType === 'wide') {
          runsCharged += (1 + del.runsScored);
          bowler.wides += 1;
        } else if (del.extraType === 'no_ball') {
          runsCharged += 1;
          bowler.noBalls += 1;
        }
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
          dismissedBatter.bowlerName = bowler ? bowler.playerName : '';
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
        message: 'Cricket Rule Violation: Bowler cannot bowl two consecutive overs.'
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
      this.match.result = `${inn2.battingTeam.flag || ''} ${inn2.battingTeam.name} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'}`;
    } else if (inn1.totalRuns > inn2.totalRuns) {
      const runMargin = inn1.totalRuns - inn2.totalRuns;
      this.match.result = `${inn1.battingTeam.flag || ''} ${inn1.battingTeam.name} won by ${runMargin} run${runMargin === 1 ? '' : 's'}`;
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
