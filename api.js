'use strict';

const API_URL = 'https://jsonplaceholder.typicode.com/posts';
const loadButton = document.getElementById('load-btn');
const submitButton = document.getElementById('submit-btn');
const form = document.getElementById('note-form');
const titleInput = document.getElementById('title-input');
const bodyInput = document.getElementById('body-input');
const statusElement = document.getElementById('status');
const notesList = document.getElementById('notes-list');
const noteCount = document.getElementById('note-count');
const titleCount = document.getElementById('title-count');
const notes = new Map();
let busy = false;
let nextLocalKey = 1;

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed (HTTP ${response.status})`);
  }
  const contentType = response.headers.get('content-type') || '';
  const data = response.status === 204 || !contentType.includes('application/json')
    ? null : await response.json();
  return { data, status: response.status };
}

function setStatus(message, type = '') {
  statusElement.textContent = message;
  statusElement.className = type;
}

function setBusy(value) {
  busy = value;
  loadButton.disabled = value;
  submitButton.disabled = value;
  notesList.querySelectorAll('.delete-btn').forEach(button => {
    button.disabled = value;
  });
}

function renderNotes() {
  notesList.replaceChildren();
  noteCount.textContent = String(notes.size);

  if (notes.size === 0) {
    const item = document.createElement('li');
    item.className = 'empty-card';
    const illustration = document.createElement('span');
    illustration.className = 'empty-illustration';
    illustration.setAttribute('aria-hidden', 'true');
    illustration.textContent = '✳';
    const title = document.createElement('strong');
    title.className = 'empty-title';
    title.textContent = 'A fresh page awaits';
    const description = document.createElement('span');
    description.className = 'empty-description';
    description.textContent = 'Create your first note or load a few examples to get started.';
    item.append(illustration, title, description);
    notesList.appendChild(item);
    return;
  }

  for (const [key, note] of notes) {
    const item = document.createElement('li');
    item.className = 'note-card';
    const heading = document.createElement('h3');
    heading.textContent = note.title;
    const body = document.createElement('p');
    body.textContent = note.body || 'No additional details.';
    const footer = document.createElement('div');
    footer.className = 'note-card-footer';
    const meta = document.createElement('span');
    meta.className = 'note-meta';
    meta.textContent = key.startsWith('local-') ? 'Just created · Demo' : `Example note #${note.id}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'delete-btn';
    button.textContent = 'Delete';
    button.setAttribute('aria-label', `Delete note: ${note.title}`);
    button.disabled = busy;
    button.addEventListener('click', () => deleteNote(key));
    footer.append(meta, button);
    item.append(heading, body, footer);
    notesList.appendChild(item);
  }
}

async function loadNotes() {
  if (busy) return;
  setBusy(true);
  setStatus('Loading notes...', 'loading');
  try {
    const { data } = await request(`${API_URL}?_limit=10`);
    if (!Array.isArray(data)) throw new Error('Unexpected server response');
    notes.clear();
    for (const note of data) notes.set(`server-${note.id}`, note);
    renderNotes();
    setStatus(data.length ? `Loaded ${data.length} notes from the server.` : 'No notes found on the server.', data.length ? 'success' : 'empty');
  } catch (error) {
    setStatus(`Could not load notes. Please try again. ${error.message}`, 'error');
  } finally {
    setBusy(false);
  }
}

async function createNote(event) {
  event.preventDefault();
  if (busy) return;
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  if (!title || title.length > 100) {
    setStatus('Please enter a title between 1 and 100 characters.', 'error');
    titleInput.focus();
    return;
  }
  setBusy(true);
  setStatus('Creating note...', 'loading');
  try {
    const { data, status } = await request(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ title, body, userId: 1 })
    });
    if (!data || data.id == null) throw new Error('Server returned no note ID');
    // JSONPlaceholder returns id 101 for mock POSTs and does not persist them.
    // Keep a separate local key so multiple created notes do not overwrite each other.
    const key = `local-${nextLocalKey++}`;
    const existing = [...notes.entries()];
    notes.clear();
    notes.set(key, { ...data, title, body });
    for (const [oldKey, note] of existing) notes.set(oldKey, note);
    renderNotes();
    form.reset();
    titleCount.textContent = '0 / 100';
    setStatus(`Note created (status ${status}, id ${data.id}).`, 'success');
  } catch (error) {
    setStatus(`Could not create note. Please try again. ${error.message}`, 'error');
  } finally {
    setBusy(false);
  }
}

async function deleteNote(key) {
  if (busy || !notes.has(key)) return;
  const note = notes.get(key);
  setBusy(true);
  setStatus('Deleting note...', 'loading');
  try {
    // Mock API: DELETE succeeds but never persists. Locally created notes may
    // share the same returned ID; our distinct map keys remove only the chosen note.
    const { status } = await request(`${API_URL}/${encodeURIComponent(note.id)}`, { method: 'DELETE' });
    notes.delete(key);
    renderNotes();
    setStatus(`Note deleted (status ${status}, id ${note.id}).`, 'success');
  } catch (error) {
    setStatus(`Could not delete note. Please try again. ${error.message}`, 'error');
  } finally {
    setBusy(false);
  }
}

titleInput.addEventListener('input', () => {
  titleCount.textContent = `${titleInput.value.length} / 100`;
});
loadButton.addEventListener('click', loadNotes);
form.addEventListener('submit', createNote);
renderNotes();
