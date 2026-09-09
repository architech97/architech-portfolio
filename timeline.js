/* ============================================================
   ArchiTECH Portfolio — Phase 1 scroll timeline (zero deps)
   Pure functions of progress. Scrubbing backward reverses.
   ============================================================ */
(function (root) {
  'use strict';

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function sectionProgress(rect, viewportH) {
    const height = Math.max(1, rect.height);
    const vh = Math.max(1, viewportH);
    if (height <= vh + 1) {
      return clamp((vh - rect.top) / (vh + height), 0, 1);
    }
    const travel = height - vh;
    return clamp(-rect.top / travel, 0, 1);
  }

  function constructFromProgress(p) {
    p = clamp(p, 0, 1);
    if (p < 0.82) {
      const raw = p / 0.82;
      const buildP = 1 - Math.pow(1 - raw, 2.4);
      return { buildP, scanY: buildP, yawBoost: p * 0.42, pitchBoost: p * 0.06 };
    }
    if (p < 0.94) {
      return { buildP: 1, scanY: (p - 0.82) / 0.12, yawBoost: 0.42, pitchBoost: 0.055 };
    }
    return { buildP: 1, scanY: 0.5, yawBoost: 0.45, pitchBoost: 0.06 };
  }

  function twinFromProgress(p) {
    p = clamp(p, 0, 1);
    const labels = ['STRUCTURE', 'FLOOR PLATES', 'ENVELOPE', 'SYSTEMS', 'VERIFIED'];
    const index = Math.min(labels.length - 1, Math.floor(p * labels.length));
    const local = Math.min(1, p * labels.length - index);
    const level = clamp(Math.ceil(Math.max(p, 0.02) * 7), 1, 7);
    return {
      index,
      local,
      label: labels[index],
      level,
      elev: level * 4.2,
      buildP: p,
    };
  }

  function gatesFromProgress(p) {
    p = clamp(p, 0, 1);
    if (p < 0.08) return { lit: -1, rollback: false, committed: false };
    if (p < 0.72) {
      const t = (p - 0.08) / 0.64;
      return { lit: Math.min(6, Math.floor(t * 7)), rollback: false, committed: false };
    }
    if (p < 0.82) return { lit: 6, rollback: false, committed: false };
    if (p < 0.92) return { lit: -1, rollback: true, committed: false };
    return { lit: 6, rollback: false, committed: true };
  }

  function qualityTier(input) {
    const opts = input || {};
    if (opts.saveData || opts.reduced) return 'low';
    if (opts.coarse) return 'medium';
    return 'high';
  }

  function dprCap(devicePixelRatio, cssWidth, tier) {
    const dpr = Math.max(1, devicePixelRatio || 1);
    let cap = 1.75;
    if (tier === 'low') cap = 1.25;
    else if (tier === 'medium') cap = 1.5;
    else if (cssWidth < 760) cap = 1.25;
    return Math.min(dpr, cap);
  }

  function materialStage(material) {
    if (material === 'slab') return 1;
    if (material === 'glass') return 2;
    return 0;
  }

  function solidVisible(material, stageIndex) {
    return materialStage(material) <= stageIndex;
  }

  const api = {
    clamp,
    sectionProgress,
    constructFromProgress,
    twinFromProgress,
    gatesFromProgress,
    qualityTier,
    dprCap,
    materialStage,
    solidVisible,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ArchiTECHTimeline = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
