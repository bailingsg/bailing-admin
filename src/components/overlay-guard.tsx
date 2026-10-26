'use client';

import * as React from 'react';

/**
 * OverlayGuard —— 清理「非本项目」的全屏压暗层。
 *
 * 背景（2026-10-22、10-26 两次线上问题）：
 *   后台某些标签页会被浏览器扩展注入一个「铺满视口 + 半透明黑」的图层，
 *   表现为整页发灰、但页面仍可点击。该图层的特征是：
 *     · position: fixed、尺寸覆盖整个视口；
 *     · 背景为带透明度的暗色（或带 backdrop-filter）；
 *     · 往往带 pointer-events: none，所以 DevTools 的元素选择器也抓不到它；
 *     · 由扩展的 content script 注入，**不是**本项目渲染的节点。
 *
 * 本组件做的事：
 *   扫描页面上所有「铺满视口 + 暗色半透明」的固定定位元素，
 *   若它**不是**本项目的遮罩（没有 data-bailing-overlay 标记，也不是原生 <dialog>），
 *   则：
 *     · 若它是盖在内容之上的浮层 → 直接隐藏；
 *     · 若它是包裹住页面内容的容器（说明是 filter/opacity 造成的压暗）→ 还原 filter/opacity。
 *   扫描范围包含 open shadow root（部分扩展会把 UI 挂进 shadow DOM）。
 *
 * 安全性：
 *   · 本项目所有遮罩都带 data-bailing-overlay 标记，永远不会被误伤；
 *   · 只处理「覆盖视口 85% 以上 + 暗色半透明」这一种极其严格的形态；
 *   · 命中时会在控制台打印来源，便于事后定位是哪个扩展。
 *
 * 本组件不修改任何业务数据，纯渲染层防护。
 */

/** 覆盖视口的判定阈值 */
const MIN_COVER = 0.85;

/** 记录被清理的图层，供事后排查 */
declare global {
  interface Window {
    __bailingNeutralizedOverlays?: Array<{
      tag: string;
      id: string;
      className: string;
      background: string;
      at: string;
    }>;
  }
}

interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(input: string): ParsedColor | null {
  const match = input.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const parts = match[1]
    .split(',')
    .map((item) => Number.parseFloat(item.trim()));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts.length > 3 ? parts[3] : 1,
  };
}

/** 收集页面（含 open shadow root）内所有元素 */
function collectElements(root: Document | ShadowRoot): Element[] {
  const result: Element[] = [];
  const walk = (scope: Document | ShadowRoot) => {
    scope.querySelectorAll('*').forEach((element) => {
      result.push(element);
      const shadow = (element as HTMLElement).shadowRoot;
      if (shadow) walk(shadow);
    });
  };
  walk(root);
  return result;
}

/** 是否为「压暗层」：铺满视口 + 暗色半透明（或带背景模糊） */
function isDimLayer(element: Element): boolean {
  if (element.closest('[data-bailing-overlay]')) return false;
  if (element.tagName === 'DIALOG') return false;

  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (style.position !== 'fixed' && style.position !== 'absolute') return false;

  const rect = element.getBoundingClientRect();
  if (rect.width < window.innerWidth * MIN_COVER) return false;
  if (rect.height < window.innerHeight * MIN_COVER) return false;

  const color = parseColor(style.backgroundColor);
  const isDark =
    !!color &&
    color.a >= 0.15 &&
    color.a <= 0.98 &&
    (color.r + color.g + color.b) / 3 < 120;
  const hasBlur = !!style.backdropFilter && style.backdropFilter !== 'none';

  return isDark || hasBlur;
}

/** 还原「包裹层」上的压暗效果 */
function neutralizeWrapper(element: HTMLElement) {
  element.style.setProperty('filter', 'none', 'important');
  element.style.setProperty('opacity', '1', 'important');
  element.style.setProperty('mix-blend-mode', 'normal', 'important');
  element.style.setProperty('backdrop-filter', 'none', 'important');
}

function neutralize() {
  const report: Window['__bailingNeutralizedOverlays'] = [];
  window.__bailingNeutralizedOverlays = report;

  // 1) html / body 上的 filter、opacity 一律还原（本站从不使用这两个属性）
  for (const node of [document.documentElement, document.body]) {
    if (!node) continue;
    const style = getComputedStyle(node);
    if (style.filter !== 'none' || style.opacity !== '1') {
      neutralizeWrapper(node as HTMLElement);
      report.push({
        tag: node.tagName.toLowerCase(),
        id: node.id,
        className: node.className?.toString().slice(0, 80) ?? '',
        background: style.filter,
        at: new Date().toISOString(),
      });
    }
  }

  // 2) 扫描全屏暗色图层
  const main = document.querySelector('main');
  for (const element of collectElements(document)) {
    if (!isDimLayer(element)) continue;

    const style = getComputedStyle(element);
    const descriptor = {
      tag: element.tagName.toLowerCase(),
      id: element.id,
      className: element.className?.toString().slice(0, 80) ?? '',
      background: style.backgroundColor,
      at: new Date().toISOString(),
    };

    if (main && element.contains(main)) {
      // 包裹住页面内容 → 说明是 filter/opacity 造成的压暗，还原即可
      neutralizeWrapper(element as HTMLElement);
    } else {
      // 盖在内容之上的浮层 → 直接隐藏
      (element as HTMLElement).style.setProperty('display', 'none', 'important');
    }
    report.push(descriptor);
  }

  if (report.length > 0) {
    // eslint-disable-next-line no-console -- 线上排障需要看到命中来源
    console.warn('[bailing] 已清理非本项目的全屏压暗层：', report);
  }
}

export function OverlayGuard() {
  React.useEffect(() => {
    neutralize();

    let timer: number | undefined;
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(neutralize, 200);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // 兜底：部分扩展不产生可观察的 DOM 变更，用低频轮询兜住
    const interval = window.setInterval(neutralize, 4000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
