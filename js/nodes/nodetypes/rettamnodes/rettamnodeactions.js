class RettamNodeActions extends TextNodeActions {
  constructor(node) {
    super(node);
  }

  getActions() {
    return {
      ...super.getActions(),
      'generateRettam': ["generate rettam", "rettam", "create metadata"],
      'analyzeContent': ["analyze", "extract metadata", "process content"]
    };
  }

  generateRettam() {
    generateRettamNodes(this.node);
  }

  analyzeContent() {
    analyzeContent(this.node);
  }
}