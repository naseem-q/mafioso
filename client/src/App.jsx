import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocketConnection, useSocketEvent, useSocketEmit } from './hooks/useSocket';
import { SFX, vibrate } from './services/sfx';

/* ─── Constants (inline to avoid import issues) ─── */
const EV = {
  CREATE_ROOM:'create-room', ROOM_CREATED:'room-created',
  JOIN_ROOM:'join-room', ROOM_JOINED:'room-joined',
  PLAYER_JOINED:'player-joined', PLAYER_LEFT:'player-left',
  ROOM_UPDATE:'room-update', ROOM_ERROR:'room-error',
  ASSIGN_ROLES:'assign-roles', ROLE_REVEAL:'role-reveal',
  ADVANCE_PHASE:'advance-phase', PHASE_CHANGED:'phase-changed',
  SEND_EVIDENCE:'send-evidence', EVIDENCE_RECEIVED:'evidence-received',
  OPEN_VOTING:'open-voting', VOTING_OPENED:'voting-opened',
  CAST_VOTE:'cast-vote', CLOSE_VOTING:'close-voting', VOTING_RESULTS:'voting-results',
  ELIMINATE_PLAYER:'eliminate-player', PLAYER_ELIMINATED:'player-eliminated',
  OPEN_GHOST_VOTE:'open-ghost-vote', GHOST_VOTING_OPENED:'ghost-voting-opened',
  CAST_GHOST_VOTE:'cast-ghost-vote', CLOSE_GHOST_VOTE:'close-ghost-vote',
  GHOST_VOTING_RESULTS:'ghost-voting-results',
  REVEAL_TRUTH:'reveal-truth', TRUTH_REVEALED:'truth-revealed',
  KICK_PLAYER:'kick-player', PLAYER_KICKED:'player-kicked',
  ERROR:'error', START_GAME:'start-game',
};

const SCENARIO = {
  name: 'جريمة القصر',
  story: 'في ليلة عاصفة، وُجد السيد كمال — رب العائلة — مقتولاً في مكتبه المغلق. الباب كان موصداً من الداخل، والنافذة مكسورة. كل من في القصر لديه دافع... لكن اثنان فقط هما القتلة الحقيقيون.',
  players: [
    { id:1, title:'المستشار', job:'مستشار قانوني', appearance:'بدلة سوداء، ربطة عنق حمراء، ساعة ذهبية', timeline:'٨:٠٠ م — في المكتب\n٨:٣٠ م — اجتماع\n٩:٠٠ م — عاد للقصر', secret:'لديه ديون ضخمة للضحية' },
    { id:2, title:'الطبيبة', job:'طبيبة العائلة', appearance:'معطف أبيض، قلادة فضية، قفازات طبية', timeline:'٨:٠٠ م — في العيادة\n٨:٤٥ م — فحص روتيني\n٩:١٠ م — في غرفتها', secret:'اكتشفت تسمم الضحية ولم تبلغ' },
    { id:3, title:'السائق', job:'سائق العائلة', appearance:'جاكيت جلد أسود، قبعة، حذاء طيني', timeline:'٨:٠٠ م — في الجراج\n٨:٣٠ م — نقل ضيوف\n٩:٠٠ م — عاد', secret:'كان يسرق من صندوق العائلة' },
    { id:4, title:'المرافقة', job:'مساعدة شخصية', appearance:'فستان أزرق غامق، وشاح حريري، أساور ذهبية', timeline:'٨:٠٠ م — مع الضحية\n٨:٤٠ م — في المطبخ\n٩:٠٥ م — سمعت صراخ', secret:'تخطط للهروب بأموال العائلة' },
    { id:5, title:'الحارس', job:'حارس القصر', appearance:'زي أسود، حزام جلد، كشاف يدوي', timeline:'٨:٠٠ م — جولة تفتيش\n٨:٥٠ م — سمع زجاج\n٩:١٠ م — بالباب', secret:'كان نائماً وقت الجريمة' },
    { id:6, title:'الطاهية', job:'طاهية القصر', appearance:'مريلة بيضاء ملطخة، سكين طبخ', timeline:'٨:٠٠ م — في المطبخ\n٩:٠٠ م — جهزت العشاء', secret:'وضعت مادة مشبوهة بأمر مجهول' },
  ],
  evidence: [
    { id:1, type:'تلميح', icon:'👣', text:'آثار طين على سجادة المكتب — حذاء مقاس ٤٣' },
    { id:2, type:'دليل مادي', icon:'🧵', text:'خيط حريري أزرق عالق في مقبض الباب' },
    { id:3, type:'دليل قاطع', icon:'🔍', text:'كاميرا المراقبة: شخصان — أحدهما بساعة ذهبية والآخر بأساور ذهبية' },
  ],
};

