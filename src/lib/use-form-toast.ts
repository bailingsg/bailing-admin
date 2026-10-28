'use client';

import * as React from 'react';
import { showErrorToast, showSuccessToast } from '@/components/ui/toast';

/**
 * 把 useActionState 的提交结果接到顶部气泡上。
 *
 * 长表单的保存按钮在页面最底部，把「已保存 / 保存失败」放在表单顶部
 * 用户根本看不到（点完保存视口还停在底部）。这里统一改为顶部气泡。
 *
 * 用法：
 *   const [state, formAction, pending] = React.useActionState(boundAction, INITIAL_STATE);
 *   useFormToast(state, { successMessage: isEdit ? '已保存' : '已创建' });
 *
 * 只在 **state 对象变化** 时提示（每次提交 useActionState 都会产出新对象），
 * 因此父组件重渲染、router.refresh() 都不会重复弹同一条。
 */

type FormToastState = { ok?: boolean; error?: string | null } | null | undefined;

export function useFormToast(
  state: FormToastState,
  options?: { successMessage?: string; enabled?: boolean },
): void {
  const successMessage = options?.successMessage ?? '已保存';
  const enabled = options?.enabled ?? true;

  // 记录上次已提示过的 state 引用；初始为 undefined 表示「还没提示过任何结果」
  const lastRef = React.useRef<FormToastState>(undefined);

  React.useEffect(() => {
    if (!enabled) return;
    if (!state) return;
    if (lastRef.current === state) return;
    lastRef.current = state;

    if (state.error) {
      showErrorToast(state.error);
      return;
    }
    if (state.ok) {
      showSuccessToast(successMessage);
    }
  }, [state, successMessage, enabled]);
}
