function getNodeType(node) {
  if (node.isTextNode) {
    return 'text';
  } else if (node.isLLM) {
    return 'llm';
  } else if (node.isLink) {
    return 'link';
  } else if (node.isRettam) {
    return 'rettam';
  }
  return 'other'; // Default case for undefined node types
}

function getNodeActions(node) {
  if (node.isTextNode) {
    return new TextNodeActions(node);
  } else if (node.isLLM) {
    return new LLMNodeActions(node);
  } else if (node.isLink) {
    return new LinkNodeActions(node);
  } else if (node.isRettam) {
    return new RettamNodeActions(node);
  }
  // Add additional conditions for other node types

  return new BaseNodeActions(node); // Default case
}

function addToRecentSuggestions(methodName) {
  nodeMethodManager.addSuggestion(methodName); // Update recent calls
}

// Define action parameter types
const actionParameterTypes = {
  'moveNode': ['float', 'float'] // Assumes moveNode expects two floats: angle, forceMagnitude
};

function executeNodeMethod(nodeActions, methodName) {
  console.log("Executing node method:", methodName);
  const methodPattern = /(\w+)(\(.*\))?/;
  const match = methodName.match(methodPattern);
  if (!match) {
    console.error('Invalid method format:', methodName);
    return;
  }

  const actionName = match[1];
  let rawParams = match[2] ? match[2].slice(1, -1).split(',') : [];
  let params = [];

  // Convert parameters based on their expected types
  if (actionParameterTypes[actionName]) {
    params = rawParams.map((param, index) => {
      const type = actionParameterTypes[actionName][index];
      switch (type) {
        case 'float':
          return parseFloat(param);
        case 'int':
          return parseInt(param, 10);
        // Add more cases as needed for different types
        default:
          return param; // Return as string if type not recognized
      }
    });
  } else {
    // For actions without specific type requirements, pass raw parameters
    params = rawParams;
  }

  if (typeof nodeActions[actionName] === 'function') {
    if (actionName === 'createRettam') {
      nodeActions.createRettam();
      return;
    }
    nodeActions[actionName](...params);
    addToRecentSuggestions(methodName); // Update recent calls
  } else {
    console.error('Invalid method for node:', actionName);
  }
}

function getSuggestionsFromMethods(input, methodsWithKeywords) {
  const lowerCaseInput = input.toLowerCase();
  let matches = [];

  // Iterate over each action and its keywords
  for (const [method, keywords] of Object.entries(methodsWithKeywords)) {
    if (method.toLowerCase().includes(lowerCaseInput) || keywords.some(keyword => keyword.toLowerCase().includes(lowerCaseInput))) {
      matches.push(method);
    }
  }

  // Sort matches by relevance (exact matches first)
  matches.sort((a, b) => {
    const aExactMatch = a.toLowerCase().startsWith(lowerCaseInput);
    const bExactMatch = b.toLowerCase().startsWith(lowerCaseInput);
    return bExactMatch - aExactMatch;
  });

  return matches;
}

function getNodeMethodSuggestions(value, node) {
  const validActionsWithKeywords = getNodeActions(node).getActions();
  let suggestions = [];

  // Handling for non-empty input
  if (value.trim() !== '') {
    suggestions = getSuggestionsFromMethods(value, validActionsWithKeywords);
  } else {
    // Handling for empty input - show recent suggestions and all valid actions
    const recentSuggestions = nodeMethodManager.getRecentSuggestions();
    const allValidActions = Object.keys(validActionsWithKeywords);
    const allValidActionsExcludingRecent = allValidActions.filter(action => !recentSuggestions.includes(action));
    suggestions = [...recentSuggestions, ...allValidActionsExcludingRecent];
  }

  return suggestions;
}

// Utility function
function applyActionToSelectedNodes(action, node) {
  if (selectedNodeUUIDs.has(node.uuid) && selectedNodeUUIDs.size > 1) {
    selectedNodeUUIDs.forEach(uuid => {
      const selectedNode = findNodeByUUID(uuid);
      if (selectedNode) {
        action(selectedNode);
      }
    });
  } else {
    action(node);
  }
}

class BaseNodeActions {
  constructor(node) {
    this.node = node;
  }

  getActions() {
    return {
      //'updateSensor': ["refresh", "renew", "sensor update"],
      'zoomTo': ["focus on", "center on", "highlight", "zoom in", "go to"],
      'delete': ["remove", "erase", "discard", "delete node"],
      'toggleSelect': ["select", "choose", "highlight", "deselect"],
      'toggleCollapse': ["collapse", "fold", "minimize", "expand", "unfold", "maximize"],
      'toggleAutomata': ["automata"],
      'spawnNode': ["automata", "birth", "create"],
      'connect': ["edge", "link"],
      'createRettam': ["generate rettam", "rettam", "create special node"],

      //'moveNode': ["move", "shift", "translate"],
      //'moveTo': ["move", "shift", "translate"]
    };
  }

  getSelectActionName() {
    return selectedNodeUUIDs.has(this.node.uuid) ? 'deselect' : 'select';
  }

  getCollapseActionName() {
    return this.node.windowDiv.collapsed ? 'expand' : 'collapse';
  }

  // Common methods for all nodes
  updateSensor() { this.node.updateSensor(); }
  zoomTo() { neuriteZoomToNodeTitle(this.node); }
  connect() {
    setupConnectModal(this.node);
    hideContextMenu();
  }
  toggleSelect() {
    applyActionToSelectedNodes((node) => {
      toggleNodeSelection(node);
    }, this.node);
  }

