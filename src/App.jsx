import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search, Shield, CheckCircle, FileText, Upload, AlertTriangle,
  Clock, TrendingUp, BookOpen, Lock, BarChart3, ArrowUpRight,
  Cpu, Database, Sun, Moon, Monitor, Trash2, RefreshCw,
  Package, HardDrive, Info, MessageSquare, Globe, Sparkles,
  Activity, Zap, Send, ChevronDown, ChevronUp,
  Copy, Check, Mail, Share2, MessageCircle
} from 'lucide-react';
import { queryPolicy, healthCheck, uploadPolicy, listPolicies, deletePolicy } from './services/api';

/* ══════════════════════════════════════════════
   THEME TOKENS
══════════════════════════════════════════════ */
const LIGHT = {
  '--bg0':'#F0EDE6','--bg1':'#FAF8F4','--bg2':'#E8E3DA','--bg3':'#DDD8CE','--bg4':'#CFC9BC',
  '--border':'rgba(120,95,55,0.10)','--border2':'rgba(120,95,55,0.17)','--border3':'rgba(120,95,55,0.30)',
  '--t1':'#18120A','--t2':'#3D3020','--t3':'#8A7560','--t4':'#C0AE96',
  '--gold':'#B07B0A','--gold2':'#D49A18','--gold-dim':'rgba(176,123,10,0.10)','--gold-glow':'rgba(176,123,10,0.22)',
  '--teal':'#0A7A62','--teal-dim':'rgba(10,122,98,0.09)','--teal2':'#0DA882',
  '--rose':'#C0284A','--rose-dim':'rgba(192,40,74,0.09)','--rose2':'#E03A5C',
  '--indigo':'#3B4FCF','--indigo-dim':'rgba(59,79,207,0.09)','--indigo2':'#5568E8',
  '--violet':'#7C3ACE','--violet-dim':'rgba(124,58,206,0.09)',
  '--amber':'#C07000','--amber-dim':'rgba(192,112,0,0.09)',
  '--mesh1':'rgba(176,123,10,0.07)','--mesh2':'rgba(59,79,207,0.05)','--mesh3':'rgba(10,122,98,0.05)',
  '--mesh4':'rgba(192,40,74,0.04)',
  '--grid':'rgba(120,95,55,0.05)','--hdr-bg':'rgba(240,237,230,0.92)','--panel-bg':'#EAE6DF',
  '--shadow':'0 2px 20px rgba(50,30,5,0.09)','--shadow2':'0 8px 40px rgba(50,30,5,0.14)',
  '--answer-bg':'#FDFCFA','--answer-border':'rgba(10,122,98,0.18)',
  '--input-bg':'#FDFCFA',
};
const DARK = {
  '--bg0':'#080A10','--bg1':'#0D0F18','--bg2':'#131620','--bg3':'#191D2A','--bg4':'#202436',
  '--border':'rgba(255,255,255,0.06)','--border2':'rgba(255,255,255,0.11)','--border3':'rgba(255,255,255,0.20)',
  '--t1':'#F0F4FF','--t2':'#A4B0CC','--t3':'#525E78','--t4':'#272E42',
  '--gold':'#E0B040','--gold2':'#F5CB58','--gold-dim':'rgba(224,176,64,0.12)','--gold-glow':'rgba(224,176,64,0.25)',
  '--teal':'#00D4AE','--teal-dim':'rgba(0,212,174,0.10)','--teal2':'#00F0C8',
  '--rose':'#FF4D72','--rose-dim':'rgba(255,77,114,0.10)','--rose2':'#FF6B8A',
  '--indigo':'#6B82FF','--indigo-dim':'rgba(107,130,255,0.11)','--indigo2':'#8899FF',
  '--violet':'#B06AFF','--violet-dim':'rgba(176,106,255,0.10)',
  '--amber':'#FFAA00','--amber-dim':'rgba(255,170,0,0.10)',
  '--mesh1':'rgba(224,176,64,0.05)','--mesh2':'rgba(107,130,255,0.06)','--mesh3':'rgba(0,212,174,0.05)',
  '--mesh4':'rgba(255,77,114,0.04)',
  '--grid':'rgba(255,255,255,0.020)','--hdr-bg':'rgba(8,10,16,0.92)','--panel-bg':'#0D0F18',
  '--shadow':'0 4px 28px rgba(0,0,0,0.50)','--shadow2':'0 12px 56px rgba(0,0,0,0.70)',
  '--answer-bg':'#0F1220','--answer-border':'rgba(0,212,174,0.15)',
  '--input-bg':'#131620',
};

function applyTokens(t){const r=document.documentElement;Object.entries(t).forEach(([k,v])=>r.style.setProperty(k,v));}

/* ══════════════════════════════════════════════
   CSS
══════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%}
body{font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;line-height:1.6;background:var(--bg0);color:var(--t1);-webkit-font-smoothing:antialiased;transition:background .4s,color .3s}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border3);border-radius:4px}

/* ── Backgrounds ── */
.bg-mesh{position:fixed;inset:0;z-index:0;pointer-events:none;
  background:
    radial-gradient(ellipse 70% 60% at -5% -5%, var(--mesh1) 0%, transparent 52%),
    radial-gradient(ellipse 50% 50% at 105% 100%, var(--mesh2) 0%, transparent 48%),
    radial-gradient(ellipse 40% 40% at 100% 0%,  var(--mesh3) 0%, transparent 50%),
    radial-gradient(ellipse 30% 30% at 10% 90%,  var(--mesh4) 0%, transparent 50%),
    var(--bg0);
  transition:background .4s}
.bg-grid{position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);
  background-size:44px 44px;
  mask-image:radial-gradient(ellipse 100% 80% at 50% 0%,#000 15%,transparent 70%);
  transition:background .4s}

/* ── Shell ── */
.shell{position:relative;z-index:1;height:100vh;display:flex;flex-direction:column;overflow:hidden}

/* ── Header ── */
.hdr{flex-shrink:0;height:54px;background:var(--hdr-bg);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border-bottom:1px solid var(--border2);display:flex;align-items:center;padding:0 1.5rem;gap:.875rem;
  position:relative;z-index:50;transition:background .4s,border-color .3s}
.hdr::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent 0%,var(--indigo-dim) 25%,var(--gold-dim) 50%,var(--teal-dim) 75%,transparent 100%);opacity:.9}
.brand{display:flex;align-items:center;gap:.625rem;flex-shrink:0}
.brand-mark{width:32px;height:32px;border-radius:8px;flex-shrink:0;
  background:linear-gradient(140deg,var(--indigo) 0%,var(--teal) 100%);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 0 1px rgba(255,255,255,0.12),0 3px 14px var(--indigo-dim)}
.brand-name{font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:var(--t1);letter-spacing:.01em;transition:color .3s}
.brand-sub{font-size:.56rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--t3);transition:color .3s}
.hdr-nav{display:flex;gap:2px;margin-left:.5rem}
.htab{padding:.3125rem .875rem;border-radius:7px;border:none;background:none;font-family:'Plus Jakarta Sans',sans-serif;
  font-size:.78rem;font-weight:500;color:var(--t3);cursor:pointer;transition:color .18s,background .18s;display:flex;align-items:center;gap:.35rem}
.htab:hover{color:var(--t2);background:var(--border)}.htab.on{color:var(--indigo);background:var(--indigo-dim);font-weight:600}
.hdr-right{display:flex;align-items:center;gap:.625rem;margin-left:auto}
.status-pill{display:flex;align-items:center;gap:.4375rem;padding:.28rem .75rem;border-radius:999px;
  border:1px solid var(--border2);background:var(--bg2);font-size:.65rem;font-weight:600;
  letter-spacing:.07em;text-transform:uppercase;color:var(--t3);transition:background .4s,border-color .3s}
.dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.dot.live{background:var(--teal);box-shadow:0 0 7px var(--teal);animation:blink 2.2s infinite}
.dot.dead{background:var(--rose)}.dot.wait{background:var(--gold);animation:blink 1.2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
.theme-sw{display:flex;align-items:center;gap:2px;padding:3px;border-radius:9px;background:var(--bg3);border:1px solid var(--border2);transition:background .4s,border-color .3s}
.tsw-btn{width:28px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;border:none;background:none;color:var(--t3);cursor:pointer;transition:all .18s}
.tsw-btn:hover{color:var(--t2)}.tsw-btn.on{background:var(--bg1);color:var(--indigo);box-shadow:var(--shadow);border:1px solid var(--border2)}

/* ── Body layout ── */
.body{flex:1;display:flex;overflow:hidden}
.lpanel{width:200px;flex-shrink:0;border-right:1px solid var(--border2);background:var(--panel-bg);
  padding:1.125rem .75rem;display:flex;flex-direction:column;gap:.2rem;overflow-y:auto;transition:background .4s,border-color .3s}
.lsec{font-size:.57rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--t4);padding:.5rem .6rem .2rem;transition:color .3s}
.lbtn{display:flex;align-items:center;gap:.5625rem;padding:.46875rem .6875rem;border-radius:7px;border:none;background:none;
  width:100%;text-align:left;font-family:'Plus Jakarta Sans',sans-serif;font-size:.78rem;font-weight:500;color:var(--t3);cursor:pointer;transition:color .18s,background .18s}
.lbtn:hover{color:var(--t2);background:var(--border)}.lbtn.on{color:var(--indigo);background:var(--indigo-dim);font-weight:600}
.lico{width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;background:var(--border);flex-shrink:0;transition:background .18s}
.lbtn.on .lico{background:var(--indigo-dim)}.ldiv{height:1px;background:var(--border2);margin:.5rem .2rem;transition:background .3s}
.content{flex:1;overflow:hidden;display:flex;flex-direction:column}

/* ── Page wrapper ── */
.page{animation:pIn .32s cubic-bezier(.22,1,.36,1) both;height:100%;display:flex;flex-direction:column;overflow:hidden}
@keyframes pIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.page-scroll{flex:1;overflow-y:auto;padding:1.5rem 1.75rem}

/* ── Shared card ── */
.card{background:var(--bg1);border:1px solid var(--border2);border-radius:16px;overflow:hidden;box-shadow:var(--shadow);transition:border-color .2s,box-shadow .2s,background .4s}
.card:hover{border-color:var(--border3)}
.chdr{padding:.875rem 1.375rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:linear-gradient(180deg,var(--bg2),transparent);transition:background .4s,border-color .3s}
.cbody{padding:1.375rem}
.ew{font-size:.6rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--t3);display:flex;align-items:center;gap:.4rem;transition:color .3s}
.ew::before{content:'';width:10px;height:1.5px;background:var(--indigo);flex-shrink:0;border-radius:2px}

/* ── Buttons ── */
.btn{display:inline-flex;align-items:center;gap:.375rem;padding:.46875rem 1.0625rem;border-radius:8px;border:none;font-family:'Plus Jakarta Sans',sans-serif;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap}
.btn-primary{background:linear-gradient(135deg,var(--indigo),var(--teal));color:#fff;box-shadow:0 2px 16px var(--indigo-dim)}
.btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 24px var(--indigo-dim),0 2px 8px var(--teal-dim)}
.btn-primary:disabled{opacity:.38;cursor:not-allowed;transform:none}
.btn-gold{background:linear-gradient(135deg,var(--gold),var(--amber));color:#fff;box-shadow:0 2px 14px var(--gold-glow)}
.btn-gold:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 22px var(--gold-glow)}
.btn-gold:disabled{opacity:.38;cursor:not-allowed;transform:none}
.btn-ghost{background:var(--bg2);border:1px solid var(--border2);color:var(--t2)}
.btn-ghost:hover{background:var(--bg3);border-color:var(--border3)}
.btn-danger{background:var(--rose-dim);border:1px solid color-mix(in srgb,var(--rose) 30%,transparent);color:var(--rose)}
.btn-danger:hover{background:var(--rose);color:#fff}

/* ── Selects / Inputs ── */
.sel{padding:.40625rem .8125rem;border-radius:8px;background:var(--bg2);border:1px solid var(--border2);color:var(--t1);font-family:'Plus Jakarta Sans',sans-serif;font-size:.78rem;font-weight:500;cursor:pointer;outline:none;transition:border-color .18s,background .4s,color .3s}
.sel:focus{border-color:var(--indigo)}.sel option{background:var(--bg2)}
.inp{width:100%;padding:.46875rem .8125rem;border-radius:8px;background:var(--bg2);border:1px solid var(--border2);color:var(--t1);font-family:'Plus Jakarta Sans',sans-serif;font-size:.84rem;outline:none;transition:border-color .18s,background .4s,color .3s}
.inp:focus{border-color:var(--indigo)}
.lbl{display:block;font-size:.64rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);margin-bottom:.3rem;transition:color .3s}

/* ── Tags ── */
.tag{padding:.1rem .46875rem;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:.61rem;font-weight:500}
.tb{background:var(--indigo-dim);color:var(--indigo);border:1px solid color-mix(in srgb,var(--indigo) 25%,transparent)}
.tg{background:var(--gold-dim);color:var(--gold);border:1px solid color-mix(in srgb,var(--gold) 25%,transparent)}
.tt{background:var(--teal-dim);color:var(--teal);border:1px solid color-mix(in srgb,var(--teal) 25%,transparent)}
.tr{background:var(--rose-dim);color:var(--rose);border:1px solid color-mix(in srgb,var(--rose) 25%,transparent)}
.tv{background:var(--violet-dim);color:var(--violet);border:1px solid color-mix(in srgb,var(--violet) 25%,transparent)}
.tags{display:flex;gap:.3rem;flex-wrap:wrap}

/* ── Spinner ── */
.spin{width:12px;height:12px;border-radius:50%;border:2px solid transparent;border-top-color:currentColor;animation:rot .65s linear infinite;flex-shrink:0}
.spin-lg{width:28px;height:28px;border-radius:50%;border:2.5px solid var(--border2);border-top-color:var(--indigo);animation:rot .8s linear infinite}
@keyframes rot{to{transform:rotate(360deg)}}

/* ── Chips ── */
.chip{display:inline-flex;align-items:center;padding:.14rem .5rem;border-radius:999px;font-size:.61rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.cok{background:var(--teal-dim);color:var(--teal);border:1px solid color-mix(in srgb,var(--teal) 25%,transparent)}
.cno{background:var(--rose-dim);color:var(--rose);border:1px solid color-mix(in srgb,var(--rose) 25%,transparent)}

/* ── Divider ── */
.div{height:1px;background:var(--border);margin:1rem 0;transition:background .3s}

/* ══════════════════════════════════════════════
   QUERY PAGE — answer-first layout
══════════════════════════════════════════════ */

/* The answer zone gets all the space, search bar is anchored at bottom */
.qp-shell{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}

/* Answer canvas — scrollable, big, focused */
.answer-canvas{flex:1;overflow-y:auto;padding:1.75rem 2rem 2.5rem;display:flex;flex-direction:column;gap:1.25rem;scroll-behavior:smooth}

/* Empty state centered in canvas */
.answer-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5rem;padding:3rem 2rem;min-height:0}
.ae-icon{width:72px;height:72px;border-radius:20px;
  background:linear-gradient(135deg,var(--indigo-dim),var(--teal-dim));
  border:1px solid var(--border2);display:flex;align-items:center;justify-content:center}
.ae-title{font-family:'Playfair Display',serif;font-size:1.625rem;font-weight:600;color:var(--t1);text-align:center;line-height:1.3;transition:color .3s}
.ae-sub{font-size:.84rem;color:var(--t3);text-align:center;max-width:380px;line-height:1.7;transition:color .3s}

/* Quick chips row in empty state — Gestalt proximity grouping */
.quick-chips{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;max-width:540px}
.qchip{padding:.4rem .875rem;border-radius:999px;border:1px solid var(--border2);background:var(--bg2);
  font-size:.75rem;font-weight:500;color:var(--t2);cursor:pointer;transition:all .18s;white-space:nowrap;
  font-family:'Plus Jakarta Sans',sans-serif}
.qchip:hover{background:var(--indigo-dim);border-color:var(--indigo);color:var(--indigo);transform:translateY(-1px)}

/* ── Answer card — the STAR of the show ── */
.answer-card{border-radius:18px;overflow:visible;box-shadow:var(--shadow2);animation:ansIn .42s cubic-bezier(.22,1,.36,1) both;
  border:1px solid var(--answer-border);background:var(--answer-bg);transition:background .4s,border-color .3s}
@keyframes ansIn{from{opacity:0;transform:translateY(20px) scale(.985)}to{opacity:1;transform:none}}

