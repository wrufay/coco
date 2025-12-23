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

    // Try to add to existing category, otherwise recategorize
    if (!addJobToCategory(newJob)) {
      cachedCategories = null; // Force recategorization
    }
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

    // Navigate to jobs view
    jobDisplay();
    setFilter("Wishlist");
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

  // Reset to folder view when changing filters
  JOB_DISPLAY.innerHTML = `<div
            id="folders-container"
            class="grid grid-cols-3 gap-4"
          >
          </div>`;
  document.getElementById("backToFolders").style.display = "none";

  displayFolders();
};

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    setFilter(btn.dataset.filter);
  });
});

// chrome storage
const saveJobs = () => {
  chrome.storage.local.set(
    { jobs: jobList, categories: cachedCategories },
    () => {
      // If categories were cleared, regenerate them
      if (!cachedCategories) {
        autoCategorize();
      } else {
        displayFolders(); // refresh
      }
    }
  );
};
const loadJobs = () => {
  chrome.storage.local.get(["jobs", "categories"], (result) => {
    jobList = result.jobs || [];
    // Load saved categories if they exist
    if (result.categories && result.categories.length > 0) {
      cachedCategories = result.categories;
      displayFolders();
    } else {
      // No saved categories, ai make category
      autoCategorize();
    }
  });
};

