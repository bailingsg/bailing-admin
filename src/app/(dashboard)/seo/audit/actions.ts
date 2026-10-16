'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import { runSeoAudit } from '@/lib/seo';

/**
 * SEO 审计 Action（Phase 5.0，任务书三十~三十二节）。
 *
 * 审计**只读**：不自动修改页面 / 删除内容 / 修改 SEO 或 URL。
 * 修复只能由管理员在实体的快捷修复中显式确认。
 */
export async function runAuditAction(): Promise<{ ok: boolean; error?: string }> {
  const token = await getSessionToken();
  const result = await runSeoAudit(token);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  revalidatePath('/seo/audit');
  revalidatePath('/seo');
  return { ok: true };
}
