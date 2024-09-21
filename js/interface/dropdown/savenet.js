﻿const LATEST_LOADED_INDEX_KEY = "latest-selected"
// Attach the neuriteSaveEvent to the save button
document.getElementById("new-save-button").addEventListener("click", () => neuriteSaveEvent());

function downloadData(title, data) {
  const blob = new Blob([data], { type: 'text/plain' });
  const tempAnchor = document.createElement('a');
  tempAnchor.download = title + '.txt';
  tempAnchor.href = window.URL.createObjectURL(blob);
  tempAnchor.click();
  setTimeout(function () {
    window.URL.revokeObjectURL(tempAnchor.href);
  }, 1);
}

let selectedSaveTitle = null; // Global variable to track the selected save
let selectedSaveIndex = null; // Global variable to track the selected save

function updateSavedNetworks() {
  let saves = JSON.parse(localStorage.getItem("saves") || "[]");
  let container = document.getElementById("saved-networks-container");
  container.innerHTML = '';

  for (let [index, save] of saves.entries()) {
    let div = document.createElement("div");

    // Add a class to the div if it's the selected save
    if (index === selectedSaveIndex) {
      div.classList.add("selected-save");
    }
    let titleInput = document.createElement("input");
    let data = document.createElement("span");
    let loadButton = document.createElement("button");
    let deleteButton = document.createElement("button");
    let downloadButton = document.createElement("button");
    let saveButton = document.createElement("button");

    titleInput.type = "text";
    titleInput.value = save.title;
    titleInput.style.border = "none"
    titleInput.style.width = "100px"
    titleInput.addEventListener('change', function () {
      save.title = titleInput.value;
      localStorage.setItem("saves", JSON.stringify(saves));
    });

    data.textContent = save.data;
    data.style.display = "none";

    saveButton.textContent = "Save";
    saveButton.className = 'linkbuttons';
    saveButton.addEventListener('click', function () {
      if (index !== selectedSaveIndex && !window.confirm(`This will overwrite ${save.title} with the currently selected save, ${selectedSaveTitle} Continue?`)) {
        return;
      }

      neuriteSaveEvent(existingTitle = save.title)
    });


    loadButton.textContent = "Load";
    loadButton.className = 'linkbuttons';
    loadButton.addEventListener('click', function () {

      function updateLoadState() {
        autosave()

        selectedSaveTitle = save.title;
        selectedSaveIndex = index;
        localStorage.setItem(LATEST_LOADED_INDEX_KEY, selectedSaveIndex);
      }

      if (data.textContent === "") {
        var isSure = window.confirm("Are you sure you want an empty save?");
        if (isSure) {
          updateLoadState();
          loadNet(data.textContent, true);
        }
      } else {
        updateLoadState();
        loadNet(data.textContent, true);
      }

      updateSavedNetworks();
    });



    deleteButton.textContent = "X";
    deleteButton.className = 'linkbuttons';
    deleteButton.addEventListener('click', function () {
      // Remove the save from the array
      saves.splice(index, 1);

      if (selectedSaveIndex === index) {
        localStorage.removeItem(LATEST_LOADED_INDEX_KEY);
        selectedSaveIndex = null;
        selectedSaveTitle = null;
      } else {
        selectedSaveIndex = saves.findIndex(save => save.title === selectedSaveTitle) ?? null;

        if (selectedSaveIndex === null) {
          selectedSaveTitle = null
        }
      }

      // Update local storage
      localStorage.setItem("saves", JSON.stringify(saves));

      // Update the saved networks container
      updateSavedNetworks();
    });

    downloadButton.textContent = "↓";
    downloadButton.className = 'linkbuttons';
    downloadButton.addEventListener('click', function () {
      // Create a blob from the data
      var blob = new Blob([save.data], { type: 'text/plain' });

      // Create a temporary anchor and URL
      var tempAnchor = document.createElement('a');
      tempAnchor.download = save.title + '.txt';
      tempAnchor.href = window.URL.createObjectURL(blob);

      // Simulate a click on the anchor
      tempAnchor.click();

      // Clean up by revoking the object URL
      setTimeout(function () {
        window.URL.revokeObjectURL(tempAnchor.href);
      }, 1);
    });

    div.appendChild(titleInput);
    div.appendChild(data);
    div.appendChild(saveButton);
    div.appendChild(loadButton);
    div.appendChild(downloadButton);
    div.appendChild(deleteButton);
    container.appendChild(div);
  }
}


