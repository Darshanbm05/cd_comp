from typing import Any

def simulate_masked_load(
    data_length: int,
    block_size: int,
    num_programs: int,
    num_per_core: int,
    other: float,
    partition_stride: int | None = None,
) -> dict[str, Any]:
    """Simulate 1D masked loads into per-compute-unit shared-memory regions.

    partition_stride defaults to block_size (the safe non-overlapping layout).
    A smaller custom stride is an intentional fault-injection mode for demonstrating
    what overlapping shared-memory partitions would look like.
    """
    if not 1 <= data_length <= 65536:
        raise ValueError("data_length must be between 1 and 65536.")
    if not 1 <= block_size <= 4096:
        raise ValueError("block_size must be between 1 and 4096.")
    if not 1 <= num_programs <= 128:
        raise ValueError("num_programs must be between 1 and 128.")
    if not 1 <= num_per_core <= 64:
        raise ValueError("num_per_core must be between 1 and 64.")
    if not isinstance(other, (int, float)):
        raise ValueError("other must be numeric.")
    stride = block_size if partition_stride is None else partition_stride
    if not 1 <= stride <= 4096:
        raise ValueError("partition_stride must be between 1 and 4096.")

    # Deterministic input makes the demonstration reproducible.
    source = [float(i + 1) for i in range(data_length)]
    by_core: dict[int, list[dict[str, Any]]] = {}
    programs = []
    total_valid = 0
    total_masked = 0
    total_fill = 0

    for pid in range(num_programs):
        core_id = pid // num_per_core
        cuid = pid % num_per_core
        global_start = pid * block_size
        shared_start = cuid * stride
        shared_end = shared_start + block_size
        lanes = []
        for lane in range(block_size):
            global_index = global_start + lane
            valid = global_index < data_length
            value = source[global_index] if valid else float(other)
            lanes.append({
                "lane": lane,
                "global_index": global_index,
                "mask_valid": valid,
                "value": value,
                "action": "LOAD" if valid else "FILL(other)",
            })
            if valid:
                total_valid += 1
            else:
                total_masked += 1
                total_fill += 1

        program = {
            "program_id": pid,
            "core_id": core_id,
            "compute_unit_id": cuid,
            "global_range": [global_start, global_start + block_size],
            "shared_range": [shared_start, shared_end],
            "valid_elements": sum(x["mask_valid"] for x in lanes),
            "masked_elements": sum(not x["mask_valid"] for x in lanes),
            "lanes": lanes,
        }
        programs.append(program)
        by_core.setdefault(core_id, []).append(program)

    conflicts = []
    for core_id, items in by_core.items():
        ordered = sorted(items, key=lambda p: p["shared_range"][0])
        for i, left in enumerate(ordered):
            for right in ordered[i + 1:]:
                a0, a1 = left["shared_range"]
                b0, b1 = right["shared_range"]
                overlap_start = max(a0, b0)
                overlap_end = min(a1, b1)
                if overlap_start < overlap_end:
                    conflicts.append({
                        "core_id": core_id,
                        "program_a": left["program_id"],
                        "program_b": right["program_id"],
                        "overlap_range": [overlap_start, overlap_end],
                        "overlap_elements": overlap_end - overlap_start,
                    })

    return {
        "data_length": data_length,
        "block_size": block_size,
        "num_programs": num_programs,
        "num_per_core": num_per_core,
        "other": other,
        "partition_stride": stride,
        "used_default_safe_stride": partition_stride is None or stride == block_size,
        "total_valid_loads": total_valid,
        "total_masked_lanes": total_masked,
        "total_fill_operations": total_fill,
        "programs": programs,
        "conflict_count": len(conflicts),
        "conflicts": conflicts,
        "is_memory_layout_safe": len(conflicts) == 0,
        "note": "1D educational simulation. The mask protects global input bounds; partition overlap is checked separately. A custom stride smaller than block_size is fault injection, not the paper's recommended mapping.",
    }
