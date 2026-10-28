'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FormField, Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { showErrorToast, showToast } from '@/components/ui/toast';
import {
  ORDER_CURRENCIES,
  ORDER_CURRENCY_LABELS,
  type OrderCurrency,
  type OrderInventoryInput,
  type OrderItem,
} from '@/lib/orders';
import { INVENTORY_UNITS, type InventoryItem } from '@/lib/inventory';
import { PhotoUploader } from './photo-uploader';
import { createOrderAction, updateOrderAction } from './actions';

/**
 * 订单新建 / 编辑表单（Phase 5.2 / 5.3 / 5.3.2）。
 *
 * 硬性约束：
 *   · 不提供业务员字段——恒为当前登录用户（后端从会话取并强制）；
 *   · 订单编号（Phase 5.3）：新建必填、业务员手动填写、全系统唯一；
 *     编辑时只读展示原值，不允许修改（避免关联数据与业务编号不一致）；
 *   · 金额与币种分列；币种仅 CNY / USD / EUR；
 *   · 照片先上传（临时态）再以 attachmentIds 关联；编辑时可移除已有照片；
 *   · 库存联动（Phase 5.3.2）：
 *       - 「是否有库存？」默认「否」；选「是」展开库存子表单，校验规则与库存模块一致；
 *       - 新建时订单与库存由后端在同一事务内写入（任一失败整体回滚）；
 *       - 编辑时有库存则回填并显示「是」，保存时更新原记录而非重复新增；
 *       - 改为「否」必须二次确认后才允许删除库存，绝不静默删除。
 */