// Call updateSavedNetworks on page load to display previously saved networks
updateSavedNetworks();

let container = document.getElementById("saved-networks-container");

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  container.addEventListener(eventName, preventDefaults, false);
});

// Highlight the drop area when item is dragged over it
['dragenter', 'dragover'].forEach(eventName => {
  container.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  container.addEventListener(eventName, unHighlight, false);
});

// Handle the drop
container.addEventListener('drop', handleSavedNetworksDrop, false);

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function highlight() {
  container.classList.add('highlight');
}

function unHighlight() {
  container.classList.remove('highlight');
}

function handleSavedNetworksDrop(e) {
  let dt = e.dataTransfer;
  let file = dt.files[0];

  if (file && file.name.endsWith('.txt')) {
    let reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function (e) {
      let content = e.target.result;
      let title = file.name.replace('.txt', '');

      try {
        // Try saving the data to localStorage
        let saves = JSON.parse(localStorage.getItem("saves") || "[]");
        saves.push({ title: title, data: content });
        localStorage.setItem("saves", JSON.stringify(saves));
        updateSavedNetworks();
      } catch (error) {
        // Before loading, confirm with the user due to size limitations
        var isSure = window.confirm("The file is too large to store. Would you like to load it anyway?");
        if (isSure) {
          // Proceed with loading if the user confirms
          selectedSaveTitle = null;
          selectedSaveIndex = null;
          loadNet(content, true);
        }
      }
    };
  } else {
    console.log('File must be a .txt file');
  }
}

document.getElementById("clear-button").addEventListener("click", function () {
  document.getElementById("clear-sure").setAttribute("style", "display:block");
  document.getElementById("clear-button").text = "Are you sure?";
});
document.getElementById("clear-unsure-button").addEventListener("click", function () {
  document.getElementById("clear-sure").setAttribute("style", "display:none");
  document.getElementById("clear-button").text = "Clear";
});
document.getElementById("clear-sure-button").addEventListener("click", function () {
  let createNewSave = confirm("Create a new save?");

  selectedSaveTitle = null;
  selectedSaveIndex = null;

  clearNet();
  zetPanes.addPane();

  if (createNewSave) {
    neuriteSaveEvent();
  }

  updateSavedNetworks();
  document.getElementById("clear-sure").setAttribute("style", "display:none");
  document.getElementById("clear-button").text = "Clear";
});

document.getElementById("clearLocalStorage").onclick = function () {
  localStorage.clear();
  alert('Local storage has been cleared.');
}



function handleSaveConfirmation(title, saveData, force = false) {
  let saves = JSON.parse(localStorage.getItem("saves") || "[]");
  const existingSaves = saves.filter(save => save.title === title);

  if (existingSaves.length > 0) {
    let confirmMessage = existingSaves.length === 1 ?
      `A save with the title "${title}" already exists. Click 'OK' to overwrite, or 'Cancel' to create a duplicate.` :
      `${existingSaves.length} saves with the title "${title}" already exist. Click 'OK' to overwrite all, or 'Cancel' to create a duplicate.`;

    if (force || confirm(confirmMessage)) {
      // Overwrite logic - update all saves with the matching title
      saves = saves.map(save => save.title === title ? { ...save, data: saveData } : save);
      console.log(`Updated all saves with title: ${title}`);
    } else {
      // Duplicate logic
      let newTitle = title;
      saves.push({ title: newTitle, data: saveData });
      console.log(`Created duplicate save: ${newTitle}`);
      title = newTitle; // Update title to reflect new save
    }
  } else {
    // Add new save
    saves.push({ title: title, data: saveData });
    console.log(`Created new save: ${title}`);
  }

  try {
    localStorage.setItem("saves", JSON.stringify(saves));
    updateSavedNetworks();
  } catch (e) {
    if (confirm("Local storage is full, download the data as a .txt file?")) {
      downloadData(title, JSON.stringify({ data: saveData }));
    }
  }
}






