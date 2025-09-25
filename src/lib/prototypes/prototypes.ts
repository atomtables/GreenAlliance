export {};

declare global {
    interface Date {
        // Get the amount of days in a given month.
        daysInMonth(): number;
        toMonthString(): string;
    }
}

Date.prototype.daysInMonth = function daysInMonth (): number {
    let x = new Date(this);
    x.setDate(0);
    x.setMonth(x.getMonth() + 1);
    x.setDate(0);
    return x.getDate();
}
Date.prototype.toMonthString = function toMonthString(): string {
    return ['January', 'February', "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][this.getMonth()]
}

const AsyncFunction = async function () {}.constructor;
export type AsyncFunction = typeof AsyncFunction