/** 与后端 ORDER_CODE_PATTERN 一致的订单编号规则：trim 首尾 + 单空格分隔 + 无控制字符 */
const ORDER_CODE_RULE = /^[\p{L}\p{N}\-_.\/#]+(?: [\p{L}\p{N}\-_.\/#]+)*$/u;

/** 与库存模块一致的数量规则：非负、最多三位小数 */
const QUANTITY_RULE = /^\d+(\.\d{1,3})?$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nowLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function toDateInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayInput(): string {
  return toDateInput(new Date().toISOString());
}

export function OrderForm({
  mode,
  order,
  inventory,
  inventoryCount = 0,
}: {
  mode: 'create' | 'edit';
  order?: OrderItem;
  /** 该订单的主库存（最早创建的一条），编辑时用于回填 */
  inventory?: InventoryItem | null;
  /** 该订单关联的库存总条数（>1 时提示只编辑主记录） */
  inventoryCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(mode === 'edit');
  const [pending, startTransition] = React.useTransition();
  // 防重复提交（useTransition 的 pending 不是同步状态，双击可能穿透）
  const submittingRef = React.useRef(false);

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

  /* 库存联动状态 */
  const initialInventory = React.useMemo(() => inventory ?? null, [inventory]);
  const [hasInventory, setHasInventory] = React.useState(Boolean(inventory));
  const [invProductName, setInvProductName] = React.useState(inventory?.productName ?? '');
  const [invProductDetail, setInvProductDetail] = React.useState(inventory?.productDetail ?? '');
  const [invQuantity, setInvQuantity] = React.useState(inventory?.quantity ?? '');
  const [invUnit, setInvUnit] = React.useState(inventory?.unit ?? '张');
  const [invLocation, setInvLocation] = React.useState(inventory?.location ?? '');
  const [invStoredAt, setInvStoredAt] = React.useState(
    inventory ? toDateInput(inventory.storedAt) : todayInput(),
  );
  /** 正在等待用户确认是否删除已关联库存 */
  const [awaitingRemovalDecision, setAwaitingRemovalDecision] = React.useState(false);
  /** 用户已明确确认删除（提交时才生效） */
  const [removalConfirmed, setRemovalConfirmed] = React.useState(false);

  const initialAttachmentIds = React.useMemo(
    () => new Set(order?.attachments.map((item) => item.id) ?? []),
    [order],
  );

  function resetInventory(next: InventoryItem | null) {
    setHasInventory(Boolean(next));
    setInvProductName(next?.productName ?? '');
    setInvProductDetail(next?.productDetail ?? '');
    setInvQuantity(next?.quantity ?? '');
    setInvUnit(next?.unit ?? '张');
    setInvLocation(next?.location ?? '');
    setInvStoredAt(next ? toDateInput(next.storedAt) : todayInput());
    setAwaitingRemovalDecision(false);
    setRemovalConfirmed(false);
  }

  function reset() {
    setCode(order?.code ?? '');
    setCustomerName(order?.customerName ?? '');
    setCountry(order?.country ?? '');
    setRequirement(order?.requirement ?? '');
    setOrderedAt(order ? toLocalInput(order.orderedAt) : nowLocal());
    setClosedAt(order?.closedAt ? toLocalInput(order.closedAt) : '');
    setAmount(order ? order.amount : '');
    setCurrency(order?.currency ?? 'CNY');
    setNote(order?.note ?? '');
    resetInventory(initialInventory);
  }

  /** 「是 / 否」切换：改为否且已有库存时，先要求确认，不直接删除 */
  function chooseInventory(next: boolean) {
    if (next) {
      setHasInventory(true);
      setAwaitingRemovalDecision(false);
      setRemovalConfirmed(false);
      return;
    }
    setHasInventory(false);
    if (initialInventory && !removalConfirmed) {
      setAwaitingRemovalDecision(true);
    }
  }

  function keepInventory() {
    setHasInventory(true);
    setAwaitingRemovalDecision(false);
    setRemovalConfirmed(false);
  }

  function confirmRemoval() {
    setAwaitingRemovalDecision(false);
    setRemovalConfirmed(true);
  }

  function validateInventory(): string | null {
    if (!invProductName.trim()) return '请填写库存产品名称';
    if (!invProductDetail.trim()) return '请填写库存产品详情';
    if (!invLocation.trim()) return '请填写库存存放位置';
    if (!invStoredAt) return '请选择库存存放日期';
    const trimmed = invQuantity.trim();
    if (!trimmed) return '请填写库存数量';
    if (!QUANTITY_RULE.test(trimmed)) {
      return '库存数量必须为不小于 0 的数字，最多三位小数';
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) return '库存数量不允许为负数';
    return null;
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
    // 库存改为「否」但尚未确认删除 → 拦住提交，避免静默删除
    if (!hasInventory && initialInventory && !removalConfirmed) {
      return '请先确认是否删除该订单已关联的库存记录';
    }
    if (hasInventory) return validateInventory();
    return null;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return;

    const invalid = validate();
    if (invalid) {
      showErrorToast(invalid);
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

    const inventoryPayload: OrderInventoryInput | undefined = hasInventory
      ? {
          productName: invProductName.trim(),
          productDetail: invProductDetail.trim(),
          quantity: Number(invQuantity.trim()),
          unit: invUnit,
          location: invLocation.trim(),
          storedAt: invStoredAt,
        }
      : undefined;

    submittingRef.current = true;
    startTransition(async () => {
      try {
        // 编辑为全量更新但不含订单编号（后端 UpdateOrderDto 无 code，创建后不可改）
        const result =
          mode === 'create'
            ? await createOrderAction({
                ...fields,
                code: code.trim(),
                inventory: inventoryPayload,
              })
            : await updateOrderAction(order!.id, {
                ...fields,
                inventory: inventoryPayload,
                // 仅在用户明确确认后提交删除标记
                removeInventory: removalConfirmed || undefined,
                removeAttachmentIds: [...initialAttachmentIds].filter(
                  (id) => !photos.some((p) => p.id === id),
                ),
              });

        if (!result.ok) {
          showErrorToast(result.error);
          return;
        }
        setOpen(false);

        if (mode === 'create') {
          const notice = inventoryPayload ? 'order-created-inventory' : 'order-created';
          router.push(`/orders/${result.data.id}?notice=${notice}`);
          return;
        }

        router.refresh();
        showToast(
          removalConfirmed && initialInventory
            ? '订单已保存，关联库存已删除'
            : inventoryPayload
              ? '订单与库存信息已保存'
              : '订单已保存',
        );
      } finally {
        submittingRef.current = false;
      }
    });
  }

  const showInventoryForm = hasInventory;
  const multipleInventory = inventoryCount > 1;

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

          {/* ---------- 是否有库存（Phase 5.3.2） ---------- */}
          <fieldset className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3">
            <legend className="px-1 text-small font-medium text-foreground">
              是否有库存？<span className="ml-1 text-destructive">*</span>
            </legend>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-small text-foreground">
                <input
                  type="radio"
                  name="order-has-inventory"
                  value="no"
                  checked={!hasInventory}
                  onChange={() => chooseInventory(false)}
                  className="size-4 accent-primary"
                />
                否
              </label>
              <label className="flex items-center gap-2 text-small text-foreground">
                <input
                  type="radio"
                  name="order-has-inventory"
                  value="yes"
                  checked={hasInventory}
                  onChange={() => chooseInventory(true)}
                  className="size-4 accent-primary"
                />
                是
              </label>
            </div>

            <p className="text-caption text-text-muted">
              {hasInventory
                ? '选择「是」后请填写下方库存信息，保存时与订单一并提交。'
                : '选择「否」则不创建库存记录；后续如需补充，可在订单详情页点击「新增库存」。'}
            </p>

            {initialInventory ? (
              <p className="text-caption text-text-muted">
                当前已关联库存{' '}
                <span className="font-medium text-foreground">{initialInventory.code}</span>
                （{initialInventory.productName}）
                {multipleInventory
                  ? `；该订单共有 ${inventoryCount} 条库存记录，此处仅显示并编辑最早创建的一条。`
                  : '。'}
              </p>
            ) : null}

            {awaitingRemovalDecision && initialInventory ? (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded-md border border-warning-600/40 bg-warning-50 px-3 py-2"
              >
                <p className="text-small text-foreground">
                  该订单已关联库存 <span className="font-medium">{initialInventory.code}</span>
                  （{initialInventory.productName}）。改为「否」并保存将
                  <span className="font-medium"> 删除这条库存记录 </span>
                  ，订单本身及照片不受影响。
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={keepInventory}>
                    保留库存
                  </Button>
                  <Button type="button" variant="danger" onClick={confirmRemoval}>
                    确认删除库存
                  </Button>
                </div>
              </div>
            ) : null}

            {removalConfirmed && initialInventory ? (
              <p className="flex flex-wrap items-center gap-2 text-small text-destructive">
                已标记删除库存 {initialInventory.code}，保存后生效。
                <button
                  type="button"
                  onClick={keepInventory}
                  className="text-primary underline underline-offset-2"
                >
                  撤销
                </button>
              </p>
            ) : null}

            {showInventoryForm ? (
              <div className="mt-1 flex flex-col gap-4 border-t border-border pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="产品名称" htmlFor="order-inv-name" required>
                    <Input
                      id="order-inv-name"
                      value={invProductName}
                      onChange={(e) => setInvProductName(e.target.value)}
                      maxLength={160}
                      placeholder="如：胡桃木贴面 MDF 面板"
                      required
                    />
                  </FormField>
                  <FormField label="存放位置" htmlFor="order-inv-location" required hint="单仓库，手动填写">
                    <Input
                      id="order-inv-location"
                      value={invLocation}
                      onChange={(e) => setInvLocation(e.target.value)}
                      maxLength={200}
                      placeholder="如：A区-3号货架-2层"
                      required
                    />
                  </FormField>
                </div>

                <FormField label="产品详情" htmlFor="order-inv-detail" required hint="规格、材质、型号等">
                  <Textarea
                    id="order-inv-detail"
                    value={invProductDetail}
                    onChange={(e) => setInvProductDetail(e.target.value)}
                    maxLength={5000}
                    rows={3}
                    placeholder="如：1220x2440x18mm，胡桃木贴面，E1 级"
                    required
                  />
                </FormField>

                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField label="数量" htmlFor="order-inv-quantity" required hint="不小于 0，最多三位小数">
                    <Input
                      id="order-inv-quantity"
                      type="number"
                      min={0}
                      step="0.001"
                      inputMode="decimal"
                      value={invQuantity}
                      onChange={(e) => setInvQuantity(e.target.value)}
                      placeholder="0"
                      required
                    />
                  </FormField>
                  <FormField label="计量单位" htmlFor="order-inv-unit" required>
                    <select
                      id="order-inv-unit"
                      value={invUnit}
                      onChange={(e) => setInvUnit(e.target.value)}
                      className="h-9 rounded-md border border-border-strong bg-background px-3 text-small"
                    >
                      {INVENTORY_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="存放日期" htmlFor="order-inv-stored-at" required>
                    <Input
                      id="order-inv-stored-at"
                      type="date"
                      value={invStoredAt}
                      onChange={(e) => setInvStoredAt(e.target.value)}
                      required
                    />
                  </FormField>
                </div>

                <p className="text-caption text-text-muted">
                  库存编号由系统生成（INV-日期-随机码），创建人为当前登录用户；
                  {mode === 'create'
                    ? '保存时与订单在同一事务内写入，任一失败整体回滚。'
                    : '保存时更新该订单已有的库存记录，不会重复新增。'}
                </p>
              </div>
            ) : null}
          </fieldset>
        </form>
      </Modal>
    </>
  );
}
