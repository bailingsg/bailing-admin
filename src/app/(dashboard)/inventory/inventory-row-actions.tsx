'use client';

import { DeleteInventoryButton } from './delete-button';
import { InventoryForm } from './inventory-form';
import { formatQuantity, type InventoryItem } from '@/lib/inventory';

/**
 * 库存列表行内操作（Phase 5.3.2）：编辑 + 删除。
 *
 * 原「详情」入口已移除，列表页即可完成查看关键字段、编辑与删除；
 * 库存编号仍保留详情链接，需要看产品详情全文时可进入详情页。
 * 删除为二次确认弹窗，成功后停留在列表并刷新，不跳转。
 */
export function InventoryRowActions({ item }: { item: InventoryItem }) {
  return (
    <div className="flex items-center gap-1">
      <InventoryForm mode="edit" item={item} triggerLabel="编辑" compact />
      <DeleteInventoryButton
        id={item.id}
        code={item.code}
        productName={item.productName}
        quantityText={formatQuantity(item.quantity, item.unit)}
        location={item.location}
        compact
      />
    </div>
  );
}
