const jobButtons = document.querySelectorAll(".jobButton");
const home = document.querySelector("#homebutton");
const newManualJob = document.querySelector("#newJobManual");

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

function buildJobFormField(field) {
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
        placeholder.selected = true;
        input.appendChild(placeholder);

        field.options.forEach((optionText) => {
            const option = document.createElement("option");
            option.value = optionText;
            option.textContent = optionText;
            input.appendChild(option);
        });
    } else if (field.type === "datetime") {
        input = document.createElement("input");
        input.type = "datetime-local";
        input.id = field.id;
        input.name = field.id;
    } else if (field.type === "textarea") {
        input = document.createElement("textarea");
        input.id = field.id;
        input.name = field.id;
        input.rows = 4;
    } else {
        input = document.createElement("input");
        input.type = "text";
        input.id = field.id;
        input.name = field.id;
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

function openNewJobForm() {
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
    title.textContent = "Add New Job";
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
    form.action = "/dashboard";

    JOB_FORM_FIELDS.forEach((field) => {
        form.appendChild(buildJobFormField(field));
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
    newManualJob.addEventListener("click", openNewJobForm);
}