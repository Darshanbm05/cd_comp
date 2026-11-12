import { useState } from 'react'

const API = 'http://127.0.0.1:8000'

export default function PartitionLab() {
  const [units, setUnits] = useState(4)
  const [block, setBlock] = useState('128')
  const [programs, setPrograms] = useState(8)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true); setError(''); setResult(null)
    try {
      const dims = block.split(',').map(x => Number(x.trim()))
      if (dims.some(x => !Number.isInteger(x) || x < 1)) throw new Error('Enter block dimensions like 128 or 64,64.')
      const response = await fetch(`${API}/api/memory/partition`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({num_per_core: units, block_shape: dims, num_programs: programs})
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Partition calculation failed')
      setResult(data)
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  return <section className="panel partition-lab">
    <p className="eyebrow">PHASE 03 / SHARED MEMORY PARTITION MANAGEMENT</p>
    <h3>Compute-unit partition simulator</h3>
    <p className="muted">Change the number of compute units, block shape, and program instances. The backend calculates deterministic regions and checks for overlap within each logical core.</p>
    <div className="controls">
      <label>Compute units per core<input type="number" min="1" max="64" value={units} onChange={e=>setUnits(Number(e.target.value))}/></label>
      <label>Block shape (comma-separated)<input value={block} onChange={e=>setBlock(e.target.value)} placeholder="128 or 64,64"/></label>
      <label>Program instances<input type="number" min="1" max="256" value={programs} onChange={e=>setPrograms(Number(e.target.value))}/></label>
    </div>
    <button className="run" disabled={busy} onClick={run}>{busy?'Calculating…':'Calculate memory partitions →'}</button>
    {error && <p className="error">{error}</p>}
    {result && <>
      <div className="stats">
        <div className="stat panel"><span>ELEMENTS / BLOCK</span><b>{result.elements_per_block}</b></div>
        <div className="stat panel"><span>FP32 BYTES / CORE</span><b>{result.bytes_per_core_fp32.toLocaleString()}</b></div>
        <div className="stat panel"><span>CONFLICTS</span><b>{result.validation.conflict_count}</b></div>
        <div className="stat panel"><span>LOGICAL CORES</span><b>{Math.ceil(result.num_programs/result.num_per_core)}</b></div>
      </div>
      <div className="memory-map">
        {result.partitions.map(p=><div className="partition-card" key={p.program_id}>
          <div><b>Program {p.program_id}</b><span>Core {p.core_id} · Unit {p.compute_unit_id}</span></div>
          <div className="bar-track"><div className="bar-fill" style={{width:`${100/result.num_per_core}%`,marginLeft:`${p.compute_unit_id*100/result.num_per_core}%`}}/></div>
          <code>offset = {p.offset_elements} · range [{p.offset_elements}, {p.end_element_exclusive})</code>
          <small>Paper-style offset vector: [{p.offset_vector_paper_style.join(', ')}]</small>
        </div>)}
      </div>
      <p className={result.validation.is_disjoint?'notice success':'notice'}>{result.validation.is_disjoint?'No overlapping regions detected within logical cores.':'Overlapping memory regions detected.'}</p>
      <p className="muted">{result.model_note}</p>
    </>}
  </section>
}
