'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * FileUpload —— 文件上传占位组件（Phase 3.2 仅 UI）
 *
 * 重要：本组件**不包含任何上传逻辑**，不发送网络请求。
 * 上传实现（后端接口 / 腾讯云 COS）在后续阶段接入；此处仅提供
 * 统一的可视化区域、文件选择与已选文件展示，供 RFQ 表单复用。
 */
export interface FileUploadProps
  extends Omit<React.ComponentProps<'input'>, 'type' | 'onChange'> {
  /** 标题文案 */
  label?: string;
  /** 辅助说明（支持格式、大小限制等） */
  hint?: string;
  /** 选择文件后的回调（仅回传文件对象，不做上传） */
  onFilesSelected?: (files: File[]) => void;
}

function FileUpload({
  className,
  label = '上传文件',
  hint = '支持 PDF / JPG / PNG / DWG，单个文件不超过 20MB',
  onFilesSelected,
  disabled,
  id,
  ...props
}: FileUploadProps) {
  const inputId = React.useId();
  const resolvedId = id ?? inputId;
  const [fileNames, setFileNames] = React.useState<string[]>([]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setFileNames(files.map((file) => file.name));
    onFilesSelected?.(files);
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label
        htmlFor={resolvedId}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg',
          'border border-dashed border-border-strong bg-surface px-6 py-8 text-center',
          'transition-colors duration-[var(--duration-fast)]',
          'hover:border-primary hover:bg-accent',
          'focus-within:ring-2 focus-within:ring-ring/40',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="size-6 text-text-muted"
        >
          <path
            d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-small font-medium text-foreground">{label}</span>
        <span className="text-caption text-text-muted">{hint}</span>
        <span className="text-caption text-text-muted">（上传功能将在后续阶段接入）</span>
      </label>

      <input
        id={resolvedId}
        type="file"
        data-slot="file-upload"
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
        {...props}
      />

      {fileNames.length > 0 ? (
        <ul className="flex flex-col gap-1 text-caption text-text-secondary">
          {fileNames.map((name) => (
            <li key={name} className="truncate">
              已选择：{name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export { FileUpload };
