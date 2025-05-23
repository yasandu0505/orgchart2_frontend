import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./TidyTree.css";
import PopWindow from "./PopWindow";

const TidyTree = ({ data }) => {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(window.innerWidth);
  const [anchorElement, setAnchorElement] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loadedEntity, setLoadedEntity] = useState(null);

  let ministersExpanded = false;

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth); // Update width on window resize
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!data) return;

    // Clear existing SVG when data changes
    d3.select(containerRef.current).selectAll("svg").remove();

    // Create new SVG
    const svg = d3
      .select(containerRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", 0)
      .attr("viewBox", [0, 0, width, 0])
      .style("max-width", "100%")
      .style("height", "auto")
      .style("font", "10px sans-serif")
      .style("user-select", "none");

    // Specify the charts' dimensions. The height is variable, depending on the layout.
    const marginTop = 10;
    const marginRight = 10;
    const marginBottom = 10;
    const marginLeft = 40;

    // Rows are separated by dx pixels, columns by dy pixels. These names can be counter-intuitive
    // (dx is a height, and dy a width). This because the tree must be viewed with the root at the
    // "bottom", in the data domain. The width of a column is based on the tree's height.
    const root = d3.hierarchy(data);
    const dx = 20;
    const dy = (width - marginRight - marginLeft) / (1 + root.height);

    // Define the tree layout and the shape for links.
    const tree = d3.tree().nodeSize([dx, dy]);
    const diagonal = d3.linkHorizontal().x((d) => d.y).y((d) => d.x);

    // Create the groups for links and nodes if not already present
    const gLink = svg.selectAll("g.links").data([0]).enter().append("g").attr("class", "links").attr("fill", "none")
      .attr("stroke", "#2593B8")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5);

    const gNode = svg.selectAll("g.nodes").data([0]).enter().append("g").attr("class", "nodes")
      .attr("cursor", "pointer")
      .attr("pointer-events", "all");

    function update(event, source) {
      //const duration = event?.altKey ? 2500 : 250; // hold the alt key to slow down the transition
      const duration = 500;
      const nodes = root.descendants().reverse();
      const links = root.links();

      // Compute the new tree layout.
      tree(root);

      let left = root, right = root;
      root.eachBefore((node) => {
        if (node.x < left.x) left = node;
        if (node.x > right.x) right = node;
      });

      //const width = window.innerWidth;
      const height = right.x - left.x + marginTop + marginBottom;

      const transition = svg
        .transition()
        .duration(duration)
        .attr("height", height)
        .attr("viewBox", [-marginLeft, left.x - marginTop, width, height]);

      // Update the nodes…
      const node = gNode.selectAll("g")
        .data(nodes, (d) => d.id);

      // Enter any new nodes at the parent's previous position.
      const nodeEnter = node.enter()
        .append("g")
        .attr("transform", (d) => `translate(${source.y0},${source.x0})`)
        .attr("data-id", (d) => d.id)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        // .on("click", (event, d) => {
        //   d.children = d.children ? null : d._children;
        //   update(event, d);
        // })
        .on("click", (event, d) => {
          const isExpanding = !d.children; // Check if the node is expanding

          d.children = isExpanding ? d._children : null;
          update(event, d);

          // Apply or remove highlight
          d3.selectAll(".nodes circle,.nodes text").classed("highlight", false); // Remove highlight from all
          //d3.selectAll(".link").classed("highlight", false);

          if (isExpanding) {
            highlightNodes(d);
            update(event, d)

          }
          if (d.depth === 2) {
            setAnchorElement({
              getBoundingClientRect: () => ({
                top: event.clientY,
                left: event.clientX + 20,
                bottom: event.clientY + 1,
                right: event.clientX + 21,
              }),
            });

            setIsOpen(true);
            setLoadedEntity({
              title: d.data.name,
              map: d.data.google_map_script,
            });
          } else {
            setIsOpen(false);
            setAnchorElement(null);
          }
          // Set a flag for ministers to shift position when expanded
          if (d.depth === 1) {
            if (isExpanding) {
              ministersExpanded = true;  // Move ministers to the left
            } else {
              // Check if all minister nodes are collapsed
              const allCollapsed = root.children.every(min => !min.children);
              ministersExpanded = !allCollapsed;  // Reset to false if all are collapsed
            }
            update(event, d);
          }

        });

      nodeEnter.append("circle")
        .attr("r", 5)

      nodeEnter.append("text")
        .attr("dy", "0.31em")
        .attr("x", 6) // Always position the text 6 units to the right of the circle
        .attr("text-anchor", "start") // Always anchor the text to the start (right)
        .text((d) => d.data.name)

      // Transition nodes to their new position.
      node.merge(nodeEnter)
        .transition(transition)
        .attr("transform", (d) => {
          // Adjust the x for second layer (minister nodes)
          let adjustedX = d.y;
          if (d.depth === 1) {
            // For depth 1 nodes (minister nodes), center them horizontally
            //adjustedX = width / 2;
            // If ministers are expanded, shift them left to 1/4 of the width
            adjustedX = ministersExpanded ? width / 4 : width / 2;
          }
          return `translate(${adjustedX},${d.x})`;
        })
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1)

      // Transition exiting nodes to the parent's new position.
      node.exit()
        .transition(transition)
        .remove()
        .attr("transform", (d) => `translate(${source.y},${source.x})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);

      // Update the links...
      const link = gLink.selectAll("path")
        .data(links, (d) => d.target.id);

      // Enter any new links at the parent's previous position.
      const linkEnter = link.enter()
        .append("path")
        .attr("d", (d) => {
          const o = { x: source.x0, y: source.y0 };
          return diagonal({ source: o, target: o });
        });

      // Transition links to their new position.
      link.merge(linkEnter)
        .transition(transition)
        //.attr("d", diagonal);
        .attr("d", (d) => {
          // Adjust the link paths for the second layer nodes (minister nodes)
          // const adjustedSourceY = d.source.depth === 1 ? width / 2 : d.source.y;
          // const adjustedTargetY = d.target.depth === 1 ? width / 2 : d.target.y;

          // const sourcePosition = { x: d.source.x, y: adjustedSourceY };
          // const targetPosition = { x: d.target.x, y: adjustedTargetY };

          // return diagonal({ source: sourcePosition, target: targetPosition });
          const adjustedSourceY = d.source.depth === 1 ? (ministersExpanded ? width / 4 : width / 2) : d.source.y;
          const adjustedTargetY = d.target.depth === 1 ? (ministersExpanded ? width / 4 : width / 2) : d.target.y;

          return diagonal({ source: { x: d.source.x, y: adjustedSourceY }, target: { x: d.target.x, y: adjustedTargetY } });
        });

      // Transition existing nodes to the parent's new position.
      link.exit()
        .transition(transition)
        .remove()
        .attr("d", (d) => {
          const o = { x: source.x, y: source.y };
          return diagonal({ source: o, target: o });
        });

      // Stash the old positions for transition.
      root.eachBefore((d) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    function highlightNodes(node) {
      // Highlight the clicked node
      d3.select(`[data-id='${node.id}']`)
        .selectAll("circle, text") // Target the circle inside the node
        .classed("highlight", true);

      // Highlight all children recursively
      if (node.children) {
        node.children.forEach((child) => highlightNodes(child));
      }
    }

    // Do the first update to the initial configuration of the tree — where a number of nodes
    // are open (arbitrarily selected as the root).
    root.x0 = dy / 2;
    root.y0 = 0;
    root.descendants().forEach((d, i) => {
      d.id = i;
      d._children = d.children;
      if (d.depth > 0) d.children = null;
    });

    update(null, root);
  }, [data, width]); // Re-run the effect when windowWidth changes

  return <>
    <div ref={containerRef}></div>
    <PopWindow
      anchorEl={anchorElement}
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        setAnchorElement(null);
      }}
      entity={loadedEntity}
    />
  </>


};

export default TidyTree;
