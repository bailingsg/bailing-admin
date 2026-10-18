'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FormField, Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ORDER_CURRENCIES,
  ORDER_CURRENCY_LABELS,
  type OrderCurrency,
  type OrderItem,
} from '@/lib/orders';
import { PhotoUploader } from './photo-uploader';
import { createOrderAction, updateOrderAction } from './actions';

/**
 * 订单新建 / 编辑表单（Phase 5.2 / 5.3）。
 *
 * 硬性约束：
 *   · 不提供业务员字段——恒为当前登录用户（后端从会话取并强制）；
 *   · 订单编号（Phase 5.3）：新建必填、业务员手动填写、全系统唯一；
 *     编辑时只读展示原值，不允许修改（避免关联数据与业务编号不一致）；
 *   · 金额与币种分列；币种仅 CNY / USD / EUR；
 *   · 照片先上传（临时态）再以 attachmentIds 关联；编辑时可移除已有照片。
 */

/** 与后端 ORDER_CODE_PATTERN 一致的订单编号规则：trim 首尾 + 单空格分隔 + 无控制字符 */
const ORDER_CODE_RULE = /^[\p{L}\p{N}\-_.\/#]+(?: [\p{L}\p{N}\-_.\/#]+)*$/u;

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nowLocal(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function OrderForm({ mode, order }: { mode: 'create' | 'edit'; order?: OrderItem }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(mode === 'edit');
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const [code, setCode] = React.useState(order?.code ?? '');
  const [customerName, setCustomerName] = React.useState(order?.customerName ?? '');
  const [country, setCountry] = React.useState(order?.country ?? '');
  const [requirement, setRequirement] = React.useState(order?.requirement ?? '');
  const [orderedAt, setOrderedAt] = React.useState(
    order ? toLocalInput(order.orderedAt) : nowLocal,
  );
  const [closedAt, setClosedAt] = React.useState(order?.closedAt ? toLocalInput(order.closedAt) : '');
  const [amount, setAmount] = React.useState(order ? order.amount : '');
  const [currency, setCurrency] = React.useState<OrderCurrency>(order?.currency ?? 'CNY');
  const [note, setNote] = React.useState(order?.note ?? '');
  const [photos, setPhotos] = React.useState(order?.attachments ?? []);

  const initialAttachmentIds = React.useMemo(
    () => new Set(order?.attachments.map((item) => item.id) ?? []),
    [order],
  );

  function reset() {
    setError(null);
    setCode(order?.code ?? '');
    setCustomerName(order?.customerName ?? '');
    setCountry(order?.country ?? '');
    setRequirement(order?.requirement ?? '');
    setOrderedAt(order ? toLocalInput(order.orderedAt) : nowLocal());
    setClosedAt(order?.closedAt ? toLocalInput(order.closedAt) : '');
    setAmount(order ? order.amount : '');
    setCurrency(order?.currency ?? 'CNY');
    setNote(order?.note ?? '');
  }

  function validate(): string | null {
    const trimmedCode = code.trim();
    if (mode === 'create') {
      if (!trimmedCode) return '请填写订单编号';
      if (trimmedCode.length > 64) return '订单编号长度不能超过 64';
      if (!ORDER_CODE_RULE.test(trimmedCode)) {
        return '订单编号仅支持字母、数字及 - _ / . # 与单个空格';
      }
    }
    if (!customerName.trim()) return '请填写客户名称';
    if (!country.trim()) return '请填写国家/地区';
    if (!requirement.trim()) return '请填写客户需求';
    if (!orderedAt) return '请选择下单时间';
    if (closedAt && new Date(closedAt).getTime() < new Date(orderedAt).getTime()) {
      return '成交时间不能早于下单时间';
    }
    const parsedAmount = Number(amount);
    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return '金额必须为不小于 0 的数字';
    }
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) {
      return '金额最多保留两位小数';
    }
    return null;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }

    const fields = {
      customerName: customerName.trim(),
      country: country.trim(),
      requirement: requirement.trim(),
      orderedAt: new Date(orderedAt).toISOString(),
      closedAt: closedAt ? new Date(closedAt).toISOString() : undefined,
      amount: Number(amount.trim()),
      currency,
      note: note.trim() || undefined,
      attachmentIds: photos.map((item) => item.id),
    };

    startTransition(async () => {
      // 编辑为全量更新但不含订单编号（后端 UpdateOrderDto 无 code，创建后不可改）
      const result =
        mode === 'create'
          ? await createOrderAction({ ...fields, code: code.trim() })
          : await updateOrderAction(order!.id, {
              ...fields,
              removeAttachmentIds: [...initialAttachmentIds].filter((id) => !photos.some((p) => p.id === id)),
            });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
      if (mode === 'create') router.push(`/orders/${result.data.id}`);
    });
  }

  return (
    <>
      {mode === 'create' ? (
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          新增订单
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          编辑订单
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={mode === 'create' ? '新增订单' : '编辑订单'}
        description={
          mode === 'create'
            ? '请填写业务订单编号（全系统唯一），业务员自动关联当前登录账号。'
            : '业务员与订单编号不可修改；提交后字段为全量更新。'
        }
        maxWidth="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit" form="order-form" disabled={pending} onClick={handleSubmit}>
              {pending ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <form id="order-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-small text-destructive">
              {error}
            </p>
          ) : null}

          {mode === 'create' ? (
            <FormField
              label="订单编号"
              htmlFor="order-code"
              required
              hint="必填，全系统唯一；支持字母、数字及 - _ / . #"
            >
              <Input
                id="order-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={64}
                placeholder="如：BW-2026-0001"
                required
              />
            </FormField>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-small font-medium text-foreground">订单编号（不可修改）</span>
              <p className="rounded-md border border-border bg-surface px-3 py-2 text-small text-text-secondary">
                {order?.code}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="客户名称" htmlFor="order-customer" required>
              <Input
                id="order-customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                maxLength={160}
                placeholder="如：ABC Trading Co., Ltd."
                required
              />
            </FormField>
            <FormField label="国家/地区" htmlFor="order-country" required>
              <Input
                id="order-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={80}
                placeholder="如：United States"
                required
              />
            </FormField>
          </div>

          <FormField label="客户需求" htmlFor="order-requirement" required>
            <Textarea
              id="order-requirement"
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              maxLength={5000}
              rows={4}
              placeholder="客户对产品规格、数量、交期等的需求描述"
              required
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="下单时间" htmlFor="order-ordered-at" required>
              <Input
                id="order-ordered-at"
                type="datetime-local"
                value={orderedAt}
                onChange={(e) => setOrderedAt(e.target.value)}
                required
              />
            </FormField>
            <FormField label="成交时间" htmlFor="order-closed-at" hint="未成交可留空">
              <Input
                id="order-closed-at"
                type="datetime-local"
                value={closedAt}
                onChange={(e) => setClosedAt(e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="订单金额" htmlFor="order-amount" required hint="最多两位小数，不允许负数">
              <Input
                id="order-amount"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </FormField>
            <FormField label="币种" htmlFor="order-currency" required>
              <select
                id="order-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as OrderCurrency)}
                className="h-9 rounded-md border border-border-strong bg-background px-3 text-small"
              >
                {ORDER_CURRENCIES.map((item) => (
                  <option key={item} value={item}>
                    {ORDER_CURRENCY_LABELS[item]}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="订单照片" htmlFor="order-photos" hint="照片属于业务附件，不会进入媒体库">
            <PhotoUploader
              value={photos}
              onChange={setPhotos}
              orderId={mode === 'edit' ? order?.id : undefined}
            />
          </FormField>

          <FormField label="备注" htmlFor="order-note">
            <Textarea
              id="order-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </FormField>
        </form>
      </Modal>
    </>
  );
}
