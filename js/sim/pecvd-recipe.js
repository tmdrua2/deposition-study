// =============================================================
// PECVD 공정 챔버 레시피 단계 애니메이션 (equipment/pecvd/flow.html)
//   공용 엔진 js/sim/sim-core.js 위에서 돌아가는 "장면" 파일. 단계는 js/sim/scrolly.js가 스크롤로 고름
//
// 8단계 (웨이퍼 한 장 = 1~6, 일정 매수마다 = 7~8)
//   1) 웨이퍼 넣기   : 슬릿 밸브 열림 → 로봇 블레이드가 웨이퍼를 들고 들어옴 → 리프트 핀이 올라와 받음
//                      → 블레이드 빠짐 → 슬릿 닫힘 → 핀이 내려가 웨이퍼가 히터 위에 놓임
//   2) 안정화       : 웨이퍼 온도·압력·가스 유량이 목표값에 자리 잡을 때까지 기다림 (플라즈마 없음)
//   3) 증착         : RF를 켜 플라즈마 → 라디칼이 웨이퍼에 붙어 막이 자람 (챔버 벽에도 조금씩 쌓임)
//   4) 퍼지         : RF와 원료 가스를 끄고 퍼지 가스로 남은 가스를 밀어냄
//   5) 펌핑         : 가스 공급 없이 빨아내 압력을 낮춤
//   6) 웨이퍼 꺼내기 : 1단계를 거꾸로
//   7) 챔버 세정     : 웨이퍼 없이 RPS가 NF3를 분해해 만든 불소 라디칼이 벽·샤워헤드에 쌓인 막을 깎아 냄
//   8) 시즈닝        : 세정 뒤 얇은 막을 벽에 미리 입혀 챔버 상태를 고르게 맞춤
//
// 오른쪽(휴대폰은 아래) 상태판 = 각 단계에서 무엇이 켜지고 꺼지는지 (실제 레시피 화면을 단순화)
// 순서·이름은 장비마다 다를 수 있음(본문에 [검증 필요]). 수치는 넣지 않음 — 압력은 막대 길이로 경향만
// 좌표 약속: 챔버 안쪽을 가로 0~1, 세로 0~1로 놓고 그림 (js/sim/pecvd.js와 같은 방식)
// =============================================================
(function () {
  "use strict";

  // ---------- 치수 (챔버 안쪽 기준 비율) ----------
  const SH = { x0: 0.1, x1: 0.9, top: 0.065, bot: 0.1 };      // 샤워헤드 판
  const PLASMA = { top: 0.12, bot: 0.64 };
  const HEATER = { x0: 0.15, x1: 0.85, top: 0.716, bot: 0.86 };
  const STEM = { x0: 0.45, x1: 0.55 };
  const WAFER = { half: 0.3, th: 0.016 };                       // 웨이퍼 반폭·두께
  const PINS = [0.27, 0.73];                                    // 리프트 핀 위치 (블레이드보다 바깥)
  const PIN_UP = 0.6;                                           // 핀이 올라갔을 때 꼭대기
  const BLADE = { half: 0.17, top: 0.631, th: 0.009 };          // 로봇 블레이드 (핀 사이로 들어옴)
  const SLIT = { top: 0.56, bot: 0.68 };                        // 왼쪽 벽 웨이퍼 출입구
  const EXITS = [[0.02, 0.12], [0.88, 0.98]];
  const HOLES = [];
  for (let i = 0; i < 15; i++) HOLES.push(0.14 + (0.72 * i) / 14);
  const MAXP = 110;

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const smooth = (v) => v * v * (3 - 2 * v);
  const seg = (p, a, b) => smooth(clamp01((p - a) / (b - a)));   // p가 a→b 사이일 때 0→1 (부드럽게)
  const lerp = (a, b, t) => a + (b - a) * t;
  function rgba(hex, a) {
    const h = (hex || "#888888").replace("#", "");
    const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---------- 단계와 진행(0~1)으로 정해지는 상태 (미리 돌리기·정지 그림이 항상 같게) ----------
  function machine(i, p) {
    const m = { slit: 0, pins: 0, blade: 0, wafer: null, film: 0, dep: 0.55, season: 0, pr: 0.08,
      gas: false, rf: false, purge: false, rps: false, temp: "" };
    // 벽에 쌓인 막(dep): 여러 장 처리하며 쌓여 있다가 증착 때 조금 더 → 세정 때 사라짐 → 시즈닝 막(season)
    m.dep = [0.55, 0.55, 0.55 + 0.12 * p, 0.67, 0.67, 0.67, 0.67 * (1 - seg(p, 0.1, 0.9)), 0][i];
    m.season = i === 7 ? seg(p, 0.1, 0.95) : 0;
    m.film = i < 2 ? 0 : i === 2 ? seg(p, 0.05, 0.95) : i <= 5 ? 1 : 0;
    // 압력 막대 (0~1, 목표 0.6): 숫자 없이 경향만
    m.pr = [0.08,
      0.08 + 0.52 * (1 - Math.exp(-6 * p)) + 0.07 * Math.sin(10 * p) * Math.exp(-4 * p),
      0.6, 0.6, 0.08 + 0.52 * Math.exp(-6 * p), 0.08, 0.72, 0.6][i];
    m.gas = i === 1 || i === 2 || i === 7;
    m.rf = (i === 2 && p > 0.04) || (i === 7 && p > 0.06);
    m.purge = i === 3;
    m.rps = i === 6;
    m.temp = ["올리기 전", "맞추는 중", "안정", "안정", "안정", "꺼내는 중", "웨이퍼 없음", "웨이퍼 없음"][i];

    // 웨이퍼·핀·블레이드·슬릿 움직임 (1단계 넣기, 6단계 꺼내기)
    const pinTop = (k) => lerp(HEATER.top, PIN_UP, k);
    if (i === 0) {
      m.slit = seg(p, 0, 0.1) * (1 - seg(p, 0.74, 0.84));
      m.blade = seg(p, 0.1, 0.36) * (1 - seg(p, 0.56, 0.74));
      m.pins = seg(p, 0.38, 0.5) * (1 - seg(p, 0.84, 0.98));
      const pt = pinTop(m.pins), bx = lerp(-0.5, 0.5, m.blade);
      if (pt < BLADE.top - 0.001) m.wafer = { x: 0.5, bot: pt };
      else if (p < 0.5) m.wafer = { x: bx, bot: BLADE.top };
      else m.wafer = { x: 0.5, bot: Math.min(pt, HEATER.top) };
    } else if (i === 5) {
      m.pins = seg(p, 0, 0.18) * (1 - seg(p, 0.5, 0.64));
      m.slit = seg(p, 0.18, 0.28) * (1 - seg(p, 0.88, 0.98));
      m.blade = seg(p, 0.28, 0.48) * (1 - seg(p, 0.66, 0.88));
      const pt = pinTop(m.pins), bx = lerp(-0.5, 0.5, m.blade);
      if (p < 0.5) m.wafer = { x: 0.5, bot: Math.min(pt, HEATER.top) };
      else if (pt < BLADE.top - 0.001) m.wafer = { x: 0.5, bot: pt };
      else m.wafer = { x: bx, bot: BLADE.top };
    } else if (i <= 4) {
      m.wafer = { x: 0.5, bot: HEATER.top };
    }
    return m;
  }

  // 가스 흐름: 샤워헤드 아래는 아래로 → 웨이퍼(히터) 위에서 바깥쪽 → 히터 밖에서 아래 배기구로
  function flow(p) {
    const side = p.x < 0.5 ? -1 : 1;
    const out = Math.abs(p.x - 0.5);
    if (p.y < 0.56) return [(p.x - 0.5) * 0.12, 0.14];
    if (out < 0.36 && p.y < HEATER.top) {
      const k = Math.min(1, (p.y - 0.56) / 0.1);
      return [side * (0.06 + 0.26 * k), 0.14 * (1 - k)];
    }
    const tx = side < 0 ? 0.07 : 0.93;
    return [(tx - p.x) * 1.4, 0.36];
  }
  function keepInside(p) {
    if (p.y > 1) {
      const ex = p.x < 0.5 ? EXITS[0] : EXITS[1];
      p.x = Math.max(ex[0] + 0.012, Math.min(ex[1] - 0.012, p.x));
    } else {
      p.x = Math.max(0.025, Math.min(0.975, p.x));
      if (Math.abs(p.x - 0.5) < 0.35 && p.y > HEATER.top - 0.02 && p.y < HEATER.bot) p.y = HEATER.top - 0.02;
    }
  }

  const scene = {
    stages: [
      { name: "웨이퍼 넣기", duration: 7, still: 3.2 },
      { name: "온도·압력·유량 안정화", duration: 5, still: 2.6 },
      { name: "플라즈마 켜고 증착", duration: 6, still: 4.2 },
      { name: "플라즈마 끄고 퍼지", duration: 5, still: 1.6 },
      { name: "펌핑", duration: 4, still: 1.4 },
      { name: "웨이퍼 꺼내기", duration: 7, still: 4.0 },
      { name: "챔버 세정 (RPS · NF₃)", duration: 6, still: 3.0 },
      { name: "시즈닝", duration: 5, still: 3.6 },
    ],
    stillTime: 12,
    colors: {
      gas: "--sim-gas", radical: "--c-cvd-bright", film: "--c-cvd-bright", wafer: "--sim-wafer",
      coral: "--coral", ink: "--on-navy", soft: "--on-navy-muted", faint: "--on-navy-faint",
      heater: "--mat-panel-warm", byp: "--sim-byproduct", purge: "--sim-purge", clean: "--sim-clean", deposit: "--sim-deposit",
    },

    create(random) {
      return { r: random, ps: [], glow: 0, rpsGlow: 0, t: 0, spawn: 0, idx: -1 };
    },

    update(s, dt, stage) {
      const R = s.r, i = stage.index;
      s.t += dt;
      const m = machine(i, stage.progress);
      s.glow += ((m.rf ? 1 : 0) - s.glow) * Math.min(1, dt * 2.4);
      s.rpsGlow += ((m.rps ? 1 : 0) - s.rpsGlow) * Math.min(1, dt * 2.4);
      if (s.idx !== i) {
        // 단계가 바뀌면: 웨이퍼 넣기·꺼내기 때는 챔버 안 입자를 비움(그 사이 배기된 것으로 봄)
        if (i === 0 || i === 6) s.ps.length = 0;
        // 시즈닝 시작: 세정 때의 불소 라디칼·부산물은 이미 배기된 것으로 봄
        if (i === 7) s.ps = s.ps.filter((p) => p.k !== "f" && p.k !== "byp");
        s.idx = i;
      }

      // ── 새 입자: 위 배관 → 샤워헤드 구멍 (원료 가스 / 퍼지 가스 / 불소 라디칼) ──
      let kind = null, rate = 0;
      if (m.gas) { kind = "gas"; rate = i === 1 ? 11 : 10; }
      if (m.purge) { kind = "purge"; rate = 15; }
      if (m.rps) { kind = "f"; rate = 14; }
      s.spawn += dt * rate;
      while (s.spawn >= 1) {
        s.spawn -= 1;
        if (kind && s.ps.length < MAXP) {
          s.ps.push({ k: kind, x: HOLES[(R() * HOLES.length) | 0] + (R() - 0.5) * 0.01, y: SH.bot + 0.005, vx: 0, vy: 0, age: 0 });
        }
      }

      const speed = i === 4 ? 2.2 : i === 3 ? 1.5 : 1;     // 펌핑·퍼지 때 더 빨리 빠짐
      for (let k = s.ps.length - 1; k >= 0; k--) {
        const p = s.ps[k];
        p.age += dt;
        if (p.k === "rad" || p.k === "f") {
          // 라디칼: 무작위로 퍼짐(확산). 증착 라디칼은 웨이퍼(시즈닝 때는 벽·히터) 쪽으로, 불소는 사방으로
          p.vx += (R() - 0.5) * 2.4 * dt;
          p.vy += ((R() - 0.5) * 2.4 + (p.k === "rad" ? 0.5 : 0.15)) * dt;
          p.vx *= 1 - 2.2 * dt; p.vy *= 1 - 2.2 * dt;
          const f = flow(p);
          p.x += (p.vx + f[0] * 0.3) * dt;
          p.y += (p.vy + f[1] * 0.3) * dt;
          if (p.y < PLASMA.top - 0.01) { p.y = PLASMA.top - 0.01; p.vy = Math.abs(p.vy); }
          const w = m.wafer;
          const onWafer = w && Math.abs(p.x - w.x) < WAFER.half && p.y >= w.bot - WAFER.th - 0.006;
          const onWall = p.x < 0.03 || p.x > 0.97 || (Math.abs(p.x - 0.5) < 0.35 && p.y >= HEATER.top - 0.006) || p.y > 0.98;
          if (onWafer || onWall || p.age > 6) {
            s.ps.splice(k, 1);
            // 불소가 벽의 막과 반응 → 기체 부산물로 빠져나감 / 증착 라디칼은 막이 되면서 수소 같은 조각을 냄
            if (s.ps.length < MAXP && R() < 0.7) s.ps.push({ k: "byp", x: Math.max(0.04, Math.min(0.96, p.x)), y: Math.min(p.y, 0.95) - 0.01, vx: (R() - 0.5) * 0.1, vy: -0.1, age: 0 });
            continue;
          }
          p.x = Math.max(0.02, Math.min(0.98, p.x));
        } else {
          // 원료·퍼지 가스·부산물: 흐름을 따라 배기구로
          const f = flow(p);
          p.vx *= 1 - 2 * dt; p.vy *= 1 - 2 * dt;
          p.x += (p.vx + f[0] * speed + (R() - 0.5) * 0.05) * dt;
          p.y += (p.vy + f[1] * speed) * dt;
          keepInside(p);
          // 플라즈마 속 원료 가스 → 전자 충돌로 쪼개져 라디칼 + 조각
          if (p.k === "gas" && s.glow > 0.3 && p.y > PLASMA.top && p.y < PLASMA.bot && R() < dt * 1.3 * s.glow) {
            p.k = "rad"; p.vx = (R() - 0.5) * 0.3; p.vy = 0; p.age = 0;
            if (s.ps.length < MAXP) s.ps.push({ k: "byp", x: p.x + 0.01, y: p.y, vx: (R() - 0.5) * 0.4, vy: -0.12, age: 0 });
          }
        }
      }
      s.ps = s.ps.filter((p) => p.y < 1.12);
    },

    draw(ctx, s, view) {
      const { w, h, stage, still, colors: C } = view;
      const i = stage.index;
      const m = machine(i, stage.progress);
      const narrow = w < 520;
      const pad = narrow ? 8 : 14;
      const fs = narrow ? 10.5 : 12;

      // ── 배치: 넓으면 오른쪽 상태판, 좁으면 아래 상태판(2열) ──
      const rows = STATUS.length;
      const panelW = narrow ? w - pad * 2 : Math.min(185, Math.max(145, w * 0.27));
      const rowH = narrow ? 17 : 26;
      const panelH = narrow ? Math.ceil(rows / 2) * rowH + 8 : rows * rowH;
      const availW = narrow ? w - pad * 2 : w - panelW - pad * 3;
      const availH = narrow ? h - panelH - pad * 2 - 6 : h - pad * 2;
      const SPAN_X = 1.32, SPAN_Y = 1.48;          // 그림 전체 폭(블레이드 칸 포함)·높이(RPS~배기)
      const sc = Math.max(40, Math.min(availW / SPAN_X, availH / SPAN_Y));
      const ox = pad + 0.27 * sc + Math.max(0, (availW - SPAN_X * sc) / 2);
      const oy = pad + 0.34 * sc + (narrow ? 0 : Math.max(0, (availH - SPAN_Y * sc) / 2));
      const X = (u) => ox + u * sc, Y = (v) => oy + v * sc;
      const lineW = narrow ? 1 : 1.2;
      const unit = sc / 340;

      // ── 챔버 안쪽 바탕 ──
      ctx.fillStyle = "rgba(6, 10, 24, 0.42)";
      ctx.fillRect(X(0), Y(-0.02), sc, 1.02 * sc);

      // 플라즈마 빛 (배경 분위기: 코랄 빛 번짐)
      if (s.glow > 0.02) {
        const flick = still ? 1 : 0.92 + 0.08 * Math.sin(s.t * 7.3) * Math.sin(s.t * 3.1);
        ctx.save();
        ctx.translate(X(0.5), Y((PLASMA.top + PLASMA.bot) / 2));
        ctx.scale(1, 0.6);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.5 * sc);
        g.addColorStop(0, rgba(C.coral, 0.42 * s.glow * flick));
        g.addColorStop(0.55, rgba(C.coral, 0.2 * s.glow * flick));
        g.addColorStop(1, rgba(C.coral, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-0.5 * sc, -0.5 * sc, sc, sc);
        ctx.restore();
      }

      // ── 벽에 쌓인 막(회갈색) / 시즈닝 막(옅은 청록): 안쪽 벽·샤워헤드 아래·히터 옆면 ──
      const lining = (th, color) => {
        if (th <= 0.0005) return;
        ctx.fillStyle = color;
        const t = th * sc;
        ctx.fillRect(X(0), Y(0), t, (SLIT.top - 0) * sc);                     // 왼쪽 벽 (슬릿 위)
        ctx.fillRect(X(0), Y(SLIT.bot), t, (1 - SLIT.bot) * sc);              // 왼쪽 벽 (슬릿 아래)
        ctx.fillRect(X(1) - t, Y(0), t, sc);                                  // 오른쪽 벽
        ctx.fillRect(X(SH.x0), Y(SH.bot), (SH.x1 - SH.x0) * sc, t);           // 샤워헤드 아랫면
        ctx.fillRect(X(HEATER.x0) - t, Y(HEATER.top), t, (HEATER.bot - HEATER.top) * sc);   // 히터 옆면
        ctx.fillRect(X(HEATER.x1), Y(HEATER.top), t, (HEATER.bot - HEATER.top) * sc);
      };
      lining(m.dep * 0.034, rgba(C.deposit, 0.9));
      lining(m.season * 0.012, rgba(C.radical, 0.55));

      // ── 챔버 벽 (왼쪽 벽엔 슬릿, 아래 양쪽은 배기구) ──
      ctx.strokeStyle = rgba(C.ink, 0.38);
      ctx.lineWidth = lineW;
      ctx.beginPath();
      ctx.moveTo(X(EXITS[0][0]), Y(1)); ctx.lineTo(X(0), Y(1)); ctx.lineTo(X(0), Y(SLIT.bot));
      ctx.moveTo(X(0), Y(SLIT.top)); ctx.lineTo(X(0), Y(-0.02));
      ctx.lineTo(X(0.47), Y(-0.02)); ctx.moveTo(X(0.53), Y(-0.02));
      ctx.lineTo(X(1), Y(-0.02)); ctx.lineTo(X(1), Y(1)); ctx.lineTo(X(EXITS[1][1]), Y(1));
      ctx.moveTo(X(EXITS[0][1]), Y(1)); ctx.lineTo(X(STEM.x0), Y(1));
      ctx.moveTo(X(STEM.x1), Y(1)); ctx.lineTo(X(EXITS[1][0]), Y(1));
      for (const [a, b] of EXITS) { ctx.moveTo(X(a), Y(1)); ctx.lineTo(X(a), Y(1.1)); ctx.moveTo(X(b), Y(1)); ctx.lineTo(X(b), Y(1.1)); }
      // 원료 가스 배관 (위)
      ctx.moveTo(X(0.47), Y(-0.2)); ctx.lineTo(X(0.47), Y(-0.02));
      ctx.moveTo(X(0.53), Y(-0.2)); ctx.lineTo(X(0.53), Y(-0.02));
      ctx.stroke();

      // 슬릿 밸브 문: 닫히면 벽 구멍을 막고, 열리면 아래로 내려감
      const doorH = (SLIT.bot - SLIT.top) * sc;
      ctx.fillStyle = rgba(C.ink, 0.5);
      ctx.fillRect(X(-0.035), Y(SLIT.top) + doorH * m.slit, 0.03 * sc, doorH);
      if (m.slit > 0.02) {
        ctx.strokeStyle = rgba(C.radical, 0.8);
        ctx.lineWidth = narrow ? 1.2 : 1.5;
        ctx.strokeRect(X(-0.04), Y(SLIT.top) - 2, 0.04 * sc, doorH + 4);
      }

      // RPS 상자 (챔버 위 왼쪽) → 가스 배관에 합류. 세정 때만 안이 빛남(원격 플라즈마)
      const rx0 = X(0.1), ry0 = Y(-0.32), rw = 0.22 * sc, rh = 0.11 * sc;
      if (s.rpsGlow > 0.02) {
        const g = ctx.createRadialGradient(rx0 + rw / 2, ry0 + rh / 2, 0, rx0 + rw / 2, ry0 + rh / 2, rw * 0.7);
        g.addColorStop(0, rgba(C.coral, 0.5 * s.rpsGlow));
        g.addColorStop(1, rgba(C.coral, 0));
        ctx.fillStyle = g;
        ctx.fillRect(rx0 - rw * 0.2, ry0 - rh * 0.4, rw * 1.4, rh * 1.8);
      }
      ctx.strokeStyle = m.rps ? C.clean : rgba(C.ink, 0.38);
      ctx.lineWidth = m.rps ? (narrow ? 1.4 : 1.7) : lineW;
      ctx.strokeRect(rx0, ry0, rw, rh);
      ctx.beginPath();
      ctx.moveTo(rx0 + rw, ry0 + rh / 2); ctx.lineTo(X(0.47), ry0 + rh / 2);
      ctx.stroke();
      if (m.rps && !still) {
        // 불소 라디칼이 배관을 따라 내려가는 점선
        ctx.save();
        ctx.setLineDash([3, 6]);
        ctx.lineDashOffset = -s.t * 30;
        ctx.strokeStyle = C.clean;
        ctx.beginPath(); ctx.moveTo(rx0 + rw, ry0 + rh / 2); ctx.lineTo(X(0.5), ry0 + rh / 2); ctx.lineTo(X(0.5), Y(0.03)); ctx.stroke();
        ctx.restore();
      }

      // 샤워헤드 판
      ctx.fillStyle = rgba(C.ink, 0.62);
      ctx.fillRect(X(SH.x0), Y(SH.top), (SH.x1 - SH.x0) * sc, (SH.bot - SH.top) * sc);
      ctx.fillStyle = "rgba(6, 10, 24, 0.9)";
      const holeW = Math.max(1.5, 0.012 * sc);
      for (const hx of HOLES) ctx.fillRect(X(hx) - holeW / 2, Y(SH.top), holeW, (SH.bot - SH.top) * sc);
      ctx.strokeStyle = rgba(C.ink, 0.3);
      ctx.lineWidth = lineW;
      ctx.beginPath();
      ctx.moveTo(X(SH.x0), Y(SH.top)); ctx.lineTo(X(SH.x0), Y(-0.02));
      ctx.moveTo(X(SH.x1), Y(SH.top)); ctx.lineTo(X(SH.x1), Y(-0.02));
      ctx.stroke();
      if (m.rf) {   // RF가 걸린 동안 샤워헤드 위 전극 표시 (공정 색 선)
        ctx.strokeStyle = C.radical;
        ctx.lineWidth = narrow ? 1.2 : 1.5;
        ctx.strokeRect(X(SH.x0) - 2, Y(SH.top) - 2, (SH.x1 - SH.x0) * sc + 4, (SH.bot - SH.top) * sc + 4);
      }

      // 리프트 핀 (히터를 뚫고 위아래로)
      const pinTop = lerp(HEATER.top, PIN_UP, m.pins);
      ctx.fillStyle = rgba(C.ink, 0.7);
      const pinW = Math.max(2, 0.014 * sc);
      for (const px of PINS) ctx.fillRect(X(px) - pinW / 2, Y(pinTop), pinW, (HEATER.bot - pinTop) * sc);

      // 히터 + 기둥 (안정화 단계에는 웨이퍼를 데우는 중이라 윗면이 살짝 밝게)
      const warm = i === 1 ? 0.5 + 0.2 * Math.sin(s.t * 3) : 0.5;
      ctx.fillStyle = rgba(C.heater, warm);
      ctx.fillRect(X(HEATER.x0), Y(HEATER.top), (HEATER.x1 - HEATER.x0) * sc, (HEATER.bot - HEATER.top) * sc);
      ctx.fillRect(X(STEM.x0), Y(HEATER.bot), (STEM.x1 - STEM.x0) * sc, (1.05 - HEATER.bot) * sc);
      // 핀 구멍 (히터 위로 핀이 보이도록 히터 위에 한 번 더)
      ctx.fillStyle = rgba(C.ink, 0.7);
      for (const px of PINS) if (pinTop < HEATER.top - 0.002) ctx.fillRect(X(px) - pinW / 2, Y(pinTop), pinW, (HEATER.top - pinTop) * sc);
      if (i === 1) {   // 열이 웨이퍼로 올라가는 작은 물결
        ctx.strokeStyle = rgba(C.heater, 0.75);
        ctx.lineWidth = 1;
        for (let k = 0; k < 5; k++) {
          const bx = X(0.25 + k * 0.125), off = still ? 0.5 : (s.t * 0.6 + k * 0.2) % 1;
          ctx.beginPath();
          for (let j = 0; j <= 8; j++) {
            const yy = Y(HEATER.bot - 0.02 - (0.1 * j) / 8), xx = bx + Math.sin(j * 1.2 + off * 6.28) * 0.008 * sc;
            j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
          }
          ctx.stroke();
        }
      }

      // 로봇 블레이드 + 팔 (슬릿 밖 = 트랜스퍼 모듈 쪽에서 들어옴)
      if (m.blade > 0.001) {
        const bx = lerp(-0.5, 0.5, m.blade);
        ctx.fillStyle = rgba(C.ink, 0.8);
        ctx.fillRect(X(bx - BLADE.half), Y(BLADE.top), BLADE.half * 2 * sc, BLADE.th * sc);
        ctx.fillRect(X(-0.6), Y(BLADE.top) + 1, (bx - BLADE.half + 0.6) * sc, BLADE.th * sc * 0.6);
      }

      // 웨이퍼 + 쌓인 막
      if (m.wafer) {
        const wx0 = X(m.wafer.x - WAFER.half), ww = WAFER.half * 2 * sc;
        const wt = Y(m.wafer.bot - WAFER.th);
        ctx.fillStyle = C.wafer;
        ctx.fillRect(wx0, wt, ww, WAFER.th * sc);
        if (m.film > 0.01) {
          const ft = m.film * 0.022 * sc;
          ctx.fillStyle = rgba(C.film, 0.9);
          ctx.fillRect(wx0, wt - ft, ww, ft);
        }
      }

      // ── 입자 ──
      const rGas = Math.max(2.4, 4 * unit);
      for (const p of s.ps) {
        const x = X(p.x), y = Y(p.y);
        if (p.k === "gas") {
          ctx.fillStyle = rgba(C.gas, 0.9);
          ctx.beginPath(); ctx.arc(x, y, rGas, 0, 6.283); ctx.fill();
          for (let k = 0; k < 4; k++) {
            const a = k * 1.571 + p.age;
            ctx.beginPath(); ctx.arc(x + Math.cos(a) * rGas * 1.25, y + Math.sin(a) * rGas * 1.25, rGas * 0.42, 0, 6.283); ctx.fill();
          }
        } else if (p.k === "purge") {
          ctx.fillStyle = rgba(C.purge, 0.9);
          ctx.beginPath(); ctx.arc(x - rGas * 0.55, y, rGas * 0.7, 0, 6.283); ctx.arc(x + rGas * 0.55, y, rGas * 0.7, 0, 6.283); ctx.fill();
        } else if (p.k === "rad") {
          ctx.fillStyle = C.radical;
          ctx.beginPath(); ctx.arc(x, y, rGas * 0.85, 0, 6.283); ctx.fill();
          ctx.strokeStyle = rgba(C.radical, 0.45); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, rGas * 1.7, 0, 6.283); ctx.stroke();
        } else if (p.k === "f") {
          ctx.fillStyle = C.clean;
          ctx.beginPath(); ctx.arc(x, y, rGas * 0.8, 0, 6.283); ctx.fill();
          ctx.strokeStyle = rgba(C.clean, 0.45); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, rGas * 1.6, 0, 6.283); ctx.stroke();
        } else {
          ctx.fillStyle = rgba(C.byp, 0.95);
          ctx.beginPath(); ctx.arc(x, y, Math.max(1.4, 2 * unit), 0, 6.283); ctx.fill();
        }
      }

      // 펌핑·퍼지 때 배기 흐름 화살표 (점선이 흐름 방향으로 움직임)
      if (i === 3 || i === 4) {
        ctx.strokeStyle = C.radical;
        ctx.lineWidth = narrow ? 1.3 : 1.6;
        ctx.setLineDash([5, 6]);
        ctx.lineDashOffset = still ? 0 : -s.t * (i === 4 ? 40 : 26);
        for (const side of [-1, 1]) {
          const xe = side < 0 ? 0.07 : 0.93;
          ctx.beginPath();
          ctx.moveTo(X(0.5 + side * 0.2), Y(0.68)); ctx.lineTo(X(side < 0 ? 0.12 : 0.88), Y(0.68));
          ctx.quadraticCurveTo(X(xe), Y(0.7), X(xe), Y(0.82)); ctx.lineTo(X(xe), Y(1.08));
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // ── 작은 이름표 (그림 안) ──
      ctx.font = `500 ${fs}px Pretendard, -apple-system, sans-serif`;
      ctx.textBaseline = "middle";
      const tag = (t, x, y, align, on) => {
        ctx.textAlign = align;
        ctx.lineWidth = 3; ctx.strokeStyle = "rgba(10, 17, 34, 0.85)"; ctx.strokeText(t, x, y);
        ctx.fillStyle = on ? C.ink : C.soft; ctx.fillText(t, x, y);
      };
      tag("RPS", rx0 + rw / 2, ry0 + rh / 2, "center", m.rps);
      tag("가스", X(0.56), Y(-0.16), "left", m.gas || m.purge);
      tag("샤워헤드", X(SH.x1) - 2, Y(SH.bot + 0.045), "right", i === 1 || i === 2);
      tag("슬릿 밸브", X(-0.05), Y(SLIT.top - 0.05), "right", i === 0 || i === 5);
      tag("리프트 핀", X(PINS[1]) + 6, Y(HEATER.top - 0.035), "left", i === 0 || i === 5);
      tag("히터", X(0.5), Y((HEATER.top + HEATER.bot) / 2 + 0.01), "center", i === 1);
      tag("배기 → 펌프", X(1) + 4, Y(1.06), "left", i === 3 || i === 4);
      if (m.dep > 0.05 && (i === 6 || i === 2)) tag("벽에 쌓인 막", X(0.03) + 4, Y(0.3), "left", i === 6);
      if (m.season > 0.3) tag("시즈닝 막", X(0.03) + 4, Y(0.3), "left", true);
      ctx.textAlign = "start";

      // ── 상태판: 이 단계에서 켜진 것(청록 점) / 꺼진 것(빈 점) ──
      const px0 = narrow ? pad : w - pad - panelW;
      const py0 = narrow ? h - pad - panelH + 4 : Math.max(pad, (h - panelH) / 2);
      if (!narrow) {
        ctx.font = `600 ${fs - 1}px "IBM Plex Mono", monospace`;
        ctx.fillStyle = C.faint;
        ctx.fillText("RECIPE STATUS", px0, py0 - 14);
      } else {
        ctx.strokeStyle = rgba(C.ink, 0.14);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px0, py0 - 6); ctx.lineTo(px0 + panelW, py0 - 6); ctx.stroke();
      }
      STATUS.forEach((row, k) => {
        const col = narrow ? k % 2 : 0, line = narrow ? (k / 2) | 0 : k;
        const cw = narrow ? panelW / 2 : panelW;
        const x = px0 + col * cw, y = py0 + line * rowH + rowH / 2;
        const v = row.val(m);
        const r = narrow ? 3.2 : 4;
        ctx.font = `500 ${fs}px Pretendard, -apple-system, sans-serif`;
        if (row.bar) {
          // 압력: 막대(목표 위치에 눈금). 숫자 없음
          ctx.fillStyle = C.soft;
          ctx.fillText(row.name, x, y);
          const bx = x + (narrow ? 34 : 50), bw = cw - (narrow ? 44 : 56), bh = narrow ? 4 : 5;
          ctx.fillStyle = rgba(C.ink, 0.14);
          ctx.fillRect(bx, y - bh / 2, bw, bh);
          ctx.fillStyle = C.radical;
          ctx.fillRect(bx, y - bh / 2, bw * clamp01(m.pr), bh);
          ctx.fillStyle = C.ink;
          ctx.fillRect(bx + bw * 0.6 - 0.5, y - bh - 1, 1.2, bh * 2 + 2);
          return;
        }
        ctx.beginPath(); ctx.arc(x + r, y, r, 0, 6.283);
        if (v.on) { ctx.fillStyle = C.radical; ctx.fill(); } else { ctx.strokeStyle = rgba(C.ink, 0.35); ctx.lineWidth = 1; ctx.stroke(); }
        ctx.fillStyle = v.on ? C.ink : C.soft;
        ctx.fillText(row.name, x + r * 2 + 6, y);
        ctx.textAlign = "right";
        ctx.fillStyle = v.on ? C.ink : C.faint;
        ctx.font = `${v.on ? 700 : 500} ${fs}px Pretendard, -apple-system, sans-serif`;
        ctx.fillText(v.t, x + cw - (narrow ? 8 : 0), y);
        ctx.textAlign = "start";
      });
    },
  };

  // 상태판 줄: 이름 + (단계 상태 → 글자, 켜짐 여부)
  const STATUS = [
    { name: "슬릿 밸브", val: (m) => ({ t: m.slit > 0.5 ? "열림" : "닫힘", on: m.slit > 0.5 }) },
    { name: "리프트 핀", val: (m) => ({ t: m.pins > 0.5 ? "올림" : "내림", on: m.pins > 0.5 }) },
    { name: "웨이퍼 온도", val: (m) => ({ t: m.temp, on: m.temp === "맞추는 중" }) },
    { name: "원료 가스", val: (m) => ({ t: m.gas ? "흐름" : "멈춤", on: m.gas }) },
    { name: "RF 플라즈마", val: (m) => ({ t: m.rf ? "켜짐" : "꺼짐", on: m.rf }) },
    { name: "퍼지 가스", val: (m) => ({ t: m.purge ? "흐름" : "멈춤", on: m.purge }) },
    { name: "RPS 세정", val: (m) => ({ t: m.rps ? "켜짐" : "꺼짐", on: m.rps }) },
    { name: "압력", bar: true, val: () => ({}) },
  ];

  ProcessSim.register("pecvd-recipe", scene);
})();
