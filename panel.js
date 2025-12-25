console.clear();

// setup the styles for swal
const TOAST_CONFIG = {
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
  background: "#f3e9dc",
  color: "#5e3023",
};

const SWAL_THEME = {
  background: "#f3e9dc",
  color: "#5e3023",
  iconColor: "#c08552",
  confirmButtonColor: "#c08552",
  cancelButtonColor: "#dab49d",
  width: "360px",
  customClass: { title: "darumadrop-one-regular" },
};

const FOLDERS_CONTAINER_HTML = `<div id="folders-container" class="grid grid-cols-3 gap-4"></div>`;

// DOM ELEMENTS
const form = document.querySelector("#add-job");
const companyInput = document.getElementById("company-input");
const roleInput = document.getElementById("role-input");
const locationInput = document.getElementById("location-input");
const typeInput = document.getElementById("type-input");
const linkInput = document.getElementById("link-input");
const deadlineInput = document.getElementById("deadline-input");
const notesTextarea = document.getElementById("notes-textarea");

const submitBtn = document.getElementById("add-btn");
const addAppBtn = document.getElementById("add-app-btn");
const myJobsBtn = document.getElementById("my-jobs-btn");
const cancelBtn = document.getElementById("cancel-changes-btn");
const autofillBtn = document.getElementById("autofill-btn");
const backToFoldersBtn = document.getElementById("backToFolders");
const reorganizeBtn = document.getElementById("reorganizeBtn");
const filterBtns = document.querySelectorAll(".filter-btn");

// different sections / displays
const intro = document.getElementById("intro");
const addSection = document.getElementById("add");
const jobsSection = document.getElementById("jobs");
const jobDisplay = document.getElementById("job-display");
const emptyState = document.getElementById("empty-state");

let jobList = [];
let currentFilter = "all";
let cachedCategories = null;
let editingJobId = null;

// initally hidden
addSection.style.display = "none";
jobsSection.style.display = "none";
cancelBtn.style.display = "none";
backToFoldersBtn.style.display = "none";

// Navigation Functions
const showAddSection = () => {
  jobsSection.style.display = "none";
  addSection.style.display = "block";
};

const showJobsSection = () => {
  jobsSection.style.display = "block";
  addSection.style.display = "none";
};

const resetFormState = () => {
  editingJobId = null;
  form.reset();
  cancelBtn.style.display = "none";
  autofillBtn.style.display = "block";
  submitBtn.textContent = "Add job to wishlist";
};

addAppBtn.addEventListener("click", () => {
  resetFormState();
  showAddSection();
});

myJobsBtn.addEventListener("click", () => {
  showJobsSection();
  setFilter("all");
});

cancelBtn.addEventListener("click", () => {
  resetFormState();
  showJobsSection();
  setFilter("all");
});

const addJob = (e) => {
  e.preventDefault();

  // construct new job
  const jobData = {
    company: companyInput.value,
    role: roleInput.value,
    location: locationInput.value,
    type: typeInput.value,
    status: "Wishlist",
    deadline: deadlineInput.value,
    link: linkInput.value,
    notes: notesTextarea.value,
  };

  // check if editing a job -> flow is different
  if (editingJobId) {
    updateJob(editingJobId, jobData);
  } else {
    const newJob = { id: Date.now(), ...jobData };
    jobList.push(newJob);
    cachedCategories = null;
    showToast("Job added successfully!");
    saveJobs(); // uses autoCategorize
    form.reset(); // clean flow!
  }

  if (editingJobId) {
    resetFormState();
  }
};

form.addEventListener("submit", addJob);

// filter and show
const resetToFolderView = () => {
  jobDisplay.innerHTML = FOLDERS_CONTAINER_HTML;
  backToFoldersBtn.style.display = "none";
};

const setFilter = (filter) => {
  currentFilter = filter;
  filterBtns.forEach((btn) => {
    btn.classList.remove("underline");
    if (btn.dataset.filter === filter) {
      btn.classList.add("underline");
    }
  });

  resetToFolderView();
  displayFolders();
};

