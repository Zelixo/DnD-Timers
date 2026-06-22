import React, { useState, useEffect } from 'react';

export default function InitiativeBuilder({ roster, combatQueue, onUpdateQueue, onBack, onStartCombat }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [dmTimeCount, setDmTimeCount] = useState(0);

  // Initialize selected IDs based on current queue (if we are resuming or going back)
  useEffect(() => {
    const ids = combatQueue
      .filter(item => item.type === 'player')
      .map(item => item.rosterId);
    setSelectedIds(ids);

    const dmSlots = combatQueue.filter(item => item.type === 'dm');
    setDmTimeCount(dmSlots.length);
  }, []);

  const handleTogglePlayer = (player) => {
    if (selectedIds.includes(player.id)) {
      // Remove from selected list and from queue
      setSelectedIds(selectedIds.filter(id => id !== player.id));
      onUpdateQueue(combatQueue.filter(item => !(item.type === 'player' && item.rosterId === player.id)));
    } else {
      // Add to selected list and append to queue
      setSelectedIds([...selectedIds, player.id]);
      const newItem = {
        id: `queue-${Date.now()}-${Math.random()}`,
        type: 'player',
        rosterId: player.id,
        name: player.name,
        color: player.color,
        charClass: player.charClass,
        initiative: 0
      };
      onUpdateQueue([...combatQueue, newItem]);
    }
  };

  const handleAddDmSlot = () => {
    const newCount = dmTimeCount + 1;
    setDmTimeCount(newCount);
    
    const newItem = {
      id: `queue-${Date.now()}-${Math.random()}`,
      type: 'dm',
      name: `DM Time (${newCount})`,
      color: '--neon-pink',
      charClass: 'DM',
      initiative: 0
    };
    onUpdateQueue([...combatQueue, newItem]);
  };

  const handleRemoveQueueItem = (item) => {
    onUpdateQueue(combatQueue.filter(q => q.id !== item.id));
    if (item.type === 'player') {
      setSelectedIds(selectedIds.filter(id => id !== item.rosterId));
    }
  };

  const handleInitiativeChange = (id, val) => {
    const numericVal = parseInt(val, 10) || 0;
    onUpdateQueue(combatQueue.map(item => 
      item.id === id ? { ...item, initiative: numericVal } : item
    ));
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newQueue = [...combatQueue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[index - 1];
    newQueue[index - 1] = temp;
    onUpdateQueue(newQueue);
  };

  const handleMoveDown = (index) => {
    if (index === combatQueue.length - 1) return;
    const newQueue = [...combatQueue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[index + 1];
    newQueue[index + 1] = temp;
    onUpdateQueue(newQueue);
  };

  const handleSortInitiative = () => {
    const sorted = [...combatQueue].sort((a, b) => b.initiative - a.initiative);
    onUpdateQueue(sorted);
  };

  return (
    <div className="grid-cols-2" style={{ gap: '24px' }}>
      {/* Left Column: Selection */}
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--neon-purple)', filter: 'drop-shadow(var(--shadow-purple-glow))' }}>⚔️</span>
            Choose Combatants
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
            Select players from the roster to participate in this combat session, and add custom DM Time slots.
          </p>
        </div>

        <div>
          <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
            Available Players ({roster.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
            {roster.length === 0 ? (
              <div style={{ padding: '16px', textCenter: 'center', color: 'var(--text-muted)', fontSize: '14px', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                Roster is empty. Add players in Roster tab.
              </div>
            ) : (
              roster.map(player => {
                const isSelected = selectedIds.includes(player.id);
                return (
                  <div
                    key={player.id}
                    onClick={() => handleTogglePlayer(player)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: isSelected ? `var(${player.color})` : 'var(--border-color)',
                      background: isSelected ? `rgba(255,255,255,0.03)` : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: isSelected ? `0 0 10px rgba(255,255,255,0.02)` : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: '600', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{player.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>({player.charClass})</span>
                    </div>
                    <span style={{
                      color: isSelected ? `var(${player.color})` : 'var(--text-muted)',
                      fontSize: '18px'
                    }}>
                      {isSelected ? '✓' : '+'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
            DM Actions
          </h3>
          <button 
            onClick={handleAddDmSlot} 
            className="btn-neon btn-pink" 
            style={{ width: '100%', justifyContent: 'center' }}
          >
            ⏱️ Add "DM Time" Slot
          </button>
          <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '8px', fontStyle: 'italic', lineHeight: '1.4' }}>
            Add DM slots to track monster rounds, environment updates, narrative actions, or rules explanations. You can insert multiple DM slots.
          </p>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
          <button onClick={onBack} className="btn-secondary" style={{ flex: '1' }}>
            ← Back to Roster
          </button>
        </div>
      </div>

      {/* Right Column: Queue & Initiative ordering */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: 'var(--neon-cyan)', filter: 'drop-shadow(var(--shadow-cyan-glow))' }}>📋</span>
              Initiative Order
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Input initiative rolls, then sort or manually arrange the order.
            </p>
          </div>
          {combatQueue.length > 1 && (
            <button 
              onClick={handleSortInitiative}
              className="btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              ⚡ Auto-Sort
            </button>
          )}
        </div>

        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
          {combatQueue.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', border: '1px dashed var(--border-color)', borderRadius: '8px', width: '100%' }}>
              Select combatants or add a DM slot to build the initiative order.
            </div>
          ) : (
            combatQueue.map((item, index) => {
              const borderCol = item.type === 'dm' ? 'var(--neon-pink)' : `var(${item.color})`;
              return (
                <div
                  key={item.id}
                  className="glass-panel"
                  style={{
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderLeft: `4px solid ${borderCol}`,
                    background: item.type === 'dm' ? 'rgba(255,0,122,0.02)' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#{index + 1}</span>
                      <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600', color: '#fff', fontSize: '14px' }}>{item.name}</span>
                        {item.type === 'player' && (
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{item.charClass}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 'bold' }}>INIT</span>
                      <input
                        type="number"
                        className="input-neon"
                        value={item.initiative || ''}
                        onChange={(e) => handleInitiativeChange(item.id, e.target.value)}
                        style={{ width: '55px', height: '32px', padding: '4px 8px', textAlign: 'center', fontSize: '14px' }}
                        placeholder="0"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-color)',
                          color: index === 0 ? 'var(--text-muted)' : 'var(--neon-cyan)',
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px'
                        }}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === combatQueue.length - 1}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-color)',
                          color: index === combatQueue.length - 1 ? 'var(--text-muted)' : 'var(--neon-cyan)',
                          cursor: index === combatQueue.length - 1 ? 'not-allowed' : 'pointer',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px'
                        }}
                      >
                        ▼
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveQueueItem(item)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '4px'
                      }}
                      title="Remove from combat"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={onStartCombat}
          className="btn-neon btn-green"
          style={{ width: '100%', justifyContent: 'center', height: '48px', fontSize: '15px' }}
          disabled={combatQueue.length === 0}
        >
          ⚔️ Start Session Timer ⚔️
        </button>
      </div>
    </div>
  );
}
