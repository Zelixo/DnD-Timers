import React, { useState, useEffect, useRef } from 'react';

export default function CombatPanel({ 
  combatQueue, 
  onUpdateQueue, 
  onEndCombat, 
  roster 
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [round, setRound] = useState(1);
  
  // Timers: in seconds
  const [turnTime, setTurnTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Turn logs: array of { id, type, name, round, duration }
  const [turnRecords, setTurnRecords] = useState([]);
  
  // Undo history: stack of snapshots
  const [historyStack, setHistoryStack] = useState([]);

  // Sidebar controls
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showQueueEdit, setShowQueueEdit] = useState(false);

  // Refs for tracking timer intervals
  const intervalRef = useRef(null);

  // Sound effect (we can use synth-beep if supported, or just visual cues)
  // Let's stick to visual cues to avoid audio loading issues, or web audio API beep.
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      // Audio context block
    }
  };

  // Start the timers
  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setTurnTime(prev => prev + 1);
        setTotalTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPaused]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Capture a snapshot of current state for undo
  const captureSnapshot = () => {
    const snapshot = {
      activeIndex,
      round,
      turnTime,
      totalTime,
      turnRecords: [...turnRecords],
      combatQueue: JSON.parse(JSON.stringify(combatQueue))
    };
    setHistoryStack(prev => [...prev, snapshot]);
  };

  const handleEndTurn = () => {
    playBeep();
    captureSnapshot();

    const activeItem = combatQueue[activeIndex];
    
    // Log the turn
    const newRecord = {
      id: `record-${Date.now()}-${Math.random()}`,
      type: activeItem.type,
      name: activeItem.name,
      rosterId: activeItem.rosterId,
      round: round,
      duration: turnTime
    };
    
    setTurnRecords(prev => [...prev, newRecord]);

    // Move to next combatant
    let nextIndex = activeIndex + 1;
    let nextRound = round;
    
    if (nextIndex >= combatQueue.length) {
      nextIndex = 0;
      nextRound = round + 1;
    }

    setActiveIndex(nextIndex);
    setRound(nextRound);
    setTurnTime(0);
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    
    const prevHistory = [...historyStack];
    const lastSnapshot = prevHistory.pop();
    
    setHistoryStack(prevHistory);
    setActiveIndex(lastSnapshot.activeIndex);
    setRound(lastSnapshot.round);
    setTurnTime(lastSnapshot.turnTime);
    setTotalTime(lastSnapshot.totalTime);
    setTurnRecords(lastSnapshot.turnRecords);
    onUpdateQueue(lastSnapshot.combatQueue);
  };

  const handleFinishCombat = () => {
    setIsPaused(true);
    // Log the final uncompleted turn if time has passed
    const finalRecords = [...turnRecords];
    if (turnTime > 0) {
      const activeItem = combatQueue[activeIndex];
      finalRecords.push({
        id: `record-${Date.now()}-${Math.random()}`,
        type: activeItem.type,
        name: activeItem.name,
        rosterId: activeItem.rosterId,
        round: round,
        duration: turnTime
      });
    }

    onEndCombat({
      id: `combat-${Date.now()}`,
      timestamp: new Date().toISOString(),
      totalTime,
      rounds: round,
      turns: finalRecords,
      combatQueue
    });
  };

  // Queue manipulation during combat
  const handleMoveUp = (index) => {
    if (index === 0) return;
    captureSnapshot();
    
    const newQueue = [...combatQueue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[index - 1];
    newQueue[index - 1] = temp;
    
    // Adjust activeIndex if the swap affected who is active
    let newActiveIndex = activeIndex;
    if (activeIndex === index) {
      newActiveIndex = index - 1;
    } else if (activeIndex === index - 1) {
      newActiveIndex = index;
    }
    
    onUpdateQueue(newQueue);
    setActiveIndex(newActiveIndex);
  };

  const handleMoveDown = (index) => {
    if (index === combatQueue.length - 1) return;
    captureSnapshot();
    
    const newQueue = [...combatQueue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[index + 1];
    newQueue[index + 1] = temp;
    
    // Adjust activeIndex if the swap affected who is active
    let newActiveIndex = activeIndex;
    if (activeIndex === index) {
      newActiveIndex = index + 1;
    } else if (activeIndex === index + 1) {
      newActiveIndex = index;
    }
    
    onUpdateQueue(newQueue);
    setActiveIndex(newActiveIndex);
  };

  const handleRemoveQueueItem = (index) => {
    if (combatQueue.length <= 1) {
      alert("Cannot have empty combat queue.");
      return;
    }
    captureSnapshot();
    
    const newQueue = combatQueue.filter((_, idx) => idx !== index);
    
    let newActiveIndex = activeIndex;
    if (activeIndex >= newQueue.length) {
      // If we deleted the last person, active goes back to 0 (and increments round, but let's keep it simple and just set to 0)
      newActiveIndex = 0;
      setRound(prev => prev + 1);
    } else if (activeIndex > index) {
      // If deleted item was before active item, shift activeIndex down by 1
      newActiveIndex = activeIndex - 1;
    }
    
    onUpdateQueue(newQueue);
    setActiveIndex(newActiveIndex);
    setTurnTime(0);
  };

  const handleAddPlayerToSession = (player) => {
    captureSnapshot();
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
    setShowAddMenu(false);
  };

  const handleAddDmSlotToSession = () => {
    captureSnapshot();
    const dmSlots = combatQueue.filter(item => item.type === 'dm');
    const newCount = dmSlots.length + 1;
    
    const newItem = {
      id: `queue-${Date.now()}-${Math.random()}`,
      type: 'dm',
      name: `DM Time (${newCount})`,
      color: '--neon-pink',
      charClass: 'DM',
      initiative: 0
    };
    onUpdateQueue([...combatQueue, newItem]);
    setShowAddMenu(false);
  };

  const activeParticipant = combatQueue[activeIndex] || { name: 'None', type: 'dm', color: '--neon-pink' };
  const onDeckParticipant = combatQueue[(activeIndex + 1) % combatQueue.length] || { name: 'None', type: 'dm', color: '--neon-pink' };
  
  const activeColor = activeParticipant.type === 'dm' ? 'var(--neon-pink)' : `var(${activeParticipant.color})`;
  const activeShadow = activeParticipant.type === 'dm' ? 'var(--shadow-pink-glow)' : `0 0 20px var(${activeParticipant.color})`;

  return (
    <div className="grid-cols-3" style={{ gap: '24px', alignItems: 'stretch' }}>
      
      {/* Left Column: Active Turn Timer (Main Chess clock) */}
      <div className="glass-panel grid-cols-2" style={{ gridColumn: '1 / span 2', padding: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        
        {/* Session Info Bar */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '32px' }}>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>ROUND</span>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--neon-cyan)', textShadow: '0 0 10px rgba(0, 242, 254, 0.4)' }}>
              {round}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>TOTAL ELAPSED</span>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {formatTime(totalTime)}
            </div>
          </div>
        </div>

        {/* Large Chess Timer Panel */}
        <div 
          className="glass-panel" 
          style={{ 
            width: '100%',
            padding: '40px 24px',
            textAlign: 'center',
            borderRadius: '24px',
            border: `2px solid ${activeColor}`,
            boxShadow: activeShadow,
            background: 'rgba(10, 11, 14, 0.6)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Subtle background glow pulsing based on active state */}
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80%',
              height: '80%',
              borderRadius: '50%',
              background: activeColor,
              filter: 'blur(100px)',
              opacity: isPaused ? 0.02 : 0.09,
              pointerEvents: 'none',
              transition: 'opacity 0.5s'
            }}
          />

          <span style={{ 
            color: activeColor, 
            fontSize: '12px', 
            fontWeight: 'bold', 
            textTransform: 'uppercase', 
            letterSpacing: '0.15em',
            padding: '4px 12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            {activeParticipant.type === 'dm' ? '♛ DM TURN' : `🛡️ PLAYER TURN - ${activeParticipant.charClass.toUpperCase()}`}
          </span>

          <h1 style={{ fontSize: '56px', marginTop: '20px', marginBottom: '4px', wordBreak: 'break-word', color: '#fff' }}>
            {activeParticipant.name}
          </h1>

          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '92px', 
            fontWeight: '700', 
            color: isPaused ? 'var(--text-muted)' : '#fff',
            lineHeight: '1.2',
            margin: '20px 0',
            letterSpacing: '-0.03em'
          }}>
            {formatTime(turnTime)}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button 
              onClick={handlePauseToggle} 
              className={`btn-neon ${isPaused ? 'btn-green' : 'btn-amber'}`}
              style={{ minWidth: '140px' }}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            
            <button 
              onClick={handleEndTurn} 
              className="btn-neon btn-cyan pulse-active-cyan"
              style={{ minWidth: '220px', fontSize: '16px' }}
              disabled={isPaused}
            >
              End Turn ➜
            </button>
          </div>
        </div>

        {/* Bottom Control Bar (Undo / End Combat / On Deck) */}
        <div style={{ width: '100%', marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <button 
            onClick={handleUndo} 
            className="btn-secondary" 
            disabled={historyStack.length === 0}
            title="Revert last End Turn"
          >
            ↩ Undo ({historyStack.length})
          </button>

          <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>ON DECK:</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: onDeckParticipant.type === 'dm' ? 'var(--neon-pink)' : '#fff' }}>
              {onDeckParticipant.name}
            </span>
          </div>

          <button onClick={handleFinishCombat} className="btn-neon btn-pink">
            🏁 Finish Combat & Stats
          </button>
        </div>

      </div>

      {/* Right Column: Initiative Queue Sidebar */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
            <span>⚔️</span> Order
          </h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              onClick={() => setShowQueueEdit(!showQueueEdit)} 
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              {showQueueEdit ? 'Done' : '✏️ Edit'}
            </button>
            <button 
              onClick={() => setShowAddMenu(!showAddMenu)} 
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              ➕ Add
            </button>
          </div>
        </div>

        {/* Add combatant dropdown overlay */}
        {showAddMenu && (
          <div className="glass-panel" style={{ padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--neon-cyan)', borderRadius: '8px', zIndex: '10' }}>
            <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Add to active combat:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
              <button 
                onClick={handleAddDmSlotToSession} 
                className="btn-secondary"
                style={{ fontSize: '12px', justifyContent: 'left', padding: '6px' }}
              >
                ⏱️ + DM Time Slot
              </button>
              {roster.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleAddPlayerToSession(p)}
                  className="btn-secondary"
                  style={{ fontSize: '12px', justifyContent: 'left', padding: '6px' }}
                >
                  👤 + {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Combat queue list */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '500px' }}>
          {combatQueue.map((item, idx) => {
            const isActive = idx === activeIndex;
            const borderCol = item.type === 'dm' ? 'var(--neon-pink)' : `var(${item.color})`;
            const itemShadow = isActive ? (item.type === 'dm' ? 'var(--shadow-pink-glow)' : `0 0 10px var(${item.color})`) : 'none';
            const itemBorder = isActive ? `1.5px solid ${borderCol}` : `1px solid var(--border-color)`;
            
            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderLeft: `4px solid ${borderCol}`,
                  borderTop: itemBorder,
                  borderRight: itemBorder,
                  borderBottom: itemBorder,
                  boxShadow: itemShadow,
                  background: isActive ? 'rgba(255,255,255,0.03)' : (item.type === 'dm' ? 'rgba(255,0,122,0.01)' : 'rgba(255,255,255,0.005)'),
                  transform: isActive ? 'scale(1.02)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>#{idx + 1}</span>
                    <span style={{ fontWeight: isActive ? '700' : '500', color: isActive ? '#fff' : 'var(--text-secondary)', fontSize: '13px' }}>
                      {item.name}
                    </span>
                  </div>
                  {item.type === 'player' && (
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '16px' }}>{item.charClass}</span>
                  )}
                </div>

                {showQueueEdit ? (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      onClick={() => handleMoveUp(idx)} 
                      disabled={idx === 0}
                      style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '10px' }}
                    >
                      ▲
                    </button>
                    <button 
                      onClick={() => handleMoveDown(idx)} 
                      disabled={idx === combatQueue.length - 1}
                      style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '10px' }}
                    >
                      ▼
                    </button>
                    <button 
                      onClick={() => handleRemoveQueueItem(idx)}
                      style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  isActive && (
                    <span style={{ 
                      display: 'inline-block', 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: borderCol,
                      boxShadow: `0 0 8px ${borderCol}`
                    }} />
                  )
                )}
              </div>
            );
          })}
        </div>

        {/* Turn records history logger */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>
            Turn Log ({turnRecords.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '4px', maxHeight: '120px', overflowY: 'auto', fontSize: '11px', color: 'var(--text-secondary)' }}>
            {turnRecords.length === 0 ? (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No completed turns yet.</span>
            ) : (
              turnRecords.map((rec, i) => (
                <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>Rd {rec.round}: {rec.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{formatTime(rec.duration)}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
