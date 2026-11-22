// =============================================================
// PECVD 공정 챔버 단면 애니메이션 (equipment/pecvd/principle.html)
//   공용 엔진 js/sim/sim-core.js 위에서 돌아가는 "장면" 파일
//
// 4단계 (왼쪽 글이 스크롤되면 js/sim/scrolly.js가 단계를 고름)
//   1) 가스 유입    : 원료 가스가 위 배관 → 샤워헤드 안쪽 빈 공간 → 작은 구멍들로 고르게 나옴
//   2) 플라즈마 분해 : 샤워헤드(RF 전극)–히터(접지 전극) 사이에 플라즈마. 빠른 전자가 분자에 부딪혀
//                      분자가 쪼개짐 → 반응성 높은 라디칼(청록) + 수소 같은 조각(회색)
//   3) 흡착·막 성장  : 라디칼이 웨이퍼 표면에 붙고(흡착) 잠깐 옮겨 다니다 반응해 막이 됨.
//                      반응에서 남은 조각(부산물)은 표면에서 떨어져 나감(탈착)
//   4) 부산물 배기   : 부산물과 반응 안 한 가스가 히터 둘레를 돌아 아래 배기구 → 펌프로 빠짐
//
// 좌표 약속: 챔버 안쪽을 가로 0~1, 세로 0~1로 놓고 그림. 바깥 부품은 0보다 작거나 1보다 큰 값.
// 개념도라서 크기·개수·속도는 실제 비율이 아닙니다. 색은 css/style.css :root 변수에서 읽음.
// =============================================================
(function () {
  "use strict";

  // ---------- 치수 (챔버 안쪽 기준 비율) ----------
  const SH = { x0: 0.1, x1: 0.9, top: 0.065, bot: 0.1 };   // 샤워헤드 판
  const PLASMA = { top: 0.12, bot: 0.66 };                   // 플라즈마 영역 (두 전극 사이)
  const WAFER = { x0: 0.2, x1: 0.8, top: 0.7, bot: 0.716 };
  const HEATER = { x0: 0.15, x1: 0.85, top: 0.716, bot: 0.86 };
  const STEM = { x0: 0.45, x1: 0.55 };
  const EXITS = [[0.02, 0.12], [0.88, 0.98]];                // 아래 배기구 (왼쪽, 오른쪽)
  const HOLES = [];
  for (let i = 0; i < 15; i++) HOLES.push(0.14 + (0.72 * i) / 14);
  const FILM_N = 60;          // 막 두께를 기록하는 칸 수 (웨이퍼 폭을 나눔)
  const FILM_MAX = 0.03;      // 그림에서 막이 가장 두꺼워지는 높이
  const MAX = { gas: 60, rad: 70, byp: 90, e: 24 };

  // "#RRGGBB" → 투명도 있는 색
  function rgba(hex, a) {
    const h = (hex || "#888888").replace("#", "");
    const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // 가스 흐름: 샤워헤드 아래는 아래로 → 웨이퍼 위에서 바깥쪽으로 → 히터 가장자리 밖에서 아래 배기구로
  function flow(p) {
    const side = p.x < 0.5 ? -1 : 1;
    const out = Math.abs(p.x - 0.5);
    if (p.y < 0.58) return [(p.x - 0.5) * 0.12, 0.13];
    if (out < 0.36 && p.y < HEATER.top) {
      const k = Math.min(1, (p.y - 0.58) / 0.08);
      return [side * (0.06 + 0.24 * k), 0.13 * (1 - k)];
    }
    const tx = side < 0 ? 0.07 : 0.93;   // 배기구 가운데
    return [(tx - p.x) * 1.4, 0.34];
  }

  // 챔버 벽 안에 가두기: 챔버 안에서는 벽 사이, 배기구 아래(세로 1 넘음)에서는 그 배기 배관 폭 안
  function keepInside(p) {
    if (p.y > 1) {
      const ex = p.x < 0.5 ? EXITS[0] : EXITS[1];
      p.x = Math.max(ex[0] + 0.012, Math.min(ex[1] - 0.012, p.x));
    } else {
      p.x = Math.max(0.025, Math.min(0.975, p.x));
    }
  }

  // 막 두께(칸 번호 → 높이)
  const filmCol = (x) => Math.round(((x - WAFER.x0) / (WAFER.x1 - WAFER.x0)) * (FILM_N - 1));
  const filmTop = (state, x) => {
    const c = filmCol(x);
    return WAFER.top - (c >= 0 && c < FILM_N ? state.film[c] : 0);
  };

  const scene = {
    stages: [
      { name: "가스 유입", duration: 5, still: 3.6 },
      { name: "플라즈마 속 분해", duration: 6, still: 3.4 },
      { name: "흡착과 막 성장", duration: 7, still: 5.5 },
      { name: "부산물 배기", duration: 5, still: 3.2 },
    ],
    stillTime: 15,
    // 장면 전용 색 (css/style.css :root)
    colors: {
      gas: "--sim-gas", radical: "--c-cvd-bright", byp: "--sim-byproduct", film: "--c-cvd-bright",
      wafer: "--sim-wafer", coral: "--coral", ink: "--on-navy", soft: "--on-navy-muted", faint: "--on-navy-faint",
      heater: "--mat-panel-warm",
    },

    create(random) {
      return {
        r: random, gas: [], rad: [], ads: [], byp: [], e: [], flashes: [],
        film: new Array(FILM_N).fill(0), glow: 0, t: 0, spawn: 0,
      };
    },

    update(s, dt, stage) {
      const R = s.r;
      const i = stage.index;
      s.t += dt;

      // 플라즈마 밝기: 1단계(가스 유입)에서는 꺼짐, 2단계부터 켜짐 (부드럽게)
      const target = i >= 1 ? 1 : 0;
      s.glow += (target - s.glow) * Math.min(1, dt * 2.2);

      // ── 원료 가스 만들기: 위 배관 입구에서 하나씩 ──
      const rate = [16, 12, 9, 6][i];
      s.spawn += dt * rate;
      while (s.spawn >= 1) {
        s.spawn -= 1;
        if (s.gas.length < MAX.gas) {
          s.gas.push({ x: 0.5 + (R() - 0.5) * 0.03, y: -0.15, hx: HOLES[(R() * HOLES.length) | 0], ph: 0, rot: R() * 6.28 });
        }
      }

      // ── 원료 가스 움직임: 배관 → 샤워헤드 안쪽 빈 공간 → 구멍 → 아래로 ──
      for (const g of s.gas) {
        g.rot += dt * 0.8;
        if (g.ph === 0) {                        // 배관을 따라 내려옴
          g.y += dt * 0.32;
          if (g.y >= 0.03) { g.y = 0.03; g.ph = 1; }
        } else if (g.ph === 1) {                 // 빈 공간에서 옆으로 퍼짐 (자기 구멍 쪽으로)
          const d = g.hx - g.x;
          g.x += Math.sign(d) * Math.min(Math.abs(d), dt * 0.42);
          if (Math.abs(d) < 0.004) g.ph = 2;
        } else if (g.ph === 2) {                 // 구멍을 지남
          g.y += dt * 0.2;
          if (g.y > SH.bot + 0.01) g.ph = 3;
        } else {                                 // 챔버 안: 흐름을 따라감
          const f = flow(g);
          g.x += (f[0] + (R() - 0.5) * 0.05) * dt;
          g.y += f[1] * dt;
          if (Math.abs(g.x - 0.5) < 0.36 && g.y > WAFER.top - 0.03 && g.y < HEATER.top) g.y = WAFER.top - 0.03;
          keepInside(g);
        }
      }

      // ── 전자: 플라즈마가 켜졌을 때만, 플라즈마 영역 안에서 빠르게 튐 ──
      const eCount = Math.round(MAX.e * Math.max(0, (s.glow - 0.25) / 0.75));
      while (s.e.length < eCount) {
        const a = R() * 6.28;
        s.e.push({ x: 0.15 + R() * 0.7, y: PLASMA.top + R() * (PLASMA.bot - PLASMA.top), vx: Math.cos(a), vy: Math.sin(a), px: 0, py: 0, turn: R() });
      }
      if (s.e.length > eCount) s.e.length = eCount;
      for (const e of s.e) {
        e.px = e.x; e.py = e.y;
        e.turn -= dt;
        if (e.turn < 0) { const a = R() * 6.28; e.vx = Math.cos(a); e.vy = Math.sin(a); e.turn = 0.25 + R() * 0.3; }
        e.x += e.vx * 1.15 * dt; e.y += e.vy * 1.15 * dt;
        if (e.x < 0.04 || e.x > 0.96) { e.vx *= -1; e.x = Math.max(0.04, Math.min(0.96, e.x)); }
        if (e.y < PLASMA.top || e.y > PLASMA.bot) { e.vy *= -1; e.y = Math.max(PLASMA.top, Math.min(PLASMA.bot, e.y)); }
      }

      // ── 전자 충돌 → 분자가 쪼개짐: 라디칼 1개 + 조각(부산물) 1개 + 부딪힌 자리 표시 ──
      if (s.e.length) {
        for (let k = s.gas.length - 1; k >= 0; k--) {
          const g = s.gas[k];
          if (g.ph !== 3 || g.y < PLASMA.top || g.y > PLASMA.bot) continue;
          for (const e of s.e) {
            const dx = e.x - g.x, dy = e.y - g.y;
            if (dx * dx + dy * dy < 0.028 * 0.028 && R() < 0.16 * s.glow) {
              s.gas.splice(k, 1);
              if (s.rad.length < MAX.rad) s.rad.push({ x: g.x, y: g.y, vx: (R() - 0.5) * 0.3, vy: (R() - 0.3) * 0.2, age: 0 });
              if (s.byp.length < MAX.byp) s.byp.push({ x: g.x + 0.01, y: g.y - 0.005, vx: (R() - 0.5) * 0.5, vy: -0.1 - R() * 0.15 });
              s.flashes.push({ x: g.x, y: g.y, age: 0 });
              e.vx = -e.vx;
              break;
            }
          }
        }
      }

      // ── 라디칼: 무작위로 떠다니며(확산) 웨이퍼 쪽으로. 3단계부터 웨이퍼로 더 빨리 감 ──
      const drift = i >= 2 ? 0.55 : 0.2;
      for (let k = s.rad.length - 1; k >= 0; k--) {
        const r = s.rad[k];
        r.age += dt;
        const f = flow(r);
        r.vx += (R() - 0.5) * 2.2 * dt;
        r.vy += ((R() - 0.5) * 2.2 + drift) * dt;
        r.vx *= 1 - 2.4 * dt; r.vy *= 1 - 2.4 * dt;
        r.x += (r.vx + f[0] * 0.4) * dt;
        r.y += (r.vy + f[1] * 0.3) * dt;
        r.x = Math.max(0.03, Math.min(0.97, r.x));
        if (r.y < PLASMA.top) { r.y = PLASMA.top; r.vy = Math.abs(r.vy); }
        const onWafer = r.x > WAFER.x0 && r.x < WAFER.x1;
        if (onWafer && r.y >= filmTop(s, r.x) - 0.006) {
          // 표면에 붙음 (흡착) → 잠깐 옆으로 옮겨 다닌 뒤 막이 됨
          s.rad.splice(k, 1);
          s.ads.push({ x: r.x, t: 0, dir: R() < 0.5 ? -1 : 1 });
        } else if (!onWafer && r.y > 0.64) {
          // 웨이퍼 밖으로 간 라디칼은 흐름에 실려 배기 (그림을 단순하게: 벽에 쌓이는 막은 생략)
          s.rad.splice(k, 1);
          if (s.byp.length < MAX.byp) s.byp.push({ x: r.x, y: r.y, vx: 0, vy: 0 });
        } else if (r.age > 9) {
          s.rad.splice(k, 1);
        }
      }

      // ── 흡착된 라디칼 → 표면 반응 → 막(두께 칸에 더함) + 부산물 탈착 ──
      for (let k = s.ads.length - 1; k >= 0; k--) {
        const a = s.ads[k];
        a.t += dt;
        a.x += a.dir * 0.014 * dt;              // 표면 위를 조금 옮겨 다님 (표면 확산)
        if (a.t > 0.8) {
          s.ads.splice(k, 1);
          const c = filmCol(a.x);
          for (let j = -3; j <= 3; j++) {
            const cc = c + j;
            if (cc < 0 || cc >= FILM_N) continue;
            s.film[cc] = Math.min(FILM_MAX, s.film[cc] + 0.0016 * Math.exp(-(j * j) / 4));
          }
          if (s.byp.length < MAX.byp && R() < 0.7) {
            s.byp.push({ x: a.x, y: filmTop(s, a.x) - 0.008, vx: (R() - 0.5) * 0.1, vy: -0.18 - R() * 0.1 });
          }
        }
      }
      // 막이 고르게 보이도록 이웃 칸과 살짝 평균 (실제로는 표면 확산·고른 공급의 결과)
      for (let c = 1; c < FILM_N - 1; c++) s.film[c] += ((s.film[c - 1] + s.film[c + 1]) / 2 - s.film[c]) * Math.min(1, dt * 1.5);

      // ── 부산물: 처음 튕긴 속도가 줄면서 흐름에 실려 배기구로 ──
      for (const b of s.byp) {
        const f = flow(b);
        b.vx *= 1 - 2 * dt; b.vy *= 1 - 2 * dt;
        b.x += (b.vx + f[0] * (i === 3 ? 1.25 : 1)) * dt + (R() - 0.5) * 0.02 * dt;
        b.y += (b.vy + f[1] * (i === 3 ? 1.25 : 1)) * dt;
        if (b.y < PLASMA.top) b.y = PLASMA.top;
        if (Math.abs(b.x - 0.5) < 0.36 && b.y > WAFER.top - 0.02 && b.y < HEATER.top) b.y = WAFER.top - 0.02;
        keepInside(b);
      }

      // 화면 밖(배기구 아래)으로 나간 것 지우기
      const gone = (p) => p.y > 1.12;
      s.gas = s.gas.filter((p) => !gone(p));
      s.byp = s.byp.filter((p) => !gone(p));
      s.flashes = s.flashes.filter((f) => (f.age += dt) < 0.45);
    },

    draw(ctx, s, view) {
      const { w, h, stage, still, colors: C } = view;
      const narrow = w < 520;
      const pad = narrow ? 10 : 16;
      const fs = narrow ? 11 : 13;

      // ── 배치: 왼쪽 = 챔버 단면, 오른쪽 = 이름표 칸 ──
      const labelW = narrow ? Math.min(112, w * 0.32) : Math.min(150, w * 0.28);
      const availW = w - labelW - pad * 2;
      const sc = Math.max(40, Math.min(availW / 1.14, (h - pad * 2) / 1.32));
      const ox = pad + 0.1 * sc;
      const oy = pad + 0.17 * sc + Math.max(0, (h - pad * 2 - 1.32 * sc) / 2);
      const X = (u) => ox + u * sc, Y = (v) => oy + v * sc;
      const cur = stage.index;
      const lineW = narrow ? 1 : 1.2;

      // ── 챔버 안쪽 바탕 + 벽 (아래 양쪽은 배기구로 뚫림) ──
      ctx.fillStyle = "rgba(6, 10, 24, 0.42)";
      ctx.fillRect(X(0), Y(-0.02), sc, 1.02 * sc);

      // 플라즈마 빛 (배경 분위기: 코랄 빛 번짐)
      if (s.glow > 0.02) {
        const flick = still ? 1 : 0.92 + 0.08 * Math.sin(s.t * 7.3) * Math.sin(s.t * 3.1);
        const cx = X(0.5), cy = Y((PLASMA.top + PLASMA.bot) / 2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.62);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.5 * sc);
        g.addColorStop(0, rgba(C.coral, 0.42 * s.glow * flick));
        g.addColorStop(0.55, rgba(C.coral, 0.2 * s.glow * flick));
        g.addColorStop(1, rgba(C.coral, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-0.5 * sc, -0.5 * sc, sc, sc);
        ctx.restore();
      }

      ctx.strokeStyle = rgba(C.ink, 0.38);
      ctx.lineWidth = lineW;
      ctx.beginPath();
      ctx.moveTo(X(EXITS[0][0]), Y(1)); ctx.lineTo(X(0), Y(1)); ctx.lineTo(X(0), Y(-0.02));
      ctx.lineTo(X(0.47), Y(-0.02)); ctx.moveTo(X(0.53), Y(-0.02));
      ctx.lineTo(X(1), Y(-0.02)); ctx.lineTo(X(1), Y(1)); ctx.lineTo(X(EXITS[1][1]), Y(1));
      ctx.moveTo(X(EXITS[0][1]), Y(1)); ctx.lineTo(X(STEM.x0), Y(1));
      ctx.moveTo(X(STEM.x1), Y(1)); ctx.lineTo(X(EXITS[1][0]), Y(1));
      ctx.stroke();

      // 배기구 아래 배관
      for (const [a, b] of EXITS) {
        ctx.beginPath();
        ctx.moveTo(X(a), Y(1)); ctx.lineTo(X(a), Y(1.1));
        ctx.moveTo(X(b), Y(1)); ctx.lineTo(X(b), Y(1.1));
        ctx.stroke();
      }

      // 원료 가스 배관 (위)
      ctx.beginPath();
      ctx.moveTo(X(0.47), Y(-0.17)); ctx.lineTo(X(0.47), Y(-0.02));
      ctx.moveTo(X(0.53), Y(-0.17)); ctx.lineTo(X(0.53), Y(-0.02));
      ctx.stroke();

      // 샤워헤드 판 (구멍 뚫린 금속판)
      ctx.fillStyle = rgba(C.ink, 0.62);
      ctx.fillRect(X(SH.x0), Y(SH.top), (SH.x1 - SH.x0) * sc, (SH.bot - SH.top) * sc);
      ctx.fillStyle = "rgba(6, 10, 24, 0.9)";
      const holeW = Math.max(1.5, 0.012 * sc);
      for (const hx of HOLES) ctx.fillRect(X(hx) - holeW / 2, Y(SH.top), holeW, (SH.bot - SH.top) * sc);
      // 샤워헤드 위 빈 공간 옆벽
      ctx.strokeStyle = rgba(C.ink, 0.3);
      ctx.beginPath();
      ctx.moveTo(X(SH.x0), Y(SH.top)); ctx.lineTo(X(SH.x0), Y(-0.02));
      ctx.moveTo(X(SH.x1), Y(SH.top)); ctx.lineTo(X(SH.x1), Y(-0.02));
      ctx.stroke();

      // RF 전원 표시: 샤워헤드 왼쪽 위로 선 → 동그라미 안 물결
      const rfx = X(-0.05), rfy = Y(-0.1), rr = Math.max(7, 0.04 * sc);
      ctx.strokeStyle = rgba(C.ink, cur === 1 ? 0.75 : 0.4);
      ctx.beginPath();
      ctx.moveTo(X(SH.x0), Y(SH.top + 0.01)); ctx.lineTo(X(0.05), Y(SH.top + 0.01));
      ctx.lineTo(X(0.05), Y(-0.1)); ctx.lineTo(rfx + rr, rfy);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(rfx, rfy, rr, 0, 6.283); ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k <= 16; k++) {
        const u = k / 16, xx = rfx - rr * 0.6 + u * rr * 1.2, yy = rfy - Math.sin(u * 6.283) * rr * 0.35;
        k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();

      // 히터 (받침대) + 기둥 + 접지 표시
      ctx.fillStyle = rgba(C.heater, 0.5);
      ctx.fillRect(X(HEATER.x0), Y(HEATER.top), (HEATER.x1 - HEATER.x0) * sc, (HEATER.bot - HEATER.top) * sc);
      ctx.fillRect(X(STEM.x0), Y(HEATER.bot), (STEM.x1 - STEM.x0) * sc, (1.05 - HEATER.bot) * sc);
      ctx.strokeStyle = rgba(C.ink, 0.4);
      const gx = X(0.5), gy = Y(1.07);
      ctx.beginPath();
      ctx.moveTo(gx, Y(1.05)); ctx.lineTo(gx, gy);
      for (let k = 0; k < 3; k++) { const hw = (0.045 - k * 0.015) * sc; ctx.moveTo(gx - hw, gy + k * 0.016 * sc); ctx.lineTo(gx + hw, gy + k * 0.016 * sc); }
      ctx.stroke();

      // 웨이퍼 + 쌓인 막
      ctx.fillStyle = C.wafer;
      ctx.fillRect(X(WAFER.x0), Y(WAFER.top), (WAFER.x1 - WAFER.x0) * sc, (WAFER.bot - WAFER.top) * sc);
      if (s.film.some((v) => v > 0.0005)) {
        ctx.fillStyle = rgba(C.film, 0.88);
        ctx.beginPath();
        ctx.moveTo(X(WAFER.x0), Y(WAFER.top));
        for (let c = 0; c < FILM_N; c++) ctx.lineTo(X(WAFER.x0 + ((WAFER.x1 - WAFER.x0) * c) / (FILM_N - 1)), Y(WAFER.top - s.film[c]));
        ctx.lineTo(X(WAFER.x1), Y(WAFER.top));
        ctx.closePath();
        ctx.fill();
      }

      // ── 지금 단계 강조 (공정 색 선) ──
      ctx.strokeStyle = C.radical;
      ctx.lineWidth = narrow ? 1.4 : 1.8;
      ctx.setLineDash([]);
      if (cur === 0) {
        ctx.strokeRect(X(SH.x0) - 3, Y(SH.top) - 3, (SH.x1 - SH.x0) * sc + 6, (SH.bot - SH.top) * sc + 6);
      } else if (cur === 1) {
        // 플라즈마 영역 양쪽 괄호
        ctx.beginPath();
        for (const xx of [X(0.035), X(0.965)]) {
          const d = xx < X(0.5) ? 6 : -6;
          ctx.moveTo(xx + d, Y(PLASMA.top)); ctx.lineTo(xx, Y(PLASMA.top)); ctx.lineTo(xx, Y(PLASMA.bot)); ctx.lineTo(xx + d, Y(PLASMA.bot));
        }
        ctx.stroke();
      } else if (cur === 2) {
        ctx.beginPath();
        ctx.moveTo(X(WAFER.x0) - 4, Y(WAFER.bot) + 4); ctx.lineTo(X(WAFER.x1) + 4, Y(WAFER.bot) + 4);
        ctx.stroke();
      } else {
        // 배기 흐름 화살표 (점선이 흐름 방향으로 움직임)
        ctx.setLineDash([5, 6]);
        ctx.lineDashOffset = still ? 0 : -s.t * 24;
        for (const side of [-1, 1]) {
          const xEdge = side < 0 ? 0.11 : 0.89, xExit = side < 0 ? 0.07 : 0.93;
          ctx.beginPath();
          ctx.moveTo(X(0.5 + side * 0.18), Y(0.665));
          ctx.lineTo(X(xEdge), Y(0.665));
          ctx.quadraticCurveTo(X(xExit), Y(0.68), X(xExit), Y(0.8));
          ctx.lineTo(X(xExit), Y(1.08));
          ctx.stroke();
          // 화살촉
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(X(xExit) - 5, Y(1.08) - 6); ctx.lineTo(X(xExit), Y(1.08)); ctx.lineTo(X(xExit) + 5, Y(1.08) - 6);
          ctx.stroke();
          ctx.setLineDash([5, 6]);
        }
        ctx.setLineDash([]);
      }

      // ── 입자 ──
      const unit = sc / 340;                    // 화면 크기에 맞춘 입자 크기 배율
      const rGas = Math.max(2.6, 4.2 * unit);
      // 원료 분자: 가운데 원자 + 둘레 작은 원자 4개 (예: SiH4 모양)
      for (const g of s.gas) {
        const x = X(g.x), y = Y(g.y);
        ctx.fillStyle = rgba(C.gas, 0.9);
        for (let k = 0; k < 4; k++) {
          const a = g.rot + k * 1.571;
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * rGas * 1.25, y + Math.sin(a) * rGas * 1.25, rGas * 0.42, 0, 6.283); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(x, y, rGas, 0, 6.283); ctx.fill();
      }
      // 부산물(수소 등 조각): 작은 회색 점
      ctx.fillStyle = rgba(C.byp, 0.95);
      for (const b of s.byp) { ctx.beginPath(); ctx.arc(X(b.x), Y(b.y), Math.max(1.4, 2 * unit), 0, 6.283); ctx.fill(); }
      // 라디칼: 청록 점 + 바깥 고리 (반응성이 큼)
      const rRad = Math.max(2.4, 3.6 * unit);
      ctx.lineWidth = 1;
      for (const r of s.rad) {
        const x = X(r.x), y = Y(r.y);
        ctx.fillStyle = C.radical;
        ctx.beginPath(); ctx.arc(x, y, rRad, 0, 6.283); ctx.fill();
        ctx.strokeStyle = rgba(C.radical, 0.45);
        ctx.beginPath(); ctx.arc(x, y, rRad * 2, 0, 6.283); ctx.stroke();
      }
      // 흡착된 라디칼: 표면 위에 앉은 청록 점 (막이 되기 직전)
      for (const a of s.ads) {
        ctx.fillStyle = C.radical;
        ctx.beginPath(); ctx.arc(X(a.x), Y(filmTop(s, a.x)) - rRad * 0.8, rRad, 0, 6.283); ctx.fill();
      }
      // 전자: 아주 작은 밝은 점 + 짧은 꼬리
      ctx.strokeStyle = rgba(C.electron, 0.55);
      ctx.fillStyle = C.electron;
      for (const e of s.e) {
        const x = X(e.x), y = Y(e.y);
        ctx.beginPath(); ctx.moveTo(x - e.vx * 7 * unit, y - e.vy * 7 * unit); ctx.lineTo(x, y); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, Math.max(1.2, 1.6 * unit), 0, 6.283); ctx.fill();
      }
      // 충돌 표시: 퍼지는 고리
      for (const f of s.flashes) {
        const k = f.age / 0.45;
        ctx.strokeStyle = rgba(C.radical, 0.8 * (1 - k));
        ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), (4 + 10 * k) * Math.max(0.7, unit), 0, 6.283); ctx.stroke();
      }

      // ── 이름표 (도면식: 오른쪽 칸 + 가는 지시선). 지금 단계의 이름표만 또렷하게 ──
      const labels = [
        { t: "원료 가스", v: -0.13, ax: 0.53, st: 0 },
        { t: "샤워헤드 (RF 전극)", v: 0.083, ax: SH.x1, st: 0 },
        { t: "플라즈마", v: 0.36, ax: 0.8, st: 1 },
        { t: "웨이퍼와 막", v: 0.69, ax: WAFER.x1, st: 2 },
        { t: "히터 (접지 전극)", v: 0.8, ax: HEATER.x1, st: -1 },
        { t: "배기 → 펌프", v: 1.08, ax: EXITS[1][1], st: 3 },
      ];
      const lx = X(1) + (narrow ? 14 : 22);
      const maxTextW = w - lx - 4;
      ctx.textBaseline = "middle";
      let lastY = -1e9;
      for (const L of labels) {
        const on = L.st === cur;
        ctx.font = `${on ? 700 : 500} ${fs}px Pretendard, -apple-system, sans-serif`;
        // 칸이 좁으면 괄호 앞에서 두 줄로
        let lines = [L.t];
        if (ctx.measureText(L.t).width > maxTextW && L.t.indexOf(" (") > 0) lines = [L.t.slice(0, L.t.indexOf(" (")), L.t.slice(L.t.indexOf(" (") + 1)];
        const lh = fs * 1.3;
        let y = Math.max(Y(L.v), lastY + lh * lines.length + 4);
        lastY = y + lh * (lines.length - 1);
        ctx.strokeStyle = on ? rgba(C.radical, 0.9) : rgba(C.ink, 0.22);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(L.ax) + 3, Y(L.v)); ctx.lineTo(lx - 10, Y(L.v)); ctx.lineTo(lx - 4, y); ctx.stroke();
        if (on) { ctx.fillStyle = C.radical; ctx.beginPath(); ctx.arc(X(L.ax) + 3, Y(L.v), 2.4, 0, 6.283); ctx.fill(); }
        ctx.fillStyle = on ? C.ink : C.soft;
        lines.forEach((ln, k) => ctx.fillText(ln, lx, y + k * lh));
      }
      // RF 글자
      ctx.font = `600 ${Math.max(9, fs - 2)}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = cur === 1 ? C.ink : C.soft;
      ctx.textAlign = "center";
      ctx.fillText("RF", rfx, rfy - rr - fs * 0.7);
      ctx.textAlign = "start";
    },
  };

  ProcessSim.register("pecvd", scene);
})();
