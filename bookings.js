const BOOKINGS_KEY = "dinkBoxBookings";

function getBookings() {
    try {
        return JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function saveBookings(list) {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
}

function isSlotBooked(date, courtName, slotStart) {
    return getBookings().some(function(b) {
        return b.date === date &&
               b.court === courtName &&
               slotStart >= b.startMinutes &&
               slotStart < b.endMinutes;
    });
}

function rangeIsFree(date, courtName, startMinutes, endMinutes) {
    for (let m = startMinutes; m < endMinutes; m += 30) {
        if (isSlotBooked(date, courtName, m)) {
            return false;
        }
    }
    return true;
}

function generateBookingCode() {

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let existing = getBookings().map(function(b) { return b.code; });
    let code;

    do {
        code = "DB-";
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (existing.includes(code));

    return code;
}

function addBooking(booking) {

    let list = getBookings();

    booking.code = generateBookingCode();
    booking.createdAt = new Date().toISOString();

    list.push(booking);
    saveBookings(list);

    return booking;
}

function findBooking(code) {

    code = String(code).trim().toUpperCase();

    return getBookings().find(function(b) {
        return b.code === code;
    }) || null;
}

function cancelBooking(code) {

    code = String(code).trim().toUpperCase();

    saveBookings(getBookings().filter(function(b) {
        return b.code !== code;
    }));
}

function updateBooking(code, changes) {

    code = String(code).trim().toUpperCase();

    saveBookings(getBookings().map(function(b) {
        return b.code === code ? Object.assign({}, b, changes) : b;
    }));
}
