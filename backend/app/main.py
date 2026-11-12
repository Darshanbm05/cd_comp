from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.compiler.pipeline import analyze_kernel
from app.memory.partition import build_partition_map, validate_disjoint_partitions
from app.memory.masked_load import simulate_masked_load

app = FastAPI(title="Triton Shared Memory Simulator API", version="0.4.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class KernelRequest(BaseModel):
    source: str = Field(min_length=1, max_length=12000)

class PartitionRequest(BaseModel):
    num_per_core: int = Field(default=4, ge=1, le=64)
    block_shape: list[int] = Field(default=[128], min_length=1, max_length=3)
    num_programs: int = Field(default=8, ge=1, le=256)

class MaskedLoadRequest(BaseModel):
    data_length: int = Field(default=10, ge=1, le=65536)
    block_size: int = Field(default=4, ge=1, le=4096)
    num_programs: int = Field(default=3, ge=1, le=128)
    num_per_core: int = Field(default=4, ge=1, le=64)
    other: float = 0.0
    partition_stride: int | None = Field(default=None, ge=1, le=4096)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "triton-shared-memory-simulator"}

@app.get("/api/project")
def project_info():
    return {"name": "Triton Shared Memory Optimization Simulator", "version": "0.4.0", "phase": 4}

@app.post("/api/compiler/analyze")
def compiler_analyze(request: KernelRequest):
    try:
        return analyze_kernel(request.source)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

@app.post("/api/memory/partition")
def memory_partition(request: PartitionRequest):
    try:
        result = build_partition_map(request.num_per_core, request.block_shape, request.num_programs)
        result["validation"] = validate_disjoint_partitions(result)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

@app.post("/api/memory/masked-load")
def memory_masked_load(request: MaskedLoadRequest):
    try:
        return simulate_masked_load(
            data_length=request.data_length,
            block_size=request.block_size,
            num_programs=request.num_programs,
            num_per_core=request.num_per_core,
            other=request.other,
            partition_stride=request.partition_stride,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
