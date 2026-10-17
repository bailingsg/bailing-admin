'use server';

import { revalidatePath } from 'next/cache';
import { getSessionToken } from '@/lib/session';
import type { ApiResult } from '@/lib/api';
import {
  createSample,
  decideSampleRequest,
  grantSample,
  revokeSampleGrant,
  updateSample,
  withdrawSampleRequest,
  createSampleRequest,
  type SampleInput,
} from '@/lib/samples';

/**
 * 样品管理 —— 服务端 Actions（Phase 5.1）。
 *
 * 全部权限判定在后端；这里只负责携带 HttpOnly Cookie 中的 JWT、
 * 转发请求并刷新页面缓存。
 */

export async function createSampleAction(
  input: SampleInput,
): Promise<ApiResult<{ id: string }>> {
  const token = await getSessionToken();
  const result = await createSample(token, input);
  if (!result.ok) return result;
  revalidatePath('/samples');
  return result;
}

export async function updateSampleAction(
  id: string,
  input: SampleInput,
): Promise<ApiResult<{ id: string }>> {
  const token = await getSessionToken();
  const result = await updateSample(token, id, input);
  if (!result.ok) return result;
  revalidatePath('/samples');
  revalidatePath(`/samples/${id}`);
  return result;
}

export async function grantSampleAction(
  id: string,
  userIds: string[],
): Promise<ApiResult<{ granted: number; skipped: number }>> {
  const token = await getSessionToken();
  const result = await grantSample(token, id, userIds);
  if (!result.ok) return result;
  revalidatePath(`/samples/${id}`);
  return result;
}

export async function revokeGrantAction(
  id: string,
  userId: string,
): Promise<ApiResult<{ id: string }>> {
  const token = await getSessionToken();
  const result = await revokeSampleGrant(token, id, userId);
  if (!result.ok) return result;
  revalidatePath(`/samples/${id}`);
  return result;
}

export async function requestSampleAction(
  id: string,
  purpose: string,
): Promise<ApiResult<{ id: string }>> {
  const token = await getSessionToken();
  const result = await createSampleRequest(token, id, purpose);
  if (!result.ok) return result;
  revalidatePath('/samples');
  revalidatePath(`/samples/${id}`);
  revalidatePath('/samples/requests');
  return result;
}

export async function withdrawRequestAction(
  requestId: string,
): Promise<ApiResult<{ id: string }>> {
  const token = await getSessionToken();
  const result = await withdrawSampleRequest(token, requestId);
  if (!result.ok) return result;
  revalidatePath('/samples');
  revalidatePath('/samples/requests');
  return result;
}

export async function decideRequestAction(
  requestId: string,
  decision: 'APPROVE' | 'REJECT',
): Promise<ApiResult<{ id: string; decision: string }>> {
  const token = await getSessionToken();
  const result = await decideSampleRequest(token, requestId, decision);
  if (!result.ok) return result;
  revalidatePath('/samples');
  revalidatePath('/samples/requests');
  revalidatePath('/samples/archive');
  return result;
}
