import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { titleize, underlineText, max, sum } from "$lib/functions/code";
import type { User } from "$lib/types/types";

export class RosterExporter {
    private static positions = ["Member", "Lead", "Captain", "Mentor", "Coach", "Admin"];
    private constructor() {}

    private static bubbleSort(arr: User[], sortIndex: number) {
        if (arr.length === 1 || sortIndex === 3) return arr;
        const sortKeys = ["firstName", "lastName", "subteam"] as const;
        const key = sortKeys[sortIndex];
        for (let i = 0; i < arr.length; i++) {
            let minIndex = i;
            for (let j = i + 1; j < arr.length; j++) {
                if (arr[j][key].toLowerCase() < arr[minIndex][key].toLowerCase()) {
                    minIndex = j;
                }
            }
            [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
        }
        return arr;
    }

    static async generatePDF(format: number, sortIndex: number, users: User[]) {
        const teamInfo = await fetch("/config.json").then((r) => r.json());
        const doc = new jsPDF("p", "mm", "a4");
        let yPosition = 20;
        const leftMargin = 15;

        doc.setFontSize(18);
        underlineText(doc, `Team ${teamInfo.teamNumber} - ${teamInfo.teamName}`, leftMargin, yPosition, 0.7, 0.7);
        yPosition += 7;

        let accounts = users;
        accounts = RosterExporter.bubbleSort(accounts, sortIndex);

        const header = ["First Name", "Last Name", "Role", "Subteam"];
        const body: string[][] = [];

        const columnMax = [0, 0, 0, 0];
        if (format !== 1) {
            for (const user of accounts) {
                const first = doc.getTextWidth(`${user.firstName}`);
                const last = doc.getTextWidth(`${user.lastName}`);
                const role = doc.getTextWidth(`${this.positions[user.role]}`);
                const sub = doc.getTextWidth(`${user.subteam}`);
                columnMax[0] = Math.max(columnMax[0], first);
                columnMax[1] = Math.max(columnMax[1], last);
                columnMax[2] = Math.max(columnMax[2], role);
                columnMax[3] = Math.max(columnMax[3], sub);
            }
        }

        let multiplier = format === 0 ? max(columnMax) : 7;

        if (format === 2) {
            while (sum(columnMax) + leftMargin + (header.length - 4) * multiplier < 180) {
                header.push("");
            }
        }

        if (format === 0) header.push("");

        for (const user of accounts) {
            body.push([
                titleize(user.firstName),
                titleize(user.lastName),
                this.positions[user.role],
                user.subteam,
            ]);
        }

        const color: [number, number, number] = [0, 0, 0];
        const options: any = {
            startY: yPosition,
            head: [header],
            body,
            styles: {
                lineWidth: 0.1,
                lineColor: color,
            },
            columnStyles: {},
            headStyles: {},
        };

        if (format === 0) {
            options.columnStyles[0] = { cellWidth: columnMax[0] + 2 };
            options.columnStyles[1] = { cellWidth: columnMax[1] + 2 };
            options.columnStyles[2] = { cellWidth: columnMax[2] + 2 };
            options.columnStyles[3] = { cellWidth: columnMax[3] + 2 };
        }

        if (format === 2) {
            for (let i = 4; i < header.length; i++) {
                options.columnStyles[i] = { cellWidth: multiplier };
            }
        }

        autoTable(doc, options);
        doc.save("roster.pdf");
    }

    static async exportCSV(users: User[], filename = "roster.csv") {
        const accounts = users;

        const headers = ["FirstName", "LastName", "Role", "Subteam"].join(",");
        const rows = accounts.map((user) =>
            [user.firstName, user.lastName, this.positions[user.role], user.subteam].join(","),
        );
        const csv = [headers, ...rows].join("\n");
        const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csv}`);

        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
