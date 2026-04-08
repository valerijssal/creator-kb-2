function buildTree(pages: Record<string, PageNode>): PageNode[] {
  const nodes: Record<string, PageNode> = {};
  for (const key of Object.keys(pages)) {
    nodes[key] = { ...pages[key], children: [] };
  }
  const roots: PageNode[] = [];
  for (const node of Object.values(nodes)) {
    const parentExists = node.parent !== null && node.parent in nodes;
    if (parentExists) {
      nodes[node.parent!].children!.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (arr: PageNode[]) => {
    arr.sort((a, b) => a.title.localeCompare(b.title));
    arr.forEach(n => n.children && sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}