const NEWLINE_PLACEHOLDER = "__NEWLINEplh__";

function replaceNewLinesInLLMSaveData(nodeData) {
  let tempDiv = document.createElement('div');
  tempDiv.innerHTML = nodeData;

  tempDiv.querySelectorAll('[data-node_json]').forEach(node => {
    try {
      let nodeJson = JSON.parse(node.getAttribute('data-node_json'));
      if (nodeJson.isLLM) {
        node.querySelectorAll('pre').forEach(pre => {
          pre.innerHTML = pre.innerHTML.replace(/\n/g, NEWLINE_PLACEHOLDER);
        });
      }
    } catch (error) {
      console.warn('Error parsing node JSON:', error);
    }
  });

  return tempDiv.innerHTML;
}

function restoreNewLinesInPreElements(nodeElement) {
  nodeElement.querySelectorAll('pre').forEach(pre => {
    pre.innerHTML = pre.innerHTML.split(NEWLINE_PLACEHOLDER).join('\n');
  });
}



function collectAdditionalSaveObjects() {
  // Collecting slider values
  const inputValues = localStorage.getItem('inputValues') || '{}';
  const savedInputValues = `<div id="saved-input-values" style="display:none;">${encodeURIComponent(inputValues)}</div>`;

  // Collecting saved views
  const savedViewsString = JSON.stringify(savedViews);
  const savedViewsElement = `<div id="saved-views" style="display:none;">${encodeURIComponent(savedViewsString)}</div>`;

  // Get current Mandelbrot coords in a standard format
  const mandelbrotParams = neuriteGetMandelbrotCoords();
  const mandelbrotSaveElement = `<div id="mandelbrot-coords-params" style="display:none;">${encodeURIComponent(JSON.stringify(mandelbrotParams))}</div>`;

  // Get the selected fractal type from localStorage
  const selectedFractalType = localStorage.getItem('fractal-select');
  const fractalTypeSaveElement = `<div id="fractal-type" style="display:none;">${encodeURIComponent(JSON.stringify(selectedFractalType))}</div>`;

  // Combine both slider values and saved views in one string
  return savedInputValues + savedViewsElement + mandelbrotSaveElement + fractalTypeSaveElement;
}

function restoreAdditionalSaveObjects(d) {

  let savedViewsElement = d.querySelector("#saved-views");
  if (savedViewsElement) {
    let savedViewsContent = decodeURIComponent(savedViewsElement.innerHTML);
    savedViews = JSON.parse(savedViewsContent);
    if (savedViews) {
      // Update the cache
      updateSavedViewsCache();

      displaySavedCoordinates();
    }
    savedViewsElement.remove();
  }

  let sliderValuesElement = d.querySelector("#saved-input-values");
  if (sliderValuesElement) {
    const sliderValuesContent = decodeURIComponent(sliderValuesElement.innerHTML);
    localStorage.setItem('inputValues', sliderValuesContent);
    sliderValuesElement.remove();
  }

  // Restore sliders immediately after their values have been set
  restoreInputValues();

  // Extract the Mandelbrot parameters and directly apply them
  let mandelbrotSaveElement = d.querySelector("#mandelbrot-coords-params");
  if (mandelbrotSaveElement) {
    let mandelbrotParams = JSON.parse(decodeURIComponent(mandelbrotSaveElement.textContent));
    neuriteSetMandelbrotCoords(mandelbrotParams.zoom, mandelbrotParams.pan.split('+i')[0], mandelbrotParams.pan.split('+i')[1]); // Direct function call using parsed params
    mandelbrotSaveElement.remove();
  }

  let fractalTypeSaveElement = d.querySelector("#fractal-type");
  if (fractalTypeSaveElement) {
    const fractalSelectElement = document.getElementById('fractal-select');
    let fractalType = JSON.parse(decodeURIComponent(fractalTypeSaveElement.textContent));
    if (fractalType) {
      fractalSelectElement.value = fractalType;
      updateSelectedOptionDisplay(fractalSelectElement);
      updateJuliaDisplay(fractalType);
    }
    fractalTypeSaveElement.remove();
  }
}

