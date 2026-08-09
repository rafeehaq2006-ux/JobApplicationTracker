const jobButtons = document.querySelectorAll(".jobButton");
const home = document.querySelector("#homebutton");
const newManualJob = document.querySelector("#newJobManual");
const newAIJob = document.querySelector("#AutoFill");
const editJob = document.querySelector("#editJobButton");

home.addEventListener("click", () => {
    window.location.href = `/dashboard`;
});


jobButtons.forEach((button) => {
    button.addEventListener("click", () =>{
        const job_id = button.dataset.id;
        if(job_id) {
            window.location.href = `/dashboard/${job_id}`;
        }
    });
});

if (editJob){
    editJob.addEventListener("click", async () => {
        if (editJob.dataset.id){
            try {
                const response = await fetch(`/dashboard/edit-info/${editJob.dataset.id}`);
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }
                const jobData = await response.json();
                openNewJobForm(jobData, true);
            } catch (err) {
                console.log(err);
            }
        }
    });
};

// ---------- New Job form overlay ----------

const TRACKING_STATUS_OPTIONS = [
    "Interviewing",
    "Saved For Later",
    "Online Assessment",
    "Applied",
    "Rejected",
    "Offer Received",
];

const JOB_FORM_FIELDS = [
    { id: "job_title", label: "Job Title", type: "text", required: true },
    { id: "company_name", label: "Company Name", type: "text", required: true },
    { id: "tracking_status", label: "Tracking Status", type: "select", required: true, options: TRACKING_STATUS_OPTIONS },
    { id: "applied", label: "Applied", type: "datetime" },
    { id: "location", label: "Location", type: "text" },
    { id: "salary", label: "Salary", type: "text" },
    { id: "website", label: "Website", type: "text" },
    { id: "description", label: "Description", type: "textarea" },
    { id: "requirements", label: "Requirements", type: "textarea" },
];

function toDatetimeLocalValue(value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
        return "";
    }
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildJobFormField(field, prefillValue) {
    const group = document.createElement("div");
    group.className = "form-group";

    const label = document.createElement("label");
    label.setAttribute("for", field.id);
    label.textContent = field.label + (field.required ? " *" : "");
    group.appendChild(label);

    let input;

    if (field.type === "select") {
        input = document.createElement("select");
        input.id = field.id;
        input.name = field.id;

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select an option";
        placeholder.disabled = true;
        placeholder.selected = !prefillValue;
        input.appendChild(placeholder);

        field.options.forEach((optionText) => {
            const option = document.createElement("option");
            option.value = optionText;
            option.textContent = optionText;
            if (prefillValue && optionText === prefillValue) {
                option.selected = true;
            }
            input.appendChild(option);
        });
    } else if (field.type === "datetime") {
        input = document.createElement("input");
        input.type = "datetime-local";
        input.id = field.id;
        input.name = field.id;
        if (prefillValue) {
            input.value = toDatetimeLocalValue(prefillValue);
        }
    } else if (field.type === "textarea") {
        input = document.createElement("textarea");
        input.id = field.id;
        input.name = field.id;
        input.rows = 4;
        if (prefillValue) {
            input.value = prefillValue;
        }
    } else {
        input = document.createElement("input");
        input.type = "text";
        input.id = field.id;
        input.name = field.id;
        if (prefillValue) {
            input.value = prefillValue;
        }
    }

    if (field.required) {
        input.required = true;
    }

    group.appendChild(input);
    return group;
}

function closeJobFormOverlay() {
    const overlay = document.querySelector(".modal-overlay");
    if (overlay) {
        overlay.remove();
        document.removeEventListener("keydown", handleJobFormKeydown);
    }
}

function handleJobFormKeydown(event) {
    if (event.key === "Escape") {
        closeJobFormOverlay();
    }
}

function openNewJobForm(prefillData = {},editing) {
    // Avoid stacking multiple overlays if triggered more than once
    if (document.querySelector(".modal-overlay")) {
        return;
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const card = document.createElement("div");
    card.className = "modal-card";

    const header = document.createElement("div");
    header.className = "modal-header";

    const title = document.createElement("h2");
    if(!editing){
        title.textContent = "Add New Job";
    } else{
        title.textContent = "Editing Job";
    };
        
    header.appendChild(title);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "modal-close";
    closeButton.setAttribute("aria-label", "Close");
    closeButton.textContent = "\u00d7";
    closeButton.addEventListener("click", closeJobFormOverlay);
    header.appendChild(closeButton);

    card.appendChild(header);

    if (prefillData.website_work === false) {
        const errorMessage = document.createElement("div");
        errorMessage.className = "job-form-error";
        errorMessage.textContent = "Error Occurred! Website entered may be faulty. Please try autofill later. For now enter data manually.";
        card.appendChild(errorMessage);
    }

    const form = document.createElement("form");
    form.className = "job-form";
    form.method = "POST";
    if (!editing){
        form.action = "/dashboard/new-job-manual";
    } else{
        form.action = `/dashboard/edit/${prefillData.job_id}`;
    }
    

    JOB_FORM_FIELDS.forEach((field) => {
        form.appendChild(buildJobFormField(field, prefillData[field.id]));
    });

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "modal-cancel";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", closeJobFormOverlay);
    actions.appendChild(cancelButton);

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "modal-submit";
    submitButton.textContent = "Add Job";
    actions.appendChild(submitButton);

    form.appendChild(actions);

    card.appendChild(form);
    overlay.appendChild(card);

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeJobFormOverlay();
        }
    });

    document.body.appendChild(overlay);
    document.addEventListener("keydown", handleJobFormKeydown);
}

if (newManualJob) {
    newManualJob.addEventListener("click", () => openNewJobForm());
}

// ---------- Auto-fill from website overlay ----------

function openAutoFillForm() {
    if (document.querySelector(".modal-overlay")) {
        return;
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const card = document.createElement("div");
    card.className = "modal-card";

    const header = document.createElement("div");
    header.className = "modal-header";

    const title = document.createElement("h2");
    title.textContent = "Auto Fill From Website";
    header.appendChild(title);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "modal-close";
    closeButton.setAttribute("aria-label", "Close");
    closeButton.textContent = "\u00d7";
    closeButton.addEventListener("click", closeJobFormOverlay);
    header.appendChild(closeButton);

    card.appendChild(header);

    const form = document.createElement("form");
    form.className = "job-form";
    form.method = "POST";
    form.action = "/dashboard/new-job-auto";

    form.appendChild(buildJobFormField({ id: "website", label: "Website", type: "text", required: true }));

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "modal-cancel";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", closeJobFormOverlay);
    actions.appendChild(cancelButton);

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "modal-submit";
    submitButton.textContent = "Fetch Details";
    actions.appendChild(submitButton);

    form.appendChild(actions);

    // Unlike the manual job form, this one needs to stay on the page:
    // it sends the website off, gets job details back, then hands them
    // to the manual form as placeholders. So the submit is intercepted
    // rather than left as a normal browser POST.
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        try {
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());

            const response = await fetch(form.action, {
                method: form.method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const jobData = await response.json();

            closeJobFormOverlay();
            openNewJobForm(jobData);
        } catch (error) {
            console.error("Auto-fill failed:", error);
        }
    });

    card.appendChild(form);
    overlay.appendChild(card);

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeJobFormOverlay();
        }
    });

    document.body.appendChild(overlay);
    document.addEventListener("keydown", handleJobFormKeydown);
}

if (newAIJob) {
    newAIJob.addEventListener("click", openAutoFillForm);
}