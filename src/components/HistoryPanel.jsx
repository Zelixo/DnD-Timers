import React, { useState } from 'react';

export default function HistoryPanel({ history, onClearHistory, onDeleteItem, onRestart }) {
  const [expandedId, setExpandedId] = useState(null);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatDate = (isoStr) => {
    const date = new Date(isoStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleToggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Math helper for pacing consistency
  const calculateStdDev = (durations, mean) => {
    if (durations.length <= 1) return 0;
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
    return Math.sqrt(variance);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--neon-cyan)', filter: 'drop-shadow(var(--shadow-cyan-glow))' }}>📖</span>
            Saved Session Logs
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Browse through your saved Combat and Roleplay (RP) pacing analytics reports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {history.length > 0 && (
            <button 
              onClick={() => {
                if (window.confirm("Are you sure you want to permanently delete all saved session logs?")) {
                  onClearHistory();
                }
              }} 
              className="btn-secondary" 
              style={{ color: 'var(--neon-pink)', borderColor: 'rgba(255, 0, 122, 0.2)' }}
            >
              🧹 Clear All Logs
            </button>
          )}
          <button onClick={onRestart} className="btn-neon btn-cyan">
            ⚔️ Back to Tracker
          </button>
        </div>
      </div>

      {/* History List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {history.length === 0 ? (
          <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No saved pacing logs found. Click "Save Log" on the tracker tab to log a session.
          </div>
        ) : (
          [...history].reverse().map((session, index) => {
            const isExpanded = expandedId === session.id;
            
            // 1. Math: Player vs DM Time split
            let playerTimes = 0;
            let dmTimes = 0;
            session.turns.forEach(t => {
              if (t.type === 'dm') dmTimes += t.duration;
              else playerTimes += t.duration;
            });
            const totalTurnTime = playerTimes + dmTimes || 1;
            const playerPercent = Math.round((playerTimes / totalTurnTime) * 100);
            const dmPercent = 100 - playerPercent;

            // 2. Math: Active vs Interruption/Paused time
            // Interruption/Paused time is session.totalTime minus the sum of turn record times
            const interruptionTime = Math.max(0, session.totalTime - totalTurnTime);
            const activePercent = Math.round((totalTurnTime / (session.totalTime || 1)) * 100);
            const pausePercent = 100 - activePercent;

            // 3. Math: Round-by-Round durations
            const roundDurations = {};
            session.turns.forEach(t => {
              roundDurations[t.round] = (roundDurations[t.round] || 0) + t.duration;
            });
            const roundList = Object.keys(roundDurations).map(rd => ({
              round: parseInt(rd, 10),
              duration: roundDurations[rd]
            })).sort((a, b) => a.round - b.round);
            const maxRoundDuration = roundList.length > 0 ? Math.max(...roundList.map(r => r.duration)) : 1;

            // 4. Compute live diagnostics text
            let diagnosticSummary = "";
            const playerAvg = playerTimes / (session.turns.filter(t => t.type === 'player').length || 1);
            if (playerAvg < 20) {
              diagnosticSummary += "🔥 Pacing was exceptionally swift! Players averaged under 20s per turn. ";
            } else if (playerAvg > 50) {
              diagnosticSummary += "⚠️ Pacing was somewhat sluggish. Players averaged over 50s per turn. Encourage pre-planning. ";
            } else {
              diagnosticSummary += "👍 Pacing was normal and healthy, averaging a steady " + Math.round(playerAvg) + "s per player turn. ";
            }

            if (pausePercent > 35) {
              diagnosticSummary += "🛑 High pause ratio (" + pausePercent + "%). This indicates substantial time spent on rules discussions, setups, or out-of-game distractions.";
            } else {
              diagnosticSummary += "📈 High action density! Out-of-game interruptions took only " + pausePercent + "% of the session.";
            }

            // Type badge styles
            const getSessionTypeColor = (type) => {
              switch (type?.toLowerCase()) {
                case 'combat': return 'var(--neon-green)';
                case 'rp': return 'var(--neon-cyan)';
                case 'mixed': return 'var(--neon-purple)';
                default: return 'var(--neon-amber)';
              }
            };

            return (
              <div 
                key={session.id} 
                className="glass-panel" 
                style={{ 
                  padding: '20px', 
                  borderLeft: isExpanded ? `4px solid var(--neon-cyan)` : '1px solid var(--border-color)',
                  borderColor: isExpanded ? 'var(--neon-cyan)' : 'var(--border-color)',
                  boxShadow: isExpanded ? 'var(--shadow-cyan-glow)' : 'none',
                  transition: 'all 0.2s ease',
                  background: 'rgba(15, 18, 25, 0.4)'
                }}
              >
                {/* Header summary of card */}
                <div 
                  onClick={() => handleToggleExpand(session.id)}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                        LOG #{history.length - index}
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                        {session.sessionName || `Encounter - ${formatDate(session.timestamp)}`}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Logged: {formatDate(session.timestamp)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {session.sessionType && (
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '3px 8px', 
                        borderRadius: '6px', 
                        background: 'rgba(255,255,255,0.02)',
                        color: getSessionTypeColor(session.sessionType),
                        border: `1px solid ${getSessionTypeColor(session.sessionType)}`,
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {session.sessionType}
                      </span>
                    )}
                    <div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Rounds</span>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--neon-cyan)' }}>{session.rounds}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Duration</span>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#fff', fontFamily: 'var(--font-mono)' }}>{formatTime(session.totalTime)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Pacing Ratio</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        👥 {playerPercent}% / ♛ {dmPercent}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Are you sure you want to delete this session log?")) {
                            onDeleteItem(session.id);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '15px',
                          padding: '0 4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Delete log"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded details (Full Analytics Report) */}
                {isExpanded && (
                  <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Diagnostic Summary Panel */}
                    <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid var(--neon-cyan)' }}>
                      <h4 style={{ fontSize: '12px', color: 'var(--neon-cyan)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold' }}>
                        Pacing Diagnostics & AI Pacing Analysis
                      </h4>
                      <p style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6' }}>
                        {diagnosticSummary}
                      </p>
                    </div>

                    {/* Visual Charts Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                      
                      {/* Chart 1: Time Splits */}
                      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          Pacing Splits (Player vs DM)
                        </span>
                        
                        <div style={{ height: '16px', width: '100%', borderRadius: '8px', overflow: 'hidden', display: 'flex', border: '1px solid var(--border-color)' }}>
                          <div style={{ width: `${playerPercent}%`, background: 'var(--neon-cyan)', height: '100%' }} title={`Players: ${playerPercent}%`} />
                          <div style={{ width: `${dmPercent}%`, background: 'var(--neon-pink)', height: '100%' }} title={`DM Time: ${dmPercent}%`} />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ color: 'var(--neon-cyan)' }}>👥 Players: {formatTime(playerTimes)} ({playerPercent}%)</span>
                          <span style={{ color: 'var(--neon-pink)' }}>♛ DM Time: {formatTime(dmTimes)} ({dmPercent}%)</span>
                        </div>
                      </div>

                      {/* Chart 2: Interruption Splits */}
                      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          Activity Density (Action vs Pauses)
                        </span>
                        
                        <div style={{ height: '16px', width: '100%', borderRadius: '8px', overflow: 'hidden', display: 'flex', border: '1px solid var(--border-color)' }}>
                          <div style={{ width: `${activePercent}%`, background: 'var(--neon-green)', height: '100%' }} />
                          <div style={{ width: `${pausePercent}%`, background: 'var(--neon-amber)', height: '100%' }} />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ color: 'var(--neon-green)' }}>⚔️ Active Turns: {formatTime(totalTurnTime)} ({activePercent}%)</span>
                          <span style={{ color: 'var(--neon-amber)' }}>⏱️ Pauses/Rules: {formatTime(interruptionTime)} ({pausePercent}%)</span>
                        </div>
                      </div>

                    </div>

                    {/* Round Pacing Progression Graph (Only shown if combat with rounds) */}
                    {roundList.length > 0 && (
                      <div className="glass-panel" style={{ padding: '16px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>
                          Pacing Progression (Time spent per Round)
                        </span>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {roundList.map(rd => {
                            const percent = Math.max(8, (rd.duration / maxRoundDuration) * 100);
                            return (
                              <div key={rd.round} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '60px', fontWeight: 'bold' }}>
                                  Round {rd.round}
                                </span>
                                <div style={{ flex: 1, height: '18px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div 
                                    style={{ 
                                      width: `${percent}%`, 
                                      height: '100%', 
                                      background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))',
                                      boxShadow: '0 0 10px rgba(0, 242, 254, 0.2)',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      paddingLeft: '8px'
                                    }}
                                  >
                                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#000', fontFamily: 'var(--font-mono)' }}>
                                      {formatTime(rd.duration)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Detailed Statistics Table */}
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                        Individual Participant Metrics
                      </span>
                      <div className="glass-panel" style={{ overflowX: 'auto', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                              <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Participant</th>
                              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Turns</th>
                              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Total Time</th>
                              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Avg Turn</th>
                              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Deviation (Consistency)</th>
                              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Fastest/Slowest</th>
                            </tr>
                          </thead>
                          <tbody>
                            {session.combatQueue.map(item => {
                              const pRecords = session.turns.filter(t => t.name === item.name);
                              const tCount = pRecords.length;
                              const tTotal = pRecords.reduce((acc, curr) => acc + curr.duration, 0);
                              const tAvg = tCount > 0 ? Math.round(tTotal / tCount) : 0;
                              
                              const durations = pRecords.map(r => r.duration);
                              const stdDev = calculateStdDev(durations, tAvg);
                              
                              const minT = tCount > 0 ? Math.min(...durations) : 0;
                              const maxT = tCount > 0 ? Math.max(...durations) : 0;

                              const borderCol = item.type === 'dm' ? 'var(--neon-pink)' : `var(${item.color})`;

                              return (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: borderCol }} />
                                    <div>
                                      <span style={{ fontWeight: '600', color: '#fff' }}>{item.name}</span>
                                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '6px' }}>({item.charClass})</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#fff' }}>{tCount}</td>
                                  <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{formatTime(tTotal)}</td>
                                  <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--neon-cyan)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{formatTime(tAvg)}</td>
                                  <td style={{ padding: '12px 16px', textAlign: 'center', color: stdDev > 25 ? 'var(--neon-pink)' : 'var(--neon-green)', fontFamily: 'var(--font-mono)' }}>
                                    ±{Math.round(stdDev)}s 
                                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                      ({stdDev > 25 ? 'Volatile' : 'Steady'})
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                                    {formatTime(minT)} / {formatTime(maxT)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
