'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FormField, Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { showErrorToast, showSuccessToast } from '@/components/ui/toast';
import { createSampleAction, updateSampleAction } from '@/app/(dashboard)/samples/actions';
import type { SampleItem } from '@/lib/samples';

/**
 * 样品新建 / 编辑表单（Phase 5.1）。
 *
 * 硬性约束：不提供持有人选择——持有人恒为当前登录用户（后端强制）；
 * 样品编号由后端生成，表单无编号字段；数量必须为正整数。
 */
export function SampleFormModal({
  mode,
  sample,
  triggerLabel,
}: {
  mode: 'create' | 'edit';
  sample?: SampleItem;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const [name, setName] = React.useState(sample?.name ?? '');
  const [spec, setSpec] = React.useState(sample?.spec ?? '');
  const [material, setMaterial] = React.useState(sample?.material ?? '');
  const [usage, setUsage] = React.useState(sample?.usage ?? '');
  const [quantity, setQuantity] = React.useState(sample ? String(sample.quantity) : '');
  const [unit, setUnit] = React.useState(sample?.unit ?? '');
  const [location, setLocation] = React.useState(sample?.location ?? '');
  const [remark, setRemark] = React.useState(sample?.remark ?? '');

  function reset() {
    setName(sample?.name ?? '');
    setSpec(sample?.spec ?? '');
    setMaterial(sample?.material ?? '');
    setUsage(sample?.usage ?? '');
    setQuantity(sample ? String(sample.quantity) : '');
    setUnit(sample?.unit ?? '');
    setLocation(sample?.location ?? '');
    setRemark(sample?.remark ?? '');
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const qty = Number.parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      showErrorToast('数量必须为正整数');
      return;
    }
    if (!unit.trim()) {
      showErrorToast('请填写计量单位');
      return;
    }

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createSampleAction({
              name: name.trim(),
              spec: spec.trim() || undefined,
              material: material.trim() || undefined,
              usage: usage.trim() || undefined,
              quantity: qty,
              unit: unit.trim(),
              location: location.trim(),
              remark: remark.trim() || undefined,
            })
          : await updateSampleAction(sample!.id, {
              name: name.trim(),
              spec: spec.trim() || undefined,
              material: material.trim() || undefined,
              usage: usage.trim() || undefined,
              quantity: qty,
              unit: unit.trim(),
              location: location.trim(),
              remark: remark.trim() || undefined,
            });

      if (!result.ok) {
        showErrorToast(result.error);
        return;
      }
      setOpen(false);
      showSuccessToast(mode === 'create' ? '样品已创建' : '样品已保存');
      router.refresh();
      if (mode === 'create') router.push(`/samples/${result.data.id}`);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={mode === 'create' ? 'primary' : 'outline'}
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        {triggerLabel ?? (mode === 'create' ? '新增样品' : '编辑样品')}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={mode === 'create' ? '新增样品' : '编辑样品'}
        description={
          mode === 'create'
            ? '样品编号由系统自动生成，持有人自动关联当前登录账号。'
            : '持有人不可修改；状态流转由出库申请流程驱动。'
        }
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              type="submit"
              form="sample-form"
              disabled={pending}
              onClick={handleSubmit}
            >
              {pending ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <form id="sample-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="样品名称" htmlFor="sample-name" required>
            <Input
              id="sample-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="如：胡桃木直纹面板样品"
              required
            />
          </FormField>
          <FormField label="产品型号 / 规格" htmlFor="sample-spec">
            <Input
              id="sample-spec"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              maxLength={120}
              placeholder="如 1220×2440×18mm"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="材质" htmlFor="sample-material">
              <Input
                id="sample-material"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                maxLength={120}
              />
            </FormField>
            <FormField label="用途" htmlFor="sample-usage">
              <Input
                id="sample-usage"
                value={usage}
                onChange={(e) => setUsage(e.target.value)}
                maxLength={200}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="数量" htmlFor="sample-quantity" required>
              <Input
                id="sample-quantity"
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </FormField>
            <FormField label="计量单位" htmlFor="sample-unit" required>
              <Input
                id="sample-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                maxLength={20}
                placeholder="片 / 张 / 块"
                required
              />
            </FormField>
          </div>
          <FormField label="存放位置" htmlFor="sample-location" required hint="库区 / 货架 / 层位或具体位置">
            <Input
              id="sample-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={200}
              placeholder="如 A 区 3 号货架 2 层"
              required
            />
          </FormField>
          <FormField label="备注" htmlFor="sample-remark">
            <Textarea
              id="sample-remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </FormField>
        </form>
      </Modal>
    </>
  );
}
