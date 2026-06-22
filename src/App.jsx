import React, { useState, useEffect, useRef } from 'react';
import HistoryPanel from './components/HistoryPanel';

function App() {
  // Navigation: 'dashboard' or 'history'
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  // Roster state
  const [roster, setRoster] = useState(() => {
    const saved = localStorage.getItem('dnd_roster');
    return saved ? JSON.parse(saved) : [
      { id: 'p1', playerName: 'Travis', charName: 'Grog Strongjaw', charClass: 'Barbarian', color: '--neon-amber' },
      { id: 'p2', playerName: 'Marisha', charName: 'Keyleth', charClass: 'Druid', color: '--neon-green' },
      { id: 'p3', playerName: 'Sam', charName: 'Scanlan Shorthalt', charClass: 'Bard', color: '--neon-purple' },
      { id: 'p4', playerName: 'Taliesin', charName: 'Percy de Rolo', charClass: 'Fighter', color: '--neon-cyan' }
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

  // Active Combat State (saved to local storage to persist on refresh)
  const [activeIndex, setActiveIndex] = useState(() => {
    const saved = localStorage.getItem('dnd_active_index');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [round, setRound] = useState(() => {
    const saved = localStorage.getItem('dnd_round');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [turnTime, setTurnTime] = useState(() => {
    const saved = localStorage.getItem('dnd_turn_time');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [totalTime, setTotalTime] = useState(() => {
    const saved = localStorage.getItem('dnd_total_time');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isPaused, setIsPaused] = useState(() => {
    const saved = localStorage.getItem('dnd_is_paused');
    return saved ? JSON.parse(saved) : true; // default to paused until started
  });
  const [turnRecords, setTurnRecords] = useState(() => {
    const saved = localStorage.getItem('dnd_turn_records');
    return saved ? JSON.parse(saved) : [];
  });
  const [historyStack, setHistoryStack] = useState(() => {
    const saved = localStorage.getItem('dnd_history_stack');
    return saved ? JSON.parse(saved) : [];
  });

  // Input states for adding players
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [charNameInput, setCharNameInput] = useState('');
  const [charClassInput, setCharClassInput] = useState('Fighter');
  const [customClassInput, setCustomClassInput] = useState('');

  // Save Modal state details
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSessionName, setSaveSessionName] = useState('');
  const [saveSessionType, setSaveSessionType] = useState('Combat');

  const classes = [
    'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 
    'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 
    'Warlock', 'Wizard', 'Artificer', 'Other'
  ];

  const intervalRef = useRef(null);

  // Sync basic states to local storage
  useEffect(() => {
    localStorage.setItem('dnd_roster', JSON.stringify(roster));
  }, [roster]);

  useEffect(() => {
    localStorage.setItem('dnd_combat_queue', JSON.stringify(combatQueue));
    // Reset active index if queue shrinks under active index
    if (combatQueue.length > 0 && activeIndex >= combatQueue.length) {
      setActiveIndex(0);
    }
  }, [combatQueue]);

  useEffect(() => {
    localStorage.setItem('dnd_combat_history', JSON.stringify(combatHistory));
  }, [combatHistory]);

  // Sync active session details
  useEffect(() => {
    localStorage.setItem('dnd_active_index', activeIndex.toString());
    localStorage.setItem('dnd_round', round.toString());
    localStorage.setItem('dnd_turn_time', turnTime.toString());
    localStorage.setItem('dnd_total_time', totalTime.toString());
    localStorage.setItem('dnd_is_paused', JSON.stringify(isPaused));
    localStorage.setItem('dnd_turn_records', JSON.stringify(turnRecords));
    localStorage.setItem('dnd_history_stack', JSON.stringify(historyStack));
  }, [activeIndex, round, turnTime, totalTime, isPaused, turnRecords, historyStack]);

  // Timer tick
  useEffect(() => {
    if (!isPaused && combatQueue.length > 0) {
      intervalRef.current = setInterval(() => {
        setTurnTime(prev => prev + 1);
        setTotalTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPaused, combatQueue.length]);

  // Play audio beep
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(750, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
      // Audio blocked or not supported
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Undo snapshot capture
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

  // Combat controller triggers
  const handleEndTurn = () => {
    if (combatQueue.length === 0) return;
    playBeep();
    captureSnapshot();

    const activeItem = combatQueue[activeIndex];
    
    // Log the turn duration
    const newRecord = {
      id: `record-${Date.now()}-${Math.random()}`,
      type: activeItem.type,
      name: activeItem.name,
      rosterId: activeItem.rosterId,
      round: round,
      duration: turnTime
    };
    
    setTurnRecords(prev => [...prev, newRecord]);

    // Advance
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
    setCombatQueue(lastSnapshot.combatQueue);
  };

  // Queue actions
  const handleAddPlayerToQueue = (player) => {
    captureSnapshot();
    const newItem = {
      id: `queue-${Date.now()}-${Math.random()}`,
      type: 'player',
      rosterId: player.id,
      playerName: player.playerName || player.name || 'Player',
      charName: player.charName || 'Character',
      name: player.playerName || player.name || 'Player', // Stats belong to player name
      color: player.color,
      charClass: player.charClass,
      initiative: 0
    };
    setCombatQueue(prev => [...prev, newItem]);
  };

  const handleAddDmSlotToQueue = () => {
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
    setCombatQueue(prev => [...prev, newItem]);
  };

  const handleRemoveQueueItem = (index) => {
    captureSnapshot();
    const newQueue = combatQueue.filter((_, idx) => idx !== index);
    
    let newActiveIndex = activeIndex;
    if (newQueue.length === 0) {
      newActiveIndex = 0;
      setIsPaused(true);
    } else if (activeIndex >= newQueue.length) {
      newActiveIndex = 0;
      setRound(prev => prev + 1);
    } else if (activeIndex > index) {
      newActiveIndex = activeIndex - 1;
    }
    
    setCombatQueue(newQueue);
    setActiveIndex(newActiveIndex);
    setTurnTime(0);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    captureSnapshot();
    const newQueue = [...combatQueue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[index - 1];
    newQueue[index - 1] = temp;
    
    let newActiveIndex = activeIndex;
    if (activeIndex === index) {
      newActiveIndex = index - 1;
    } else if (activeIndex === index - 1) {
      newActiveIndex = index;
    }
    
    setCombatQueue(newQueue);
    setActiveIndex(newActiveIndex);
  };

  const handleMoveDown = (index) => {
    if (index === combatQueue.length - 1) return;
    captureSnapshot();
    const newQueue = [...combatQueue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[index + 1];
    newQueue[index + 1] = temp;
    
    let newActiveIndex = activeIndex;
    if (activeIndex === index) {
      newActiveIndex = index + 1;
    } else if (activeIndex === index + 1) {
      newActiveIndex = index;
    }
    
    setCombatQueue(newQueue);
    setActiveIndex(newActiveIndex);
  };

  const handleInitiativeChange = (id, val) => {
    const numericVal = parseInt(val, 10) || 0;
    setCombatQueue(prev => prev.map(item => 
      item.id === id ? { ...item, initiative: numericVal } : item
    ));
  };

  const handleSortInitiative = () => {
    captureSnapshot();
    const sorted = [...combatQueue].sort((a, b) => b.initiative - a.initiative);
    setCombatQueue(sorted);
    setActiveIndex(0);
    setTurnTime(0);
  };

  // Reset Session logs but keep players
  const handleResetSession = (clearQueue = false) => {
    if (window.confirm(clearQueue ? "Reset everything including combat queue?" : "Reset turn clock records for a new session? (Queue will be kept)")) {
      setTurnTime(0);
      setTotalTime(0);
      setRound(1);
      setTurnRecords([]);
      setHistoryStack([]);
      setIsPaused(true);
      setActiveIndex(0);
      if (clearQueue) {
        setCombatQueue([]);
      }
    }
  };

  // Save current session to history log (triggers prompting modal)
  const handleSaveSessionLog = () => {
    if (turnRecords.length === 0 && totalTime < 5) {
      alert("No significant time logged to save yet.");
      return;
    }
    
    const dateStr = new Date().toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    setSaveSessionName(`Session - ${dateStr}`);
    setSaveSessionType('Combat');
    setShowSaveModal(true);
  };

  const handleConfirmSave = () => {
    const finalRecords = [...turnRecords];
    // Include current ongoing turn if time has passed
    if (turnTime > 0 && combatQueue.length > 0) {
      const activeItem = combatQueue[activeIndex];
      finalRecords.push({
        id: `record-final-${Date.now()}`,
        type: activeItem.type,
        name: activeItem.name,
        rosterId: activeItem.rosterId,
        round: round,
        duration: turnTime
      });
    }

    const logEntry = {
      id: `combat-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sessionName: saveSessionName.trim() || `Session - ${new Date().toLocaleDateString()}`,
      sessionType: saveSessionType,
      totalTime,
      rounds: round,
      turns: finalRecords,
      combatQueue: [...combatQueue]
    };

    setCombatHistory(prev => [...prev, logEntry]);
    setShowSaveModal(false);

    // Ask if they want to clear the timers
    if (window.confirm("Pacing report saved! Do you want to reset the timers for a new session? (Queue will be kept)")) {
      setTurnTime(0);
      setTotalTime(0);
      setRound(1);
      setTurnRecords([]);
      setHistoryStack([]);
      setIsPaused(true);
      setActiveIndex(0);
    }
  };

  // Add character to standard master roster
  const handleAddRosterPlayer = (e) => {
    e.preventDefault();
    if (!playerNameInput.trim()) return;

    // Check if player name already exists in roster (playerName or name)
    if (roster.some(p => (p.playerName || p.name || '').toLowerCase() === playerNameInput.trim().toLowerCase())) {
      alert('A player with this name already exists in the roster.');
      return;
    }

    const neonColors = ['--neon-cyan', '--neon-purple', '--neon-pink', '--neon-green', '--neon-amber'];
    const finalClass = charClassInput === 'Other' ? (customClassInput.trim() || 'Other') : charClassInput;
    
    const newPlayer = {
      id: `player-${Date.now()}`,
      playerName: playerNameInput.trim(),
      charName: charNameInput.trim() || 'Unnamed Character',
      name: playerNameInput.trim(), // for backwards compatibility
      charClass: finalClass,
      color: neonColors[Math.floor(Math.random() * neonColors.length)]
    };

    setRoster(prev => [...prev, newPlayer]);
    setPlayerNameInput('');
    setCharNameInput('');
    setCustomClassInput('');
    setCharClassInput('Fighter');
  };

  const handleRemoveRosterPlayer = (id) => {
    setRoster(prev => prev.filter(p => p.id !== id));
  };

  // Live Pacing awards math calculator
  const getLiveAwards = () => {
    const playerStats = {};
    
    // Initialize stats
    combatQueue.forEach(item => {
      if (item.type === 'player') {
        playerStats[item.name] = { name: item.name, totalTime: 0, count: 0, minTime: Infinity, maxTime: -Infinity };
      }
    });

    let fastestSingle = { name: null, time: Infinity };
    let slowestSingle = { name: null, time: -Infinity };

    // Process all turn records
    turnRecords.forEach(rec => {
      if (rec.type === 'player') {
        if (!playerStats[rec.name]) {
          playerStats[rec.name] = { name: rec.name, totalTime: 0, count: 0, minTime: Infinity, maxTime: -Infinity };
        }
        const stat = playerStats[rec.name];
        stat.totalTime += rec.duration;
        stat.count += 1;
        if (rec.duration < stat.minTime) stat.minTime = rec.duration;
        if (rec.duration > stat.maxTime) stat.maxTime = rec.duration;

        // Single turn records
        if (rec.duration > 0) {
          if (rec.duration < fastestSingle.time) {
            fastestSingle = { name: rec.name, time: rec.duration };
          }
          if (rec.duration > slowestSingle.time) {
            slowestSingle = { name: rec.name, time: rec.duration };
          }
        }
      }
    });

    // Compute averages
    const playersWithTurns = Object.values(playerStats).filter(p => p.count > 0);
    
    let speedDemon = null; // fastest average
    let slowpoke = null; // slowest average

    if (playersWithTurns.length > 0) {
      const sortedByAvg = [...playersWithTurns].map(p => ({
        ...p,
        avg: p.totalTime / p.count
      })).sort((a, b) => a.avg - b.avg);

      speedDemon = sortedByAvg[0].name;
      // Only assign slowpoke if there is more than 1 player with turns
      if (sortedByAvg.length > 1) {
        slowpoke = sortedByAvg[sortedByAvg.length - 1].name;
      }
    }

    return {
      speedDemon, 
      slowpoke, 
      recordBreaker: fastestSingle.name !== null ? fastestSingle.name : null,
      timeSinker: slowestSingle.name !== null ? slowestSingle.name : null
    };
  };

  const awards = getLiveAwards();

  // Active combatant
  const activeParticipant = combatQueue.length > 0 ? combatQueue[activeIndex] : null;
  const onDeckParticipant = combatQueue.length > 0 
    ? (combatQueue[(activeIndex + 1) % combatQueue.length] || null)
    : null;

  const activeColor = activeParticipant 
    ? (activeParticipant.type === 'dm' ? 'var(--neon-pink)' : `var(${activeParticipant.color})`)
    : 'var(--border-color)';
  const activeShadow = activeParticipant 
    ? (activeParticipant.type === 'dm' ? 'var(--shadow-pink-glow)' : `0 0 20px var(${activeParticipant.color})`)
    : 'none';

  return (
    <div className="container" style={{ padding: '16px' }}>
      
      {/* Top Header & Navigation Navigation */}
      <header 
        className="glass-panel" 
        style={{ 
          padding: '12px 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          borderBottom: '1px solid var(--border-color)',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setCurrentTab('dashboard')}>
          <div 
            style={{ 
              width: '34px', 
              height: '34px', 
              borderRadius: '8px', 
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              color: '#000',
              fontSize: '16px',
              boxShadow: 'var(--shadow-cyan-glow)'
            }}
          >
            ⏳
          </div>
          <div>
            <h1 style={{ fontSize: '16px', margin: 0, letterSpacing: '0.02em', color: '#fff', textAlign: 'left' }}>INITIATIVE FLOW</h1>
            <span style={{ display: 'block', fontSize: '9px', color: 'var(--neon-cyan)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left' }}>
              Live Pacing Dashboard
            </span>
          </div>
        </div>

        {/* Tab Links */}
        <nav style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn-secondary ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentTab('dashboard')}
            style={{ 
              borderColor: currentTab === 'dashboard' ? 'var(--neon-cyan)' : 'var(--border-color)',
              color: currentTab === 'dashboard' ? '#fff' : 'var(--text-secondary)',
              boxShadow: currentTab === 'dashboard' ? '0 0 8px rgba(0, 242, 254, 0.15)' : 'none',
              background: currentTab === 'dashboard' ? 'rgba(0, 242, 254, 0.03)' : ''
            }}
          >
            ⚡ Live Tracker
          </button>

          <button 
            className={`btn-secondary ${currentTab === 'history' ? 'active' : ''}`}
            onClick={() => setCurrentTab('history')}
            style={{ 
              borderColor: currentTab === 'history' ? 'var(--neon-pink)' : 'var(--border-color)',
              color: currentTab === 'history' ? '#fff' : 'var(--text-secondary)',
              boxShadow: currentTab === 'history' ? '0 0 8px rgba(255, 0, 122, 0.15)' : 'none',
              background: currentTab === 'history' ? 'rgba(255, 0, 122, 0.03)' : ''
            }}
          >
            📖 Saved Logs ({combatHistory.length})
          </button>
        </nav>
      </header>

      {/* Main Tab Views */}
      <main style={{ flex: 1 }}>
        {currentTab === 'history' ? (
          <HistoryPanel 
            history={combatHistory} 
            onClearHistory={() => setCombatHistory([])} 
            onDeleteItem={(id) => setCombatHistory(prev => prev.filter(item => item.id !== id))} 
            onRestart={() => setCurrentTab('dashboard')}
          />
        ) : (
          /* UNIFIED LIVE DASHBOARD (Three Columns) */
          <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr 340px', gap: '20px', alignItems: 'stretch' }}>
            
            {/* COLUMN 1: Roster & Quick Add (Left) */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left', background: 'rgba(15, 18, 25, 0.5)' }}>
              <div>
                <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  👥 Roster
                </h3>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tap name to add to current queue</span>
              </div>

              {/* Roster list */}
              <div style={{ flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '380px', paddingRight: '2px' }}>
                {roster.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Roster is empty.</span>
                ) : (
                  roster.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => handleAddPlayerToQueue(p)}
                      className="glass-panel glass-panel-interactive"
                      style={{ 
                        padding: '10px 12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderLeft: `3px solid var(${p.color})`,
                        background: 'rgba(255,255,255,0.015)'
                      }}
                      title="Add to active combat queue"
                    >
                      <div style={{ pointerEvents: 'none' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                          {p.playerName || p.name}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                          {p.charName ? `${p.charName} // ` : ''}{p.charClass}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveRosterPlayer(p.id);
                        }}
                        style={{ 
                          background: 'transparent', 
                          border: 'none', 
                          color: 'var(--text-muted)', 
                          cursor: 'pointer',
                          fontSize: '12px',
                          padding: '4px'
                        }}
                        title="Remove player from roster"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Roster Player form */}
              <form onSubmit={handleAddRosterPlayer} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Create Adventurer</span>
                <input 
                  type="text"
                  className="input-neon"
                  placeholder="Player Name (e.g. Laura)..."
                  value={playerNameInput}
                  onChange={(e) => setPlayerNameInput(e.target.value)}
                  style={{ height: '30px', padding: '4px 8px', fontSize: '12px' }}
                  maxLength={20}
                />
                <input 
                  type="text"
                  className="input-neon"
                  placeholder="Character Name (e.g. Vex)..."
                  value={charNameInput}
                  onChange={(e) => setCharNameInput(e.target.value)}
                  style={{ height: '30px', padding: '4px 8px', fontSize: '12px' }}
                  maxLength={20}
                />
                <select 
                  className="input-neon"
                  value={charClassInput}
                  onChange={(e) => setCharClassInput(e.target.value)}
                  style={{ height: '30px', padding: '0 8px', fontSize: '12px', appearance: 'none', cursor: 'pointer' }}
                >
                  {classes.map(c => (
                    <option key={c} value={c} style={{ background: '#131722', color: '#fff' }}>{c}</option>
                  ))}
                </select>
                {charClassInput === 'Other' && (
                  <input 
                    type="text"
                    className="input-neon"
                    placeholder="Custom Class Name..."
                    value={customClassInput}
                    onChange={(e) => setCustomClassInput(e.target.value)}
                    style={{ height: '30px', padding: '4px 8px', fontSize: '12px', borderColor: 'var(--neon-purple)' }}
                    maxLength={20}
                  />
                )}
                <button type="submit" className="btn-neon btn-cyan" style={{ height: '30px', fontSize: '11px', padding: '0' }}>
                  Create & Add
                </button>
              </form>

              {/* DM Time Quick Add */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <button 
                  onClick={handleAddDmSlotToQueue}
                  className="btn-neon btn-pink" 
                  style={{ width: '100%', height: '34px', fontSize: '12px', justifyContent: 'center' }}
                >
                  ⏱️ Add DM Time Slot
                </button>
              </div>
            </div>

            {/* COLUMN 2: Large Chess Timer Centerpiece (Center) */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(10, 12, 17, 0.4)' }}>
              
              {/* Session Overview Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Current Round</span>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--neon-cyan)', textShadow: '0 0 8px rgba(0, 242, 254, 0.3)' }}>
                    {round}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Session Elapsed</span>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                    {formatTime(totalTime)}
                  </div>
                </div>
              </div>

              {/* Timer Glass Display */}
              <div 
                className="glass-panel" 
                style={{ 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '30px 16px',
                  borderRadius: '16px',
                  border: `2px solid ${activeColor}`,
                  boxShadow: activeShadow,
                  background: 'rgba(5, 6, 8, 0.75)',
                  position: 'relative',
                  overflow: 'hidden',
                  margin: '12px 0'
                }}
              >
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
                    filter: 'blur(90px)',
                    opacity: isPaused ? 0.01 : 0.08,
                    pointerEvents: 'none',
                    transition: 'opacity 0.4s'
                  }}
                />

                {!activeParticipant ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', padding: '20px' }}>
                    <span style={{ 
                      color: 'var(--text-muted)', 
                      fontSize: '11px', 
                      fontWeight: 'bold', 
                      textTransform: 'uppercase', 
                      padding: '4px 10px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}>
                      No Combatants
                    </span>
                    <h2 style={{ fontSize: '20px', color: '#fff', margin: '4px 0' }}>
                      Pacing Clock Ready
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '340px', lineHeight: '1.5', margin: '0 auto 12px auto' }}>
                      Click on roster characters or add a DM Time slot on the left to start the chess clock.
                    </p>
                  </div>
                ) : (
                  <>
                    <span style={{ 
                      color: activeColor, 
                      fontSize: '11px', 
                      fontWeight: 'bold', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.1em',
                      padding: '4px 10px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}>
                      {activeParticipant.type === 'dm' ? '♛ DM Time Slot' : `🛡️ Player - ${activeParticipant.charClass}`}
                    </span>

                    <h2 style={{ fontSize: '42px', marginTop: '16px', marginBottom: '2px', wordBreak: 'break-word', color: '#fff', fontWeight: '800' }}>
                      {activeParticipant.type === 'player' 
                        ? `${activeParticipant.playerName || activeParticipant.name} (${activeParticipant.charName || 'Character'})` 
                        : activeParticipant.name}
                    </h2>

                    <div style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '76px', 
                      fontWeight: '700', 
                      color: isPaused ? 'var(--text-muted)' : '#fff',
                      lineHeight: '1.1',
                      margin: '10px 0',
                      letterSpacing: '-0.02em'
                    }}>
                      {formatTime(turnTime)}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                      <button 
                        onClick={handlePauseToggle} 
                        className={`btn-neon ${isPaused ? 'btn-green' : 'btn-amber'}`}
                        style={{ minWidth: '120px', height: '36px', padding: '0 16px', fontSize: '12px' }}
                      >
                        {isPaused ? '▶ Resume' : '⏸ Pause'}
                      </button>
                      
                      <button 
                        onClick={handleEndTurn} 
                        className="btn-neon btn-cyan pulse-active-cyan"
                        style={{ minWidth: '160px', height: '36px', padding: '0 20px', fontSize: '13px' }}
                        disabled={isPaused}
                      >
                        End Turn ➜
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Active Timer Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleUndo} 
                    className="btn-secondary" 
                    disabled={historyStack.length === 0}
                    style={{ padding: '6px 12px', fontSize: '11px' }}
                  >
                    ↩ Undo ({historyStack.length})
                  </button>
                  <button 
                    onClick={() => handleResetSession(false)}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '11px' }}
                  >
                    🔄 Reset Clock
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleSaveSessionLog} 
                    className="btn-neon btn-green"
                    style={{ padding: '6px 12px', fontSize: '11px', textTransform: 'none' }}
                  >
                    💾 Save Log
                  </button>
                  <button 
                    onClick={() => handleResetSession(true)}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--neon-pink)', borderColor: 'rgba(255,0,122,0.1)' }}
                  >
                    🗑️ Reset All
                  </button>
                </div>
              </div>

            </div>

            {/* COLUMN 3: Active Initiative Queue & Live Stats (Right) */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left', background: 'rgba(15, 18, 25, 0.5)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📋 Queue & Live Stats
                </h3>
                {combatQueue.length > 1 && (
                  <button 
                    onClick={handleSortInitiative}
                    className="btn-secondary"
                    style={{ fontSize: '10px', padding: '3px 8px' }}
                  >
                    ⚡ Auto-Sort
                  </button>
                )}
              </div>

              {/* Combat queue timeline */}
              <div style={{ flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', paddingRight: '2px' }}>
                {combatQueue.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '24px 10px', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                    Combat queue is empty. Add combatants from the left panel.
                  </div>
                ) : (
                  combatQueue.map((item, idx) => {
                    const isActive = idx === activeIndex;
                    const borderCol = item.type === 'dm' ? 'var(--neon-pink)' : `var(${item.color})`;
                    const itemShadow = isActive ? (item.type === 'dm' ? 'var(--shadow-pink-glow)' : `0 0 10px var(${item.color})`) : 'none';
                    const itemBorder = isActive ? `1.5px solid ${borderCol}` : `1px solid var(--border-color)`;
                    
                    // Live stats math for this specific card
                    const myRecords = turnRecords.filter(r => r.name === item.name);
                    const turnCount = myRecords.length;
                    const cumulativeTime = myRecords.reduce((sum, r) => sum + r.duration, 0);
                    const averageTime = turnCount > 0 ? Math.round(cumulativeTime / turnCount) : 0;

                    // Match awards
                    const isSpeedDemon = item.type === 'player' && item.name === awards.speedDemon;
                    const isSlowpoke = item.type === 'player' && item.name === awards.slowpoke;
                    const isRecordBreaker = item.type === 'player' && item.name === awards.recordBreaker;
                    const isTimeSinker = item.type === 'player' && item.name === awards.timeSinker;

                    return (
                      <div
                        key={item.id}
                        className="glass-panel"
                        style={{
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          borderLeft: `4px solid ${borderCol}`,
                          borderTop: itemBorder,
                          borderRight: itemBorder,
                          borderBottom: itemBorder,
                          boxShadow: itemShadow,
                          background: isActive ? 'rgba(255,255,255,0.03)' : (item.type === 'dm' ? 'rgba(255,0,122,0.005)' : 'rgba(255,255,255,0.005)'),
                          transform: isActive ? 'scale(1.01)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        
                        {/* Header details */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>#{idx + 1}</span>
                            <span style={{ fontWeight: isActive ? '800' : '600', color: isActive ? '#fff' : 'var(--text-primary)', fontSize: '13px' }}>
                              {item.type === 'player' ? (item.playerName || item.name) : item.name}
                            </span>
                            {item.type === 'player' && (
                              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                ({item.charName || 'Character'} // {item.charClass})
                              </span>
                            )}
                          </div>

                          {/* Order buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginRight: '2px' }}>INIT</span>
                              <input 
                                type="number" 
                                className="input-neon"
                                value={item.initiative || ''}
                                onChange={(e) => handleInitiativeChange(item.id, e.target.value)}
                                style={{ width: '38px', height: '20px', padding: '0 2px', textAlign: 'center', fontSize: '11px', borderRadius: '4px' }}
                                placeholder="0"
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <button onClick={() => handleMoveUp(idx)} disabled={idx === 0} style={{ background: 'none', border: 'none', color: idx === 0 ? 'var(--text-muted)' : 'var(--neon-cyan)', cursor: 'pointer', fontSize: '9px', padding: '2px' }}>
                                ▲
                              </button>
                              <button onClick={() => handleMoveDown(idx)} disabled={idx === combatQueue.length - 1} style={{ background: 'none', border: 'none', color: idx === combatQueue.length - 1 ? 'var(--text-muted)' : 'var(--neon-cyan)', cursor: 'pointer', fontSize: '9px', padding: '2px' }}>
                                ▼
                              </button>
                            </div>
                            <button 
                              onClick={() => handleRemoveQueueItem(idx)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', padding: '2px' }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Live Badges display */}
                        {(isSpeedDemon || isSlowpoke || isRecordBreaker || isTimeSinker) && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '2px 0' }}>
                            {isSpeedDemon && (
                              <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0, 242, 254, 0.1)', color: 'var(--neon-cyan)', border: '1px solid rgba(0, 242, 254, 0.3)', fontWeight: 'bold' }}>
                                👑 Pace Setter
                              </span>
                            )}
                            {isSlowpoke && (
                              <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 0, 122, 0.1)', color: 'var(--neon-pink)', border: '1px solid rgba(255, 0, 122, 0.3)', fontWeight: 'bold' }}>
                                💤 Slowpoke
                              </span>
                            )}
                            {isRecordBreaker && (
                              <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0, 255, 135, 0.1)', color: 'var(--neon-green)', border: '1px solid rgba(0, 255, 135, 0.3)', fontWeight: 'bold' }}>
                                🏎️ Record Breaker
                              </span>
                            )}
                            {isTimeSinker && (
                              <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 208, 0, 0.1)', color: 'var(--neon-amber)', border: '1px solid rgba(255, 208, 0, 0.3)', fontWeight: 'bold' }}>
                                ⏳ Time Sinker
                              </span>
                            )}
                          </div>
                        )}

                        {/* Live stats numbers */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
                          <span>Turns: <strong style={{ color: '#fff' }}>{turnCount}</strong></span>
                          <span>Avg: <strong style={{ color: 'var(--neon-cyan)' }}>{formatTime(averageTime)}</strong></span>
                          <span>Total: <strong style={{ color: '#fff' }}>{formatTime(cumulativeTime)}</strong></span>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

              {/* Dynamic summary log preview */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Turns Logged: <strong>{turnRecords.length}</strong></span>
                {turnRecords.length > 0 && (
                  <button 
                    onClick={() => {
                      const list = turnRecords.map((r, i) => `#${i+1} ${r.name}: ${formatTime(r.duration)}`).join('\n');
                      navigator.clipboard.writeText(list);
                      alert("Pacing log list copied to clipboard!");
                    }}
                    className="btn-secondary" 
                    style={{ fontSize: '9px', padding: '2px 6px' }}
                  >
                    📋 Copy Pacing List
                  </button>
                )}
              </div>

            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span>Initiative Flow</span>
        <span>Click "Save Log" to store data permanently</span>
      </footer>

      {/* Save Session Modal overlay */}
      {showSaveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ padding: '24px', width: '400px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#1c222e', border: '1px solid var(--neon-cyan)', boxShadow: 'var(--shadow-cyan-glow)' }}>
            <h3 style={{ fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💾 Save Session Pacing Report
            </h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 'bold', textTransform: 'uppercase' }}>Session Name / Notes</label>
              <input 
                type="text" 
                className="input-neon"
                placeholder="e.g. Session 14 - Goblin Ambush"
                value={saveSessionName}
                onChange={(e) => setSaveSessionName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 'bold', textTransform: 'uppercase' }}>Session Type</label>
              <select 
                className="input-neon"
                value={saveSessionType}
                onChange={(e) => setSaveSessionType(e.target.value)}
                style={{ appearance: 'none', cursor: 'pointer' }}
              >
                <option value="Combat" style={{ background: '#131722', color: '#fff' }}>⚔️ Combat Session</option>
                <option value="RP" style={{ background: '#131722', color: '#fff' }}>🎭 Roleplay (RP) Session</option>
                <option value="Mixed" style={{ background: '#131722', color: '#fff' }}>🔮 Mixed (Both)</option>
                <option value="Other" style={{ background: '#131722', color: '#fff' }}>⚙️ Other / General</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button 
                onClick={() => setShowSaveModal(false)} 
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmSave} 
                className="btn-neon btn-cyan"
                style={{ flex: 2 }}
              >
                Save Pacing Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
