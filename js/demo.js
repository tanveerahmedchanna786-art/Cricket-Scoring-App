/**
 * demo.js - Automated Professor Viva Edge-Case Demonstrator (EF101-P02)
 * Features 🇮🇳 India vs 🇦🇺 Australia with live commentary, wagon wheel, & animations
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

      // 1. Setup International Match: 🇮🇳 India vs 🇦🇺 Australia
      const teams = StorageManager.getTeams();
      const team1 = teams.find(t => t.name.includes('India')) || teams[0];
      const team2 = teams.find(t => t.name.includes('Australia')) || teams[1];

      const demoMatch = new Match({
        venue: 'Melbourne Cricket Ground',
        totalOvers: 1, // 1 over match for ultra-fast demo
        team1,
        team2,
        tossWinnerId: team1.id,
        electedTo: 'bat'
      });

      engine.match = demoMatch;
      engine.startMatch({
        strikerId: team1.players[0].id, // Rohit Sharma
        nonStrikerId: team1.players[2].id, // Virat Kohli
        bowlerId: team2.players[7].id // Pat Cummins
      });

      log(`✅ Match Initialized: ${team1.flag} ${team1.name} Batting vs ${team2.flag} ${team2.name} Bowling (1 Over match)`);
      await sleep(1200);

      // EDGE CASE 1: Ball 1 - Single Run (1) -> Tests Strike Rotation
      log('👉 Case 1: Ball 1 -> Striker pushes for 1 run. Rohit & Kohli SWAP strike!');
      engine.processDelivery({ runs: 1, extraType: 'none', shotZone: 'cover' });
      await sleep(1200);

      // EDGE CASE 2: Ball 2 - Wide Ball -> Tests Non-Legal Ball & Extra
      log('👉 Case 2: Ball 2 -> Bowler sprays a WIDE. Total +1 run, but over remains at 0.1 (not legal ball).');
      engine.processDelivery({ runs: 0, extraType: 'wide' });
      await sleep(1200);

      // EDGE CASE 3: Ball 2 (Repeat) - No-Ball with 2 runs
      log('👉 Case 3: Ball 2 -> Bowler bowls a NO-BALL + 2 runs. Total +3 runs. Over still remains at 0.1!');
      engine.processDelivery({ runs: 2, extraType: 'no_ball', shotZone: 'midwicket' });
      await sleep(1200);

      // EDGE CASE 4: Ball 2 (Legal) - Boundary 4
      log('👉 Case 4: Ball 2 -> Gorgeous stroke for FOUR (4)! Celebration banner & confetti triggered.');
      engine.processDelivery({ runs: 4, extraType: 'none', shotZone: 'cover' });
      await sleep(1200);

      // EDGE CASE 5: Ball 3 - Maximum 6
      log('👉 Case 5: Ball 3 -> High into the stands for SIX (6)! Over advances to 0.3.');
      engine.processDelivery({ runs: 6, extraType: 'none', shotZone: 'long_on' });
      await sleep(1200);

      // EDGE CASE 6: Ball 4 - Wicket (Bowled) -> Tests Bowler Credit
      log('👉 Case 6: Ball 4 -> WICKET! (Bowled). Bowler Cummins credited, screen shake animation!');
      engine.processDelivery({
        runs: 0,
        extraType: 'none',
        isWicket: true,
        dismissalType: 'bowled',
        dismissedPlayerId: engine.match.getCurrentInnings().currentStrikerId
      });
      engine.setNextBatter(team1.players[3].id); // Suryakumar Yadav enters
      await sleep(1200);

      // EDGE CASE 7: Ball 5 - Run Out -> Tests No Bowler Credit
      log('👉 Case 7: Ball 5 -> WICKET! (Run Out). Wicket lost, but bowler Cummins gets NO credit!');
      engine.processDelivery({
        runs: 0,
        extraType: 'none',
        isWicket: true,
        dismissalType: 'run_out',
        dismissedPlayerId: engine.match.getCurrentInnings().currentStrikerId
      });
      engine.setNextBatter(team1.players[4].id); // Hardik Pandya enters
      await sleep(1200);

      // EDGE CASE 8: Ball 6 - Dot ball (0) -> Over Ends!
      log('👉 Case 8: Ball 6 -> Dot Ball (0). Exactly 6 legal balls completed! 1st Innings concluded (1.0 Overs).');
      engine.processDelivery({ runs: 0, extraType: 'none', shotZone: 'straight' });
      await sleep(1500);

      // Innings 1 Concluded
      const inn1 = engine.match.inningsList[0];
      log(`🎯 1st Innings Ended: ${team1.name} scored ${inn1.totalRuns}/${inn1.totalWickets} in ${inn1.oversNotation} ov. Target: ${inn1.totalRuns + 1}`);
      await sleep(1500);

      // Start 2nd Innings: 🇦🇺 Australia chasing
      log(`🔄 Starting 2nd Innings: ${team2.name} need ${inn1.totalRuns + 1} runs in 1 over.`);
      engine.startSecondInnings({
        strikerId: team2.players[0].id, // Travis Head
        nonStrikerId: team2.players[1].id, // David Warner
        bowlerId: team1.players[7].id // Jasprit Bumrah
      });
      await sleep(1200);

      // EDGE CASE 9: 2nd Innings Successful Chase (Head & Warner hit boundaries)
      log(`👉 Case 9: Ball 1 -> Travis Head smashes a SIX (6)!`);
      engine.processDelivery({ runs: 6, extraType: 'none', shotZone: 'midwicket' });
      await sleep(1200);

      log(`👉 Case 9 (Contd): Ball 2 -> Travis Head hits another SIX (6)!`);
      engine.processDelivery({ runs: 6, extraType: 'none', shotZone: 'long_on' });
      await sleep(1200);

      log(`👉 Case 9 (Contd): Ball 3 -> Travis Head hits a FOUR (4) to chase the target!`);
      engine.processDelivery({ runs: 4, extraType: 'none', shotZone: 'point' });
      await sleep(1200);

      if (engine.match.status !== 'completed') {
        engine.processDelivery({ runs: 6, extraType: 'none', shotZone: 'straight' });
      }

      log(`🏆 CHASE COMPLETE! Result: ${engine.match.result}`);
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
