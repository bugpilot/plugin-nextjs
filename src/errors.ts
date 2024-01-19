export class BugpilotPluginError extends Error {
  constructor(message) {
    super(message);
    this.name = "BugpilotPluginError";
  }
}
