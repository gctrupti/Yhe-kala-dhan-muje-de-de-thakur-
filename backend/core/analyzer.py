"""
AML Mode Router

Decides which AML pipeline to execute.
"""

from core.crypto_pipeline import run_crypto_pipeline


def run_aml_pipeline(csv_path: str, mode: str):

    if mode == "crypto":
        return run_crypto_pipeline(csv_path)

    if mode == "banking":
        # Banking pipeline will be implemented in Phase 3
        raise NotImplementedError("Banking AML pipeline not implemented yet")

    raise ValueError(f"Unsupported AML mode: {mode}")