function neuriteSaveEvent(existingTitle = null) {
  //TEMP FIX: To-Do: Ensure processChangedNodes in zettelkasten.js does not cause other node textareas to have their values overwritten.
  window.zettelkastenProcessors.forEach((processor) => {
    processAll = true;
    processor.processInput();
  });

  nodes.forEach((node) => {
    node.updateEdgeData();  // Update edge data
    node.updateNodeData();  // Update node extras and other data before saving
  });

  // Clone the currently selected UUIDs before clearing
  const savedSelectedNodeUUIDs = cloneSelectedUUIDs();

  // Clear current selections
  clearNodeSelection();

  // Save the node data
  let nodeData = document.getElementById("nodes").innerHTML;

  restoreNodeSelections(savedSelectedNodeUUIDs);

  // Replace new lines in nodeData for LLM nodes
  nodeData = replaceNewLinesInLLMSaveData(nodeData);

  let zettelkastenPanesSaveElements = '';
  window.codeMirrorInstances.forEach((instance, index) => {
    let paneContent = instance.cmInstance.getValue();
    let paneName = zetPanes.getPaneName(`zet-pane-${index + 1}`);
    let paneSaveElement = `<div id="zettelkasten-pane-${index}" data-pane-name="${encodeURIComponent(paneName)}" style="display:none;">${encodeURIComponent(paneContent)}</div>`;
    zettelkastenPanesSaveElements += paneSaveElement;
  });

  let additionalSaveData = collectAdditionalSaveObjects();
  let saveData = nodeData + zettelkastenPanesSaveElements + additionalSaveData;

  let title = existingTitle || prompt("Enter a title for this save:");

  let saves = JSON.parse(localStorage.getItem("saves") || "[]");
  if (title) {
    // Before saving, check if we're updating an existing save
    let indexToUpdate = saves.findIndex(save => save.title === title);

    if (indexToUpdate !== -1) {
      // If we're updating, set this save as the selected one
      selectedSaveIndex = indexToUpdate;
    } else {
      // If it's a new save, the new save will be the last in the array
      selectedSaveIndex = saves.length;
    }

    selectedSaveTitle = title;
    handleSaveConfirmation(title, saveData, title === existingTitle);
    // Update selectedSaveIndex and selectedSaveTitle accordingly
    localStorage.setItem(LATEST_LOADED_INDEX_KEY, selectedSaveIndex);
  }
}

for (let n of htmlnodes) {
  let node = new Node(undefined, n, true);  // Indicate edge creation with `true`
  registernode(node);
}
for (let n of nodes) {
  n.init(nodeMap);
}

function clearNet() {
  clearNodeSelection()

  // Remove all edges
  while (edges.length > 0) {
    edges[edges.length - 1].remove();
  }
  edgeDirectionalityMap.clear();

  // Remove all nodes
  while (nodes.length > 0) {
    nodes[nodes.length - 1].remove();
  }

  // Reset LLM node count
  llmNodeCount = 0;

  // Clear the CodeMirror content
  zetPanes.resetAllPanes();
}

