from math import prod
from typing import Any

def build_partition_map(num_per_core: int, block_shape: list[int], num_programs: int) -> dict[str, Any]:
    if not 1 <= num_per_core <= 64:
        raise ValueError("num_per_core must be between 1 and 64.")
    if not 1 <= num_programs <= 256:
        raise ValueError("num_programs must be between 1 and 256.")
    if not block_shape or len(block_shape) > 3:
        raise ValueError("block_shape must contain 1 to 3 dimensions.")
    if any(not isinstance(d, int) or d < 1 or d > 65536 for d in block_shape):
        raise ValueError("Every block dimension must be an integer from 1 to 65536.")

    elements_per_block = prod(block_shape)
    bytes_per_block_fp32 = elements_per_block * 4
    bytes_per_core_fp32 = num_per_core * bytes_per_block_fp32
    partitions = []

    for program_id in range(num_programs):
        core_id = program_id // num_per_core
        compute_unit_id = program_id % num_per_core
        # Paper's partitioning idea: each unit gets a deterministic disjoint subregion.
        # For a contiguous flattened allocation, the subregion starts at CU * block_elements.
        linear_offset = compute_unit_id * elements_per_block
        offset_vector = [compute_unit_id * dim for dim in block_shape]
        partitions.append({
            "program_id": program_id,
            "core_id": core_id,
            "compute_unit_id": compute_unit_id,
            "offset_elements": linear_offset,
            "offset_vector_paper_style": offset_vector,
            "end_element_exclusive": linear_offset + elements_per_block,
            "region_elements": elements_per_block,
            "region_bytes_fp32": bytes_per_block_fp32,
        })

    return {
        "num_per_core": num_per_core,
        "num_programs": num_programs,
        "block_shape": block_shape,
        "elements_per_block": elements_per_block,
        "bytes_per_block_fp32": bytes_per_block_fp32,
        "bytes_per_core_fp32": bytes_per_core_fp32,
        "partitions": partitions,
        "model_note": (
            "Core-local allocation is num_per_core * block_elements. "
            "program_id // num_per_core identifies the logical core and "
            "program_id % num_per_core identifies its compute unit. "
            "The flattened offset is used for disjoint-region validation; "
            "offset_vector_paper_style mirrors the paper's per-dimension formula."
        ),
    }


def validate_disjoint_partitions(result: dict[str, Any]) -> dict[str, Any]:
    by_core: dict[int, list[dict[str, Any]]] = {}
    for p in result["partitions"]:
        by_core.setdefault(p["core_id"], []).append(p)

    overlaps = []
    for core_id, items in by_core.items():
        ordered = sorted(items, key=lambda x: x["offset_elements"])
        for left, right in zip(ordered, ordered[1:]):
            if left["end_element_exclusive"] > right["offset_elements"]:
                overlaps.append({
                    "core_id": core_id,
                    "program_a": left["program_id"],
                    "program_b": right["program_id"],
                })
    return {
        "conflict_count": len(overlaps),
        "conflicts": overlaps,
        "is_disjoint": len(overlaps) == 0,
    }
