// One Sample Name, with any number of Parameters tested under it. Each
// parameter has its own Charges field by default — check "Combine price
// with parameter above" on any parameter (except the first) to fold it
// into the pricing group of the parameter directly above it instead,
// sharing one price. Checking it on consecutive parameters chains them
// into a single growing group, so a sample can freely mix individually
// -priced parameters with one or more combined-price groups, all at
// once. Sample Qty. and Sample Count always apply to the whole sample.
import { useState } from 'react';
import { api } from '../api/client';

export default function SampleParameterEditor({ sample, sampleIndex, onChange, onRemoveSample, catalogParameters, canRemoveSample }) {
  const [autoFillNote, setAutoFillNote] = useState('');

  // Group the catalog dropdown by category (Physical/Chemical/etc.) so
  // it's easy to browse instead of one long flat list — anything
  // without a category falls under "Other."
  const catalogGroups = [];
  for (const p of catalogParameters) {
    const cat = p.category || 'Other';
    let group = catalogGroups.find((g) => g.category === cat);
    if (!group) {
      group = { category: cat, items: [] };
      catalogGroups.push(group);
    }
    group.items.push(p);
  }

  const updateField = (patch) => onChange({ ...sample, ...patch });

  // If this sample name matches one used on a past quotation, offer to
  // fill in the same parameters automatically — only when the parameter
  // list is still untouched (a single blank row), so it never overwrites
  // anything the person has already started entering by hand.
  const isUntouched = sample.parameters.length === 1 && !sample.parameters[0].description.trim();

  const handleSampleNameBlur = async () => {
    setAutoFillNote('');
    const name = sample.sampleName.trim();
    if (!name || !isUntouched) return;
    try {
      const match = await api.get(`/quotations/sample-lookup?sampleName=${encodeURIComponent(name)}`);
      if (match && match.parameters && match.parameters.length > 0) {
        onChange({
          ...sample,
          sampleQty: match.sampleQty,
          sampleCount: match.sampleCount,
          parameters: match.parameters,
        });
        setAutoFillNote(`Filled in from a previous "${name}" quotation — adjust as needed.`);
      }
    } catch (err) {
      // Silent — auto-fill is a convenience, not something worth
      // interrupting the form for if it fails.
    }
  };

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
            onBlur={handleSampleNameBlur}
            placeholder={`e.g. Water Sample ${sampleIndex + 1}`}
          />
        </div>
        {canRemoveSample && (
          <button type="button" className="btn danger" onClick={onRemoveSample}>Remove Sample</button>
        )}
      </div>

      {autoFillNote && (
        <p style={{ fontSize: 12, color: 'var(--green-dark)', marginTop: -8, marginBottom: 10 }}>{autoFillNote}</p>
      )}

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
                    {catalogGroups.map((group) => (
                      <optgroup key={group.category} label={group.category}>
                        {group.items.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </optgroup>
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
