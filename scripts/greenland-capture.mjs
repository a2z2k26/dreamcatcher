#!/usr/bin/env node
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const DEFAULT_PORT = process.env.GREENLAND_PORT || '3000';
const GREENLAND_HOST = process.env.GREENLAND_HOST || 'localhost';
const BASE_URL = process.env.GREENLAND_BASE_URL || `http://${GREENLAND_HOST}:${DEFAULT_PORT}`;
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = resolve(process.env.GREENLAND_OUT || join(ROOT, 'artifacts/greenland', STAMP));
const STANDALONE_REFERENCE = process.env.GREENLAND_STANDALONE_REFERENCE || '/Users/az/Desktop/Dreamcatcher (standalone).html';

const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 900 },
  { id: 'laptop', width: 1280, height: 800 },
  { id: 'mobile', width: 390, height: 844 },
];

const SCENARIOS = [
  { id: 'empty', path: '/?greenland=empty' },
  { id: 'showcase', path: '/?greenland=showcase' },
  {
    id: 'hover-open',
    path: '/?greenland=showcase',
    action: async page => {
      const target = await page.evaluate(() => {
        const canvas = document.querySelector('.dc-observatory-canvas');
        if (!(canvas instanceof HTMLElement)) {
          throw new Error('Missing Green-Land canvas for hover capture');
        }

        const node = document.querySelector('[data-id="n8"]');
        const nodeRect = node?.getBoundingClientRect();
        if (nodeRect && nodeRect.width > 1 && nodeRect.height > 1) {
          return {
            x: nodeRect.left + nodeRect.width / 2,
            y: nodeRect.top + nodeRect.height / 2,
          };
        }

        const scale = window.innerWidth <= 640 ? 0.48 : window.innerWidth <= 1280 ? 0.56 : 0.62;
        const panX = window.innerWidth <= 640
          ? window.innerWidth / 2 - (-40) * scale
          : window.innerWidth / 2 - (-44) * scale;
        const panY = window.innerWidth <= 640
          ? window.innerHeight * 0.46 - 640 * scale
          : window.innerHeight * 0.47 - 563 * scale;
        const rect = canvas.getBoundingClientRect();
        return {
          x: rect.left + (-168) * scale + panX,
          y: rect.top + 846 * scale + panY,
        };
      });
      await page.mouse.move(target.x, target.y);
      await page.waitForTimeout(650);
    },
  },
  {
    id: 'shortcut-guard',
    path: '/?greenland=showcase',
    action: async page => {
      await page.keyboard.press('?');
      await page.waitForTimeout(120);
    },
  },
  { id: 'input-focus', path: '/?greenland=showcase', action: async page => page.locator('.dc-input').focus() },
  {
    id: 'export-open',
    path: '/?greenland=showcase',
    action: async page => {
      await page.evaluate(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'e',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }));
      });
      await page.waitForTimeout(120);
    },
  },
  {
    id: 'search-open',
    path: '/?greenland=showcase',
    action: async page => {
      await page.locator('.dc-search-button').click();
      await page.locator('.dc-search-input').fill('backoff');
    },
  },
  { id: 'model-menu', path: '/?greenland=showcase', action: async page => page.locator('.dc-model-selector-button').click() },
  { id: 'memory-open', path: '/?greenland=showcase&state=memory' },
  {
    id: 'session-open',
    path: '/?greenland=showcase',
    action: async page => {
      await page.locator('.dc-session-pill').click();
      await page.waitForTimeout(500);
    },
  },
  { id: 'timeline-open', path: '/?greenland=showcase', action: async page => page.locator('.dc-timeline-button').click() },
  { id: 'clip-selection', path: '/?greenland=showcase&state=clip' },
  { id: 'learn-open', path: '/?greenland=showcase&state=learn' },
  { id: 'path-trace', path: '/?greenland=showcase&state=path' },
  {
    id: 'drag-zones-open',
    path: '/?greenland=showcase',
    action: async page => {
      await page.evaluate(async () => {
        const node = document.querySelector('svg [data-id]');
        const canvas = document.querySelector('.dc-observatory-canvas');
        if (!(node instanceof Element) || !(canvas instanceof HTMLElement)) return;
        const nodeRect = node.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        node.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: nodeRect.left + nodeRect.width / 2,
          clientY: nodeRect.top + nodeRect.height / 2,
          button: 0,
          buttons: 1,
        }));
        await new Promise(resolve => setTimeout(resolve, 30));
        canvas.dispatchEvent(new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: canvasRect.left + 48,
          clientY: canvasRect.top + canvasRect.height * 0.28,
          button: 0,
          buttons: 1,
        }));
        await new Promise(resolve => setTimeout(resolve, 90));
      });
    },
  },
  {
    id: 'radial-open',
    path: '/?greenland=showcase',
    action: async page => {
      await page.evaluate(async () => {
        const node = document.querySelector('svg [data-id]');
        if (!(node instanceof Element)) return;
        const rect = node.getBoundingClientRect();
        node.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          button: 0,
          buttons: 1,
        }));
        await new Promise(resolve => setTimeout(resolve, 650));
      });
    },
  },
  { id: 'branch-preview', path: '/?greenland=showcase&state=branch' },
  { id: 'context-menu', path: '/?greenland=showcase&state=context' },
  {
    id: 'toast-open',
    path: '/?greenland=showcase&state=context',
    action: async page => {
      await page.locator('.dc-context-menu-item').filter({ hasText: 'Save as memory' }).click();
      await page.waitForTimeout(120);
    },
  },
  { id: 'inspector', path: '/?greenland=showcase&state=inspector' },
  {
    id: 'streaming',
    path: '/?greenland=showcase',
    before: async page => {
      await page.route('**/api/chat', async route => {
        await new Promise(resolve => setTimeout(resolve, 10_000));
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
          body: 'Greenland delayed streaming response.',
        });
      });
    },
    action: async page => {
      await page.locator('.dc-input').fill('Map the listener leak and hold the streaming state.');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(450);
    },
  },
];

const REFERENCE_IMAGES = [
  'Dreamcatcher Design/_x/02-clean.png',
  'Dreamcatcher Design/_x/screens-after.png',
  'Dreamcatcher Design/_x/01-board-states.png',
  'Red Stripe Design System/screenshots/stack4.png',
  'Red Stripe Design System/screenshots/stack.png',
];

async function importPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.error([
      'Playwright is required for Greenland capture but is not installed.',
      '',
      'Install it once:',
      '  pnpm add -D playwright',
      '  pnpm exec playwright install chromium',
      '',
      'Then run:',
      '  pnpm greenland:capture',
    ].join('\n'));
    process.exit(1);
  }
}

async function canReach(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(800) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await canReach(url)) return true;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  return false;
}

function startServerIfNeeded() {
  if (process.env.GREENLAND_NO_SERVER === '1') return null;

  const child = spawn('pnpm', ['exec', 'next', 'dev', '-p', DEFAULT_PORT, '-H', GREENLAND_HOST], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: undefined },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', chunk => process.stdout.write(`[next] ${chunk}`));
  child.stderr.on('data', chunk => process.stderr.write(`[next] ${chunk}`));
  return child;
}

async function copyReferences() {
  const refDir = join(OUT_DIR, 'references');
  await mkdir(refDir, { recursive: true });
  const copied = [];

  for (const relativePath of REFERENCE_IMAGES) {
    const source = join(ROOT, relativePath);
    if (!existsSync(source)) continue;
    const target = join(refDir, basename(relativePath));
    await copyFile(source, target);
    copied.push({ source: relativePath, file: `references/${basename(relativePath)}` });
  }

  return copied;
}

