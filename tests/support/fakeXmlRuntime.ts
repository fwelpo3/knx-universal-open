import type {
  EtsXmlDocumentHandle,
  EtsXmlNodeHandle,
  EtsXmlRuntime,
} from '../../packages/knx-ets/src/ports/xml.ts';

export interface FakeXmlSpec {
  name: string;
  attrs?: Record<string, string>;
  children?: FakeXmlSpec[];
}

interface FakeXmlNode {
  name: string;
  attrs: Record<string, string>;
  children: FakeXmlNode[];
  parent: FakeXmlNode | null;
}

interface FakeXmlDocument {
  root: FakeXmlNode;
}

export const fakeXmlRuntime: EtsXmlRuntime = {
  parse(text) {
    const spec = JSON.parse(text) as FakeXmlSpec;
    return { root: build(spec, null) } as unknown as EtsXmlDocumentHandle;
  },
  all(root, localName) {
    const document = root as unknown as Partial<FakeXmlDocument>;
    const start = document.root || (root as unknown as FakeXmlNode);
    const result: FakeXmlNode[] = [];
    walk(start, (node) => {
      if (node.name === localName) result.push(node);
    });
    return result as unknown as EtsXmlNodeHandle[];
  },
  children(node, localName) {
    const children = (node as unknown as FakeXmlNode).children;
    return (localName ? children.filter((child) => child.name === localName) : children) as unknown as EtsXmlNodeHandle[];
  },
  parent(node) {
    return (node as unknown as FakeXmlNode).parent as unknown as EtsXmlNodeHandle | null;
  },
  localName(node) {
    return (node as unknown as FakeXmlNode).name;
  },
  attr(node, name) {
    return node ? (node as unknown as FakeXmlNode).attrs[name] || '' : '';
  },
};

export function fakeXml(spec: FakeXmlSpec): string {
  return JSON.stringify(spec);
}

function build(spec: FakeXmlSpec, parent: FakeXmlNode | null): FakeXmlNode {
  const node: FakeXmlNode = {
    name: spec.name,
    attrs: { ...(spec.attrs || {}) },
    children: [],
    parent,
  };
  node.children = (spec.children || []).map((child) => build(child, node));
  return node;
}

function walk(node: FakeXmlNode, visit: (node: FakeXmlNode) => void): void {
  visit(node);
  for (const child of node.children) walk(child, visit);
}