/* Inner wrapper to maintain rounded corners on card children */
.ans-inner{border-radius:18px;overflow:hidden}
.ans-band.policy {background:linear-gradient(90deg,var(--teal),var(--teal2),transparent)}
.ans-band.general{background:linear-gradient(90deg,var(--indigo),var(--indigo2),transparent)}
.ans-band.greeting{background:linear-gradient(90deg,var(--gold),var(--gold2),transparent)}
.ans-band.fail   {background:linear-gradient(90deg,var(--rose),var(--rose2),transparent)}

/* Answer header — type label + meta row */
.ans-hdr{padding:1rem 1.5rem .875rem;display:flex;align-items:center;justify-content:space-between;
  border-bottom:1px solid var(--border);transition:border-color .3s}
.ans-type-row{display:flex;align-items:center;gap:.75rem}
.ans-ico{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ans-ico.policy {background:var(--teal-dim)}
.ans-ico.general{background:var(--indigo-dim)}
.ans-ico.greeting{background:var(--gold-dim)}
.ans-ico.fail   {background:var(--rose-dim)}
.ans-label{font-family:'Plus Jakarta Sans',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.1em;
  text-transform:uppercase;transition:color .3s}
.ans-label.policy {color:var(--teal)}
.ans-label.general{color:var(--indigo)}
.ans-label.greeting{color:var(--gold)}
.ans-label.fail   {color:var(--rose)}
.ans-title{font-family:'Playfair Display',serif;font-size:1.0625rem;font-weight:600;color:var(--t1);
  margin-top:.1rem;line-height:1.3;transition:color .3s;max-width:500px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ans-meta-row{display:flex;align-items:center;gap:.625rem;flex-shrink:0}
.conf-badge{display:flex;align-items:center;gap:.3rem;padding:.2rem .65rem;border-radius:999px;
  background:var(--teal-dim);border:1px solid color-mix(in srgb,var(--teal) 25%,transparent);
  font-family:'JetBrains Mono',monospace;font-size:.67rem;color:var(--teal)}
.time-badge{font-family:'JetBrains Mono',monospace;font-size:.65rem;color:var(--t4)}
.ai-badge{display:flex;align-items:center;gap:.3rem;padding:.2rem .65rem;border-radius:999px;
  background:var(--indigo-dim);border:1px solid color-mix(in srgb,var(--indigo) 25%,transparent);
  font-family:'JetBrains Mono',monospace;font-size:.67rem;color:var(--indigo)}

/* Answer body — generous padding, large readable text */
.ans-body{padding:1.75rem 1.875rem;position:relative}
.ans-body-inner{overflow:hidden;transition:max-height .35s cubic-bezier(.4,0,.2,1)}
.ans-body-inner.collapsed{max-height:220px;-webkit-mask-image:linear-gradient(to bottom,#000 55%,transparent 100%);mask-image:linear-gradient(to bottom,#000 55%,transparent 100%)}
.ans-body-inner.expanded{max-height:none;-webkit-mask-image:none;mask-image:none}
.ans-expand-btn{display:flex;align-items:center;justify-content:center;gap:.4rem;width:100%;
  margin-top:.75rem;padding:.4375rem .875rem;border-radius:8px;border:1px solid var(--border2);
  background:var(--bg2);font-family:'Plus Jakarta Sans',sans-serif;font-size:.75rem;
  font-weight:500;color:var(--t3);cursor:pointer;transition:all .18s}
.ans-expand-btn:hover{border-color:var(--indigo);color:var(--indigo);background:var(--indigo-dim);transform:translateY(-1px)}
.ans-text{font-size:1rem;line-height:1.9;color:var(--t2);transition:color .3s;font-family:'Plus Jakarta Sans',sans-serif}
.ans-text strong{color:var(--t1);font-weight:600}
.ans-text ul,.ans-text ol{padding-left:1.375rem;margin:.5rem 0}
.ans-text li{margin:.25rem 0}

/* General AI note — Gestalt closure: visually bounded note below answer */
.ai-note{margin-top:1.25rem;padding:.6875rem 1rem;border-radius:10px;
  background:var(--indigo-dim);border:1px solid color-mix(in srgb,var(--indigo) 18%,transparent);
  font-size:.74rem;color:var(--t3);display:flex;align-items:flex-start;gap:.4375rem;line-height:1.55}

/* ── Share / action toolbar ── */
.ans-actions{display:flex;align-items:center;gap:.4rem;padding:.6875rem 1.875rem .875rem;
  border-top:1px solid var(--border);flex-wrap:wrap;transition:border-color .3s}
.act-btn{display:flex;align-items:center;gap:.375rem;padding:.3125rem .75rem;border-radius:8px;
  border:1px solid var(--border2);background:var(--bg2);
  font-family:'Plus Jakarta Sans',sans-serif;font-size:.72rem;font-weight:500;
  color:var(--t3);cursor:pointer;transition:all .18s;white-space:nowrap;user-select:none}
.act-btn:hover{transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,.08)}
.act-btn.copy:hover{border-color:var(--teal);color:var(--teal);background:var(--teal-dim)}
.act-btn.copy.copied{border-color:var(--teal);color:var(--teal);background:var(--teal-dim)}
.act-btn.whatsapp:hover{border-color:#25D366;color:#25D366;background:rgba(37,211,102,.09)}
.act-btn.email:hover{border-color:var(--indigo);color:var(--indigo);background:var(--indigo-dim)}
.act-btn.share:hover{border-color:var(--gold);color:var(--gold);background:var(--gold-dim)}
.act-sep{width:1px;height:16px;background:var(--border2);margin:0 .125rem;flex-shrink:0}

/* Citations section — grouped by Gestalt proximity */
.cits-section{border-top:1px solid var(--border);padding:1.125rem 1.875rem;transition:border-color .3s}
.cits-label{font-size:.6rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;
  color:var(--t3);margin-bottom:.75rem;display:flex;align-items:center;gap:.375rem;transition:color .3s}
.cit-grid{display:flex;flex-direction:column;gap:.375rem}
.cit{display:flex;align-items:center;justify-content:space-between;padding:.625rem .875rem;border-radius:9px;
  background:var(--bg2);border:1px solid var(--border);transition:all .18s}
.cit:hover{border-color:var(--teal);background:var(--teal-dim)}
.cit-name{font-size:.8rem;font-weight:600;color:var(--t2);margin-bottom:.2rem;transition:color .3s}

/* ── Search bar — bottom anchored, always visible ── */
.search-bar{flex-shrink:0;border-top:1px solid var(--border2);background:var(--hdr-bg);
  backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);padding:.875rem 1.5rem;
  display:flex;flex-direction:column;gap:.625rem;transition:background .4s,border-color .3s}
.search-bar::before{content:'';position:absolute;left:0;right:0;top:-1px;height:1px;
  background:linear-gradient(90deg,transparent,var(--indigo-dim) 40%,var(--teal-dim) 60%,transparent);opacity:.8;pointer-events:none}
.sb-row{display:flex;align-items:flex-end;gap:.75rem;position:relative}
.sb-textarea{flex:1;resize:none;background:var(--input-bg);border:1.5px solid var(--border2);
  border-radius:12px;color:var(--t1);font-family:'Plus Jakarta Sans',sans-serif;font-size:.9375rem;
  line-height:1.65;padding:.8125rem 1.125rem;outline:none;
  transition:border-color .22s,box-shadow .22s,background .4s;min-height:52px;max-height:160px;overflow-y:auto}
.sb-textarea::placeholder{color:var(--t4)}
.sb-textarea:focus{border-color:var(--indigo);box-shadow:0 0 0 3px var(--indigo-dim)}
.sb-send{width:44px;height:44px;border-radius:12px;border:none;flex-shrink:0;
  background:linear-gradient(135deg,var(--indigo),var(--teal));color:#fff;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 14px var(--indigo-dim);transition:all .2s;align-self:flex-end}
.sb-send:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 5px 20px var(--indigo-dim)}
.sb-send:disabled{opacity:.35;cursor:not-allowed;transform:none}
.sb-meta{display:flex;align-items:center;justify-content:space-between;gap:.75rem}
.sb-role-wrap{display:flex;align-items:center;gap:.5rem;flex-shrink:0}
.sb-role-lbl{font-size:.65rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--t3);display:flex;align-items:center;gap:.25rem}
.sb-hint{font-size:.64rem;color:var(--t4)}

/* ── Thinking indicator ── */
.thinking{display:flex;align-items:center;gap:.875rem;padding:1.25rem 1.5rem;border-radius:14px;
  background:var(--bg1);border:1px solid var(--border2);box-shadow:var(--shadow)}
.think-dots{display:flex;gap:.375rem}
.think-dot{width:8px;height:8px;border-radius:50%;background:var(--indigo);opacity:.3;animation:tdot 1.4s infinite}
.think-dot:nth-child(2){animation-delay:.2s;background:var(--teal)}
.think-dot:nth-child(3){animation-delay:.4s;background:var(--gold)}
@keyframes tdot{0%,80%,100%{opacity:.25;transform:scale(.85)}40%{opacity:1;transform:scale(1.1)}}

/* ══════════════════════════════════════════════
   QUERY SIDEBAR (right panel)
══════════════════════════════════════════════ */
.qp-main{flex:1;display:grid;grid-template-columns:1fr 280px;gap:0;overflow:hidden;min-height:0}
.qp-center{display:flex;flex-direction:column;overflow:hidden;border-right:1px solid var(--border2)}
.qp-side{overflow-y:auto;padding:1.25rem 1rem;display:flex;flex-direction:column;gap:.875rem;background:var(--panel-bg);transition:background .4s,border-color .3s}
.side-card{border-radius:12px;border:1px solid var(--border2);background:var(--bg1);overflow:hidden;transition:background .4s,border-color .3s}
.side-chdr{padding:.625rem 1rem;border-bottom:1px solid var(--border);background:linear-gradient(180deg,var(--bg2),transparent);font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);display:flex;align-items:center;gap:.35rem;transition:background .4s,border-color .3s,color .3s}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;padding:.875rem}
.stat-blk{padding:.6875rem .75rem;border-radius:9px;border:1px solid var(--border);background:var(--bg2);transition:all .22s,background .4s}
.stat-val{font-family:'JetBrains Mono',monospace;font-size:1.25rem;line-height:1;margin-bottom:.15rem;font-weight:500}
.stat-lbl{font-size:.59rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);transition:color .3s}
.qli{display:flex;align-items:flex-start;gap:.5rem;padding:.5625rem .875rem;border-radius:0;border-bottom:1px solid var(--border);cursor:pointer;transition:all .15s;text-align:left;width:100%;font-family:'Plus Jakarta Sans',sans-serif;background:none;border-left:none;border-right:none;border-top:none}
.qli:last-child{border-bottom:none}
.qli:hover{background:var(--indigo-dim);padding-left:1.125rem}
.qli-icon{width:26px;height:26px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.875rem;background:var(--bg2);transition:background .15s}
.qli:hover .qli-icon{background:var(--indigo-dim)}
.qlt{font-size:.76rem;font-weight:600;color:var(--t2);line-height:1.3;transition:color .15s}
.qls{font-size:.65rem;color:var(--t3);margin-top:1px;transition:color .15s}
.recent-row{display:flex;align-items:center;gap:.5rem;padding:.46875rem .875rem;border-bottom:1px solid var(--border)}
.recent-row:last-child{border-bottom:none}