filterBtns.forEach((btn) =>
  btn.addEventListener("click", () => setFilter(btn.dataset.filter))
);

const showToast = (title, icon = "success") => {
  Swal.fire({ ...TOAST_CONFIG, icon, title });
};

const saveJobs = () => {
  chrome.storage.local.set(
    { jobs: jobList, categories: cachedCategories },
    () => {
      cachedCategories ? displayFolders() : autoCategorize();
    }
  );
};

const loadJobs = () => {
  chrome.storage.local.get(["jobs", "categories"], (result) => {
    jobList = result.jobs || [];
    cachedCategories = result.categories?.length > 0 ? result.categories : null;
    cachedCategories ? displayFolders() : autoCategorize();
  });
};

const attachJobCardListeners = (jobs) => {
  jobs.forEach((job) => {
    const jobHeader = document.querySelector(`[data-toggle-id="${job.id}"]`);
    const editBtn = document.querySelector(`[data-edit-id="${job.id}"]`);
    const deleteBtn = document.querySelector(`[data-delete-id="${job.id}"]`);
    const statusDropdown = document.querySelector(
      `[data-status-id="${job.id}"]`
    );

    if (jobHeader)
      jobHeader.addEventListener("click", () => toggleJobCard(job.id));
    if (editBtn) editBtn.addEventListener("click", () => openEditModal(job.id));
    if (deleteBtn) deleteBtn.addEventListener("click", () => deleteJob(job.id));
    if (statusDropdown)
      statusDropdown.addEventListener("change", () => changeStatus(job.id));
  });
};

