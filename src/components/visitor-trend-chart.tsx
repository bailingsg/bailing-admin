/**
 * 访客趋势图（访客统计实现规格 8.4：纯手写 SVG，禁止图表库）。
 *
 * 为一张 7/30 点的折线图引入 echarts / chart.js（数百 KB）会显著增加体积与
 * 供应链面；折线 + 网格 + 刻度 + 悬浮提示用原生 SVG 几十行即可覆盖。
 *
 * 硬约束：
 *   · UV 实线 + 浅面积，PV 虚线（双视觉编码：线型 + 颜色，色盲用户可辨）；
 *   · 不做任何平滑 / 插值 / 曲线拟合——每个点都对应后端真实返回值；
 *   · X 轴 >10 点时抽稀（约 7 个标签），不重叠；
 *   · 单点只画点不画折线；空数据显示「暂无数据」；
 *   · 悬浮提示用 SVG 原生 <title>，无 JS 事件、无状态机。
 */

import type { VisitorDayPoint } from '@/lib/visitorStats';

const VIEW_WIDTH = 720;
const PAD_LEFT = 52;
const PAD_RIGHT = 18;
const PAD_TOP = 16;
const PAD_BOTTOM = 30;
const HEIGHT = 240;

export interface VisitorTrendChartProps {
  points: VisitorDayPoint[];
  /** 由调用方（client 组件）从 CSS 变量解析后注入；未注入时用中性色兜底 */
  colors?: { uv: string; pv: string; grid: string; axis: string; surface: string };
}

/** 数字取整上限（niceCeil，规格 8.4） */
function niceCeil(v: number): number {
  if (v <= 1) return 1;
  if (v <= 5) return v;
  const magnitude = 10 ** Math.floor(Math.log10(v));
  const normalized = v / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function VisitorTrendChart({ points, colors }: VisitorTrendChartProps) {
  const c = colors ?? {
    uv: 'var(--color-brand-600)',
    pv: 'var(--color-text-muted)',
    grid: 'var(--color-border)',
    axis: 'var(--color-text-muted)',
    surface: 'var(--color-surface-elevated)',
  };

  if (points.length === 0) {
    return (
      <div
        data-testid="visitor-trend-chart"
        className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-border text-small text-text-muted"
      >
        暂无数据
      </div>
    );
  }

  const uvValues = points.map((p) => p.uniqueVisitors);
  const pvValues = points.map((p) => p.visits);
  const yMax = niceCeil(Math.max(1, ...uvValues, ...pvValues));
  const plotWidth = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const n = points.length;

  const x = (i: number): number =>
    n <= 1 ? PAD_LEFT + plotWidth / 2 : PAD_LEFT + (i / (n - 1)) * plotWidth;
  const y = (v: number): number => PAD_TOP + plotHeight - (v / yMax) * plotHeight;
  const baseline = PAD_TOP + plotHeight;

  const toPath = (values: number[]): string =>
    values.length < 2
      ? ''
      : values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

  const uvPath = toPath(uvValues);
  const pvPath = toPath(pvValues);
  const uvArea =
    uvValues.length >= 2
      ? `${uvPath} L ${x(n - 1).toFixed(1)} ${baseline} L ${x(0).toFixed(1)} ${baseline} Z`
      : '';

  const gridValues = [0, Math.round(yMax / 2), yMax];
  const showDots = n <= 14;

  // X 轴抽稀：≤10 全显；否则每 step 取一个并追加最后一个
  const tickIndexes: number[] = [];
  if (n <= 10) {
    for (let i = 0; i < n; i += 1) tickIndexes.push(i);
  } else {
    const step = Math.ceil(n / 7);
    for (let i = 0; i < n - 1; i += step) tickIndexes.push(i);
    tickIndexes.push(n - 1);
  }

  return (
    <div data-testid="visitor-trend-chart">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto' }}
        role="img"
        aria-label={`访客趋势图，共 ${n} 天`}
      >
        {/* 3 条水平网格 */}
        {gridValues.map((v) => {
          const lineY = y(v);
          return (
            <g key={v}>
              <line
                x1={PAD_LEFT}
                x2={VIEW_WIDTH - PAD_RIGHT}
                y1={lineY}
                y2={lineY}
                stroke={c.grid}
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 8}
                y={lineY + 4}
                textAnchor="end"
                fontSize={11}
                fill={c.axis}
                fontFamily="monospace"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* UV 面积（≥2 点才画） */}
        {uvArea ? <path d={uvArea} fill={c.uv} opacity={0.1} /> : null}

        {/* PV 虚线 */}
        {pvPath ? (
          <path d={pvPath} fill="none" stroke={c.pv} strokeWidth={2} strokeDasharray="4 3" />
        ) : null}

        {/* UV 实线 */}
        {uvPath ? <path d={uvPath} fill="none" stroke={c.uv} strokeWidth={2} /> : null}

        {/* 数据点标记（≤14 点才画，30 点画满会糊成一片） */}
        {showDots
          ? points.map((p, i) => (
              <g key={p.date}>
                <circle cx={x(i)} cy={y(p.uniqueVisitors)} r={3.5} fill={c.uv} stroke={c.surface}>
                  <title>{`${p.date} · 独立访客 ${p.uniqueVisitors} · 新访客 ${p.newVisitors}`}</title>
                </circle>
                <circle cx={x(i)} cy={y(p.visits)} r={3} fill={c.pv} stroke={c.surface}>
                  <title>{`${p.date} · 访问次数 ${p.visits}`}</title>
                </circle>
              </g>
            ))
          : null}

        {/* 单点退化为只画点（折线长度为 0 不可见，上面已天然只画 circle） */}

        {/* X 轴刻度 */}
        {tickIndexes.map((i) => (
          <text
            key={points[i]!.date}
            x={x(i)}
            y={HEIGHT - 10}
            textAnchor="middle"
            fontSize={11}
            fill={c.axis}
            fontFamily="monospace"
          >
            {points[i]!.date.slice(5)}
          </text>
        ))}
      </svg>

      {/* 图例（两项，线型可辨） */}
      <div className="mt-2 flex flex-wrap items-center gap-4 text-caption text-text-muted">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0.5 w-4 rounded"
            style={{ background: c.uv }}
          />
          独立访客（UV，按 visitorId 去重）
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0.5 w-4"
            style={{
              background: `repeating-linear-gradient(90deg, ${c.pv} 0 4px, transparent 4px 7px)`,
            }}
          />
          访问次数（PV）
        </span>
      </div>
    </div>
  );
}
