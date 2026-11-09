/**
 * app.js - Main UI Controller for Cricket Match Scoring Application (EF101-P02)
 * Enhanced with Theme Engine, Animations, Live Commentary, and Wagon Wheel.
 */

const App = {
  engine: null,
  activeDismissalType: 'bowled',
  currentShotZone: 'straight',

  init() {
    // 1. Initialize animations & storage
    StorageManager.initDefaults();
    AnimationManager.init();

    // 2. Apply saved theme
    this.initTheme();

    // 3. Load or create default match
    const savedActiveMatch = StorageManager.getActiveMatch();
    if (savedActiveMatch) {
      this.rehydrateMatch(savedActiveMatch);
    } else {
      this.setupDefaultDemoMatch();
    }

    // 4. Register engine callbacks
    this.setupEngineCallbacks();

    // 5. Populate dropdowns and lists
    this.populateSetupTeams();
    this.renderTeamsList();
    this.renderHistoryList();

    // 6. Bind UI event listeners
    this.bindFormEvents();

    // 7. Initial UI Render
    this.updateLiveUI();
  },

  // Initialize and bind Theme Selector
  initTheme() {
    const savedTheme = StorageManager.getTheme();
    document.body.className = savedTheme;
    const selector = document.getElementById('theme-selector');
    if (selector) {
      selector.value = savedTheme;
      selector.addEventListener('change', (e) => {
        const theme = e.target.value;
        document.body.className = theme;
        StorageManager.saveTheme(theme);
      });
    }
  },

  // Set up engine event hooks
  setupEngineCallbacks() {
    this.engine.onStateChanged = (match) => {
      this.updateLiveUI();
      StorageManager.saveActiveMatch(match);
    };

    this.engine.onDeliveryScored = (delivery) => {
      // 1. Trigger Celebrations
      if (delivery.runsScored === 4) {
        AnimationManager.showCelebrationBanner('banner-four', `${delivery.commentary}`);
      } else if (delivery.runsScored === 6) {
        AnimationManager.showCelebrationBanner('banner-six', `${delivery.commentary}`);
      } else if (delivery.isWicket) {
        AnimationManager.showCelebrationBanner('banner-wicket', `${delivery.commentary}`);
      }

      // 2. Add to Commentary Ticker
      this.addCommentaryItem(delivery.commentary);
    };

    this.engine.onPromptNextBowler = () => {
      this.openNextBowlerModal();
    };

    this.engine.onInningsEnded = (innings) => {
      this.openInningsBreakModal(innings);
    };

    this.engine.onMatchEnded = (result) => {
      StorageManager.saveCompletedMatch(this.engine.match);
      AnimationManager.showCelebrationBanner('banner-win', result);
      this.openMatchFinishModal(result);
    };
  },

  // Default match: 🇮🇳 India vs 🇦🇺 Australia at Melbourne Cricket Ground
  setupDefaultDemoMatch() {
    const teams = StorageManager.getTeams();
    const ind = teams.find(t => t.name.includes('India')) || teams[0];
    const aus = teams.find(t => t.name.includes('Australia')) || teams[1];

    const match = new Match({
      venue: 'Melbourne Cricket Ground',
      totalOvers: 2,
      team1: ind,
      team2: aus,
      tossWinnerId: ind.id,
      electedTo: 'bat'
    });

    this.engine = new CricketEngine(match);
    this.engine.startMatch({
      strikerId: ind.players[0].id, // Rohit Sharma
      nonStrikerId: ind.players[2].id, // Virat Kohli
      bowlerId: aus.players[7].id // Pat Cummins
    });
  },

  rehydrateMatch(savedData) {
    const match = new Match({
      id: savedData.id,
      date: savedData.date,
      venue: savedData.venue,
      totalOvers: savedData.totalOvers,
      team1: new Team(savedData.team1.id, savedData.team1.name, savedData.team1.players, savedData.team1.flag, savedData.team1.primaryColor),
      team2: new Team(savedData.team2.id, savedData.team2.name, savedData.team2.players, savedData.team2.flag, savedData.team2.primaryColor),
      tossWinnerId: savedData.tossWinnerId,
      electedTo: savedData.electedTo,
      minTeamSize: savedData.minTeamSize
    });

    match.status = savedData.status;
    match.result = savedData.result;
    match.currentInningsIndex = savedData.currentInningsIndex;

    match.inningsList = savedData.inningsList.map(innData => {
      const inn = new Innings({
        inningsNumber: innData.inningsNumber,
        battingTeam: new Team(innData.battingTeam.id, innData.battingTeam.name, innData.battingTeam.players, innData.battingTeam.flag, innData.battingTeam.primaryColor),
        bowlingTeam: new Team(innData.bowlingTeam.id, innData.bowlingTeam.name, innData.bowlingTeam.players, innData.bowlingTeam.flag, innData.bowlingTeam.primaryColor),
        target: innData.target
      });
      inn.totalRuns = innData.totalRuns;
      inn.totalWickets = innData.totalWickets;
      inn.legalBalls = innData.legalBalls;
      inn.currentStrikerId = innData.currentStrikerId;
      inn.currentNonStrikerId = innData.currentNonStrikerId;
      inn.currentBowlerId = innData.currentBowlerId;
      inn.previousBowlerId = innData.previousBowlerId;
      inn.isCompleted = innData.isCompleted;
      inn.completionReason = innData.completionReason;
      inn.deliveries = (innData.deliveries || []).map(d => new Delivery(d));
      return inn;
    });

    this.engine = new CricketEngine(match);
    const currInn = match.getCurrentInnings();
    if (currInn) {
      this.engine._recomputeInningsState(currInn);
    }
  },

  bindFormEvents() {
    const teamForm = document.getElementById('create-team-form');
    if (teamForm) {
      teamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const flag = document.getElementById('new-team-flag').value.trim() || '🏏';
        const nameInput = document.getElementById('new-team-name');
        const teamName = nameInput.value.trim();
        if (teamName) {
          const newTeam = new Team(null, teamName, [
            new Player(null, 'Captain', 'Batter'),
            new Player(null, 'Opener', 'Batter'),
            new Player(null, 'Ace Bowler', 'Bowler')
          ], flag, '#00e676');
          StorageManager.saveTeam(newTeam);
          nameInput.value = '';
          this.renderTeamsList();
          this.populateSetupTeams();
          alert(`Custom Team "${flag} ${teamName}" created!`);
        }
      });
    }

    const setupForm = document.getElementById('match-setup-form');
    if (setupForm) {
      setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleStartNewMatch();
      });
    }

    const t1Select = document.getElementById('setup-team1');
    const t2Select = document.getElementById('setup-team2');
    if (t1Select && t2Select) {
      t1Select.addEventListener('change', () => this.updateSetupPlayerDropdowns());
      t2Select.addEventListener('change', () => this.updateSetupPlayerDropdowns());
    }

    const btnDemo = document.getElementById('btn-open-demo');
    if (btnDemo) {
      btnDemo.addEventListener('click', () => this.openModal('modal-demo'));
    }
  },

  switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) targetScreen.classList.add('active');

    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const screenIndexMap = {
      'screen-live': 0,
      'screen-setup': 1,
      'screen-teams': 2,
      'screen-scorecard': 3,
      'screen-history': 4
    };
    const idx = screenIndexMap[screenId];
    if (idx !== undefined && navItems[idx]) {
      navItems[idx].classList.add('active');
    }

    if (screenId === 'screen-scorecard') {
      this.renderFullScorecard();
    } else if (screenId === 'screen-history') {
      this.renderHistoryList();
    }
  },

  // ==================== LIVE UI UPDATES ====================

  updateLiveUI() {
    const match = this.engine.match;
    const inn = match.getCurrentInnings();
    if (!inn) return;

    document.getElementById('display-teams-vs').textContent = `${inn.battingTeam.flag || ''} ${inn.battingTeam.name} vs ${inn.bowlingTeam.flag || ''} ${inn.bowlingTeam.name}`;
    document.getElementById('display-venue').textContent = match.venue;
    document.getElementById('display-innings-num').textContent = inn.inningsNumber === 1 ? '1st Innings' : '2nd Innings';

    document.getElementById('display-runs').textContent = inn.totalRuns;
    document.getElementById('display-wickets').textContent = inn.totalWickets;
    document.getElementById('display-overs').textContent = inn.oversNotation;
    document.getElementById('display-total-overs').textContent = match.totalOvers;

    document.getElementById('display-crr').textContent = inn.currentRunRate;

    const rrrContainer = document.getElementById('rr-item-rrr');
    const targetBanner = document.getElementById('target-banner');

    if (inn.inningsNumber === 2 && inn.target) {
      targetBanner.style.display = 'block';
      rrrContainer.style.display = 'block';

      const runsNeeded = Math.max(0, inn.target - inn.totalRuns);
      const totalLegalBalls = match.totalOvers * 6;
      const ballsRemaining = Math.max(0, totalLegalBalls - inn.legalBalls);

      document.getElementById('display-target').textContent = inn.target;
      document.getElementById('display-needs').textContent = `${runsNeeded} needed in ${ballsRemaining} ball${ballsRemaining === 1 ? '' : 's'}`;

      if (ballsRemaining > 0 && runsNeeded > 0) {
        const rrr = ((runsNeeded / ballsRemaining) * 6).toFixed(2);
        document.getElementById('display-rrr').textContent = rrr;
      } else {
        document.getElementById('display-rrr').textContent = '0.00';
      }
    } else {
      targetBanner.style.display = 'none';
      rrrContainer.style.display = 'none';
    }

    this.renderBallPills(inn);
    this.renderCreaseBatters(inn);
    this.renderCurrentBowler(inn);
  },

  renderBallPills(inn) {
    const container = document.getElementById('ball-pills-container');
    container.innerHTML = '';

    const currentOver = Math.floor(inn.legalBalls / 6);
    const deliveriesInThisOver = inn.deliveries.filter(d => d.overNumber === currentOver);

    if (deliveriesInThisOver.length === 0) {
      container.innerHTML = '<span class="ball-pill">•</span>';
      return;
    }

    deliveriesInThisOver.forEach(d => {
      const pill = document.createElement('span');
      pill.className = 'ball-pill';
      pill.textContent = d.getDisplayLabel();

      if (d.isWicket) pill.classList.add('pill-wicket');
      else if (d.runsScored === 4) pill.classList.add('pill-four');
      else if (d.runsScored === 6) pill.classList.add('pill-six');
      else if (d.extraType !== 'none') pill.classList.add('pill-extra');

      container.appendChild(pill);
    });
  },

  renderCreaseBatters(inn) {
    const tbody = document.getElementById('crease-batters-body');
    tbody.innerHTML = '';

    const striker = inn.batterStats[inn.currentStrikerId];
    const nonStriker = inn.batterStats[inn.currentNonStrikerId];

    const renderRow = (batter, isStriker) => {
      if (!batter) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${batter.playerName} ${isStriker ? '<span class="striker-star">★</span>' : ''}</td>
        <td><strong>${batter.runs}</strong></td>
        <td>${batter.ballsFaced}</td>
        <td>${batter.fours}</td>
        <td>${batter.sixes}</td>
        <td>${batter.strikeRate}</td>
      `;
      tbody.appendChild(tr);
    };

    renderRow(striker, true);
    renderRow(nonStriker, false);
  },

  renderCurrentBowler(inn) {
    const nameEl = document.getElementById('display-bowler-name');
    const statsEl = document.getElementById('display-bowler-stats');

    const bowler = inn.bowlerStats[inn.currentBowlerId];
    if (bowler) {
      nameEl.textContent = bowler.playerName;
      statsEl.textContent = `${bowler.oversNotation} - ${bowler.maidens} - ${bowler.runsConceded} - ${bowler.wickets} (${bowler.economyRate})`;
    } else {
      nameEl.textContent = 'Select Next Bowler';
      statsEl.textContent = 'Tap to select';
    }
  },

  addCommentaryItem(text) {
    const feed = document.getElementById('commentary-feed');
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'commentary-item';
    item.textContent = text;
    feed.insertBefore(item, feed.firstChild);
  },

  setShotZone(zone, btn) {
    this.currentShotZone = zone;
    document.querySelectorAll('.shot-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('selected-zone-label').textContent = zone.replace('_', ' ').toUpperCase();
  },

  // ==================== SCORING ACTIONS ====================

  recordBall(runs, extraType = 'none') {
    const inn = this.engine.match.getCurrentInnings();
    if (!inn.currentBowlerId) {
      this.openNextBowlerModal();
      return;
    }

    const result = this.engine.processDelivery({
      runs,
      extraType,
      isWicket: false,
      shotZone: (runs >= 4) ? this.currentShotZone : null
    });

    if (result.overCompleted && !result.inningsEnded && !result.matchEnded) {
      this.openNextBowlerModal();
    }
  },

  undoLastBall() {
    const res = this.engine.undoLastDelivery();
    if (!res.success) {
      alert(res.message);
    } else {
      this.addCommentaryItem(`↩ Undo: Last ball rolled back.`);
    }
  },

  // ==================== WICKET FLOW ====================

  openWicketModal() {
    const inn = this.engine.match.getCurrentInnings();
    if (!inn.currentBowlerId) {
      this.openNextBowlerModal();
      return;
    }

    const outSelect = document.getElementById('wicket-out-player');
    outSelect.innerHTML = '';

    const striker = inn.batterStats[inn.currentStrikerId];
    const nonStriker = inn.batterStats[inn.currentNonStrikerId];

    if (striker) outSelect.innerHTML += `<option value="${striker.playerId}">${striker.playerName} (Striker)</option>`;
    if (nonStriker) outSelect.innerHTML += `<option value="${nonStriker.playerId}">${nonStriker.playerName} (Non-Striker)</option>`;

    const nextSelect = document.getElementById('wicket-next-batter');
    nextSelect.innerHTML = '';

    const alreadyBattedIds = Object.keys(inn.batterStats).filter(id => {
      const b = inn.batterStats[id];
      return b.isOut || id === inn.currentStrikerId || id === inn.currentNonStrikerId;
    });

    const availablePlayers = inn.battingTeam.players.filter(p => !alreadyBattedIds.includes(p.id));

    if (availablePlayers.length === 0) {
      nextSelect.innerHTML = `<option value="">No more batters (Innings ends)</option>`;
    } else {
      availablePlayers.forEach(p => {
        nextSelect.innerHTML += `<option value="${p.id}">${p.name} (${p.role})</option>`;
      });
    }

    document.getElementById('wicket-runs').value = '0';
    this.openModal('modal-wicket');
  },

  selectDismissalType(type, btn) {
    this.activeDismissalType = type;
    document.querySelectorAll('.dismissal-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  },

  confirmWicket() {
    const outPlayerId = document.getElementById('wicket-out-player').value;
    const nextBatterId = document.getElementById('wicket-next-batter').value;
    const runs = parseInt(document.getElementById('wicket-runs').value, 10) || 0;

    const result = this.engine.processDelivery({
      runs,
      extraType: 'none',
      isWicket: true,
      dismissalType: this.activeDismissalType,
      dismissedPlayerId: outPlayerId
    });

    this.closeModal('modal-wicket');

    if (!result.inningsEnded && !result.matchEnded) {
      if (nextBatterId) {
        this.engine.setNextBatter(nextBatterId);
      }
      if (result.overCompleted) {
        this.openNextBowlerModal();
      }
    }
  },

  // ==================== BOWLER SELECTION FLOW ====================

  openNextBowlerModal() {
    const inn = this.engine.match.getCurrentInnings();
    if (!inn) return;

    const select = document.getElementById('next-bowler-select');
    select.innerHTML = '';

    const availableBowlers = inn.bowlingTeam.players.filter(p => p.id !== inn.previousBowlerId);

    availableBowlers.forEach(p => {
      select.innerHTML += `<option value="${p.id}">${p.name} (${p.role})</option>`;
    });

    this.openModal('modal-bowler');
  },

  confirmNextBowler() {
    const bowlerId = document.getElementById('next-bowler-select').value;
    if (!bowlerId) return;

    const res = this.engine.setNextBowler(bowlerId);
    if (!res.success) {
      alert(res.message);
      return;
    }
    this.closeModal('modal-bowler');
  },

  // ==================== INNINGS & MATCH TRANSITIONS ====================

  openInningsBreakModal(inn1) {
    const summary = `${inn1.battingTeam.flag || ''} ${inn1.battingTeam.name} scored ${inn1.totalRuns}/${inn1.totalWickets} in ${inn1.oversNotation} overs.<br>
      <strong>Target for ${inn1.bowlingTeam.flag || ''} ${inn1.bowlingTeam.name}: ${inn1.totalRuns + 1} runs</strong> in ${this.engine.match.totalOvers} overs.`;
    document.getElementById('innings-break-summary').innerHTML = summary;

    const battingTeam2 = inn1.bowlingTeam;
    const bowlingTeam2 = inn1.battingTeam;

    const s1 = document.getElementById('inn2-striker');
    const s2 = document.getElementById('inn2-non-striker');
    const b = document.getElementById('inn2-bowler');

    s1.innerHTML = '';
    s2.innerHTML = '';
    b.innerHTML = '';

    battingTeam2.players.forEach((p, idx) => {
      s1.innerHTML += `<option value="${p.id}" ${idx === 0 ? 'selected' : ''}>${p.name}</option>`;
      s2.innerHTML += `<option value="${p.id}" ${idx === 1 ? 'selected' : ''}>${p.name}</option>`;
    });

    bowlingTeam2.players.forEach((p, idx) => {
      b.innerHTML += `<option value="${p.id}" ${idx === 0 ? 'selected' : ''}>${p.name}</option>`;
    });

    this.openModal('modal-innings-break');
  },

  confirmStartSecondInnings() {
    const strikerId = document.getElementById('inn2-striker').value;
    const nonStrikerId = document.getElementById('inn2-non-striker').value;
    const bowlerId = document.getElementById('inn2-bowler').value;

    if (strikerId === nonStrikerId) {
      alert('Striker and Non-Striker cannot be the same player!');
      return;
    }

    this.engine.startSecondInnings({ strikerId, nonStrikerId, bowlerId });
    this.closeModal('modal-innings-break');
  },

  openMatchFinishModal(resultText) {
    document.getElementById('match-finish-result').textContent = resultText;
    this.openModal('modal-match-finish');
  },

  // ==================== MATCH SETUP & RANDOMIZER ====================

  populateSetupTeams() {
    const teams = StorageManager.getTeams();
    const t1 = document.getElementById('setup-team1');
    const t2 = document.getElementById('setup-team2');
    if (!t1 || !t2) return;

    t1.innerHTML = '';
    t2.innerHTML = '';

    teams.forEach((team, idx) => {
      t1.innerHTML += `<option value="${team.id}" ${idx === 0 ? 'selected' : ''}>${team.flag || '🏏'} ${team.name} (${team.players.length} players)</option>`;
      t2.innerHTML += `<option value="${team.id}" ${idx === 1 ? 'selected' : ''}>${team.flag || '🏏'} ${team.name} (${team.players.length} players)</option>`;
    });

    this.updateSetupPlayerDropdowns();
  },

  randomizeMatchSetup() {
    const teams = StorageManager.getTeams();
    if (teams.length < 2) return;
    const idx1 = Math.floor(Math.random() * teams.length);
    let idx2 = Math.floor(Math.random() * teams.length);
    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * teams.length);
    }
    document.getElementById('setup-team1').value = teams[idx1].id;
    document.getElementById('setup-team2').value = teams[idx2].id;
    this.updateSetupPlayerDropdowns();
  },

  updateSetupPlayerDropdowns() {
    const teams = StorageManager.getTeams();
    const t1Id = document.getElementById('setup-team1').value;
    const t2Id = document.getElementById('setup-team2').value;

    const team1 = teams.find(t => t.id === t1Id);
    const team2 = teams.find(t => t.id === t2Id);

    const strikerSelect = document.getElementById('setup-striker');
    const nonStrikerSelect = document.getElementById('setup-non-striker');
    const bowlerSelect = document.getElementById('setup-bowler');

    if (strikerSelect && team1) {
      strikerSelect.innerHTML = '';
      team1.players.forEach((p, i) => {
        strikerSelect.innerHTML += `<option value="${p.id}" ${i === 0 ? 'selected' : ''}>${p.name}</option>`;
      });
    }

    if (nonStrikerSelect && team1) {
      nonStrikerSelect.innerHTML = '';
      team1.players.forEach((p, i) => {
        nonStrikerSelect.innerHTML += `<option value="${p.id}" ${i === 1 ? 'selected' : ''}>${p.name}</option>`;
      });
    }

    if (bowlerSelect && team2) {
      bowlerSelect.innerHTML = '';
      team2.players.forEach((p, i) => {
        bowlerSelect.innerHTML += `<option value="${p.id}" ${i === 0 ? 'selected' : ''}>${p.name}</option>`;
      });
    }
  },

  handleStartNewMatch() {
    const teams = StorageManager.getTeams();
    const t1Id = document.getElementById('setup-team1').value;
    const t2Id = document.getElementById('setup-team2').value;

    if (t1Id === t2Id) {
      alert('Please select two distinct teams.');
      return;
    }

    const team1 = teams.find(t => t.id === t1Id);
    const team2 = teams.find(t => t.id === t2Id);

    if (team1.players.length < 2 || team2.players.length < 2) {
      alert('Both teams must have at least 2 players.');
      return;
    }

    const strikerId = document.getElementById('setup-striker').value;
    const nonStrikerId = document.getElementById('setup-non-striker').value;
    const bowlerId = document.getElementById('setup-bowler').value;

    if (strikerId === nonStrikerId) {
      alert('Striker and Non-Striker cannot be the same player.');
      return;
    }

    const overs = parseInt(document.getElementById('setup-overs').value, 10) || 5;
    const venue = document.getElementById('setup-venue').value.trim() || 'Melbourne Cricket Ground';
    const tossWinnerTeam = document.getElementById('setup-toss-winner').value === 'team1' ? team1.id : team2.id;
    const electedTo = document.getElementById('setup-elected-to').value;

    const match = new Match({
      venue,
      totalOvers: overs,
      team1,
      team2,
      tossWinnerId: tossWinnerTeam,
      electedTo
    });

    this.engine = new CricketEngine(match);
    this.setupEngineCallbacks();
    this.engine.startMatch({ strikerId, nonStrikerId, bowlerId });

    StorageManager.clearActiveMatch();
    StorageManager.saveActiveMatch(match);

    this.switchScreen('screen-live');
  },

  // ==================== TEAMS & SQUAD CUSTOMIZATION ====================

  renderTeamsList() {
    const container = document.getElementById('saved-teams-list');
    if (!container) return;

    const teams = StorageManager.getTeams();
    container.innerHTML = '';

    teams.forEach(team => {
      const card = document.createElement('div');
      card.className = 'stats-card';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: var(--primary); font-size: 0.95rem;">${team.flag || '🏏'} ${team.name}</strong>
          <button class="btn-secondary" style="color: var(--danger); padding: 3px 6px; font-size: 0.72rem;" onclick="App.deleteTeam('${team.id}')">Delete</button>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px;">
          Playing Squad (${team.players.length} players):
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
          ${team.players.map(p => `<span style="background: var(--surface-light); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;">${p.name} <small style="color: var(--accent);">(${p.role})</small></span>`).join('')}
        </div>
        <div style="display: flex; gap: 6px; margin-top: 6px;">
          <input type="text" id="add-player-name-${team.id}" class="form-input" placeholder="Add player" style="flex: 1; padding: 6px 8px; font-size: 0.76rem;">
          <select id="add-player-role-${team.id}" class="form-select" style="padding: 6px 6px; font-size: 0.76rem;">
            <option value="Batter">Batter</option>
            <option value="Bowler">Bowler</option>
            <option value="All-Rounder">All-Rounder</option>
            <option value="Wicketkeeper">Wicketkeeper</option>
          </select>
          <button class="btn-secondary" style="padding: 6px 10px;" onclick="App.addPlayerToTeam('${team.id}')">+ Add</button>
        </div>
      `;
      container.appendChild(card);
    });
  },

  generateAndAddRandomTeam() {
    const randomTeam = StorageManager.generateRandomTeam();
    StorageManager.saveTeam(randomTeam);
    this.renderTeamsList();
    this.populateSetupTeams();
    alert(`🎉 Generated Squad: "${randomTeam.flag} ${randomTeam.name}" with 7 players!`);
  },

  resetToInternationalPresets() {
    if (confirm('Reset teams to the 10 official international teams?')) {
      StorageManager.saveTeams(StorageManager.getInternationalPresetTeams());
      this.renderTeamsList();
      this.populateSetupTeams();
      alert('10 International Teams restored!');
    }
  },

  addPlayerToTeam(teamId) {
    const nameInput = document.getElementById(`add-player-name-${teamId}`);
    const roleSelect = document.getElementById(`add-player-role-${teamId}`);
    const playerName = nameInput.value.trim();

    if (!playerName) return;

    const teams = StorageManager.getTeams();
    const team = teams.find(t => t.id === teamId);
    if (team) {
      team.addPlayer(new Player(null, playerName, roleSelect.value));
      StorageManager.saveTeam(team);
      this.renderTeamsList();
      this.populateSetupTeams();
    }
  },

  deleteTeam(teamId) {
    if (confirm('Are you sure you want to delete this team?')) {
      StorageManager.deleteTeam(teamId);
      this.renderTeamsList();
      this.populateSetupTeams();
    }
  },

  // ==================== SCORECARD, MVP & WAGON WHEEL ====================

  renderFullScorecard() {
    const container = document.getElementById('scorecard-container');
    const mvpContainer = document.getElementById('mvp-award-container');
    if (!container) return;

    const match = this.engine.match;
    container.innerHTML = '';
    mvpContainer.innerHTML = '';

    // Render MVP if match has ended
    if (match.status === 'completed') {
      const mvp = match.getPlayerOfTheMatch();
      if (mvp) {
        mvpContainer.innerHTML = `
          <div class="mvp-trophy-card">
            <span style="font-size: 2rem;">🌟</span>
            <div style="font-size: 0.76rem; color: #ffd700; font-weight: 800; letter-spacing: 0.5px;">PLAYER OF THE MATCH</div>
            <div class="mvp-player-name">${mvp.name} (${mvp.teamName})</div>
            <div style="font-size: 0.78rem; color: #fff;">
              ${mvp.runs > 0 ? `🏏 ${mvp.runs} runs (${mvp.balls}b) ` : ''}
              ${mvp.wickets > 0 ? `🎯 ${mvp.wickets} wkts for ${mvp.runsConceded} runs (${mvp.overs} ov)` : ''}
            </div>
          </div>
        `;
      }
    }

    if (match.result) {
      const banner = document.createElement('div');
      banner.className = 'target-badge';
      banner.style.fontSize = '0.95rem';
      banner.style.padding = '10px';
      banner.innerHTML = `🏆 <strong>${match.result}</strong>`;
      container.appendChild(banner);
    }

    // Render Wagon Wheel Boundary Rays
    this.renderWagonWheelGraphic(match);

    match.inningsList.forEach(inn => {
      const innCard = document.createElement('div');
      innCard.className = 'innings-block';

      let battingRows = '';
      Object.values(inn.batterStats).forEach(b => {
        battingRows += `
          <tr>
            <td>${b.playerName}</td>
            <td style="color: var(--text-muted); font-size: 0.7rem;">${b.isOut ? `${b.dismissalInfo} b ${b.bowlerName}` : 'not out'}</td>
            <td><strong>${b.runs}</strong></td>
            <td>${b.ballsFaced}</td>
            <td>${b.fours}</td>
            <td>${b.sixes}</td>
            <td>${b.strikeRate}</td>
          </tr>
        `;
      });

      let bowlingRows = '';
      Object.values(inn.bowlerStats).forEach(b => {
        bowlingRows += `
          <tr>
            <td>${b.playerName}</td>
            <td>${b.oversNotation}</td>
            <td>${b.maidens}</td>
            <td>${b.runsConceded}</td>
            <td><strong>${b.wickets}</strong></td>
            <td>${b.economyRate}</td>
          </tr>
        `;
      });

      innCard.innerHTML = `
        <div class="innings-title">
          ${inn.battingTeam.flag || ''} ${inn.battingTeam.name} Innings: ${inn.totalRuns}/${inn.totalWickets} (${inn.oversNotation} Ov)
        </div>
        <h4 style="font-size: 0.78rem; color: var(--text-muted); margin: 6px 0;">Batting</h4>
        <div class="table-responsive">
          <table class="stat-table">
            <thead>
              <tr>
                <th>Batter</th><th>Dismissal</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th>
              </tr>
            </thead>
            <tbody>${battingRows}</tbody>
          </table>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin: 6px 0;">
          Extras: <strong>${inn.extras.total}</strong> (wd ${inn.extras.wides}, nb ${inn.extras.noBalls}, b ${inn.extras.byes}, lb ${inn.extras.legByes})
        </div>
        <h4 style="font-size: 0.78rem; color: var(--text-muted); margin: 8px 0 4px 0;">Bowling</h4>
        <div class="table-responsive">
          <table class="stat-table">
            <thead>
              <tr>
                <th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th>
              </tr>
            </thead>
            <tbody>${bowlingRows}</tbody>
          </table>
        </div>
      `;
      container.appendChild(innCard);
    });
  },

  renderWagonWheelGraphic(match) {
    const wheel = document.getElementById('wagon-wheel-graphic');
    if (!wheel) return;

    // Remove old rays except pitch
    wheel.querySelectorAll('.wagon-ray').forEach(r => r.remove());

    const zoneAngles = {
      'cover': 315,
      'straight': 0,
      'midwicket': 45,
      'point': 270,
      'long_on': 30,
      'fine_leg': 120,
      'third_man': 240
    };

    let count = 0;
    match.inningsList.forEach(inn => {
      inn.deliveries.forEach(d => {
        if (d.runsScored >= 4) {
          count++;
          const angle = zoneAngles[d.shotZone] !== undefined ? zoneAngles[d.shotZone] : Math.floor(Math.random() * 360);
          const ray = document.createElement('div');
          ray.className = 'wagon-ray';
          ray.style.position = 'absolute';
          ray.style.width = '2px';
          ray.style.height = '85px';
          ray.style.background = d.runsScored === 6 ? '#ffd700' : '#2979ff';
          ray.style.transformOrigin = 'bottom center';
          ray.style.bottom = '50%';
          ray.style.left = '50%';
          ray.style.transform = `translateX(-50%) rotate(${angle}deg)`;
          ray.title = `${d.runsScored} runs (${d.shotZone || 'zone'})`;
          wheel.appendChild(ray);
        }
      });
    });

    document.getElementById('wagon-wheel-legend').textContent =
      count > 0 ? `Visualizing ${count} boundary shots (Blue: 4s, Gold: 6s)` : `No boundary shots recorded yet.`;
  },

  exportScorecard() {
    const match = this.engine.match;
    let report = `🏏 CRICSCORER PRO - OFFICIAL SCORECARD\n`;
    report += `Venue: ${match.venue} | Date: ${match.date}\n`;
    report += `Format: ${match.totalOvers} Overs\n`;
    if (match.result) report += `Result: ${match.result}\n\n`;

    match.inningsList.forEach(inn => {
      report += `--- ${inn.battingTeam.flag || ''} ${inn.battingTeam.name} (${inn.totalRuns}/${inn.totalWickets}, ${inn.oversNotation} Ov) ---\n`;
      report += `Extras: ${inn.extras.total} (Wd: ${inn.extras.wides}, Nb: ${inn.extras.noBalls}, B: ${inn.extras.byes}, Lb: ${inn.extras.legByes})\n\n`;
      report += `BATTERS:\n`;
      Object.values(inn.batterStats).forEach(b => {
        report += `${b.playerName}: ${b.runs} (${b.ballsFaced}b, 4s:${b.fours}, 6s:${b.sixes}, SR:${b.strikeRate})\n`;
      });
      report += `\nBOWLERS:\n`;
      Object.values(inn.bowlerStats).forEach(b => {
        report += `${b.playerName}: ${b.oversNotation} Ov, ${b.runsConceded} Runs, ${b.wickets} Wkts (Econ ${b.economyRate})\n`;
      });
      report += `\n`;
    });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(report).then(() => {
        alert('Scorecard copied to clipboard! Paste and share via WhatsApp or Email.');
      }).catch(() => alert(report));
    } else {
      alert(report);
    }
  },

  renderHistoryList() {
    const container = document.getElementById('history-list');
    if (!container) return;

    const matches = StorageManager.getCompletedMatches();
    container.innerHTML = '';

    if (matches.length === 0) {
      container.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-muted);">No archived matches found.</p>';
      return;
    }

    matches.forEach(m => {
      const card = document.createElement('div');
      card.className = 'stats-card';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
          <strong style="color: var(--primary);">${m.team1.flag || ''} ${m.team1.name} vs ${m.team2.flag || ''} ${m.team2.name}</strong>
          <span style="font-size: 0.72rem; color: var(--text-muted);">${m.date}</span>
        </div>
        <p style="font-size: 0.8rem; color: #fff; margin: 4px 0;">${m.result || 'Completed'}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
          <span style="font-size: 0.75rem; color: var(--accent);">${m.venue} (${m.totalOvers} ov)</span>
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="App.reopenPastMatch('${m.id}')">View Scorecard</button>
        </div>
      `;
      container.appendChild(card);
    });
  },

  reopenPastMatch(matchId) {
    const matches = StorageManager.getCompletedMatches();
    const target = matches.find(m => m.id === matchId);
    if (target) {
      this.rehydrateMatch(target);
      this.switchScreen('screen-scorecard');
    }
  },

  triggerEdgeCaseDemo() {
    const consoleLog = document.getElementById('demo-console-log');
    consoleLog.textContent = '';
    const runBtn = document.getElementById('btn-start-demo-run');
    runBtn.disabled = true;

    EdgeCaseDemoRunner.runFullDemo(
      this.engine,
      (msg) => {
        consoleLog.textContent += msg + '\n';
        consoleLog.scrollTop = consoleLog.scrollHeight;
        this.updateLiveUI();
      },
      () => {
        runBtn.disabled = false;
        setTimeout(() => {
          this.closeModal('modal-demo');
          this.switchScreen('screen-scorecard');
        }, 2000);
      }
    );
  },

  openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('active');
  },

  closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('active');
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
