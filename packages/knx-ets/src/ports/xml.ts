/**
 * Runtime-neutral XML navigation port used internally by the ETS parser.
 *
 * Handles are opaque objects on purpose: browser DOM nodes, xmldom nodes,
 * a SAX-backed tree, or another XML implementation can be used without making
 * DOM types part of the KNX data contracts.
 */
export type EtsXmlDocumentHandle = object;
export type EtsXmlNodeHandle = object;

export interface EtsXmlNavigator {
  all(root: EtsXmlDocumentHandle | EtsXmlNodeHandle, localName: string): readonly EtsXmlNodeHandle[];
  children(node: EtsXmlNodeHandle, localName?: string): readonly EtsXmlNodeHandle[];
  parent(node: EtsXmlNodeHandle): EtsXmlNodeHandle | null;
  localName(node: EtsXmlNodeHandle): string;
  attr(node: EtsXmlNodeHandle | null | undefined, name: string): string;
}

export interface EtsXmlRuntime extends EtsXmlNavigator {
  parse(text: string): EtsXmlDocumentHandle;
}
