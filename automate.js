// automation-core.js

/**
 * Creates and inserts a task-editing modal.
 * @param {Object} config
 * @param {Array} config.defaultTasks – Initial task objects
 * @param {Array} config.projectOptions – Dropdown choices for project
 * @param {Array} config.activityOptions – Dropdown choices for activity
 * @returns {Object} { modal, overlay, getTasks }
 */
export function createModal({ defaultTasks, projectOptions, activityOptions }) {
  // Inject styles
  const style = document.createElement("style");
  style.textContent = `
    /* overlay, modal, table, inputs styling... */
    #startBtn { float: left; }
  `;
  document.head.appendChild(style);

  // Overlay & container
  const overlay = document.createElement("div");
  overlay.id = "taskModalOverlay";
  const modal = document.createElement("div");
  modal.id = "taskModal";

  // Modal HTML template
  modal.innerHTML = `
    <h3>Edit Tasks</h3>
    <button id="startBtn">Start Automation</button>
    <button id="addRowBtn" style="float:right">+ Add Row</button>
    <table>
      <thead>
        <tr><th>Project</th><th>Activity</th><th>Start</th><th>End</th><th>Break</th><th>Note</th><th>🗑️</th></tr>
      </thead>
      <tbody id="taskBody"></tbody>
    </table>
  `;

  document.body.append(overlay, modal);

  const taskBody = modal.querySelector("#taskBody");

  function renderRows(tasks) {
    taskBody.innerHTML = "";
    tasks.forEach((t, idx) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${selectHTML("project", projectOptions, t.project)}</td>
        <td>${selectHTML("activity", activityOptions, t.activity)}</td>
        <td><input type="time" name="startTime" value="${t.startTime}"></td>
        <td><input type="time" name="endTime" value="${t.endTime}"></td>
        <td><input name="breakHrs" value="${t.breakHrs}"></td>
        <td><input name="note" value="${t.note}"></td>
        <td><button class="delRowBtn">🗑️</button></td>
      `;
      taskBody.appendChild(row);
      row.querySelector(".delRowBtn").addEventListener("click", ()=> renderRows(currentTasks = currentTasks.filter((_, i)=>i!==idx)));
    });
  }

  function selectHTML(name, opts, sel) {
    return `<select name="${name}">` + opts.map(o=>`<option${o===sel?" selected":""}>${o}</option>`).join("") + `</select>`;
  }

  let currentTasks = defaultTasks.slice();
  renderRows(currentTasks);

  modal.querySelector("#addRowBtn").addEventListener("click", () => {
    currentTasks.push({ project: projectOptions[0], activity: activityOptions[0], startTime: "", endTime: "", breakHrs: "", note: "" });
    renderRows(currentTasks);
  });

  function getTasks() {
    return Array.from(taskBody.querySelectorAll("tr")).map(tr => {
      const inputs = tr.querySelectorAll("select, input");
      return {
        project: inputs[0].value,
        activity: inputs[1].value,
        startTime: inputs[2].value,
        endTime: inputs[3].value,
        breakHrs: inputs[4].value.trim(),
        note: inputs[5].value.trim()
      };
    });
  }

  return { modal, overlay, getTasks };
}

/**
 * Core logic: Takes tasks, locates form rows, and enters data.
 * Should work identical to original flow.
 * @param {Array} tasks
 */
export async function fillTasksOnPage(tasks) {
  const wait = ms => new Promise(res => setTimeout(res, ms));
  const waitForXPath = (xp, timeout=5000) => new Promise((res, rej) => {
    const start = Date.now();
    (function check(){
      const el = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (el) return res(el);
      Date.now()-start > timeout ? rej("Timeout "+xp) : requestAnimationFrame(check);
    })();
  });
  const waitForTextOption = (txt, timeout=5000) => new Promise((res, rej) => {
    const start = Date.now();
    (function check(){
      const el = [...document.querySelectorAll("span.ng-option-label")].find(x => x.textContent.trim()===txt);
      if (el) return res(el);
      Date.now()-start > timeout ? rej("Timeout option "+txt) : setTimeout(check, 100);
    })();
  });

  async function fillBlock(i, task) {
    const base = `(//div[@class='col-11 highlightFormArrDiv'])[${i}]`;
    const p = await waitForXPath(base + "//label[contains(text(),'Project')]/following-sibling::ng-select//input");
    p.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
    p.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    await wait(500);
    (await waitForTextOption(task.project)).click();

    const a = await waitForXPath(base + "//label[contains(text(),'Activity')]/following-sibling::ng-select//input");
    a.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
    a.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    await wait(500);
    (await waitForTextOption(task.activity)).click();

    const st = await waitForXPath(base+"//input[@name='startTime']");
    st.value = task.startTime;
    st.dispatchEvent(new Event("input",{bubbles:true}));

    const et = await waitForXPath(base+"//input[@name='endTime']");
    et.value = task.endTime;
    et.dispatchEvent(new Event("input",{bubbles:true}));

    const bh = await waitForXPath(base+"//input[@name='breakHrs']");
    bh.value = task.breakHrs;
    bh.dispatchEvent(new Event("input",{bubbles:true}));

    const nt = await waitForXPath(base+"//input[@placeholder='Give some notes about this activity']");
    nt.value = task.note;
    nt.dispatchEvent(new Event("input",{bubbles:true}));
  }

  try {
    const dateInput = prompt("📅 Enter day of month (1–31):");
    if (!dateInput || isNaN(dateInput) || +dateInput<1 || +dateInput>31) throw new Error("Invalid date");
    (await waitForXPath("//span[normalize-space()='"+(+dateInput)+"']")).click();
    await wait(2000);

    for (let i=0; i<tasks.length; i++) {
      if (i>0) {
        (await waitForXPath("//button[contains(@class,'btn-add')]")).click();
        await wait(1000);
      }
      await fillBlock(i+1, tasks[i]);
    }
  } catch(err) {
    alert("❌ Error: "+err.message);
  }
}
