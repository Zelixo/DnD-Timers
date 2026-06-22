import { useState } from 'react';

export default function HistoryPanel({ history, onClearHistory, onDeleteItem, onRestart }) {
  const [expandedId, setExpandedId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('list');

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const exportToJson = (session) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const dateSafe = session.sessionName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadAnchor.setAttribute("download", `initflow-report-${dateSafe}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportToMarkdown = (session) => {
    let mdContent = `# Initiative Flow - Combat Pacing Report\n\n`;
    mdContent += `**Session Name:** ${session.sessionName}\n`;
    mdContent += `**Session Type:** ${session.sessionType || 'General'}\n`;
    mdContent += `**Date:** ${new Date(session.timestamp).toLocaleString()}\n`;
    mdContent += `**Total Combat Duration:** ${formatTime(session.totalTime)}\n`;
    mdContent += `**Rounds Logged:** ${session.rounds}\n\n`;

    let playerTimes = 0;
    let dmTimes = 0;
    session.turns.forEach(t => {
      if (t.type === 'dm') dmTimes += t.duration;
      else playerTimes += t.duration;
    });
    const totalTurnTime = playerTimes + dmTimes || 1;
    const playerPercent = Math.round((playerTimes / totalTurnTime) * 100);
    const dmPercent = 100 - playerPercent;
    const interruptionTime = Math.max(0, session.totalTime - totalTurnTime);
    const activePercent = Math.round((totalTurnTime / (session.totalTime || 1)) * 100);
    const pausePercent = 100 - activePercent;

    mdContent += `## Pacing Diagnostics & Metrics Splits\n\n`;
    mdContent += `- **Player Time:** ${formatTime(playerTimes)} (${playerPercent}%)\n`;
    mdContent += `- **DM Time:** ${formatTime(dmTimes)} (${dmPercent}%)\n`;
    mdContent += `- **Active Action Time:** ${formatTime(totalTurnTime)} (${activePercent}%)\n`;
    mdContent += `- **Pauses / Rules Interruptions:** ${formatTime(interruptionTime)} (${pausePercent}%)\n\n`;

    mdContent += `## Individual Participant Metrics\n\n`;
    mdContent += `| Participant | Role/Class | Turns | Total Time | Avg Turn | Consistency (Std Dev) | Fastest / Slowest |\n`;
    mdContent += `| :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n`;

    session.combatQueue.forEach(item => {
      const pRecords = session.turns.filter(t => t.name === item.name);
      const tCount = pRecords.length;
      const tTotal = pRecords.reduce((acc, curr) => acc + curr.duration, 0);
      const tAvg = tCount > 0 ? Math.round(tTotal / tCount) : 0;
      
      const durations = pRecords.map(r => r.duration);
      const stdDev = calculateStdDev(durations, tAvg);
      
      const minT = tCount > 0 ? Math.min(...durations) : 0;
      const maxT = tCount > 0 ? Math.max(...durations) : 0;
      const roleStr = item.type === 'dm' ? 'DM' : item.charClass;

      mdContent += `| ${item.type === 'player' ? (item.playerName || item.name) : item.name} | ${roleStr} | ${tCount} | ${formatTime(tTotal)} | ${formatTime(tAvg)} | ±${Math.round(stdDev)}s (${stdDev > 25 ? 'Volatile' : 'Steady'}) | ${formatTime(minT)} / ${formatTime(maxT)} |\n`;
    });

    mdContent += `\n\n*Report generated automatically by Initiative Flow DnD Pacing companion.*`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    const dateSafe = session.sessionName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadAnchor.setAttribute("download", `initflow-report-${dateSafe}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
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

  const renderCampaignAnalytics = () => {
    let totalSessions = history.length;
    let totalTime = history.reduce((sum, s) => sum + s.totalTime, 0);
    let totalRounds = history.reduce((sum, s) => sum + s.rounds, 0);
    let totalTurns = history.reduce((sum, s) => sum + s.turns.length, 0);

    const playerCombinedStats = {};
    let absoluteFastest = { name: null, time: Infinity, sessionName: '' };
    let absoluteSlowest = { name: null, time: -Infinity, sessionName: '' };

    history.forEach(session => {
      session.turns.forEach(rec => {
        if (rec.type === 'player') {
          if (!playerCombinedStats[rec.name]) {
            playerCombinedStats[rec.name] = { 
              name: rec.name, 
              totalTime: 0, 
              count: 0, 
              durations: [],
              charClass: rec.charClass || 'Unknown'
            };
          }
          const stat = playerCombinedStats[rec.name];
          stat.totalTime += rec.duration;
          stat.count += 1;
          stat.durations.push(rec.duration);

          if (rec.duration > 0) {
            if (rec.duration < absoluteFastest.time) {
              absoluteFastest = { name: rec.name, time: rec.duration, sessionName: session.sessionName };
            }
            if (rec.duration > absoluteSlowest.time) {
              absoluteSlowest = { name: rec.name, time: rec.duration, sessionName: session.sessionName };
            }
          }
        }
      });
    });

    const playersList = Object.values(playerCombinedStats).map(p => {
      const avg = p.count > 0 ? p.totalTime / p.count : 0;
      const stdDev = calculateStdDev(p.durations, avg);
      const minT = p.durations.length > 0 ? Math.min(...p.durations) : 0;
      const maxT = p.durations.length > 0 ? Math.max(...p.durations) : 0;
      return {
        name: p.name,
        charClass: p.charClass,
        count: p.count,
        totalTime: p.totalTime,
        avg,
        stdDev,
        minT,
        maxT
      };
    });

    const eligiblePaceSetters = [...playersList].filter(p => p.count >= 3).sort((a, b) => a.avg - b.avg);
    const campaignPaceSetter = eligiblePaceSetters.length > 0 ? eligiblePaceSetters[0] : null;

    const eligibleSlowpokes = [...playersList].filter(p => p.count >= 3).sort((a, b) => b.avg - a.avg);
    const campaignSlowpoke = eligibleSlowpokes.length > 1 ? eligibleSlowpokes[0] : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Campaign Metrics Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          
          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid var(--neon-cyan)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Logged Sessions</span>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginTop: '6px' }}>{totalSessions}</div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid var(--neon-purple)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Combat Time</span>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>{formatTime(totalTime)}</div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid var(--neon-green)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Rounds Logged</span>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginTop: '6px' }}>{totalRounds}</div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid var(--neon-amber)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Turns Tracked</span>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginTop: '6px' }}>{totalTurns}</div>
          </div>

        </div>

        {/* Campaign Awards */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '14px', color: '#fff', textTransform: 'uppercase', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            🏆 Campaign Pacing Achievements
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            
            {campaignPaceSetter && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0, 242, 254, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0, 242, 254, 0.1)' }}>
                <span style={{ fontSize: '24px' }}>👑</span>
                <div>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Campaign Pace Setter</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>{campaignPaceSetter.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Avg turn: {formatTime(Math.round(campaignPaceSetter.avg))}</span>
                </div>
              </div>
            )}

            {campaignSlowpoke && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 0, 122, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 0, 122, 0.1)' }}>
                <span style={{ fontSize: '24px' }}>💤</span>
                <div>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Campaign Slowpoke</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--neon-pink)' }}>{campaignSlowpoke.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Avg turn: {formatTime(Math.round(campaignSlowpoke.avg))}</span>
                </div>
              </div>
            )}

            {absoluteFastest.name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0, 255, 135, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0, 255, 135, 0.1)' }}>
                <span style={{ fontSize: '24px' }}>🏎️</span>
                <div>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>All-Time Record Breaker</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--neon-green)' }}>{absoluteFastest.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>{formatTime(absoluteFastest.time)} ({absoluteFastest.sessionName})</span>
                </div>
              </div>
            )}

            {absoluteSlowest.name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 208, 0, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 208, 0, 0.1)' }}>
                <span style={{ fontSize: '24px' }}>⏳</span>
                <div>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>All-Time Time Sinker</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--neon-amber)' }}>{absoluteSlowest.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>{formatTime(absoluteSlowest.time)} ({absoluteSlowest.sessionName})</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Players Aggregated Stats Table */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', color: '#fff', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '12px' }}>
            👥 All-Time Player Pacing Leaderboard
          </h3>
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Player</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Class</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Total Turns</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Total Time</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Avg Turn</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Consistency</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>Min / Max Turn</th>
                </tr>
              </thead>
              <tbody>
                {playersList.sort((a, b) => a.avg - b.avg).map(p => (
                  <tr key={p.name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#fff' }}>{p.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', textAlign: 'center' }}>{p.charClass}</td>
                    <td style={{ padding: '12px 16px', color: '#fff', textAlign: 'center' }}>{p.count}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{formatTime(p.totalTime)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--neon-cyan)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{formatTime(Math.round(p.avg))}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: p.stdDev > 25 ? 'var(--neon-pink)' : 'var(--neon-green)', fontFamily: 'var(--font-mono)' }}>
                      ±{Math.round(p.stdDev)}s 
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                        ({p.stdDev > 25 ? 'Volatile' : 'Steady'})
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                      {formatTime(p.minT)} / {formatTime(p.maxT)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
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

      {/* Sub-tab navigation */}
      {history.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <button 
            className={`btn-secondary ${activeSubTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('list')}
            style={{ 
              borderColor: activeSubTab === 'list' ? 'var(--neon-cyan)' : 'var(--border-color)',
              color: activeSubTab === 'list' ? '#fff' : 'var(--text-secondary)',
              background: activeSubTab === 'list' ? 'rgba(0, 242, 254, 0.03)' : '',
              padding: '8px 16px',
              fontSize: '13px'
            }}
          >
            📋 Individual Logs ({history.length})
          </button>
          <button 
            className={`btn-secondary ${activeSubTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('analytics')}
            style={{ 
              borderColor: activeSubTab === 'analytics' ? 'var(--neon-purple)' : 'var(--border-color)',
              color: activeSubTab === 'analytics' ? '#fff' : 'var(--text-secondary)',
              background: activeSubTab === 'analytics' ? 'rgba(189, 0, 255, 0.03)' : '',
              padding: '8px 16px',
              fontSize: '13px'
            }}
          >
            📊 Campaign Analytics
          </button>
        </div>
      )}

      {/* History List or Campaign Analytics Panel */}
      {activeSubTab === 'analytics' && history.length > 0 ? (
        renderCampaignAnalytics()
      ) : (
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
                    <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid var(--neon-cyan)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ flex: 1, minWidth: '240px' }}>
                        <h4 style={{ fontSize: '12px', color: 'var(--neon-cyan)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold' }}>
                          Pacing Diagnostics & AI Pacing Analysis
                        </h4>
                        <p style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6' }}>
                          {diagnosticSummary}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', minWidth: '160px' }}>
                        <button 
                          onClick={() => exportToMarkdown(session)} 
                          className="btn-secondary" 
                          style={{ fontSize: '11px', padding: '6px 12px', width: '100%', justifyContent: 'center', borderColor: 'rgba(0, 242, 254, 0.2)', color: 'var(--neon-cyan)' }}
                        >
                          📤 Export Markdown (.md)
                        </button>
                        <button 
                          onClick={() => exportToJson(session)} 
                          className="btn-secondary" 
                          style={{ fontSize: '11px', padding: '6px 12px', width: '100%', justifyContent: 'center', borderColor: 'rgba(189, 0, 255, 0.2)', color: 'var(--neon-purple)' }}
                        >
                          📤 Export JSON (.json)
                        </button>
                      </div>
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
                                      <span style={{ fontWeight: '600', color: '#fff' }}>
                                        {item.type === 'player' ? (item.playerName || item.name) : item.name}
                                      </span>
                                      {item.type === 'player' && (
                                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                          ({item.charName || 'Character'} // {item.charClass})
                                        </span>
                                      )}
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
      )}

    </div>
  );
}
