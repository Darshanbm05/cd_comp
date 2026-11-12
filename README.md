# Triton Shared Memory Optimization Simulator

A teaching prototype inspired by *Shared Memory Optimization of the Triton Compiler for Domestic NPU*.
This project models the paper's memory-space annotation, shared-memory partitioning, and masked-load
ideas. It is **not** a modification of Triton's compiler and does not claim to reproduce NPU hardware
performance.

## Architecture
- `backend/`: FastAPI service and simulation modules (added in later phases)
- `frontend/`: React + Vite UI (created with the setup commands below)
- `docs/`: paper mapping, design notes, test evidence

## Prerequisites
- Python 3.10+
- Node.js 20+ (LTS recommended)
- npm
- Git (recommended)
- NVIDIA driver / CUDA-capable GPU is useful for later real Triton experiments, but Phase 1 runs on CPU.

## Backend setup (Windows PowerShell)
```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Open http://127.0.0.1:8000/docs

If PowerShell blocks activation, run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## Frontend setup (second terminal)
```powershell
cd frontend
npm install
npm run dev
```
Open the URL printed by Vite (usually http://localhost:5173).

## Check GPU/CUDA later
```powershell
nvidia-smi
```
Then in the Python environment:
```powershell
python -c "import torch; print('torch:', torch.__version__); print('CUDA available:', torch.cuda.is_available()); print('CUDA:', torch.version.cuda)"
```
Do not install a random CUDA toolkit version yet. First inspect the driver and Python environment;
we will choose compatible PyTorch/Triton versions in a later phase.

## Current Phase 1 scope
The API exposes a health endpoint and a project metadata endpoint. The frontend calls the health
endpoint to verify end-to-end connectivity. No optimization or benchmark claims are implemented yet.
