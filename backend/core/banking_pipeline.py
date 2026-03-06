import pandas as pd
import networkx as nx

from core.ml_detector import transaction_ml_risk


def run_banking_pipeline(csv_path: str):

    df = pd.read_csv(csv_path)

    # normalize column names
    df = df.rename(columns={
        "src": "src_id",
        "dst": "dst_id",
    })

    REQUIRED = {"src_id", "dst_id", "amount"}

    missing = REQUIRED - set(df.columns)

    if missing:
        raise ValueError(f"Banking dataset missing columns: {missing}")

    G = nx.DiGraph()

    wallet_scores = {}

    for _, row in df.iterrows():

        src = row["src_id"]
        dst = row["dst_id"]
        amount = float(row["amount"])

        G.add_edge(src, dst, amount=amount)

        prob = transaction_ml_risk(src, dst, amount)

        wallet_scores[src] = max(wallet_scores.get(src, 0), prob)
        wallet_scores[dst] = max(wallet_scores.get(dst, 0), prob)

    base_risks = {}

    for wallet, risk in wallet_scores.items():

        base_risks[wallet] = {
            "base_risk": round(risk, 3),
            "ml_risk": round(risk, 3),
            "reasons": ["ML model detected suspicious transaction"]
        }

    return {
        "graph": G,
        "graph_summary": {
            "num_nodes": G.number_of_nodes(),
            "num_edges": G.number_of_edges(),
        },
        "node_features": {},
        "edge_features": {},
        "patterns": {},
        "base_risks": base_risks,
        "gnn_risks": None,
    }