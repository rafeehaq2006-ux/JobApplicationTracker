const jobButtons = document.querySelectorAll(".jobButton");
const home = document.querySelector("#homebutton");

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