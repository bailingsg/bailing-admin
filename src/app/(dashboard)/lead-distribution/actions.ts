'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import type { ApiResult } from '@/lib/api';
import {
  closePlan,
  createPlan,
  listEligibleAssignees,
  resumePlan,
  type CreatePlanInput,
  type CreatePlanResult,
  type EligibleAssignee,
  type Plan,
} from '@/lib/lead-distribution';

/**
 * 询盘分配 —— 服务端 Actions（Phase 4.6）。
 *
 * 令牌只存在于服务端：客户端组件（弹窗 / 两步确认按钮）调用这里的 Action，
 * 由服务端读取 HttpOnly Cookie 中的 JWT 再转发到后端
 * /api/v1/cms/lead-distribution/**。
 *
 * 所有返回值均为后端真实响应（ApiResult），前端不做任何业务推算。
 */

/** 拉取可参与倾斜计划的员工（含账号状态与询盘联系人标记，供创建计划预检） */
export async function fetchEligibleAssigneesAction(): Promise<ApiResult<EligibleAssignee[]>> {
  const token = await getSessionToken();
  return listEligibleAssignees(token);
}

/** 创建倾斜计划（同一时间只允许一个生效计划，由后端强制） */
export async function createPlanAction(
  input: CreatePlanInput,
): Promise<ApiResult<CreatePlanResult>> {
  const token = await getSessionToken();
  const result = await createPlan(token, input);
  if (!result.ok) return result;

  revalidatePath('/lead-distribution');
  revalidatePath('/lead-distribution/history');
  return result;
}

/** 手动关闭计划（关闭后由 cooldownSeconds 决定自动恢复或等待手动恢复） */
export async function closePlanAction(
  id: string,
  reason?: string,
): Promise<ApiResult<Plan>> {
  const token = await getSessionToken();
  const result = await closePlan(token, id, reason);
  if (!result.ok) return result;

  revalidatePath('/lead-distribution');
  revalidatePath('/lead-distribution/history');
  revalidatePath(`/lead-distribution/${id}`);
  return result;
}

/** 手动恢复冷却暂停中的计划 */
export async function resumePlanAction(id: string): Promise<ApiResult<Plan>> {
  const token = await getSessionToken();
  const result = await resumePlan(token, id);
  if (!result.ok) return result;

  revalidatePath('/lead-distribution');
  revalidatePath('/lead-distribution/history');
  revalidatePath(`/lead-distribution/${id}`);
  return result;
}
