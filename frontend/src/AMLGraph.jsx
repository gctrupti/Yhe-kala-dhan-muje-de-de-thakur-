import { useEffect, useRef } from "react";
import * as d3 from "d3";

const BASE_URL = "http://127.0.0.1:8000/api";

export default function AMLGraph() {

  const svgRef = useRef(null);

  useEffect(() => {

    Promise.all([
      fetch(`${BASE_URL}/graph/`).then(r => r.json()),
      fetch(`${BASE_URL}/final-risk/`).then(r => r.json()),
      fetch(`${BASE_URL}/risk-scores/`).then(r => r.json())
    ])
      .then(([graph, finalRisk, riskScores]) => {

        renderGraph(graph, finalRisk, riskScores);

      })
      .catch(err => console.error(err));

  }, []);

  const renderGraph = (graph, finalRisk, riskScores) => {

    const width = window.innerWidth;
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

    /* ARROW */

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
      .attr("fill", "#ef4444");

    /* DEGREE */

    const degree = {};

    graph.edges.forEach(e => {
      degree[e.source] = (degree[e.source] || 0) + 1;
      degree[e.target] = (degree[e.target] || 0) + 1;
    });

    const radius = d3.scaleLinear()
      .domain(d3.extent(Object.values(degree)))
      .range([8, 26]);

    /* FORCE */

    const sim = d3.forceSimulation(graph.nodes)
      .force("link", d3.forceLink(graph.edges).id(d => d.id).distance(140))
      .force("charge", d3.forceManyBody().strength(-420))
      .force("center", d3.forceCenter(width / 2, height / 2));

    /* TOOLTIP */

    const tooltip = d3.select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "linear-gradient(135deg, #e8f2ff, #dbeafe)")
      .style("border", "1px solid #000")
      .style("padding", "12px 16px")
      .style("border-radius", "10px")
      .style("font-size", "13px")
      .style("color", "#000")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("box-shadow", "0 6px 18px rgba(0,0,0,0.15)");

    /* LINKS */

    const link = container.append("g")
      .selectAll("line")
      .data(graph.edges)
      .enter()
      .append("line")
      .attr("stroke", d =>
        d.pattern === "smurfing" ? "#ef4444" :
        d.pattern === "peeling" ? "#a855f7" :
        "#64748b"
      )
      .attr("stroke-width", d =>
        d.pattern === "smurfing" ? 4 :
        d.pattern === "peeling" ? 3 : 1.2
      )
      .attr("stroke-dasharray", d =>
        d.pattern === "peeling" ? "6 6" : "4 6"
      )
      .attr("marker-end", d => d.pattern ? "url(#arrow)" : null);

    /* ANIMATION */

    let dash = 0;

    d3.timer(() => {
      dash -= 0.8;
      link.attr("stroke-dashoffset", dash);
    });

    /* NODES */

    const node = container.append("g")
      .selectAll("circle")
      .data(graph.nodes)
      .enter()
      .append("circle")
      .attr("r", d => radius(degree[d.id] || 1))
      .attr("fill", d => {

        const r = riskMap[d.id]?.final_risk ?? 0;

        if (r >= 0.85) return "#dc2626";
        if (r >= 0.6) return "#f97316";
        if (r >= 0.3) return "#22c55e";

        return "#2563eb";

      })
      .on("click", (e, d) => {

        e.stopPropagation();

        const info = riskMap[d.id];
        const base = riskScoresMap[d.id]?.base_risk;

        tooltip
          .style("opacity", 1)
          .style("left", e.pageX + 12 + "px")
          .style("top", e.pageY + 12 + "px")
          .html(`

            <div style="font-weight:600;font-size:14px;margin-bottom:8px;color:#2563eb;">
              ${d.id}
            </div>

            <div style="margin-bottom:4px;">
              <span style="color:#000;">Final Risk:</span>
              <span style="font-weight:600;color:${
                info?.final_risk >= 0.85 ? '#ef4444'
                : info?.final_risk >= 0.6 ? '#f97316'
                : '#16a34a'
              };">
                ${(info?.final_risk * 100).toFixed(1)}%
              </span>
            </div>

            <div style="margin-bottom:8px;">
              <span style="color:#000;">Base Risk:</span>
              <span style="font-weight:600;color:#000;">
                ${(base * 100).toFixed(1)}%
              </span>
            </div>

            ${
              info?.reasons?.length
                ? `<div style="border-top:1px solid #ccc;padding-top:8px;margin-top:8px;">
                    ${info.reasons.map(r => `<div style="margin:4px 0;color:#000;">• ${r}</div>`).join("")}
                  </div>`
                : ""
            }

          `);

      })
      .call(
        d3.drag()
          .on("start", e => !e.active && sim.alphaTarget(0.3).restart())
          .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on("end", e => !e.active && sim.alphaTarget(0))
      );

    /* CLICK OUTSIDE CLOSES TOOLTIP */

    d3.select("body").on("click", () => {

      tooltip.style("opacity", 0);

    });

    /* SIMULATION */

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

    <div className="fixed inset-0 w-full h-full bg-white overflow-hidden">

      <svg ref={svgRef} className="relative w-full h-full" />

    </div>

  );

}