// showDiscount: quotations have a per-line discount column; POs don't.
// catalogOptions/catalogLabel/descriptionLabel/idField let the same
// component serve two different catalogs with different terminology —
// Parameters ("Sample Name") for quotations, Items ("Description") for
// purchase orders — without duplicating this whole component. Defaults
// match the original Item/Description behavior so PurchaseOrderForm
// doesn't need any changes.
export default function LineItemsEditor({
  lineItems,
  setLineItems,
  items,
  showDiscount,
  catalogLabel = 'Catalog item (optional)',
  descriptionLabel = 'Description',
  idField = 'itemId',
}) {
  const update = (idx, patch) => {
    const next = [...lineItems];
    next[idx] = { ...next[idx], ...patch };
    setLineItems(next);
  };

  const addRow = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: '', discount: 0, [idField]: null }]);
  };

  const removeRow = (idx) => {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const pickCatalogEntry = (idx, catalogId) => {
    const entry = items.find((i) => String(i.id) === String(catalogId));
    if (!entry) {
      update(idx, { [idField]: null });
      return;
    }
    update(idx, {
      [idField]: entry.id,
      description: entry.description ? `${entry.name} — ${entry.description}` : entry.name,
      unitPrice: (entry.unitPriceCents / 100).toString(),
    });
  };

  const lineTotal = (li) => {
    const qty = Number(li.quantity || 0);
    const price = Number(li.unitPrice || 0);
    const disc = Number(li.discount || 0);
    return (qty * price - disc).toFixed(2);
  };

  return (
    <div>
      <table className="line-items-table">
        <thead>
          <tr>
            <th style={{ width: '22%' }}>{catalogLabel}</th>
            <th>{descriptionLabel}</th>
            <th style={{ width: 70 }}>Qty</th>
            <th style={{ width: 110 }}>Unit Price</th>
            {showDiscount && <th style={{ width: 90 }}>Discount</th>}
            <th style={{ width: 100 }}>Line Total</th>
            <th style={{ width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((li, idx) => (
            <tr key={idx}>
              <td>
                <select value={li[idField] || ''} onChange={(e) => pickCatalogEntry(idx, e.target.value)}>
                  <option value="">— custom —</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>{it.name}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  required
                  value={li.description}
                  onChange={(e) => update(idx, { description: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="number" min="0" step="0.01" required
                  value={li.quantity}
                  onChange={(e) => update(idx, { quantity: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="number" min="0" step="0.01" required
                  value={li.unitPrice}
                  onChange={(e) => update(idx, { unitPrice: e.target.value })}
                />
              </td>
              {showDiscount && (
                <td>
                  <input
                    type="number" min="0" step="0.01"
                    value={li.discount}
                    onChange={(e) => update(idx, { discount: e.target.value })}
                  />
                </td>
              )}
              <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{lineTotal(li)}</td>
              <td>
                <button type="button" className="btn danger" style={{ padding: '4px 8px' }} onClick={() => removeRow(idx)}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn secondary" onClick={addRow}>+ Add line</button>
    </div>
  );
}
