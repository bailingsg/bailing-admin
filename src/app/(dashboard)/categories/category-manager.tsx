'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { CmsCategory } from '@/lib/products';
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  type CategoryFormState,
} from './actions';

/**
 * 分类管理（客户端）：新建表单 + 行内编辑 + 删除。
 *
 * 所有写操作经服务端 Action 完成（JWT 不出服务端）；
 * 「编辑」展开行内表单，避免页面跳转。
 */

const INITIAL_STATE: CategoryFormState = { ok: false };

export function CategoryManager({ categories }: { categories: CmsCategory[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {/* 新建分类 */}
      <Card>
        <CardHeader>
          <CardTitle>新建分类</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateCategoryForm />
        </CardContent>
      </Card>

      {/* 分类列表 */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full border-collapse text-left">
          <thead className="bg-table-header">
            <tr className="text-caption text-text-secondary">
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">描述</th>
              <th className="px-4 py-3 font-medium">排序</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">产品数</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-small text-text-secondary">
                  还没有分类，先在上方创建第一个分类。
                </td>
              </tr>
            ) : (
              categories.map((category) =>
                editingId === category.id ? (
                  <EditCategoryRow
                    key={category.id}
                    category={category}
                    onDone={() => {
                      setEditingId(null);
                      router.refresh();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={category.id} className="border-t border-border hover:bg-table-row-hover">
                    <td className="px-4 py-3 text-small font-medium text-foreground">
                      {category.name}
                    </td>
                    <td className="px-4 py-3 text-small text-text-secondary">{category.slug}</td>
                    <td className="max-w-64 truncate px-4 py-3 text-small text-text-secondary">
                      {category.description ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-small text-text-secondary">{category.sortOrder}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          category.isActive
                            ? 'inline-flex w-fit rounded-full bg-success-50 px-2.5 py-0.5 text-caption font-medium text-success-600'
                            : 'inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-caption font-medium text-muted-foreground'
                        }
                      >
                        {category.isActive ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-small text-text-secondary">
                      {category.productCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(category.id)}
                        >
                          编辑
                        </Button>
                        <DeleteCategoryButton category={category} />
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

function CreateCategoryForm() {
  const [state, formAction, pending] = React.useActionState(createCategoryAction, INITIAL_STATE);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-name" required>
          名称
        </Label>
        <input
          id="new-name"
          name="name"
          required
          maxLength={120}
          placeholder="如：Plywood"
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-slug" required>
          Slug
        </Label>
        <input
          id="new-slug"
          name="slug"
          required
          maxLength={160}
          placeholder="如：plywood"
          pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-sortOrder">排序（越小越靠前）</Label>
        <input
          id="new-sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          max={9999}
          defaultValue={0}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <div className="flex items-end gap-2">
        <div className="flex items-center gap-2">
          <input
            id="new-isActive"
            name="isActive"
            type="checkbox"
            defaultChecked
            className="size-4 rounded border-border accent-[var(--color-primary)]"
          />
          <Label htmlFor="new-isActive">启用</Label>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
        <Label htmlFor="new-description">描述</Label>
        <input
          id="new-description"
          name="description"
          maxLength={2000}
          placeholder="分类描述（可选）"
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>
          {pending ? '创建中…' : '创建分类'}
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

function EditCategoryRow({
  category,
  onDone,
  onCancel,
}: {
  category: CmsCategory;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = React.useActionState(
    updateCategoryAction.bind(null, category.id),
    INITIAL_STATE,
  );

  // 保存成功后退出编辑态（服务端已 revalidate，父组件刷新取最新列表）
  React.useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <tr className="border-t border-border bg-accent/40">
      <td colSpan={7} className="px-4 py-4">
        <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-name-${category.id}`} required>
              名称
            </Label>
            <input
              id={`edit-name-${category.id}`}
              name="name"
              required
              maxLength={120}
              defaultValue={category.name}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-slug-${category.id}`} required>
              Slug
            </Label>
            <input
              id={`edit-slug-${category.id}`}
              name="slug"
              required
              maxLength={160}
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              defaultValue={category.slug}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-sortOrder-${category.id}`}>排序</Label>
            <input
              id={`edit-sortOrder-${category.id}`}
              name="sortOrder"
              type="number"
              min={0}
              max={9999}
              defaultValue={category.sortOrder}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <div className="flex items-center gap-2 sm:pt-6">
            <input
              id={`edit-isActive-${category.id}`}
              name="isActive"
              type="checkbox"
              defaultChecked={category.isActive}
              className="size-4 rounded border-border accent-[var(--color-primary)]"
            />
            <Label htmlFor={`edit-isActive-${category.id}`}>启用</Label>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
            <Label htmlFor={`edit-description-${category.id}`}>描述</Label>
            <input
              id={`edit-description-${category.id}`}
              name="description"
              maxLength={2000}
              defaultValue={category.description ?? ''}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? '保存中…' : '保存'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={pending}>
              取消
            </Button>
            <span className="text-caption text-text-muted">
              产品数：{category.productCount}
              {category.productCount > 0 ? '（有产品的分类不可删除）' : ''}
            </span>
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

function DeleteCategoryButton({ category }: { category: CmsCategory }) {
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id);
      if (!result.ok) {
        setError(result.error ?? '删除失败');
        setConfirming(false);
      }
    });
  }

  if (category.productCount > 0) {
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <Button type="button" variant="outline" size="sm" disabled className="text-destructive">
          删除
        </Button>
        <span className="text-caption text-text-muted">含 {category.productCount} 个产品</span>
      </span>
    );
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
          aria-label={`确认删除 ${category.name}`}
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
