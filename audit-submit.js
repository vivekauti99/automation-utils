(async () => {
  // Utility: wait until an element appears
  const waitForXPath = (xpath, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (result) return resolve(result);
        if (Date.now() - startTime > timeout) return reject(`Timeout waiting for XPath: ${xpath}`);
        requestAnimationFrame(check); // Faster than setTimeout
      };
      check();
    });
  };

  const waitForTextOption = (text, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        const el = Array.from(document.querySelectorAll("div")).find(d => d.textContent.trim() === text);
        if (el) return resolve(el);
        if (Date.now() - startTime > timeout) return reject(`Timeout waiting for option: ${text}`);
        requestAnimationFrame(check);
      };
      check();
    });
  };

  for (let i = 0; i < 20; i++) {
    console.log(`🔁 Iteration ${i + 1}...`);

    try {
      // 1. Click "Edit"
      const editBtn = await waitForXPath("(//span[contains(@title,'Edit')])[1]");
      editBtn.click();
      console.log("✔️ Clicked 'Edit'");

      // 2. Click first dropdown (Approve)
      const approveDropdown = await waitForXPath("//div[contains(@class,'col-12 mb-4')]//div//*[name()='svg']");
      approveDropdown.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      approveDropdown.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      console.log("✔️ Opened 'Approve' dropdown");

      // 3. Select "Approve"
      const approveOption = await waitForTextOption("Approve");
      approveOption.click();
      console.log("✔️ Selected 'Approve'");

      // 4. Click second dropdown (Compliant)
      const compliantDropdown = await waitForXPath("//div[contains(@class,'modal-body')]//div[2]//div[1]//div[1]//div[1]//div[2]//div[1]//*[name()='svg']");
      compliantDropdown.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      compliantDropdown.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      console.log("✔️ Opened 'Compliant' dropdown");

      // 5. Select "Compliant"
      const compliantOption = await waitForTextOption("Compliant");
      compliantOption.click();
      console.log("✔️ Selected 'Compliant'");

      // 6. Click Submit
      const submitBtn = await waitForXPath("//button[normalize-space()='Submit']");
      submitBtn.click();
      console.log("🚀 Submitted!");

      // Optional: wait for modal to close or new row to appear (can skip if UI is fast enough)
      await new Promise(res => setTimeout(res, 800)); // Short pause just for stability

    } catch (err) {
      console.log(`❌ Error in iteration ${i + 1}: ${err}`);
      break;
    }
  }

  console.log("✅ Loop completed.");
})();
