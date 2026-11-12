import { useState } from 'react'
import PartitionLab from './PartitionLab.jsx'
import MaskedLoadLab from './MaskedLoadLab.jsx'
const API = 'http://127.0.0.1:8000'
const sample = `import triton
import triton.language as tl

@triton.jit
def demo(X, Y, N: tl.constexpr):
    pid = tl.program_id(0)
    offsets = pid * 128 + tl.arange(0, 128)
    x = tl.load(X + offsets, mask=offsets < N, other=0, memory_space="shared")
    y = tl.load(Y + offsets, mask=offsets < N, other=0, memory_space="global")
`
export default function App() {
  const [source,setSource] = useState(sample)
  const [result,setResult] = useState(null)
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  async function analyze() {
    setBusy(true); setError(''); setResult(null)
    try {
      const r = await fetch(`${API}/api/compiler/analyze`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source})})
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Analysis failed')
      setResult(data)
    } catch(e) { setError(e.message) } finally { setBusy(false) }
  }
  return <main className="shell">
    <header className="topbar"><div className="brand-mark">SM</div><div><p className="eyebrow">COMPILER DESIGN PROJECT</p><h1>Shared Memory Lab</h1></div><span className="phase">PHASE 02 · COMPILER PIPELINE</span></header>
    <section className="hero"><p className="eyebrow">COMPILER EXPLORER</p><h2>Trace memory semantics<br/>through the compiler pipeline.</h2><p className="intro">Submit a Triton-like kernel. The prototype identifies tl.load operations, memory-space annotations, masks, and illustrative intermediate representations.</p></section>
    <section className="workspace">
      <article className="panel"><p className="eyebrow">01 / KERNEL SOURCE</p><h3>Kernel editor</h3><textarea spellCheck="false" value={source} onChange={e=>setSource(e.target.value)}/><button className="run" disabled={busy} onClick={analyze}>{busy?'Analyzing…':'Analyze compiler pipeline →'}</button><button className="secondary" onClick={()=>{setSource(sample);setResult(null);setError('')}}>Reset example</button>{error&&<p className="error">{error}</p>}</article>
      <article className="panel"><p className="eyebrow">02 / PIPELINE</p><h3>Compilation stages</h3>{['Kernel input','Parameter recognition','Attribute propagation','Memory-space identification','Allocation representation'].map((s,i)=><div className="stage-row" key={s}><span className="stage-no">0{i+1}</span><strong>{s}</strong><span className={result?'done':''}>{result?'DONE':'WAITING'}</span></div>)}</article>
    </section>
    {result&&<><section className="stats">{[['LOAD OPERATIONS',result.load_count],['SHARED LOADS',result.shared_loads],['GLOBAL LOADS',result.global_loads],['MASKED LOADS',result.masked_loads]].map(([k,v])=><div className="panel stat" key={k}><span>{k}</span><b>{v}</b></div>)}</section>
    <section className="panel results"><p className="eyebrow">03 / MEMORY-SPACE ANALYSIS</p><h3>Detected load operations</h3>{result.loads.map(x=><div className="load-card" key={x.id}><b>{x.id}</b><span className={`memory ${x.memory_space}`}>{x.memory_space.toUpperCase()}</span><code>{x.source_excerpt}</code><p>Mask: {x.has_mask?'present':'absent'} · Fill value: {x.has_other?'present':'absent'}</p></div>)}<p className="eyebrow">04 / INTERMEDIATE REPRESENTATION</p>{result.ir.map((x,i)=><div className="ir-row" key={i}><span>{x.stage}</span><code>{x.representation}</code><p>{x.meaning}</p></div>)}<p className="notice">{result.notice}</p></section></>}
    <PartitionLab />
    <MaskedLoadLab />
    <footer>Educational compiler model · No claim of actual Triton/MLIR compilation</footer>
  </main>
}
