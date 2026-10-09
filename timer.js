const TIMER_KEY = "dinkBoxTimerEnd";
const TIMER_DURATION_MS = 15 * 60 * 1000;

function clearBookingTimer() {
    localStorage.removeItem(TIMER_KEY);
}

function timeIsUp() {
    clearBookingTimer();
    localStorage.removeItem("dinkBoxBooking");
    alert("Time's up! Your booking session has expired. Please start again.");
    window.location.href = "index.html";
}

function startCountdown(elementId, canStart) {

    let el = document.getElementById(elementId);
    let end = Number(localStorage.getItem(TIMER_KEY));

    if ((!end || end <= Date.now()) && canStart) {
        end = Date.now() + TIMER_DURATION_MS;
        localStorage.setItem(TIMER_KEY, String(end));
    }

    function tick() {

        let left = end - Date.now();

        if (!end || left <= 0) {
            clearInterval(interval);
            timeIsUp();
            return;
        }

        let totalSeconds = Math.ceil(left / 1000);
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = totalSeconds % 60;

        el.textContent =
            String(minutes).padStart(2, "0") + ":" +
            String(seconds).padStart(2, "0") + " remaining";
    }

    let interval = setInterval(tick, 1000);
    tick();
}

window.addEventListener("pageshow", function(event) {
    if (event.persisted) {
        window.location.reload();
    }
});
