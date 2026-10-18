import { useEffect, useRef } from "react";
import cytoscape, { Core, ElementDefinition } from "cytoscape";

/** Cytoscape core wrapped directly (plan 16.9). No react-cytoscapejs dependency. */
export default function GraphView({ elements }: { elements: ElementDefinition[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const cy = cytoscape({
      container: ref.current,
      elements,
      style: [
        { selector: "node", style: { label: "data(label)", "font-size": 9, "background-color": "#64748b" } },
        { selector: "node[?focus]", style: { "background-color": "#dc2626" } },
        { selector: "edge", style: { label: "data(label)", "font-size": 8, width: 1.5, "line-color": "#94a3b8",
                                     "target-arrow-shape": "triangle", "target-arrow-color": "#94a3b8", "curve-style": "bezier" } },
        { selector: "edge[?laundering]", style: { "line-color": "#f59e0b", "target-arrow-color": "#f59e0b" } },
      ],
      layout: { name: "cose", animate: false },
    });
    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [elements]);

  return <div ref={ref} className="h-96 w-full rounded border bg-white" />;
}
