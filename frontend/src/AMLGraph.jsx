import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const BASE_URL = "http://127.0.0.1:8000/api";

export default function AMLGraph() {

  const svgRef = useRef(null);
  const [walletTable, setWalletTable] = useState([]);

  useEffect(() => {

    Promise.all([
      fetch(`${BASE_URL}/graph/`).then(r => r.json()),
      fetch(`${BASE_URL}/final-risk/`).then(r => r.json()),
      fetch(`${BASE_URL}/risk-scores/`).then(r => r.json())
    ])
      .then(([graph, finalRisk, riskScores]) => {

        setWalletTable(riskScores.wallets || []);

        renderGraph(graph, finalRisk, riskScores);

      })
      .catch(err => console.error(err));

  }, []);

  const renderGraph = (graph, finalRisk, riskScores) => {

    const width = window.innerWidth - 420;
    const height = window.innerHeight;

    const riskMap = {};
    (finalRisk?.wallets || []).forEach(w => {
      riskMap[w.id] = w;
    });

    const riskScoresMap = {};
    (riskScores?.wallets || []).forEach(w => {
      riskScoresMap[w.id] = w;
    });

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .style("background", "#f8fafc");

    svg.selectAll("*").remove();

    const container = svg.append("g");

    svg.call(
      d3.zoom()
        .scaleExtent([0.3, 4])
        .on("zoom", e => container.attr("transform", e.transform))
    );

    const defs = svg.append("defs");

    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#64748b");

    const degree = {};

    graph.edges.forEach(e => {
      degree[e.source] = (degree[e.source] || 0) + 1;
      degree[e.target] = (degree[e.target] || 0) + 1;
    });

    const extent = d3.extent(Object.values(degree));

    const radius = d3.scaleLinear()
      .domain(extent[0] === extent[1] ? [0, extent[1] || 1] : extent)
      .range([8, 26]);

    const sim = d3.forceSimulation(graph.nodes)
      .force("link", d3.forceLink(graph.edges).id(d => d.id).distance(140))
      .force("charge", d3.forceManyBody().strength(-420))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const tooltip = d3.select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "#ffffff")
      .style("border", "1px solid #ddd")
      .style("padding", "10px")
      .style("border-radius", "8px")
      .style("font-size", "13px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    const link = container.append("g")
      .selectAll("line")
      .data(graph.edges)
      .enter()
      .append("line")
      .attr("stroke", "#64748b")
      .attr("stroke-width", 1.2)
      .attr("marker-end", "url(#arrow)");

    const node = container.append("g")
      .selectAll("circle")
      .data(graph.nodes)
      .enter()
      .append("circle")
      .attr("r", d => radius(degree[d.id] || 1))
      .attr("fill", d => {

        const r =
          riskMap[d.id]?.final_risk ??
          riskScoresMap[d.id]?.base_risk ??
          0;

        if (r >= 0.85) return "#dc2626";
        if (r >= 0.6) return "#f97316";
        if (r >= 0.3) return "#22c55e";

        return "#2563eb";

      })
      .on("click", (e, d) => {

        e.stopPropagation();

        const info = riskMap[d.id];
        const base = riskScoresMap[d.id]?.base_risk ?? 0;

        const finalRiskValue = info?.final_risk ?? base ?? 0;

        tooltip
          .style("opacity", 1)
          .style("left", e.pageX + 10 + "px")
          .style("top", e.pageY + 10 + "px")
          .html(`
            <div><strong>${d.id}</strong></div>
            <div>Final Risk: ${(finalRiskValue * 100).toFixed(1)}%</div>
            <div>Base Risk: ${(base * 100).toFixed(1)}%</div>
          `);

      })
      .call(
        d3.drag()
          .on("start", e => !e.active && sim.alphaTarget(0.3).restart())
          .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on("end", e => !e.active && sim.alphaTarget(0))
      );

    d3.select("body").on("click", () => {
      tooltip.style("opacity", 0);
    });

    sim.on("tick", () => {

      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

    });

  };

  return (

    <div className="fixed inset-0 flex bg-white">

      {/* GRAPH */}

      <div className="flex-1">
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {/* TABLE */}

      <div className="w-[420px] border-l border-gray-200 bg-gray-50 overflow-y-auto p-4">

        <h2 className="text-lg font-semibold mb-4">
          AML Predictions
        </h2>

        <table className="w-full text-sm">

          <thead className="border-b text-gray-600">
            <tr>
              <th className="py-2 text-left">Wallet</th>
              <th className="py-2 text-left">Risk</th>
            </tr>
          </thead>

          <tbody>

            {walletTable
              .sort((a,b)=>b.base_risk-a.base_risk)
              .slice(0,50)
              .map((w,i)=>{

                const risk = (w.base_risk*100).toFixed(1)

                return (
                  <tr key={i} className="border-b">

                    <td className="py-2 font-mono text-xs">
                      {w.id}
                    </td>

                    <td className="py-2 font-semibold">

                      <span className={
                        w.base_risk >= 0.85
                        ? "text-red-600"
                        : w.base_risk >= 0.6
                        ? "text-orange-500"
                        : "text-green-600"
                      }>
                        {risk}%
                      </span>

                    </td>

                  </tr>
                )

              })}

          </tbody>

        </table>

      </div>

    </div>

  );

}