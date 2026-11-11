import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJQ3f1uky1nuZEf6_rfbKlDPChIWe16UM",
  authDomain: "oh-todo-backend.firebaseapp.com",
  databaseURL: "https://oh-todo-backend-default-rtdb.firebaseio.com",
  projectId: "oh-todo-backend",
  storageBucket: "oh-todo-backend.firebasestorage.app",
  messagingSenderId: "888879444504",
  appId: "1:888879444504:web:109de28910b465bc77896d",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const todosRef = ref(db, "todos");

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const listEl = document.getElementById("todo-list");
const emptyEl = document.getElementById("empty-state");
const countEl = document.getElementById("todo-count");

let todos = [];
let editingId = null;

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setEditMode(todo) {
  editingId = todo ? todo.id : null;
  form.classList.toggle("is-editing", Boolean(todo));
  cancelBtn.classList.toggle("hidden", !todo);
  submitBtn.textContent = todo ? "저장" : "추가";
  input.value = todo ? todo.text : "";
  input.focus();
}

function render() {
  listEl.innerHTML = "";
  countEl.textContent = `${todos.length}개`;
  emptyEl.classList.toggle("hidden", todos.length > 0);

  todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = `todo-item${todo.done ? " is-done" : ""}`;
    li.dataset.id = todo.id;
    li.innerHTML = `
      <input class="check" type="checkbox" ${todo.done ? "checked" : ""} aria-label="완료 표시" />
      <p class="todo-text">${escapeHtml(todo.text)}</p>
      <div class="actions">
        <button type="button" class="icon-btn edit" data-action="edit">수정</button>
        <button type="button" class="icon-btn delete" data-action="delete">삭제</button>
      </div>
    `;
    listEl.appendChild(li);
  });
}

/** Realtime Database에 할일 추가 */
async function addTodo(text) {
  const newTodoRef = push(todosRef);
  await set(newTodoRef, {
    text,
    done: false,
    createdAt: Date.now(),
  });
}

/** Realtime Database에서 할일 수정 */
async function updateTodo(id, text) {
  await update(ref(db, `todos/${id}`), { text });
}

/** Realtime Database에서 할일 삭제 */
async function deleteTodo(id) {
  if (editingId === id) setEditMode(null);
  await remove(ref(db, `todos/${id}`));
}

async function toggleDone(id) {
  const todo = todos.find((item) => item.id === id);
  if (!todo) return;
  await update(ref(db, `todos/${id}`), { done: !todo.done });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  submitBtn.disabled = true;

  try {
    if (editingId) {
      // Firebase로 할일 수정
      await updateTodo(editingId, text);
      setEditMode(null);
    } else {
      await addTodo(text);
      input.value = "";
      input.focus();
    }
  } catch (error) {
    console.error("할일 추가/수정 실패:", error);
    alert(
      "Realtime Database 저장에 실패했습니다.\n보안 규칙에서 쓰기가 허용되는지 확인해주세요."
    );
  } finally {
    submitBtn.disabled = false;
  }
});

cancelBtn.addEventListener("click", () => {
  setEditMode(null);
});

listEl.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const item = target.closest(".todo-item");
  if (!item) return;

  const id = item.dataset.id;
  const action = target.dataset.action;

  // 수정 버튼: 입력창에 기존 내용을 넣고 편집 모드로 전환
  if (action === "edit") {
    const todo = todos.find((entry) => entry.id === id);
    if (todo) setEditMode(todo);
    return;
  }

  // 삭제 버튼: Firebase에서 해당 할일 제거
  if (action === "delete") {
    if (!confirm("이 할일을 삭제할까요?")) return;

    try {
      await deleteTodo(id);
    } catch (error) {
      console.error("할일 삭제 실패:", error);
      alert("삭제에 실패했습니다. 보안 규칙을 확인해주세요.");
    }
  }
});

listEl.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.classList.contains("check")) {
    return;
  }

  const item = target.closest(".todo-item");
  if (!item) return;

  try {
    await toggleDone(item.dataset.id);
  } catch (error) {
    console.error(error);
    alert("상태 변경에 실패했습니다.");
  }
});

// Realtime Database 실시간 구독
onValue(
  todosRef,
  (snapshot) => {
    const data = snapshot.val() || {};
    todos = Object.entries(data)
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    render();
  },
  (error) => {
    console.error("Firebase 연결 실패:", error);
    emptyEl.textContent = "Firebase 연결에 실패했습니다. 콘솔을 확인해주세요.";
    emptyEl.classList.remove("hidden");
  }
);

input.focus();
