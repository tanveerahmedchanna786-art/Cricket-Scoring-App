# EF101-P02: Cricket Match Scoring Android Application

**Course**: EF-101 Fall 2026 - System Understanding Projects  
**Project ID**: EF101-P02  
**Group Size**: 3 Students  
**Submission**: Week 13  

---

## 1. Project Overview & System Understanding

This application is a **100% offline, event-driven cricket match scoring mobile system**. It models application state, structured local storage, and automated sporting rule enforcement while the human scorer records only the individual events occurring on each ball.

### Mandatory Requirements Implemented:
- [x] **Local Team & Player Persistence**: Create teams, add players, save locally for reuse without internet.
- [x] **Team Completeness Validation**: Enforces a practical minimum team size before starting a match.
- [x] **Match Setup**: Configurable overs, venue, date, toss winner, toss decision, and opening players.
- [x] **Ball-by-Ball Scoring Engine**:
  - Normal runs (`0, 1, 2, 3, 4, 6`).
  - Extras (`wide`, `no_ball`, `bye`, `leg_bye`).
  - **Legal Ball Verification**: Wides and no-balls do **not** advance the legal over count.
  - Automatic conversion of legal balls into cricket over notation (e.g., `0.1` ... `1.0`).
- [x] **Automatic Strike Rotation**:
  - Automatically changes strike on odd runs (1, 3, 5).
  - Automatically changes strike at the completion of an over (6th legal ball).
- [x] **Bowler Rotation Rule**:
  - Requires selecting a new bowler at the start of each over.
  - Enforces the cricket rule that a bowler cannot bowl two consecutive overs.
- [x] **Player Statistics Tracking**:
  - **Batters**: Runs, balls faced, count of 1s, 2s, 3s, 4s, 6s, and strike rate.
  - **Bowlers**: Overs bowled, maidens, runs conceded, wickets credited, and economy rate.
- [x] **Dismissal Rules & Bowler Credit**:
  - Supports `bowled`, `caught`, `lbw`, `stumped`, `run_out`, and `hit_wicket`.
  - **Bowler Credit Logic**: Bowler receives wicket credit for `bowled`, `caught`, `lbw`, `stumped`, and `hit_wicket`. Bowler is **not** credited for a `run_out`.
- [x] **Innings & Match Conclusion**:
  - Automatic detection of all out, overs completed, or 2nd innings target chase.
  - Displays target, Required Run Rate (RRR), balls remaining, and final win margins (runs or wickets).
- [x] **Scorecard & History**:
  - Comprehensive batting, bowling, and extras scorecard.
  - Saves completed matches locally; past matches can be reopened and inspected.
- [x] **Delivery-Level Event Sourcing & Undo**:
  - Every ball is stored as an atomic `Delivery` entity.
  - Provides a 1-click **Undo** button that re-plays history to maintain mathematical purity.

---

## 2. System Architecture & Entity Models

```
┌─────────────────────────────────────────────────────────────┐
│                            MATCH                            │
│  - matchId, date, venue, totalOvers, result, status         │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1 : 2
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                           INNINGS                           │
│  - inningsNumber, battingTeam, bowlingTeam, target, total   │
│  - batterStats (Map)                                        │
│  - bowlerStats (Map)                                        │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1 : N
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      DELIVERY / EVENT                       │
│  - ballNumber, overNumber, ballInOver                       │
│  - strikerId, nonStrikerId, bowlerId                        │
│  - runsScored, extraType, extraRuns, isLegalBall            │
│  - isWicket, dismissalType, bowlerCredited                  │
└─────────────────────────────────────────────────────────────┘
```

### Why a Delivery-Level Record is Useful (Viva Core Question)
Traditional counters (e.g., `totalRuns += 4`) cause catastrophic data loss: you cannot reconstruct how an innings unfolded, cannot undo a scoring mistake without corrupted state, and cannot verify maiden overs or wagon wheels.

By treating each ball as an immutable **`Delivery`** event:
1. **100% Replayable State**: If a scorer makes an error, the system removes the erroneous ball and recomputes the state from the remaining delivery events.
2. **Detailed Analytical Metrics**: We can calculate dot-ball percentages, partnership runs, over-by-over charts, and bowler economy across spells.
3. **Crash Recovery**: If the device loses power, reloading the delivery log restores the exact match state without discrepancy.

---

## 3. How to Run the App in VS Code

1. Open **VS Code**.
2. Click **File ➔ Open Folder...** and select:  
   `C:\Users\Admin\.gemini\antigravity\scratch\cricket_scorer`
3. In the file explorer, right-click `index.html` and click:
   - **Open with Live Server** (if you have the Live Server extension), OR
   - Simply double-click `index.html` on your desktop to open it in **Google Chrome** or **Microsoft Edge**.
4. The mobile scoring app will open instantly!

### Testing the Viva Edge-Cases Demo:
1. Tap the **⚡ Demo** button in the top header.
2. Click **▶ Run Demo**.
3. Watch the app automatically execute all required edge cases (wides, no-balls, boundaries, wickets, strike swaps, over endings, and a successful 2nd innings chase) with live commentary!

---

## 6. Packaging as an Installable Android APK (Optional)

Whenever you want to generate a physical `.apk` to install on an Android phone:
1. Open terminal inside the project directory:
   ```bash
   npm init -y
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "CricScore" "com.ef101.cricscore" --web-dir .
   npx cap add android
   npx cap open android
   ```
2. In Android Studio, click **Build ➔ Build Bundle(s) / APK(s) ➔ Build APK(s)**.
