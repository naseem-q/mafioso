let ctx = null;
const getCtx = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; };
const play = (f, t, d, v = 0.12) => { try { const c = getCtx(), o = c.createOscillator(), g = c.createGain(); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + d); } catch(e){} };

export const SFX = {
  click: () => play(800, 'sine', 0.08, 0.08),
  reveal: () => { play(440,'sine',0.3); setTimeout(()=>play(660,'sine',0.3),150); setTimeout(()=>play(880,'sine',0.5),300); },
  evidence: () => { play(300,'triangle',0.2); setTimeout(()=>play(500,'triangle',0.3),200); },
  vote: () => play(600, 'square', 0.15, 0.06),
  eliminate: () => { play(200,'sawtooth',0.4,0.08); setTimeout(()=>play(150,'sawtooth',0.6,0.1),200); },
  verdict: () => { [440,554,659,880].forEach((f,i) => setTimeout(()=>play(f,'sine',0.4),i*200)); },
  ghost: () => { play(180,'sine',0.8,0.06); play(183,'sine',0.8,0.06); },
  success: () => { play(523,'sine',0.15,0.08); setTimeout(()=>play(659,'sine',0.15),100); setTimeout(()=>play(784,'sine',0.25),200); },
  tick: () => play(1000, 'sine', 0.05, 0.04),
};

export const vibrate = (p) => { try { navigator.vibrate?.(p); } catch(e){} };
