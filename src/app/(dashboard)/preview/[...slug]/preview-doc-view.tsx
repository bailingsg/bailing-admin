import type {
  PreviewDoc,
  PreviewField,
  PreviewFileRef,
} from '@/lib/preview-doc';

/**
 * 内容预览的渲染层。
 *
 * 与 `lib/preview-doc.ts` 的分工：那边只负责「把 DTO 归一成可读结构」，
 * 这边只负责「把结构画出来」。两侧（线上版本 / 编辑稿）用同一个组件渲染，
 * 因此视觉完全可比，差异字段用 `changed` 集合高亮。
 *
 * 富文本安全：正文 HTML 走**沙箱 iframe**（`sandbox` 留空 = 禁用脚本 +
 * 独立源），而不是 `dangerouslySetInnerHTML`。原因：线上版本的正文在入库时
 * 已被后端 sanitizeRichText 净化，但**编辑稿 payload 是原始 DTO 快照，
 * 尚未净化**（净化发生在发布时）。直接注入会给后台开一个存储型 XSS 口子
 * ——低权限编辑存一段脚本，管理员打开预览即中招。iframe 沙箱从根上避免这一点，
 * 顺带让正文按独立文档排版，不被后台样式污染。
 */

/* ------------------------------ 富文本 ------------------------------ */

/** 预览正文的基础排版（iframe 内独立文档，不依赖后台 Tailwind） */
const PROSE_STYLE = `
  :root { color-scheme: light; }
  body {
    margin: 0;
    padding: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC",
      "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    font-size: 15px;
    line-height: 1.75;
    color: #1f2937;
    word-break: break-word;
  }
  img { max-width: 100%; height: auto; border-radius: 6px; }
  h1, h2, h3, h4, h5, h6 { line-height: 1.35; margin: 1.4em 0 0.6em; font-weight: 600; }
  h1 { font-size: 1.6em; }
  h2 { font-size: 1.35em; }
  h3 { font-size: 1.15em; }
  h4, h5, h6 { font-size: 1em; }
  p { margin: 0.85em 0; }
  ul, ol { margin: 0.85em 0; padding-left: 1.5em; }
  li { margin: 0.3em 0; }
  a { color: #0f5c9c; text-decoration: underline; }
  blockquote {
    margin: 1em 0;
    padding: 0.4em 1em;
    border-left: 3px solid #d1d5db;
    color: #4b5563;
  }
  table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.94em; }
  th, td { border: 1px solid #e5e7eb; padding: 0.5em 0.7em; text-align: left; vertical-align: top; }
  th { background: #f9fafb; font-weight: 600; }
  pre {
    margin: 1em 0;
    padding: 0.8em 1em;
    overflow: auto;
    background: #f6f8fa;
    border-radius: 6px;
    font-size: 0.9em;
  }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  hr { margin: 1.5em 0; border: 0; border-top: 1px solid #e5e7eb; }
  figure { margin: 1em 0; }
  figcaption { font-size: 0.88em; color: #6b7280; text-align: center; }
`;

function RichTextFrame({ html }: { html: string }) {
  return (
    <iframe
      title="正文预览"
      // sandbox 留空：禁用脚本 / 表单 / 顶层跳转，且无同源权限
      sandbox=""
      srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>${PROSE_STYLE}</style></head><body>${html}</body></html>`}
      className="h-[24rem] w-full rounded-md border border-border bg-white"
    />
  );
}

/* ------------------------------ 字段渲染 ------------------------------ */

function Empty() {
  return <span className="text-caption text-text-muted">—</span>;
}

function FieldValue({ field }: { field: PreviewField }) {
  const { kind, value } = field;

  if (value === null || (typeof value === 'string' && value.trim() === '')) return <Empty />;

  switch (kind) {
    case 'richtext':
      return <RichTextFrame html={String(value)} />;

    case 'longtext':
      return (
        <p className="text-small whitespace-pre-wrap text-foreground">{String(value)}</p>
      );

    case 'image':
      return (
        <img
          src={String(value)}
          alt={field.label}
          className="max-h-56 w-auto rounded-md border border-border object-contain"
        />
      );

    case 'file': {
      const file = value as PreviewFileRef;
      return (
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-small break-all text-primary hover:underline"
        >
          {file.name}
        </a>
      );
    }

    case 'images': {
      const urls = value as string[];
      if (urls.length === 0) return <Empty />;
      return (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, index) => (
            <img
              key={`${url}-${index}`}
              src={url}
              alt={`${field.label} ${index + 1}`}
              className="h-24 w-auto rounded-md border border-border object-cover"
            />
          ))}
        </div>
      );
    }

    case 'list': {
      const items = value as string[];
      if (items.length === 0) return <Empty />;
      return (
        <ul className="flex flex-col gap-1">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="text-small text-foreground">
              · {item}
            </li>
          ))}
        </ul>
      );
    }

    case 'kv': {
      const record = value as Record<string, string>;
      const entries = Object.entries(record);
      if (entries.length === 0) return <Empty />;
      return (
        <table className="w-full text-small">
          <tbody>
            {entries.map(([key, val]) => (
              <tr key={key} className="border-b border-border/60 last:border-0">
                <th className="w-1/3 py-1.5 pr-3 text-left align-top font-medium text-text-secondary">
                  {key}
                </th>
                <td className="py-1.5 text-foreground">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    case 'text':
    default:
      return <p className="text-small break-words text-foreground">{String(value)}</p>;
  }
}

/* ------------------------------ 文档 ------------------------------ */

function ChangedBadge() {
  return (
    <span className="rounded-full bg-warning-50 px-1.5 py-0.5 text-caption font-medium text-warning-600">
      已修改
    </span>
  );
}

export interface PreviewDocViewProps {
  doc: PreviewDoc;
  /** 发生变化的键集合（含 title / subtitle / cover 三个伪键）；空集表示不高亮 */
  changed: Set<string>;
}

export function PreviewDocView({ doc, changed }: PreviewDocViewProps) {
  const highlight = changed.size > 0;

  return (
    <div className="flex flex-col gap-5">
      {doc.cover ? (
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-caption text-text-muted">封面图</span>
            {highlight && changed.has('cover') ? <ChangedBadge /> : null}
          </div>
          <img
            src={doc.cover.url}
            alt={doc.cover.alt ?? doc.title}
            className="max-h-64 w-full rounded-md border border-border object-cover"
          />
        </div>
      ) : null}

      <div
        className={
          highlight && (changed.has('title') || changed.has('subtitle'))
            ? 'rounded-md border border-warning-600/30 bg-warning-50/40 p-3'
            : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-heading-sm text-foreground">{doc.title}</h2>
          {highlight && changed.has('title') ? <ChangedBadge /> : null}
        </div>
        {doc.subtitle ? (
          <div className="mt-1.5 flex items-start gap-2">
            <p className="text-small text-text-secondary">{doc.subtitle}</p>
            {highlight && changed.has('subtitle') ? <ChangedBadge /> : null}
          </div>
        ) : null}
      </div>

      <dl className="flex flex-col divide-y divide-border border-t border-border">
        {doc.fields.map((field) => {
          const isChanged = highlight && changed.has(field.key);
          return (
            <div key={field.key} className="flex flex-col gap-1.5 py-3">
              <dt className="flex items-center gap-2">
                <span className="text-caption font-medium text-text-secondary">{field.label}</span>
                {isChanged ? <ChangedBadge /> : null}
              </dt>
              <dd
                className={
                  isChanged
                    ? 'rounded-md border border-warning-600/30 bg-warning-50/40 p-2'
                    : undefined
                }
              >
                <FieldValue field={field} />
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
