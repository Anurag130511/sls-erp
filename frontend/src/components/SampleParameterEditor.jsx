// One Sample Name, with any number of Parameters tested under it. Each
// parameter has its own Charges field by default — check "Combine price
// with parameter above" on any parameter (except the first) to fold it
// into the pricing group of the parameter directly above it instead,
// sharing one price. Checking it on consecutive parameters chains them
// into a single growing group, so a sample can freely mix individually
// -priced parameters with one or more combined-price groups, all at
// once. Sample Qty. and Sample Count always apply to the whole sample.
export default function SampleParameterEditor({ sample, sampleIndex, onChange, onRemoveSample, catalogParameters, canRemoveSample }) {
  const updateField = (patch) => onChange({ ...sample, ...patch });

  const updateParameter = (paramIndex, patch) => {
    const nextParameters = [...sample.parameters];
    nextParameters[paramIndex] = { ...nextParameters[paramIndex], ...patch };
    onChange({ ...sample, parameters: nextParameters });
  };

  const addParameter = () => {
    onChange({
      ...sample,
      parameters: [...sample.parameters, { parameterId: null, description: '', charges: '', combineWithPrevious: false }],
    });
  };

  const removeParameter = (paramIndex) => {
    const nextParameters = sample.parameters.filter((_, i) => i !== paramIndex);
    // If we removed the first parameter, the new first one can't stay
    // marked as "combine with previous" — there's nothing above it now.
    if (paramIndex === 0 && nextParameters.length > 0) {
      nextParameters[0] = { ...nextParameters[0], combineWithPrevious: false };
    }
    onChange({ ...sample, parameters: nextParameters });
  };

  const pickCatalogParameter = (paramIndex, parameterId) => {
    const entry = catalogParameters.find((p) => String(p.id) === String(parameterId));
    if (!entry) {
      updateParameter(paramIndex, { parameterId: null });
      return;
    }
    updateParameter(paramIndex, { parameterId: entry.id, description: entry.name });
  };

  // Live total: walk the parameters, starting a new price group whenever
  // combineWithPrevious is false, summing each group's own price once.
  let lineTotal = 0;
  sample.parameters.forEach((p, i) => {
    if (i === 0 || !p.combineWithPrevious) lineTotal += Number(p.charges || 0);
  });
  lineTotal *= Number(sample.sampleQty || 1) * Number(sample.sampleCount || 1);

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

      <table className="line-items-table" style={{ marginBottom: 10 }}>
        <thead>
          <tr>
            <th style={{ width: '25%' }}>From catalog (optional)</th>
            <th>Parameter Name</th>
            <th style={{ width: 100 }}>Charges (₹)</th>
            <th style={{ width: 150 }}>Combine with above</th>
            <th style={{ width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {sample.parameters.map((param, paramIndex) => {
            const combined = paramIndex > 0 && Boolean(param.combineWithPrevious);
            return (
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
                  {combined ? (
                    <span style={{ fontSize: 11, color: '#888' }}>shares price above</span>
                  ) : (
                    <input
                      type="number" min="0" step="0.01" required
                      value={param.charges}
                      onChange={(e) => updateParameter(paramIndex, { charges: e.target.value })}
                    />
                  )}
                </td>
                <td>
                  {paramIndex > 0 && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <input
                        type="checkbox"
                        style={{ width: 'auto' }}
                        checked={combined}
                        onChange={(e) => updateParameter(paramIndex, { combineWithPrevious: e.target.checked, charges: e.target.checked ? '' : param.charges })}
                      />
                      Combine
                    </label>
                  )}
                </td>
                <td>
                  {sample.parameters.length > 1 && (
                    <button type="button" className="btn danger" style={{ padding: '4px 8px' }} onClick={() => removeParameter(paramIndex)}>×</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button type="button" className="btn secondary" onClick={addParameter} style={{ marginBottom: 14 }}>+ Add Parameter</button>

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
