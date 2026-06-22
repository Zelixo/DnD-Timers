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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--neon-cyan)', filter: 'drop-shadow(var(--shadow-cyan-glow))' }}>📖</span>
            Encounter History & Logs
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Browse through your completed encounters and trace session pacing improvements over time.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {history.length > 0 && (
            <button 
              onClick={() => {
                if (window.confirm("Are you sure you want to permanently clear all combat logs?")) {
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
            ⚔️ Setup Encounter
          </button>
        </div>
      </div>

      {/* History List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {history.length === 0 ? (
          <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No past encounter logs found. Run some combat sessions to populate this tab!
          </div>
        ) : (
          [...history].reverse().map((session, index) => {
            const isExpanded = expandedId === session.id;
            
            // Calculate some basic details for summary
            let playerTimes = 0;
            let dmTimes = 0;
            session.turns.forEach(t => {
              if (t.type === 'dm') dmTimes += t.duration;
              else playerTimes += t.duration;
            });
            const total = playerTimes + dmTimes || 1;
            const playerPercent = Math.round((playerTimes / total) * 100);

            return (
              <div 
                key={session.id} 
                className="glass-panel" 
                style={{ 
                  padding: '20px', 
                  borderLeft: isExpanded ? `4px solid var(--neon-cyan)` : '1px solid var(--border-color)',
                  borderColor: isExpanded ? 'var(--neon-cyan)' : 'var(--border-color)',
                  boxShadow: isExpanded ? 'var(--shadow-cyan-glow)' : 'none',
                  transition: 'all 0.2s ease'
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                      ENCOUNTER #{history.length - index}
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                      {formatDate(session.timestamp)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Rounds</span>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--neon-cyan)' }}>{session.rounds}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Duration</span>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: '#fff', fontFamily: 'var(--font-mono)' }}>{formatTime(session.totalTime)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Pacing Ratio</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        👥 {playerPercent}% / ♛ {100 - playerPercent}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Delete this log?")) {
                            onDeleteItem(session.id);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '16px',
                          padding: '0 4px'
                        }}
                        title="Delete log"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 'bold' }}>
                      Participant Statistics
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                      {session.combatQueue.map(item => {
                        // Aggregate records for this player in this session
                        const records = session.turns.filter(t => t.name === item.name);
                        const turnCount = records.length;
                        const totalDur = records.reduce((acc, curr) => acc + curr.duration, 0);
                        const avg = turnCount > 0 ? Math.round(totalDur / turnCount) : 0;
                        const borderCol = item.type === 'dm' ? 'var(--neon-pink)' : `var(${item.color})`;

                        return (
                          <div 
                            key={item.id} 
                            className="glass-panel" 
                            style={{ 
                              padding: '12px 16px', 
                              borderLeft: `3px solid ${borderCol}`,
                              background: 'rgba(255,255,255,0.01)'
                            }}
                          >
                            <div style={{ fontWeight: '600', color: '#fff', fontSize: '14px' }}>{item.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{item.charClass}</div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '4px 0' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Turns:</span>
                              <span style={{ color: 'var(--text-primary)' }}>{turnCount}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '4px 0' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Avg Time:</span>
                              <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{formatTime(avg)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '4px 0' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Total Time:</span>
                              <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatTime(totalDur)}</span>
                            </div>
                          </div>
                        );
                      })}
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