/* ════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ════════════════════════════════════════════════ */

function CardBack({ size = 100, className = '' }) {
  return (
    <div className={`card-back ${className}`}>
      <img src="/logo.png" alt="Mafioso" style={{ width: size, height: size }} />
    </div>
  );
}

function Logo({ size = 'md' }) {
  const s = { sm: 44, md: 80, lg: 110 }[size] || 80;
  const fs = { sm: 14, md: 22, lg: 30 }[size] || 22;
  return (
    <div className="logo-container" style={{ marginBottom: size === 'sm' ? 8 : 20 }}>
      <img src="/logo.png" alt="Mafioso" className="logo-img" style={{ width: s, height: s, marginBottom: 8 }} />
      <div className="logo-text" style={{ fontSize: fs, letterSpacing: 3 }}>مافيوسو</div>
      {size !== 'sm' && <div className="logo-subtitle">M A F I O S O</div>}
    </div>
  );
}

function Divider() {
  return <div className="divider"><div className="divider-line" /><div className="divider-diamond" /><div className="divider-line" /></div>;
}

function Btn({ children, onClick, disabled, variant = 'primary', small, className = '' }) {
  const cls = `btn btn-${variant} ${small ? 'btn-sm' : ''} ${className}`;
  return <button className={cls} onClick={e => { SFX.click(); onClick?.(e); }} disabled={disabled}>{children}</button>;
}

