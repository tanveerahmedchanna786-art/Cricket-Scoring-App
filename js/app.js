/**
 * app.js - Main UI Controller for Cricket Match Scoring Application (EF101-P02)
 */

const App = {
  engine: null,
  activeDismissalType: 'bowled',
  pendingBoundaryRuns: 0,

  init() {
    StorageManager.initDefaults();

    const savedActiveMatch = StorageManager.getActiveMatch();
    if (savedActiveMatch) {
      this.rehydrateMatch(savedActiveMatch);
    } else {
      this.setupDefaultDemoMatch();
    }

    this.setupEngineCallbacks();

    this.populateSetupTeams();
    this.renderTeamsList();
    this.renderCareerStats();
    this.renderHistoryList();

    this.bindFormEvents();

    this.updateLiveUI();
  },

  setupEngineCallbacks() {
    this.engine.onStateChanged = (match) => {
      this.updateLiveUI();
      StorageManager.saveActiveMatch(match);
    };

    this.engine.onPromptNextBowler = () => {
      this.openNextBowlerModal();
    };

    this.engine.onInningsEnded = (innings) => {
      this.openInningsBreakModal(innings);
    };

    this.engine.onMatchEnded = (result) => {
      StorageManager.saveCompletedMatch(this.engine.match);
      this.renderCareerStats();
      this.openMatchFinishModal(result);
    };
  },

  setupDefaultDemoMatch() {
    const teams = StorageManager.getTeams();
    const team1 = teams[0];
    const team2 = teams[1];

    const match = new Match({
      venue: 'National Stadium',
      totalOvers: 5,
      format: 'Custom',
      team1,
      team2,
      tossWinnerId: team1.id,
      electedTo: 'bat'
    });

    this.engine = new CricketEngine(match);
    this.engine.startMatch({
      strikerId: team1.players[0].id,
      nonStrikerId: team1.players[1].id,
      bowlerId: team2.players[3].id
    });
  },

  rehydrateMatch(savedData) {
    const match = new Match({
      id: savedData.id,
      date: savedData.date,
      venue: savedData.venue,
      totalOvers: savedData.totalOvers,
      format: savedData.format || 'Custom',
      team1: new Team(savedData.team1.id, savedData.team1.name, savedData.team1.players),
      team2: new Team(savedData.team2.id, savedData.team2.name, savedData.team2.players),
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
        battingTeam: new Team(innData.battingTeam.id, innData.battingTeam.name, innData.battingTeam.players),
        bowlingTeam: new Team(innData.bowlingTeam.id, innData.bowlingTeam.name, innData.bowlingTeam.players),
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
        const nameInput = document.getElementById('new-team-name');
        const teamName = nameInput.value.trim();
        if (teamName) {
          const newTeam = new Team(null, teamName, [
            new Player(null, 'Player 1', 'Batter'),
            new Player(null, 'Player 2', 'Batter')
          ]);
          StorageManager.saveTeam(newTeam);
          nameInput.value = '';
          this.renderTeamsList();
          this.populateSetupTeams();
          this.renderCareerStats();
          alert(`Team "${teamName}" created with 2 starter players! Add more players below.`);
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
    if (t1Select) t1Select.addEventListener('change', () => this.updateSetupPlayerDropdowns());
    if (t2Select) t2Select.addEventListener('change', () => this.updateSetupPlayerDropdowns());

    const btnQuick = document.getElementById('btn-quick-new-match');
    if (btnQuick) btnQuick.addEventListener('click', () => this.switchScreen('screen-setup'));

    const btnDemo = document.getElementById('btn-open-demo');
    if (btnDemo) btnDemo.addEventListener('click', () => this.openModal('modal-demo'));
  },

  handleFormatChange() {
    const format = document.getElementById('setup-format').value;
    const oversInput = document.getElementById('setup-overs');
    if (format === 'T20') oversInput.value = 20;
    else if (format === 'ODI') oversInput.value = 50;
    else oversInput.value = 5;
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
    if (idx !== undefined && navItems[idx]) navItems[idx].classList.add('active');

    if (screenId === 'screen-scorecard') this.renderFullScorecard();
    else if (screenId === 'screen-history') this.renderHistoryList();
    else if (screenId === 'screen-teams') this.renderCareerStats();
  },

  updateLiveUI() {
    const match = this.engine.match;
    const inn = match.getCurrentInnings();
    if (!inn) return;

    document.getElementById('display-teams-vs').textContent = `${inn.battingTeam.name} vs ${inn.bowlingTeam.name}`;
    document.getElementById('display-venue').textContent = match.venue;
    document.getElementById('display-innings-num').textContent = inn.inningsNumber === 1 ? '1st Innings' : '2nd Innings';
    document.getElementById('display-format-tag').textContent = match.format || 'Custom';

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
    this.renderWagonWheel(inn);
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

  renderWagonWheel(inn) {
    const group = document.getElementById('wagon-shots-group');
    const countEl = document.getElementById('wagon-wheel-count');
    if (!group) return;

    group.innerHTML = '';
    const boundaryDeliveries = inn.deliveries.filter(d => (d.runsScored === 4 || d.runsScored === 6) && d.shotAngle !== null);
    countEl.textContent = `${boundaryDeliveries.length} Boundaries`;

    boundaryDeliveries.forEach(d => {
      const angleRad = (d.shotAngle - 90) * (Math.PI / 180);
      const radius = d.runsScored === 6 ? 88 : 70;
      const x2 = 100 + radius * Math.cos(angleRad);
      const y2 = 100 + radius * Math.sin(angleRad);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '100');
      line.setAttribute('y1', '100');
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('stroke', d.runsScored === 6 ? '#ff5252' : '#40c4ff');
      line.setAttribute('stroke-width', '2.5');

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x2);
      dot.setAttribute('cy', y2);
      dot.setAttribute('r', '3');
      dot.setAttribute('fill', d.runsScored === 6 ? '#ff5252' : '#40c4ff');

      group.appendChild(line);
      group.appendChild(dot);
    });
  },

  recordBall(runs, extraType = 'none', shotAngle = null) {
    const inn = this.engine.match.getCurrentInnings();
    if (!inn.currentBowlerId) {
      this.openNextBowlerModal();
      return;
    }

    const result = this.engine.processDelivery({
      runs,
      extraType,
      isWicket: false,
      shotAngle
    });

    if (result.overCompleted && !result.inningsEnded && !result.matchEnded) {
      this.openNextBowlerModal();
    }
  },

  recordBallWithDirection(runs) {
    const inn = this.engine.match.getCurrentInnings();
    if (!inn.currentBowlerId) {
      this.openNextBowlerModal();
      return;
    }
    this.pendingBoundaryRuns = runs;
    this.openModal('modal-shot-direction');
  },

  confirmShotDirection(angle) {
    this.closeModal('modal-shot-direction');
    this.recordBall(this.pendingBoundaryRuns, 'none', angle);
  },

  undoLastBall() {
    const res = this.engine.undoLastDelivery();
    if (!res.success) alert(res.message);
  },

  openExtraModal() {
    const inn = this.engine.match.getCurrentInnings();
    if (!inn.currentBowlerId) {
      this.openNextBowlerModal();
      return;
    }
    this.openModal('modal-custom-extra');
  },

  confirmCustomExtra() {
    const extraType = document.getElementById('custom-extra-type').value;
    const runs = parseInt(document.getElementById('custom-extra-runs').value, 10) || 0;

    const result = this.engine.processDelivery({
      runs,
      extraType,
      isWicket: false
    });

    this.closeModal('modal-custom-extra');

    if (result.overCompleted && !result.inningsEnded && !result.matchEnded) {
      this.openNextBowlerModal();
    }
  },

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
      if (nextBatterId) this.engine.setNextBatter(nextBatterId);
      if (result.overCompleted) this.openNextBowlerModal();
    }
  },

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

  openInningsBreakModal(inn1) {
    const summary = `${inn1.battingTeam.name} scored ${inn1.totalRuns}/${inn1.totalWickets} in ${inn1.oversNotation} overs.<br>
      <strong>Target for ${inn1.bowlingTeam.name}: ${inn1.totalRuns + 1} runs</strong> in ${this.engine.match.totalOvers} overs.`;
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

  openDlsModal() {
    const inn1 = this.engine.match.inningsList[0];
    if (inn1) {
      document.getElementById('dls-inn1-score').value = inn1.totalRuns;
      document.getElementById('dls-total-overs').value = this.engine.match.totalOvers;
    }
    this.openModal('modal-dls');
  },

  calculateDlsTarget() {
    const s1 = parseInt(document.getElementById('dls-inn1-score').value, 10) || 100;
    const totalOvers = parseInt(document.getElementById('dls-total-overs').value, 10) || 20;
    const revisedOvers = parseInt(document.getElementById('dls-revised-overs').value, 10) || 10;
    const wicketsLost = parseInt(document.getElementById('dls-wickets-lost').value, 10) || 0;

    const resourceRemainingPct = Math.max(10, (revisedOvers / totalOvers) * (1 - wicketsLost * 0.05));
    const target = Math.floor(s1 * resourceRemainingPct) + 1;

    const resBox = document.getElementById('dls-result-box');
    resBox.style.display = 'block';
    resBox.innerHTML = `☔ Revised Target: <strong>${target} runs</strong> in ${revisedOvers} overs`;
  },

  populateSetupTeams() {
    const teams = StorageManager.getTeams();
    const t1 = document.getElementById('setup-team1');
    const t2 = document.getElementById('setup-team2');
    if (!t1 || !t2) return;

    t1.innerHTML = '';
    t2.innerHTML = '';

    teams.forEach((team, idx) => {
      t1.innerHTML += `<option value="${team.id}" ${idx === 0 ? 'selected' : ''}>${team.name} (${team.players.length} players)</option>`;
      t2.innerHTML += `<option value="${team.id}" ${idx === 1 ? 'selected' : ''}>${team.name} (${team.players.length} players)</option>`;
    });

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
      alert('Validation Error: Please select two distinct teams.');
      return;
    }

    const team1 = teams.find(t => t.id === t1Id);
    const team2 = teams.find(t => t.id === t2Id);

    if (!team1 || !team2) {
      alert('Validation Error: Selected teams could not be found.');
      return;
    }

    const minSize = 2;
    if (team1.players.length < minSize || team2.players.length < minSize) {
      alert(`Validation Error: Both teams must have at least ${minSize} players.`);
      return;
    }

    const strikerId = document.getElementById('setup-striker').value;
    const nonStrikerId = document.getElementById('setup-non-striker').value;
    const bowlerId = document.getElementById('setup-bowler').value;

    if (strikerId === nonStrikerId) {
      alert('Validation Error: Striker and Non-Striker cannot be the same player.');
      return;
    }

    const overs = parseInt(document.getElementById('setup-overs').value, 10);
    const format = document.getElementById('setup-format').value;
    const venue = document.getElementById('setup-venue').value.trim();

    const tossWinnerTeam = document.getElementById('setup-toss-winner').value === 'team1' ? team1.id : team2.id;
    const electedTo = document.getElementById('setup-elected-to').value;

    const match = new Match({
      venue,
      totalOvers: overs,
      format,
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

  renderTeamsList() {
    const container = document.getElementById('saved-teams-list');
    if (!container) return;

    const teams = StorageManager.getTeams();
    container.innerHTML = '';

    teams.forEach(team => {
      const card = document.createElement('div');
      card.className = 'stats-card';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: var(--primary); font-size: 0.95rem;">${team.name}</strong>
          <button class="btn-secondary" style="color: var(--danger); padding: 4px 8px; font-size: 0.75rem;" onclick="App.deleteTeam('${team.id}')">Delete Team</button>
        </div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 6px;">
          Roster (${team.players.length} players):
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
          ${team.players.map(p => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-light); padding: 4px 8px; border-radius: 4px; font-size: 0.72rem;">
              <span><strong>${p.name}</strong> <span style="color: var(--info); font-size: 0.68rem;">(${p.role})</span></span>
              <div style="display: flex; gap: 4px;">
                <button class="btn-secondary" style="padding: 2px 6px; font-size: 0.68rem;" onclick="App.editPlayerPrompt('${team.id}', '${p.id}')">✎ Edit</button>
                <button class="btn-secondary" style="color: var(--danger); padding: 2px 6px; font-size: 0.68rem;" onclick="App.removePlayerFromTeam('${team.id}', '${p.id}')">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="display: flex; gap: 6px; margin-top: 6px;">
          <input type="text" id="add-player-name-${team.id}" class="form-input" placeholder="New player name" style="flex: 1; padding: 6px 8px; font-size: 0.78rem;">
          <select id="add-player-role-${team.id}" class="form-select" style="padding: 6px 8px; font-size: 0.78rem;">
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

  renderCareerStats() {
    const container = document.getElementById('career-stats-container');
    if (!container) return;

    const stats = StorageManager.getCareerStats();
    container.innerHTML = '';

    if (stats.length === 0) {
      container.innerHTML = '<p style="font-size: 0.78rem; color: var(--text-muted);">No player career stats recorded yet.</p>';
      return;
    }

    let rows = '';
    stats.forEach(p => {
      const avg = p.matches > 0 ? (p.runs / p.matches).toFixed(1) : '0.0';
      const sr = p.ballsFaced > 0 ? ((p.runs / p.ballsFaced) * 100).toFixed(1) : '0.0';

      rows += `
        <tr>
          <td><strong>${p.name}</strong><br><span style="color:var(--text-muted); font-size:0.65rem;">${p.teamName}</span></td>
          <td>${p.matches}</td>
          <td><strong>${p.runs}</strong></td>
          <td>${p.highestScore}</td>
          <td>${avg}</td>
          <td>${sr}</td>
          <td>${p.fours}</td>
          <td>${p.sixes}</td>
          <td><strong>${p.wickets}</strong></td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="table-responsive">
        <table class="stat-table">
          <thead>
            <tr>
              <th>Player</th><th>Mat</th><th>Runs</th><th>HS</th><th>Avg</th><th>SR</th><th>4s</th><th>6s</th><th>Wkts</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  triggerCloudSync() {
    const res = StorageManager.syncCloud();
    alert(`☁️ ${res.message}\nSynced at: ${res.timestamp}`);
  },

  editPlayerPrompt(teamId, playerId) {
    const teams = StorageManager.getTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const player = team.players.find(p => p.id === playerId);
    if (!player) return;

    const newName = prompt('Edit player name:', player.name);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) return;

    StorageManager.updatePlayerInTeam(teamId, playerId, trimmed, player.role);
    this.renderTeamsList();
    this.populateSetupTeams();
    this.renderCareerStats();
  },

  removePlayerFromTeam(teamId, playerId) {
    const teams = StorageManager.getTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const player = team.players.find(p => p.id === playerId);

    if (confirm(`Remove player "${player.name}" from ${team.name}?`)) {
      StorageManager.removePlayerFromTeam(teamId, playerId);
      this.renderTeamsList();
      this.populateSetupTeams();
      this.renderCareerStats();
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
      this.renderCareerStats();
    }
  },

  deleteTeam(teamId) {
    if (confirm('Are you sure you want to delete this team?')) {
      StorageManager.deleteTeam(teamId);
      this.renderTeamsList();
      this.populateSetupTeams();
      this.renderCareerStats();
    }
  },

  renderFullScorecard() {
    const container = document.getElementById('scorecard-container');
    if (!container) return;

    const match = this.engine.match;
    container.innerHTML = '';

    if (match.result) {
      const banner = document.createElement('div');
      banner.className = 'target-badge';
      banner.style.fontSize = '0.95rem';
      banner.style.padding = '10px';
      banner.innerHTML = `🏆 <strong>${match.result}</strong>`;
      container.appendChild(banner);
    }

    match.inningsList.forEach(inn => {
      const innCard = document.createElement('div');
      innCard.className = 'innings-block';

      let battingRows = '';
      Object.values(inn.batterStats).forEach(b => {
        battingRows += `
          <tr>
            <td>${b.playerName}</td>
            <td style="color: var(--text-muted); font-size: 0.7rem;">${b.isOut ? (b.bowlerName ? `${b.dismissalInfo} b ${b.bowlerName}` : b.dismissalInfo) : 'not out'}</td>
            <td><strong>${b.runs}</strong></td>
            <td>${b.ballsFaced}</td>
            <td>${b.ones}</td>
            <td>${b.twos}</td>
            <td>${b.threes}</td>
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
            <td>${b.legalBalls}</td>
            <td>${b.maidens}</td>
            <td>${b.runsConceded}</td>
            <td><strong>${b.wickets}</strong></td>
            <td>${b.wides}</td>
            <td>${b.noBalls}</td>
            <td>${b.economyRate}</td>
          </tr>
        `;
      });

      innCard.innerHTML = `
        <div class="innings-title">
          ${inn.battingTeam.name} Innings: ${inn.totalRuns}/${inn.totalWickets} (${inn.oversNotation} Ov)
        </div>
        <h4 style="font-size: 0.78rem; color: var(--text-muted); margin: 6px 0;">Batting Statistics</h4>
        <div class="table-responsive">
          <table class="stat-table">
            <thead>
              <tr>
                <th>Batter</th><th>Dismissal</th><th>R</th><th>B</th><th>1s</th><th>2s</th><th>3s</th><th>4s</th><th>6s</th><th>SR</th>
              </tr>
            </thead>
            <tbody>${battingRows}</tbody>
          </table>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin: 6px 0;">
          Extras: <strong>${inn.extras.total}</strong> (wd ${inn.extras.wides}, nb ${inn.extras.noBalls}, b ${inn.extras.byes}, lb ${inn.extras.legByes})
        </div>
        <h4 style="font-size: 0.78rem; color: var(--text-muted); margin: 8px 0 4px 0;">Bowling Statistics</h4>
        <div class="table-responsive">
          <table class="stat-table">
            <thead>
              <tr>
                <th>Bowler</th><th>O</th><th>Balls</th><th>M</th><th>R</th><th>W</th><th>Wd</th><th>Nb</th><th>Econ</th>
              </tr>
            </thead>
            <tbody>${bowlingRows}</tbody>
          </table>
        </div>
      `;
      container.appendChild(innCard);
    });
  },

  exportScorecard() {
    const match = this.engine.match;
    let report = `🏏 CRICKET SCORECARD - ${match.venue}\n`;
    report += `Date: ${match.date} | Format: ${match.format || 'Custom'} (${match.totalOvers} Overs)\n`;
    if (match.result) report += `Result: ${match.result}\n\n`;

    match.inningsList.forEach(inn => {
      report += `--- ${inn.battingTeam.name} Innings (${inn.totalRuns}/${inn.totalWickets}, ${inn.oversNotation} Ov) ---\n`;
      report += `Extras: ${inn.extras.total} (Wd: ${inn.extras.wides}, Nb: ${inn.extras.noBalls}, B: ${inn.extras.byes}, Lb: ${inn.extras.legByes})\n\n`;
      report += `BATTERS:\n`;
      Object.values(inn.batterStats).forEach(b => {
        report += `${b.playerName}: ${b.runs} (${b.ballsFaced}b, 1s:${b.ones}, 2s:${b.twos}, 3s:${b.threes}, 4s:${b.fours}, 6s:${b.sixes}, SR:${b.strikeRate}) - ${b.isOut ? (b.bowlerName ? `${b.dismissalInfo} b ${b.bowlerName}` : b.dismissalInfo) : 'not out'}\n`;
      });
      report += `\nBOWLERS:\n`;
      Object.values(inn.bowlerStats).forEach(b => {
        report += `${b.playerName}: ${b.oversNotation} Ov (${b.legalBalls} balls), ${b.runsConceded} Runs, ${b.wickets} Wkts, ${b.wides} Wd, ${b.noBalls} Nb (Econ ${b.economyRate})\n`;
      });
      report += `\n`;
    });

    if (navigator.share) {
      navigator.share({ title: 'Cricket Scorecard', text: report }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(report).then(() => {
        alert('Scorecard copied to clipboard! You can now paste and share it anywhere.');
      }).catch(() => { alert(report); });
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
      container.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-muted);">No past matches recorded yet.</p>';
      return;
    }

    matches.forEach(m => {
      const card = document.createElement('div');
      card.className = 'stats-card';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
          <strong style="color: var(--primary);">${m.team1.name} vs ${m.team2.name}</strong>
          <span style="font-size: 0.72rem; color: var(--text-muted);">${m.date}</span>
        </div>
        <p style="font-size: 0.8rem; color: #fff; margin: 4px 0;">${m.result || 'Completed'}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
          <span style="font-size: 0.75rem; color: var(--info);">${m.venue} (${m.totalOvers} ov)</span>
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

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});