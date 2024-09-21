async function generateRettamNodes(originNode) {
  const contextNodes = getContextualNodes(originNode);
  const rettamNodeObject = await getRettamNodes(originNode, contextNodes);

  createRettamNodesFromResponse(originNode, rettamNodeObject);
}

function getContextualNodes(originNode) {
  // Get connected nodes (placeholder implementation)
  return Array.from(originNode.edges.values())
    .map(edgeId => nodeMap[edgeId])
    .filter(node => node && node.isTextNode);
}



async function getRettamNodes(originNode, contextNodes) {
  const url = 'http://localhost:3016/rettam/nodes'; // Adjust as needed
  const data = {
    originNode: {
      title: originNode.getTitle(),
      content: originNode.textarea.value
    },
    contextNodes: contextNodes.map(node => ({
      title: node.getTitle(),
      content: node.textarea.value
    }))
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error sending data to backend:', error);
    return [];
  }
}



function createRettamNodesFromResponse(originNode, rettamNodeObject) {
  if (rettamNodeObject?.entities?.length) {
    rettamNodeObject.entities.forEach(entity => {
      let { label, text } = entity;
      let content = title = [label, text].join(" ")
      let existingNode = getNodeByTitle(title);

      if (existingNode) {
        existingEdge = findExistingEdge(existingNode, originNode);
        if (!existingEdge) connectNodes(originNode, existingNode);
      }
      else {
        //doesnt exist
        let createdNode = addNodeTagToZettelkasten(title, content);

        if (createdNode) {
          createdNode = addRettamProps(createdNode, entity);
        }

        connectNodes(originNode, createdNode);
      }
    });
  }
  else console.log("empty entities on rettam obj", rettamNodeObject)
}

function addRettamProps(node, metadata) {
  // function addRettamProps(title, content, x, y, scale, metadata) {
  // const node = createTextNode(title, content, x, y, scale);
  node.isRettamNode = true;
  node.metadata = {
    topics: [],
    people: [],
    items: [],
    sentiment: null,
    time: null,
    ...metadata
  };
  initRettamNode(node);
  return node;
}

function initRettamNode(node) {
  // Create Rettam-specific UI elements
  const metadataDiv = document.createElement('div');
  metadataDiv.className = 'rettam-metadata';
  node.content.appendChild(metadataDiv);
  node.metadataDiv = metadataDiv;

  // Add analyze button
  const analyzeButton = document.createElement('button');
  analyzeButton.textContent = 'Analyze Content';
  analyzeButton.addEventListener('click', () => analyzeContent(node));
  node.content.appendChild(analyzeButton);

  // Initial content analysis
  analyzeContent(node);
}

function analyzeContent(node) {
  // Simple metadata extraction logic
  const content = node.textarea.value;
  const words = content.split(/\s+/);

  node.metadata.topics = words.filter(word => word.startsWith('#')).slice(0, 3);
  node.metadata.people = words.filter(word => word.startsWith('@')).slice(0, 3);
  node.metadata.items = words.filter(word => word.length > 7).slice(0, 3);
  node.metadata.sentiment = content.length % 2 === 0 ? 'Positive' : 'Negative'; // Placeholder logic
  node.metadata.time = new Date().toISOString();

  updateMetadataDisplay(node);
}

function updateMetadataDisplay(node) {
  node.metadataDiv.innerHTML = `
        <div>Topics: ${node.metadata.topics.join(', ')}</div>
        <div>People: ${node.metadata.people.join(', ')}</div>
        <div>Items: ${node.metadata.items.join(', ')}</div>
        <div>Sentiment: ${node.metadata.sentiment}</div>
        <div>Time: ${node.metadata.time}</div>
    `;
}