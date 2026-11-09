/**
 * storage.js - 100% Offline Local Storage for Cricket Scoring App
 * Seeded with 10 Full International Teams + Random Squad Customizer
 */

const StorageManager = {
  KEYS: {
    TEAMS: 'cricket_app_saved_teams',
    ACTIVE_MATCH: 'cricket_app_active_match',
    COMPLETED_MATCHES: 'cricket_app_completed_matches',
    SELECTED_THEME: 'cricket_app_theme'
  },

  // 10 Official International Teams with Real Star Rosters
  getInternationalPresetTeams() {
    return [
      new Team('team_ind', 'India', [
        new Player('p_ind_rohit', 'Rohit Sharma (c)', 'Batter'),
        new Player('p_ind_gill', 'Shubman Gill', 'Batter'),
        new Player('p_ind_kohli', 'Virat Kohli', 'Batter'),
        new Player('p_ind_sky', 'Suryakumar Yadav', 'Batter'),
        new Player('p_ind_hardik', 'Hardik Pandya', 'All-Rounder'),
        new Player('p_ind_pant', 'Rishabh Pant (wk)', 'Wicketkeeper'),
        new Player('p_ind_jadeja', 'Ravindra Jadeja', 'All-Rounder'),
        new Player('p_ind_bumrah', 'Jasprit Bumrah', 'Bowler'),
        new Player('p_ind_kuldeep', 'Kuldeep Yadav', 'Bowler'),
        new Player('p_ind_siraj', 'Mohammed Siraj', 'Bowler'),
        new Player('p_ind_arshdeep', 'Arshdeep Singh', 'Bowler')
      ], '🇮🇳', '#0070bb'),

      new Team('team_aus', 'Australia', [
        new Player('p_aus_head', 'Travis Head', 'Batter'),
        new Player('p_aus_warner', 'David Warner', 'Batter'),
        new Player('p_aus_marsh', 'Mitchell Marsh (c)', 'All-Rounder'),
        new Player('p_aus_smith', 'Steve Smith', 'Batter'),
        new Player('p_aus_maxwell', 'Glenn Maxwell', 'All-Rounder'),
        new Player('p_aus_inglis', 'Josh Inglis (wk)', 'Wicketkeeper'),
        new Player('p_aus_stoinis', 'Marcus Stoinis', 'All-Rounder'),
        new Player('p_aus_cummins', 'Pat Cummins', 'Bowler'),
        new Player('p_aus_starc', 'Mitchell Starc', 'Bowler'),
        new Player('p_aus_zampa', 'Adam Zampa', 'Bowler'),
        new Player('p_aus_hazlewood', 'Josh Hazlewood', 'Bowler')
      ], '🇦🇺', '#ffd700'),

      new Team('team_eng', 'England', [
        new Player('p_eng_buttler', 'Jos Buttler (c/wk)', 'Wicketkeeper'),
        new Player('p_eng_salt', 'Phil Salt', 'Batter'),
        new Player('p_eng_jacks', 'Will Jacks', 'All-Rounder'),
        new Player('p_eng_root', 'Joe Root', 'Batter'),
        new Player('p_eng_brook', 'Harry Brook', 'Batter'),
        new Player('p_eng_stokes', 'Ben Stokes', 'All-Rounder'),
        new Player('p_eng_livingstone', 'Liam Livingstone', 'All-Rounder'),
        new Player('p_eng_curran', 'Sam Curran', 'All-Rounder'),
        new Player('p_eng_archer', 'Jofra Archer', 'Bowler'),
        new Player('p_eng_rashid', 'Adil Rashid', 'Bowler'),
        new Player('p_eng_wood', 'Mark Wood', 'Bowler')
      ], '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '#cc0000'),

      new Team('team_pak', 'Pakistan', [
        new Player('p_pak_babar', 'Babar Azam (c)', 'Batter'),
        new Player('p_pak_rizwan', 'Mohammad Rizwan (wk)', 'Wicketkeeper'),
        new Player('p_pak_saim', 'Saim Ayub', 'Batter'),
        new Player('p_pak_fakhar', 'Fakhar Zaman', 'Batter'),
        new Player('p_pak_ifthikar', 'Iftikhar Ahmed', 'All-Rounder'),
        new Player('p_pak_shadab', 'Shadab Khan', 'All-Rounder'),
        new Player('p_pak_imad', 'Imad Wasim', 'All-Rounder'),
        new Player('p_pak_shaheen', 'Shaheen Afridi', 'Bowler'),
        new Player('p_pak_naseem', 'Naseem Shah', 'Bowler'),
        new Player('p_pak_rauf', 'Haris Rauf', 'Bowler'),
        new Player('p_pak_abrar', 'Abrar Ahmed', 'Bowler')
      ], '🇵🇰', '#006633'),

      new Team('team_sa', 'South Africa', [
        new Player('p_sa_dekock', 'Quinton de Kock (wk)', 'Wicketkeeper'),
        new Player('p_sa_hendricks', 'Reeza Hendricks', 'Batter'),
        new Player('p_sa_markram', 'Aiden Markram (c)', 'Batter'),
        new Player('p_sa_klaasen', 'Heinrich Klaasen', 'Batter'),
        new Player('p_sa_miller', 'David Miller', 'Batter'),
        new Player('p_sa_jansen', 'Marco Jansen', 'All-Rounder'),
        new Player('p_sa_maharaj', 'Keshav Maharaj', 'Bowler'),
        new Player('p_sa_rabada', 'Kagiso Rabada', 'Bowler'),
        new Player('p_sa_nortje', 'Anrich Nortje', 'Bowler'),
        new Player('p_sa_ngidi', 'Lungi Ngidi', 'Bowler'),
        new Player('p_sa_shamsi', 'Tabraiz Shamsi', 'Bowler')
      ], '🇿🇦', '#007749'),

      new Team('team_nz', 'New Zealand', [
        new Player('p_nz_conway', 'Devon Conway (wk)', 'Wicketkeeper'),
        new Player('p_nz_allen', 'Finn Allen', 'Batter'),
        new Player('p_nz_kane', 'Kane Williamson (c)', 'Batter'),
        new Player('p_nz_rachin', 'Rachin Ravindra', 'All-Rounder'),
        new Player('p_nz_mitchell', 'Daryl Mitchell', 'All-Rounder'),
        new Player('p_nz_glenn', 'Glenn Phillips', 'All-Rounder'),
        new Player('p_nz_santner', 'Mitchell Santner', 'All-Rounder'),
        new Player('p_nz_sodhi', 'Ish Sodhi', 'Bowler'),
        new Player('p_nz_southee', 'Tim Southee', 'Bowler'),
        new Player('p_nz_boult', 'Trent Boult', 'Bowler'),
        new Player('p_nz_ferguson', 'Lockie Ferguson', 'Bowler')
      ], '🇳🇿', '#000000'),

      new Team('team_wi', 'West Indies', [
        new Player('p_wi_king', 'Brandon King', 'Batter'),
        new Player('p_wi_charles', 'Johnson Charles', 'Batter'),
        new Player('p_wi_pooran', 'Nicholas Pooran (wk)', 'Wicketkeeper'),
        new Player('p_wi_hope', 'Shai Hope', 'Batter'),
        new Player('p_wi_powell', 'Rovman Powell (c)', 'Batter'),
        new Player('p_wi_russell', 'Andre Russell', 'All-Rounder'),
        new Player('p_wi_shepherd', 'Romario Shepherd', 'All-Rounder'),
        new Player('p_wi_hosein', 'Akeal Hosein', 'Bowler'),
        new Player('p_wi_joseph', 'Alzarri Joseph', 'Bowler'),
        new Player('p_wi_motie', 'Gudakesh Motie', 'Bowler'),
        new Player('p_wi_mccoy', 'Obed McCoy', 'Bowler')
      ], '🌴', '#7a003c'),

      new Team('team_sl', 'Sri Lanka', [
        new Player('p_sl_nissanka', 'Pathum Nissanka', 'Batter'),
        new Player('p_sl_mendis', 'Kusal Mendis (wk)', 'Wicketkeeper'),
        new Player('p_sl_kamindu', 'Kamindu Mendis', 'All-Rounder'),
        new Player('p_sl_aslan', 'Charith Asalanka (c)', 'Batter'),
        new Player('p_sl_rajapaksa', 'Bhanuka Rajapaksa', 'Batter'),
        new Player('p_sl_shanaka', 'Dasun Shanaka', 'All-Rounder'),
        new Player('p_sl_hasaranga', 'Wanindu Hasaranga', 'All-Rounder'),
        new Player('p_sl_theekshana', 'Maheesh Theekshana', 'Bowler'),
        new Player('p_sl_chameera', 'Dushmantha Chameera', 'Bowler'),
        new Player('p_sl_pathirana', 'Matheesha Pathirana', 'Bowler'),
        new Player('p_sl_madushanka', 'Dilshan Madushanka', 'Bowler')
      ], '🇱🇰', '#002b7f'),

      new Team('team_afg', 'Afghanistan', [
        new Player('p_afg_gurbaz', 'Rahmanullah Gurbaz (wk)', 'Wicketkeeper'),
        new Player('p_afg_ibrahim', 'Ibrahim Zadran', 'Batter'),
        new Player('p_afg_gulbadin', 'Gulbadin Naib', 'All-Rounder'),
        new Player('p_afg_omar', 'Azmatullah Omarzai', 'All-Rounder'),
        new Player('p_afg_nabi', 'Mohammad Nabi', 'All-Rounder'),
        new Player('p_afg_karim', 'Karim Janat', 'All-Rounder'),
        new Player('p_afg_rashid', 'Rashid Khan (c)', 'Bowler'),
        new Player('p_afg_noor', 'Noor Ahmad', 'Bowler'),
        new Player('p_afg_muneer', 'Mujeeb Ur Rahman', 'Bowler'),
        new Player('p_afg_naveen', 'Naveen-ul-Haq', 'Bowler'),
        new Player('p_afg_farooqi', 'Fazalhaq Farooqi', 'Bowler')
      ], '🇦🇫', '#0099ff'),

      new Team('team_ban', 'Bangladesh', [
        new Player('p_ban_tanzid', 'Tanzid Hasan', 'Batter'),
        new Player('p_ban_litton', 'Litton Das (wk)', 'Wicketkeeper'),
        new Player('p_ban_shanto', 'Najmul Hossain Shanto (c)', 'Batter'),
        new Player('p_ban_towhid', 'Towhid Hridoy', 'Batter'),
        new Player('p_ban_shakib', 'Shakib Al Hasan', 'All-Rounder'),
        new Player('p_ban_mahmud', 'Mahmudullah', 'All-Rounder'),
        new Player('p_ban_rishad', 'Rishad Hossain', 'All-Rounder'),
        new Player('p_ban_mahedi', 'Mahedi Hasan', 'All-Rounder'),
        new Player('p_ban_taskin', 'Taskin Ahmed', 'Bowler'),
        new Player('p_ban_mustafiz', 'Mustafizur Rahman', 'Bowler'),
        new Player('p_ban_shoriful', 'Shoriful Islam', 'Bowler')
      ], '🇧🇩', '#006a4e')
    ];
  },

  // Generate a random squad with creative names
  generateRandomTeam() {
    const prefixes = ['Cosmic', 'Titan', 'Desert', 'Royal', 'Apex', 'Thunder', 'Shadow', 'Neon', 'Viper', 'Blaze'];
    const suffixes = ['Warriors', 'Cobras', 'Knights', 'Gladiators', 'Strikers', 'Riders', 'Panthers', 'Falcons', 'Titans', 'Spartans'];
    const flags = ['⚡', '🦁', '🔥', '🦅', '⚔️', '🌪️', '🛡️', '🎯', '🐉', '🐺'];

    const firstNames = ['Liam', 'Aarav', 'Ethan', 'Zain', 'Mateo', 'Lucas', 'Arjun', 'Leo', 'Noah', 'Kai', 'Mason', 'Tariq', 'Rayan', 'Dev', 'Elijah'];
    const lastNames = ['Sterling', 'Khan', 'Vance', 'Sharma', 'Patel', 'Hawkins', 'Sinclair', 'Reid', 'Becker', 'Nakamura', 'O’Connor', 'Gomez', 'Malik'];
    const roles = ['Batter', 'Batter', 'Batter', 'All-Rounder', 'All-Rounder', 'Wicketkeeper', 'Bowler', 'Bowler', 'Bowler', 'Bowler'];

    const teamName = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    const flag = flags[Math.floor(Math.random() * flags.length)];

    const players = [];
    for (let i = 0; i < 7; i++) {
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
      const role = roles[i] || 'All-Rounder';
      players.push(new Player(null, `${fn} ${ln}`, role));
    }

    return new Team(null, teamName, players, flag, '#00e676');
  },

  // Initialize storage with international teams
  initDefaults() {
    const existing = this.getTeams();
    if (!existing || existing.length === 0) {
      this.saveTeams(this.getInternationalPresetTeams());
    }
  },

  // Retrieve all saved teams
  getTeams() {
    try {
      const data = localStorage.getItem(this.KEYS.TEAMS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return parsed.map(t => new Team(t.id, t.name, t.players, t.flag || '🏏', t.primaryColor || '#00e676'));
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

  saveTeam(team) {
    const teams = this.getTeams();
    const index = teams.findIndex(t => t.id === team.id);
    if (index >= 0) {
      teams[index] = team;
    } else {
      teams.unshift(team);
    }
    return this.saveTeams(teams);
  },

  deleteTeam(teamId) {
    let teams = this.getTeams();
    teams = teams.filter(t => t.id !== teamId);
    return this.saveTeams(teams);
  },

  // Theme preference
  getTheme() {
    return localStorage.getItem(this.KEYS.SELECTED_THEME) || 'theme-stadium';
  },

  saveTheme(themeName) {
    localStorage.setItem(this.KEYS.SELECTED_THEME, themeName);
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
