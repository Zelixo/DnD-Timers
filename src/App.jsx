import React, { useState, useEffect } from 'react';
import RosterManager from './components/RosterManager';
import InitiativeBuilder from './components/InitiativeBuilder';
import CombatPanel from './components/CombatPanel';
import StatsDashboard from './components/StatsDashboard';
import HistoryPanel from './components/HistoryPanel';

function App() {
  const [view, setView] = useState('roster'); // 'roster', 'setup', 'combat', 'stats', 'history'
  
  // Roster state
  const [roster, setRoster] = useState(() => {
    const saved = localStorage.getItem('dnd_roster');
    return saved ? JSON.parse(saved) : [
      { id: 'p1', name: 'Grog Strongjaw', charClass: 'Barbarian', color: '--neon-amber' },
      { id: 'p2', name: 'Keyleth', charClass: 'Druid', color: '--neon-green' },
      { id: 'p3', name: 'Scanlan Shorthalt', charClass: 'Bard', color: '--neon-purple' },
      { id: 'p4', name: 'Percy de Rolo', charClass: 'Fighter', color: '--neon-cyan' }
    ];
  });

  // Combat initiative queue
  const [combatQueue, setCombatQueue] = useState(() => {
    const saved = localStorage.getItem('dnd_combat_queue');
    return saved ? JSON.parse(saved) : [];
  });

  // Combat history logs
  const [combatHistory, setCombatHistory] = useState(() => {
    const saved = localStorage.getItem('dnd_combat_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Last finished encounter stats
  const [lastSessionStats, setLastSessionStats] = useState(null);

  // Auto-save Roster, Queue, and History on change
  useEffect(() => {
    localStorage.setItem('dnd_roster', JSON.stringify(roster));
  }, [roster]);

  useEffect(() => {
    localStorage.setItem('dnd_combat_queue', JSON.stringify(combatQueue));
  }, [combatQueue]);

  useEffect(() => {
    localStorage.setItem('dnd_combat_history', JSON.stringify(combatHistory));
  }, [combatHistory]);

  const handleUpdateRoster = (newRoster) => {
    setRoster(newRoster);
  };

  const handleUpdateQueue = (newQueue) => {
    setCombatQueue(newQueue);
  };

  const handleStartCombat = () => {
    setView('combat');
  };

  const handleEndCombat = (sessionStats) => {
    setLastSessionStats(sessionStats);
    setCombatHistory(prev => [...prev, sessionStats]);
    setView('stats');
  };

  const handleRestart = () => {
    setView('setup');
  };

  const handleClearHistory = () => {
    setCombatHistory([]);
  };

  const handleDeleteHistoryItem = (id) => {
    setCombatHistory(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="container">
      
      {/* Top Header & Navigation Navigation */}
      <header 
        className="glass-panel" 
        style={{ 
          padding: '16px 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '32px',
          borderBottom: '1px solid var(--border-color)',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setView('roster')}>
          <div 
            style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '8px', 
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              color: '#000',
              fontSize: '18px',
              boxShadow: 'var(--shadow-cyan-glow)'
            }}
          >
            ⏳
          </div>
          <div>
            <h1 style={{ fontSize: '18px', margin: 0, letterSpacing: '0.02em', color: '#fff' }}>INITIATIVE FLOW</h1>
            <span style={{ fontSize: '10px', color: 'var(--neon-cyan)', fontWeight: '700', textTransform: 'uppercase', tracking: '0.1em' }}>Combat Turn Timer & Stats</span>
          </div>
        </div>

        {/* Tab Links */}
        <nav style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn-secondary ${view === 'roster' ? 'active' : ''}`}
            onClick={() => setView('roster')}
            style={{ 
              borderColor: view === 'roster' ? 'var(--neon-cyan)' : 'var(--border-color)',
              color: view === 'roster' ? '#fff' : 'var(--text-secondary)',
              boxShadow: view === 'roster' ? '0 0 10px rgba(0, 242, 254, 0.15)' : 'none',
              background: view === 'roster' ? 'rgba(0, 242, 254, 0.05)' : ''
            }}
          >
            🛡️ Party Roster
          </button>
          
          <button 
            className={`btn-secondary ${view === 'setup' ? 'active' : ''}`}
            onClick={() => setView('setup')}
            style={{ 
              borderColor: view === 'setup' ? 'var(--neon-purple)' : 'var(--border-color)',
              color: view === 'setup' ? '#fff' : 'var(--text-secondary)',
              boxShadow: view === 'setup' ? '0 0 10px rgba(189, 0, 255, 0.15)' : 'none',
              background: view === 'setup' ? 'rgba(189, 0, 255, 0.05)' : ''
            }}
          >
            ⚔️ Combat Setup
          </button>

          <button 
            className={`btn-secondary ${view === 'history' ? 'active' : ''}`}
            onClick={() => setView('history')}
            style={{ 
              borderColor: view === 'history' ? 'var(--neon-pink)' : 'var(--border-color)',
              color: view === 'history' ? '#fff' : 'var(--text-secondary)',
              boxShadow: view === 'history' ? '0 0 10px rgba(255, 0, 122, 0.15)' : 'none',
              background: view === 'history' ? 'rgba(255, 0, 122, 0.05)' : ''
            }}
          >
            📖 Logs & History
          </button>

          {view === 'combat' && (
            <div 
              className="glass-panel pulse-active-green" 
              onClick={() => setView('combat')}
              style={{ 
                padding: '8px 16px', 
                borderRadius: '8px', 
                borderColor: 'var(--neon-green)', 
                color: 'var(--neon-green)', 
                fontSize: '13px', 
                fontWeight: 'bold', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neon-green)', boxShadow: 'var(--shadow-green-glow)' }} />
              Active Timer
            </div>
          )}
        </nav>
      </header>

      {/* View router */}
      <main style={{ flex: 1 }}>
        {view === 'roster' && (
          <RosterManager 
            roster={roster} 
            onUpdateRoster={handleUpdateRoster} 
            onNext={() => setView('setup')}
          />
        )}

        {view === 'setup' && (
          <InitiativeBuilder 
            roster={roster} 
            combatQueue={combatQueue} 
            onUpdateQueue={handleUpdateQueue} 
            onBack={() => setView('roster')}
            onStartCombat={handleStartCombat}
          />
        )}

        {view === 'combat' && (
          <CombatPanel 
            combatQueue={combatQueue} 
            onUpdateQueue={handleUpdateQueue}
            onEndCombat={handleEndCombat}
            roster={roster}
          />
        )}

        {view === 'stats' && lastSessionStats && (
          <StatsDashboard 
            sessionData={lastSessionStats} 
            onRestart={handleRestart}
          />
        )}

        {view === 'history' && (
          <HistoryPanel 
            history={combatHistory} 
            onClearHistory={handleClearHistory} 
            onDeleteItem={handleDeleteHistoryItem} 
            onRestart={handleRestart}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '48px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span>Initiative Flow - Chess-Style DnD Combat Pacing tracker</span>
        <span>Made with ❤️ for faster turn times</span>
      </footer>

    </div>
  );
}

export default App;
