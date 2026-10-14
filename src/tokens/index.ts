/**
 * Design Tokens — TypeScript 侧出口
 *
 * CSS 变量是设计令牌的唯一来源（见 src/styles/tokens.css）。
 * 本文件仅导出需要在 TS/TSX 中以编程方式使用的令牌（断点、容器宽度、
 * 品牌原始色值等），供组件逻辑、图表库、theme-color 元信息等场景使用。
 * 注意：组件样式仍应优先使用 Tailwind 语义类，而不是在此读取原始色值。
 */

/** 响应式断点（Mobile First，与 Tailwind 默认断点一致） */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/** 容器宽度（px） */
export const containerWidths = {
  narrow: 768,
  max: 1280,
  wide: 1440,
} as const;

/** 间距阶梯（rem），与 --spacing-* 令牌对应 */
export const spacingScale = {
  xs: '0.5rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const;

/** 字号阶梯名称，与 text-* 工具类对应 */
export const typeScale = [
  'display',
  'heading-xl',
  'heading-lg',
  'heading-md',
  'heading-sm',
  'body-lg',
  'body',
  'small',
  'caption',
] as const;

/** 品牌原始色值（仅用于无法使用 CSS 变量的场景，如 <meta theme-color>、第三方图表） */
export const brandPalette = {
  woodBrown: '#8b5e34',
  naturalBeige: '#a68451',
  forestGreen: '#356340',
  neutral: '#1c1917',
  background: '#ffffff',
  surface: '#fafaf9',
} as const;

/** 响应式栅格列数规范（Mobile First） */
export const gridColumns = {
  mobile: 1,
  tablet: 2,
  desktop: 3,
  wide: 4,
} as const;

export type Breakpoint = keyof typeof breakpoints;
export type TypeScaleToken = (typeof typeScale)[number];
