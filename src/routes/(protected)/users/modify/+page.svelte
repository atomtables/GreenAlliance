<script lang="ts">
    import {Permission, Role} from "$lib/types/types";
    import SidebarContent from "$lib/substructure/SidebarContent.svelte";
    import banner1 from "../list/banner1.jpg";
    import {goto, invalidate} from "$app/navigation";
    import Dialog, {alert, confirm} from "$lib/components/Dialog.svelte";
    import Spinner from "$lib/components/Spinner.svelte";
    import Input from "$lib/components/Input.svelte";
    import Table from "$lib/components/Table.svelte";
    import {formatDate} from "$lib/functions/code.js";
    import SubteamComponent from "../list/SubteamComponent.svelte";
    import jsPDF from "jspdf";
    import autoTable from "jspdf-autotable";
    import { bulletPoint, titleize, underlineText } from "$lib/functions/code";

    let {data} = $props();
    let members = $state(0);

    let createJoinCodeOpen = $state(false);
    let createError = $state(null);
    let createPromptData = $state({firstName: "", lastName: "", role: -1, joinCode: null});

    const createJoinCode = async () => {
        let req = await fetch("/api/users/joincodes", {
            method: "PUT",
            body: JSON.stringify(createPromptData),
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
        createPromptData = {firstName: "", lastName: "", role: -1, joinCode: null}
    }

    type sort = "first" | "last" | "sub" | "pos"

    async function generatePDF(n:Number) {

            const response = await fetch("/config.json");
            const teamInfo = await response.json();
            const doc = new jsPDF("p", "mm", "a4");
            let yPosition = 20;
            const leftMargin = 15;

            // Title
            doc.setFontSize(18);
            underlineText(doc, `Team ${teamInfo.teamNumber} - ${teamInfo.teamName}`, leftMargin, yPosition, 0.7, 0.7);
            yPosition += 10;

            if (n === 0) {
                // Subtitle
                doc.setFontSize(14);
                doc.text("Date:", leftMargin, yPosition);
                yPosition += 8;
            }

            // Body
            const users = await data.users;
            const positions = Object.keys(users);
            const header = ["First Name", "Last Name", "Subteam", "Email"];
            if (n === 0) header.splice(0,0,"Present");
            const body = [];
            Object.values(users).forEach((pos:Array<Object>, i) => {
                if (yPosition > doc.internal.pageSize.getHeight() - 20) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.setFontSize(11);
                interface User {
                    firstName: String,
                    lastName: String,
                    subteam: String,
                    email: String
                }
                pos.forEach((user:User) => {

                    if (yPosition > doc.internal.pageSize.getHeight() - 20) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    const userInfo = [titleize(user.firstName), titleize(user.lastName), user.subteam, user.email];
                    if (n === 0) userInfo.splice(0,0,"q");
                    body.push(userInfo);
                })
            })
            const options = {
                startY: yPosition,
                head: [header],
                body: body
            }
            if (n === 0) options["columnStyles"] = {
                0: { font: "ZapfDingbats", halign: "center" }
            }
            autoTable(doc, options)

        doc.output("dataurlnewwindow");
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
        {@const val = console.log(users)}
        <Table source={Object.values(users).flat()}>
            {#snippet header()}
                <th>Last Name</th>
                <th>First Name</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Email</th>
            {/snippet}
            {#snippet template({firstName, lastName, role, createdAt, email})}
            {@const val = console.log(firstName)}
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
        {#await data.subteams}
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
        open={createJoinCodeOpen}
        title="Create a join code"
        description="Generate a code to be used for a user to create their account."
        actions={[
            { name: "Cancel", action: () => createJoinCodeOpen = false },
            { name: "Create", action: createJoinCode, primary: true }
        ]}>
    <div class="flex flex-row space-x-2">
        <Input name="First Name" id="firstname" bind:value={createPromptData.firstName}/>
        <Input name="Last Name" id="lastname" bind:value={createPromptData.lastName}/>
    </div>
    <div class="flex flex-row">
        <Input name="Role" id="role" type="dropdown" elements={["Member", "Team Lead", "Captain", "Mentor", "Coach"]}
               bind:value={createPromptData.role}/>
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
                        { name: "Print Attendance", action: () => {
                            generatePDF(0);
                        }},
                        { name: `Print Roster`, action: () => {
                            generatePDF(1);
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