  toggleCollapse() {
    applyActionToSelectedNodes((node) => {
      toggleNodeState(node, '');
    }, this.node);
  }
  toggleAutomata() {
    updateNodeStartAutomataAction(); // This will now handle the automata start logic
  }
  delete() {
    this.node.remove();
  }
  spawnNode() {
    // Call spawnTextNode with the current node
    spawnZettelkastenNode(this.node);
  }
  moveNode(directionOrAngle, forceMagnitude = 0.01) {
    // Proxy the call to the node's moveNode method
    // Ensure this.node is the node class instance with the updated moveNode method
    this.node.moveNode(directionOrAngle, forceMagnitude);
  }
  moveTo(x, y, tolerance = null, onComplete = () => { }) {
    // Proxy the call to the node's moveTo method
    this.node.moveTo(x, y, tolerance, onComplete);
  }
  createRettam() {
    generateRettamNodes(this.node);
  }
}




class TextNodeActions extends BaseNodeActions {
  getActions() {
    return {
      ...super.getActions(),
      'toggleCode': ["show code", "hide code", "run code", "toggle script", "show text", "display text", "display code", "view text"],
      //'testNodeText': ["test text", "check text", "text testing"]
    };
  }

  toggleCode() {
    handleCodeExecution(this.node.textarea, this.node.htmlView, this.node.pythonView, this.node)
  }
  testNodeText() {
    testNodeText(this.node.getTitle());
  }
  delete() {
    applyActionToSelectedNodes((node) => {
      const nodeTitle = node.getTitle();

      const zetNodeCMInstance = getZetNodeCMInstance(nodeTitle);
      if (zetNodeCMInstance) {
        zetNodeCMInstance.parser.deleteNodeByTitle(nodeTitle);
      }
    }, this.node);

    hideContextMenu();
  }
}


class LLMNodeActions extends BaseNodeActions {
  getActions() {
    let actions = {
      ...super.getActions(),
      'sendMessage': ["send", "transmit", "dispatch", "send message"],
      'settings': ["preferences", "options", "configuration", "setup"],
      'halt': ["stop", "pause", "interrupt", "cease"],
      'refreshResponse': ["update response", "reload", "refresh"]
    };

    return actions;
  }

  sendMessage() {
    const promptTextarea = this.node.promptTextArea;
    const sendButton = this.node.sendButton;

    // Check if the prompt textarea is empty
    if (!promptTextarea.value.trim()) {
      // Prompt the user for a new prompt
      const userInput = window.prompt("Please enter your prompt:");
      if (userInput !== null && userInput.trim() !== "") {
        // Update the prompt textarea with the user's input
        promptTextarea.value = userInput;
      } else {
        // User canceled or entered an empty prompt
        console.log('No prompt entered');
        return; // Exit the function
      }
    }

    // Check if the send button is a valid element and click it
    if (sendButton && sendButton instanceof HTMLElement) {
      sendButton.click();
    } else {
      console.error('Send button not found or is not a valid element');
    }
  }
  halt() {
    const regenButton = this.node.regenerateButton;

    if (regenButton && regenButton instanceof HTMLElement) {
      regenButton.click(); // Simulate the click
    } else {
      console.error('Halt button not found or is not a valid element');
    }
  }
  refreshResponse() {
    const regenButton = this.node.regenerateButton;

    if (regenButton && regenButton instanceof HTMLElement) {
      regenButton.click(); // Simulate the click
    } else {
      console.error('Regenerate button not found or is not a valid element');
    }
  }
  settings() {
    const settingsButton = this.node.content.querySelector('#aiNodeSettingsButton');

    if (settingsButton && settingsButton instanceof HTMLElement) {
      settingsButton.click(); // Simulate the click
    } else {
      console.error('Settings button not found or is not a valid element');
    }
  }
}

class LinkNodeActions extends BaseNodeActions {
  getActions() {
    return {
      ...super.getActions(),
      'displayIframe': ["show iframe", "iframe view", "embed", "display frame"],
      'extractText': ["get text", "copy text", "text extraction", "extract webpage", "scrape webpage"],
      'toggleProxy': ["webpage text", "proxy"],
      'importText': ["webpage text", "import", "text"]

    };
  }

  displayIframe() {
    handleLinkNodeIframe(this.node.iframeWrapper, this.node.linkWrapper, this.node.linkUrl);
  }
  displayWebpage() {
    this.toggleProxy();
  }
  toggleProxy() {
    handleLinkNodeProxyDisplay(this.node.iframeWrapper, this.node.linkWrapper, this.node.linkUrl);
  }
  extractText() {
    extractAndStoreLinkContent(this.node.linkUrl, this.node.titleInput.value);
  }
  importText() {
    importLinkNodeTextToZettelkasten(this.node.linkUrl);
    hideContextMenu();
  }
}

// Add additional specific node action classes as needed

class RettamNodeActions extends TextNodeActions {
  constructor(node) {
    super(node);
  }

  getActions() {
    return {
      ...super.getActions(),
      'generateRettam': ["generate rettam", "rettam", "create special node"],
      // 'toggleCode': ["show code", "hide code", "run code", "toggle script", "show text", "display text", "display code", "view text"],
      // Add more Rettam-specific actions here
    };
  }

  generateRettam() {
    generateRettamNodes(this.node);
  }

  // Add more Rettam-specific methods here
}
