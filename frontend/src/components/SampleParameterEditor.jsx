// One sample name entered once, with any number of parameters (each
// picked from the catalog or typed freely) tested under it. "+ Add
// Parameter" adds another row to the current sample; "+ Add Sample"
// (rendered by the parent form, not here) starts a new one. Discount is
// NOT per-parameter — it's a single field at the quotation level,
// entered elsewhere in the form.
export default function SampleParameterEditor({ sample, sampleIndex, onChange, onRemoveSample, catalogParameters, canRemoveSample }) {
  const updateSampleName = (sampleName) => {
    onChange({ ...sample, sampleName });
  };

  const updateParameter = (paramIndex, patch) => {
    const nextParameters = [...sample.parameters];
    nextParameters[paramIndex] = { ...nextParameters[paramIndex], ...patch };
    onChange({ ...sample, parameters: nextParameters });
  };

  const addParameter = () => {
    onChange({
      ...sample,
      parameters: [...sample.parameters, { parameterId: null, description: '', unitPrice: '' }],
    });
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
    updateParameter(paramIndex, {
      parameterId: entry.id,
      description: entry.name,
      unitPrice: (entry.unitPriceCents / 100).toString(),
    });
  };

  const sampleTotal = sample.parameters.reduce(
    (sum, p) => sum + Number(p.unitPrice || 0),
    0
  );

  return (
    <div className="card" style={{ marginBottom: 16, background: '#FAFBF8' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 14 }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label>Sample Name *</label>
          <input
            required
            value={sample.sampleName}
            onChange={(e) => updateSampleName(e.target.value)}
            placeholder={`e.g. Water Sample ${sampleIndex + 1}`}
          />
        </div>
        {canRemoveSample && (
          <button type="button" className="btn danger" onClick={onRemoveSample}>Remove Sample</button>
        )}
      </div>

      <table className="line-items-table">
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Parameter (optional)</th>
            <th>Parameter Name</th>
            <th style={{ width: 120 }}>Price (₹)</th>
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
              <td>
                <input
                  type="number" min="0" step="0.01" required
                  value={param.unitPrice}
                  onChange={(e) => updateParameter(paramIndex, { unitPrice: e.target.value })}
                />
              </td>
              <td>
                {sample.parameters.length > 1 && (
                  <button type="button" className="btn danger" style={{ padding: '4px 8px' }} onClick={() => removeParameter(paramIndex)}>×</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <button type="button" className="btn secondary" onClick={addParameter}>+ Add Parameter</button>
        <div style={{ fontSize: 13, color: '#666' }}>
          Sample total: <strong>₹{sampleTotal.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  );
}
