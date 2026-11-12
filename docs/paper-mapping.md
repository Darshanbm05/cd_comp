# Mapping to the supplied IEEE paper

| Paper concept | Paper location | Planned prototype module |
|---|---|---|
| `memory_space` semantic extension | Section III, page 2 | Frontend kernel input + compiler IR annotation |
| Attribute propagation / memory-space identification | Figure 1 and Figure 2, page 2 | Compiler pipeline |
| Shared-memory expansion | Section IV-B, page 3 | Partition allocator |
| `program_id % num_per_core` and offset calculation | Equation (2), page 3 | Partition mapping engine |
| Mask and fill-value handling | Section IV-C, page 4 | Masked-load safety module |
| Reduction and matrix multiplication evaluation | Section V, pages 4–5 | Operator benchmark module |

Important: this project is a software model inspired by the paper. The paper describes a Triton-Shared / MLIR compiler path and a domestic NPU target. Our prototype does not reproduce that compiler or target hardware unless a later phase explicitly adds a real Triton-on-NVIDIA experiment.
