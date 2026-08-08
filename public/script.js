const jobButtons = document.querySelectorAll(".jobButton");

jobButtons.forEach((button) => {
    button.addEventListener("click", () =>{
        const job_id = button.dataset.id;
        if(job_id) {
            window.location.href = `/dashboard/${job_id}`;
        }
    });
});