function loadNet(text, clobber, createEdges = true) {
  if (clobber) {
    clearNet();
  }

  let d = document.createElement("div");
  d.innerHTML = text;

  // Check for the previous single-tab save object
  let zettelkastenSaveElement = d.querySelector("#zettelkasten-save");
  if (zettelkastenSaveElement) {
    zettelkastenSaveElement.remove();
  }

  // Check for the new multi-pane save objects
  let zettelkastenPaneSaveElements = d.querySelectorAll("[id^='zettelkasten-pane-']");
  zettelkastenPaneSaveElements.forEach((element) => {
    element.remove();
  });

  restoreAdditionalSaveObjects(d);

  let newNodes = [];
  for (let n of d.children) {
    let node = new Node(undefined, n, true, undefined, createEdges);
    newNodes.push(node);
    registernode(node);
  }

  populateDirectionalityMap(d, nodeMap);

  for (let n of newNodes) {
    htmlnodes_parent.appendChild(n.content);

    n.init(nodeMap); // Initialize the node

    reconstructSavedNode(n); // Reconstruct the saved node
  }

  if (zettelkastenSaveElement) {
    let zettelkastenContent = decodeURIComponent(zettelkastenSaveElement.innerHTML);
    zetPanes.restorePane("Zettelkasten Save", zettelkastenContent);
  }

  zettelkastenPaneSaveElements.forEach((element) => {
    let paneContent = decodeURIComponent(element.innerHTML);
    let paneName = decodeURIComponent(element.getAttribute('data-pane-name'));

    zetPanes.restorePane(paneName, paneContent);
  });
}

function populateDirectionalityMap(d, nodeMap) {
  const nodes = Array.from(d.children);
  nodes.forEach(nodeElement => {
    if (nodeElement.hasAttribute('data-edges')) {
      const edgesData = JSON.parse(nodeElement.getAttribute('data-edges'));
      edgesData.forEach(edgeData => {
        const edgeKey = edgeData.edgeKey;
        if (!edgeDirectionalityMap.has(edgeKey)) {
          edgeDirectionalityMap.set(edgeKey, {
            start: nodeMap[edgeData.directionality.start],
            end: nodeMap[edgeData.directionality.end]
          });
        }
      });
    }
  });
}

function reconstructSavedNode(node) {

  if (node.isTextNode && !node.isRettamNode) {
    initTextNode(node)
  }

  if (node.initRettamNode) {
    initRettamNode(node)
  }

  if (node.isLLM) {
    initAiNode(node);
    restoreNewLinesInPreElements(node.aiResponseDiv);
  }

  if (node.isLink) {
    initLinkNode(node);
  }

  node.sensor = new NodeSensor(node, 3);
}

const autosaveEnabledCheckbox = document.getElementById("autosave-enabled");

function autosave() {
  if (selectedSaveTitle !== null && autosaveEnabledCheckbox.checked) {
    neuriteSaveEvent(selectedSaveTitle);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const stateFromURL = urlParams.get('state');

  if (stateFromURL) {
    // Load state from a file in the /wiki/pages directory
    fetch(`/wiki/pages/neurite-wikis/${stateFromURL}.txt`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.text();
      })
      .then(data => {
        loadNet(data, true);  // Load the network directly with the fetched text data
        selectedSaveTitle = null;
        selectedSaveIndex = null;
        updateSavedNetworks();
      })
      .catch(error => {
        console.error('Failed to load state from file:', error);
        displayErrorMessage('Failed to load the requested network state.');
      });
  } else {
    // Load from local storage if no state provided in URL
    const value = localStorage.getItem(LATEST_LOADED_INDEX_KEY) ?? null;
    selectedSaveIndex = value !== null ? parseInt(value) : null;

    if (selectedSaveIndex !== null) {
      const saves = JSON.parse(localStorage.getItem("saves") || "[]");
      const existingSaves = saves?.[selectedSaveIndex];
      if (existingSaves) {
        selectedSaveTitle = existingSaves.title;
        updateSavedNetworks();
        loadNet(existingSaves.data, true);
      } else {
        selectedSaveTitle = null;
        selectedSaveIndex = null;
        updateSavedNetworks();
      }
    }

    // Set the autosave checkbox state based on stored value
    const autosaveEnabled = localStorage.getItem("autosave-enabled");
    autosaveEnabledCheckbox.checked = autosaveEnabled === "true"; // Ensure it loads as a boolean

    // Save state when the checkbox is toggled
    autosaveEnabledCheckbox.addEventListener("change", (e) => {
      localStorage.setItem("autosave-enabled", e.target.checked);
    });

    // Set up autosave at intervals
    setInterval(autosave, 8000);
  }
});