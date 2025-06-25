// automate.js

export function createModal({ defaultTasks, projectOptions, activityOptions }) {
  const style = document.createElement("style");
  style.textContent = `
    #taskModalOverlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.6); z-index: 9998;
    }
    #taskModal {
      position: fixed; top: 10%; left: 50%;
      transform: translateX(-50%);
      background: #fff; z-index: 9999;
      padding: 20px; border-radius: 10px;
      width: 90%; max-width: 900px;
      box-shadow: 0 0 20px #0005;
      font-family: sans-serif;
    }
    #taskModal table { width: 100%; border-collapse: collapse; }
    #taskModal th, #taskModal td { border: 1px solid #ccc; padding: 6px; }
    #taskModal th { background: #f9f9f9; }
    #taskModal input, #taskModal select { width: 100%; }
    #startBtn { float: left; margin-top: 10px; padding: 6px 12px; }
    #addRowBtn { float: right; margin-top: 10px; padding: 6px 12px; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "taskModalOverlay";

  const modal = document.createElement("div");
  modal.id = "taskModal";

  modal.innerHTML = `
    <h3>Edit Tasks</h3>
    <button id="startBtn">Start Automation</button>
    <button id="addRowBtn">+ Add Row</button>
    <table>
      <thead>
        <tr><th>Project</th><th>Activity</th><th>Start</th><th>End</th><th>Break</th><th>Note</th><th>🗑</th></tr>
      </thead>
      <tbody id="taskBody"></tbody>
    </table>
  `;

  document.body.append(overlay, modal);
  const taskBody = modal.querySelector("#taskBody");

  function selectHTML(name, opts, sel) {
    return `<select name="${name}">` +
      opts.map(o => `<option${o === sel ? " selected" : ""}>${o}</option>`).join("") +
      `</select>`;
  }

  let currentTasks = defaultTasks.slice();
  renderRows(currentTasks);

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
        <td><button class="delRowBtn">🗑</button></td>
      `;
      taskBody.appendChild(row);
      row.querySelector(".delRowBtn").addEventListener("click", () => {
        currentTasks = currentTasks.filter((_, i) => i !== idx);
        renderRows(currentTasks);
      });
    });
  }

  modal.querySelector("#addRowBtn").addEventListener("click", () => {
    currentTasks.push({
      project: projectOptions[0],
      activity: activityOptions[0],
      startTime: "", endTime: "", breakHrs: "", note: ""
    });
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


export async function fillTasksOnPage(tasks) {
  const wait = ms => new Promise(res => setTimeout(res, ms));

  const waitForXPath = (xpath, timeout = 5000) =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      (function check() {
        const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          return resolve(el);
        }
        Date.now() - start > timeout
          ? reject(new Error("Timeout: " + xpath))
          : requestAnimationFrame(check);
      })();
    });

  const waitForTextOption = (txt, timeout = 5000) =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      (function check() {
        const el = [...document.querySelectorAll("span.ng-option-label")].find(x => x.textContent.trim() === txt);
        el ? resolve(el)
          : Date.now() - start > timeout
          ? reject(new Error("Timeout option: " + txt))
          : setTimeout(check, 100);
      })();
    });

  const fillBlock = async (i, { project, activity, startTime, endTime, breakHrs, note }) => {
    const base = `(//div[@class='col-11 highlightFormArrDiv'])[${i}]`;

    const p = await waitForXPath(base + "//label[contains(text(),'Project')]/following-sibling::ng-select//input");
    p.focus();
    p.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    p.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(500);
    (await waitForTextOption(project)).click();

    const a = await waitForXPath(base + "//label[contains(text(),'Activity')]/following-sibling::ng-select//input");
    a.focus();
    a.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(500);
    (await waitForTextOption(activity)).click();

    const st = await waitForXPath(base + "//input[@name='startTime']");
    st.value = startTime;
    st.dispatchEvent(new Event("input", { bubbles: true }));

    const et = await waitForXPath(base + "//input[@name='endTime']");
    et.value = endTime;
    et.dispatchEvent(new Event("input", { bubbles: true }));

    const bh = await waitForXPath(base + "//input[@name='breakHrs']");
    bh.value = breakHrs;
    bh.dispatchEvent(new Event("input", { bubbles: true }));

    const nt = await waitForXPath(base + "//input[@placeholder='Give some notes about this activity']");
    nt.value = note;
    nt.dispatchEvent(new Event("input", { bubbles: true }));
  };

  try {
    const dateInput = prompt("📅 Enter day of month (1–31):");
    if (!dateInput || isNaN(dateInput) || +dateInput < 1 || +dateInput > 31)
      throw new Error("Invalid date");

    const dateEl = await waitForXPath("//span[normalize-space()='" + (+dateInput) + "']");
    dateEl.click();
    await wait(2000);

    for (let i = 0; i < tasks.length; i++) {
      if (i > 0) {
        const addBtn = await waitForXPath("//button[contains(@class,'btn-add')]");
        addBtn.click();
        await wait(1000);
      }
      await fillBlock(i + 1, tasks[i]);
    }

    const submitBtn = await waitForXPath("//button[normalize-space()='Submit for approval']");
    submitBtn.click();
    await wait(1000);

    const confirmBtn = await waitForXPath("//button[normalize-space()='Confirm']");
    confirmBtn.click();
  } catch (err) {
    alert("❌ Error: " + err.message);
    console.error(err);
  }
}