async function captureStandaloneReference(browser) {
  if (!existsSync(STANDALONE_REFERENCE)) return null;

  const refDir = join(OUT_DIR, 'references');
  await mkdir(refDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(STANDALONE_REFERENCE).toString(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  const file = 'references/dreamcatcher-standalone-1440.png';
  await page.screenshot({ path: join(OUT_DIR, file), fullPage: true });
  await context.close();

  return {
    source: STANDALONE_REFERENCE,
    file,
  };
}

async function suppressToolingOverlays(page) {
  await page.evaluate(() => {
    const portal = document.querySelector('nextjs-portal');
    const shadowRoot = portal?.shadowRoot;
    if (!shadowRoot) return;

    const devtoolsIndicator = shadowRoot.getElementById('devtools-indicator');
    devtoolsIndicator?.style.setProperty('display', 'none', 'important');

    for (const element of shadowRoot.querySelectorAll('[class*="nextjs-container"], [class*="nextjs-toast"]')) {
      if (element instanceof HTMLElement) {
        element.style.setProperty('display', 'none', 'important');
      }
    }
  }).catch(() => {});
}

async function collectVisualChecks(page, viewport, scenario) {
  const checks = [];

  if (scenario.id === 'empty') {
    checks.push(await page.evaluate(() => {
      const seed = document.querySelector('[data-empty-state="dreamcatcher-seed"]');
      const core = seed?.querySelector('[data-empty-seed-core="true"]');
      const trace = seed?.querySelector('[data-empty-seed-trace="true"]');
      const tag = seed?.querySelector('[data-empty-seed-tag="true"]');
      const title = seed?.querySelector('[data-empty-title="true"]');
      const text = document.querySelector('svg')?.textContent ?? '';
      if (!(seed instanceof SVGElement)) {
        return { id: 'empty-state-dreamcatcher-title', pass: false, detail: 'Missing dreamcatcher empty state' };
      }
      const rect = seed.getBoundingClientRect();
      const tagRect = tag instanceof SVGElement ? tag.getBoundingClientRect() : new DOMRect();
      const titleRect = title instanceof SVGElement ? title.getBoundingClientRect() : new DOMRect();
      const titleStyle = title instanceof SVGElement ? getComputedStyle(title) : null;
      const pass = text.includes('DREAMCATCHER')
        && !text.includes('Begin a thread')
        && !text.includes('a seed becomes a map')
        && !text.includes('SEED 00')
        && tag instanceof SVGElement
        && title instanceof SVGElement
        && !(core instanceof SVGElement)
        && !(trace instanceof SVGElement)
        && titleRect.width >= 120
        && titleRect.height <= 24
        && titleStyle?.fill === 'rgb(221, 0, 0)'
        && titleStyle?.fontFamily.toLowerCase().includes('mono')
        && Number.parseFloat(titleStyle?.letterSpacing || '0') >= 4
        && Number.parseFloat(titleStyle?.opacity || '0') <= 0.82
        && !text.includes('Press /')
        && rect.left >= 0
        && rect.right <= window.innerWidth
        && rect.top >= 46
        && rect.bottom <= window.innerHeight - 96;
      return {
        id: 'empty-state-dreamcatcher-title',
        pass,
        detail: `left=${Math.round(rect.left)}; right=${Math.round(rect.right)}; top=${Math.round(rect.top)}; bottom=${Math.round(rect.bottom)}; tag=${Math.round(tagRect.width)}x${Math.round(tagRect.height)}; title=${Math.round(titleRect.width)}x${Math.round(titleRect.height)}; fill=${titleStyle?.fill ?? 'missing'}; opacity=${titleStyle?.opacity ?? 'missing'}; text=${text.replace(/\s+/g, ' ').trim()}`,
      };
    }));
  }

  if (scenario.id === 'shortcut-guard') {
    checks.push(await page.evaluate(() => {
      const text = document.body.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      const legacyShortcutCopy = /Keyboard Shortcuts|Focus input|Fit graph|Toggle this help|Arrow L\/R|Cmd\+E/i.test(text);
      return {
        id: 'shortcut-help-not-mounted',
        pass: !legacyShortcutCopy,
        detail: `legacyShortcutCopy=${legacyShortcutCopy}; text=${text.slice(0, 240)}`,
      };
    }));
  }

  if (scenario.id === 'hover-open') {
    checks.push(await page.evaluate(() => {
      const card = document.querySelector('.dc-hover-card');
      const rail = document.querySelector('.dc-hover-rail');
      const kind = document.querySelector('.dc-hover-kind');
      const title = document.querySelector('.dc-hover-title');
      const preview = document.querySelector('.dc-hover-preview');
      const meta = document.querySelector('.dc-hover-meta');
      const modelDot = document.querySelector('.dc-hover-model-dot');
      if (!(card instanceof HTMLElement)
        || !(rail instanceof HTMLElement)
        || !(kind instanceof HTMLElement)
        || !(title instanceof HTMLElement)
        || !(preview instanceof HTMLElement)
        || !(meta instanceof HTMLElement)
        || !(modelDot instanceof HTMLElement)) {
        return { id: 'hover-card-red-stripe-preview', pass: false, detail: 'Missing hover card structure' };
      }
      const rect = card.getBoundingClientRect();
      const railRect = rail.getBoundingClientRect();
      const railStyle = getComputedStyle(rail);
      const cardStyle = getComputedStyle(card);
      const kindStyle = getComputedStyle(kind);
      const titleStyle = getComputedStyle(title);
      const previewStyle = getComputedStyle(preview);
      const metaStyle = getComputedStyle(meta);
      const dotStyle = getComputedStyle(modelDot);
      const broadRedFill = cardStyle.backgroundColor.includes('221') || cardStyle.backgroundImage.includes('221, 0, 0');
      const pass = railStyle.backgroundColor === 'rgb(221, 0, 0)'
        && railRect.width <= 3
        && railRect.height <= rect.height - 22
        && dotStyle.backgroundColor !== 'rgb(221, 0, 0)'
        && !broadRedFill
        && kind.textContent?.trim() === 'AI'
        && title.textContent?.trim() === 'Needs exponential backoff'
        && preview.textContent?.includes('That is the other half') === true
        && meta.textContent?.includes('Claude Sonnet') === true
        && meta.textContent?.includes('71 tok') === true
        && /(iA Writer Mono|Inconsolata|Mono|Menlo|monospace)/i.test(kindStyle.fontFamily)
        && /(iA Writer Mono|Inconsolata|Mono|Menlo|monospace)/i.test(metaStyle.fontFamily)
        && !/(Inconsolata|Mono|Menlo|monospace)/i.test(titleStyle.fontFamily)
        && !/(Inconsolata|Mono|Menlo|monospace)/i.test(previewStyle.fontFamily)
        && rect.left >= 8
        && rect.right <= window.innerWidth - 8
        && rect.top >= 46
        && rect.bottom <= window.innerHeight - 40
        && Number.parseFloat(cardStyle.borderTopLeftRadius) <= 8.5;
      return {
        id: 'hover-card-red-stripe-preview',
        pass,
        detail: `bounds=${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.right)},${Math.round(rect.bottom)}; rail=${railStyle.backgroundColor}/${Math.round(railRect.width)}x${Math.round(railRect.height)}; dot=${dotStyle.backgroundColor}; kind=${kind.textContent?.trim()}; title=${title.textContent?.trim()}; meta=${meta.textContent?.trim()}; broadRedFill=${broadRedFill}; radius=${cardStyle.borderTopLeftRadius}`,
      };
    }));
  }

  if (scenario.id === 'input-focus') {
    checks.push(await page.evaluate(() => {
      const input = document.querySelector('.dc-input');
      const capsule = document.querySelector('.dc-input-capsule');
      const rail = document.querySelector('.dc-input-focus-rail');
      if (!(input instanceof HTMLElement)) {
        return { id: 'input-focus-red-stroke-no-inner-rail', pass: false, detail: 'Missing .dc-input' };
      }
      const style = getComputedStyle(input);
      const capsuleStyle = capsule instanceof HTMLElement ? getComputedStyle(capsule) : null;
      const redStroke = capsuleStyle
        ? [capsuleStyle.borderTopColor, capsuleStyle.borderRightColor, capsuleStyle.borderBottomColor, capsuleStyle.borderLeftColor]
          .some(color => color.includes('221, 0, 0'))
        : false;
      const redGlow = capsuleStyle?.boxShadow.includes('221, 0, 0') === true;
      const focusedChrome = capsule instanceof HTMLElement
        && capsule.dataset.focused === 'true'
        && redStroke
        && redGlow
        && !(rail instanceof HTMLElement);
      const pass = (style.outlineStyle === 'none' || style.outlineWidth === '0px') && style.boxShadow === 'none' && focusedChrome;
      return {
        id: 'input-focus-red-stroke-no-inner-rail',
        pass,
        detail: `outline=${style.outlineStyle} ${style.outlineWidth}; inputShadow=${style.boxShadow}; capsuleFocused=${capsule instanceof HTMLElement ? capsule.dataset.focused : 'missing'}; border=${capsuleStyle?.borderColor ?? 'missing'}; capsuleShadow=${capsuleStyle?.boxShadow ?? 'missing'}; rail=${rail instanceof HTMLElement ? 'present' : 'missing'}`,
      };
    }));

    checks.push(await page.evaluate(() => {
      const floatingInput = document.querySelector('.dc-floating-input');
      const hints = document.querySelector('.dc-input-hints');
      if (!(floatingInput instanceof HTMLElement)) {
        return { id: 'input-chrome-no-shortcut-copy', pass: false, detail: 'Missing .dc-floating-input' };
      }
      const text = floatingInput.textContent || '';
      const exposedShortcutText = /send|palette|⌘|⏎/i.test(text);
      return {
        id: 'input-chrome-no-shortcut-copy',
        pass: !(hints instanceof HTMLElement) && !exposedShortcutText,
        detail: `hints=${hints instanceof HTMLElement ? 'present' : 'missing'}; shortcutText=${exposedShortcutText}; text=${text.replace(/\s+/g, ' ').trim()}`,
      };
    }));
  }

  if (viewport.id === 'mobile' && scenario.id === 'session-open') {
    checks.push(await page.evaluate(() => {
      const input = document.querySelector('.dc-floating-input');
      const pill = document.querySelector('.dc-session-pill');
      if (!(pill instanceof HTMLElement)) {
        return { id: 'mobile-session-open-layout', pass: false, detail: 'Missing .dc-session-pill' };
      }
      const pillRect = pill.getBoundingClientRect();
      const inputDisplay = input instanceof HTMLElement ? getComputedStyle(input).display : 'missing';
      const pass = inputDisplay === 'none' && pillRect.width >= window.innerWidth - 30;
      return {
        id: 'mobile-session-open-layout',
        pass,
        detail: `pillWidth=${Math.round(pillRect.width)}; viewport=${window.innerWidth}; inputDisplay=${inputDisplay}`,
      };
    }));
  }

  if (viewport.id === 'mobile' && scenario.id === 'showcase') {
    checks.push(await page.evaluate(() => {
      const pill = document.querySelector('.dc-session-pill[data-state="collapsed"]');
      const title = pill?.querySelector('.dc-session-pill-title');
      const statusWord = pill?.querySelector('.dc-session-pill-status-word');
      const search = document.querySelector('.dc-search-button');
      if (!(pill instanceof HTMLElement) || !(title instanceof HTMLElement) || !(search instanceof HTMLElement)) {
        return { id: 'mobile-session-pill-title-room', pass: false, detail: 'Missing collapsed session pill/title/search button' };
      }
      const pillRect = pill.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const searchRect = search.getBoundingClientRect();
      const pass = !(statusWord instanceof HTMLElement)
        && titleRect.width >= 110
        && pillRect.right <= searchRect.left - 8
        && title.textContent?.includes('WebSocket') === true;
      return {
        id: 'mobile-session-pill-title-room',
        pass,
        detail: `pill=${Math.round(pillRect.left)},${Math.round(pillRect.right)}; titleWidth=${Math.round(titleRect.width)}; searchLeft=${Math.round(searchRect.left)}; statusWord=${statusWord instanceof HTMLElement ? 'present' : 'hidden'}; title=${title.textContent?.trim()}`,
      };
    }));
  }

  if (scenario.id === 'session-open') {
    checks.push(await page.evaluate(() => {
      const pill = document.querySelector('.dc-session-pill');
      const header = document.querySelector('.dc-session-open-header');
      const savedCount = document.querySelector('.dc-session-open-count');
      const row = document.querySelector('.dc-session-row[data-active="true"]');
      const rail = row?.querySelector('.dc-session-row-active-rail');
      const newButton = document.querySelector('.dc-session-new-button');
      const newButtonIcon = newButton?.querySelector('svg');
      const commandMeta = document.querySelector('.dc-session-command-meta');
      const rowMeta = row?.querySelector('.dc-session-row-meta');
      const rowState = row?.querySelector('.dc-session-row-state');
      if (!(pill instanceof HTMLElement) || !(header instanceof HTMLElement) || !(savedCount instanceof HTMLElement) || !(row instanceof HTMLElement) || !(rail instanceof HTMLElement) || !(newButton instanceof HTMLElement) || !(newButtonIcon instanceof SVGElement)) {
        return { id: 'session-selection-accent-rail', pass: false, detail: 'Missing session pill/header/count/active row/rail/new session action' };
      }
      const pillStyle = getComputedStyle(pill);
      const style = getComputedStyle(row);
      const railStyle = getComputedStyle(rail);
      const newButtonStyle = getComputedStyle(newButton);
      const commandMetaStyle = commandMeta instanceof HTMLElement ? getComputedStyle(commandMeta) : null;
      const rowMetaStyle = rowMeta instanceof HTMLElement ? getComputedStyle(rowMeta) : null;
      const rowStateStyle = rowState instanceof HTMLElement ? getComputedStyle(rowState) : null;
      const railRect = rail.getBoundingClientRect();
      const radius = Number.parseFloat(pillStyle.borderBottomLeftRadius);
      const redRail = railStyle.backgroundColor.includes('221');
      const redFill = style.backgroundImage.includes('221, 0, 0') || style.backgroundColor.includes('221');
      const newTextIsNeutral = newButtonStyle.color !== 'rgb(221, 0, 0)';
      const newIconIsAccent = newButtonIcon.getAttribute('stroke') === '#DD0000';
      const referenceSessionBits = header.textContent?.toLowerCase().includes('session')
        && header.textContent?.toLowerCase().includes('active')
        && savedCount.textContent?.toLowerCase().includes('saved')
        && commandMetaStyle?.fontFamily.toLowerCase().includes('mono')
        && rowMetaStyle?.fontFamily.toLowerCase().includes('mono')
        && rowMeta?.textContent?.toLowerCase().includes('streaming')
        && rowMeta?.textContent?.toLowerCase().includes('n')
        && rowState?.textContent?.trim().toLowerCase() === 'active'
        && rowStateStyle?.color === 'rgb(221, 0, 0)';
      return {
        id: 'session-selection-accent-rail',
        pass: redRail && !redFill && newTextIsNeutral && newIconIsAccent && railRect.width >= 1.5 && railRect.width <= 2.5 && radius >= 16 && radius <= 22 && referenceSessionBits,
        detail: `radius=${radius}; railWidth=${railRect.width}; railColor=${railStyle.backgroundColor}; rowBg=${style.backgroundImage.slice(0, 90)}; newColor=${newButtonStyle.color}; newIcon=${newButtonIcon.getAttribute('stroke')}; header=${header.textContent?.replace(/\s+/g, ' ').trim()}; commandMeta=${commandMeta?.textContent?.trim() ?? 'missing'}; rowMeta=${rowMeta?.textContent?.trim() ?? 'missing'}; state=${rowState?.textContent?.trim() ?? 'missing'}/${rowStateStyle?.color ?? 'missing'}`,
      };
    }));
  }

  if (scenario.id === 'export-open') {
    checks.push(await page.evaluate(() => {
      const panel = document.querySelector('.dc-export-panel');
      const header = document.querySelector('.dc-export-header');
      const title = document.querySelector('.dc-export-title');
      const meta = document.querySelector('.dc-export-meta');
      const icon = document.querySelector('.dc-export-header-icon');
      const rows = Array.from(document.querySelectorAll('.dc-export-format-row'));
      const selected = document.querySelector('.dc-export-format-row[data-selected="true"]');
      const rail = selected?.querySelector('.dc-export-format-rail');
      const nativeRadios = panel?.querySelectorAll('input[type="radio"]') ?? [];
      const download = document.querySelector('.dc-export-download');
      const downloadMeta = document.querySelector('.dc-export-download-meta');
      if (!(panel instanceof HTMLElement)
        || !(header instanceof HTMLElement)
        || !(title instanceof HTMLElement)
        || !(meta instanceof HTMLElement)
        || !(icon instanceof HTMLElement)
        || !(selected instanceof HTMLElement)
        || !(rail instanceof HTMLElement)
        || !(download instanceof HTMLElement)
        || !(downloadMeta instanceof HTMLElement)) {
        return { id: 'export-overlay-red-stripe-structure', pass: false, detail: 'Missing export overlay structure' };
      }
      const rect = panel.getBoundingClientRect();
      const railStyle = getComputedStyle(rail);
      const railRect = rail.getBoundingClientRect();
      const selectedStyle = getComputedStyle(selected);
      const downloadStyle = getComputedStyle(download);
      const broadRedFill = selectedStyle.backgroundColor.includes('221') || selectedStyle.backgroundImage.includes('221, 0, 0');
      const pass = rows.length === 2
        && nativeRadios.length === 0
        && railRect.width <= 3
        && railStyle.backgroundColor === 'rgb(221, 0, 0)'
        && !broadRedFill
        && title.textContent?.trim() === 'Export'
        && /\d+n · \d+e/.test(meta.textContent || '')
        && /MD · \d+n/.test(downloadMeta.textContent || '')
        && rect.left >= 12
        && rect.right <= window.innerWidth - 12
        && rect.top >= 24
        && rect.bottom <= window.innerHeight - 24
        && Number.parseFloat(getComputedStyle(panel).borderTopLeftRadius) <= 12.5
        && downloadStyle.backgroundColor === 'rgb(30, 28, 25)';
      return {
        id: 'export-overlay-red-stripe-structure',
        pass,
        detail: `rows=${rows.length}; radios=${nativeRadios.length}; rail=${railStyle.backgroundColor}/${Math.round(railRect.width)}; title=${title.textContent?.trim()}; meta=${meta.textContent?.trim()}; download=${downloadMeta.textContent?.trim()}; broadRedFill=${broadRedFill}; bounds=${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.right)},${Math.round(rect.bottom)}`,
      };
    }));
  }

  if (scenario.id === 'search-open') {
    checks.push(await page.evaluate(() => {
      const panel = document.querySelector('.dc-search-panel');
      const bar = document.querySelector('.dc-search-bar');
      const input = document.querySelector('.dc-search-input');
      const results = document.querySelector('.dc-search-results');
      const filterRow = document.querySelector('.dc-search-filter-row');
      const chips = Array.from(document.querySelectorAll('.dc-search-filter-chip'));
      const activeChip = document.querySelector('.dc-search-filter-chip[data-active="true"]');
      const activeRow = document.querySelector('.dc-search-result-row[data-active="true"]');
      if (!(panel instanceof HTMLElement) || !(bar instanceof HTMLElement) || !(input instanceof HTMLElement) || !(results instanceof HTMLElement) || !(filterRow instanceof HTMLElement) || !(activeChip instanceof HTMLElement) || !(activeRow instanceof HTMLElement)) {
        return { id: 'search-open-palette-bounds', pass: false, detail: 'Missing search panel/bar/input/results/filter chips/active row' };
      }
      const rect = panel.getBoundingClientRect();
      const barStyle = getComputedStyle(bar);
      const inputStyle = getComputedStyle(input);
      const rowStyle = getComputedStyle(activeRow);
      const activeChipStyle = getComputedStyle(activeChip);
      const railStyle = getComputedStyle(activeRow, '::before');
      const railIsAccent = railStyle.backgroundColor === 'rgb(221, 0, 0)';
      const chipLabels = chips.map(chip => chip.textContent?.replace(/\d+/g, '').trim()).join('|');
      const activeChipIsAccent = activeChipStyle.color === 'rgb(221, 0, 0)' && activeChipStyle.backgroundColor.startsWith('rgba(221, 0, 0');
      const exposedShortcutText = /enter|esc|cycle|closes/i.test(results.textContent || '');
      const pass = railIsAccent
        && chips.length === 5
        && chipLabels === 'All|You|AI|Clips|Branches'
        && activeChipIsAccent
        && !exposedShortcutText
        && rect.left >= 12
        && rect.right <= window.innerWidth - 12
        && rect.top >= 46
        && rect.bottom <= window.innerHeight - 96
        && Math.round(bar.getBoundingClientRect().height) === 40
        && rowStyle.backgroundColor === 'rgba(26, 24, 22, 0.58)'
        && (inputStyle.outlineStyle === 'none' || inputStyle.outlineWidth === '0px')
        && inputStyle.boxShadow === 'none';
      return {
        id: 'search-open-palette-bounds',
        pass,
        detail: `left=${Math.round(rect.left)}; right=${Math.round(rect.right)}; top=${Math.round(rect.top)}; bottom=${Math.round(rect.bottom)}; viewport=${window.innerWidth}; barHeight=${Math.round(bar.getBoundingClientRect().height)}; chips=${chips.length}; chipLabels=${chipLabels}; activeChip=${activeChipStyle.color}/${activeChipStyle.backgroundColor}; rail=${railStyle.backgroundColor}; rowBg=${rowStyle.backgroundColor}; outline=${inputStyle.outlineStyle} ${inputStyle.outlineWidth}; inputShadow=${inputStyle.boxShadow}; barBorder=${barStyle.borderColor}; shortcutText=${exposedShortcutText}`,
      };
    }));
  }

  if (scenario.id === 'model-menu') {
    checks.push(await page.evaluate(() => {
      const menu = document.querySelector('.dc-model-menu');
      const header = document.querySelector('.dc-model-menu-header');
      const row = document.querySelector('.dc-model-option[data-selected="true"]');
      if (!(menu instanceof HTMLElement) || !(header instanceof HTMLElement) || !(row instanceof HTMLElement)) {
        return { id: 'model-selection-accent-rail', pass: false, detail: 'Missing model menu/header/selected option' };
      }
      const dot = row.querySelector('span');
      const meta = row.querySelector('.dc-model-option-meta');
      const active = row.querySelector('.dc-model-option-selected');
      const menuRect = menu.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const rowStyle = getComputedStyle(row);
      const railStyle = getComputedStyle(row, '::before');
      const dotStyle = dot instanceof HTMLElement ? getComputedStyle(dot) : null;
      const metaStyle = meta instanceof HTMLElement ? getComputedStyle(meta) : null;
      const activeStyle = active instanceof HTMLElement ? getComputedStyle(active) : null;
      const rowUsesProviderRail = dotStyle !== null && rowStyle.borderLeftColor === dotStyle.backgroundColor && parseFloat(rowStyle.borderLeftWidth) > 1;
      const selectedOutline = rowStyle.borderColor !== 'rgba(0, 0, 0, 0)' && rowStyle.borderColor !== 'transparent';
      const railIsAccent = railStyle.backgroundColor === 'rgb(221, 0, 0)';
      const bgIsQuietActive = rowStyle.backgroundColor.startsWith('rgba(255, 255, 255, 0.05');
      const mobileBounds = window.innerWidth > 640 || (
        menuRect.left >= 12
        && menuRect.right <= window.innerWidth - 12
        && menuRect.top >= 54
        && menuRect.bottom <= window.innerHeight - 96
      );
      const referenceModelBits = header.textContent?.toLowerCase().includes('model')
        && menuRect.width >= 248
        && rowRect.height >= 44
        && metaStyle?.fontFamily.toLowerCase().includes('mono')
        && active?.textContent?.trim().toLowerCase() === 'active'
        && activeStyle?.color === 'rgb(221, 0, 0)';
      return {
        id: 'model-selection-accent-rail',
        pass: !rowUsesProviderRail && !selectedOutline && railIsAccent && bgIsQuietActive && referenceModelBits && mobileBounds,
        detail: `menu=${Math.round(menuRect.left)},${Math.round(menuRect.top)} ${Math.round(menuRect.width)}x${Math.round(menuRect.height)}; row=${Math.round(rowRect.width)}x${Math.round(rowRect.height)}; border=${rowStyle.borderLeftWidth} ${rowStyle.borderLeftColor}; background=${rowStyle.backgroundColor}; rail=${railStyle.backgroundColor}; dot=${dotStyle?.backgroundColor ?? 'missing'}; metaFont=${metaStyle?.fontFamily ?? 'missing'}; active=${active?.textContent?.trim() ?? 'missing'}/${activeStyle?.color ?? 'missing'}; mobileBounds=${mobileBounds}`,
      };
    }));
  }

  if (scenario.id === 'drag-zones-open') {
    checks.push(await page.evaluate(() => {
      const zones = Array.from(document.querySelectorAll('.dc-drop-zone'));
      const labels = Array.from(document.querySelectorAll('.dc-drop-zone-vertical-label'));
      const activeZone = document.querySelector('.dc-drop-zone[data-active="true"]');
      const activeRail = activeZone?.querySelector('.dc-drop-zone-rail');
      if (zones.length !== 2 || labels.length !== 2 || !(activeZone instanceof HTMLElement) || !(activeRail instanceof HTMLElement)) {
        return { id: 'drag-zone-soft-wordmarks', pass: false, detail: 'Missing drop zone panels, labels, or active rail' };
      }
      const zoneRects = zones.map(zone => zone instanceof HTMLElement ? zone.getBoundingClientRect() : new DOMRect());
      const labelRects = labels.map(label => label instanceof HTMLElement ? label.getBoundingClientRect() : new DOMRect());
      const labelStyles = labels.map(label => label instanceof HTMLElement ? getComputedStyle(label) : null);
      const activeStyle = getComputedStyle(activeZone);
      const railStyle = getComputedStyle(activeRail);
      const labelText = labels.map(label => label.textContent?.trim()).join('|');
      const redAlpha = Number.parseFloat(activeStyle.backgroundImage.match(/rgba\(221, 0, 0, ([\d.]+)\)/)?.[1] ?? '1');
      const rotatedWordmarks = labelStyles.every(style => style?.writingMode === 'horizontal-tb')
        && labelRects.every(rect => rect.height >= 58 && rect.width <= 24);
      const softenedPanel = zoneRects.every(rect => Math.round(rect.width) <= 140)
        && redAlpha > 0
        && redAlpha <= 0.05
        && railStyle.backgroundColor === 'rgb(221, 0, 0)'
        && Math.round(Number.parseFloat(railStyle.width)) === 2;
      return {
        id: 'drag-zone-soft-wordmarks',
        pass: labelText === 'EDUCATE|REMEMBER' && rotatedWordmarks && softenedPanel,
        detail: `labels=${labelText}; labelRects=${labelRects.map(rect => `${Math.round(rect.width)}x${Math.round(rect.height)}`).join('|')}; zones=${zoneRects.map(rect => Math.round(rect.width)).join('|')}; redAlpha=${redAlpha}; rail=${railStyle.width}/${railStyle.backgroundColor}`,
      };
    }));
  }

  if (scenario.id === 'memory-open') {
    checks.push(await page.evaluate(() => {
      const panel = document.querySelector('.dc-memory-shelf');
      const rows = Array.from(document.querySelectorAll('.dc-memory-row'));
      const input = document.querySelector('.dc-memory-search-input');
      const headerIcon = document.querySelector('.dc-memory-header-icon');
      const kindPills = Array.from(document.querySelectorAll('.dc-memory-kind-pill'));
      const clipThumb = document.querySelector('.dc-memory-clip-thumb');
      if (!(panel instanceof HTMLElement) || !(input instanceof HTMLElement) || rows.length === 0) {
        return { id: 'memory-open-neutral-bounds', pass: false, detail: 'Missing memory shelf/input/rows' };
      }
      const rect = panel.getBoundingClientRect();
      const style = getComputedStyle(panel);
      const inputStyle = getComputedStyle(input);
      const redPanel = style.borderColor.includes('221') || style.backgroundImage.includes('221, 0, 0');
      const rowRects = rows.map(row => row instanceof HTMLElement ? row.getBoundingClientRect() : new DOMRect());
      const rowRadii = rows.map(row => row instanceof HTMLElement ? Number.parseFloat(getComputedStyle(row).borderTopLeftRadius) : 999);
      const insetCardRows = rowRects.every(rowRect => rowRect.left >= rect.left + 8 && rowRect.right <= rect.right - 8);
      const cardRows = rows.every(row => {
        if (!(row instanceof HTMLElement)) return false;
        const rowStyle = getComputedStyle(row);
        const radius = Number.parseFloat(rowStyle.borderTopLeftRadius);
        return radius >= 6
          && radius <= 8.5
          && rowStyle.borderTopWidth !== '0px'
          && rowStyle.backgroundColor.startsWith('rgba(255, 255, 255, 0.02');
      });
      const redRows = rows.some(row => {
        if (!(row instanceof HTMLElement)) return true;
        const rowStyle = getComputedStyle(row);
        return rowStyle.borderColor.includes('221') || rowStyle.backgroundImage.includes('221, 0, 0') || rowStyle.color.includes('221');
      });
      const thumbVisible = clipThumb instanceof SVGElement && clipThumb.getBoundingClientRect().height >= 28;
      const referenceShelfBits = headerIcon instanceof HTMLElement
        && kindPills.length === rows.length
        && kindPills.some(pill => /clip/i.test(pill.textContent || ''))
        && thumbVisible;
      const pass = !redPanel
        && !redRows
        && rect.left >= 0
        && rect.right <= window.innerWidth
        && (window.innerWidth <= 640 ? Math.round(rect.width) === window.innerWidth : rect.width <= 300)
        && rect.top >= 46
        && rect.bottom <= window.innerHeight - 24
        && rows.length >= 3
        && (inputStyle.outlineStyle === 'none' || inputStyle.outlineWidth === '0px')
        && insetCardRows
        && cardRows
        && referenceShelfBits;
      return {
        id: 'memory-open-neutral-bounds',
        pass,
        detail: `left=${Math.round(rect.left)}; right=${Math.round(rect.right)}; width=${Math.round(rect.width)}; top=${Math.round(rect.top)}; bottom=${Math.round(rect.bottom)}; rows=${rows.length}; rowRadii=${rowRadii.join('/')}; insetCards=${insetCardRows}; cardRows=${cardRows}; pills=${kindPills.length}; headerIcon=${headerIcon instanceof HTMLElement}; thumb=${thumbVisible}; inputOutline=${inputStyle.outlineStyle} ${inputStyle.outlineWidth}; border=${style.borderColor}`,
      };
    }));
    checks.push(await page.evaluate(() => {
      const spawnButton = document.querySelector('.dc-memory-spawn-button');
      const dismissButtons = Array.from(document.querySelectorAll('.dc-memory-dismiss-button'));
      const shelf = document.querySelector('.dc-memory-shelf');
      if (!(spawnButton instanceof HTMLElement) || dismissButtons.length === 0 || !(shelf instanceof HTMLElement)) {
        return { id: 'memory-actions-icon-neutral', pass: false, detail: 'Missing icon memory action controls' };
      }
      const visibleText = Array.from(shelf.querySelectorAll('button'))
        .map(button => button.textContent?.replace(/\s+/g, ' ').trim() ?? '')
        .filter(Boolean)
        .join(' ');
      const spawnStyle = getComputedStyle(spawnButton);
      const spawnRect = spawnButton.getBoundingClientRect();
      const dismissRects = dismissButtons.map(button => button instanceof HTMLElement ? button.getBoundingClientRect() : new DOMRect());
      const compactSpawn = spawnRect.width <= 24 && spawnRect.height <= 22;
      const compactDismiss = dismissRects.every(rect => rect.width >= 20 && rect.width <= 24 && rect.height >= 20 && rect.height <= 24);
      const noTextActions = !/spawn|remove|delete|close/i.test(visibleText);
      const noBroadRedAction = !spawnStyle.backgroundColor.includes('221, 0, 0')
        && !spawnStyle.borderColor.includes('221, 0, 0')
        && spawnStyle.color !== 'rgb(221, 0, 0)';
      return {
        id: 'memory-actions-icon-neutral',
        pass: compactSpawn && compactDismiss && noTextActions && noBroadRedAction,
        detail: `spawn=${Math.round(spawnRect.width)}x${Math.round(spawnRect.height)} color=${spawnStyle.color} border=${spawnStyle.borderColor} bg=${spawnStyle.backgroundColor}; dismiss=${dismissRects.map(rect => `${Math.round(rect.width)}x${Math.round(rect.height)}`).join('/')}; buttonText=${visibleText || 'none'}`,
      };
    }));
  }

  if (scenario.id === 'clip-selection') {
    checks.push(await page.evaluate(() => {
      const panel = document.querySelector('.dc-clip-creator');
      const count = document.querySelector('.dc-clip-count');
      const summary = document.querySelector('.dc-clip-summary');
      const kind = document.querySelector('.dc-clip-kind-pill');
      const trace = document.querySelector('.dc-clip-trace');
      const actions = Array.from(document.querySelectorAll('.dc-clip-action'));
      if (!(panel instanceof HTMLElement)) {
        return { id: 'clip-selection-neutral-bounds', pass: false, detail: 'Missing .dc-clip-creator' };
      }
      const rect = panel.getBoundingClientRect();
      const style = getComputedStyle(panel);
      const radius = Number.parseFloat(style.borderTopLeftRadius);
      const countStyle = count instanceof HTMLElement ? getComputedStyle(count) : null;
      const kindStyle = kind instanceof HTMLElement ? getComputedStyle(kind) : null;
      const traceRect = trace instanceof HTMLElement ? trace.getBoundingClientRect() : new DOMRect();
      const summaryRect = summary instanceof HTMLElement ? summary.getBoundingClientRect() : new DOMRect();
      const actionRects = actions.map(action => action instanceof HTMLElement ? action.getBoundingClientRect() : new DOMRect());
      const actionFonts = actions.map(action => action instanceof HTMLElement ? getComputedStyle(action).fontFamily : '');
      const actionRadii = actions.map(action => action instanceof HTMLElement ? Number.parseFloat(getComputedStyle(action).borderTopLeftRadius) : 0);
      const redSelection = style.borderColor.includes('221') || style.backgroundImage.includes('221, 0, 0') || actions.some(action => {
        if (!(action instanceof HTMLElement)) return true;
        const actionStyle = getComputedStyle(action);
        return actionStyle.borderColor.includes('221') || actionStyle.backgroundColor.includes('221') || actionStyle.color.includes('221');
      });
      const compactActions = actionRects.length >= 2 && actionRects.every(actionRect => actionRect.height >= 30 && actionRect.height <= 34);
      const roundedActions = actionRadii.every(actionRadius => actionRadius >= 14);
      const sansActions = actionFonts.every(font => !/(Inconsolata|Mono|Menlo|monospace)/i.test(font));
      const monoCount = countStyle ? /(iA Writer Mono|Inconsolata|Mono|Menlo|monospace)/i.test(countStyle.fontFamily) : false;
      const referenceClipBits = summary instanceof HTMLElement
        && kind instanceof HTMLElement
        && trace instanceof HTMLElement
        && /clip/i.test(kind.textContent || '')
        && kindStyle !== null
        && /(iA Writer Mono|Inconsolata|Mono|Menlo|monospace)/i.test(kindStyle.fontFamily)
        && traceRect.width >= 70
        && traceRect.height >= 8
        && summaryRect.width >= 80;
      const pass = !redSelection
        && rect.left >= 12
        && rect.right <= window.innerWidth - 12
        && rect.bottom <= window.innerHeight - 96
        && panel.textContent?.includes('4 nodes') === true
        && radius >= 18
        && compactActions
        && roundedActions
        && sansActions
        && monoCount
        && referenceClipBits;
      return {
        id: 'clip-selection-neutral-bounds',
        pass,
        detail: `left=${Math.round(rect.left)}; right=${Math.round(rect.right)}; bottom=${Math.round(rect.bottom)}; radius=${radius}; summary=${Math.round(summaryRect.width)}x${Math.round(summaryRect.height)}; trace=${Math.round(traceRect.width)}x${Math.round(traceRect.height)}; actionHeights=${actionRects.map(actionRect => Math.round(actionRect.height)).join('/')}; actionRadii=${actionRadii.join('/')}; countFont=${countStyle?.fontFamily ?? 'missing'}; kindFont=${kindStyle?.fontFamily ?? 'missing'}; actionFonts=${actionFonts.join('|')}; viewport=${window.innerWidth}x${window.innerHeight}; border=${style.borderColor}`,
      };
    }));
  }

  if (scenario.id === 'learn-open') {
    checks.push(await page.evaluate(() => {
      const panel = document.querySelector('.dc-learn-panel');
      const buttons = Array.from(document.querySelectorAll('.dc-learn-mode-button'));
      const lensList = document.querySelector('.dc-learn-lens-list');
      const answerStage = document.querySelector('.dc-learn-answer-stage');
      const followupBar = document.querySelector('.dc-learn-followup-bar');
      const followupInput = document.querySelector('.dc-learn-followup-input');
      const headerIcon = document.querySelector('.dc-learn-header-icon');
      const nodeCard = document.querySelector('.dc-learn-node-card');
      const rails = Array.from(document.querySelectorAll('.dc-learn-mode-rail'));
      if (!(panel instanceof HTMLElement) || buttons.length === 0) {
        return { id: 'learn-open-neutral-bounds', pass: false, detail: 'Missing learn panel/buttons' };
      }
      const rect = panel.getBoundingClientRect();
      const panelStyle = getComputedStyle(panel);
      const redPanel = panelStyle.borderColor.includes('221') || panelStyle.backgroundImage.includes('221, 0, 0');
      const redButtons = buttons.some(button => {
        if (!(button instanceof HTMLElement)) return true;
        const style = getComputedStyle(button);
        return style.borderColor.includes('221') || style.backgroundImage.includes('221, 0, 0') || style.color.includes('221');
      });
      const exposedExplanationCopy = /plain-language|decision rationale|concepts needed|other paths|understand this node|conversation could take/i.test(panel.textContent || '');
      const compactRows = buttons.every(button => {
        if (!(button instanceof HTMLElement)) return false;
        const rowRect = button.getBoundingClientRect();
        return rowRect.height >= 48 && rowRect.height <= 58;
      });
      const labels = buttons.map(button => button.textContent?.replace(/\d+/g, '').replace(/\s+/g, ' ').trim() ?? '').join('|');
      const referenceLabels = /Explain simply.*The core idea.*Go deeper.*The mechanism.*Find the flaw.*Where it could still fail.*Related concepts.*Patterns that connect/.test(labels);
      const structurePresent = lensList instanceof HTMLElement
        && answerStage instanceof HTMLElement
        && followupBar instanceof HTMLElement
        && followupInput instanceof HTMLInputElement
        && headerIcon instanceof HTMLElement
        && nodeCard instanceof HTMLElement
        && rails.length === buttons.length;
      const lensRect = lensList instanceof HTMLElement ? lensList.getBoundingClientRect() : new DOMRect();
      const answerRect = answerStage instanceof HTMLElement ? answerStage.getBoundingClientRect() : new DOMRect();
      const followupRect = followupBar instanceof HTMLElement ? followupBar.getBoundingClientRect() : new DOMRect();
      const twoPaneDesktop = window.innerWidth <= 640 || (lensRect.right <= answerRect.left + 2 && answerRect.bottom <= followupRect.top + 2);
      const stackedMobile = window.innerWidth > 640 || (lensRect.bottom <= answerRect.top + 2 && answerRect.bottom <= followupRect.top + 2);
      const railsThin = rails.every(rail => rail instanceof HTMLElement && rail.getBoundingClientRect().width <= 2.5);
      const inputStyle = followupInput instanceof HTMLElement ? getComputedStyle(followupInput) : null;
      const pass = !redPanel
        && !redButtons
        && !exposedExplanationCopy
        && compactRows
        && referenceLabels
        && structurePresent
        && twoPaneDesktop
        && stackedMobile
        && railsThin
        && rect.left >= 12
        && rect.right <= window.innerWidth - 12
        && rect.top >= 46
        && rect.bottom <= window.innerHeight - 24
        && (inputStyle?.outlineStyle === 'none' || inputStyle?.outlineWidth === '0px')
        && buttons.length >= 4;
      return {
        id: 'learn-open-neutral-bounds',
        pass,
        detail: `left=${Math.round(rect.left)}; right=${Math.round(rect.right)}; top=${Math.round(rect.top)}; bottom=${Math.round(rect.bottom)}; buttons=${buttons.length}; compactRows=${compactRows}; labels=${labels}; structure=${structurePresent}; twoPane=${twoPaneDesktop}; stacked=${stackedMobile}; rails=${rails.length}/${railsThin}; explanationCopy=${exposedExplanationCopy}; inputOutline=${inputStyle?.outlineStyle ?? 'missing'} ${inputStyle?.outlineWidth ?? ''}; border=${panelStyle.borderColor}`,
      };
    }));
  }

  if (scenario.id === 'branch-preview') {
    checks.push(await page.evaluate(() => {
      const panel = document.querySelector('.dc-branch-preview');
      const rows = Array.from(document.querySelectorAll('.dc-branch-preview-row'));
      const header = document.querySelector('.dc-branch-preview-header');
      const headerIcon = document.querySelector('.dc-branch-preview-header-icon');
      const tags = Array.from(document.querySelectorAll('.dc-branch-preview-tag'));
      const traces = Array.from(document.querySelectorAll('.dc-branch-preview-trace'));
      if (!(panel instanceof HTMLElement) || rows.length === 0) {
        return { id: 'branch-preview-neutral-bounds', pass: false, detail: 'Missing branch preview panel/rows' };
      }
      const rect = panel.getBoundingClientRect();
      const style = getComputedStyle(panel);
      const redPanel = style.borderColor.includes('221') || style.backgroundImage.includes('221, 0, 0');
      const radius = Number.parseFloat(style.borderTopLeftRadius);
      const rowHeights = rows.map(row => row instanceof HTMLElement ? row.getBoundingClientRect().height : 0);
      const rowRadii = rows.map(row => row instanceof HTMLElement ? Number.parseFloat(getComputedStyle(row).borderTopLeftRadius) : 0);
      const labelFonts = Array.from(document.querySelectorAll('.dc-branch-preview-label')).map(label => label instanceof HTMLElement ? getComputedStyle(label).fontFamily : '');
      const metaFonts = Array.from(document.querySelectorAll('.dc-branch-preview-meta')).map(meta => meta instanceof HTMLElement ? getComputedStyle(meta).fontFamily : '');
      const compactRows = rowHeights.every(height => height >= 68 && height <= 92);
      const cardRows = rows.every(row => {
        if (!(row instanceof HTMLElement)) return false;
        const rowStyle = getComputedStyle(row);
        return Number.parseFloat(rowStyle.borderTopLeftRadius) >= 7
          && rowStyle.borderTopWidth !== '0px'
          && rowStyle.backgroundColor.startsWith('rgba(255, 255, 255, 0.02');
      });
      const sansLabels = labelFonts.length === rows.length && labelFonts.every(font => !/(Inconsolata|Mono|Menlo|monospace)/i.test(font));
      const monoMeta = metaFonts.length === rows.length && metaFonts.every(font => /(iA Writer Mono|Inconsolata|Mono|Menlo|monospace)/i.test(font));
      const tagText = tags.map(tag => tag.textContent?.replace(/\s+/g, ' ').trim()).join('|');
      const branchStructure = header instanceof HTMLElement
        && headerIcon instanceof HTMLElement
        && tags.length === rows.length
        && traces.length === rows.length
        && /^ALT 01(\|ALT 02)?/.test(tagText);
      const redRows = rows.some(row => {
        if (!(row instanceof HTMLElement)) return true;
        const rowStyle = getComputedStyle(row);
        return rowStyle.borderColor.includes('221') || rowStyle.backgroundImage.includes('221, 0, 0') || rowStyle.color.includes('221');
      });
      const pass = !redPanel
        && !redRows
        && rect.left >= 12
        && rect.right <= window.innerWidth - 12
        && rect.top >= 46
        && rect.bottom <= window.innerHeight - 96
        && rows.length >= 2
        && radius >= 10
        && radius <= 12.5
        && compactRows
        && cardRows
        && sansLabels
        && monoMeta
        && branchStructure;
      return {
        id: 'branch-preview-neutral-bounds',
        pass,
        detail: `left=${Math.round(rect.left)}; right=${Math.round(rect.right)}; top=${Math.round(rect.top)}; bottom=${Math.round(rect.bottom)}; rows=${rows.length}; radius=${radius}; rowHeights=${rowHeights.map(Math.round).join('/')}; rowRadii=${rowRadii.join('/')}; cardRows=${cardRows}; tags=${tagText}; traces=${traces.length}; structure=${branchStructure}; labelFonts=${labelFonts.join('|')}; metaFonts=${metaFonts.join('|')}; border=${style.borderColor}`,
      };
    }));
  }

  if (scenario.id === 'path-trace') {
    checks.push(await page.evaluate(() => {
      const panel = document.querySelector('.dc-path-trace');
      const step = document.querySelector('.dc-path-trace-step');
      const mini = document.querySelector('.dc-path-trace-mini');
      const miniCurrent = document.querySelector('.dc-path-trace-mini-current');
      const input = document.querySelector('.dc-floating-input');
      const inspector = document.querySelector('.dc-inspector-panel');
      const controls = Array.from(document.querySelectorAll('.dc-path-trace-control'));
      const exit = document.querySelector('.dc-path-trace-exit');
      if (!(panel instanceof HTMLElement) || !(step instanceof HTMLElement) || !(mini instanceof SVGElement) || !(miniCurrent instanceof SVGElement) || controls.length < 2 || !(exit instanceof HTMLElement)) {
        return { id: 'path-trace-neutral-bounds', pass: false, detail: 'Missing path trace panel/step/mini/controls/exit' };
      }
      const rect = panel.getBoundingClientRect();
      const miniRect = mini.getBoundingClientRect();
      const style = getComputedStyle(panel);
      const stepStyle = getComputedStyle(step);
      const miniCurrentStyle = getComputedStyle(miniCurrent);
      const redPanel = style.borderColor.includes('221') || style.backgroundImage.includes('221, 0, 0');
      const redStep = stepStyle.borderColor.includes('221') || stepStyle.backgroundColor.includes('221') || stepStyle.color.includes('221');
      const redControls = controls.some(control => {
        if (!(control instanceof HTMLElement)) return true;
        const controlStyle = getComputedStyle(control);
        return controlStyle.borderColor.includes('221') || controlStyle.backgroundColor.includes('221') || controlStyle.color.includes('221');
      });
      const exposedShortcutText = /\besc\b|arrow/i.test(panel.textContent || '');
      const pass = !redPanel
        && !redStep
        && !redControls
        && !exposedShortcutText
        && !(input instanceof HTMLElement)
        && (!(inspector instanceof HTMLElement) || inspector.getAttribute('aria-hidden') === 'true')
        && rect.left >= 12
        && rect.right <= window.innerWidth - 12
        && rect.bottom <= window.innerHeight - 12
        && rect.height >= 44
        && miniRect.width >= 64
        && miniRect.height >= 8
        && miniCurrentStyle.fill === 'rgb(221, 0, 0)'
        && panel.textContent?.includes('PATH') === true
        && panel.textContent?.includes('9/10') === true;
      return {
        id: 'path-trace-neutral-bounds',
        pass,
        detail: `left=${Math.round(rect.left)}; right=${Math.round(rect.right)}; bottom=${Math.round(rect.bottom)}; height=${Math.round(rect.height)}; mini=${Math.round(miniRect.width)}x${Math.round(miniRect.height)}; dot=${miniCurrentStyle.fill}; input=${input instanceof HTMLElement ? 'present' : 'hidden'}; inspector=${inspector instanceof HTMLElement ? inspector.getAttribute('aria-hidden') : 'missing'}; stepBg=${stepStyle.backgroundColor}; border=${style.borderColor}; shortcutText=${exposedShortcutText}`,
      };
    }));
  }

  if (scenario.id === 'radial-open') {
    checks.push(await page.evaluate(() => {
      const overlay = document.querySelector('.dc-radial-overlay');
      const center = document.querySelector('.dc-radial-center');
      const sessionPill = document.querySelector('.dc-session-pill');
      const items = Array.from(document.querySelectorAll('.dc-radial-item'));
      if (!(overlay instanceof HTMLElement) || !(center instanceof HTMLElement) || items.length < 6) {
        return { id: 'radial-actions-safe-bounds', pass: false, detail: 'Missing radial overlay/center/items' };
      }
      const centerRect = center.getBoundingClientRect();
      const sessionRect = sessionPill instanceof HTMLElement ? sessionPill.getBoundingClientRect() : new DOMRect();
      const itemRects = items.map(item => item instanceof HTMLElement ? item.getBoundingClientRect() : new DOMRect());
      const inViewport = itemRects.every(rect => rect.left >= 6
        && rect.right <= window.innerWidth - 6
        && rect.top >= 54
        && rect.bottom <= window.innerHeight - 24);
      const clearOfSession = !(sessionPill instanceof HTMLElement) || itemRects.every(rect => (
        rect.right < sessionRect.left - 4
        || rect.left > sessionRect.right + 4
        || rect.bottom < sessionRect.top - 4
        || rect.top > sessionRect.bottom + 4
      ));
      const labels = items.map(item => item.textContent?.replace(/\s+/g, ' ').trim()).join('/');
      return {
        id: 'radial-actions-safe-bounds',
        pass: inViewport && clearOfSession,
        detail: `center=${Math.round(centerRect.left + centerRect.width / 2)},${Math.round(centerRect.top + centerRect.height / 2)}; bounds=${itemRects.map(rect => `${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.right)},${Math.round(rect.bottom)}`).join('|')}; session=${Math.round(sessionRect.left)},${Math.round(sessionRect.top)},${Math.round(sessionRect.right)},${Math.round(sessionRect.bottom)}; labels=${labels}`,
      };
    }));
  }

  if (scenario.id === 'context-menu') {
    checks.push(await page.evaluate(() => {
      const panel = document.querySelector('.dc-context-menu');
      const rows = Array.from(document.querySelectorAll('.dc-context-menu-item'));
      const header = document.querySelector('.dc-context-menu-header');
      const headerIcon = document.querySelector('.dc-context-menu-header-icon');
      const meta = document.querySelector('.dc-context-menu-meta');
      const count = document.querySelector('.dc-context-menu-count');
      if (!(panel instanceof HTMLElement) || rows.length === 0) {
        return { id: 'context-menu-neutral-bounds', pass: false, detail: 'Missing context menu panel/items' };
      }
      const rect = panel.getBoundingClientRect();
      const style = getComputedStyle(panel);
      const redPanel = style.borderColor.includes('221') || style.backgroundImage.includes('221, 0, 0');
      const radius = Number.parseFloat(style.borderTopLeftRadius);
      const rowHeights = rows.map(row => row instanceof HTMLElement ? row.getBoundingClientRect().height : 0);
      const rowFonts = rows.map(row => row instanceof HTMLElement ? getComputedStyle(row).fontFamily : '');
      const compactRows = rowHeights.every(height => height >= 30 && height <= 38);
      const sansRows = rowFonts.every(font => !/(Inconsolata|Mono|Menlo|monospace)/i.test(font));
      const headerPresent = header instanceof HTMLElement && headerIcon instanceof HTMLElement && meta instanceof HTMLElement && count instanceof HTMLElement;
      const metaFont = meta instanceof HTMLElement ? getComputedStyle(meta).fontFamily : '';
      const countFont = count instanceof HTMLElement ? getComputedStyle(count).fontFamily : '';
      const headerRect = header instanceof HTMLElement ? header.getBoundingClientRect() : new DOMRect();
      const compactHeader = headerPresent && headerRect.height >= 38 && headerRect.height <= 52;
      const monoHeaderMeta = /(iA Writer Mono|Inconsolata|Mono|Menlo|monospace)/i.test(metaFont)
        && /(iA Writer Mono|Inconsolata|Mono|Menlo|monospace)/i.test(countFont);
      const redRows = rows.some(row => {
        if (!(row instanceof HTMLElement)) return true;
        const rowStyle = getComputedStyle(row);
        return rowStyle.borderColor.includes('221') || rowStyle.backgroundImage.includes('221, 0, 0') || rowStyle.backgroundColor.includes('221');
      });
      const redHeader = header instanceof HTMLElement && (() => {
        const headerStyle = getComputedStyle(header);
        return headerStyle.borderColor.includes('221') || headerStyle.backgroundColor.includes('221') || headerStyle.backgroundImage.includes('221, 0, 0');
      })();
      const pass = !redPanel
        && !redRows
        && !redHeader
        && rect.left >= 12
        && rect.right <= window.innerWidth - 12
        && rect.top >= 46
        && rect.bottom <= window.innerHeight - 24
        && rows.length >= 6
        && radius <= 8.5
        && compactRows
        && sansRows
        && headerPresent
        && compactHeader
        && monoHeaderMeta;
      return {
        id: 'context-menu-neutral-bounds',
        pass,
        detail: `left=${Math.round(rect.left)}; right=${Math.round(rect.right)}; top=${Math.round(rect.top)}; bottom=${Math.round(rect.bottom)}; rows=${rows.length}; radius=${radius}; header=${headerPresent}/${Math.round(headerRect.height)}; metaFont=${metaFont}; countFont=${countFont}; rowHeights=${rowHeights.map(Math.round).join('/')}; fonts=${rowFonts.join('|')}; border=${style.borderColor}`,
      };
    }));
  }

  if (scenario.id === 'toast-open') {
    checks.push(await page.evaluate(() => {
      const stack = document.querySelector('.dc-toast-stack');
      const item = document.querySelector('.dc-toast-item');
      const rail = document.querySelector('.dc-toast-rail');
      const label = document.querySelector('.dc-toast-label');
      const message = document.querySelector('.dc-toast-message');
      const icon = document.querySelector('.dc-toast-icon');
      const contextMenu = document.querySelector('.dc-context-menu');
      const floatingInput = document.querySelector('.dc-floating-input');
      if (!(stack instanceof HTMLElement)
        || !(item instanceof HTMLElement)
        || !(rail instanceof HTMLElement)
        || !(label instanceof HTMLElement)
        || !(message instanceof HTMLElement)
        || !(icon instanceof HTMLElement)) {
        return { id: 'toast-red-stripe-event-surface', pass: false, detail: 'Missing toast stack/item structure' };
      }
      const stackRect = stack.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const itemStyle = getComputedStyle(item);
      const railStyle = getComputedStyle(rail);
      const labelStyle = getComputedStyle(label);
      const messageStyle = getComputedStyle(message);
      const broadRedFill = itemStyle.backgroundColor.includes('221') || itemStyle.backgroundImage.includes('221, 0, 0');
      const inputRect = floatingInput instanceof HTMLElement ? floatingInput.getBoundingClientRect() : null;
      const mobileToastClearsInput = window.innerWidth > 640
        || inputRect === null
        || stackRect.bottom <= inputRect.top - 8;
      const mobileToastIsCompact = window.innerWidth > 640 || stackRect.width <= 322;
      const pass = !(contextMenu instanceof HTMLElement)
        && railStyle.backgroundColor === 'rgb(221, 0, 0)'
        && rail.getBoundingClientRect().width <= 3
        && !broadRedFill
        && label.textContent?.trim().toLowerCase() === 'event'
        && labelStyle.color === 'rgb(221, 0, 0)'
        && message.textContent?.trim() === 'Saved to memory'
        && /(iA Writer Mono|Inconsolata|Mono|Menlo|monospace)/i.test(labelStyle.fontFamily)
        && !/(Inconsolata|Mono|Menlo|monospace)/i.test(messageStyle.fontFamily)
        && itemRect.height >= 36
        && itemRect.height <= 54
        && stackRect.left >= 12
        && stackRect.right <= window.innerWidth - 12
        && stackRect.bottom <= window.innerHeight - 32
        && mobileToastClearsInput
        && mobileToastIsCompact;
      return {
        id: 'toast-red-stripe-event-surface',
        pass,
        detail: `message=${message.textContent?.trim()}; rail=${railStyle.backgroundColor}/${Math.round(rail.getBoundingClientRect().width)}; broadRedFill=${broadRedFill}; label=${labelStyle.color}/${labelStyle.fontFamily}; messageFont=${messageStyle.fontFamily}; bounds=${Math.round(stackRect.left)},${Math.round(stackRect.right)},${Math.round(stackRect.bottom)}; inputTop=${inputRect ? Math.round(inputRect.top) : 'none'}; clearsInput=${mobileToastClearsInput}; compact=${mobileToastIsCompact}; contextMenu=${contextMenu instanceof HTMLElement ? 'present' : 'closed'}`,
      };
    }));
  }

  if (scenario.id === 'timeline-open') {
    checks.push(await page.evaluate(() => {
      const row = document.querySelector('.dc-timeline-row[data-active="true"]');
      if (!(row instanceof HTMLElement)) {
        return { id: 'timeline-selection-accent-rail', pass: false, detail: 'Missing active timeline row' };
      }
      const style = getComputedStyle(row);
      return {
        id: 'timeline-selection-accent-rail',
        pass: style.borderLeftColor === 'rgb(221, 0, 0)' && parseFloat(style.borderLeftWidth) === 2 && style.backgroundColor === 'rgba(26, 24, 22, 0.58)',
        detail: `borderLeft=${style.borderLeftWidth} ${style.borderLeftColor}; background=${style.backgroundColor}`,
      };
    }));

    checks.push(await page.evaluate(() => {
      const scrubber = document.querySelector('.dc-timeline-scrubber');
      const cells = Array.from(document.querySelectorAll('.dc-timeline-cell'));
      const activeTick = document.querySelector('.dc-timeline-tick[data-active="true"]');
      const playhead = document.querySelector('.dc-timeline-playhead');
      const input = document.querySelector('.dc-floating-input');
      const panel = document.querySelector('.dc-timeline-panel');
      if (
        !(scrubber instanceof HTMLElement)
        || !(activeTick instanceof HTMLElement)
        || !(playhead instanceof HTMLElement)
        || !(input instanceof HTMLElement)
        || !(panel instanceof HTMLElement)
      ) {
        return { id: 'timeline-bottom-scrubber-visible', pass: false, detail: 'Missing scrubber, active tick, playhead, input, or panel' };
      }
      const rect = scrubber.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const activeTickStyle = getComputedStyle(activeTick);
      const playheadStyle = getComputedStyle(playhead);
      const avoidsInput = rect.bottom <= inputRect.top - 2;
      const avoidsDesktopPanel = window.innerWidth <= 640 || rect.right <= panelRect.left - 8;
      const activeIsAccent = activeTickStyle.backgroundColor === 'rgb(221, 0, 0)' && playheadStyle.backgroundColor === 'rgb(221, 0, 0)';
      const exposedInstructionText = /drag|click|replay|jump/i.test(scrubber.textContent || '');
      const pass = rect.left >= 12
        && rect.right <= window.innerWidth - 12
        && rect.top >= 46
        && avoidsInput
        && avoidsDesktopPanel
        && cells.length >= 30
        && activeIsAccent
        && !exposedInstructionText;
      return {
        id: 'timeline-bottom-scrubber-visible',
        pass,
        detail: `left=${Math.round(rect.left)}; right=${Math.round(rect.right)}; top=${Math.round(rect.top)}; bottom=${Math.round(rect.bottom)}; inputTop=${Math.round(inputRect.top)}; panelLeft=${Math.round(panelRect.left)}; cells=${cells.length}; active=${activeTickStyle.backgroundColor}; playhead=${playheadStyle.backgroundColor}; instructionText=${exposedInstructionText}`,
      };
    }));

    if (viewport.id === 'mobile') {
      checks.push(await page.evaluate(() => {
        const panel = document.querySelector('.dc-timeline-panel');
        if (!(panel instanceof HTMLElement)) {
          return { id: 'mobile-timeline-chrome-bounds', pass: false, detail: 'Missing .dc-timeline-panel' };
        }
        const rect = panel.getBoundingClientRect();
        const pass = Math.round(rect.top) >= 46 && Math.round(rect.bottom) <= window.innerHeight - 24 && Math.round(rect.left) === 0;
        return {
          id: 'mobile-timeline-chrome-bounds',
          pass,
          detail: `top=${Math.round(rect.top)}; bottom=${Math.round(rect.bottom)}; viewportHeight=${window.innerHeight}; left=${Math.round(rect.left)}`,
        };
      }));

      checks.push(await page.evaluate(() => {
        const activeRow = document.querySelector('.dc-timeline-row[data-active="true"]');
        const scrubber = document.querySelector('.dc-timeline-scrubber');
        if (!(activeRow instanceof HTMLElement) || !(scrubber instanceof HTMLElement)) {
          return { id: 'mobile-timeline-active-row-clearance', pass: false, detail: 'Missing active timeline row or scrubber' };
        }
        const rowRect = activeRow.getBoundingClientRect();
        const scrubberRect = scrubber.getBoundingClientRect();
        const pass = rowRect.bottom <= scrubberRect.top - 8;
        return {
          id: 'mobile-timeline-active-row-clearance',
          pass,
          detail: `rowBottom=${Math.round(rowRect.bottom)}; scrubberTop=${Math.round(scrubberRect.top)}; gap=${Math.round(scrubberRect.top - rowRect.bottom)}`,
        };
      }));
    }
  }

  if (scenario.id === 'inspector') {
    checks.push(await page.evaluate(() => {
      const panel = document.querySelector('.dc-inspector-panel');
      const label = document.querySelector('.dc-inspector-thinking-label');
      const liveLineage = document.querySelector('.dc-inspector-live-lineage');
      const liveRail = document.querySelector('.dc-inspector-live-rail');
      const liveDot = document.querySelector('.dc-inspector-live-dot');
      const liveText = Array.from(document.querySelectorAll('.dc-inspector-panel span'))
        .find(element => element.textContent?.trim().toLowerCase() === 'streaming');
      if (!(panel instanceof HTMLElement) || !(label instanceof HTMLElement) || !(liveText instanceof HTMLElement) || !(liveLineage instanceof HTMLElement) || !(liveRail instanceof HTMLElement) || !(liveDot instanceof HTMLElement)) {
        return { id: 'inspector-static-labels-neutral', pass: false, detail: 'Missing inspector panel, thinking label, live row, or live status text' };
      }
      const labelStyle = getComputedStyle(label);
      const liveStyle = getComputedStyle(liveText);
      const rowStyle = getComputedStyle(liveLineage);
      const railStyle = getComputedStyle(liveRail);
      const dotStyle = getComputedStyle(liveDot);
      const labelIsRed = labelStyle.color === 'rgb(221, 0, 0)';
      const liveCanUseRed = liveStyle.color === 'rgb(221, 0, 0)' || liveStyle.color === 'rgba(221, 0, 0, 0.78)';
      const rowIsNeutral = !rowStyle.backgroundColor.includes('224, 133, 66')
        && !rowStyle.borderColor.includes('224, 133, 66')
        && rowStyle.backgroundImage === 'none';
      const railIsRed = railStyle.backgroundColor === 'rgb(221, 0, 0)' && liveRail.getBoundingClientRect().width <= 2.5;
      const dotIsRed = dotStyle.backgroundColor === 'rgb(221, 0, 0)';
      return {
        id: 'inspector-static-labels-neutral',
        pass: !labelIsRed && liveCanUseRed && rowIsNeutral && railIsRed && dotIsRed,
        detail: `thinking=${labelStyle.color}; live=${liveStyle.color}; rowBg=${rowStyle.backgroundColor}; rowBorder=${rowStyle.borderColor}; rail=${railStyle.backgroundColor}/${Math.round(liveRail.getBoundingClientRect().width)}; dot=${dotStyle.backgroundColor}; text=${label.textContent?.trim() ?? ''}`,
      };
    }));
    checks.push(await page.evaluate(() => {
      const retry = document.querySelector('.dc-inspector-retry-button');
      if (!(retry instanceof HTMLElement)) {
        return { id: 'inspector-retry-neutral-unless-error', pass: false, detail: 'Missing retry action button' };
      }
      const panelText = document.querySelector('.dc-inspector-panel')?.textContent ?? '';
      const style = getComputedStyle(retry);
      const retryIsRed = style.color === 'rgb(221, 0, 0)' || style.borderColor === 'rgb(221, 0, 0)' || style.borderColor.includes('221, 0, 0');
      const errorTextVisible = /\[Error:/i.test(panelText);
      return {
        id: 'inspector-retry-neutral-unless-error',
        pass: errorTextVisible || !retryIsRed,
        detail: `retryColor=${style.color}; retryBorder=${style.borderColor}; errorText=${errorTextVisible}`,
      };
    }));
  }

  if (viewport.id === 'mobile' && scenario.id === 'inspector') {
    checks.push(await page.evaluate(() => {
      const actions = Array.from(document.querySelectorAll('.dc-inspector-panel button'));
      const footerActions = actions.filter(button => button.textContent?.match(/Retry|Copy|Branch|Compare/));
      const heights = footerActions.map(button => Math.round(button.getBoundingClientRect().height));
      const pass = footerActions.length >= 3 && heights.every(height => height >= 34);
      return {
        id: 'mobile-inspector-actions',
        pass,
        detail: `actions=${footerActions.length}; heights=${heights.join(',')}`,
      };
    }));
  }

  return checks.map(check => ({
    viewport: viewport.id,
    scenario: scenario.id,
    ...check,
  }));
}

async function writeContactSheet(captures, references, visualChecks) {
  const captureCards = captures.map(capture => `
    <figure>
      <img src="${capture.file}" alt="${capture.viewport} ${capture.scenario}">
      <figcaption>${capture.viewport} / ${capture.scenario}</figcaption>
    </figure>
  `).join('\n');

  const referenceCards = references.map(reference => `
    <figure>
      <img src="${reference.file}" alt="${reference.source}">
      <figcaption>${reference.source}</figcaption>
    </figure>
  `).join('\n');

  const checkRows = visualChecks.map(check => `
    <tr class="${check.pass ? 'pass' : 'fail'}">
      <td>${check.viewport}</td>
      <td>${check.scenario}</td>
      <td>${check.id}</td>
      <td>${check.pass ? 'pass' : 'fail'}</td>
      <td>${check.detail}</td>
    </tr>
  `).join('\n');

  await writeFile(join(OUT_DIR, 'index.html'), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Greenland Design Capture ${STAMP}</title>
  <style>
    :root { color-scheme: dark; --bg: #080706; --fg: #e1e1e1; --muted: #808080; --line: #252320; --red: #dd0000; }
    body { margin: 0; padding: 40px; background: var(--bg); color: var(--fg); font-family: ui-sans-serif, system-ui, sans-serif; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    h2 { margin: 40px 0 16px; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: var(--red); }
    p { color: var(--muted); max-width: 900px; line-height: 1.6; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; }
    figure { margin: 0; border: 1px solid var(--line); background: #0c0b09; }
    img { display: block; width: 100%; height: auto; }
    figcaption { padding: 10px 12px; color: var(--muted); font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; border-top: 1px solid var(--line); }
    table { width: 100%; border-collapse: collapse; margin: 0 0 28px; font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; }
    th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { color: var(--muted); font-weight: 500; }
    tr.pass td:nth-child(4) { color: #d4a574; }
    tr.fail td:nth-child(4) { color: var(--red); font-weight: 700; }
  </style>
</head>
<body>
  <h1>Greenland Design Capture</h1>
  <p>${STAMP}. Review captures against the reference images. The loop is green only when desktop and mobile captures pass the rubric in docs/design/greenland/rubric.md.</p>
  <h2>Visual Checks</h2>
  <table>
    <thead><tr><th>Viewport</th><th>Scenario</th><th>Check</th><th>Status</th><th>Detail</th></tr></thead>
    <tbody>${checkRows}</tbody>
  </table>
  <h2>Current App States</h2>
  <section class="grid">${captureCards}</section>
  <h2>Reference Targets</h2>
  <section class="grid">${referenceCards}</section>
</body>
</html>
`);
}

async function main() {
  const { chromium } = await importPlaywright();
  await mkdir(OUT_DIR, { recursive: true });

  let server = null;
  if (!(await canReach(BASE_URL))) {
    server = startServerIfNeeded();
    const ready = await waitForServer(BASE_URL);
    if (!ready) throw new Error(`Next dev server did not become ready at ${BASE_URL}`);
  }

  const browser = await chromium.launch();
  const captures = [];
  const visualChecks = [];

  for (const viewport of VIEWPORTS) {
    for (const scenario of SCENARIOS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        locale: 'en-US',
        timezoneId: 'America/New_York',
      });
      const page = await context.newPage();
      if (scenario.before) await scenario.before(page);
      await page.goto(new URL(scenario.path, BASE_URL).toString(), { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__GREENLAND_READY === true, null, { timeout: 5000 }).catch(() => {});
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      if (scenario.action) await scenario.action(page);
      await page.waitForTimeout(350);
      await suppressToolingOverlays(page);
      visualChecks.push(...await collectVisualChecks(page, viewport, scenario));
      const file = `${viewport.id}-${scenario.id}.png`;
      await page.screenshot({ path: join(OUT_DIR, file), fullPage: true });
      captures.push({ file, viewport: viewport.id, scenario: scenario.id, width: viewport.width, height: viewport.height });
      await context.close();
    }
  }

  const references = await copyReferences();
  const standaloneReference = await captureStandaloneReference(browser);
  if (standaloneReference) references.unshift(standaloneReference);

  await browser.close();
  if (server) server.kill();

  await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify({
    stamp: STAMP,
    baseUrl: BASE_URL,
    captures,
    references,
    visualChecks,
  }, null, 2));
  await writeContactSheet(captures, references, visualChecks);

  console.log(`Greenland capture written to ${OUT_DIR}`);
  console.log(`Open ${join(OUT_DIR, 'index.html')}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
