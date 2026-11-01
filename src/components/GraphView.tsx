import { useEffect, useRef } from "react";
import cytoscape, { Core, ElementDefinition } from "cytoscape";
import { buttonClass } from "./ui";

/**
 * Cytoscape core wrapped directly (plan 16.9). The flagged account is the node with `focus` set. Recenter fits the view
 * around it again, after the user has panned or zoomed away.
 */
export default function GraphView({ elements }: { elements: ElementDefinition[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const cy = cytoscape({
      container: ref.current,
      elements,
      style: [
        { selector: "node", style: { label: "data(label)", "font-size": 9, color: "#5b6168",
                                     "background-color": "#9aa0a8", "text-wrap": "ellipsis", "text-max-width": "80px" } },
        { selector: "node[?focus]", style: { "background-color": "#b71c22", width: 34, height: 34 } },
        { selector: "edge", style: { label: "data(label)", "font-size": 8, color: "#5b6168", width: 1.5,
                                     "line-color": "#c9ccd1", "target-arrow-shape": "triangle",
                                     "target-arrow-color": "#c9ccd1", "curve-style": "bezier" } },
        { selector: "edge[?laundering]", style: { "line-color": "#b7770d", "target-arrow-color": "#b7770d" } },
      ],
      layout: { name: "cose", animate: false },
    });
    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [elements]);

  // Fits the whole network at its normal zoom, then centres the flagged account. Fitting the focused node alone zoomed
  // in too far.
  function recenter() {
    const cy = cyRef.current;
    if (!cy) return;
    cy.fit(cy.elements(), 60);
    const focus = cy.nodes("[?focus]");
    if (focus.nonempty()) cy.center(focus);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={recenter} className={buttonClass("secondary")}>
          Recenter
        </button>
      </div>
      <div ref={ref} className="h-[28rem] w-full rounded-2xl bg-white ring-1 ring-line" />
    </div>
  );
}
