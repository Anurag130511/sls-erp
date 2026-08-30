// Matches the lab's real quotation format: one Sample Name, a list of
// Parameters tested for it (name only — no per-parameter price), and a
// single Charges/Sample rate multiplied by Sample Qty and Sample Count
// to get that sample's line total. "+ Add Parameter" adds another
// parameter to the list; "+ Add Sample" (rendered by the parent form)
// starts a new sample block.
export default function SampleParameterEditor({ sample, sampleIndex, onChange, onRemoveSample, catalogParameters, canRemoveSample }) {
  const updateField = (patch) => onChange({ ...sample, ...patch });

  const updateParameter = (paramIndex, patch) => {
    const nextParameters = [...sample.parameters];
    nextParameters[paramIndex] = { ...nextParameters[paramIndex], ...patch };
    onChange({ ...sample, parameters: nextParameters });
  };

  const addParameter = () => {
    onChange({ ...sample, parameters: [...sample.parameters, { parameterId: null, description: '' }] });
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

  const lineTotal = Number(sample.chargesPerSample || 0) * Number(sample.sampleQty || 1) * Number(sample.sampleCount || 1);

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

      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Parameters</label>
      <table className="line-items-table" style={{ marginBottom: 10 }}>
        <thead>
          <tr>
            <th style={{ width: '30%' }}>From catalog (optional)</th>
            <th>Parameter Name</th>
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
                {sample.parameters.length > 1 && (
                  <button type="button" className="btn danger" style={{ padding: '4px 8px' }} onClick={() => removeParameter(paramIndex)}>×</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn secondary" onClick={addParameter} style={{ marginBottom: 14 }}>+ Add Parameter</button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Sample Qty. *</label>
          <input
            type="number" min="0" step="1" required
            value={sample.sampleQty}
            onChange={(e) => updateField({ sampleQty: e.target.value })}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Charges/Sample (₹) *</label>
          <input
            type="number" min="0" step="0.01" required
            value={sample.chargesPerSample}
            onChange={(e) => updateField({ chargesPerSample: e.target.value })}
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
