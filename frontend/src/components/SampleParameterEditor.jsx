// One Sample Name, with any number of Parameters tested under it.
// Each sample chooses individual or combined pricing:
//  - Individual: every parameter has its own Charges (₹) field.
//  - Combined: one Charges (₹) field for the whole sample instead —
//    useful when a lab charges a package rate rather than summing
//    individual test prices.
// Sample Qty. and Sample Count always apply to the whole sample either
// way. "+ Add Parameter" adds another parameter; "+ Add Sample"
// (rendered by the parent form) starts a new sample block.
export default function SampleParameterEditor({ sample, sampleIndex, onChange, onRemoveSample, catalogParameters, canRemoveSample }) {
  const updateField = (patch) => onChange({ ...sample, ...patch });

  const updateParameter = (paramIndex, patch) => {
    const nextParameters = [...sample.parameters];
    nextParameters[paramIndex] = { ...nextParameters[paramIndex], ...patch };
    onChange({ ...sample, parameters: nextParameters });
  };

  const addParameter = () => {
    onChange({ ...sample, parameters: [...sample.parameters, { parameterId: null, description: '', charges: '' }] });
  };

  const removeParameter = (paramIndex) => {
    onChange({ ...sample, parameters: sample.parameters.filter((_, i) => i !== paramIndex) });
  };

  const pickCatalogParameter = (paramIndex, parameterId) => {
    const entry = catalogParameters.find((p) => String(p.id) === String(parameterId));
    if (!entry) {
      updateParameter(paramIndex, { parameterId: null });
      return;
    }
    updateParameter(paramIndex, { parameterId: entry.id, description: entry.name });
  };

  const toggleCombinedPricing = (combinedPricing) => {
    onChange({ ...sample, combinedPricing, combinedPrice: sample.combinedPrice || '' });
  };

  const lineTotal = sample.combinedPricing
    ? Number(sample.combinedPrice || 0) * Number(sample.sampleQty || 1) * Number(sample.sampleCount || 1)
    : sample.parameters.reduce((sum, p) => sum + Number(p.charges || 0), 0) * Number(sample.sampleQty || 1) * Number(sample.sampleCount || 1);

  return (
    <div className="card" style={{ marginBottom: 16, background: '#FAFBF8' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 14 }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label>Sample Name *</label>
          <input
            required
            value={sample.sampleName}
            onChange={(e) => updateField({ sampleName: e.target.value })}
            placeholder={`e.g. Water Sample ${sampleIndex + 1}`}
          />
        </div>
        {canRemoveSample && (
          <button type="button" className="btn danger" onClick={onRemoveSample}>Remove Sample</button>
        )}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 10 }}>
        <input
          type="checkbox"
          style={{ width: 'auto' }}
          checked={Boolean(sample.combinedPricing)}
          onChange={(e) => toggleCombinedPricing(e.target.checked)}
        />
        Combined price for this sample (one price for all parameters below, instead of pricing each one)
      </label>

      <table className="line-items-table" style={{ marginBottom: 10 }}>
        <thead>
          <tr>
            <th style={{ width: '28%' }}>From catalog (optional)</th>
            <th>Parameter Name</th>
            {!sample.combinedPricing && <th style={{ width: 110 }}>Charges (₹)</th>}
            <th style={{ width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {sample.parameters.map((param, paramIndex) => (
            <tr key={paramIndex}>
              <td>
                <select value={param.parameterId || ''} onChange={(e) => pickCatalogParameter(paramIndex, e.target.value)}>
                  <option value="">— custom —</option>
                  {catalogParameters.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  required
                  value={param.description}
                  onChange={(e) => updateParameter(paramIndex, { description: e.target.value })}
                  placeholder="e.g. pH, Total Coliform Count"
                />
              </td>
              {!sample.combinedPricing && (
                <td>
                  <input
                    type="number" min="0" step="0.01" required
                    value={param.charges}
                    onChange={(e) => updateParameter(paramIndex, { charges: e.target.value })}
                  />
                </td>
              )}
              <td>
                {sample.parameters.length > 1 && (
                  <button type="button" className="btn danger" style={{ padding: '4px 8px' }} onClick={() => removeParameter(paramIndex)}>×</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn secondary" onClick={addParameter} style={{ marginBottom: 14 }}>+ Add Parameter</button>

      {sample.combinedPricing && (
        <div className="field" style={{ maxWidth: 220, marginBottom: 14 }}>
          <label>Combined Charges for this Sample (₹) *</label>
          <input
            type="number" min="0" step="0.01" required
            value={sample.combinedPrice || ''}
            onChange={(e) => updateField({ combinedPrice: e.target.value })}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Sample Qty. *</label>
          <input
            type="number" min="0" step="1" required
            value={sample.sampleQty}
            onChange={(e) => updateField({ sampleQty: e.target.value })}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Sample Count *</label>
          <input
            type="number" min="0" step="1" required
            value={sample.sampleCount}
            onChange={(e) => updateField({ sampleCount: e.target.value })}
          />
        </div>
      </div>

      <div style={{ textAlign: 'right', marginTop: 10, fontSize: 13, color: '#666' }}>
        Sample total: <strong>₹{lineTotal.toFixed(2)}</strong>
      </div>
    </div>
  );
}
