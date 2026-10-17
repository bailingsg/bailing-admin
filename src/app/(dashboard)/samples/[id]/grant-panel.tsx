'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { revokeGrantAction, grantSampleAction } from '../actions';
import type { SampleDetail } from '@/lib/samples';

/**
 * 样品授权面板（Phase 5.1）。
 *
 * · 管理员：可将查看权限授予业务员或撤销；展示当前有效授权名单
 * · 其他角色：只读展示授权名单（持有人权限不来自授权，天然可见）
 */
export function GrantPanel({
  sample,
  isAdmin,
  candidates,
}: {
  sample: SampleDetail;
  isAdmin: boolean;
  candidates: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);

  // 排除持有人自己（持有人天然可见，无需授权）
  const options = candidates.filter((c) => c.id !== sample.ownerId);

  function grant() {
    if (selected.length === 0) return;
    setError(null);
    // 用户是否管理员由 props 决定；持有人自己不能靠本面板授权（无意义且后端跳过）
    startTransition(async () => {
      const result = await grantSampleAction(sample.id, selected);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelected([]);
      router.refresh();
    });
  }

  function revoke(userId: string) {
    setError(null);
    startTransition(async () => {
      const result = await revokeGrantAction(sample.id, userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="py-5">
        <h2 className="text-body font-semibold text-foreground">授权查看名单</h2>
        <p className="mt-1 text-caption text-text-muted">
          授权仅影响查看权限；被授权人不能修改样品，也不能继续授权他人。
        </p>

        {sample.grants.length === 0 ? (
          <p className="mt-3 text-small text-text-secondary">暂无被授权业务员。</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {sample.grants.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-3 border-b border-border pb-2 text-small last:border-0"
              >
                <span className="text-foreground">{g.granteeName ?? g.granteeId}</span>
                {isAdmin ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => revoke(g.granteeId)}
                    disabled={pending}
                  >
                    撤销授权
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {isAdmin ? (
          <div className="mt-4 flex flex-col gap-2">
            {error ? (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-small text-destructive">
                {error}
              </p>
            ) : null}
            {options.length === 0 ? (
              <p className="text-small text-text-secondary">暂无可授权的账号。</p>
            ) : (
              <>
                <label htmlFor="grant-select" className="text-small font-medium text-foreground">
                  授权业务员查看
                </label>
                <div className="flex flex-wrap gap-3">
                  {options.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-1.5 text-small text-foreground"
                    >
                      <input
                        type="checkbox"
                        value={c.id}
                        checked={selected.includes(c.id)}
                        onChange={(e) => {
                          setSelected((prev) =>
                            e.target.checked
                              ? [...prev, c.id]
                              : prev.filter((id) => id !== c.id),
                          );
                        }}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
                <Button
                  type="button"
                  className="self-start"
                  onClick={grant}
                  disabled={pending || selected.length === 0}
                >
                  {pending ? '处理中…' : '确认授权'}
                </Button>
              </>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
