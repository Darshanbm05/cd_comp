import re

LOAD_RE = re.compile(r"tl\.load\s*\((.*?)\)", re.DOTALL)
SPACE_RE = re.compile(r"""memory_space\s*=\s*["'](global|shared)["']""")
MASK_RE = re.compile(r"\bmask\s*=")
OTHER_RE = re.compile(r"\bother\s*=")

def analyze_kernel(source: str):
    if not source.strip():
        raise ValueError("Kernel source cannot be empty.")
    loads = []
    for i, match in enumerate(LOAD_RE.finditer(source), 1):
        args = match.group(1)
        sm = SPACE_RE.search(args)
        space = sm.group(1) if sm else "global"
        excerpt = "tl.load(" + " ".join(args.split())[:100] + ")"
        loads.append({"id": f"load_{i}", "operation": "tt.load",
          "memory_space": space, "has_mask": bool(MASK_RE.search(args)),
          "has_other": bool(OTHER_RE.search(args)), "source_excerpt": excerpt})
    if not loads:
        raise ValueError("No tl.load(...) operation was found.")
    ir = []
    for load in loads:
        ir.extend([
          {"stage":"frontend","representation":load["source_excerpt"],"meaning":"High-level tensor load."},
          {"stage":"triton_ir","representation":f'tt.load {{memory_space = "{load["memory_space"]}"}}',"meaning":"Load with memory-space metadata."},
          {"stage":"linalg_lowering","representation":f'memref.alloc(..., address_space={3 if load["memory_space"]=="shared" else 1})',"meaning":"Illustrative address-space allocation."}
        ])
    return {"load_count":len(loads),
      "shared_loads":sum(x["memory_space"]=="shared" for x in loads),
      "global_loads":sum(x["memory_space"]=="global" for x in loads),
      "masked_loads":sum(x["has_mask"] for x in loads),
      "loads":loads,"ir":ir,
      "notice":"Educational IR model only; not actual Triton/MLIR compiler output."}