const displayJobs = (jobs = jobList) => {
  if (jobs.length === 0) {
    jobDisplay.innerHTML = FOLDERS_CONTAINER_HTML;
    emptyState.style.display = "block";
    reorganizeBtn.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  reorganizeBtn.style.display = "inline-block";

  jobDisplay.innerHTML = jobs
    .map((j, index) => createJobCard(j, index + 1))
    .join("");

  const cards = jobDisplay.querySelectorAll("[data-job-id]");
  cards.forEach((card) => card.classList.add("fade-in-bounce-delayed"));

  attachJobCardListeners(jobs);
};

const toggleJobCard = (jobId) => {
  const details = document.getElementById(`details-${jobId}`);
  const card = document.querySelector(`[data-job-id="${jobId}"]`);
  const icon = card.querySelector(".toggle-icon");

  if (details.style.maxHeight === "0px" || !details.style.maxHeight) {
    details.style.maxHeight = details.scrollHeight + "px";
    icon.style.transform = "rotate(180deg)";
  } else {
    details.style.maxHeight = "0px";
    icon.style.transform = "rotate(0deg)";
  }
};

const displayFolders = (roles = cachedCategories, allJobs = jobList) => {
  const container = document.getElementById("folders-container");
  if (!container || !roles || roles.length === 0) {
    if (container) container.innerHTML = "";
    return;
  }

  const filteredJobs =
    currentFilter === "all"
      ? allJobs
      : allJobs.filter((j) => j.status === currentFilter);

  const filteredRoles = roles
    .map((role) => ({
      ...role,
      jobIds: role.jobIds.filter((id) => filteredJobs.some((j) => j.id === id)),
    }))
    .filter((role) => role.jobIds.length > 0);

  container.innerHTML = "";
  const hasJobs = filteredRoles.length > 0;

  emptyState.style.display = hasJobs ? "none" : "block";
  reorganizeBtn.style.display =
    hasJobs && currentFilter === "all" ? "inline-block" : "none";

  if (!hasJobs) return;

  filteredRoles.forEach((role) => {
    const folderDiv = document.createElement("div");
    folderDiv.className =
      "folder flex flex-col text-center fade-in-bounce-delayed";
    folderDiv.innerHTML = `
      <img class="folder-img" src="/media/folder-icon.png" />
      <span class="folder-label">${role.name}</span>
    `;
    folderDiv.addEventListener("click", () =>
      showJobsInFolder(role, filteredJobs)
    );
    container.appendChild(folderDiv);
  });
};

const showJobsInFolder = (role, filteredJobs) => {
  const jobsInFolder = filteredJobs.filter((j) => role.jobIds.includes(j.id));
  document.getElementById("folders-container").style.display = "none";
  displayJobs(jobsInFolder);
  reorganizeBtn.style.display = "none";
  showBackButton();
};

const showBackButton = () => {
  backToFoldersBtn.style.display = "block";
  backToFoldersBtn.textContent = "⬅︎";
  backToFoldersBtn.onclick = () => {
    resetToFolderView();
    displayFolders();
  };
};

// not using the number parameter rn -> for tracking & displaying index, might add
const createJobCard = (job, number) => {
  return `
    <div class="mb-5 max-w-sm mx-auto" data-job-id="${job.id}">
      <div class="p-3 rounded-lg flex justify-between items-center cursor-pointer transition-all duration-200 bg-white/50 hover:bg-white" data-toggle-id="${
        job.id
      }">
        <div class="text-left flex-1">
          <h3 class="m-0 text-sm font-normal nanum-gothic-extrabold text-[var(--warm-brown)]">${
            job.role
          } @ ${job.company}</h3>
        </div>
        <div class="flex items-center gap-3">
          <span class="toggle-icon text-sm text-[var(--warm-brown)] transition-transform duration-300 ease-in-out">▼</span>
        </div>
      </div>

      <div class="job-details max-h-0 overflow-hidden transition-all duration-300 ease-in-out" id="details-${
        job.id
      }">
        <div class="p-4 rounded-b-lg -mt-px bg-white/50">
          <div class="flex justify-between">
            <a href="${
              job.link
            }" target="_blank" class="darumadrop-one-regular my-2 text-left uppercase text-[var(--neutral-brown)] hover:underline text-sm font-bold">View job posting</a>
            <select class="darumadrop-one-regular my-2 text-center text-[var(--tan)] text-sm focus:outline-none font-bold hover:cursor-pointer" data-status-id="${
              job.id
            }">
              <option disabled selected>✱ ${job.status.toUpperCase()} ✱</option>
              <option>Wishlist</option>
              <option>Applied</option>
              <option>Interview</option>
              <option>Offer</option>
            </select>
          </div>

          <p class="my-2 text-xs text-left"><strong>Location</strong><br> ${
            job.location
          } (${job.type})</p>
          <p class="my-2 text-xs text-left"><strong>Deadline</strong><br> ${
            job.deadline || "None"
          }</p>
          <p class="my-2 text-xs text-left"><strong>Notes</strong><br> ${
            job.notes ? job.notes.replace(/\n/g, "<br>") : "None"
          }</p>

          <div class="mt-4 flex justify-end gap-2">
            <button class="px-3 py-1.5 border border-gray-400 rounded-lg bg-white/50 cursor-pointer transition-all duration-200 text-xs hover:bg-gray-50" data-edit-id="${
              job.id
            }">Edit</button>
            <button class="px-3 py-1.5 border border-gray-400 rounded-lg bg-white/50 cursor-pointer transition-all duration-200 text-xs hover:bg-gray-50" data-delete-id="${
              job.id
            }">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `;
};

const removeJobFromCategories = (jobId) => {
  // check if already
  if (!cachedCategories) return;
  cachedCategories.forEach(
    (cat) => (cat.jobIds = cat.jobIds.filter((id) => id !== jobId))
  );
  cachedCategories = cachedCategories.filter((cat) => cat.jobIds.length > 0);
};

const openEditModal = (jobId) => {
  const job = jobList.find((j) => j.id === jobId);
  if (!job) return;

  // set stuff
  editingJobId = jobId;
  companyInput.value = job.company;
  roleInput.value = job.role;
  typeInput.value = job.type;
  locationInput.value = job.location;
  deadlineInput.value = job.deadline;
  linkInput.value = job.link;
  notesTextarea.value = job.notes || "";

  // change stuff, show stuff / hide stuff
  cancelBtn.style.display = "block";
  autofillBtn.style.display = "none";
  submitBtn.textContent = "Save Edits";
  showAddSection();
};

const updateJob = (jobId, updatedData) => {
  const index = jobList.findIndex((j) => j.id === jobId);
  if (index === -1) return;

  jobList[index] = { ...jobList[index], ...updatedData };
  saveJobs();
  showToast("successfully updated!");
  showJobsSection();
  resetToFolderView();
  setFilter(jobList[index].status);
};

const changeStatus = (jobId) => {
  const index = jobList.findIndex((j) => j.id === jobId);
  if (index === -1) return;

  const newStatus = document.querySelector(
    `[data-job-id="${jobId}"] select`
  ).value;
  jobList[index].status = newStatus;
  saveJobs();
  resetToFolderView();
  setFilter(newStatus);
};

const deleteJob = (jobId) => {
  Swal.fire({
    title: "are you sure you want to delete? ˚⟡˖",
    text: "this action cannot be undone.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Delete",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    ...SWAL_THEME,
  }).then((result) => {
    if (result.isConfirmed) {
      removeJobFromCategories(jobId);
      jobList = jobList.filter((j) => j.id !== jobId);
      saveJobs();
      showToast("successfully deleted!");
      resetToFolderView();
    }
  });
};

// LOADING THING
const setLoadingState = (isLoading) => {
  const loadingElement = document.getElementById("loading-categories");
  if (loadingElement)
    loadingElement.style.display = isLoading ? "block" : "none";

  const setElementState = (el) => {
    el.disabled = isLoading;
    el.style.opacity = isLoading ? "0.5" : "1";
    el.style.cursor = isLoading ? "not-allowed" : "pointer";
  };

  setElementState(reorganizeBtn);
  filterBtns.forEach(setElementState);
};

// AUTOCATEGORIZE
async function autoCategorize() {
  if (cachedCategories) {
    displayFolders(cachedCategories, jobList);
    return;
  }

  // spinner (fix, right after you add a job -> then click see jobs doesn't show up)
  const container = document.getElementById("folders-container");
  if (container) {
    container.innerHTML = `
      <div id="loading-categories" class="col-span-3 text-center py-8">
        <div class="inline-block w-8 h-8 border-4 border-[var(--neutral-brown)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    `;
  }

  setLoadingState(true);

  chrome.storage.local.get(["jobs"], (result) => {
    const jobs = result.jobs || [];
    chrome.runtime.sendMessage(
      { action: "categorizeJobs", jobs },
      (response) => {
        setLoadingState(false);

        if (response && response.success) {
          cachedCategories = response.categories;
          chrome.storage.local.set({ categories: cachedCategories });
          displayFolders(response.categories, jobs);
        }
      }
    );
  });
}

reorganizeBtn.addEventListener("click", () => {
  const container = document.getElementById("folders-container");
  if (container) {
    // can probably clean this up
    container.innerHTML = `
      <div id="loading-categories" class="col-span-3 text-center py-8">
        <div class="inline-block w-8 h-8 border-4 border-[var(--neutral-brown)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    `;
  }

  cachedCategories = null;
  chrome.storage.local.remove("categories", () => autoCategorize());
});

// AUTOFILL
const setFormLoadingState = (isLoading) => {
  const formElements = [
    companyInput,
    roleInput,
    locationInput,
    typeInput,
    linkInput,
    deadlineInput,
    notesTextarea,
    submitBtn,
    autofillBtn,
  ];

  formElements.forEach((element) => {
    element.disabled = isLoading;
    element.style.opacity = isLoading ? "0.5" : "1";
    element.style.cursor = isLoading ? "not-allowed" : "";
  });
  // loadin button
  autofillBtn.textContent = isLoading ? "Autofilling..." : "Autofill";
};

autofillBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // errors
  if (
    !tab.url ||
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("chrome-extension://")
  ) {
    showToast(
      "sorry, coco cannot autofill from this page. please navigate to a job posting website! ˚⟡˖ ࣪",
      "error"
    );
    return;
  }

  setFormLoadingState(true);

  chrome.tabs.sendMessage(tab.id, { action: "getPageContent" }, (response) => {
    if (chrome.runtime.lastError) {
      showToast(
        "sorry, coco cannot access this page. try refreshing first! ˚⟡˖",
        "error"
      );
      setFormLoadingState(false);
      return;
    }

    if (response) {
      chrome.runtime.sendMessage(
        { action: "extractJobInfo", pageText: response.text },
        (result) => {
          if (chrome.runtime.lastError) {
            showToast("Error extracting job info", "error");
            setFormLoadingState(false);
            return;
          }

          if (result && result.success) {
            roleInput.value = result.jobInfo.title || "";
            companyInput.value = result.jobInfo.company || "";
            locationInput.value = result.jobInfo.location || "";
            typeInput.value = result.jobInfo.type || "";
            deadlineInput.value = result.jobInfo.deadline || "";
            linkInput.value = response.url;
            notesTextarea.value = result.jobInfo.requirements || "";
            setFormLoadingState(false);
            showToast("done! ˚⟡˖", "success");
          } else {
            showToast(
              "sorry, coco could not extract the job information. ˚⟡˖",
              "error"
            );
            setFormLoadingState(false);
          }
        }
      );
    }
  });
});

