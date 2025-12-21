console.clear();

const FORM = document.querySelector("#add-job");

// data from form
const LOCATION_INPUT = document.getElementById("location-input");
const TYPE_INPUT = document.getElementById("type-input");

const COMPANY_INPUT = document.getElementById("company-input");
const ROLE_INPUT = document.getElementById("role-input");

const DEADLINE_INPUT = document.getElementById("deadline-input");
const NOTES_TEXT = document.getElementById("notes-textarea");

const LINK_INPUT = document.getElementById("link-input");
const SUBMIT_BTN = document.getElementById("add-btn");

// change page/display stuff
const addAppBtn = document.getElementById("add-app-btn");
const myJobsBtn = document.getElementById("my-jobs-btn");

const intro = document.getElementById("intro");
const add = document.getElementById("add");
const jobs = document.getElementById("jobs");

const JOB_DISPLAY = document.getElementById("job-display");
const EMPTY_STATE = document.getElementById("empty-state");

const cancelBtn = document.getElementById("cancel-changes-btn");

//originally hidden
add.style.display = "none";
jobs.style.display = "none";

// the cancel btn
cancelBtn.style.display = "none";

// cancel button event listener
cancelBtn.addEventListener("click", () => {
  resetFormState();
  jobDisplay();
});

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

// reset form state: button text, hide cancel btn, no job id.
const resetFormState = () => {
  editingJobId = null;
  FORM.reset();
  cancelBtn.style.display = "none";
  SUBMIT_BTN.textContent = "Add job to wishlist";
};

addAppBtn.addEventListener("click", () => {
  resetFormState();

  addDisplay();
  // auto-fill the link (future: scrape site and autofill everything)
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    LINK_INPUT.value = tabs[0].url;
  });
});
myJobsBtn.addEventListener("click", jobDisplay);

const addJob = (event) => {
  event.preventDefault();

  let role = ROLE_INPUT.value;
  let company = COMPANY_INPUT.value;
  let type = TYPE_INPUT.value;
  let location = LOCATION_INPUT.value;

  let deadline = DEADLINE_INPUT.value;
  let notes = NOTES_TEXT.value;
  let status = "Wishlist";
  let link = LINK_INPUT.value;

  // bro need to orhganize this stuff better
  if (editingJobId) {
    updateJob(editingJobId, {
      company,
      role,
      location,
      type,
      status,
      deadline,
      link,
      notes,
    });
    editingJobId = null;
  } else {
    const newJob = {
      id: Date.now(),
      company,
      role,
      location,
      type,
      status,
      deadline,
      link,
      notes,
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

  resetFormState();
};

FORM.addEventListener("submit", addJob);

let jobList = [];
let currentFilter = "all";

// filter buttons
const filterBtns = document.querySelectorAll(".filter-btn");

const setFilter = (filter) => {
  currentFilter = filter;
  filterBtns.forEach((btn) => {
    btn.classList.remove("underline");
    if (btn.dataset.filter === filter) {
      btn.classList.add("underline");
    }
  });
  displayJobs();
};

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    setFilter(btn.dataset.filter);
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
  // add animation
  const cards = JOB_DISPLAY.querySelectorAll("[data-job-id]");
  cards.forEach((card, index) => {
    card.classList.add("fade-in-bounce-delayed");
    card.style.animationDelay = `${index * 0.1}s`;
  });

  // give event listeners to created buttons and headers
  filteredJobs.forEach((j) => {
    const jobHeader = document.querySelector(`[data-toggle-id="${j.id}"]`);
    const editBtn = document.querySelector(`[data-edit-id="${j.id}"]`);
    const deleteBtn = document.querySelector(`[data-delete-id="${j.id}"]`);
    const statusDropdown = document.querySelector(`[data-status-id="${j.id}"]`);

    if (jobHeader)
      jobHeader.addEventListener("click", () => toggleJobCard(j.id));
    if (editBtn) editBtn.addEventListener("click", () => openEditModal(j.id));
    if (deleteBtn) deleteBtn.addEventListener("click", () => deleteJob(j.id));
    if (statusDropdown)
      statusDropdown.addEventListener("change", () => changeStatus(j.id));
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
            <p class="my-2 text-xs text-left"><strong>Deadline\n</strong> <br>${
              job.deadline || "None"
            }</p>
            <p class="my-2 text-xs text-left"><strong>Notes\n</strong><br> ${
              job.notes ? job.notes.replace(/\n/g, "<br>") : "None"
            }</p>


            
            <div class="mt-4 flex justify-end gap-2">
              <button class="px-3 py-1.5 border border-gray-400 rounded-lg bg-white/50 cursor-pointer transition-all duration-200 text-xs hover:bg-gray-50"  data-edit-id="${
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

const openEditModal = (jobId) => {
  const job = jobList.find((j) => j.id === jobId);
  if (!job) return;

  editingJobId = jobId;
  COMPANY_INPUT.value = job.company;
  ROLE_INPUT.value = job.role;
  TYPE_INPUT.value = job.type;

  LOCATION_INPUT.value = job.location;
  DEADLINE_INPUT.value = job.deadline;

  LINK_INPUT.value = job.link;
  NOTES_TEXT.value = job.notes || "";

  // make cancel button visible and change text of add button
  cancelBtn.style.display = "block";
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
    // go back to the my jobs view
    jobDisplay();
  }
};

const changeStatus = (jobId) => {
  const statusDropdown = document.querySelector(
    `[data-job-id="${jobId}"] select`
  );
  const newStatus = statusDropdown.value;

  const index = jobList.findIndex((j) => j.id === jobId);
  if (index !== -1) {
    jobList[index].status = newStatus;
    saveJobs();
    // automatically navigate to the filter tab matching the new status
    setFilter(newStatus);
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

// want to do:
// - aethsritc underline Animation
// - be able to change the status of job w/o having to edit job
// also want the jobs to be ordered (wait wha does this mean lol)
// edit the sweet alert make more aesthetic
// make it so that u can add requirements as a list, and automatically displays styel
// make sure code is organized and undersatndable, check for redundancies
// style the status update dropdown

// AI FEATURES TO ADD:
// autofill
// ai chat to ask about actions to take based on your resume / current jobs u applied to
// (eg. help manage prioritiesor which skills to work on,
// like dsa interview prep or maybe work on learning backend apis based on ur current wishlist of jobs
// help u make a schedule / timelien based on deadlines

// ai could also organize by relevance, role, etc..
