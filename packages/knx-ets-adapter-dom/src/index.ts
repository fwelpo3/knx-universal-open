import type {
  EtsXmlDocumentHandle,
  EtsXmlNavigator,
  EtsXmlNodeHandle,
  EtsXmlRuntime,
} from '../../knx-ets/src/index.ts';

interface DomNodeLike {
  nodeType?: number;
  localName?: string | null;
  nodeName?: string;
  parentNode?: DomNodeLike | null;
  childNodes?: ArrayLike<DomNodeLike>;
  getAttribute?(name: string): string | null;
  getElementsByTagNameNS?(namespace: string, localName: string): ArrayLike<DomNodeLike>;
  getElementsByTagName?(name: string): ArrayLike<DomNodeLike>;
}

interface DomDocumentLike extends DomNodeLike {
  documentElement?: DomNodeLike | null;
}

export interface DomParserLike {
  parseFromString(text: string, mimeType: string): DomDocumentLike;
}

export const domEtsXmlNavigator: EtsXmlNavigator = Object.freeze({
  all(root: EtsXmlDocumentHandle | EtsXmlNodeHandle, localName: string) {
    return all(root as DomNodeLike, localName) as EtsXmlNodeHandle[];
  },
  children(node: EtsXmlNodeHandle, localName?: string) {
    const children = childElements(node as DomNodeLike);
    return (localName ? children.filter((child) => nodeLocalName(child) === localName) : children) as EtsXmlNodeHandle[];
  },
  parent(node: EtsXmlNodeHandle) {
    let parent = (node as DomNodeLike).parentNode || null;
    while (parent && parent.nodeType !== undefined && parent.nodeType !== 1) parent = parent.parentNode || null;
    return parent as EtsXmlNodeHandle | null;
  },
  localName(node: EtsXmlNodeHandle) {
    return nodeLocalName(node as DomNodeLike);
  },
  attr(node: EtsXmlNodeHandle | null | undefined, name: string) {
    if (!node) return '';
    return (node as DomNodeLike).getAttribute?.(name) || '';
  },
});

export function createDomEtsXmlRuntime(parser: DomParserLike): EtsXmlRuntime {
  return {
    ...domEtsXmlNavigator,
    parse(text) {
      const document = parser.parseFromString(text, 'application/xml');
      const parseErrors = all(document, 'parsererror');
      if (parseErrors.length) throw new Error('Eine XML-Datei im ETS-Projekt ist nicht lesbar.');
      return document as EtsXmlDocumentHandle;
    },
  };
}

function all(root: DomNodeLike, localName: string): DomNodeLike[] {
  const namespaced = root.getElementsByTagNameNS?.('*', localName);
  if (namespaced) return Array.from(namespaced);
  const simple = root.getElementsByTagName?.(localName);
  return simple ? Array.from(simple) : [];
}

function childElements(node: DomNodeLike): DomNodeLike[] {
  return Array.from(node.childNodes || []).filter((child) => child.nodeType === undefined || child.nodeType === 1);
}

function nodeLocalName(node: DomNodeLike): string {
  return String(node.localName || node.nodeName || '').replace(/^.*:/, '');
}
