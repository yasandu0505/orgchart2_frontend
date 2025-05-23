import React, { useEffect, useState } from "react";
import TidyTree from "./components/TidyTree";

const App = () => {
  const [treeData, setTreeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tranform the json data compatible with tree structure
 const transformToTree = (ministries) => ({
  name: "Government",
  children: ministries.map((m) => ({
    name: m.name,
    children: (m.Departments || []).map((d) => ({
      name: d.name,
      google_map_script: d.google_map_script
    }))
  }))
});


  useEffect(() => {
    const fetchTreeData = async () => {
      try {
        const res = await fetch("http://localhost:8080/ministries"); 
        const rawData = await res.json();
        const tree = transformToTree(rawData);
        console.log("Tree data:", tree);
        setTreeData(tree);
      } catch (error) {
        console.error("Error loading tree data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTreeData();
  }, []);

  return (
    <div style={{ padding: "20px", backgroundColor: "#1e1e1e", minHeight: "100vh" }}>
      <h2 style={{ color: "#fff" }}>Organization Chart</h2>
      {isLoading ? <p style={{ color: "#fff" }}>Loading...</p> : <TidyTree data={treeData} />}
    </div>
  );
};

export default App;
