<script lang="ts">
    import {Permission, Role} from "$lib/types/types";
    import SidebarContent from "$lib/substructure/SidebarContent.svelte";
    import banner1 from "../list/banner1.jpg";
    import {goto, invalidate} from "$app/navigation";
    import Dialog, {alert, confirm} from "$lib/components/Dialog.svelte";
    import Spinner from "$lib/components/Spinner.svelte";
    import Input from "$lib/components/Input.svelte";
    import Table from "$lib/components/Table.svelte";
    import {formatDate, max, sum} from "$lib/functions/code.js";
    import SubteamComponent from "../list/SubteamComponent.svelte";
    import jsPDF from "jspdf";
    import autoTable from "jspdf-autotable";
    import { titleize, underlineText } from "$lib/functions/code";

    let {data} = $props();
    let members = $state(0);

    const positions = ["Member", "Lead", "Captain", "Mentor", "Coach", "Admin"]
    let createJoinCodeOpen = $state(false);
    let createError = $state(null);
    let createPromptData = $state({firstName: "", lastName: "", role: -1, subteam: -1, joinCode: null});

    const createJoinCode = async () => {
        if (!createPromptData.firstName || !createPromptData.lastName || createPromptData.role === -1 || data.subteams[createPromptData.subteam]?.name === undefined) {
            alert("Create a join code", "Please fill out all fields.")
            return;
        }

        let req = await fetch("/api/users/joincodes", {
            method: "PUT",
            body: JSON.stringify({
                firstName: createPromptData.firstName,
                lastName: createPromptData.lastName,
                role: createPromptData.role,
                subteam: data.subteams[createPromptData.subteam].name,
            }),
            headers: {'Content-Type': 'application/json'}
        })
        let res = await req.json()
        if (!req.ok) {
            createError = res['error'];
            return;
        }
        createJoinCodeOpen = false;
        await invalidate("user:joincodes")
        createPromptData.joinCode = res['data']['joinCode']
        await alert(
            "Successfully Created Join Code",
            `When ${createPromptData.firstName} creates an account, ask them to use this code on the sign up screen.`,
            `<div class="text-5xl font-bold text-center pt-2">${createPromptData.joinCode}</div>`
        )
        createPromptData = {firstName: "", lastName: "", role: -1, subteam: -1, joinCode: null}
    }

    interface User {
        firstName: String,
        lastName: String,
        subteam: String,
        email: String,
        role: number
    }

    const bubbleSort = (arr:User[], s) => {
        const sorts = ["firstName", "lastName", "subteam", "role"];
        s = sorts[s]
        if (arr.length === 1 || s === "role") return arr;
        for (let i = 0; i < arr.length; i++) {
            let minIndex = i;
            for (let j = i + 1; j < arr.length; j++) {
                if (arr[j][s].toLowerCase() < arr[minIndex][s].toLowerCase()) {
                    minIndex = j;
                }
            }
            const temp = arr[i];
            arr[i] = arr[minIndex];
            arr[minIndex] = temp;
        }
        return arr;
    }

    async function generatePDF(n:Number, s) {

            const response = await fetch("/config.json");
            const teamInfo = await response.json();
            const doc = new jsPDF("p", "mm", "a4");
            let yPosition = 20;
            const leftMargin = 15;

            // Title
            doc.setFontSize(18);
            underlineText(doc, `Team ${teamInfo.teamNumber} - ${teamInfo.teamName}`, leftMargin, yPosition, 0.7, 0.7);
            yPosition += 7;

            // Body
            const users = await data.users;
            const header = ["First Name", "Last Name", "Role", "Subteam"];
            let accounts: User[];
            const body = [];
            doc.setFontSize(11);
            Object.values(users).forEach((pos:User[]) => {
                if (!accounts) {
                    accounts = pos;
                } else {
                    accounts = accounts.concat(pos);
                }
            })
            
            accounts = bubbleSort(accounts, s);

            // Column Size Calculations
            const columnMax = [0, 0, 0, 0];
            let multiplier;
            if (n !== 1) {
                for (const user of accounts) {
                    const first = doc.getTextWidth(`${user.firstName}`);
                    const last = doc.getTextWidth(`${user.lastName}`);
                    const role = doc.getTextWidth(`${positions[user.role]}`);
                    const sub = doc.getTextWidth(`${user.subteam}`);
                    if (first > columnMax[0]) columnMax[0] = first;
                    if (last > columnMax[1]) columnMax[1] = last;
                    if (role > columnMax[2]) columnMax[2] = role;
                    if (sub > columnMax[3]) columnMax[3] = sub;
                }
            }

            multiplier = (n === 0) ? max(columnMax) : 7;

            if (n === 2) {
                while (sum(columnMax) + leftMargin + ((header.length - 4) * multiplier) < 180) {
                    header.push("");
                }
            }

            if (n === 0) header.push("");

            accounts.forEach((user:User) => {

                const userInfo = [titleize(user.firstName), titleize(user.lastName), positions[user.role], user.subteam];
                body.push(userInfo);
            })

            const color:[number,number,number] = [0,0,0];
            const options = {
                startY: yPosition,
                head: [header],
                body: body,
                styles: {
                    lineWidth: 0.1,
                    lineColor: color
                },
                columnStyles: {},
                headStyles: {}
            }
            if (n === 0) {
                options.columnStyles[0] = { cellWidth: columnMax[0] + 2 }
                options.columnStyles[1] = { cellWidth: columnMax[1] + 2 }
                options.columnStyles[2] = { cellWidth: columnMax[2] + 2 }
                options.columnStyles[3] = { cellWidth: columnMax[3] + 2 }
            }
            if (n === 2) {
                for (let i = 4; i < header.length; i++) {
                    options.columnStyles[i] = { cellWidth: multiplier,  }
                }
            }

            autoTable(doc, options)

        // doc.output("dataurlnewwindow");
        doc.save("roster.pdf");
    }

    const csvFile = async () => {
        const users = await data.users;
        const headers = ["FirstName", "LastName", "Role", "Subteam"].join(",");
        const body = [];

        Object.values(users).forEach((pos:User[]) => {
            for (const user of pos) {
                body.push(`${user.firstName},${user.lastName},${positions[user.role]},${user.subteam}`);
            }
        })
        const csv = [headers, ...body].join("\n");
        const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csv}`);

        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', "roster.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
</script>

{#snippet blank()}{/snippet}

{#snippet joincodes()}
    <div class="text-subheader pb-2">
        Active Join Codes
    </div>
    {#await data.joinCodes.active}
        <Spinner/>
    {:then activeJoinCodes}
        <Table source={activeJoinCodes} emptyStr="No join codes are currently active."
               actions={[{ name: "Delete", icon: "delete", action: async (selected, reset) => {
                     let [value, close] = await confirm(
                        "Delete Join Codes",
                        "Are you sure you want to delete these join codes?",
                        `<div>
                            <b class="text-xl">${selected.map(e => activeJoinCodes[e].joinCode).join(", ")}</b>
                            <br>
                            <div>These join codes will be invalidated and will not be able to create a new account.</div>
                        </div>`, false, true
                    )
                    if (!value) return;
                    let req = await fetch("/api/users/joincodes", {
                        method: "DELETE",
                        body: JSON.stringify(selected.map(e => activeJoinCodes[e].joinCode)),
                        headers: {'Content-Type': 'application/json'}
                    })
                    if (!req.ok) {
                        close();
                        await alert("Failed to Delete Join Codes", "The join codes were unable to be deleted and are still active. Please try again later.")
                        return;
                    }
                    await invalidate("user:joincodes")
                    reset();
                    close();
                    await alert("Successfully Deleted Join Codes", `The join codes have been deleted and are no longer valid to create new accounts.`,)
               }}]}>
            {#snippet header()}
                <th>Join Code</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Created on</th>
            {/snippet}
            {#snippet template({joinCode, firstName, lastName, createdAt})}
                <th class="px-2">{joinCode}</th>
                <th class="px-2">{firstName}</th>
                <th class="px-2">{lastName}</th>
                <th class="px-2">{formatDate(createdAt)}</th>
            {/snippet}
        </Table>
    {/await}
    <div class="text-subheader py-2">
        Previously Used Join Codes
    </div>
    {#await data.joinCodes.used}
        <Spinner/>
    {:then activeJoinCodes}
        <Table
                source={activeJoinCodes}
                emptyStr="No join codes have been used in the last week."
        >
            {#snippet header()}
                <th>Join Code</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Created on</th>
            {/snippet}
            {#snippet template({joinCode, firstName, lastName, createdAt})}
                <th class="px-2">{joinCode}</th>
                <th class="px-2">{firstName}</th>
                <th class="px-2">{lastName}</th>
                <th class="px-2">{formatDate(createdAt)}</th>
            {/snippet}
        </Table>
    {/await}
{/snippet}

{#snippet listmembers()}
    {#await data.users}
        <div class="flex flex-row items-middle justify-center w-full space-x-2">
            <Spinner />
            Loading...
        </div>
    {:then users}
        <Table source={Object.values(users).flat()}>
            {#snippet header()}
                <th>Last Name</th>
                <th>First Name</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Email</th>
            {/snippet}
            {#snippet template({firstName, lastName, role, createdAt, email})}
                <th class="px-2">{lastName}</th>
                <th class="px-2">{firstName}</th>
                <th class="px-2">{
                    role === Role.administrator ? 'adm.' :
                    role === Role.coach ? 'coa.' :
                    role === Role.mentor ? 'ment.' :
                    role === Role.captain ? 'capt.' :
                    role === Role.lead ? 'lead.' :
                    role === Role.member ? 'mem.' : '?'
                }</th>
                <th class="px-2">{createdAt.getFullYear()}</th>
                <th class="px-2">{email}</th>
            {/snippet}
        </Table>
    {/await}
{/snippet}
{#snippet listsubteams()}
    <div>
        {#await data.subteamsAvailable}
            <Spinner />
        {:then subteams}
            <div class="space-y-2">
                {#each subteams as { subteam, users }}
                    <SubteamComponent {subteam} {users} />
                {/each}
            </div>
        {/await}
    </div>
{/snippet}

<!-- Dialog box to create a join code -->
<Dialog
        bind:open={createJoinCodeOpen}
        title="Create a join code"
        description="Generate a code to be used for a user to create their account."
        actions={[
            { name: "Cancel", close: true, action: () => null },
            { name: "Create", action: () => createJoinCode(), primary: true }
        ]}>
    <div class="flex flex-row space-x-2">
        <Input name="First Name" id="firstname" bind:value={createPromptData.firstName}/>
        <Input name="Last Name" id="lastname" bind:value={createPromptData.lastName}/>
    </div>
    <div class="flex flex-row pt-2 gap-2">
        <Input name="Role" id="role" type="dropdown" elements={["Member", "Team Lead", "Captain", "Mentor", "Coach"]}
            bind:value={createPromptData.role}/>
        <Input name="Subteam" id="subteam" type="dropdown" elements={[...data.subteams.map(v => v.name)]}
            bind:value={createPromptData.subteam}/>
    </div>
    {#if createError}
        <div class="text-red-400">An error occured while creating a join code: <b>{createError}</b></div>
    {/if}
</Dialog>
<SidebarContent
        items={[
        {
            tabName: "Members",
            tabIcon: "groups",
            nestedItems: [
                {
                    tabName: "Roster",
                    tabIcon: "groups",
                    title: "Team Roster",
                    description: "View and modify all members of the team.",
                    content: listmembers,
                    shelf: [
                        { name: `Add Member`, action: () => {alert("Add Member", "To add a member, you should create a join code with their name and their role on the team. This will allow them to set up their account themselves.")} },
                        { name: "Print Attendance", selections: ["Sort by First Name", "Sort by Last Name", "Sort by Subteam", "Sort by Role"], action: n => {
                            generatePDF(0, n);
                        }},
                        { name: `Print Roster`, selections: ["Sort by First Name", "Sort by Last Name", "Sort by Subteam", "Sort by Role"], action: n => {
                            generatePDF(1, n);
                        }},
                        { name: `Print Squares`, selections: ["Sort by First Name", "Sort by Last Name", "Sort by Subteam", "Sort by Role"], action: n => {
                            generatePDF(2, n);
                        }},
                        { name: `Download CSV`, action: () => {
                            csvFile();
                        }}
                    ]
                },
                {
                    tabName: "Join Codes",
                    tabIcon: "link",
                    title: "Join Codes",
                    description: "Allow users to create an account through the use of a join code.",
                    content: joincodes,
                    shelf: [{ name: `Create join code`, action: () => createJoinCodeOpen = true }]
                },
            ]
        },
        {
            tabName: "Subteams",
            tabIcon: "diversity_3",
            title: "All Subteams",
            content: blank,
            shelf: [data.user.permissions.includes(Permission.users_modify) && { name: "Modify Subteams", action: () => goto("/users/modify") }].filter(val => typeof val !== "boolean")
        }
    ]}
        banner={banner1}
/>

