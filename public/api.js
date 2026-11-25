const fromHash = new URLSearchParams(location.hash.slice(1)).get('code');
if (fromHash) {
  localStorage.setItem('code', fromHash);
  history.replaceState(null, '', location.pathname + location.search);
}

export async function api(method, path, body, type) {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { 'x-app-code': localStorage.getItem('code') || '', ...(body ? { 'Content-Type': type || 'application/json' } : {}) },
    body: body ? (type ? body : JSON.stringify(body)) : undefined,
  });
  const data = await res.json().catch(() => ({ error: 'The server sent something unreadable. Try again.' }));
  if (!res.ok) throw new Error(data.error || 'That did not work. Try again.');
  return data;
}

export const $ = (id) => document.getElementById(id);
export function el(tag, props = {}, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids.filter((k) => k !== null && k !== undefined));
  return node;
}
export function showWords(node, words) {
  node.hidden = !words?.note;
  node.textContent = words?.note || '';
  node.dataset.state = words?.state || '';
}