// RESUME ANALYSIS
const analyzeResumeBtn = document.getElementById("analyze-resume-btn");
pdfjsLib.GlobalWorkerOptions.workerSrc = "pkgs/pdf.worker.min.js";

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

analyzeResumeBtn.addEventListener("click", async () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/pdf";

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showToast("please upload a valid file, coco needs a pdf ˚⟡˖", "error");
      return;
    }

    Swal.fire({
      // want to add an animation to this !!
      title: "coco is working...˚⟡˖",
      html: "currently reading your resume and matching against jobs in your wishlist.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      ...SWAL_THEME,
    });

    try {
      const resumeText = await extractTextFromPDF(file);

      chrome.runtime.sendMessage(
        { action: "analyzeResume", resumeText, jobs: jobList },
        (response) => {
          if (chrome.runtime.lastError) {
            Swal.fire({
              title: "Error",
              text:
                chrome.runtime.lastError.message ||
                "sorry, coco could not analyze your resume ˚⟡˖",
              icon: "error",
              ...SWAL_THEME,
            });
            return;
          }

          if (response && response.success) {
            const formattedAnalysis = response.analysis.replace(
              /<h3>YOUR ACTION PLAN/i,
              "<br><h3>YOUR ACTION PLAN"
              // clean it, just adding extra newline
            );
            Swal.fire({
              title: "Your Priority Skills:",
              //CLEAN THIS UP
              html: `<div style="text-align: left; font-size: 14px; line-height: 1.6;">${formattedAnalysis}</div>`,
              icon: "success",
              confirmButtonText: "Got it!",
              width: "550px",
              ...SWAL_THEME,
              customClass: {
                title: "darumadrop-one-regular",
                htmlContainer: "nanum-gothic-regular",
              },
            });
          } else {
            console.error("Analysis failed:", response);
            Swal.fire({
              title: "Error",
              text:
                response?.error ||
                "sorry, your resume analysis failed. check the console for details ˚⟡˖",
              icon: "error",
              ...SWAL_THEME,
            });
          }
        }
      );
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "oops! failed to read pdf file:" + error.message,
        icon: "error",
        ...SWAL_THEME,
      });
    }
  };

  input.click();
});

loadJobs();

// todo.
//- reformulate prompts to be more coco-like
//- add feedback button