/* ══════════════════════════════════════════════
   UPLOAD PAGE
══════════════════════════════════════════════ */
.dz{border:2px dashed var(--border2);border-radius:14px;padding:2.25rem 1.5rem;text-align:center;cursor:pointer;
  background:var(--bg2);transition:all .22s;position:relative;overflow:hidden}
.dz::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 40% at 50% 50%,var(--indigo-dim),transparent);opacity:0;transition:opacity .22s}
.dz:hover:not(.busy),.dz.over{border-color:var(--indigo)}.dz:hover:not(.busy)::before,.dz.over::before{opacity:1}
.dz.busy{opacity:.5;cursor:not-allowed}
.dico{width:48px;height:48px;border-radius:13px;background:var(--indigo-dim);border:1px solid color-mix(in srgb,var(--indigo) 28%,transparent);display:flex;align-items:center;justify-content:center;margin:0 auto .875rem}
.fb{display:flex;align-items:flex-start;gap:.5rem;padding:.75rem 1rem;border-radius:8px;font-size:.8rem;margin-top:.75rem;line-height:1.5}
.fb-ok{background:var(--teal-dim);border:1px solid color-mix(in srgb,var(--teal) 25%,transparent);color:var(--teal)}
.fb-err{background:var(--rose-dim);border:1px solid color-mix(in srgb,var(--rose) 25%,transparent);color:var(--rose)}
.fb-info{background:var(--gold-dim);border:1px solid color-mix(in srgb,var(--gold) 25%,transparent);color:var(--gold)}
.pol-row{display:grid;grid-template-columns:1fr auto auto;gap:.75rem;align-items:center;padding:.75rem 1.25rem;border-bottom:1px solid var(--border);transition:background .15s}
.pol-row:hover{background:var(--bg2)}.pol-row:last-child{border-bottom:none}
.pol-name{font-size:.83rem;font-weight:600;color:var(--t1);margin-bottom:.2rem;transition:color .3s}
.pol-meta{font-size:.69rem;color:var(--t3);display:flex;gap:.4rem;flex-wrap:wrap;transition:color .3s}
.prog-bar{height:3px;border-radius:2px;background:var(--border2);overflow:hidden;margin-top:.5rem}
.prog-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--indigo),var(--teal));transition:width .4s ease}

/* ══════════════════════════════════════════════
   AUDIT PAGE
══════════════════════════════════════════════ */
.sg4{display:grid;grid-template-columns:repeat(4,1fr);gap:.875rem;margin-bottom:1.5rem}
.sblk{padding:.875rem 1rem;border-radius:12px;background:var(--bg2);border:1px solid var(--border);transition:all .22s,background .4s}
.sblk:hover{border-color:var(--border2);transform:translateY(-2px);box-shadow:var(--shadow)}
.sv{font-family:'JetBrains Mono',monospace;font-size:1.5rem;line-height:1;margin-bottom:.2rem}
.sl{font-size:.62rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);transition:color .3s}
.acols{display:grid;grid-template-columns:80px 1fr 90px 80px;gap:.875rem;align-items:center}
.ahdr{font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t4);padding:.625rem 1.375rem;border-bottom:1px solid var(--border);background:var(--bg2);transition:background .4s,color .3s,border-color .3s}
.arow{padding:.6875rem 1.375rem;border-bottom:1px solid var(--border);font-size:.78rem;transition:background .15s,border-color .3s}
.arow:hover{background:var(--border)}.arow:last-child{border-bottom:none}

/* ── Empty states ── */
.empty{padding:3rem 2rem;text-align:center;display:flex;flex-direction:column;align-items:center;gap:.75rem}
.eico{width:50px;height:50px;border-radius:13px;background:var(--bg3);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;color:var(--t4)}
.ettl{font-family:'Playfair Display',serif;font-size:1rem;font-style:italic;color:var(--t2)}.esub{font-size:.78rem;color:var(--t3);max-width:240px}

/* ── Stagger animation ── */
.sg>*{opacity:0;animation:pIn .38s cubic-bezier(.22,1,.36,1) forwards}
.sg>*:nth-child(1){animation-delay:.04s}.sg>*:nth-child(2){animation-delay:.09s}
.sg>*:nth-child(3){animation-delay:.14s}.sg>*:nth-child(4){animation-delay:.19s}.sg>*:nth-child(5){animation-delay:.24s}

