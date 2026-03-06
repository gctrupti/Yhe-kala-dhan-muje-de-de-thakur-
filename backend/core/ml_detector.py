import joblib
import pandas as pd
from pathlib import Path

MODEL_PATH = Path(__file__).parent / "aml_model_banking.pkl"

model = joblib.load(MODEL_PATH)


def transaction_ml_risk(src_id, dst_id, amount):

    X = pd.DataFrame({
        "src_id": [hash(src_id) % 100000],
        "dst_id": [hash(dst_id) % 100000],
        "amount": [amount]
    })

    prob = model.predict_proba(X)[0][1]

    return float(prob)