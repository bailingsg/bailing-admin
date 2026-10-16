'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PermissionModule } from '@/lib/rbac';
import { assignRolePermissionsAction } from '../actions';

/**
 * 权限矩阵编辑器（Phase 4.6）。
 *
 * 矩阵数据来自后端 /cms/roles/permission-matrix（代码注册表，与权限校验同源），
 * 按「功能权限 / 导航权限」两大类、再按模块分组渲染：
 *   · 功能权限：控制可调用的接口（如 products.read）
 *   · 导航权限：控制侧边栏入口是否显示（如 nav.products）
 *
 * 保存为覆盖式（PUT 语义），后端会校验不得超出操作人自身权限范围。
 */
export function PermissionEditor({
  roleId,
  roleName,
  isProtected,
  assigned,
  modules,
}: {
  roleId: string;
  roleName: string;
  isProtected: boolean;
  assigned: string[];
  modules: PermissionModule[];
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string[]>(assigned);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  /** 上次成功提交的权限集合：用于在 router.refresh() 后仍保留「已保存」提示 */
  const submittedRef = React.useRef<string[] | null>(null);

  React.useEffect(() => {
    setSelected(assigned);
    const submitted = submittedRef.current;
    if (
      submitted &&
      submitted.length === assigned.length &&
      submitted.every((key) => assigned.includes(key))
    ) {
      // 刷新带回的 assigned 与上次提交一致 → 保留「已保存」提示
      setSaved(true);
    } else {
      setSaved(false);
    }
  }, [assigned, roleId]);

  const functionalModules: PermissionModule[] = modules
    .map((module) => ({ ...module, permissions: module.permissions.filter((p) => !p.isNav) }))
    .filter((module) => module.permissions.length > 0);
  const navModules: PermissionModule[] = modules
    .map((module) => ({ ...module, permissions: module.permissions.filter((p) => p.isNav) }))
    .filter((module) => module.permissions.length > 0);

  const total = modules.reduce((sum, module) => sum + module.permissions.length, 0);
  const dirty = React.useMemo(() => {
    if (selected.length !== assigned.length) return true;
    const before = new Set(assigned);
    return selected.some((key) => !before.has(key));
  }, [selected, assigned]);

  function toggle(key: string) {
    setSaved(false);
    setSelected((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await assignRolePermissionsAction(roleId, selected);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      submittedRef.current = [...selected].sort();
      setSaved(true);
      router.refresh();
    });
  }

  if (isProtected) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-md border border-warning-600/40 bg-warning-50 px-4 py-3 text-small text-foreground">
          「{roleName}」是受保护的系统角色，拥有全部 {total} 项权限且不可修改。
        </p>
        <PermissionGroups modules={modules} selected={selected} disabled onToggle={() => {}} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-small text-text-secondary">
          已选择 <span className="font-medium text-foreground">{selected.length}</span> / {total} 项权限
        </span>
        <div className="flex items-center gap-2">
          {saved ? <Badge variant="success">已保存</Badge> : null}
          <Button type="button" size="sm" onClick={save} disabled={pending || !dirty}>
            {pending ? '保存中…' : '保存权限'}
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-small text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-6">
        <section id="permission-section-functional" className="flex flex-col gap-3">
          <h3 className="text-small font-semibold text-foreground">功能权限</h3>
          <p className="text-caption text-text-muted">控制该角色可以调用的后台接口。</p>
          <PermissionGroups modules={functionalModules} selected={selected} disabled={false} onToggle={toggle} />
        </section>

        <section id="permission-section-nav" className="flex flex-col gap-3">
          <h3 className="text-small font-semibold text-foreground">导航权限</h3>
          <p className="text-caption text-text-muted">
            控制侧边栏入口是否显示；通常与同名功能权限搭配授予。
          </p>
          {navModules.length === 0 ? (
            <p className="text-small text-text-secondary">当前系统未定义导航权限。</p>
          ) : (
            <PermissionGroups modules={navModules} selected={selected} disabled={false} onToggle={toggle} />
          )}
        </section>
      </div>
    </div>
  );
}

/** 按模块分组的复选框矩阵 */
function PermissionGroups({
  modules,
  selected,
  disabled,
  onToggle,
}: {
  modules: PermissionModule[];
  selected: string[];
  disabled: boolean;
  onToggle: (key: string) => void;
}) {
  if (modules.length === 0) {
    return <p className="text-small text-text-secondary">暂无权限定义。</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {modules.map((module) => {
        const keys = module.permissions.map((permission) => permission.key);
        const checkedCount = keys.filter((key) => selected.includes(key)).length;
        const allChecked = checkedCount === keys.length;
        return (
          <div key={module.key} className="rounded-lg border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-table-header px-4 py-2.5">
              <span className="text-small font-medium text-foreground">{module.name}</span>
              <label className="flex items-center gap-2 text-caption text-text-muted">
                <input
                  type="checkbox"
                  checked={allChecked}
                  disabled={disabled}
                  onChange={(event) => {
                    // 模块级全选 / 全不选：直接改写下层全部勾选项
                    const group = module;
                    for (const permission of group.permissions) {
                      const isChecked = selected.includes(permission.key);
                      if (event.target.checked && !isChecked) onToggle(permission.key);
                      if (!event.target.checked && isChecked) onToggle(permission.key);
                    }
                  }}
                  className="size-4 accent-[var(--primary)]"
                  aria-label={`全选 ${module.name} 权限`}
                />
                全选（{checkedCount}/{keys.length}）
              </label>
            </div>
            <ul className="grid gap-2 px-4 py-3 sm:grid-cols-2">
              {module.permissions.map((permission) => (
                <li key={permission.key}>
                  <label className="flex items-start gap-2 text-small text-foreground">
                    <input
                      type="checkbox"
                      checked={selected.includes(permission.key)}
                      disabled={disabled}
                      onChange={() => onToggle(permission.key)}
                      className="mt-0.5 size-4 accent-[var(--primary)]"
                      aria-label={permission.name}
                    />
                    <span>
                      <span className="font-medium">{permission.name}</span>
                      <span className="ml-2 font-mono text-caption text-text-muted">
                        {permission.key}
                      </span>
                      <span className="block text-caption text-text-muted">
                        {permission.description}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