function Badge({ children, variant = 'gold' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

function PlayerAvatar({ name, variant = 'gold', size = 40 }) {
  return (
    <div className={`player-avatar avatar-${variant}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name?.charAt(0) || '?'}
    </div>
  );
}

/* ════════════════════════════════════════════════
   HOME PAGE
   ════════════════════════════════════════════════ */
function HomePage({ go }) {
  return (
    <div className="anim-in">
      <div style={{ height: 40 }} />
      <Logo size="lg" />

      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 2, margin: '0 10px 20px', fontFamily: 'var(--font-display)' }}>
        لعبة الاستنتاج والتحقيق الدرامي<br/>اكشف المافيوسو... قبل ما يكشفوك
      </div>

      {/* Card Back Preview */}
      <CardBack size={80} />

      <Divider />

      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
        <Btn onClick={() => go('create')}>🎭 &nbsp; إنشاء غرفة جديدة</Btn>
        <Btn onClick={() => go('join')} variant="outline">🔍 &nbsp; انضم لغرفة</Btn>
      </div>

      <Divider />
      <div className="credits">CREATED BY NASEEM Q.</div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   CREATE ROOM PAGE
   ════════════════════════════════════════════════ */
function CreateRoomPage({ go, setSession }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const emit = useSocketEmit();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await emit(EV.CREATE_ROOM, { gmName: name.trim() });
      setCode(res.code);
      setSession({ code: res.code, name: name.trim(), isGM: true });
      SFX.success(); vibrate(200);
    } catch (e) { SFX.error(); alert(e.message); }
    setLoading(false);
  };

  const copy = () => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (code) return (
    <div className="anim-in">
      <div style={{ height: 20 }} />
      <Logo size="sm" />
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>كود الغرفة</div>
        <div onClick={copy} className="font-display" style={{ fontSize: 52, fontWeight: 700, color: 'var(--crimson)', letterSpacing: 14, cursor: 'pointer', textShadow: '0 0 30px rgba(155,27,48,0.3)' }}>
          {code}
        </div>
        <div style={{ fontSize: 12, color: copied ? 'var(--gold)' : 'var(--text-muted)', marginTop: 6, transition: 'color 0.3s' }}>
          {copied ? 'تم النسخ ✓' : 'اضغط للنسخ'}
        </div>
        <Divider />
        <CardBack size={60} />
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12 }}>شارك الكود مع أصحابك</div>
      </div>
      <div style={{ marginTop: 14 }}><Btn onClick={() => go('gm')}>🎭 ابدأ استقبال اللاعبين ←</Btn></div>
      <div style={{ marginTop: 10 }}><Btn onClick={() => go('home')} variant="outline">← رجوع</Btn></div>
    </div>
  );

  return (
    <div className="anim-in">
      <div style={{ height: 20 }} />
      <Logo size="sm" />
      <div className="card">
        <div className="font-display text-gold" style={{ fontSize: 20, textAlign: 'center', marginBottom: 20 }}>🎭 إنشاء غرفة جديدة</div>
        <CardBack size={60} className="anim-card" />
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>اسم مدير اللعبة</label>
          <input className="input" placeholder="أدخل اسمك..." value={name} onChange={e => setName(e.target.value)} maxLength={20} />
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn onClick={handleCreate} disabled={!name.trim() || loading}>{loading ? 'جاري الإنشاء...' : 'أنشئ الغرفة'}</Btn>
        </div>
      </div>
      <div style={{ marginTop: 10 }}><Btn onClick={() => go('home')} variant="outline">← رجوع</Btn></div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   JOIN ROOM PAGE
   ════════════════════════════════════════════════ */
function JoinRoomPage({ go, setSession }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const emit = useSocketEmit();

  const handleJoin = async () => {
    if (code.length < 4 || !name.trim()) return;
    setLoading(true);
    try {
      await emit(EV.JOIN_ROOM, { code, playerName: name.trim() });
      setSession({ code, name: name.trim(), isGM: false });
      SFX.success(); vibrate(100);
      go('player');
    } catch (e) { SFX.error(); alert(e.message); }
    setLoading(false);
  };

  return (
    <div className="anim-in">
      <div style={{ height: 20 }} />
      <Logo size="sm" />
      <div className="card">
        <div className="font-display text-gold" style={{ fontSize: 20, textAlign: 'center', marginBottom: 20 }}>🔍 انضم لغرفة</div>
        <CardBack size={60} className="anim-card" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>اسمك</label>
            <input className="input" placeholder="أدخل اسمك..." value={name} onChange={e => setName(e.target.value)} maxLength={20} />
          </div>
          <div>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>كود الغرفة</label>
            <input className="input input-code" placeholder="- - - -" value={code} onChange={e => setCode(e.target.value.replace(/\D/g,''))} maxLength={4} inputMode="numeric" />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn onClick={handleJoin} disabled={code.length < 4 || !name.trim() || loading}>{loading ? 'جاري الاتصال...' : 'ادخل الغرفة'}</Btn>
        </div>
      </div>
      <div style={{ marginTop: 10 }}><Btn onClick={() => go('home')} variant="outline">← رجوع</Btn></div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   GM DASHBOARD
   ════════════════════════════════════════════════ */
function GMDashboard({ go, session }) {
  const [state, setState] = useState(null);
  const [phase, setPhase] = useState(0);
  const [revealed, setRevealed] = useState({});
  const [storyShown, setStoryShown] = useState(false);
  const [voteRes, setVoteRes] = useState(null);
  const [logs, setLogs] = useState([]);
  const emit = useSocketEmit();

  const log = useCallback(msg => setLogs(p => [{ id: Date.now(), msg, t: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }, ...p].slice(0, 30)), []);

  useSocketEvent(EV.ROOM_UPDATE, ({ state: s }) => setState(s));
  useSocketEvent(EV.VOTING_RESULTS, ({ results }) => { setVoteRes(results); log('نتائج التصويت جاهزة'); });
  useSocketEvent(EV.PLAYER_JOINED, ({ player }) => log(`${player.name} انضم`));

  const phases = [{ icon: '🎬', label: 'الافتتاحية' }, { icon: '🔍', label: 'التحقيق' }, { icon: '💀', label: 'الإقصاء' }, { icon: '⚖️', label: 'الحكم' }];
  const players = state?.players || [];
  const alive = players.filter(p => p.status === 'alive' && !p.isGM);
  const evidence = state?.evidence || [];

  const doAssign = async () => {
    try { await emit(EV.ASSIGN_ROLES, { scenario: SCENARIO }); SFX.reveal(); vibrate(200); log('تم توزيع الأدوار'); } catch (e) { alert(e.message); }
  };
  const doAdvance = async () => {
    try { await emit(EV.ADVANCE_PHASE, {}); setPhase(p => Math.min(p + 1, 3)); log('→ المرحلة التالية'); } catch (e) { alert(e.message); }
  };
  const doSendEv = async (id) => {
    try { await emit(EV.SEND_EVIDENCE, { evidenceId: id }); SFX.evidence(); vibrate([100,50,100]); log(`تم إرسال دليل #${id}`); } catch (e) { alert(e.message); }
  };
  const doOpenVote = async () => { try { await emit(EV.OPEN_VOTING, {}); SFX.vote(); log('تم فتح التصويت'); } catch (e) { alert(e.message); } };
  const doCloseVote = async () => { try { await emit(EV.CLOSE_VOTING, {}); } catch (e) { alert(e.message); } };
  const doEliminate = async (id) => { try { await emit(EV.ELIMINATE_PLAYER, { playerId: id }); SFX.eliminate(); vibrate([200,100,200]); log('تم إقصاء لاعب'); } catch (e) { alert(e.message); } };
  const doGhostVote = async () => { try { await emit(EV.OPEN_GHOST_VOTE, {}); log('تصويت الأشباح مفتوح'); } catch (e) { alert(e.message); } };
  const doReveal = async () => { try { await emit(EV.REVEAL_TRUTH, {}); SFX.verdict(); vibrate([100,50,100,50,300]); log('🎭 تم كشف الحقيقة!'); } catch (e) { alert(e.message); } };

  return (
    <div className="anim-in">
      <div style={{ height: 10 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.png" alt="" style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--gold-dark)' }} />
          <span className="font-display text-crimson" style={{ fontSize: 14, fontWeight: 700 }}>لوحة GM</span>
          {session?.code && <Badge variant="gold">{session.code}</Badge>}
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => go('home')} style={{ width: 'auto', fontSize: 11, padding: '4px 12px' }}>← خروج</button>
      </div>

      {/* Phase Bar */}
      <div className="phase-bar">
        {phases.map((ph, i) => (
          <div key={i} className={`phase-item ${i === phase ? 'active' : i < phase ? 'done' : ''}`} onClick={() => { if (i <= phase) setPhase(i); }}>
            <div className="phase-icon">{ph.icon}</div>
            <div className="phase-label">{ph.label}</div>
          </div>
        ))}
      </div>

      {/* SETUP PHASE */}
      {phase === 0 && (
        <div className="stagger">
          <div className="card anim-card" style={{ marginBottom: 14 }}>
            <div className="section-header">
              <div className="section-title">📖 القصة</div>
              <Badge>{SCENARIO.name}</Badge>
            </div>
            {storyShown
              ? <div className="font-display" style={{ fontSize: 14, color: 'var(--beige)', lineHeight: 2 }}>{SCENARIO.story}</div>
              : <Btn onClick={() => { setStoryShown(true); log('تم عرض القصة'); }}>اعرض القصة</Btn>
            }
          </div>

          <div className="card anim-card" style={{ marginBottom: 14 }}>
            <div className="section-header">
              <div className="section-title">🎭 الأدوار</div>
              {state?.rolesAssigned ? <Badge variant="green">تم ✓</Badge> : <Badge variant="ghost">لم يبدأ</Badge>}
            </div>
            {!state?.rolesAssigned
              ? <>
                  <CardBack size={50} />
                  <div style={{ marginTop: 12 }}><Btn onClick={doAssign} disabled={alive.length < 4} variant="gold">🎲 وزّع الأدوار عشوائياً</Btn></div>
                </>
              : <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {players.filter(p => !p.isGM).map(p => (
                    <div key={p.id} className={`player-chip anim-slide ${p.status === 'ghost' ? 'ghost' : ''}`}>
                      <PlayerAvatar name={p.name} variant={p.role === 'mafia' ? 'crimson' : 'gold'} size={32} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.title}</div>
                      </div>
                      {revealed[p.id]
                        ? <Badge variant={p.role === 'mafia' ? 'crimson' : 'green'}>{p.role === 'mafia' ? '🎭 مافيوسو' : '😇 بريء'}</Badge>
                        : <button className="btn btn-outline btn-sm" style={{ width: 'auto' }} onClick={() => setRevealed(r => ({ ...r, [p.id]: true }))}>👁</button>
                      }
                    </div>
                  ))}
                </div>
            }
          </div>
          {state?.rolesAssigned && storyShown && <Btn onClick={doAdvance}>ابدأ التحقيق ←</Btn>}
        </div>
      )}

      {/* INVESTIGATION / ELIMINATION PHASE */}
      {(phase === 1 || phase === 2) && (
        <div className="stagger">
          {/* Players */}
          <div className="card anim-card" style={{ marginBottom: 14 }}>
            <div className="section-header">
              <div className="section-title">👥 اللاعبون</div>
              <Badge>{alive.length} حي / {players.filter(p => p.status === 'ghost').length} شبح</Badge>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {players.filter(p => !p.isGM).map(p => (
                <div key={p.id} style={{
                  padding: '5px 10px', borderRadius: 7, fontSize: 12,
                  background: p.status === 'ghost' ? 'rgba(90,78,85,0.15)' : p.role === 'mafia' ? 'rgba(155,27,48,0.12)' : 'rgba(74,139,92,0.1)',
                  border: `1px solid ${p.status === 'ghost' ? 'rgba(90,78,85,0.2)' : p.role === 'mafia' ? 'rgba(155,27,48,0.3)' : 'rgba(74,139,92,0.2)'}`,
                  color: p.status === 'ghost' ? 'var(--ghost-color)' : 'var(--text-primary)',
                  textDecoration: p.status === 'ghost' ? 'line-through' : 'none', opacity: p.status === 'ghost' ? 0.5 : 1,
                }}>
                  {p.status === 'ghost' ? '👻' : p.role === 'mafia' ? '🎭' : '😇'} {p.name}
                </div>
              ))}
            </div>
          </div>

          {/* Evidence (investigation only) */}
          {phase === 1 && (
            <div className="card anim-card" style={{ marginBottom: 14 }}>
              <div className="section-header">
                <div className="section-title">🔍 الأدلة</div>
                <Badge>{evidence.filter(e => e.sent).length}/{evidence.length}</Badge>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {evidence.map((e, i) => (
                  <div key={e.id} className={`evidence-card ${e.sent ? '' : 'locked'}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 20 }}>{e.icon}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: e.sent ? 'var(--green)' : 'var(--gold)' }}>دليل {i+1}: {e.type}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.text}</div>
                        </div>
                      </div>
                      {e.sent ? <Badge variant="green">تم ✓</Badge> : <button className="btn btn-gold btn-sm" style={{ width: 'auto' }} onClick={() => doSendEv(e.id)}>📤</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Voting */}
          <div className="card anim-card" style={{ marginBottom: 14 }}>
            <div className="section-header">
              <div className="section-title">🗳 التصويت</div>
              {state?.votingOpen && <Badge variant="crimson">مفتوح 🔴</Badge>}
            </div>
            <Btn onClick={state?.votingOpen ? doCloseVote : doOpenVote} variant={state?.votingOpen ? 'danger' : 'primary'}>
              {state?.votingOpen ? '🔒 أغلق واعرض النتائج' : '🗳 افتح التصويت'}
            </Btn>
            {voteRes && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {voteRes.map((p, i) => (
                  <div key={p.playerId} className="player-chip" style={{ background: i === 0 ? 'rgba(155,27,48,0.12)' : undefined, borderColor: i === 0 ? 'var(--crimson)' : undefined }}>
                    <span style={{ fontSize: 13, color: i === 0 ? 'var(--crimson-light)' : 'var(--text-primary)', fontWeight: i === 0 ? 700 : 400 }}>
                      {i === 0 && '⚠️ '}{p.name}
                    </span>
                    <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className={`vote-bar ${i === 0 ? 'vote-bar-crimson' : 'vote-bar-gold'}`} style={{ width: Math.max(16, p.count * 24) }} />
                      <span className="font-display text-gold" style={{ fontWeight: 700 }}>{p.count}</span>
                      <button className="btn btn-danger btn-sm" style={{ width: 'auto', padding: '3px 8px', fontSize: 10 }} onClick={() => doEliminate(p.playerId)}>💀</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Btn onClick={doAdvance} variant="outline">{phase === 1 ? 'انتقل للإقصاء ←' : '⚖️ الحكم النهائي ←'}</Btn>
        </div>
      )}

      {/* VERDICT PHASE */}
      {phase === 3 && (
        <div className="stagger">
          <div className="card card-gold anim-card" style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>⚖️</div>
            <div className="font-display text-gold" style={{ fontSize: 18, fontWeight: 700 }}>المرافعة النهائية</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>آخر {alive.length} لاعبين</div>
          </div>

          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {alive.map(p => (
              <div key={p.id} className="card anim-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
                <div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: p.role === 'mafia' ? 'var(--crimson-light)' : 'var(--green)' }}>{p.role === 'mafia' ? '🎭 مافيوسو' : '😇 بريء'}</div>
                </div>
                <PlayerAvatar name={p.name} size={40} />
              </div>
            ))}
          </div>

          <Btn onClick={doGhostVote} variant="gold">👻 افتح تصويت الأشباح</Btn>
          <div style={{ marginTop: 10 }}><Btn onClick={doReveal} variant="danger">🎭 اكشف الحقيقة</Btn></div>
        </div>
      )}

      {/* Action Log */}
      <Divider />
      <div className="card" style={{ padding: 14 }}>
        <div className="section-header">
          <div className="section-title">📋 السجل</div>
          <Badge variant="ghost">{logs.length}</Badge>
        </div>
        {logs.length === 0
          ? <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 10 }}>لا توجد أحداث...</div>
          : <div style={{ maxHeight: 150, overflowY: 'auto' }}>
              {logs.map(l => <div key={l.id} className="log-entry"><span className="log-time">{l.t}</span><span className="log-msg">{l.msg}</span></div>)}
            </div>
        }
      </div>
      <div className="credits" style={{ marginTop: 16 }}>MAFIOSO GM — NASEEM Q.</div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   PLAYER VIEW (Hold to Reveal + Evidence + Vote + Ghost + Verdict)
   ════════════════════════════════════════════════ */
function PlayerView({ go, session }) {
  const [state, setState] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [screen, setScreen] = useState('waiting'); // waiting | reveal | playing | voting | ghost | verdict
  const [progress, setProgress] = useState(0);
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [voteSel, setVoteSel] = useState(null);
  const [voted, setVoted] = useState(false);
  const [verdictSel, setVerdictSel] = useState(null);
  const [verdictDone, setVerdictDone] = useState(false);
  const iRef = useRef(null);
  const emit = useSocketEmit();

  useSocketEvent(EV.ROOM_UPDATE, ({ state: s }) => {
    setState(s);
    if (s.myStatus === 'ghost' && screen !== 'ghost') { setScreen('ghost'); SFX.ghost(); }
    if (s.votingOpen && screen === 'playing') { setScreen('voting'); setVoted(false); setVoteSel(null); }
    if (s.ghostVotingOpen && s.myStatus === 'ghost') { setScreen('verdict'); setVerdictDone(false); }
    if (!s.votingOpen && screen === 'voting' && voted) setScreen('playing');
  });

  useSocketEvent(EV.ROLE_REVEAL, (data) => { setMyRole(data); setScreen('reveal'); });
  useSocketEvent(EV.EVIDENCE_RECEIVED, () => { SFX.evidence(); vibrate([100,50,100]); });
  useSocketEvent(EV.PLAYER_KICKED, () => { alert('تم طردك من الغرفة'); go('home'); });
  useSocketEvent(EV.ROOM_ERROR, ({ message }) => { alert(message); go('home'); });
  useSocketEvent(EV.TRUTH_REVEALED, ({ players }) => { setScreen('truth'); SFX.verdict(); });

  // Hold to reveal
  const startHold = useCallback(() => {
    if (roleRevealed) return;
    iRef.current = setInterval(() => {
      setProgress(p => { const n = p + 2.5; if (n >= 100) { clearInterval(iRef.current); setRoleRevealed(true); SFX.reveal(); vibrate([200,100,200]); return 100; } return n; });
    }, 50);
  }, [roleRevealed]);
  const endHold = useCallback(() => { if (iRef.current) clearInterval(iRef.current); if (!roleRevealed) setProgress(0); }, [roleRevealed]);
  useEffect(() => () => { if (iRef.current) clearInterval(iRef.current); }, []);

  const doVote = async () => {
    if (!voteSel) return;
    try { await emit(EV.CAST_VOTE, { targetId: voteSel }); setVoted(true); SFX.vote(); vibrate(100); } catch (e) { alert(e.message); }
  };

  const doGhostVote = async () => {
    if (!verdictSel) return;
    try { await emit(EV.CAST_GHOST_VOTE, { targetId: verdictSel }); setVerdictDone(true); SFX.verdict(); vibrate([100,50,100,50,300]); } catch (e) { alert(e.message); }
  };

  const players = state?.players || [];
  const evidence = state?.evidence || [];
  const isMafia = myRole?.role === 'mafia';

  // ─── WAITING ─────────────────
  if (screen === 'waiting') return (
    <div className="anim-in" style={{ textAlign: 'center' }}>
      <div style={{ height: 40 }} /><Logo />
      <div className="card" style={{ padding: 30 }}>
        <CardBack size={80} />
        <div className="font-display text-gold" style={{ fontSize: 18, marginTop: 16 }}>بانتظار مدير اللعبة...</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>الغرفة: <span className="text-crimson font-display" style={{ fontWeight: 700 }}>{session?.code}</span></div>
      </div>
    </div>
  );

  // ─── HOLD TO REVEAL ──────────
  if (screen === 'reveal' && !roleRevealed) return (
    <div className="anim-in" style={{ textAlign: 'center' }}>
      <div style={{ height: 40 }} /><Logo />
      <div className="font-display" style={{ fontSize: 16, color: 'var(--beige)', marginBottom: 30 }}>دورك جاهز</div>

      <div className="hold-circle" onMouseDown={startHold} onMouseUp={endHold} onMouseLeave={endHold} onTouchStart={startHold} onTouchEnd={endHold} onTouchCancel={endHold}
        style={{ background: `conic-gradient(var(--crimson) ${progress * 3.6}deg, var(--black-surface) ${progress * 3.6}deg)`, boxShadow: progress > 0 ? `0 0 ${progress * 0.5}px rgba(155,27,48,0.5)` : 'none' }}>
        <div className="hold-circle-inner">
          <div style={{ fontSize: 40, marginBottom: 8 }}>🃏</div>
          <div className="font-display" style={{ fontSize: 14, color: progress > 0 ? 'var(--crimson-light)' : 'var(--text-muted)' }}>
            {progress > 0 ? `${Math.round(progress)}%` : 'اضغط مع الاستمرار'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 24 }}>تأكد إن محد يشوف شاشتك</div>
    </div>
  );

  // ─── ROLE REVEALED ───────────
  if (screen === 'reveal' && roleRevealed) return (
    <div className="anim-in">
      <div style={{ height: 16 }} /><Logo size="sm" />

      <div className={`card ${isMafia ? 'card-crimson' : 'card-gold'} anim-card`} style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{isMafia ? '🎭' : '😇'}</div>
        <div className="font-display" style={{ fontSize: 24, fontWeight: 700, color: isMafia ? 'var(--crimson-light)' : 'var(--green)' }}>
          {isMafia ? 'أنت المافيوسو' : 'أنت بريء'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          {isMafia ? 'اكذب... راوغ... ولا تنكشف' : 'ابحث عن الحقيقة'}
        </div>
      </div>

      {/* Dossier Card */}
      <div className="card anim-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottom: '1px solid rgba(212,164,76,0.1)' }}>
          <img src="/logo.png" alt="" style={{ width: 46, height: 46, borderRadius: '50%', border: '2px solid var(--gold-dark)' }} />
          <div>
            <div className="font-display" style={{ fontSize: 17, fontWeight: 700, color: 'var(--beige)' }}>{session?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--gold)' }}>{myRole?.title} — {myRole?.job}</div>
          </div>
        </div>
        {[{ l: 'المظهر', i: '👔', c: myRole?.appearance }, { l: 'الجدول الزمني', i: '🕘', c: myRole?.timeline }, { l: 'السر الشخصي', i: '🤫', c: myRole?.secret }].map((s, i) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid rgba(212,164,76,0.06)' }}>
            <div style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><span>{s.i}</span> {s.l}</div>
            <div className="font-display" style={{ fontSize: 14, color: 'var(--beige)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{s.c}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}><Btn onClick={() => setScreen('playing')}>فهمت دوري ← متابعة</Btn></div>
    </div>
  );

  // ─── PLAYING (Evidence View) ──
  if (screen === 'playing') return (
    <div className="anim-in">
      <div style={{ height: 12 }} /><Logo size="sm" />

      {/* Evidence */}
      <div className="card anim-card" style={{ marginBottom: 14 }}>
        <div className="section-header">
          <div className="section-title">🔍 الأدلة</div>
          <Badge>{evidence.length}</Badge>
        </div>
        {evidence.length === 0
          ? <div style={{ textAlign: 'center', padding: 20 }}>
              <CardBack size={50} />
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>بانتظار الأدلة من مدير اللعبة...</div>
            </div>
          : <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {evidence.map(e => (
                <div key={e.id} className="evidence-card new">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{e.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 4 }}>{e.type}</div>
                      <div className="font-display" style={{ fontSize: 14, color: 'var(--beige)', lineHeight: 1.7 }}>{e.text}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {/* My Info Card */}
      <div className="card-surface" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/logo.png" alt="" style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--gold-dark)' }} />
        <div>
          <div className="font-display" style={{ fontSize: 14, color: 'var(--beige)' }}>{session?.name}</div>
          <div style={{ fontSize: 11, color: isMafia ? 'var(--crimson-light)' : 'var(--green)' }}>{isMafia ? '🎭 مافيوسو' : '😇 بريء'}</div>
        </div>
      </div>
    </div>
  );

  // ─── VOTING ──────────────────
  if (screen === 'voting') {
    const votable = players.filter(p => p.status === 'alive' && !p.isGM && p.id !== state?.players?.find(x => x.name === session?.name)?.id);

    if (voted) return (
      <div className="anim-in" style={{ textAlign: 'center' }}>
        <div style={{ height: 40 }} /><Logo size="sm" />
        <div className="card" style={{ padding: 30 }}>
          <div style={{ fontSize: 60 }}>✓</div>
          <div className="font-display text-gold" style={{ fontSize: 20, marginTop: 10 }}>تم التصويت</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>بانتظار باقي اللاعبين...</div>
        </div>
      </div>
    );

    return (
      <div className="anim-in">
        <div style={{ height: 14 }} /><Logo size="sm" />
        <div className="font-display text-crimson" style={{ fontSize: 20, textAlign: 'center', marginBottom: 14 }}>من تتهم؟</div>
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {votable.map(p => (
            <div key={p.id} className={`player-chip anim-slide ${voteSel === p.id ? 'selected' : ''}`} onClick={() => { setVoteSel(p.id); SFX.click(); }} style={{ cursor: 'pointer' }}>
              <PlayerAvatar name={p.name} variant={voteSel === p.id ? 'crimson' : 'gold'} />
              <div>
                <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: voteSel === p.id ? 700 : 400 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.title}</div>
              </div>
            </div>
          ))}
        </div>
        <Btn onClick={doVote} disabled={!voteSel} variant="danger">🗳 تأكيد التصويت</Btn>
      </div>
    );
  }

  // ─── GHOST ───────────────────
  if (screen === 'ghost') return (
    <div className="ghost-overlay anim-ghost">
      <div style={{ height: 20 }} /><Logo size="sm" />
      <div className="card card-ghost" style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 50, opacity: 0.6, filter: 'grayscale(1)' }}>👻</div>
        <div className="font-display" style={{ fontSize: 22, color: 'var(--ghost-color)', fontWeight: 700 }}>أنت شبح الآن</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>راقب بصمت... صوتك في الحكم الأخير</div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ghost-color)', marginBottom: 8 }}>المتبقون:</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {players.filter(p => p.status === 'alive' && !p.isGM).map(p => (
          <div key={p.id} className="card-surface" style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-secondary)', opacity: 0.7 }}>{p.name}</div>
        ))}
      </div>
    </div>
  );

  // ─── VERDICT ─────────────────
  if (screen === 'verdict') {
    const finalists = players.filter(p => p.status === 'alive' && !p.isGM);

    if (verdictDone) return (
      <div className="anim-in" style={{ textAlign: 'center' }}>
        <div style={{ height: 50 }} /><Logo />
        <div style={{ fontSize: 50 }}>⚖️</div>
        <div className="font-display text-gold" style={{ fontSize: 22, marginTop: 10 }}>تم إرسال حكمك</div>
      </div>
    );

    return (
      <div className="anim-in">
        <div style={{ height: 16 }} /><Logo size="sm" />
        <div className="card card-gold" style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⚖️</div>
          <div className="font-display text-gold" style={{ fontSize: 20, fontWeight: 700 }}>حكم الأشباح</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>من القاتل الحقيقي؟</div>
        </div>
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {finalists.map(p => (
            <div key={p.id} className={`card anim-card ${verdictSel === p.id ? 'card-crimson' : ''}`}
              onClick={() => { setVerdictSel(p.id); SFX.click(); }}
              style={{ textAlign: 'center', cursor: 'pointer', padding: 20 }}>
              <PlayerAvatar name={p.name} variant={verdictSel === p.id ? 'crimson' : 'gold'} size={56} />
              <div className="font-display" style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 700, marginTop: 10 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.title}</div>
            </div>
          ))}
        </div>
        <Btn onClick={doGhostVote} disabled={!verdictSel} variant="danger">⚖️ أصدر الحكم</Btn>
      </div>
    );
  }

  // ─── TRUTH REVEALED ──────────
  if (screen === 'truth') return (
    <div className="anim-in" style={{ textAlign: 'center' }}>
      <div style={{ height: 30 }} /><Logo />
      <div className="card card-crimson anim-card" style={{ marginBottom: 14, padding: 24 }}>
        <div style={{ fontSize: 50, marginBottom: 10 }}>🎭</div>
        <div className="font-display" style={{ fontSize: 22, color: 'var(--crimson-light)', fontWeight: 700 }}>تم كشف الحقيقة!</div>
      </div>
      <Btn onClick={() => go('home')} variant="outline">← العودة للرئيسية</Btn>
    </div>
  );

  return null;
}

/* ════════════════════════════════════════════════
   APP
   ════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen] = useState('home');
  const [session, setSession] = useState(null);
  useSocketConnection();

  const go = (s) => setScreen(s);

  return (
    <div className="app-shell">
      {screen === 'home' && <HomePage go={go} />}
      {screen === 'create' && <CreateRoomPage go={go} setSession={setSession} />}
      {screen === 'join' && <JoinRoomPage go={go} setSession={setSession} />}
      {screen === 'gm' && <GMDashboard go={go} session={session} />}
      {screen === 'player' && <PlayerView go={go} session={session} />}
    </div>
  );
}
