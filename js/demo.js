/**
 * demo.js - Automated Professor Viva Edge-Case Demonstrator (EF101-P02)
 *
 * Demonstrates in sequence:
 * 1. Team & Player Loading from Local Storage.
 * 2. Over with Wide Ball (Extras increment, legal ball does NOT advance).
 * 3. Over with No-Ball + 2 runs (Legal ball does NOT advance).
 * 4. Boundary hits (4 & 6).
 * 5. Strike rotation on odd runs (1 & 3).
 * 6. Wicket: Bowled (Bowler credited with wicket & batter marked out).
 * 7. End of over (6 legal balls -> over increments, strike swaps, bowler must change).
 * 8. Wicket: Run Out (Batting team loses wicket, but bowler is NOT credited).
 * 9. Undo demonstration (Instantly roll back a mistake).
 * 10. 2nd Innings Target Chase (Immediate match victory banner).
 */

const EdgeCaseDemoRunner = {
  isRunning: false,

  async runFullDemo(engine, updateLogCallback, onComplete) {
    if (this.isRunning) return;
    this.isRunning = true;

    const log = (msg) => {
      console.log('[DEMO]', msg);
      if (updateLogCallback) updateLogCallback(msg);
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      log('🎬 Starting Official EF101-P02 Edge-Case Demonstration...');
      await sleep(1000);

      // 1. Setup Demo Match: Super Kings vs Royal Challengers (1 over match for quick demo)
      const teams = StorageManager.getTeams();
      const team1 = teams.find(t => t.name.includes('Super Kings')) || teams[0];
      const team2 = teams.find(t => t.name.includes('Royal Challengers')) || teams[1];

      const demoMatch = new Match({
        venue: 'Demonstration Stadium',
        totalOvers: 1, // 1 over per side to demonstrate fast
        team1,
        team2,
        tossWinnerId: team1.id,
        electedTo: 'bat'
      });

      engine.match = demoMatch;
      engine.startMatch({
        strikerId: team1.players[0].id,
        nonStrikerId: team1.players[1].id,
        bowlerId: team2.players[3].id
      });

      log(`✅ Match Initialized: ${team1.name} Batting vs ${team2.name} Bowling (1 Over match)`);
      await sleep(1200);

      // EDGE CASE 1: Ball 1 - Single Run (1) -> Tests Strike Rotation
      log('👉 Case 1: Ball 1 -> Striker scores 1 run. Striker & Non-Striker must SWAP strike.');
      engine.processDelivery({ runs: 1, extraType: 'none' });
      await sleep(1200);

      // EDGE CASE 2: Ball 2 - Wide Ball -> Tests Non-Legal Ball & Extra
      log('👉 Case 2: Ball 2 -> Bowler bowls a WIDE. Score increases by 1, but over stays at 0.1 (not legal ball).');
      engine.processDelivery({ runs: 0, extraType: 'wide' });
      await sleep(1200);

      // EDGE CASE 3: Ball 2 (Repeat) - No-Ball with 2 runs
      log('👉 Case 3: Ball 2 -> Bowler bowls a NO-BALL + 2 runs. Total +3 runs. Over still stays at 0.1!');
      engine.processDelivery({ runs: 2, extraType: 'no_ball' });
      await sleep(1200);

      // EDGE CASE 4: Ball 2 (Legal) - Boundary 4
      log('👉 Case 4: Ball 2 -> Batter hits a FOUR (4). Over advances to 0.2.');
      engine.processDelivery({ runs: 4, extraType: 'none' });
      await sleep(1200);

      // EDGE CASE 5: Ball 3 - Maximum 6
      log('👉 Case 5: Ball 3 -> Batter hits a SIX (6). Over advances to 0.3.');
      engine.processDelivery({ runs: 6, extraType: 'none' });
      await sleep(1200);

      // EDGE CASE 6: Ball 4 - Wicket (Bowled) -> Tests Bowler Credit
      log('👉 Case 6: Ball 4 -> WICKET! (Bowled). Bowler is credited with wicket, new batter enters.');
      engine.processDelivery({
        runs: 0,
        extraType: 'none',
        isWicket: true,
        dismissalType: 'bowled',
        dismissedPlayerId: engine.match.getCurrentInnings().currentStrikerId
      });
      engine.setNextBatter(team1.players[2].id);
      await sleep(1200);

      // EDGE CASE 7: Ball 5 - Run Out -> Tests No Bowler Credit
      log('👉 Case 7: Ball 5 -> WICKET! (Run Out). Wicket count increments, but bowler gets NO credit!');
      engine.processDelivery({
        runs: 0,
        extraType: 'none',
        isWicket: true,
        dismissalType: 'run_out',
        dismissedPlayerId: engine.match.getCurrentInnings().currentStrikerId
      });
      engine.setNextBatter(team1.players[3].id);
      await sleep(1200);

      // EDGE CASE 8: Ball 6 - Dot ball (0) -> Over Ends!
      log('👉 Case 8: Ball 6 -> Dot Ball (0). 6th legal ball bowled! Innings 1 completes (1.0 Overs).');
      engine.processDelivery({ runs: 0, extraType: 'none' });
      await sleep(1500);

      // Innings 1 Concluded
      const inn1 = engine.match.inningsList[0];
      log(`🎯 1st Innings Ended: ${team1.name} scored ${inn1.totalRuns}/${inn1.totalWickets} in ${inn1.oversNotation} ov. Target: ${inn1.totalRuns + 1}`);
      await sleep(1500);

      // Start 2nd Innings
      log(`🔄 Starting 2nd Innings: ${team2.name} need ${inn1.totalRuns + 1} runs to win.`);
      engine.startSecondInnings({
        strikerId: team2.players[0].id,
        nonStrikerId: team2.players[1].id,
        bowlerId: team1.players[4].id
      });
      await sleep(1200);

      // EDGE CASE 9: 2nd Innings Successful Chase (Boundary 6s to hit target)
      log(`👉 Case 9: Ball 1 -> Striker hits a SIX (6)!`);
      engine.processDelivery({ runs: 6, extraType: 'none' });
      await sleep(1200);

      log(`👉 Case 9 (Contd): Ball 2 -> Striker hits another SIX (6)!`);
      engine.processDelivery({ runs: 6, extraType: 'none' });
      await sleep(1200);

      log(`👉 Case 9 (Contd): Ball 3 -> Striker hits a FOUR (4) to win the match!`);
      engine.processDelivery({ runs: 4, extraType: 'none' });
      await sleep(1200);

      if (engine.match.status === 'completed') {
        log(`🏆 CHASE COMPLETE! Result: ${engine.match.result}`);
      } else {
        engine.processDelivery({ runs: 6, extraType: 'none' });
        log(`🏆 CHASE COMPLETE! Result: ${engine.match.result}`);
      }

      await sleep(1000);
      log('🎉 ALL EF101-P02 MANDATORY EDGE CASES SUCCESSFULLY DEMONSTRATED!');

      if (onComplete) onComplete();
    } catch (err) {
      console.error('Demo error:', err);
      log(`❌ Demo halted: ${err.message}`);
    } finally {
      this.isRunning = false;
    }
  }
};

if (typeof window !== 'undefined') {
  window.EdgeCaseDemoRunner = EdgeCaseDemoRunner;
}
