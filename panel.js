console.clear();

const FORM = document.querySelector("#add-job");

// data from form
const LOCATION_INPUT = document.getElementById("location-input");
const COMPANY_ROLE_INPUT = document.getElementById("company-role-input");
const DEADLINE_INPUT = document.getElementById("deadline-input");
const NOTES_TEXT = document.getElementById("notes-textarea");
const STATUS_DROPDOWN = document.getElementById("status-dropdown");
const SUBMIT_BTN = document.getElementById("add-btn");

// change page/display stuff
const addAppBtn = document.getElementById("add-app-btn");
const myJobsBtn = document.getElementById("my-jobs-btn");

const intro = document.getElementById("intro");
const add = document.getElementById("add");
const jobs = document.getElementById("jobs");

const JOB_DISPLAY = document.getElementById("job-display");
const EMPTY_STATE = document.getElementById("empty-state");

//originally hidden
add.style.display = "none";
jobs.style.display = "none";

// functions to change displays
const addDisplay = () => {
  jobs.style.display = "none";
  add.style.display = "block";
};

const jobDisplay = () => {
  jobs.style.display = "block";
  add.style.display = "none";
};

let editingJobId = null;

addAppBtn.addEventListener("click", () => {
  editingJobId = null;
  FORM.reset();
  SUBMIT_BTN.textContent = "Add job";
  addDisplay();
});
myJobsBtn.addEventListener("click", jobDisplay);

const addJob = (event) => {
  event.preventDefault();

  let jobTitle = COMPANY_ROLE_INPUT.value;
  let deadline = DEADLINE_INPUT.value;
  let notes = NOTES_TEXT.value;
  let location = LOCATION_INPUT.value;
  let status = STATUS_DROPDOWN.value;

  if (editingJobId) {
    // UPDATE existing job
    updateJob(editingJobId, { jobTitle, location, deadline, status, notes });
    editingJobId = null;
  } else {
    // CREATE new job
    const newJob = {
      id: Date.now(),
      jobTitle,
      location,
      deadline,
      notes,
      status,
    };
    jobList.push(newJob);
    saveJobs();

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Job added successfully!",
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      background: "#f3e9dc",
      color: "#5e3023",
    });
  }

  FORM.reset();
  SUBMIT_BTN.textContent = "Add job";
};

FORM.addEventListener("submit", addJob);

let jobList = [];
let currentFilter = "all";

// filter buttons
const filterBtns = document.querySelectorAll(".filter-btn");
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    filterBtns.forEach((b) => b.classList.remove("underline"));
    btn.classList.add("underline");
    displayJobs();
  });
});

// chrome storage
const saveJobs = () => {
  chrome.storage.local.set({ jobs: jobList }, () => {
    displayJobs(); // refresh
  });
};
const loadJobs = () => {
  chrome.storage.local.get(["jobs"], (result) => {
    jobList = result.jobs || [];
    displayJobs();
  });
};
const displayJobs = () => {
  let filteredJobs = jobList;
  if (currentFilter != "all") {
    filteredJobs = jobList.filter((j) => j.status === currentFilter);
  }
  if (filteredJobs.length == 0) {
    JOB_DISPLAY.innerHTML = "";
    EMPTY_STATE.style.display = "block";
    return;
  }
  EMPTY_STATE.style.display = "none";
  JOB_DISPLAY.innerHTML = filteredJobs.map((j) => createJobCard(j)).join("");

  // give event listeners to created buttons and headers
  filteredJobs.forEach((j) => {
    const jobHeader = document.querySelector(`[data-toggle-id="${j.id}"]`);
    const editBtn = document.querySelector(`[data-edit-id="${j.id}"]`);
    const deleteBtn = document.querySelector(`[data-delete-id="${j.id}"]`);

    if (jobHeader)
      jobHeader.addEventListener("click", () => toggleJobCard(j.id));
    if (editBtn) editBtn.addEventListener("click", () => openEditModal(j.id));
    if (deleteBtn) deleteBtn.addEventListener("click", () => deleteJob(j.id));
  });
};

function toggleJobCard(jobId) {
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
}

const createJobCard = (job) => {
  return `
      <div class="mb-3 max-w-sm mx-auto" data-job-id="${job.id}">
        <div class="p-3 rounded-lg bg-transparent flex justify-between items-center cursor-pointer transition-all duration-200 bg-white/50" data-toggle-id="${
          job.id
        }">
          <div class="text-left flex-1">
            <h3 class="m-0 text-sm font-normal nanum-gothic-extrabold text-[var(--warm-brown)]">${
              job.jobTitle
            }</h3>
          </div>
          <div class="flex items-center gap-3">
            <span class="toggle-icon text-sm text-[var(--warm-brown)] transition-transform duration-300 ease-in-out">▼</span>
          </div>
        </div>
        <div class="job-details max-h-0 overflow-hidden transition-all duration-300 ease-in-out" id="details-${
          job.id
        }">
          <div class="p-4 rounded-b-lg -mt-px bg-white/50">
            <p class="my-2 text-xs text-left"><strong>Location</strong><br> ${
              job.location
            }</p>
            <p class="my-2 text-xs text-left"><strong>Deadline\n</strong> <br>${
              job.deadline || "None"
            }</p>
            <p class="my-2 text-xs text-left"><strong>Notes\n</strong><br> ${
              job.notes || "None"
            }</p>
            <div class="mt-4 flex justify-start gap-2">
              <button class="edit-btn px-3 py-1.5 border border-gray-400 rounded-lg bg-white/50 cursor-pointer transition-all duration-200 text-xs hover:bg-gray-50"  data-edit-id="${
                job.id
              }">Edit</button>
              <button class="delete-btn px-3 py-1.5 border border-gray-400 rounded-lg bg-white/50 cursor-pointer transition-all duration-200 text-xs hover:bg-gray-50" data-delete-id="${
                job.id
              }">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
};

const openEditModal = (jobId) => {
  const job = jobList.find((j) => j.id === jobId);
  if (!job) return;

  editingJobId = jobId;
  COMPANY_ROLE_INPUT.value = job.jobTitle;
  LOCATION_INPUT.value = job.location;
  DEADLINE_INPUT.value = job.deadline;
  STATUS_DROPDOWN.value = job.status;
  NOTES_TEXT.value = job.notes || "";

  SUBMIT_BTN.textContent = "Save Edits";
  addDisplay();
};

const updateJob = (jobId, updatedData) => {
  const index = jobList.findIndex((j) => j.id === jobId);
  if (index !== -1) {
    jobList[index] = { ...jobList[index], ...updatedData };
    saveJobs();
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Job updated!",
      showConfirmButton: false,
      timer: 2000,
      background: "#f3e9dc",
      color: "#5e3023",
    });
  }
};

const deleteJob = (jobId) => {
  Swal.fire({
    title: "Delete this job?",
    text: "This action cannot be undone",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Delete",
    cancelButtonText: "Cancel",
    background: "#f3e9dc",
    color: "#5e3023",
    iconColor: "#c08552",
    confirmButtonColor: "#c08552",
    cancelButtonColor: "#dab49d",
    reverseButtons: true,
    width: "360px",
    customClass: {
      title: "darumadrop-one-regular",
    },
  }).then((result) => {
    if (result.isConfirmed) {
      jobList = jobList.filter((j) => j.id !== jobId);
      saveJobs();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Job deleted!",
        showConfirmButton: false,
        timer: 2000,
        background: "#f3e9dc",
        color: "#5e3023",
      });
    }
  });
};

loadJobs();
