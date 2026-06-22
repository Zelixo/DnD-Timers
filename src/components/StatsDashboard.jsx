import React, { useState } from 'react';

export default function StatsDashboard({ sessionData, onRestart }) {
  const [copied, setCopied] = useState(false);

  const { totalTime, rounds, turns, combatQueue } = sessionData;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Group turn statistics by participant
  // We want to calculate: total duration, turn count, average turn duration
  const statsByParticipant = {};

  // Initialize for all known combatants in the queue to ensure everyone shows up
  combatQueue.forEach(item => {
    statsByParticipant[item.name] = {
      name: item.name,
      type: item.type,
      color: item.color,
      charClass: item.charClass,
      totalDuration: 0,
      turnCount: 0,
      minTurn: Infinity,
      maxTurn: -Infinity
    };
  });

  // Aggregate turn records
  turns.forEach(record => {
    if (!statsByParticipant[record.name]) {
      // In case a participant was added during combat and isn't in original queue
      statsByParticipant[record.name] = {
        name: record.name,
        type: record.type,
        color: record.color || '--neon-pink',
        charClass: record.type === 'dm' ? 'DM' : 'Other',
        totalDuration: 0,
        turnCount: 0,
        minTurn: Infinity,
        maxTurn: -Infinity
      };
    }
    const stat = statsByParticipant[record.name];
    stat.totalDuration += record.duration;
    stat.turnCount += 1;
    if (record.duration < stat.minTurn) stat.minTurn = record.duration;
    if (record.duration > stat.maxTurn) stat.maxTurn = record.duration;
  });

  // Calculate averages and format list
  const participantList = Object.values(statsByParticipant).map(stat => {
    const average = stat.turnCount > 0 ? Math.round(stat.totalDuration / stat.turnCount) : 0;
    return {
      ...stat,
      average,
      minTurn: stat.minTurn === Infinity ? 0 : stat.minTurn,
      maxTurn: stat.maxTurn === -Infinity ? 0 : stat.maxTurn
    };
  });

  // Calculate overall player vs DM times
  let totalPlayerTime = 0;
  let totalDmTime = 0;
  let playerTurnsCount = 0;
  let dmTurnsCount = 0;

  turns.forEach(rec => {
    if (rec.type === 'dm') {
      totalDmTime += rec.duration;
      dmTurnsCount += 1;
    } else {
      totalPlayerTime += rec.duration;
      playerTurnsCount += 1;
    }
  });

  const totalTimeInTurns = totalPlayerTime + totalDmTime || 1; // avoid divide by zero
  const playerPercent = Math.round((totalPlayerTime / totalTimeInTurns) * 100);
  const dmPercent = Math.round((totalDmTime / totalTimeInTurns) * 100);

  // Filter out DM from player awards
  const playerStatsOnly = participantList.filter(p => p.type === 'player' && p.turnCount > 0);

  // Find Awards
  let fastestPlayer = null;
  let slowestPlayer = null;
  let fastestSingleTurn = null;

  if (playerStatsOnly.length > 0) {
    // 1. The Swift (Fastest average turn time)
    fastestPlayer = [...playerStatsOnly].sort((a, b) => a.average - b.average)[0];
    
    // 2. The Tactician (Longest average turn time)
    slowestPlayer = [...playerStatsOnly].sort((a, b) => b.average - a.average)[0];
  }

  // 3. Fastest Single Turn (out of all player turn records)
  const playerTurnRecordsOnly = turns.filter(rec => rec.type === 'player');
  if (playerTurnRecordsOnly.length > 0) {
    const sortedSingleTurns = [...playerTurnRecordsOnly].sort((a, b) => a.duration - b.duration);
    fastestSingleTurn = sortedSingleTurns[0];
  }

  // Export session stats to Clipboard in clean Markdown
  const handleExportClipboard = () => {
    let md = `### ⚔️ DnD Combat Pacing Summary\n`;
    md += `* **Total Combat Duration:** ${formatTime(totalTime)}\n`;
    md += `* **Total Rounds:** ${rounds}\n`;
    md += `* **Active Turn Time Ratio:** Players: ${playerPercent}% | DM Time: ${dmPercent}%\n\n`;
    md += `#### 📊 Individual Player Turn Statistics:\n`;
    md += `| Player/Slot | Turns | Total Time | Average Turn |\n`;
    md += `| :--- | :---: | :---: | :---: |\n`;
    
    participantList.forEach(p => {
      md += `| ${p.name} (${p.charClass}) | ${p.turnCount} | ${formatTime(p.totalDuration)} | ${formatTime(p.average)} |\n`;
    });

    md += `\n#### 🏆 Combat Awards:\n`;
    if (fastestPlayer) md += `* **The Swift (Fastest Avg):** ${fastestPlayer.name} (${formatTime(fastestPlayer.average)}/turn)\n`;
    if (slowestPlayer) md += `* **The Tactician (Most Deliberate):** ${slowestPlayer.name} (${formatTime(slowestPlayer.average)}/turn)\n`;
    if (fastestSingleTurn) md += `* **The Speed Demon (Fastest Single Turn):** ${fastestSingleTurn.name} (${formatTime(fastestSingleTurn.duration)})\n`;

    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
      
      {/* Header Panel */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ color: 'var(--neon-green)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>REPORT GENERATED</span>
          <h1 style={{ fontSize: '32px', margin: '4px 0 8px 0', color: '#fff' }}>Combat Encounters Complete</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Review pacing analytics and distribute awards to your table.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExportClipboard} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            📋 {copied ? 'Copied Markdown!' : 'Copy Discord Stats'}
          </button>
          <button onClick={onRestart} className="btn-neon btn-cyan">
            ⚔️ New Encounter
          </button>
        </div>
      </div>

      {/* Main Grid: Overview Summary + Time Ratio Chart */}
      <div className="grid-cols-3" style={{ gap: '24px' }}>
        
        {/* Core Stats Cards */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '160px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Encounter Time</span>
          <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '10px 0' }}>
            {formatTime(totalTime)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Across {turns.length} registered turns</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '160px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Rounds</span>
          <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--neon-cyan)', textShadow: '0 0 12px rgba(0,242,254,0.3)', margin: '10px 0' }}>
            {rounds}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Average round time: {turns.length > 0 ? formatTime(Math.round(totalTime / rounds)) : '00:00'}</span>
        </div>

        {/* Time Ratio Breakdown (Visual Chart) */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', display: 'block', marginBottom: '8px' }}>
            Pacing Ratio (Player vs DM)
          </span>
          
          <div style={{ margin: '12px 0' }}>
            {/* Visual ratio bar */}
            <div style={{ height: '24px', width: '100%', borderRadius: '12px', overflow: 'hidden', display: 'flex', border: '1px solid var(--border-color)' }}>
              <div 
                style={{ 
                  width: `${playerPercent}%`, 
                  background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))', 
                  height: '100%',
                  boxShadow: 'inset 0 0 5px rgba(255,255,255,0.2)'
                }} 
                title={`Players: ${playerPercent}%`}
              />
              <div 
                style={{ 
                  width: `${dmPercent}%`, 
                  background: 'var(--neon-pink)', 
                  height: '100%',
                  boxShadow: 'inset 0 0 5px rgba(255,255,255,0.2)'
                }} 
                title={`DM Time: ${dmPercent}%`}
              />
            </div>
            
            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--neon-cyan)', fontWeight: '600' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neon-cyan)' }} />
                Players ({playerPercent}%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--neon-pink)', fontWeight: '600' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neon-pink)' }} />
                DM Time ({dmPercent}%)
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Awards Panel */}
      {playerStatsOnly.length > 0 && (
        <div>
          <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏆</span> Combat Session Awards
          </h2>
          <div className="grid-cols-3" style={{ gap: '24px' }}>
            
            {/* Award 1: The Swift */}
            {fastestPlayer && (
              <div className="glass-panel" style={{ padding: '20px', borderLeft: `4px solid var(${fastestPlayer.color})`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '24px' }}>⚡</div>
                <span style={{ fontSize: '11px', color: 'var(--neon-cyan)', fontWeight: 'bold', textTransform: 'uppercase' }}>The Swift</span>
                <h3 style={{ fontSize: '20px', color: '#fff' }}>{fastestPlayer.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4' }}>
                  Fastest average turn speed of **{formatTime(fastestPlayer.average)}** per turn. Keeping the combat flowing!
                </p>
              </div>
            )}

            {/* Award 2: The Tactician */}
            {slowestPlayer && (
              <div className="glass-panel" style={{ padding: '20px', borderLeft: `4px solid var(${slowestPlayer.color})`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '24px' }}>🧠</div>
                <span style={{ fontSize: '11px', color: 'var(--neon-purple)', fontWeight: 'bold', textTransform: 'uppercase' }}>The Tactician</span>
                <h3 style={{ fontSize: '20px', color: '#fff' }}>{slowestPlayer.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4' }}>
                  Most deliberate pace of **{formatTime(slowestPlayer.average)}** per turn. Plotting complex combinations!
                </p>
              </div>
            )}

            {/* Award 3: The Speed Demon */}
            {fastestSingleTurn && (
              <div className="glass-panel" style={{ padding: '20px', borderLeft: `4px solid var(--neon-green)`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '24px' }}>🏎️</div>
                <span style={{ fontSize: '11px', color: 'var(--neon-green)', fontWeight: 'bold', textTransform: 'uppercase' }}>The Speed Demon</span>
                <h3 style={{ fontSize: '20px', color: '#fff' }}>{fastestSingleTurn.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4' }}>
                  Completed a single turn in a blistering **{formatTime(fastestSingleTurn.duration)}** in Round {fastestSingleTurn.round}!
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Participant breakdown table */}
      <div>
        <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📊</span> Detailed Participant Breakdown
        </h2>
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px' }}>Participant</th>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', textAlign: 'center' }}>Turns</th>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', textAlign: 'center' }}>Cumulative Time</th>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', textAlign: 'center' }}>Avg Turn</th>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', textAlign: 'center' }}>Min/Max Turn</th>
              </tr>
            </thead>
            <tbody>
              {participantList.map(p => {
                const borderCol = p.type === 'dm' ? 'var(--neon-pink)' : `var(${p.color})`;
                return (
                  <tr key={p.name} style={{ borderBottom: '1px solid var(--border-color)', hover: 'background: rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: borderCol, boxShadow: `0 0 6px ${borderCol}` }} />
                      <div>
                        <span style={{ fontWeight: '600', color: '#fff' }}>{p.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>({p.charClass})</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', color: 'var(--text-primary)' }}>{p.turnCount}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatTime(p.totalDuration)}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', color: 'var(--neon-cyan)', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{formatTime(p.average)}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                      {formatTime(p.minTurn)} / {formatTime(p.maxTurn)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