// **flexible quick fix for parameters, make it better and more readable later
const displayJobs = (jobs = jobList) => {
  // Use the passed jobs parameter instead of re-filtering from jobList
  let filteredJobs = jobs;
  if (filteredJobs.length == 0) {
    JOB_DISPLAY.innerHTML = `<div
            id="folders-container"
            class="grid grid-cols-3 gap-4"
          >
          </div>`;
    EMPTY_STATE.style.display = "block";
    document.getElementById("reorganizeBtn").style.display = "none";
    return;
  }
  EMPTY_STATE.style.display = "none";
  document.getElementById("reorganizeBtn").style.display = "inline-block";

  JOB_DISPLAY.innerHTML = filteredJobs
    .map((j, index) => createJobCard(j, index + 1))
    .join("");

  // for testing folder design
  //   JOB_DISPLAY.innerHTML = createJobFolder();

  // add animation
  const cards = JOB_DISPLAY.querySelectorAll("[data-job-id]");
  cards.forEach((card) => {
    card.classList.add("fade-in-bounce-delayed");
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

//toggle, open info when u click the job name (collapsable)
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

// create job folder (not using rn, just to test the ui dynamically)
// const createJobFolder = (role) => {
//   return `
//     <div class="folder flex flex-col text-center">
//         <img class="folder-img" src="/media/folder-icon.png" />
//         <span class="folder-label">${role}</span>
//     </div>
//   `;
// };

// display all folders after getting claude to organize them
// ******
const displayFolders = (roles = cachedCategories, allJobs = jobList) => {
  const container = document.getElementById("folders-container");
  // ******
  if (!container) return;

  // if no categories yet, don't try to display
  if (!roles || roles.length === 0) {
    container.innerHTML = "";
    return;
  }
  // ******

  container.innerHTML = ""; //reset it

  // ******
  // filter jobs based on currentFilter
  let filteredJobs = allJobs;
  if (currentFilter !== "all") {
    filteredJobs = allJobs.filter((j) => j.status === currentFilter);
  }

  // filter roles to only show ones with jobs matching the filter
  const filteredRoles = roles
    .map((role) => {
      const matchingJobIds = role.jobIds.filter((id) =>
        filteredJobs.some((j) => j.id === id)
      );
      return { ...role, jobIds: matchingJobIds };
    })
    .filter((role) => role.jobIds.length > 0);

  // show empty state if no matching folders
  if (filteredRoles.length === 0) {
    EMPTY_STATE.style.display = "block";
    document.getElementById("reorganizeBtn").style.display = "none";
    return;
  }

  EMPTY_STATE.style.display = "none";

  // Only show reorganize button on "all" filter
  if (currentFilter === "all") {
    document.getElementById("reorganizeBtn").style.display = "inline-block";
  } else {
    document.getElementById("reorganizeBtn").style.display = "none";
  }
  // ******

  filteredRoles.forEach((role) => {
    const folderDiv = document.createElement("div");
    folderDiv.className =
      "folder flex flex-col text-center fade-in-bounce-delayed";

    folderDiv.innerHTML = `
    <img class="folder-img" src="/media/folder-icon.png" />
    <span class="folder-label">${role.name} (${role.jobIds.length})</span>
    `;
    // add event listener here to show all....
    // ******
    folderDiv.addEventListener("click", () => {
      showJobs(role, filteredJobs);
    });
    // ******

    container.appendChild(folderDiv);
  });
};

// show jobs
const showJobs = (role, filteredJobs) => {
  // Only show jobs that are in this folder AND match the current filter
  const curJobs = filteredJobs.filter((j) => role.jobIds.includes(j.id));
  //  hide folders
  document.getElementById("folders-container").style.display = "none";
  displayJobs(curJobs);
  // Hide reorganize button when showing job list (must be after displayJobs)
  document.getElementById("reorganizeBtn").style.display = "none";
  // make this function
  showBackButton();
};

// make bac button
const showBackButton = () => {
  const backBtn = document.getElementById("backToFolders"); // You'll need this button in HTML
  backBtn.style.display = "block";
  backBtn.textContent = `⬅︎`;

  backBtn.addEventListener("click", () => {
    // Hide jobs view
    JOB_DISPLAY.innerHTML = `<div
            id="folders-container"
            class="grid grid-cols-3 gap-4"
          >
          </div>`;

    backBtn.style.display = "none";

    // Show folders view again and reorganize button if on "all" filter
    displayFolders();
  });
};

const createJobCard = (job, number) => {
  return `
      <div class="mb-3 max-w-sm mx-auto" data-job-id="${job.id}">
        <div class="p-3 rounded-lg flex justify-between items-center cursor-pointer transition-all duration-200 hover:bg-white/50" data-toggle-id="${
          job.id
        }">
          <div class="text-left flex-1">
            <h3 class="m-0 text-sm font-normal nanum-gothic-extrabold text-[var(--warm-brown)]">${number}. ${
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

          <div class="p-4 rounded-b-lg -mt-px bg-white/50 ">


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

// setup claude ai api to categorize jobs
let cachedCategories = null;

// Helper: Remove job from categories
const removeJobFromCategories = (jobId) => {
  if (!cachedCategories) return;
  cachedCategories.forEach((category) => {
    category.jobIds = category.jobIds.filter((id) => id !== jobId);
  });
  // Remove empty categories
  cachedCategories = cachedCategories.filter((cat) => cat.jobIds.length > 0);
};

// Helper: Add job to best matching category
const addJobToCategory = (job) => {
  if (!cachedCategories || cachedCategories.length === 0) {
    // No categories yet, need full recategorization
    return false;
  }

  // Simple matching: try to find a category with similar role name
  const jobRole = job.role.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  cachedCategories.forEach((category) => {
    const categoryName = category.name.toLowerCase();
    // Check for keyword matches
    const keywords = categoryName.split(/[\s/&-]+/);
    let score = 0;
    keywords.forEach((keyword) => {
      if (
        jobRole.includes(keyword) ||
        keyword.includes(jobRole.split(" ")[0])
      ) {
        score++;
      }
    });
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  });

  // If we found any match (even weak), add to that category
  if (bestMatch) {
    bestMatch.jobIds.push(job.id);
    return true;
  }

  // No match at all - create a new "Other" category or add to first category
  // Just add to the first category to avoid re-categorization
  if (cachedCategories.length > 0) {
    cachedCategories[0].jobIds.push(job.id);
    return true;
  }

  // Otherwise, need recategorization
  return false;
};

async function autoCategorize() {
  if (cachedCategories) {
    displayFolders(cachedCategories, jobList);
    return;
  }

  //loading
  const loadingElement = document.getElementById("loading-categories");
  if (loadingElement) {
    loadingElement.style.display = "block";
  }

  // Disable reorganize button during loading
  const reorganizeBtn = document.getElementById("reorganizeBtn");
  reorganizeBtn.disabled = true;
  reorganizeBtn.style.opacity = "0.5";
  reorganizeBtn.style.cursor = "not-allowed";

  // Disable filter buttons during loading
  filterBtns.forEach((btn) => {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
  });

  chrome.storage.local.get(["jobs"], (result) => {
    const jobs = result.jobs || [];
    chrome.runtime.sendMessage(
      { action: "categorizeJobs", jobs: jobs },
      (response) => {
        //
        if (loadingElement) {
          loadingElement.style.display = "none";
        }
        //end loading

        // Re-enable reorganize button
        reorganizeBtn.disabled = false;
        reorganizeBtn.style.opacity = "1";
        reorganizeBtn.style.cursor = "pointer";

        // Re-enable filter buttons
        filterBtns.forEach((btn) => {
          btn.disabled = false;
          btn.style.opacity = "1";
          btn.style.cursor = "pointer";
        });

        if (response && response.success) {
          cachedCategories = response.categories;
          // Save categories to storage
          chrome.storage.local.set({ categories: cachedCategories });
          //   console.log("Panel: Categories received:", response.categories);
          displayFolders(response.categories, jobs);
        }
      }
    );
  });
}

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
    const oldJob = jobList[index];
    jobList[index] = { ...jobList[index], ...updatedData };

    // Only re-categorize if role changed significantly
    // Don't re-categorize for minor edits to the same role
    if (oldJob.role !== updatedData.role) {
      // Check if the new role is significantly different
      const oldRoleLower = oldJob.role.toLowerCase();
      const newRoleLower = updatedData.role.toLowerCase();
      const oldWords = oldRoleLower.split(/[\s/&-]+/);
      const newWords = newRoleLower.split(/[\s/&-]+/);

      // If they share at least one major word, don't re-categorize
      const hasCommonWord = oldWords.some(
        (word) =>
          word.length > 3 &&
          newWords.some((nWord) => nWord.includes(word) || word.includes(nWord))
      );

      if (!hasCommonWord) {
        // Significantly different role, re-categorize
        removeJobFromCategories(jobId);
        if (!addJobToCategory(jobList[index])) {
          cachedCategories = null; // Force recategorization
        }
      }
    }
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

    // Reset to folder view and set filter to the job's status
    JOB_DISPLAY.innerHTML = `<div
            id="folders-container"
            class="grid grid-cols-3 gap-4"
          >
          </div>`;
    document.getElementById("backToFolders").style.display = "none";
    setFilter(jobList[index].status);
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
    // Status change doesn't affect categories, just save
    saveJobs();
    // automatically navigate to the filter tab matching the new status
    setFilter(newStatus);

    // Reset to folder view
    JOB_DISPLAY.innerHTML = `<div
            id="folders-container"
            class="grid grid-cols-3 gap-4"
          >
          </div>`;
    document.getElementById("backToFolders").style.display = "none";
    displayFolders();
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
      // Remove from categories
      removeJobFromCategories(jobId);
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

      // Reset to folder view
      JOB_DISPLAY.innerHTML = `<div
            id="folders-container"
            class="grid grid-cols-3 gap-4"
          >
          </div>`;
      document.getElementById("backToFolders").style.display = "none";
      displayFolders();
    }
  });
};

// Reorganize button
const reorganizeBtn = document.getElementById("reorganizeBtn");
reorganizeBtn.addEventListener("click", () => {
  // Clear folders display and show loading
  const container = document.getElementById("folders-container");
  if (container) {
    container.innerHTML = `
      <div id="loading-categories" class="col-span-3 text-center py-8">
        <div class="inline-block w-8 h-8 border-4 border-[var(--neutral-brown)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    `;
  }

  cachedCategories = null;
  chrome.storage.local.remove("categories", () => {
    autoCategorize();
  });
});

// Initialize back button as hidden
document.getElementById("backToFolders").style.display = "none";

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
