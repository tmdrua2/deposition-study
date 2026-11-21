// =============================================================
// PVD (마그네트론 스퍼터링) 챔버 단면도
// 지금은 4단계: "정지 단면도"만 그립니다. 움직임(update)은 승인 후 5단계에서 추가.
//
// 좌표 약속: 챔버 안쪽 공간을 가로 0~1, 세로 0~1로 놓고 그립니다.
//   (0,0) = 챔버 안쪽 왼쪽 위, (1,1) = 오른쪽 아래. 바깥 부품은 0보다 작거나 1보다 큰 값.
// 그림에 담은 원리
//   - 자석 → 타깃 앞 아치 모양 자기장선 → 그 아래가 레이스트랙(침식 홈)
//   - 타깃 바로 앞의 얇은 시스(암흑부)에서 Ar⁺ 이온이 타깃 쪽으로 가속
//   - 충돌 때 나온 2차 전자가 자기장선에 감겨 갇힘 → Ar을 이온화 → 플라즈마 유지
//   - 튀어나온 타깃 원자(중성)는 여러 각도로 퍼짐 → 웨이퍼뿐 아니라 실드·벽에도 쌓임
//   - 저압이라 대부분 직진, 일부는 Ar과 부딪혀 꺾임
// 개념도라서 크기·개수·속도는 실제 비율이 아닙니다.
// =============================================================
(function () {
  "use strict";

  // ---------- 치수 (챔버 안쪽 기준 비율) ----------
  const ASPECT = 1.3;                 // 챔버 안쪽 가로:세로
  const TARGET = { x0: 0.24, x1: 0.76, top: 0, face: 0.05 };
  const RACE = [0.39, 0.61];          // 레이스트랙 중심 (바깥 자석과 가운데 자석의 중간)
  const ARCH_A = 0.11;                // 자기장선 아치의 가로 반지름
  const ARCH_Y = -0.04;               // 자석 아랫면 높이 (아치의 중심)
  const ARCH_B = [0.075, 0.105, 0.135]; // 아치 세로 반지름 (안쪽 → 바깥쪽 선)
  const SHEATH = 0.022;               // 시스 두께
  const SHIELD_X = [0.05, 0.95];      // 실드 안쪽 면
  const SHIELD_TOP = 0.06;
  const LIP_Y = 0.80;                 // 실드 아래 턱 높이
  const WAFER = { x0: 0.28, x1: 0.72, top: 0.787, bottom: 0.80 };
  const CHUCK = { x0: 0.26, x1: 0.74, top: 0.80, bottom: 0.92 };
  const EROSION = 0.018;              // 침식 홈 깊이 (정지 화면 기준)

  // 타깃 아랫면 높이: 레이스트랙 아래가 더 많이 깎여 위로 패여 있음
  function faceY(x) {
    let dip = 0;
    for (const c of RACE) dip += EROSION * Math.exp(-Math.pow((x - c) / 0.035, 2));
    return TARGET.face - dip;
  }

  // "#RRGGBB" 색을 투명도 있는 색으로
  function alpha(hex, a) {
    const n = parseInt(hex.replace("#", ""), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  // ---------- 화면에 챔버를 어디에, 얼마나 크게 놓을지 ----------
  function layout(w, h) {
    const wide = w >= 860;
    const labels = w >= 700;
    // 챔버와 바깥 부품을 합친 범위 (비율 단위)
    const EXT = { left: 0.15, right: 0.06, top: 0.22, bottom: 0.18 };
    let box;
    if (wide) box = { l: w * 0.40, r: w - (labels ? 190 : 40), t: 32, b: h - 84 };
    else box = { l: labels ? 130 : 16, r: w - (labels ? 170 : 16), t: h * 0.36, b: h - 130 }; // 좁은 화면: 범례가 두 줄이라 아래 여백을 더 둠

    const spanX = 1 + EXT.left + EXT.right;              // 가로 범위 (W 단위)
    const spanY = (1 + EXT.top + EXT.bottom) / ASPECT;   // 세로 범위 (W 단위)
    const W = Math.max(120, Math.min((box.r - box.l) / spanX, (box.b - box.t) / spanY));
    const H = W / ASPECT;
    const ox = box.l + ((box.r - box.l) - spanX * W) / 2 + EXT.left * W;
    const oy = box.t + ((box.b - box.t) - spanY * W) / 2 + EXT.top * H;
    return { W, H, ox, oy, labels, k: 1, X: (x) => ox + x * W, Y: (y) => oy + y * H };
  }

  // ---------- 처음 상태: 정지 화면에 놓을 입자 위치 ----------
  function create(random) {
    const gauss = () => (random() + random() + random() - 1.5) / 1.5;
    const ar = [];
    while (ar.length < 56) {
      const x = 0.08 + random() * 0.84, y = 0.1 + random() * 0.64;
      ar.push({ x, y });
    }
    const ions = [];
    for (let i = 0; i < 14; i++) {
      const c = RACE[i % 2];
      ions.push({ x: c + gauss() * 0.06, y: 0.09 + random() * 0.12 });
    }
    return { ar, ions };
  }

  // ---------- 그리기 도구 ----------
  // 빗금 친 단면 (도면에서 잘린 벽을 표시하는 방식)
  function hatchRect(ctx, x, y, w, h, c) {
    ctx.save();
    ctx.fillStyle = c.bg;
    ctx.fillRect(x, y, w, h);
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let d = -h; d < w + h; d += 6) {
      ctx.moveTo(x + d, y + h);
      ctx.lineTo(x + d + h, y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = c.lineStrong;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function dot(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function arrowHead(ctx, x, y, angle, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.55);
    ctx.lineTo(-size, size * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 튀어나온 원자가 어디에 부딪히는지 화면 좌표로 한 걸음씩 따라가며 찾음
  function trace(g, x, y, angleDeg, stopY) {
    const a = angleDeg * Math.PI / 180;
    const dx = Math.sin(a), dy = Math.cos(a);
    const { X, Y } = g;
    const filmTop = Y(WAFER.top) - 2.5;
    for (let i = 0; i < 4000; i++) {
      x += dx * 2; y += dy * 2;
      if (stopY !== undefined && y >= stopY) return { x, y, hit: "gas" };
      if (y >= filmTop && x >= X(WAFER.x0) && x <= X(WAFER.x1)) return { x, y: filmTop, hit: "wafer" };
      if (y >= Y(CHUCK.top) && x >= X(CHUCK.x0) && x <= X(CHUCK.x1)) return { x, y: Y(CHUCK.top), hit: "chuck" };
      if (y >= Y(LIP_Y) - 1.5) return { x, y: Y(LIP_Y) - 1.5, hit: "lip" };
      if (x <= X(SHIELD_X[0]) + 3) return { x: X(SHIELD_X[0]) + 3, y, hit: "shield" };
      if (x >= X(SHIELD_X[1]) - 3) return { x: X(SHIELD_X[1]) - 3, y, hit: "shield" };
    }
    return { x, y, hit: "none" };
  }

  // ---------- 장면 그리기 ----------
  // g = 좌표 변환(layout 결과). 확대도도 같은 함수를 배율(g.k)만 바꿔서 다시 부름
  function drawScene(ctx, state, g, c, w, h, labelsOn) {
    const { X, Y, W } = g;
    const T = Math.max(6, 0.022 * W);   // 벽 두께(px)
    const L = X(0), R = X(1), TOP = Y(0), BOT = Y(1);

    // 1) 아주 옅은 모눈 (도면 느낌)
    ctx.save();
    ctx.strokeStyle = c.line;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = (X(0) % 32) + 0.5; x < w; x += 32) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = (Y(0) % 32) + 0.5; y < h; y += 32) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    ctx.restore();

    // 2) 플라즈마: 타깃 앞 전체에 옅게 + 레이스트랙 아래에 더 진하게
    ctx.save();
    const pg = ctx.createLinearGradient(0, Y(TARGET.face), 0, Y(0.3));
    pg.addColorStop(0, alpha(c.accent, 0.10));
    pg.addColorStop(1, alpha(c.accent, 0));
    ctx.fillStyle = pg;
    ctx.fillRect(X(TARGET.x0), Y(TARGET.face), X(TARGET.x1) - X(TARGET.x0), Y(0.3) - Y(TARGET.face));
    for (const cx of RACE) {
      ctx.save();
      ctx.translate(X(cx), Y(0.1));
      ctx.scale(1, 0.55);
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.11 * W);
      rg.addColorStop(0, alpha(c.accent, 0.30));
      rg.addColorStop(1, alpha(c.accent, 0));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, 0.11 * W, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 3) 시스(암흑부): 타깃 아랫면을 따라 얇고 어두운 띠 — 플라즈마 빛이 거의 없음
    ctx.beginPath();
    for (let x = TARGET.x0; x <= TARGET.x1 + 1e-9; x += 0.005) ctx.lineTo(X(x), Y(faceY(x)));
    for (let x = TARGET.x1; x >= TARGET.x0 - 1e-9; x -= 0.005) ctx.lineTo(X(x), Y(faceY(x) + SHEATH));
    ctx.closePath();
    ctx.fillStyle = c.sheath;
    ctx.fill();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = alpha(c.accent, 0.55);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let x = TARGET.x0; x <= TARGET.x1 + 1e-9; x += 0.005) ctx.lineTo(X(x), Y(faceY(x) + SHEATH));
    ctx.stroke();
    ctx.setLineDash([]);

    // 4) 챔버 벽 (빗금 단면). 뚜껑 가운데는 음극이 들어가는 자리
    hatchRect(ctx, L - T, TOP - T, T, BOT - TOP + 2 * T, c);              // 왼쪽 벽
    hatchRect(ctx, R, TOP - T, T, BOT - TOP + 2 * T, c);                  // 오른쪽 벽
    hatchRect(ctx, L, TOP - T, X(0.20) - L, T, c);                        // 뚜껑 왼쪽
    hatchRect(ctx, X(0.80), TOP - T, R - X(0.80), T, c);                  // 뚜껑 오른쪽
    hatchRect(ctx, L, BOT, X(0.46) - L, T, c);                            // 바닥 (받침대 축 왼쪽)
    hatchRect(ctx, X(0.54), BOT, X(0.80) - X(0.54), T, c);                // 바닥 (축 ~ 펌프)
    hatchRect(ctx, X(0.92), BOT, R - X(0.92), T, c);                      // 바닥 (펌프 오른쪽)
    // 절연체: 음극(−)과 접지된 뚜껑 사이를 전기적으로 떼어 놓는 부품
    ctx.fillStyle = c.muted;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(X(0.20), TOP - T, X(0.22) - X(0.20), T);
    ctx.fillRect(X(0.78), TOP - T, X(0.80) - X(0.78), T);
    ctx.globalAlpha = 1;

    // 5) 음극 뭉치: 하우징 + 요크(철판) + 자석 3개 + 냉각판 + 타깃
    const housingTop = Y(-0.17);
    ctx.strokeStyle = c.lineStrong;
    ctx.lineWidth = 1;
    ctx.strokeRect(X(0.22) + 0.5, housingTop + 0.5, X(0.78) - X(0.22) - 1, TOP - T - housingTop);
    ctx.fillStyle = c.line;
    ctx.fillRect(X(0.24), Y(-0.165), X(0.76) - X(0.24), Y(-0.14) - Y(-0.165)); // 요크
    const magnets = [[0.25, 0.31, "N"], [0.47, 0.53, "S"], [0.69, 0.75, "N"]];
    ctx.font = `600 ${Math.max(10, Math.round(W * 0.022))}px Pretendard, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const [a, b, pole] of magnets) {
      const mx = X(a), mw = X(b) - X(a), my = Y(-0.14), mh = Y(ARCH_Y) - Y(-0.14);
      ctx.fillStyle = c.bg;
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeStyle = c.lineStrong;
      ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
      ctx.fillStyle = c.text;
      ctx.fillText(pole, mx + mw / 2, my + mh * 0.68);  // 타깃 쪽을 향한 극
    }
    // 냉각판 (타깃 뒤에서 열을 빼 줌)
    ctx.fillStyle = c.bg;
    ctx.fillRect(X(0.235), Y(ARCH_Y), X(0.765) - X(0.235), TOP - Y(ARCH_Y));
    ctx.strokeStyle = c.lineStrong;
    ctx.strokeRect(X(0.235) + 0.5, Y(ARCH_Y) + 0.5, X(0.765) - X(0.235) - 1, TOP - Y(ARCH_Y) - 1);
    // 타깃: 아랫면이 레이스트랙 자리에서 패여 있음
    ctx.beginPath();
    ctx.moveTo(X(TARGET.x0), TOP);
    ctx.lineTo(X(TARGET.x1), TOP);
    for (let x = TARGET.x1; x >= TARGET.x0 - 1e-9; x -= 0.004) ctx.lineTo(X(x), Y(faceY(x)));
    ctx.closePath();
    ctx.fillStyle = alpha(c.metal, 0.38);
    ctx.fill();
    ctx.strokeStyle = c.metal;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 타깃 옆 접지 실드 (타깃 옆면에서 방전이 생기지 않게 막는 덮개)
    ctx.strokeStyle = c.lineStrong;
    ctx.lineWidth = 1.5;
    for (const [sx, lip] of [[0.226, 0.238], [0.774, 0.762]]) {
      ctx.beginPath();
      ctx.moveTo(X(sx), TOP);
      ctx.lineTo(X(sx), Y(0.068));
      ctx.lineTo(X(lip), Y(0.068));
      ctx.stroke();
    }

    // 6) 자기장선: 바깥 자석(N)에서 나와 타깃 앞으로 아치를 그리고 가운데 자석(S)으로 들어감
    ctx.save();
    ctx.strokeStyle = c.lineStrong;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 0.9;
    ctx.setLineDash([4, 3]);
    for (const cx of RACE) {
      for (const b of ARCH_B) {
        ctx.beginPath();
        for (let t = 0; t <= Math.PI + 1e-9; t += Math.PI / 60) {
          ctx.lineTo(X(cx + ARCH_A * Math.cos(t)), Y(ARCH_Y + b * Math.sin(t)));
        }
        ctx.stroke();
      }
    }
    ctx.restore();
    // 방향 표시 화살표 (N → S): 바깥쪽 아치 꼭대기에서 가운데 쪽을 향함
    for (const cx of RACE) {
      const dir = cx < 0.5 ? 0 : Math.PI;
      arrowHead(ctx, X(cx) + (cx < 0.5 ? 4 : -4), Y(ARCH_Y + ARCH_B[2]), dir, 5, c.lineStrong);
    }

    // 7) 실드: 벽을 가리는 교체용 덮개 (L자 모양)
    ctx.strokeStyle = c.lineStrong;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(SHIELD_X[0]), Y(SHIELD_TOP)); ctx.lineTo(X(SHIELD_X[0]), Y(LIP_Y)); ctx.lineTo(X(0.22), Y(LIP_Y));
    ctx.moveTo(X(SHIELD_X[1]), Y(SHIELD_TOP)); ctx.lineTo(X(SHIELD_X[1]), Y(LIP_Y)); ctx.lineTo(X(0.78), Y(LIP_Y));
    ctx.stroke();
    // 실드·벽에 쌓인 막: 타깃에 가까운 위쪽이 더 두꺼움
    ctx.fillStyle = c.metal;
    for (const side of [0, 1]) {
      const sx = X(SHIELD_X[side]), s = side === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(sx + s * 1, Y(SHIELD_TOP));
      for (let y = SHIELD_TOP; y <= LIP_Y; y += 0.02) {
        const th = 0.8 + 2.6 * (1 - (y - SHIELD_TOP) / (LIP_Y - SHIELD_TOP));
        ctx.lineTo(sx + s * (1 + th), Y(y));
      }
      ctx.lineTo(sx + s * 1, Y(LIP_Y));
      ctx.closePath();
      ctx.fill();
      // 실드 턱 윗면
      const lx0 = side === 0 ? X(SHIELD_X[0]) : X(0.78), lx1 = side === 0 ? X(0.22) : X(SHIELD_X[1]);
      ctx.fillRect(lx0, Y(LIP_Y) - 2.4, lx1 - lx0, 1.4);
      // 뚜껑 아랫면 (실드 위 틈으로 들어간 원자가 벽에 쌓인 것)
      const wx0 = side === 0 ? X(SHIELD_X[0]) : X(0.78), wx1 = side === 0 ? X(0.22) : X(SHIELD_X[1]);
      ctx.fillRect(wx0, TOP, wx1 - wx0, 1.4);
    }

    // 8) 척(받침)과 웨이퍼, 웨이퍼 위에 쌓이는 막
    hatchRect(ctx, X(CHUCK.x0), Y(CHUCK.top), X(CHUCK.x1) - X(CHUCK.x0), Y(CHUCK.bottom) - Y(CHUCK.top), c);
    hatchRect(ctx, X(0.46), Y(CHUCK.bottom), X(0.54) - X(0.46), Y(1.1) - Y(CHUCK.bottom), c);
    ctx.fillStyle = alpha(c.lineStrong, 0.75);
    ctx.fillRect(X(WAFER.x0), Y(WAFER.top), X(WAFER.x1) - X(WAFER.x0), Y(WAFER.bottom) - Y(WAFER.top));
    ctx.fillStyle = c.metal;
    ctx.fillRect(X(WAFER.x0), Y(WAFER.top) - 2.5, X(WAFER.x1) - X(WAFER.x0), 2.5);

    // 9) Ar 가스 주입관 (왼쪽 벽) + 밸브
    const gy = Y(0.42), gh = Math.max(4, 0.016 * g.H);
    ctx.fillStyle = c.bg;
    ctx.fillRect(L - T - 1, gy - gh, T + 2, gh * 2);  // 벽에 구멍
    ctx.strokeStyle = c.lineStrong;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(-0.14), gy - gh); ctx.lineTo(L, gy - gh);
    ctx.moveTo(X(-0.14), gy + gh); ctx.lineTo(L, gy + gh);
    ctx.stroke();
    const vx = X(-0.08), vs = gh * 1.6;               // 밸브 (나비넥타이 모양 기호)
    ctx.fillStyle = c.bg;
    ctx.beginPath();
    ctx.moveTo(vx - vs, gy - vs); ctx.lineTo(vx + vs, gy + vs); ctx.lineTo(vx + vs, gy - vs); ctx.lineTo(vx - vs, gy + vs);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    arrowHead(ctx, L - T - 4, gy, 0, 5, c.muted);

    // 10) 펌프 배기구 (오른쪽 아래)
    ctx.beginPath();
    ctx.moveTo(X(0.80), BOT + T); ctx.lineTo(X(0.80), Y(1.15));
    ctx.moveTo(X(0.92), BOT + T); ctx.lineTo(X(0.92), Y(1.15));
    ctx.stroke();
    arrowHead(ctx, X(0.86), Y(1.12), Math.PI / 2, 6, c.muted);

    // 11) 전원과 접지
    ctx.strokeStyle = c.lineStrong;
    ctx.beginPath();
    ctx.moveTo(X(0.5), housingTop); ctx.lineTo(X(0.5), Y(-0.21));
    ctx.stroke();
    ctx.font = `500 ${Math.max(10, Math.round(W * 0.02))}px Pretendard, sans-serif`;
    ctx.fillStyle = c.muted;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("전원 (−, DC 또는 RF)", X(0.5) + 8, Y(-0.205));
    const gx = L - T / 2, gtop = BOT + T;             // 접지 기호
    ctx.beginPath();
    ctx.moveTo(gx, gtop); ctx.lineTo(gx, gtop + 10);
    ctx.moveTo(gx - 8, gtop + 10); ctx.lineTo(gx + 8, gtop + 10);
    ctx.moveTo(gx - 5, gtop + 14); ctx.lineTo(gx + 5, gtop + 14);
    ctx.moveTo(gx - 2, gtop + 18); ctx.lineTo(gx + 2, gtop + 18);
    ctx.stroke();
    ctx.fillText("접지", gx + 12, gtop + 13);

    // ---------- 입자 ----------
    // 12) Ar 원자 (회색 작은 점)
    for (const p of state.ar) dot(ctx, X(p.x), Y(p.y), 1.6, c.ar);

    // 13) 튀어나온 타깃 원자: 여러 각도로 직진. 끝에 막이 쌓임
    const rays = [
      [RACE[0] - 0.012, -58, 0.55], [RACE[0], -32, 0.42], [RACE[0] + 0.01, -14, 0.7],
      [RACE[0] + 0.015, 22, 0.35], [RACE[0] - 0.005, 50, 0.6],
      [RACE[1] - 0.01, -42, 0.5], [RACE[1], -6, 0.3], [RACE[1] + 0.012, 16, 0.62],
      [RACE[1] + 0.006, 36, 0.45], [RACE[1] + 0.015, 62, 0.4],
    ];
    ctx.lineWidth = 0.9;
    for (const [sx, ang, f] of rays) {
      const x0 = X(sx), y0 = Y(faceY(sx));
      const end = trace(g, x0, y0, ang);
      ctx.strokeStyle = alpha(c.metal, 0.38);
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(end.x, end.y); ctx.stroke();
      ctx.setLineDash([]);
      dot(ctx, x0 + (end.x - x0) * f, y0 + (end.y - y0) * f, 2.3, c.metal);
    }
    // 14) Ar과 부딪혀 경로가 꺾인 원자 (드물게 일어남)
    const sx0 = X(RACE[0] + 0.02), sy0 = Y(faceY(RACE[0] + 0.02));
    const hit = trace(g, sx0, sy0, -14, Y(0.47));
    const after = trace(g, hit.x, hit.y, 32);
    ctx.strokeStyle = alpha(c.metal, 0.6);
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(hit.x, hit.y); ctx.lineTo(after.x, after.y); ctx.stroke();
    ctx.setLineDash([]);
    dot(ctx, hit.x + 5, hit.y + 2, 1.9, c.ar);          // 부딪힌 Ar 원자
    ctx.strokeStyle = c.muted;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(hit.x + 2, hit.y + 1, 8, 0, Math.PI * 2); ctx.stroke();
    dot(ctx, hit.x + (after.x - hit.x) * 0.45, hit.y + (after.y - hit.y) * 0.45, 2.3, c.metal);
    const scatterPoint = { x: hit.x - 6, y: hit.y };
    const scale = g.k;  // 확대도에서는 꼬리·나선 크기도 같이 키움

    // 15) 플라즈마 속 Ar⁺ 이온 (천천히 떠돎)
    for (const p of state.ions) dot(ctx, X(p.x), Y(p.y), 2.4, c.accent);

    // 16) 시스 안의 Ar⁺: 타깃 쪽으로 빠르게 가속 — 뒤에 남는 꼬리가 길수록 빠름
    const sheathIons = [[RACE[0] - 0.025, 0.55, 22], [RACE[0] + 0.012, 0.3, 14], [RACE[1] - 0.014, 0.5, 20], [RACE[1] + 0.03, 0.25, 12]];
    for (let [x, depth, tail] of sheathIons) {
      const px = X(x), py = Y(faceY(x) + SHEATH * depth);
      tail *= scale;
      const tg = ctx.createLinearGradient(px, py + tail, px, py);
      tg.addColorStop(0, alpha(c.accent, 0));
      tg.addColorStop(1, alpha(c.accent, 0.9));
      ctx.strokeStyle = tg;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(px, py + tail); ctx.lineTo(px, py); ctx.stroke();
      dot(ctx, px, py, 2.4, c.accent);
    }

    // 17) 2차 전자: 타깃에서 나와 바깥쪽 자기장선에 감겨 돌며 레이스트랙 근처에 갇힘
    const helixPts = {};
    for (const cx of RACE) {
      const b = ARCH_B[2];
      const pts = [];
      const t0 = Math.PI * 0.3, t1 = Math.PI * 0.7, turns = 9;
      for (let i = 0; i <= 240; i++) {
        const t = t0 + (t1 - t0) * (i / 240);
        const bx = X(cx + ARCH_A * Math.cos(t)), by = Y(ARCH_Y + b * Math.sin(t));
        // 접선에 수직 방향으로 흔들어 나선처럼 보이게
        const tx = -ARCH_A * Math.sin(t) * W, ty = b * Math.cos(t) * g.H;
        const len = Math.hypot(tx, ty) || 1;
        const off = 3.2 * scale * Math.sin((i / 240) * turns * Math.PI * 2);
        pts.push([bx + (-ty / len) * off, by + (tx / len) * off]);
      }
      ctx.strokeStyle = alpha(c.electron, 0.55);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      // 타깃에서 튀어나와 나선으로 들어가는 짧은 경로
      const ex = X(cx + 0.018), ey = Y(faceY(cx + 0.018));
      const [jx, jy] = pts[150];
      ctx.setLineDash([1.5, 2.5]);
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo(ex + 4, (ey + jy) / 2, jx, jy); ctx.stroke();
      ctx.setLineDash([]);
      for (const k of [40, 120, 200]) dot(ctx, pts[k][0], pts[k][1], 1.5, c.electron);
      helixPts[cx] = pts;
    }

    // 18) 이온화: 갇힌 전자가 Ar과 부딪혀 Ar⁺ 하나와 전자 하나를 더 만듦
    const ion = { x: X(RACE[1] + 0.035), y: Y(0.165) };
    ctx.strokeStyle = c.muted;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.arc(ion.x, ion.y, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    dot(ctx, ion.x, ion.y, 2.4, c.accent);
    dot(ctx, ion.x - 5, ion.y - 5, 1.5, c.electron);
    dot(ctx, ion.x + 6, ion.y - 3, 1.5, c.electron);

    // ---------- 이름표 ----------
    if (!labelsOn) return;
    const fs = Math.max(11, Math.min(13, Math.round(W * 0.021)));
    const right = [
      { t: "자석 (N극·S극)", x: 0.72, y: -0.09 },
      { t: "자기장선", x: RACE[1] + ARCH_A * Math.cos(Math.PI * 0.2), y: ARCH_Y + ARCH_B[2] * Math.sin(Math.PI * 0.2) },
      { t: "타깃 = 음극(−)", x: 0.755, y: 0.02 },
      { t: "레이스트랙 (침식 홈)", x: RACE[1], y: faceY(RACE[1]) },
      { t: "시스 (암흑부): 이온 가속", x: 0.70, y: faceY(0.70) + SHEATH * 0.5 },
      { t: "2차 전자: 자기장선에 갇힘", px: helixPts[RACE[1]][200] },
      { t: "이온화 e⁻ + Ar → Ar⁺ + 2e⁻", px: [ion.x + 9, ion.y] },
      { t: "플라즈마", x: 0.72, y: 0.2 },
      { t: "실드·벽에도 쌓이는 막", x: 0.945, y: 0.3 },
      { t: "펌프 (배기)", x: 0.92, y: 1.1 },
    ];
    const left = [
      { t: "Ar 가스 주입", x: -0.14, y: 0.42 },
      { t: "Ar과 부딪혀 꺾인 원자", px: [scatterPoint.x, scatterPoint.y] },
      { t: "실드 (벽 보호 덮개)", x: SHIELD_X[0], y: 0.62 },
      { t: "웨이퍼 + 쌓이는 막", x: WAFER.x0 + 0.02, y: WAFER.top },
      { t: "척 (웨이퍼 받침)", x: CHUCK.x0 + 0.02, y: 0.88 },
    ];
    drawLabels(ctx, g, right, "right", fs, c);
    drawLabels(ctx, g, left, "left", fs, c);
  }

  // 전체 그림 + (자리가 있으면) 왼쪽 아래에 "A부 확대도"
  function draw(ctx, state, view) {
    const { w, h, colors: c } = view;
    const g = layout(w, h);
    drawScene(ctx, state, g, c, w, h, g.labels);
    drawInset(ctx, state, g, c, w, h);
  }

  // A부 확대도: 왼쪽 레이스트랙 부근(자석·자기장선·시스·2차 전자)을 크게 보여 줌
  const DETAIL = { x0: 0.25, x1: 0.53, y0: -0.13, y1: 0.24 };
  function drawInset(ctx, state, g, c, w, h) {
    if (!g.labels || w < 1100) return;
    const left = Math.max(24, w * 0.028);
    const right = g.X(-0.16) - 14 - 150 - 24;          // 왼쪽 이름표 칸보다 왼쪽까지만
    const top = Math.max(h * 0.42, 330), bottom = h - 96;
    const iw = right - left, ih = bottom - top;
    if (iw < 260 || ih < 200) return;
    // 배율: 확대 영역이 상자에 꽉 차게
    const k = Math.min(iw / ((DETAIL.x1 - DETAIL.x0) * g.W), (ih - 28) / ((DETAIL.y1 - DETAIL.y0) * g.H));
    const bw = (DETAIL.x1 - DETAIL.x0) * g.W * k, bh = (DETAIL.y1 - DETAIL.y0) * g.H * k;
    const bx = left, by = bottom - bh;
    const gi = {
      W: g.W * k, H: g.H * k, k, labels: false,
      X: (x) => bx + (x - DETAIL.x0) * g.W * k,
      Y: (y) => by + (y - DETAIL.y0) * g.H * k,
    };

    // 전체 그림 위에 확대 영역 표시 (점선 네모 + A)
    ctx.save();
    ctx.strokeStyle = c.muted;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 3]);
    const rx = g.X(DETAIL.x0), ry = g.Y(DETAIL.y0), rw = g.X(DETAIL.x1) - rx, rh = g.Y(DETAIL.y1) - ry;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.setLineDash([]);
    ctx.font = "600 12px Pretendard, sans-serif";
    ctx.fillStyle = c.text;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText("A", rx - 4, ry + rh);

    // 확대도 상자
    ctx.beginPath();
    ctx.rect(bx, by, bw, bh);
    ctx.fillStyle = c.bg;
    ctx.fill();
    ctx.clip();
    drawScene(ctx, state, gi, c, w, h, false);
    ctx.restore();
    ctx.strokeStyle = c.lineStrong;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    ctx.font = "600 12px Pretendard, sans-serif";
    ctx.fillStyle = c.text;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("A부 확대: 왼쪽 레이스트랙 부근", bx, by - 8);

    // 확대도 안 이름표: 아래쪽 빈 곳에 한 줄씩 두고, 세로선으로 가리킴
    const tags = [
      { t: "자기장선: N극 → 타깃 앞 → S극", x: RACE[0] + ARCH_A * Math.cos(Math.PI * 0.78), y: ARCH_Y + ARCH_B[2] * Math.sin(Math.PI * 0.78) },
      { t: "시스: 여기서 Ar⁺가 타깃 쪽으로 가속", x: 0.305, y: faceY(0.305) + SHEATH * 0.55 },
      { t: "2차 전자: 자기장선에 감겨 갇힘", x: RACE[0] + 0.05, y: ARCH_Y + ARCH_B[2] * Math.sin(Math.PI * 0.36) },
    ];
    ctx.font = "500 12px Pretendard, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const rowH = 20;
    tags.forEach((tg, i) => {
      const ax = gi.X(tg.x), ay = gi.Y(tg.y);
      const ty = by + bh - 14 - (tags.length - 1 - i) * rowH;
      const tx = bx + 26 + i * 4;
      ctx.strokeStyle = alpha(c.muted, 0.85);
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ty); ctx.lineTo(tx - 4, ty); ctx.stroke();
      dot(ctx, ax, ay, 2, c.text);
      const tw = ctx.measureText(tg.t).width;
      ctx.fillStyle = alpha(c.bg, 0.85);           // 글자 뒤 바탕 (선과 겹쳐도 읽히게)
      ctx.fillRect(tx - 3, ty - 8, tw + 6, 16);
      ctx.fillStyle = c.text;
      ctx.fillText(tg.t, tx, ty);
    });
  }

  // 이름표: 같은 쪽 이름표끼리 겹치지 않게 아래로 밀어 가며 놓고, 꺾인 선으로 부품과 이음
  function drawLabels(ctx, g, items, side, fs, c) {
    const pts = items.map((it) => ({ t: it.t, ax: it.px ? it.px[0] : g.X(it.x), ay: it.px ? it.px[1] : g.Y(it.y) }));
    pts.sort((a, b) => a.ay - b.ay);
    const gap = fs + 9;
    let prev = -Infinity;
    for (const p of pts) { p.ly = Math.max(p.ay, prev + gap); prev = p.ly; }
    const colX = side === "right" ? g.X(1.06) + 18 : g.X(-0.16) - 14;
    const elbowX = side === "right" ? colX - 12 : colX + 12;
    ctx.font = `500 ${fs}px Pretendard, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = side === "right" ? "left" : "right";
    for (const p of pts) {
      ctx.strokeStyle = alpha(c.muted, 0.7);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(p.ax, p.ay);
      ctx.lineTo(elbowX, p.ly);
      ctx.lineTo(colX + (side === "right" ? -4 : 4), p.ly);
      ctx.stroke();
      dot(ctx, p.ax, p.ay, 1.8, c.text);
      ctx.fillStyle = c.text;
      ctx.fillText(p.t, colX, p.ly);
    }
  }

  window.ProcessSim.register("pvd", {
    stages: [
      { name: "진공 배기", duration: 3 },
      { name: "Ar 주입", duration: 3 },
      { name: "플라즈마 점화", duration: 3 },
      { name: "스퍼터링·증착", duration: 10 },
      { name: "종료", duration: 2 },
    ],
    stillTime: 14,   // 정지 화면 = 스퍼터링·증착 단계 한가운데
    create,
    draw,
    // update: 5단계(승인 후)에서 추가
  });
})();
