'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FormField, Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { INVENTORY_UNITS, type InventoryItem } from '@/lib/inventory';
import { showToast } from '@/components/ui/toast';
import { createInventoryAction, updateInventoryAction } from './actions';

/**
 * 库存新增 / 编辑表单（Phase 5.3 / 5.3.2）。
 *
 * 硬性约束：
 *   · 库存编号由系统生成，表单无编号字段（编辑时只读展示）；
 *   · 创建人不提供——恒为当前登录用户（后端从会话取并强制）；
 *   · 关联订单可空；从订单详情进入时锁定为当前订单（只读展示订单号）；
 *   · 数量为不小于 0 的数字，最多三位小数（后端 Decimal(14,3) 存储）；
 *   · 保存后的去向（Phase 5.3.2）：
 *       - 从订单详情进入（带 orderId）→ 回到该订单详情页并提示成功；
 *       - 其它新增场景 → 留在库存列表（保留当前筛选与页码）并提示成功，
 *         不再跳转库存详情页。
 */

export interface InventoryFormOrder {
  id: string;
  code: string;
}

function toDateInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayInput(): string {
  return toDateInput(new Date().toISOString());
}

export function InventoryForm({
  mode,
  item,
  linkedOrder,
  open: openProp,
  onClose,
  showTrigger = true,
  closeHref,
  triggerLabel,
  compact = false,
}: {
  mode: 'create' | 'edit';
  item?: InventoryItem;
  /** 从订单详情进入时锁定关联订单（只读） */
  linkedOrder?: InventoryFormOrder | null;
  open?: boolean;
  onClose?: () => void;
  /** 是否渲染触发按钮（页面内嵌表单传 false） */
  showTrigger?: boolean;
  /** 表单关闭后跳转的地址（订单关联新建页用） */
  closeHref?: string;
  /** 触发按钮文案（列表行内使用「编辑」） */
  triggerLabel?: string;
  /** 紧凑触发按钮（表格行内使用） */
  compact?: boolean;
}) {
  const router = useRouter();
  // 默认关闭：只有显式传 open（订单关联新建页）或用户点击触发按钮才弹出，
  // 避免进入库存详情页时编辑弹窗自动盖住页面。
  const [open, setOpen] = React.useState(openProp ?? false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const submittingRef = React.useRef(false);

  const [productName, setProductName] = React.useState(item?.productName ?? '');
  const [productDetail, setProductDetail] = React.useState(item?.productDetail ?? '');
  const [quantity, setQuantity] = React.useState(item?.quantity ?? '');
  const [unit, setUnit] = React.useState(item?.unit ?? '张');
  const [location, setLocation] = React.useState(item?.location ?? '');
  const [storedAt, setStoredAt] = React.useState(item ? toDateInput(item.storedAt) : todayInput());

  React.useEffect(() => {
    if (openProp !== undefined) setOpen(openProp);
  }, [openProp]);

  function reset() {
    setError(null);
    setProductName(item?.productName ?? '');
    setProductDetail(item?.productDetail ?? '');
    setQuantity(item?.quantity ?? '');
    setUnit(item?.unit ?? '张');
    setLocation(item?.location ?? '');
    setStoredAt(item ? toDateInput(item.storedAt) : todayInput());
  }

  function close() {
    setOpen(false);
    onClose?.();
    if (closeHref) router.push(closeHref);
  }

  function validate(): string | null {
    if (!productName.trim()) return '请填写产品名称';
    if (!productDetail.trim()) return '请填写产品详情';
    if (!location.trim()) return '请填写存放位置';
    if (!storedAt) return '请选择存放日期';
    const trimmed = quantity.trim();
    if (!trimmed) return '请填写数量';
    if (!/^\d+(\.\d{1,3})?$/.test(trimmed)) {
      return '数量必须为不小于 0 的数字，最多三位小数';
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) return '数量不允许为负数';
    return null;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return;
    setError(null);

    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }

    const payload = {
      productName: productName.trim(),
      productDetail: productDetail.trim(),
      quantity: Number(quantity.trim()),
      unit,
      location: location.trim(),
      storedAt,
      // 创建时锁定关联订单（订单详情进入）；编辑不允许变更关联订单，
      // 保持与现有值一致由后端最终校验
      orderId: linkedOrder ? linkedOrder.id : (item?.orderId ?? null),
    };

    submittingRef.current = true;
    startTransition(async () => {
      try {
        const result =
          mode === 'create'
            ? await createInventoryAction(payload)
            : await updateInventoryAction(item!.id, payload);

        if (!result.ok) {
          setError(result.error ?? '保存失败');
          return;
        }

        // 订单关联页：保存后返回订单详情（Phase 5.3.2 要求保留该入口语义）
        if (mode === 'create' && linkedOrder && closeHref) {
          setOpen(false);
          router.push(`${closeHref}?notice=inventory-created`);
          return;
        }

        setOpen(false);
        onClose?.();
        router.refresh();

        if (mode === 'create') {
          // 新增库存：留在库存列表（当前筛选/页码不变），仅刷新数据并提示
          showToast('库存已新增，列表已刷新');
        } else {
          showToast('库存已更新');
        }
      } finally {
        submittingRef.current = false;
      }
    });
  }

  const title = mode === 'create' ? '新增库存' : `编辑库存 ${item?.code ?? ''}`;
  const orderLocked = Boolean(linkedOrder);

  return (
    <>
      {mode === 'create' && showTrigger ? (
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          新增库存
        </Button>
      ) : null}
      {mode === 'edit' && showTrigger ? (
        <Button
          type="button"
          variant={compact ? 'ghost' : 'outline'}
          size={compact ? 'sm' : 'default'}
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          {triggerLabel ?? '编辑库存'}
        </Button>
      ) : null}
      <Modal
        open={open}
        onClose={close}
        title={title}
        description={
          orderLocked
            ? `正在为订单 ${linkedOrder!.code} 创建库存，保存后自动关联该订单。`
            : '库存编号由系统生成，创建人为当前登录用户；关联订单为可选项。'
        }
        maxWidth="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={close}>
              取消
            </Button>
            <Button type="submit" form="inventory-form" disabled={pending} onClick={handleSubmit}>
              {pending ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <form id="inventory-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-small text-destructive">
              {error}
            </p>
          ) : null}

          {orderLocked ? (
            <div className="rounded-md border border-border bg-surface px-3 py-2">
              <p className="text-caption text-text-muted">关联订单（已锁定）</p>
              <p className="text-small font-medium text-foreground">{linkedOrder!.code}</p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="产品名称" htmlFor="inv-name" required>
              <Input
                id="inv-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                maxLength={160}
                placeholder="如：胡桃木贴面 MDF 面板"
                required
              />
            </FormField>
            <FormField label="存放位置" htmlFor="inv-location" required hint="单仓库，手动填写">
              <Input
                id="inv-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={200}
                placeholder="如：A区-3号货架-2层"
                required
              />
            </FormField>
          </div>

          <FormField label="产品详情" htmlFor="inv-detail" required hint="规格、材质、型号等">
            <Textarea
              id="inv-detail"
              value={productDetail}
              onChange={(e) => setProductDetail(e.target.value)}
              maxLength={5000}
              rows={3}
              placeholder="如：1220x2440x18mm，胡桃木贴面，E1 级"
              required
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="数量" htmlFor="inv-quantity" required hint="不小于 0，最多三位小数">
              <Input
                id="inv-quantity"
                type="number"
                min={0}
                step="0.001"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                required
              />
            </FormField>
            <FormField label="计量单位" htmlFor="inv-unit" required>
              <select
                id="inv-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="h-9 rounded-md border border-border-strong bg-background px-3 text-small"
              >
                {INVENTORY_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="存放日期" htmlFor="inv-stored-at" required>
              <Input
                id="inv-stored-at"
                type="date"
                value={storedAt}
                onChange={(e) => setStoredAt(e.target.value)}
                required
              />
            </FormField>
          </div>

          {mode === 'edit' ? (
            <p className="text-caption text-text-muted">
              库存编号 {item?.code} 由系统生成，不可修改；创建人不可变更。
            </p>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
