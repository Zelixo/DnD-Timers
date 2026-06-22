import React, { useState } from 'react';

export default function RosterManager({ roster, onUpdateRoster, onNext }) {
  const [playerName, setPlayerName] = useState('');
  const [charClass, setCharClass] = useState('Fighter');

  const classes = [
    'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 
    'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 
    'Warlock', 'Wizard', 'Artificer', 'Other'
  ];

  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    // Check if player name already exists
    if (roster.some(p => p.name.toLowerCase() === playerName.trim().toLowerCase())) {
      alert('A player with this name already exists in the roster.');
      return;
    }

    const newPlayer = {
      id: `player-${Date.now()}`,
      name: playerName.trim(),
      charClass: charClass,
      color: getRandomNeonColor()
    };

    onUpdateRoster([...roster, newPlayer]);
    setPlayerName('');
  };

  const handleRemovePlayer = (id) => {
    onUpdateRoster(roster.filter(p => p.id !== id));
  };

  const getRandomNeonColor = () => {
    const colors = ['--neon-cyan', '--neon-purple', '--neon-pink', '--neon-green', '--neon-amber'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'left' }}>
        <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--neon-cyan)', filter: 'drop-shadow(var(--shadow-cyan-glow))' }}>🛡️</span>
          Manage Party Roster
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
          Build your standard adventuring party here. This list is saved to local storage so you don't have to re-enter them for future sessions.
        </p>

        <form onSubmit={handleAddPlayer} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: '2 1 200px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Player / Character Name</label>
            <input
              type="text"
              className="input-neon"
              placeholder="e.g. Vax'ildan"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={25}
            />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Class</label>
            <select
              className="input-neon"
              value={charClass}
              onChange={(e) => setCharClass(e.target.value)}
              style={{ appearance: 'none', cursor: 'pointer' }}
            >
              {classes.map(c => (
                <option key={c} value={c} style={{ background: '#1c222e', color: '#fff' }}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="btn-neon btn-cyan" style={{ height: '46px' }}>
              Add to Roster
            </button>
          </div>
        </form>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {roster.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
              No adventurers in the roster yet. Add your first player above!
            </div>
          ) : (
            roster.map(player => (
              <div 
                key={player.id} 
                className="glass-panel" 
                style={{ 
                  padding: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderLeft: `3px solid var(${player.color})`,
                  boxShadow: `0 4px 12px rgba(0, 0, 0, 0.1)`
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{player.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{player.charClass}</div>
                </div>
                <button 
                  onClick={() => handleRemovePlayer(player.id)}
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--neon-pink)', 
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.1s'
                  }}
                  title="Remove player"
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={onNext} 
          className="btn-neon btn-purple" 
          style={{ width: '220px' }}
          disabled={roster.length === 0}
        >
          Setup Combat ⚔️
        </button>
      </div>
    </div>
  );
}
