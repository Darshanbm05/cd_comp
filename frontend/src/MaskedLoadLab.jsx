import { useState } from 'react'

const API = 'http://127.0.0.1:8000'

export default function MaskedLoadLab() {
  const [length, setLength] = useState(10)
  const [block, setBlock] = useState(4)
  const [programs, setPrograms] = useState(3)
  const [units, setUnits] = useState(4)
  const [other, setOther] = useState(0)
  const [unsafe, setUnsafe] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function simulate() {
    setBusy(true); setError(''); setResult(null)
    try {
      const body = {
        data_length: Number(length),
        block_size: Number(block),
        num_programs: Number(programs),
        num_per_core: Number(units),
        other: Number(other),
      }
      // Fault-injection mode deliberately compresses partitions to expose overlap.
      if (unsafe) body.partition_stride = Math.max(1, Number(block) - 1)
      const response = await fetch(`${API}/api/memory/masked-load`, {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Masked-load simulation failed')
      setResult(data)
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  return <section className="panel mask-lab">
    <p className="eyebrow">PHASE 04 / MASKED LOAD SAFETY</p>
    <h3>Masked-load and bounds simulator</h3>
    <p className="muted">Simulate global input loads, per-lane masks, fill values, and compute-unit shared-memory regions. Mask safety and partition-overlap safety are reported separately.</p>
    <div className="controls">
      <label>Input data length<input type="number" min="1" max="65536" value={length} onChange={e=>setLength(e.target.value)}/></label>
      <label>Block size<input type="number" min="1" max="4096" value={block} onChange={e=>setBlock(e.target.value)}/></label>
      <label>Program instances<input type="number" min="1" max="128" value={programs} onChange={e=>setPrograms(e.target.value)}/></label>
      <label>Compute units per core<input type="number" min="1" max="64" value={units} onChange={e=>setUnits(e.target.value)}/></label>
      <label>Fill value (other)<input type="number" value={other} onChange={e=>setOther(e.target.value)}/></label>
    </div>
    <label className="fault-toggle"><input type="checkbox" checked={unsafe} onChange={e=>setUnsafe(e.target.checked)}/> Enable overlap fault injection (unsafe partition stride)</label>
    <button className="run" disabled={busy} onClick={simulate}>{busy?'Simulating…':'Simulate masked loads →'}</button>
    {error && <p className="error">{error}</p>}
    {result && <>
      <div className="stats">
        <div className="stat panel"><span>VALID LOADS</span><b>{result.total_valid_loads}</b></div>
        <div className="stat panel"><span>MASKED LANES</span><b>{result.total_masked_lanes}</b></div>
        <div className="stat panel"><span>FILL OPERATIONS</span><b>{result.total_fill_operations}</b></div>
        <div className="stat panel"><span>PARTITION CONFLICTS</span><b>{result.conflict_count}</b></div>
      </div>
      <div className={`notice ${result.is_memory_layout_safe?'success':'danger'}`}>
        {result.is_memory_layout_safe?'No shared-memory partition overlap detected.':'Partition overlap detected: concurrent compute units could overwrite the same shared-memory addresses.'}
      </div>
      <h3 className="subheading">Per-program masked-load results</h3>
      <div className="program-results">
        {result.programs.map(p=><article className="program-result" key={p.program_id}>
          <div className="program-heading"><b>Program {p.program_id}</b><span>Core {p.core_id} · Unit {p.compute_unit_id}</span></div>
          <p className="muted">Global range [{p.global_range[0]}, {p.global_range[1]}) · Shared range [{p.shared_range[0]}, {p.shared_range[1]})</p>
          <div className="lane-grid">
            {p.lanes.map(l=><div className={`lane ${l.mask_valid?'valid':'masked'}`} key={l.lane}>
              <b>{l.value}</b><small>idx {l.global_index}</small><small>{l.action}</small>
            </div>)}
          </div>
          <p className="muted">Valid: {p.valid_elements} · Masked: {p.masked_elements}</p>
        </article>)}
      </div>
      {result.conflicts.length>0 && <div className="conflict-list"><b>Detected overlapping regions</b>{result.conflicts.map((c,i)=><p key={i}>Core {c.core_id}: Program {c.program_a} and Program {c.program_b}, overlap [{c.overlap_range[0]}, {c.overlap_range[1]}) — {c.overlap_elements} elements</p>)}</div>}
      <p className="muted">{result.note}</p>
    </>}
  </section>
}
