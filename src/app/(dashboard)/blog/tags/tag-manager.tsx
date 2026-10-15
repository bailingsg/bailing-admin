'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { BlogTag } from '@/lib/blog';
import {
  createBlogTagAction,
  deleteBlogTagAction,
  updateBlogTagAction,
  type SimpleFormState,
} from '../actions';

/**
 * 博客标签管理（客户端）：新建表单 + 行内编辑 + 删除。
 *
 * 删除标签会级联移除「文章↔标签」关联，文章本身不受影响。
 */

const INITIAL_STATE: SimpleFormState = { ok: false };

const inputClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40';

export function BlogTagManager({ tags }: { tags: BlogTag[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>新建标签</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTagForm />
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-left">
          <thead className="bg-table-header">
            <tr className="text-caption text-text-secondary">
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">引用文章数</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {tags.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-small text-text-secondary">
                  还没有标签，先在上方创建第一个标签。
                </td>
              </tr>
            ) : (
              tags.map((tag) =>
                editingId === tag.id ? (
                  <EditTagRow
                    key={tag.id}
                    tag={tag}
                    onDone={() => {
                      setEditingId(null);
                      router.refresh();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={tag.id} className="border-t border-border hover:bg-table-row-hover">
                    <td className="px-4 py-3 text-small font-medium text-foreground">{tag.name}</td>
                    <td className="px-4 py-3 text-small text-text-secondary">{tag.slug}</td>
                    <td className="px-4 py-3 text-small text-text-secondary">{tag.postCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(tag.id)}
                        >
                          编辑
                        </Button>
                        <DeleteTagButton tag={tag} />
                      </div>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateTagForm() {
  const [state, formAction, pending] = React.useActionState(createBlogTagAction, INITIAL_STATE);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-tag-name" required>
          名称
        </Label>
        <input
          id="new-tag-name"
          name="name"
          required
          maxLength={80}
          placeholder="如：出口"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-tag-slug" required>
          Slug
        </Label>
        <input
          id="new-tag-slug"
          name="slug"
          required
          maxLength={160}
          placeholder="如：export"
          pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          className={inputClass}
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>
          {pending ? '创建中…' : '创建标签'}
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="text-small text-destructive sm:col-span-2 lg:col-span-4">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function EditTagRow({
  tag,
  onDone,
  onCancel,
}: {
  tag: BlogTag;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = React.useActionState(
    updateBlogTagAction.bind(null, tag.id),
    INITIAL_STATE,
  );

  React.useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <tr className="border-t border-border bg-accent/40">
      <td colSpan={4} className="px-4 py-4">
        <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-tag-name-${tag.id}`} required>
              名称
            </Label>
            <input
              id={`edit-tag-name-${tag.id}`}
              name="name"
              required
              maxLength={80}
              defaultValue={tag.name}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-tag-slug-${tag.id}`} required>
              Slug
            </Label>
            <input
              id={`edit-tag-slug-${tag.id}`}
              name="slug"
              required
              maxLength={160}
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              defaultValue={tag.slug}
              className={inputClass}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? '保存中…' : '保存'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={pending}>
              取消
            </Button>
            <span className="text-caption text-text-muted">引用文章数：{tag.postCount}</span>
          </div>
          {state.error ? (
            <p role="alert" className="text-small text-destructive sm:col-span-2 lg:col-span-4">
              {state.error}
            </p>
          ) : null}
        </form>
      </td>
    </tr>
  );
}

function DeleteTagButton({ tag }: { tag: BlogTag }) {
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteBlogTagAction(tag.id);
      if (!result.ok) {
        setError(result.error ?? '删除失败');
        setConfirming(false);
      }
    });
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={handleDelete}
          disabled={pending}
          aria-label={`确认删除 ${tag.name}`}
        >
          {pending ? '…' : '确认'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          取消
        </Button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
        className="text-destructive hover:bg-destructive/10"
      >
        删除
      </Button>
      {error ? (
        <span role="alert" className="text-caption text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
