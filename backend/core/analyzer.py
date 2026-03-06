from core.crypto_pipeline import run_crypto_pipeline
from core.banking_pipeline import run_banking_pipeline


def run_aml_pipeline(csv_path: str, mode: str):

    if mode == "crypto":
        return run_crypto_pipeline(csv_path)

    if mode == "banking":
        return run_banking_pipeline(csv_path)

    raise ValueError(f"Unsupported AML mode: {mode}")