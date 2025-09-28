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
    import User from "$lib/components/User.svelte";
    import type {User as UserType} from "$lib/types/types";
    import SubteamComponent from "../list/SubteamComponent.svelte";

    let {data} = $props();
    let members = $state(0);

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
        open={createJoinCodeOpen}
        title="Create a join code"
        description="Generate a code to be used for a user to create their account."
        actions={[
            { name: "Cancel", action: () => createJoinCodeOpen = false },
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
                        { name: `Print Roster`, action: () => {
                            
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

