'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { MediaAsset } from '@/lib/media';
import { MediaPickerModal } from './media-picker';

/**
 * 富文本编辑器（Phase 4.4）。
 *
 * 支持：标题（H2/H3）、段落、加粗/斜体/下划线、无序/有序列表、引用、代码块、
 * 链接、图片（**只能从媒体库选择**，本模块不提供上传入口）、清除格式。
 *
 * 实现说明：
 *   · 基于 contentEditable + document.execCommand（零第三方依赖，项目既有约定）
 *   · 编辑区与「HTML 源码」双模式，切换时双向同步
 *   · 最终值写入隐藏 input（name 由父级表单指定），随表单提交
 *   · 安全：HTML 在**后端**入库前经白名单净化（rich-text.sanitizer.ts），
 *     编辑器自身不做安全承诺
 */

interface RichTextEditorProps {
  /** 隐藏 input 的字段名（父级表单据此读取正文） */
  name: string;
  initialHtml: string;
}

type EditorMode = 'visual' | 'html';

export function RichTextEditor({ name, initialHtml }: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [html, setHtml] = React.useState(initialHtml);
  const [mode, setMode] = React.useState<EditorMode>('visual');
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // 仅在挂载时写入初始内容（此后编辑区自持状态，避免 React 重渲染打断光标）
  React.useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialHtml;
  }, [initialHtml]);

  const syncFromEditor = React.useCallback(() => {
    if (editorRef.current) setHtml(editorRef.current.innerHTML);
  }, []);

  const exec = React.useCallback(
    (command: string, value?: string) => {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      syncFromEditor();
    },
    [syncFromEditor],
  );

  function showVisual() {
    if (editorRef.current) editorRef.current.innerHTML = html;
    setMode('visual');
  }

  function showHtml() {
    syncFromEditor();
    setMode('html');
  }

  function handleLink() {
    const url = window.prompt('请输入链接地址（http:// 或 https:// 开头）');
    if (!url) return;
    exec('createLink', url.trim());
  }

  function handleImageSelect(asset: MediaAsset) {
    const alt = (asset.altText ?? asset.originalName).replace(/"/g, '');
    const safeUrl = asset.url.replace(/"/g, '%22');
    exec('insertHTML', `<img src="${safeUrl}" alt="${alt}">`);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${name}-editor`} required>
          正文
        </Label>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={mode === 'visual' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={showVisual}
          >
            可视化
          </Button>
          <Button
            type="button"
            variant={mode === 'html' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={showHtml}
          >
            HTML 源码
          </Button>
        </div>
      </div>

      {/* 工具栏 */}
      {mode === 'visual' ? (
        <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 border-border bg-muted/40 px-2 py-1.5">
          <ToolbarButton label="H2" title="二级标题" onClick={() => exec('formatBlock', 'h2')} />
          <ToolbarButton label="H3" title="三级标题" onClick={() => exec('formatBlock', 'h3')} />
          <ToolbarButton label="段落" title="正文段落" onClick={() => exec('formatBlock', 'p')} />
          <Divider />
          <ToolbarButton label="B" title="加粗" bold onClick={() => exec('bold')} />
          <ToolbarButton label="I" title="斜体" italic onClick={() => exec('italic')} />
          <ToolbarButton label="U" title="下划线" underline onClick={() => exec('underline')} />
          <Divider />
          <ToolbarButton label="• 列表" title="无序列表" onClick={() => exec('insertUnorderedList')} />
          <ToolbarButton label="1. 列表" title="有序列表" onClick={() => exec('insertOrderedList')} />
          <ToolbarButton label="引用" title="引用块" onClick={() => exec('formatBlock', 'blockquote')} />
          <ToolbarButton label="代码块" title="代码块" onClick={() => exec('formatBlock', 'pre')} />
          <Divider />
          <ToolbarButton label="链接" title="插入链接" onClick={handleLink} />
          <ToolbarButton
            label="图片"
            title="从媒体库插入图片"
            onClick={() => setPickerOpen(true)}
          />
          <ToolbarButton label="清除格式" title="清除格式" onClick={() => exec('removeFormat')} />
        </div>
      ) : null}

      {/* 可视化编辑区（HTML 模式下隐藏但保留挂载，便于双向同步） */}
      <div
        id={`${name}-editor`}
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label="正文编辑器"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="在此撰写文章正文…"
        onInput={syncFromEditor}
        onBlur={syncFromEditor}
        className={[
          'min-h-64 w-full rounded-b-md border border-border bg-background px-4 py-3 text-body text-foreground outline-none',
          'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40',
          'empty:before:text-text-muted empty:before:content-[attr(data-placeholder)]',
          '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold',
          '[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-lg [&_h3]:font-semibold',
          '[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
          '[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-text-secondary',
          '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-small',
          '[&_a]:text-primary [&_a]:underline',
          '[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md',
          mode === 'visual' ? '' : 'hidden',
        ].join(' ')}
      />

      {/* HTML 源码模式 */}
      {mode === 'html' ? (
        <textarea
          value={html}
          onChange={(event) => setHtml(event.target.value)}
          rows={18}
          spellCheck={false}
          aria-label="正文 HTML 源码"
          className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-small text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      ) : null}

      <p className="text-caption text-text-muted">
        图片请通过工具栏「图片」从媒体库选择；保存时后端会自动过滤不安全标签与属性。
      </p>

      {/* 提交值 */}
      <input type="hidden" name={name} value={html} readOnly />

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleImageSelect}
      />
    </div>
  );
}

function ToolbarButton({
  label,
  title,
  onClick,
  bold,
  italic,
  underline,
}: {
  label: string;
  title: string;
  onClick: () => void;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={[
        'inline-flex h-8 min-w-8 items-center justify-center rounded-sm px-2 text-small text-foreground',
        'transition-colors duration-[var(--duration-fast)] hover:bg-accent',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        bold ? 'font-bold' : '',
        italic ? 'italic' : '',
        underline ? 'underline' : '',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />;
}