/* ── Responsive ── */
@media(max-width:1100px){.lpanel{display:none}.qp-main{grid-template-columns:1fr}}
@media(max-width:700px){.qp-side{display:none}.sg4{grid-template-columns:1fr 1fr}.page-scroll{padding:1.125rem}}
@media(max-width:640px){.hdr-nav{display:none}.ac-conf{display:none}}
`;

/* ══════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════ */
const ROLES = ['Junior Officer','Senior Loan Officer','Credit Manager','Risk Officer','Senior Management'];
const QUICK = [
  {icon:'🏢',label:'CRE LTV Limits',sub:'Commercial real estate',q:'What is the maximum LTV ratio for commercial real estate loans?'},
  {icon:'🏠',label:'Mortgage DTI',sub:'Residential underwriting',q:'What are the mortgage credit score and DTI requirements?'},
  {icon:'📋',label:'BSA / AML',sub:'Compliance requirements',q:'What are the mandatory BSA/AML compliance training requirements?'},
  {icon:'📊',label:'RBI Repo Rate',sub:'Current rate & policy',q:'What is the current RBI repo rate?'},
  {icon:'⚠️',label:'Loan Exceptions',sub:'Approval authority',q:'What is the loan exception approval policy?'},
  {icon:'💰',label:'Home Loan Eligibility',sub:'General criteria',q:'What are the eligibility criteria for a home loan in India?'},
];

/* ── Helpers ── */
const fmtT  = iso => new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
const fmtMs = ms  => ms ? `${(ms/1000).toFixed(2)}s` : '';
const fmtDate = s => s ? new Date(s).toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'}) : '-';

/* Render **bold** markdown inline */
function Bold({text}){
  if(!text)return null;
  const parts = (text||'').split(/(\*\*[^*]+\*\*)/);
  return parts.map((p,i)=>p.startsWith('**')
    ? <strong key={i}>{p.slice(2,-2)}</strong>
    : p
  );
}

/* Render answer text: handle bullet lines, bold */
function AnswerText({text}){
  if(!text)return null;
  return(
    <div className="ans-text">
      {text.split('\n').map((line,i)=>{
        const trimmed=line.trim();
        if(!trimmed)return <br key={i}/>;
        if(trimmed.startsWith('• ')||trimmed.startsWith('- ')){
          return(
            <div key={i} style={{display:'flex',gap:'.625rem',marginBottom:'.3rem',alignItems:'flex-start'}}>
              <span style={{color:'var(--indigo)',marginTop:'.3rem',flexShrink:0,fontWeight:700,fontSize:'.8rem'}}>›</span>
              <span><Bold text={trimmed.slice(2)}/></span>
            </div>
          );
        }
        if(/^\d+\.\s/.test(trimmed)){
          const[num,...rest]=trimmed.split(/\.\s/);
          return(
            <div key={i} style={{display:'flex',gap:'.625rem',marginBottom:'.3rem',alignItems:'flex-start'}}>
              <span style={{color:'var(--gold)',flexShrink:0,fontFamily:'JetBrains Mono,monospace',fontSize:'.78rem',marginTop:'.2rem',fontWeight:600}}>{num}.</span>
              <span><Bold text={rest.join('. ')}/></span>
            </div>
          );
        }
        if(trimmed.startsWith('#')){
          const lvl=(trimmed.match(/^#+/)||[''])[0].length;
          const htxt=trimmed.replace(/^#+\s*/,'');
          return(
            <div key={i} style={{fontFamily:'Playfair Display,serif',fontSize:lvl===1?'1.125rem':'1rem',fontWeight:600,color:'var(--t1)',marginTop:'.875rem',marginBottom:'.25rem'}}>
              <Bold text={htxt}/>
            </div>
          );
        }
        return <p key={i} style={{marginBottom:'.5rem'}}><Bold text={trimmed}/></p>;
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════
   SHARED ATOMS
══════════════════════════════════════════════ */
function ThemeSW({mode,set}){
  return(
    <div className="theme-sw">
      {[{id:'light',Icon:Sun,tip:'Light'},{id:'system',Icon:Monitor,tip:'System'},{id:'dark',Icon:Moon,tip:'Dark'}].map(({id,Icon,tip})=>(
        <button key={id} className={`tsw-btn${mode===id?' on':''}`} onClick={()=>set(id)} title={tip}><Icon size={12}/></button>
      ))}
    </div>
  );
}
function StatusPill({status}){
  const m={connected:['live','Live'],disconnected:['dead','Offline'],checking:['wait','…']};
  const[c,l]=m[status]??['wait','…'];
  return <div className="status-pill"><span className={`dot ${c}`}/><span>{l}</span></div>;
}

/* ══════════════════════════════════════════════
   ANSWER CARD — the focal element
══════════════════════════════════════════════ */
function _qtype(res){
  if(!res) return 'fail';
  if(res.query_type==='greeting') return 'greeting';
  if(res.query_type==='general')  return 'general';
  if(res.query_type==='policy')   return 'policy';
  if(res.query_type==='error')    return 'fail';
  if(!res.success) return 'fail';
  if(res.citations?.length>0) return 'policy';
  return 'general';
}

const TYPE_META={
  policy:  {label:'Policy Answer',  Icon:CheckCircle,  icolor:'var(--teal)',   title:'From your indexed documents'},
  general: {label:'General Knowledge',Icon:Globe,      icolor:'var(--indigo)', title:'From AI knowledge base'},
  greeting:{label:'ComplianceAI',   Icon:MessageSquare, icolor:'var(--gold)',  title:'Your compliance assistant'},
  fail:    {label:'No Answer',      Icon:AlertTriangle, icolor:'var(--rose)',  title:'Could not find an answer'},
};

/* ── Share helpers ── */
function _buildShareText(res){
  const type=_qtype(res);
  const lines=[];
  lines.push('*ComplianceAI — Policy Answer*');
  lines.push('');
  if(res.query) lines.push(`*Q:* ${res.query}`);
  lines.push('');
  if(res.answer) lines.push(res.answer.replace(/\*\*/g,'*'));
  if(type==='policy'&&res.citations?.length>0){
    lines.push('');
    lines.push('*Sources:*');
    res.citations.forEach(c=>{
      let src=`• ${c.policy_name} (${c.policy_id} v${c.version})`;
      if(c.page) src+=` — pg.${c.page}`;
      lines.push(src);
    });
  }
  lines.push('');
  lines.push('_Powered by ComplianceAI_');
  return lines.join('\n');
}

function _buildEmailText(res){
  const lines=[];
  lines.push('ComplianceAI — Policy Answer');
  lines.push('');
  if(res.query) lines.push(`Question: ${res.query}`);
  lines.push('');
  if(res.answer) lines.push(res.answer.replace(/\*\*(.*?)\*\*/g,'$1'));
  const type=_qtype(res);
  if(type==='policy'&&res.citations?.length>0){
    lines.push('');
    lines.push('Source Documents:');
    res.citations.forEach(c=>{
      let src=`  - ${c.policy_name} (${c.policy_id}, v${c.version})`;
      if(c.page) src+=`, page ${c.page}`;
      lines.push(src);
    });
  }
  lines.push('');
  lines.push('Powered by ComplianceAI');
  return lines.join('\n');
}

const ANSWER_COLLAPSE_CHARS = 480; // show expand button if answer longer than this

function AnswerCard({res}){
  if(!res)return null;
  const type=_qtype(res);
  const {label,Icon,icolor,title}=TYPE_META[type];
  const [copied,setCopied]=useState(false);
  const answerLen = (res.answer||'').length;
  const isLong = answerLen > ANSWER_COLLAPSE_CHARS;
  const [expanded,setExpanded]=useState(false);

  const handleCopy=useCallback(()=>{
    const txt=_buildShareText(res);
    navigator.clipboard.writeText(txt).then(()=>{
      setCopied(true);
      setTimeout(()=>setCopied(false),2200);
    }).catch(()=>{
      // Fallback for browsers without clipboard API
      const ta=document.createElement('textarea');
      ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(()=>setCopied(false),2200);
    });
  },[res]);

  const handleWhatsApp=useCallback(()=>{
    const txt=_buildShareText(res);
    const url=`https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}`;
    window.open(url,'_blank','noopener,noreferrer');
  },[res]);

  const handleEmail=useCallback(()=>{
    const subject=encodeURIComponent(`ComplianceAI: ${res.query||'Policy Answer'}`);
    const body=encodeURIComponent(_buildEmailText(res));
    window.location.href=`mailto:?subject=${subject}&body=${body}`;
  },[res]);

  const handleNativeShare=useCallback(async()=>{
    if(!navigator.share) return;
    try{
      await navigator.share({
        title:'ComplianceAI Policy Answer',
        text:_buildShareText(res),
      });
    }catch(e){ /* user cancelled */ }
  },[res]);

  const hasAnswer=res.success&&res.answer;
  const canNativeShare=!!navigator.share;

  return(
    <div className="answer-card">
    <div className="ans-inner">
      {/* Color band — quick visual indicator, Gestalt figure-ground */}
      <div className={`ans-band ${type}`}/>

      {/* Header row */}
      <div className="ans-hdr">
        <div className="ans-type-row">
          <div className={`ans-ico ${type}`}>
            <Icon size={17} color={icolor} strokeWidth={2}/>
          </div>
          <div>
            <div className={`ans-label ${type}`}>{label}</div>
            <div className="ans-title">{title}</div>
          </div>
        </div>
        <div className="ans-meta-row">
          {type==='policy'&&res.confidence!=null&&(
            <div className="conf-badge"><TrendingUp size={9}/>{res.confidence}%</div>
          )}
          {type==='general'&&(
            <div className="ai-badge"><Sparkles size={9}/>AI</div>
          )}
          {res.response_time_ms&&(
            <span className="time-badge">{fmtMs(res.response_time_ms)}</span>
          )}
        </div>
      </div>

      {/* Answer body — collapsible for long answers */}
      <div className="ans-body">
        <div className={`ans-body-inner ${isLong&&!expanded?'collapsed':'expanded'}`}>
          {res.success
            ? <AnswerText text={res.answer}/>
            : <p style={{fontSize:'.9rem',color:'var(--t3)',lineHeight:1.75}}>{res.message}</p>
          }
          {type==='general'&&res.success&&(
            <div className="ai-note">
              <Info size={11} style={{flexShrink:0,marginTop:2}}/>
              <span>This answer draws from AI general knowledge, not your uploaded policy documents. For regulatory figures like repo rate, verify at <strong style={{color:'var(--indigo)'}}>rbi.org.in</strong>.</span>
            </div>
          )}
        </div>
        {isLong&&(
          <button className="ans-expand-btn" onClick={()=>setExpanded(e=>!e)}>
            {expanded
              ? <><ChevronUp size={13}/> Show less</>
              : <><ChevronDown size={13}/> View full answer <span style={{color:'var(--t4)',fontWeight:400,marginLeft:4}}>({answerLen} chars)</span></>
            }
          </button>
        )}
      </div>

      {/* Citations — grouped below answer, Gestalt proximity */}
      {type==='policy'&&res.citations?.length>0&&(
        <div className="cits-section">
          <div className="cits-label"><FileText size={9}/>Source Documents</div>
          <div className="cit-grid">
            {res.citations.map((c,i)=>(
              <div className="cit" key={i}>
                <div>
                  <div className="cit-name">{c.policy_name}</div>
                  <div className="tags">
                    <span className="tag tb">{c.policy_id}</span>
                    <span className="tag tg">v{c.version}</span>
                    {c.page&&<span className="tag tt">pg.{c.page}</span>}
                  </div>
                </div>
                <ArrowUpRight size={13} color="var(--teal)" style={{flexShrink:0}}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share / action toolbar — only shown when there's an answer */}
      {hasAnswer&&(
        <div className="ans-actions">
          {/* Copy to clipboard */}
          <button
            className={`act-btn copy${copied?' copied':''}`}
            onClick={handleCopy}
            title="Copy answer text"
          >
            {copied
              ? <><Check size={12}/> Copied!</>
              : <><Copy size={12}/> Copy</>
            }
          </button>

          <div className="act-sep"/>

          {/* WhatsApp */}
          <button
            className="act-btn whatsapp"
            onClick={handleWhatsApp}
            title="Share on WhatsApp"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
            </svg>
            WhatsApp
          </button>

          {/* Email */}
          <button
            className="act-btn email"
            onClick={handleEmail}
            title="Send via email"
          >
            <Mail size={12}/> Email
          </button>

          {/* Native Share (mobile/modern browsers only) */}
          {canNativeShare&&(
            <button
              className="act-btn share"
              onClick={handleNativeShare}
              title="Share via system sheet"
            >
              <Share2 size={12}/> Share
            </button>
          )}
        </div>
      )}
    </div>{/* end ans-inner */}
    </div>
  );
}

/* ══════════════════════════════════════════════
   QUERY PAGE — answer-first design
══════════════════════════════════════════════ */
function QueryPage({status,auditArr,onLog,cachedCount}){
  const[role,setRole]   = useState('Senior Loan Officer');
  const[query,setQuery] = useState('');
  const[res,setRes]     = useState(null);
  const[busy,setBusy]   = useState(false);
  const tref = useRef();
  const canvasRef = useRef();

  const run = useCallback(async()=>{
    const q=query.trim();
    if(!q||busy)return;
    setBusy(true); setRes(null);
    try{
      const r=await queryPolicy(q,role);
      setRes(r);
      onLog({timestamp:new Date().toISOString(),query:q,status:r.success?'SUCCESS':'FAILED',confidence:r.confidence});
    }catch(e){
      setRes({success:false,query_type:'error',message:e.message||'Connection error. Ensure backend is running on port 8000.'});
    }finally{
      setBusy(false);
      // scroll answer into view
      setTimeout(()=>canvasRef.current?.scrollTo({top:canvasRef.current.scrollHeight,behavior:'smooth'}),100);
    }
  },[query,role,busy,onLog]);

  const pick=q=>{setQuery(q);setTimeout(()=>tref.current?.focus(),40);};

  return(
    <div className="page">
      <div className="qp-main">

        {/* ── Centre: answer canvas + search bar ── */}
        <div className="qp-center">

          {/* Answer canvas — big, focused, scrollable */}
          <div className="answer-canvas" ref={canvasRef}>
            {/* Empty state — Gestalt figure/ground: center content stands out */}
            {!busy&&!res&&(
              <div className="answer-empty">
                <div className="ae-icon">
                  <Shield size={30} color="var(--indigo)" strokeWidth={1.5}/>
                </div>
                <div>
                  <div className="ae-title">Ask anything about loans &amp; compliance</div>
                  <div className="ae-sub" style={{marginTop:'.5rem'}}>Policy documents, RBI regulations, interest rates, eligibility criteria — all in one place.</div>
                </div>
                <div className="quick-chips">
                  {QUICK.map(q=>(
                    <button key={q.label} className="qchip" onClick={()=>pick(q.q)}>{q.icon} {q.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Thinking state */}
            {busy&&(
              <div className="thinking">
                <div className="think-dots">
                  <div className="think-dot"/><div className="think-dot"/><div className="think-dot"/>
                </div>
                <span style={{fontSize:'.84rem',color:'var(--t3)',fontStyle:'italic'}}>Analysing your query…</span>
              </div>
            )}

            {/* Answer card — focal point */}
            {!busy&&res&&<AnswerCard res={res}/>}
          </div>

          {/* Search bar — compact, bottom-anchored */}
          <div className="search-bar" style={{position:'relative'}}>
            <div className="sb-row">
              <textarea
                ref={tref}
                className="sb-textarea"
                rows={1}
                value={query}
                onChange={e=>setQuery(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run();}}}
                onInput={e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,160)+'px';}}
                placeholder="Ask about policies, RBI rates, loan eligibility…"
              />
              <button className="sb-send" onClick={run} disabled={busy||!query.trim()} title="Send (Enter)">
                {busy ? <span className="spin" style={{borderTopColor:'white',width:16,height:16}}/> : <Send size={16}/>}
              </button>
            </div>
            <div className="sb-meta">
              <div className="sb-role-wrap">
                <span className="sb-role-lbl"><Lock size={9}/>Role</span>
                <select className="sel" value={role} onChange={e=>setRole(e.target.value)} style={{fontSize:'.74rem',padding:'.25rem .625rem'}}>
                  {ROLES.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <span className="sb-hint">↵ Enter to send · Shift+Enter for newline</span>
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="qp-side">
          {/* Stats — Gestalt similarity: all same card style */}
          <div className="side-card">
            <div className="side-chdr"><Cpu size={9}/>System Status<span style={{marginLeft:'auto'}}><StatusPill status={status}/></span></div>
            <div className="stat-grid">
              {[
                {v:cachedCount??'…',l:'Cached Docs',c:'var(--teal)'},
                {v:auditArr.filter(e=>e.status==='SUCCESS').length,l:'Successful',c:'var(--indigo)'},
                {v:auditArr.length,l:'Total Queries',c:'var(--gold)'},
                {v:auditArr.filter(e=>e.status!=='SUCCESS').length,l:'No Result',c:'var(--rose)'},
              ].map(s=>(
                <div key={s.l} className="stat-blk">
                  <div className="stat-val" style={{color:s.c}}>{s.v}</div>
                  <div className="stat-lbl">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick queries — Gestalt proximity: grouped list */}
          <div className="side-card">
            <div className="side-chdr"><Zap size={9}/>Quick Queries</div>
            {QUICK.map(q=>(
              <button className="qli" key={q.label} onClick={()=>pick(q.q)}>
                <span className="qli-icon">{q.icon}</span>
                <div><div className="qlt">{q.label}</div><div className="qls">{q.sub}</div></div>
              </button>
            ))}
          </div>

          {/* Recent queries */}
          {auditArr.length>0&&(
            <div className="side-card">
              <div className="side-chdr"><Clock size={9}/>Recent</div>
              {auditArr.slice(0,6).map((e,i)=>(
                <div key={i} className="recent-row">
                  <span className={`chip ${e.status==='SUCCESS'?'cok':'cno'}`}>{e.status==='SUCCESS'?'✓':'✗'}</span>
                  <span style={{fontSize:'.72rem',color:'var(--t3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,marginLeft:'.4rem'}}>
                    {e.query.slice(0,46)}{e.query.length>46?'…':''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   POLICY CACHE LIST
══════════════════════════════════════════════ */
function PolicyCacheList({policies,loading,onDelete}){
  const[deleting,setDeleting]=useState(null);
  const handleDelete=async pid=>{
    if(!window.confirm(`Remove "${pid}" from index? The PDF file remains on disk.`))return;
    setDeleting(pid);
    try{await onDelete(pid);}finally{setDeleting(null);}
  };
  if(loading)return(<div style={{padding:'2rem',textAlign:'center'}}><div className="spin-lg" style={{margin:'0 auto .75rem'}}/><p style={{color:'var(--t3)',fontSize:'.8rem'}}>Loading…</p></div>);
  if(!policies.length)return(
    <div className="empty" style={{padding:'2rem'}}>
      <div className="eico"><HardDrive size={20}/></div>
      <div className="ettl">No cached policies</div>
      <div className="esub">Upload a PDF above to index it.</div>
    </div>
  );
  return(
    <div>{policies.map(pol=>(
      <div className="pol-row" key={pol.policy_id}>
        <div>
          <div className="pol-name">{pol.policy_name||pol.policy_id}</div>
          <div className="pol-meta">
            <span className="tag tb" style={{fontSize:'.6rem'}}>{pol.policy_id}</span>
            <span className="tag tg" style={{fontSize:'.6rem'}}>v{pol.version}</span>
            <span className="tag tt" style={{fontSize:'.6rem'}}>{pol.chunk_count} chunks</span>
            <span className="tag tv" style={{fontSize:'.6rem'}}>{pol.risk_level}</span>
          </div>
          <div style={{fontSize:'.65rem',color:'var(--t4)',marginTop:'.2rem'}}>Indexed {fmtDate(pol.indexed_at)} · {pol.required_role}</div>
        </div>
        <CheckCircle size={12} color="var(--teal)" title="Indexed"/>
        <button className="btn btn-danger" style={{padding:'.3rem .55rem',fontSize:'.7rem'}} onClick={()=>handleDelete(pol.policy_id)} disabled={deleting===pol.policy_id} title="Remove">
          {deleting===pol.policy_id?<span className="spin"/>:<Trash2 size={11}/>}
        </button>
      </div>
    ))}</div>
  );
}

/* ══════════════════════════════════════════════
   UPLOAD PAGE
══════════════════════════════════════════════ */
function UploadPage({onCacheUpdate}){
  const[busy,setBusy]=useState(false);
  const[over,setOver]=useState(false);
  const[progress,setProgress]=useState(0);
  const[msg,setMsg]=useState(null);
  const[meta,setMeta]=useState({version:'1.0',required_role:'Junior Officer',risk_level:'Low'});
  const[policies,setPolicies]=useState([]);
  const[cacheLoading,setCacheLoading]=useState(true);
  const fref=useRef();

  const loadPolicies=useCallback(async()=>{
    setCacheLoading(true);
    try{const d=await listPolicies();setPolicies(d.policies||[]);onCacheUpdate?.(d.unique_policies??0);}
    catch(e){console.warn(e.message);setPolicies([]);}
    finally{setCacheLoading(false);}
  },[onCacheUpdate]);

  useEffect(()=>{loadPolicies();},[loadPolicies]);
  useEffect(()=>{
    if(!busy){setProgress(0);return;}
    setProgress(12);
    const s=[setTimeout(()=>setProgress(38),400),setTimeout(()=>setProgress(62),1100),setTimeout(()=>setProgress(82),2200)];
    return()=>s.forEach(clearTimeout);
  },[busy]);

  const handleFile=async file=>{
    if(!file)return;
    if(!file.name.toLowerCase().endsWith('.pdf')){setMsg({t:'err',s:'Only PDF files are supported.'});return;}
    if(file.size>52428800){setMsg({t:'err',s:`File too large (${(file.size/1048576).toFixed(1)} MB). Max 50 MB.`});return;}
    setBusy(true);setMsg(null);
    try{
      const result=await uploadPolicy(file,{name:file.name.replace(/\.pdf$/i,'').replace(/_/g,' '),version:meta.version,required_role:meta.required_role,risk_level:meta.risk_level});
      setProgress(100);
      if(result.already_indexed)setMsg({t:'info',s:`Already cached as ${result.policy_id} (${result.chunks_created} chunks).`});
      else setMsg({t:'ok',s:`Indexed — ${result.chunks_created} chunks created (${result.policy_id}).`});
      await loadPolicies();
    }catch(e){setMsg({t:'err',s:`Upload failed: ${e.message}`});}
    finally{setBusy(false);}
  };

  const handleDelete=async pid=>{await deletePolicy(pid);await loadPolicies();onCacheUpdate?.(policies.length-1);};
  const fbClass=msg?.t==='ok'?'fb-ok':msg?.t==='info'?'fb-info':'fb-err';
  const FbIcon=msg?.t==='ok'?CheckCircle:msg?.t==='info'?Info:AlertTriangle;

  return(
    <div className="page-scroll sg" style={{maxWidth:720,margin:'0 auto'}}>
      <div className="ew" style={{marginBottom:'.5rem'}}><Upload size={9}/>Documents</div>
      <div style={{fontFamily:'Playfair Display,serif',fontSize:'1.625rem',fontWeight:700,color:'var(--t1)',marginBottom:'.25rem'}}>Policy Document Cache</div>
      <p style={{fontSize:'.84rem',color:'var(--t3)',marginBottom:'1.5rem'}}>Upload PDFs once — cached permanently, survive server restarts</p>

      <div className="card" style={{marginBottom:'1.125rem'}}>
        <div className="chdr"><div className="ew" style={{margin:0}}><Upload size={9}/>Upload New Document</div></div>
        <div className="cbody">
          <div className={`dz${busy?' busy':''}${over?' over':''}`}
            onClick={()=>!busy&&fref.current?.click()}
            onDragOver={e=>{e.preventDefault();if(!busy)setOver(true);}}
            onDragLeave={()=>setOver(false)}
            onDrop={e=>{e.preventDefault();setOver(false);if(!busy)handleFile(e.dataTransfer.files[0]);}}>
            <input ref={fref} type="file" accept=".pdf,.PDF" style={{display:'none'}} onChange={e=>{handleFile(e.target.files[0]);e.target.value='';}} disabled={busy}/>
            {busy?(
              <><div className="spin-lg" style={{margin:'0 auto .75rem'}}/><p style={{color:'var(--t1)',fontWeight:600,marginBottom:'.25rem'}}>Processing…</p><p style={{color:'var(--t3)',fontSize:'.76rem'}}>Extracting text and building search index</p><div className="prog-bar" style={{marginTop:'.875rem',maxWidth:220,margin:'.875rem auto 0'}}><div className="prog-fill" style={{width:`${progress}%`}}/></div></>
            ):(
              <><div className="dico"><Upload size={20} color="var(--indigo)"/></div><p style={{fontWeight:600,marginBottom:'.25rem',color:'var(--t1)'}}>Drop PDF here or click to browse</p><p style={{fontSize:'.76rem',color:'var(--t3)'}}>PDF only · Max 50 MB · Auto-cached</p></>
            )}
          </div>
          {msg&&<div className={`fb ${fbClass}`}><FbIcon size={12} style={{flexShrink:0,marginTop:1}}/><span>{msg.s}</span></div>}
          <div className="div"/>
          <div className="ew" style={{marginBottom:'.75rem'}}><Database size={9}/>Document Metadata</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.625rem'}}>
            <div><label className="lbl">Version</label><input className="inp" value={meta.version} onChange={e=>setMeta(p=>({...p,version:e.target.value}))} placeholder="1.0"/></div>
            <div><label className="lbl">Risk Level</label><select className="sel inp" value={meta.risk_level} onChange={e=>setMeta(p=>({...p,risk_level:e.target.value}))}>{['Low','Medium','High'].map(r=><option key={r}>{r}</option>)}</select></div>
            <div style={{gridColumn:'1/-1'}}><label className="lbl">Minimum Access Role</label><select className="sel inp" value={meta.required_role} onChange={e=>setMeta(p=>({...p,required_role:e.target.value}))}>{ROLES.map(r=><option key={r}>{r}</option>)}</select></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="chdr">
          <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
            <div className="ew" style={{margin:0}}><HardDrive size={9}/>Cached Policies</div>
            {!cacheLoading&&<span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.69rem',color:'var(--teal)',background:'var(--teal-dim)',padding:'.1rem .46875rem',borderRadius:'4px',border:'1px solid color-mix(in srgb,var(--teal) 25%,transparent)'}}>{policies.length} indexed</span>}
          </div>
          <button className="btn btn-ghost" style={{padding:'.28rem .625rem',fontSize:'.7rem'}} onClick={loadPolicies} disabled={cacheLoading}>
            <RefreshCw size={10} style={{animation:cacheLoading?'rot .8s linear infinite':undefined}}/> Refresh
          </button>
        </div>
        <PolicyCacheList policies={policies} loading={cacheLoading} onDelete={handleDelete}/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   AUDIT PAGE
══════════════════════════════════════════════ */
function AuditPage({log}){
  const[search,setSearch]=useState('');
  const fl=log.filter(e=>!search||e.query.toLowerCase().includes(search.toLowerCase()));
  const suc=log.filter(e=>e.status==='SUCCESS');
  const avgC=suc.length?Math.round(suc.reduce((a,b)=>a+(b.confidence||0),0)/suc.length):0;
  return(
    <div className="page-scroll sg">
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem',marginBottom:'1.5rem'}}>
        <div>
          <div className="ew"><BarChart3 size={9}/>Records</div>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'1.625rem',fontWeight:700,color:'var(--t1)',marginTop:'.25rem'}}>Audit Log</div>
          <p style={{fontSize:'.8rem',color:'var(--t3)',margin:'.15rem 0 0'}}>{log.length} queries this session</p>
        </div>
        <div style={{position:'relative',alignSelf:'flex-end'}}>
          <Search size={11} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--t4)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
            style={{paddingLeft:'1.875rem',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'8px',color:'var(--t1)',fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:'.78rem',padding:'.40625rem .8125rem .40625rem 1.875rem',outline:'none',width:190,transition:'border-color .18s'}}
            onFocus={e=>e.target.style.borderColor='var(--indigo)'}
            onBlur={e=>e.target.style.borderColor='var(--border2)'}/>
        </div>
      </div>
      <div className="sg4">
        {[{v:log.length,l:'Total',c:'var(--indigo)'},{v:suc.length,l:'Successful',c:'var(--teal)'},{v:log.length-suc.length,l:'No Result',c:'var(--rose)'},{v:avgC?avgC+'%':'—',l:'Avg Confidence',c:'var(--gold)'}].map(s=>(
          <div key={s.l} className="sblk" style={{color:s.c}}>
            <div className="sv" style={{color:s.c}}>{s.v}</div>
            <div className="sl">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="ahdr acols"><span>Time</span><span>Query</span><span>Status</span><span className="ac-conf">Conf.</span></div>
        {fl.length===0?(
          <div className="empty"><div className="eico"><Activity size={20}/></div><div className="ettl">No records yet</div><div className="esub">Run a query to populate this log.</div></div>
        ):fl.map((e,i)=>(
          <div className="arow acols" key={i} style={{display:'grid'}}>
            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.69rem',color:'var(--t3)'}}>{fmtT(e.timestamp)}</span>
            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--t2)',fontSize:'.78rem'}}>{e.query}</span>
            <span><span className={`chip ${e.status==='SUCCESS'?'cok':'cno'}`}>{e.status==='SUCCESS'?'✓ OK':'✗ None'}</span></span>
            <span className="ac-conf" style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.71rem',color:e.confidence?'var(--teal)':'var(--t4)'}}>{e.confidence!=null?`${e.confidence}%`:'—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════════ */
export default function App(){
  const[tab,setTab]     = useState('query');
  const[status,setStatus] = useState('checking');
  const[audit,setAudit]   = useState([]);
  const[cachedCount,setCachedCount] = useState(null);
  const[themeMode,setThemeMode] = useState(()=>{
    try{const s=localStorage.getItem('crai_theme');if(s&&['light','dark','system'].includes(s))return s;}catch{}
    return 'system';
  });

  useEffect(()=>{
    const apply=dark=>applyTokens(dark?DARK:LIGHT);
    if(themeMode==='system'){
      const mq=window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches);
      const h=e=>apply(e.matches);
      mq.addEventListener('change',h);
      return()=>mq.removeEventListener('change',h);
    }
    apply(themeMode==='dark');
  },[themeMode]);

  useEffect(()=>{try{localStorage.setItem('crai_theme',themeMode);}catch{}},[themeMode]);

  useEffect(()=>{
    const chk=async()=>{
      try{const h=await healthCheck();setStatus('connected');setCachedCount(h.policies_indexed??null);}
      catch{setStatus('disconnected');}
    };
    chk();const id=setInterval(chk,30000);return()=>clearInterval(id);
  },[]);

  const addLog=e=>setAudit(p=>[e,...p]);
  const NAV=[{id:'query',label:'Query',Icon:Search},{id:'upload',label:'Upload',Icon:Upload},{id:'audit',label:'Audit',Icon:Activity}];

  return(
    <>
      <style>{CSS}</style>
      <div className="bg-mesh"/>
      <div className="bg-grid"/>
      <div className="shell">
        <header className="hdr">
          <div className="brand">
            <div className="brand-mark"><Shield size={15} color="#fff" strokeWidth={2.5}/></div>
            <div><div className="brand-name">ComplianceAI</div><div className="brand-sub">Policy Intelligence</div></div>
          </div>
          <nav className="hdr-nav">
            {NAV.map(({id,label,Icon})=>(
              <button key={id} className={`htab${tab===id?' on':''}`} onClick={()=>setTab(id)}>
                <Icon size={11}/>{label}
                {id==='upload'&&cachedCount!=null&&cachedCount>0&&(
                  <span style={{background:'var(--teal)',color:'#fff',fontSize:'.57rem',fontWeight:700,padding:'0 .3rem',borderRadius:'999px',lineHeight:'1.5',marginLeft:'.15rem'}}>{cachedCount}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="hdr-right">
            <StatusPill status={status}/>
            <ThemeSW mode={themeMode} set={setThemeMode}/>
          </div>
        </header>

        <div className="body">
          <aside className="lpanel">
            <div className="lsec">Navigation</div>
            {NAV.map(({id,label,Icon})=>(
              <button key={id} className={`lbtn${tab===id?' on':''}`} onClick={()=>setTab(id)}>
                <div className="lico"><Icon size={12}/></div>{label}
              </button>
            ))}
            <div className="ldiv"/>
            <div className="lsec">Cache</div>
            <div style={{padding:'.3rem .6875rem .4rem',display:'flex',alignItems:'center',gap:'.4rem'}}>
              <Package size={11} color="var(--teal)"/>
              <span style={{fontSize:'.7rem',color:'var(--t3)',fontWeight:500}}>Policies: </span>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.78rem',color:'var(--teal)',fontWeight:600}}>{cachedCount??'…'}</span>
            </div>
            <div className="ldiv"/>
            <div className="lsec">System</div>
            <div style={{padding:'.3rem .5rem .4rem'}}><StatusPill status={status}/></div>
            <div style={{padding:'.2rem .6875rem .4rem'}}>
              <span style={{fontSize:'.7rem',color:'var(--t3)',fontWeight:500}}>Queries: </span>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.78rem',color:'var(--gold)',fontWeight:600}}>{audit.length}</span>
            </div>
            <div className="ldiv"/>
            <div className="lsec">Appearance</div>
            <div style={{padding:'.2rem .4rem'}}><ThemeSW mode={themeMode} set={setThemeMode}/></div>
          </aside>

          <main className="content">
            {tab==='query' &&<QueryPage  key="q" status={status} auditArr={audit} onLog={addLog} cachedCount={cachedCount}/>}
            {tab==='upload'&&<div style={{flex:1,overflowY:'auto'}}><UploadPage key="u" onCacheUpdate={setCachedCount}/></div>}
            {tab==='audit' &&<div style={{flex:1,overflowY:'auto'}}><AuditPage  key="a" log={audit}/></div>}
          </main>
        </div>
      </div>
    </>
  );
}
