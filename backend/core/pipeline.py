"""
Pipeline entry point.
Routes execution to the correct AML engine.
"""

from core.analyzer import run_aml_pipeline


def run_full_analysis(csv_path: str, mode: str = "crypto") -> dict:

    return run_aml_pipeline(csv_path, mode)